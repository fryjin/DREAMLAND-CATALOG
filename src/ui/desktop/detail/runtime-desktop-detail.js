(function(root){
  'use strict';

  if(root.DreamlandDesktopDetail){
    return;
  }

  const VERSION='B7-00B.3B';
  const PRESENTATION_VERSION='B7-00B.4D-R1';
  const POLISH_VERSION='B7-00B.4D-R1.5';
  const INTERACTION_VERSION='B7-00B.4D-R1.5.1';

  const FALLBACK_COPY=Object.freeze({
    en:Object.freeze({
      back:'Back to collection',
      productId:'Product ID',
      moq:'MOQ',
      moqNote:'Combined quantities within the same series and size count toward MOQ.',
      size:'Size',
      scentCollection:'Fragrance collection',
      scent:'Scent',
      pattern:'Pattern',
      packaging:'Packaging',
      quantity:'Quantity',
      included:'Included',
      unitPrice:'Estimated unit price',
      estimatedTotal:'Estimated product total',
      pricingNote:'Estimated pricing updates with configuration and quantity. Final pricing is confirmed in the quotation.',
      addInquiry:'Add to Inquiry',
      added:'Added to your inquiry',
      customProject:'Start a custom project',
      scentNotes:'Scent notes',
      topNotes:'Top',
      heartNotes:'Heart',
      baseNotes:'Base',
      productDetails:'Product details',
      series:'Series',
      availableSizes:'Available sizes',
      configuredOptions:'Configured options',
      wholesale:'Wholesale',
      empty:'Choose a product from the collection to view details.'
    }),
    zh:Object.freeze({
      back:'返回产品系列',
      productId:'产品编号',
      moq:'最低起订量',
      moqNote:'同系列、同尺寸的数量可合并计算起订量。',
      size:'尺寸',
      scentCollection:'香型系列',
      scent:'香型',
      pattern:'图案',
      packaging:'包装',
      quantity:'数量',
      included:'已包含',
      unitPrice:'预估单价',
      estimatedTotal:'预估产品金额',
      pricingNote:'预估价格会随配置与数量更新，最终价格以正式报价为准。',
      addInquiry:'加入询价单',
      added:'已加入询价单',
      customProject:'发起定制项目',
      scentNotes:'香调信息',
      topNotes:'前调',
      heartNotes:'中调',
      baseNotes:'后调',
      productDetails:'产品信息',
      series:'系列',
      availableSizes:'可选尺寸',
      configuredOptions:'当前配置',
      wholesale:'批发采购',
      empty:'请从产品系列中选择产品查看详情。'
    }),
    ko:Object.freeze({
      back:'컬렉션으로 돌아가기',
      productId:'제품 번호',
      moq:'최소 주문 수량',
      moqNote:'같은 시리즈와 같은 사이즈의 수량은 MOQ에 합산됩니다.',
      size:'사이즈',
      scentCollection:'향 컬렉션',
      scent:'향',
      pattern:'패턴',
      packaging:'패키징',
      quantity:'수량',
      included:'포함',
      unitPrice:'예상 단가',
      estimatedTotal:'예상 제품 금액',
      pricingNote:'예상 가격은 구성과 수량에 따라 업데이트되며 최종 가격은 견적서에서 확정됩니다.',
      addInquiry:'문의 목록에 추가',
      added:'문의 목록에 추가되었습니다',
      customProject:'커스텀 프로젝트 시작',
      scentNotes:'향 노트',
      topNotes:'탑 노트',
      heartNotes:'미들 노트',
      baseNotes:'베이스 노트',
      productDetails:'제품 정보',
      series:'시리즈',
      availableSizes:'선택 가능한 사이즈',
      configuredOptions:'현재 구성',
      wholesale:'도매',
      empty:'컬렉션에서 제품을 선택해 상세 정보를 확인하세요.'
    })
  });

  let config=null;
  let detailRoot=null;
  let mounted=false;
  let activeProductId='';
  let activeImageIndex=0;
  let quantityValidation=null;
  let feedbackTimer=null;
  let inquiryDrawerOpen=false;

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function language(){
    return text(
      config?.language?.()||
      'en'
    );
  }

  function copy(){
    return {
      ...(
        FALLBACK_COPY[language()]||
        FALLBACK_COPY.en
      ),
      ...(
        config?.content?.()
          ?.detail||
        {}
      )
    };
  }

  function viewModel(){
    return (
      config?.viewModel?.()||
      {
        empty:true,
        product:null,
        config:{},
        options:{
          sizes:[],
          scentSeries:[],
          scents:[],
          patterns:[],
          packs:[]
        },
        pricing:{
          moq:1,
          quantity:1,
          unitPrice:0,
          packSurchargeCny:0
        },
        limits:{
          qtyMin:1,
          qtyStep:1,
          qtyMax:1000000
        }
      }
    );
  }

  function productName(product){
    return text(
      config?.productName?.(
        product
      )||
      product?.name||
      product?.id
    );
  }

  function productDescription(product){
    return text(
      config?.productDescription?.(
        product
      )||
      product?.desc||
      ''
    );
  }

  function seriesLabel(value){
    return text(
      config?.seriesLabel?.(
        value
      )||
      value
    );
  }

  function choiceLabel(value){
    return text(
      config?.choiceLabel?.(
        value
      )||
      value
    );
  }

  function scentLabel(scent){
    return text(
      config?.scentDisplayText?.(
        scent?.name
      )||
      scent?.name||
      scent?.id
    );
  }

  function localizedScentValue(value){
    return text(
      config?.scentDisplayText?.(
        value
      )||
      value
    );
  }

  function productImages(product){
    const provided=
      config?.productImages?.(
        product
      );

    const fallback=
      config?.productCover?.(
        product
      );

    const sources=[
      ...(
        Array.isArray(provided)
          ? provided
          : []
      ),
      fallback
    ]
      .map(text)
      .filter(Boolean);

    return [
      ...new Set(sources)
    ].slice(0,6);
  }

  function optionImage(
    key,
    value,
    view
  ){
    return text(
      config?.optionPreview?.(
        key,
        value,
        view?.config?.size||'',
        view
      )||
      ''
    );
  }

  function money(value){
    return text(
      config?.money?.(
        Number(value)||0
      )||
      value
    );
  }

  function qtyUnit(){
    return text(
      config?.qtyUnit?.()||
      'pcs'
    );
  }

  function sizeDimension(size){
    return text(
      config?.sizeDimensions?.(
        size
      )||
      ''
    );
  }

  function packSurcharge(
    product,
    pack
  ){
    return Number(
      config?.packSurcharge?.(
        product?.series,
        pack
      )||
      0
    );
  }

  function syncProductGallery(
    view
  ){
    const id=
      text(
        view?.product?.id
      );

    if(id===activeProductId){
      return;
    }

    activeProductId=id;
    activeImageIndex=0;
    quantityValidation=null;
  }

  function currentImages(view){
    const images=
      productImages(
        view.product
      );

    if(
      activeImageIndex>=
      images.length
    ){
      activeImageIndex=0;
    }

    return images;
  }

  function mediaImageHtml(
    source,
    {
      className='',
      kind='detail',
      priority='auto',
      alt='',
      width=960,
      height=960
    }={}
  ){
    if(!source){
      return '';
    }

    return `
      <span class="media-skeleton" aria-hidden="true"></span>
      <img
        class="${escapeHtml(className)}"
        data-desktop-detail-source="${escapeHtml(source)}"
        data-desktop-detail-kind="${escapeHtml(kind)}"
        data-desktop-detail-priority="${escapeHtml(priority)}"
        alt="${escapeHtml(alt)}"
        width="${escapeHtml(width)}"
        height="${escapeHtml(height)}"
        loading="${priority==='high'?'eager':'lazy'}"
        decoding="async"
      >
    `;
  }

  function r15UiCopy(key){
    const table={
      en:{
        mainView:'Main view',
        galleryView:'View {index}',
        currentConfiguration:'Current configuration',
        currentItemQuantity:'Add quantity',
        addAgain:'Add {count} more',
        inInquiryQuantity:'In inquiry · {count} pcs',
        addedFirst:'Added {count} pcs',
        addedAgain:'Added {count} pcs · {total} pcs in inquiry',
        moqRuleHeading:'MOQ rule',
        moqRuleCompact:'Same series + size · {count} pcs combined',
        moqRuleText:'Items in the same series and size can be combined. Ordering starts when the combined quantity reaches {count} pcs.',
        inquiry:'Inquiry',
        inquiryQuickView:'Inquiry quick view',
        selectedItems:'{count} selected items',
        inquiryEmpty:'Your inquiry is empty.',
        inquiryEmptyBody:'Add this configuration or continue exploring the collection.',
        viewFullInquiry:'View full inquiry',
        remove:'Remove',
        close:'Close',
        unitPrice:'Estimated unit price',
        currentAmount:'Current amount',
        moqProgress:'MOQ progress',
        moqMet:'Requirement met',
        moqRemaining:'{count} pcs remaining',
        customProject:'Custom project',
        quotedSeparately:'Quoted separately'
      },
      zh:{
        mainView:'主展示图',
        galleryView:'展示图 {index}',
        currentConfiguration:'当前配置',
        currentItemQuantity:'本次加入数量',
        addAgain:'再加入 {count} 件',
        inInquiryQuantity:'询价单内已有 {count} 件',
        addedFirst:'已加入 {count} 件',
        addedAgain:'已追加 {count} 件 · 询价单内共 {total} 件',
        moqRuleHeading:'起订规则',
        moqRuleCompact:'同系列同尺寸 · 合计 {count} 件起订',
        moqRuleText:'同系列、同尺寸商品可合并计算，合计满 {count} 件即可起订。',
        inquiry:'询价单',
        inquiryQuickView:'当前询价单',
        selectedItems:'已选 {count} 项',
        inquiryEmpty:'询价单里还没有作品',
        inquiryEmptyBody:'可以先加入当前配置，或继续浏览其他作品。',
        viewFullInquiry:'查看完整询价单',
        remove:'删除',
        close:'关闭',
        unitPrice:'预估单价',
        currentAmount:'当前金额',
        moqProgress:'起订进度',
        moqMet:'已满足起订要求',
        moqRemaining:'还差 {count} 件',
        customProject:'定制项目',
        quotedSeparately:'单独报价'
      },
      ko:{
        mainView:'대표 이미지',
        galleryView:'이미지 {index}',
        currentConfiguration:'현재 구성',
        currentItemQuantity:'이번 추가 수량',
        addAgain:'{count}개 더 추가',
        inInquiryQuantity:'문의 목록에 {count}개',
        addedFirst:'{count}개 추가됨',
        addedAgain:'{count}개 추가 · 문의 목록 합계 {total}개',
        moqRuleHeading:'MOQ 기준',
        moqRuleCompact:'동일 시리즈·사이즈 · 합계 {count}개',
        moqRuleText:'동일 시리즈와 동일 사이즈 상품은 합산할 수 있으며, 합계 {count}개부터 주문할 수 있습니다.',
        inquiry:'문의 목록',
        inquiryQuickView:'현재 문의 목록',
        selectedItems:'선택 {count}개',
        inquiryEmpty:'문의 목록이 비어 있습니다.',
        inquiryEmptyBody:'현재 구성을 추가하거나 다른 작품을 계속 둘러보세요.',
        viewFullInquiry:'전체 문의 목록 보기',
        remove:'삭제',
        close:'닫기',
        unitPrice:'예상 단가',
        currentAmount:'현재 금액',
        moqProgress:'MOQ 진행',
        moqMet:'MOQ 충족',
        moqRemaining:'{count}개 남음',
        customProject:'커스텀 프로젝트',
        quotedSeparately:'별도 견적'
      }
    };

    const lang=language();
    return text(
      table[lang]?.[key]||
      table.en[key]||
      ''
    );
  }

  function r15ReplaceCount(value,count){
    return text(value)
      .replace(
        '{count}',
        String(count)
      );
  }

  function galleryCaptionContent(view,images){
    const total=Math.max(1,images?.length||1);
    const current=Math.max(
      0,
      Math.min(
        activeImageIndex,
        total-1
      )
    );
    const descriptor=
      current===0
        ? r15UiCopy('mainView')
        : r15UiCopy('galleryView')
            .replace(
              '{index}',
              String(current+1)
            );

    const pad=value=>
      String(value).padStart(2,'0');

    return `
      <span>
        ${escapeHtml(productName(view.product))}
        ·
        ${escapeHtml(descriptor)}
      </span>
      <strong>${escapeHtml(pad(current+1))} / ${escapeHtml(pad(total))}</strong>
    `;
  }

  function galleryCaptionHtml(view,images){
    return `
      <div
        class="desktop-detail-media-caption"
        data-desktop-detail-media-caption
        aria-live="polite"
      >
        ${galleryCaptionContent(view,images)}
      </div>
    `;
  }

  function syncGalleryCaption(view,images){
    const node=
      detailRoot?.querySelector(
        '[data-desktop-detail-media-caption]'
      );

    if(node){
      node.innerHTML=
        galleryCaptionContent(
          view,
          images
        );
    }
  }

  function moqRuleCompactText(view){
    return r15ReplaceCount(
      r15UiCopy('moqRuleCompact'),
      Number(view.pricing?.moq||1)
    );
  }

  function moqRuleText(view){
    return r15ReplaceCount(
      r15UiCopy('moqRuleText'),
      Number(view.pricing?.moq||1)
    );
  }

  function inquiryView(){
    return config?.inquiryViewModel?.()||{
      empty:true,
      items:[],
      summary:{
        itemCount:0,
        productCount:0,
        customCount:0,
        productQuantity:0,
        estimatedTotal:0
      }
    };
  }

  function inquiryItemQuantity(item){
    return Math.max(
      1,
      Number(
        item?.normalizedQty||
        item?.qty||
        1
      )||1
    );
  }

  function inquiryItemMoq(item){
    return Math.max(
      1,
      Number(
        config?.itemMoq?.(item)||
        item?.moq||
        1
      )||1
    );
  }

  function inquiryItemScent(item){
    return text(
      config?.itemScentLabel?.(item)||
      item?.scent||
      ''
    );
  }

  function selectedScentLabel(view){
    const selectedId=
      text(view.config?.scentId);
    const scents=view.options?.scents||[];
    const selected=
      scents.find(
        scent=>text(scent?.id)===selectedId
      );

    return text(
      selected
        ? scentLabel(selected)
        : view.config?.scent||
          ''
    );
  }

  function currentConfigurationParts(view){
    return [
      text(view.config?.size),
      selectedScentLabel(view),
      choiceLabel(view.config?.pattern),
      choiceLabel(view.config?.pack)
    ].filter(Boolean);
  }

  function currentQuantity(view){
    return Math.max(
      1,
      Number(
        view.pricing?.quantity||
        view.config?.qty||
        1
      )||1
    );
  }

  function inquiryMoqGroups(data){
    const groups=new Map();

    for(const item of data?.items||[]){
      if(item?.type==='custom'){
        continue;
      }

      const series=text(item?.series);
      const size=text(item?.size);
      const key=`${series}::${size}`;
      const current=groups.get(key)||{
        series,
        size,
        quantity:0,
        moq:inquiryItemMoq(item)
      };

      current.quantity+=
        inquiryItemQuantity(item);
      current.moq=Math.max(
        current.moq,
        inquiryItemMoq(item)
      );
      groups.set(key,current);
    }

    return [...groups.values()];
  }

  function r151Format(value,replacements={}){
    let result=text(value);

    for(const [key,replacement] of Object.entries(replacements)){
      result=result.replaceAll(
        `{${key}}`,
        String(replacement)
      );
    }

    return result;
  }

  function inquiryItemConfigValue(item,key){
    const itemConfig=
      item?.config||
      item||
      {};

    return text(
      itemConfig?.[key]??
      item?.[key]??
      ''
    );
  }

  function currentInquiryItem(view,data=inquiryView()){
    const productId=text(view?.product?.id);
    const series=text(view?.product?.series);
    const configView=view?.config||{};
    const scentKey=text(
      configView.scentId||
      configView.scent
    );

    return (data?.items||[]).find(item=>{
      if(item?.type==='custom'){
        return false;
      }

      const itemScentKey=text(
        inquiryItemConfigValue(item,'scentId')||
        inquiryItemConfigValue(item,'scent')
      );

      return (
        text(item?.productId||item?.id)===productId&&
        text(item?.series)===series&&
        inquiryItemConfigValue(item,'size')===text(configView.size)&&
        itemScentKey===scentKey&&
        inquiryItemConfigValue(item,'pattern')===text(configView.pattern)&&
        inquiryItemConfigValue(item,'pack')===text(configView.pack)
      );
    })||null;
  }

  function dockCommerceState(view,data=inquiryView()){
    const quantity=currentQuantity(view);
    const unit=Number(view.pricing?.unitPrice||0)||0;
    const existing=currentInquiryItem(view,data);
    const existingQuantity=
      existing
        ? inquiryItemQuantity(existing)
        : 0;

    return {
      count:Math.max(0,Number(data.summary?.itemCount||0)||0),
      quantity,
      unit,
      total:unit*quantity,
      parts:currentConfigurationParts(view),
      existing,
      existingQuantity,
      addLabel:
        existing
          ? r151Format(
              r15UiCopy('addAgain'),
              {count:quantity}
            )
          : copy().addInquiry
    };
  }

  function commitDockQuantity(){
    const input=
      detailRoot?.querySelector(
        '[data-desktop-detail-dock-quantity]'
      );

    if(input){
      quantityValidation=
        config?.actions
          ?.setQuantity?.(
            input.value
          )||
        null;
    }

    return viewModel();
  }

  function setNodeText(selector,value){
    const node=detailRoot?.querySelector(selector);
    if(node){
      node.textContent=text(value);
    }
    return node;
  }

  function syncDock(
    view=viewModel(),
    {preserveQuantityInput=false}={}
  ){
    const dock=
      detailRoot?.querySelector(
        '[data-desktop-detail-dock]'
      );

    if(!dock){
      return false;
    }

    const state=dockCommerceState(view);

    setNodeText(
      '[data-desktop-detail-dock-config]',
      state.parts.join(' / ')||'—'
    );
    setNodeText(
      '[data-desktop-detail-dock-moq]',
      moqRuleCompactText(view)
    );
    setNodeText(
      '[data-desktop-detail-dock-unit]',
      money(state.unit)
    );
    setNodeText(
      '[data-desktop-detail-dock-amount]',
      `${r15UiCopy('currentAmount')} · ${money(state.total)}`
    );
    setNodeText(
      '[data-desktop-detail-dock-count]',
      state.count
    );
    setNodeText(
      '[data-desktop-detail-dock-add-label]',
      state.addLabel
    );

    const existingNode=
      dock.querySelector(
        '[data-desktop-detail-dock-existing]'
      );

    if(existingNode){
      existingNode.hidden=!state.existing;
      existingNode.textContent=
        state.existing
          ? r151Format(
              r15UiCopy('inInquiryQuantity'),
              {count:state.existingQuantity}
            )
          : '';
    }

    const input=
      dock.querySelector(
        '[data-desktop-detail-dock-quantity]'
      );

    if(
      input&&
      !(
        preserveQuantityInput&&
        root.document?.activeElement===input
      )
    ){
      input.value=String(state.quantity);
    }

    const inquiryButton=
      dock.querySelector(
        '[data-desktop-detail-action="toggle-inquiry-drawer"]'
      );

    inquiryButton?.setAttribute(
      'aria-expanded',
      inquiryDrawerOpen?'true':'false'
    );

    return true;
  }

  function dockHtml(view){
    const state=dockCommerceState(view);

    return `
      <section
        class="desktop-detail-dock"
        data-desktop-detail-dock
        aria-label="${escapeHtml(r15UiCopy('currentConfiguration'))}"
      >
        <div class="desktop-container--wide desktop-detail-dock__inner">
          <div class="desktop-detail-dock__configuration">
            <span>${escapeHtml(r15UiCopy('currentConfiguration'))}</span>
            <strong data-desktop-detail-dock-config>${escapeHtml(state.parts.join(' / ')||'—')}</strong>
            <small data-desktop-detail-dock-moq>${escapeHtml(moqRuleCompactText(view))}</small>
          </div>

          <div class="desktop-detail-dock__commercial">
            <span>${escapeHtml(r15UiCopy('unitPrice'))}</span>
            <strong data-desktop-detail-dock-unit>${escapeHtml(money(state.unit))}</strong>
            <small data-desktop-detail-dock-amount>${escapeHtml(r15UiCopy('currentAmount'))} · ${escapeHtml(money(state.total))}</small>
            <small
              data-desktop-detail-dock-existing
              ${state.existing?'':'hidden'}
            >
              ${
                state.existing
                  ? escapeHtml(
                      r151Format(
                        r15UiCopy('inInquiryQuantity'),
                        {count:state.existingQuantity}
                      )
                    )
                  : ''
              }
            </small>
          </div>

          <button
            class="desktop-detail-dock__inquiry"
            type="button"
            data-desktop-detail-action="toggle-inquiry-drawer"
            aria-expanded="${inquiryDrawerOpen?'true':'false'}"
          >
            <span>${escapeHtml(r15UiCopy('inquiry'))}</span>
            <strong data-desktop-detail-dock-count>${escapeHtml(state.count)}</strong>
          </button>

          <div class="desktop-detail-dock__actions">
            <div class="desktop-detail-dock__quantity">
              <button
                type="button"
                data-desktop-detail-action="dock-quantity-delta"
                data-desktop-detail-delta="-1"
                aria-label="-"
              >−</button>

              <label>
                <input
                  type="number"
                  value="${escapeHtml(state.quantity)}"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  data-desktop-detail-dock-quantity
                  aria-label="${escapeHtml(r15UiCopy('currentItemQuantity'))}"
                  title="${escapeHtml(r15UiCopy('currentItemQuantity'))}"
                >
                <span>${escapeHtml(qtyUnit())}</span>
              </label>

              <button
                type="button"
                data-desktop-detail-action="dock-quantity-delta"
                data-desktop-detail-delta="1"
                aria-label="+"
              >+</button>
            </div>

            <button
              class="desktop-detail-add desktop-detail-dock__add"
              type="button"
              data-desktop-detail-action="add-inquiry"
            >
              <span data-desktop-detail-dock-add-label>${escapeHtml(state.addLabel)}</span>
              <span aria-hidden="true">→</span>
            </button>

            <div
              class="desktop-detail-add-feedback desktop-detail-dock__feedback"
              data-desktop-detail-dock-feedback
              role="status"
              aria-live="polite"
              hidden
            >
              ${escapeHtml(copy().added)}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function inquiryItemConfigText(item){
    return [
      text(item?.size),
      inquiryItemScent(item),
      choiceLabel(item?.pattern),
      choiceLabel(item?.pack)
    ].filter(Boolean).join(' / ');
  }

  function inquiryDrawerProductRow(item){
    const quantity=inquiryItemQuantity(item);

    return `
      <article class="desktop-detail-drawer-item" data-inquiry-id="${escapeHtml(item?.id||'')}">
        <div class="desktop-detail-drawer-item__media">
          ${
            item?.cover
              ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(productName(item))}" loading="lazy" decoding="async">`
              : '<span aria-hidden="true"></span>'
          }
        </div>

        <div class="desktop-detail-drawer-item__body">
          <div class="desktop-detail-drawer-item__head">
            <div>
              <small>${escapeHtml(seriesLabel(item?.series))}</small>
              <strong>${escapeHtml(productName(item))}</strong>
            </div>

            <button
              type="button"
              data-desktop-detail-action="drawer-remove"
              data-desktop-detail-inquiry-id="${escapeHtml(item?.id||'')}"
            >${escapeHtml(r15UiCopy('remove'))}</button>
          </div>

          <p>${escapeHtml(inquiryItemConfigText(item))}</p>

          <div class="desktop-detail-drawer-item__commercial">
            <div class="desktop-detail-drawer-quantity">
              <button
                type="button"
                data-desktop-detail-action="drawer-delta"
                data-desktop-detail-inquiry-id="${escapeHtml(item?.id||'')}"
                data-desktop-detail-delta="-1"
                aria-label="-"
              >−</button>

              <input
                type="number"
                min="1"
                step="1"
                value="${escapeHtml(quantity)}"
                data-desktop-detail-drawer-quantity="${escapeHtml(item?.id||'')}"
              >

              <button
                type="button"
                data-desktop-detail-action="drawer-delta"
                data-desktop-detail-inquiry-id="${escapeHtml(item?.id||'')}"
                data-desktop-detail-delta="1"
                aria-label="+"
              >+</button>
            </div>

            <div>
              <span>${escapeHtml(money(item?.unitPrice||0))} / ${escapeHtml(qtyUnit())}</span>
              <strong>${escapeHtml(money(item?.subtotal||0))}</strong>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function inquiryDrawerCustomRow(item){
    return `
      <article class="desktop-detail-drawer-item desktop-detail-drawer-item--custom" data-inquiry-id="${escapeHtml(item?.id||'')}">
        <div class="desktop-detail-drawer-item__custom-mark" aria-hidden="true">C</div>
        <div class="desktop-detail-drawer-item__body">
          <div class="desktop-detail-drawer-item__head">
            <div>
              <small>${escapeHtml(r15UiCopy('customProject'))}</small>
              <strong>${escapeHtml(choiceLabel(item?.use)||r15UiCopy('customProject'))}</strong>
            </div>
            <button
              type="button"
              data-desktop-detail-action="drawer-remove"
              data-desktop-detail-inquiry-id="${escapeHtml(item?.id||'')}"
            >${escapeHtml(r15UiCopy('remove'))}</button>
          </div>
          <p>${escapeHtml(r15UiCopy('quotedSeparately'))}</p>
        </div>
      </article>
    `;
  }

  function inquiryDrawerMoqHtml(data){
    const groups=inquiryMoqGroups(data);

    if(!groups.length){
      return '';
    }

    return `
      <section class="desktop-detail-drawer-moq">
        <span>${escapeHtml(r15UiCopy('moqProgress'))}</span>
        ${groups.map(group=>{
          const met=group.quantity>=group.moq;
          const remaining=Math.max(0,group.moq-group.quantity);

          return `
            <div>
              <p>
                <strong>${escapeHtml(seriesLabel(group.series))}</strong>
                ${group.size?`<small>· ${escapeHtml(group.size)}</small>`:''}
              </p>
              <p>
                <b>${escapeHtml(group.quantity)} / ${escapeHtml(group.moq)} ${escapeHtml(qtyUnit())}</b>
                <small>${escapeHtml(
                  met
                    ? r15UiCopy('moqMet')
                    : r15ReplaceCount(r15UiCopy('moqRemaining'),remaining)
                )}</small>
              </p>
            </div>
          `;
        }).join('')}
      </section>
    `;
  }

  function inquiryDrawerHtml(){
    const data=inquiryView();
    const items=data.items||[];
    const count=Math.max(0,Number(data.summary?.itemCount||0)||0);

    return `
      <div
        class="desktop-detail-inquiry-layer ${inquiryDrawerOpen?'is-open':''}"
        data-desktop-detail-inquiry-layer
        ${inquiryDrawerOpen?'':'hidden'}
      >
        <button
          class="desktop-detail-inquiry-backdrop"
          type="button"
          data-desktop-detail-action="close-inquiry-drawer"
          aria-label="${escapeHtml(r15UiCopy('close'))}"
        ></button>

        <aside
          class="desktop-detail-inquiry-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="${escapeHtml(r15UiCopy('inquiryQuickView'))}"
        >
          <header class="desktop-detail-inquiry-drawer__head">
            <div>
              <span>${escapeHtml(r15UiCopy('inquiryQuickView'))}</span>
              <strong>${escapeHtml(r15ReplaceCount(r15UiCopy('selectedItems'),count))}</strong>
            </div>

            <button
              type="button"
              data-desktop-detail-action="close-inquiry-drawer"
              aria-label="${escapeHtml(r15UiCopy('close'))}"
            >×</button>
          </header>

          <div class="desktop-detail-inquiry-drawer__body">
            ${
              items.length
                ? items.map(item=>
                    item?.type==='custom'
                      ? inquiryDrawerCustomRow(item)
                      : inquiryDrawerProductRow(item)
                  ).join('')
                : `
                  <div class="desktop-detail-inquiry-empty">
                    <strong>${escapeHtml(r15UiCopy('inquiryEmpty'))}</strong>
                    <p>${escapeHtml(r15UiCopy('inquiryEmptyBody'))}</p>
                  </div>
                `
            }

            ${inquiryDrawerMoqHtml(data)}
          </div>

          <footer class="desktop-detail-inquiry-drawer__footer">
            <button
              class="desktop-detail-inquiry-full"
              type="button"
              data-desktop-detail-action="open-inquiry"
            >
              ${escapeHtml(r15UiCopy('viewFullInquiry'))}
              <span aria-hidden="true">→</span>
            </button>
          </footer>
        </aside>
      </div>
    `;
  }

  function syncPersistentCommerce(view=viewModel()){
    syncDock(view);

    const layer=
      detailRoot?.querySelector(
        '[data-desktop-detail-inquiry-layer]'
      );

    if(layer){
      layer.outerHTML=inquiryDrawerHtml();
    }
  }
  function galleryHtml(
    view,
    images
  ){
    const product=view.product;
    const name=productName(product);
    const selected=
      images[activeImageIndex]||
      images[0]||
      '';

    return `
      <div class="desktop-detail-gallery ${images.length>1?'has-thumbs':'is-single'}">
        <div class="desktop-detail-main-media media-frame">
          ${
            selected
              ? mediaImageHtml(
                  selected,
                  {
                    className:'desktop-detail-main-image',
                    kind:'detail',
                    priority:'high',
                    alt:name,
                    width:960,
                    height:1200
                  }
                )
              : `
                <div class="desktop-detail-media-empty">
                  ${escapeHtml(copy().empty)}
                </div>
              `
          }
        </div>

        ${galleryCaptionHtml(view,images)}

        ${
          images.length>1
            ? `
              <div
                class="desktop-detail-thumbs"
                aria-label="${escapeHtml(copy().productDetails)}"
              >
                ${images
                  .map(
                    (source,index)=>`
                      <button
                        class="desktop-detail-thumb ${index===activeImageIndex?'is-active':''}"
                        type="button"
                        data-desktop-detail-action="gallery"
                        data-desktop-detail-index="${index}"
                        aria-pressed="${index===activeImageIndex?'true':'false'}"
                        aria-label="${escapeHtml(`${name} ${index+1}`)}"
                      >
                        <span class="desktop-detail-thumb__media media-frame">
                          ${mediaImageHtml(
                            source,
                            {
                              className:'desktop-detail-thumb__image',
                              kind:'catalog',
                              priority:index<2?'high':'auto',
                              alt:'',
                              width:240,
                              height:300
                            }
                          )}
                        </span>
                      </button>
                    `
                  )
                  .join('')}
              </div>
            `
            : ''
        }
      </div>
    `;
  }

  function sizeOptionsHtml(view){
    const c=copy();
    const selected=
      text(
        view.config?.size
      );

    return `
      <section class="desktop-detail-option-block">
        <div class="desktop-detail-option-head">
          <h2>${escapeHtml(c.size)}</h2>
          <span>${escapeHtml(sizeDimension(selected))}</span>
        </div>

        <div class="desktop-detail-size-grid">
          ${(view.options?.sizes||[])
            .map(size=>{
              const active=
                size===selected;

              return `
                <button
                  class="desktop-detail-size ${active?'is-active':''}"
                  type="button"
                  data-desktop-detail-action="option"
                  data-desktop-detail-key="size"
                  data-desktop-detail-value="${escapeHtml(size)}"
                  aria-pressed="${active?'true':'false'}"
                >
                  <strong>${escapeHtml(size)}</strong>
                  <span>${escapeHtml(sizeDimension(size))}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function scentSeriesHtml(view){
    const options=
      view.options?.scentSeries||
      [];

    if(!options.length){
      return '';
    }

    const c=copy();
    const selected=
      text(
        view.config?.scentSeries
      );

    return `
      <section class="desktop-detail-option-block">
        <div class="desktop-detail-option-head">
          <h2>${escapeHtml(c.scentCollection)}</h2>
        </div>

        <div class="desktop-detail-choice-row">
          ${options
            .map(value=>{
              const active=
                value===selected;

              return `
                <button
                  class="desktop-detail-choice ${active?'is-active':''}"
                  type="button"
                  data-desktop-detail-action="option"
                  data-desktop-detail-key="scentSeries"
                  data-desktop-detail-value="${escapeHtml(value)}"
                  aria-pressed="${active?'true':'false'}"
                >
                  ${escapeHtml(seriesLabel(value))}
                </button>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function scentNotesHtml(
    scent
  ){
    if(!scent){
      return '';
    }

    const notes=
      scent.notes||
      {};

    const rows=[
      [
        copy().topNotes,
        localizedScentValue(
          notes.top
        )
      ],
      [
        copy().heartNotes,
        localizedScentValue(
          notes.heart
        )
      ],
      [
        copy().baseNotes,
        localizedScentValue(
          notes.base
        )
      ]
    ].filter(
      row=>Boolean(row[1])
    );

    if(!rows.length){
      return '';
    }

    return `
      <div class="desktop-detail-scent-notes">
        <strong>${escapeHtml(copy().scentNotes)}</strong>

        <div>
          ${rows
            .map(
              ([label,value])=>`
                <span>
                  <small>${escapeHtml(label)}</small>
                  <b>${escapeHtml(value)}</b>
                </span>
              `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  function scentHtml(view){
    const c=copy();
    const selectedId=
      text(
        view.config?.scentId
      );

    const scents=
      view.options?.scents||
      [];

    const selected=
      scents.find(
        scent=>
          text(scent?.id)===
          selectedId
      )||
      scents[0]||
      null;

    return `
      <section class="desktop-detail-option-block">
        <div class="desktop-detail-option-head">
          <h2>${escapeHtml(c.scent)}</h2>
          <span>${escapeHtml(scents.length)}</span>
        </div>

        <div class="desktop-detail-choice-row desktop-detail-choice-row--wrap">
          ${scents
            .map(scent=>{
              const id=
                text(
                  scent?.id
                );

              const active=
                id===selectedId;

              return `
                <button
                  class="desktop-detail-choice ${active?'is-active':''}"
                  type="button"
                  data-desktop-detail-action="scent"
                  data-desktop-detail-scent="${escapeHtml(id)}"
                  aria-pressed="${active?'true':'false'}"
                >
                  ${escapeHtml(scentLabel(scent))}
                </button>
              `;
            })
            .join('')}
        </div>

        ${scentNotesHtml(selected)}
      </section>
    `;
  }

  function visualOptionsHtml(
    view,
    key,
    values,
    label
  ){
    if(!values?.length){
      return '';
    }

    const selected=
      text(
        view.config?.[key]
      );

    return `
      <section class="desktop-detail-option-block">
        <div class="desktop-detail-option-head">
          <h2>${escapeHtml(label)}</h2>
        </div>

        <div class="desktop-detail-visual-options">
          ${values
            .map(value=>{
              const active=
                value===selected;

              const image=
                optionImage(
                  key,
                  value,
                  view
                );

              return `
                <button
                  class="desktop-detail-visual-option ${active?'is-active':''}"
                  type="button"
                  data-desktop-detail-action="option"
                  data-desktop-detail-key="${escapeHtml(key)}"
                  data-desktop-detail-value="${escapeHtml(value)}"
                  aria-pressed="${active?'true':'false'}"
                >
                  ${
                    image
                      ? `
                        <span class="desktop-detail-visual-option__media media-frame">
                          ${mediaImageHtml(
                            image,
                            {
                              className:'desktop-detail-option-image',
                              kind:'shared',
                              priority:'auto',
                              alt:choiceLabel(value),
                              width:240,
                              height:240
                            }
                          )}
                        </span>
                      `
                      : `
                        <span class="desktop-detail-visual-option__placeholder"></span>
                      `
                  }

                  <span>${escapeHtml(choiceLabel(value))}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function packagingHtml(view){
    const values=
      view.options?.packs||
      [];

    if(!values.length){
      return '';
    }

    const product=
      view.product;

    const selected=
      text(
        view.config?.pack
      );

    return `
      <section class="desktop-detail-option-block">
        <div class="desktop-detail-option-head">
          <h2>${escapeHtml(copy().packaging)}</h2>
        </div>

        <div class="desktop-detail-packaging-grid">
          ${values
            .map(value=>{
              const active=
                value===selected;

              const surcharge=
                packSurcharge(
                  product,
                  value
                );

              const image=
                optionImage(
                  'pack',
                  value,
                  view
                );

              return `
                <button
                  class="desktop-detail-packaging ${active?'is-active':''}"
                  type="button"
                  data-desktop-detail-action="option"
                  data-desktop-detail-key="pack"
                  data-desktop-detail-value="${escapeHtml(value)}"
                  aria-pressed="${active?'true':'false'}"
                >
                  ${
                    image
                      ? `
                        <span class="desktop-detail-packaging__media media-frame">
                          ${mediaImageHtml(
                            image,
                            {
                              className:'desktop-detail-option-image',
                              kind:'shared',
                              priority:'auto',
                              alt:choiceLabel(value),
                              width:260,
                              height:190
                            }
                          )}
                        </span>
                      `
                      : ''
                  }

                  <span class="desktop-detail-packaging__copy">
                    <strong>${escapeHtml(choiceLabel(value))}</strong>
                    <small>
                      ${
                        surcharge>0
                          ? `+ ${escapeHtml(money(surcharge))} / ${escapeHtml(qtyUnit())}`
                          : escapeHtml(copy().included)
                      }
                    </small>
                  </span>
                </button>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function quantityMessage(){
    if(!quantityValidation){
      return '';
    }

    if(
      quantityValidation.invalid||
      quantityValidation.belowMin||
      quantityValidation.aboveMax
    ){
      return copy().pricingNote;
    }

    return '';
  }

  function quantityHtml(view){
    const c=copy();
    const limits=
      view.limits||
      {};

    const quantity=
      Number(
        view.pricing?.quantity||
        view.config?.qty||
        limits.qtyMin||
        1
      );

    return `
      <section class="desktop-detail-option-block desktop-detail-quantity-block">
        <div class="desktop-detail-option-head">
          <h2>${escapeHtml(c.quantity)}</h2>

          <span>
            ${escapeHtml(c.moq)}
            ${escapeHtml(view.pricing?.moq||1)}
          </span>
        </div>

        <div class="desktop-detail-quantity">
          <button
            type="button"
            data-desktop-detail-action="quantity-delta"
            data-desktop-detail-delta="-${escapeHtml(limits.qtyStep||1)}"
            aria-label="-"
          >
            −
          </button>

          <label>
            <input
              type="number"
              value="${escapeHtml(quantity)}"
              min="${escapeHtml(limits.qtyMin||1)}"
              max="${escapeHtml(limits.qtyMax||1000000)}"
              step="${escapeHtml(limits.qtyStep||1)}"
              data-desktop-detail-quantity
              inputmode="numeric"
            >
            <span>${escapeHtml(qtyUnit())}</span>
          </label>

          <button
            type="button"
            data-desktop-detail-action="quantity-delta"
            data-desktop-detail-delta="${escapeHtml(limits.qtyStep||1)}"
            aria-label="+"
          >
            +
          </button>
        </div>

        <p class="desktop-detail-moq-note">
          ${escapeHtml(c.moqNote)}
        </p>

        ${
          quantityMessage()
            ? `
              <p class="desktop-detail-quantity-message">
                ${escapeHtml(quantityMessage())}
              </p>
            `
            : ''
        }
      </section>
    `;
  }

  function summaryHtml(view){
    const c=copy();

    const unit=
      Number(
        view.pricing?.unitPrice||
        0
      );

    const quantity=
      Number(
        view.pricing?.quantity||
        view.config?.qty||
        0
      );

    const total=
      unit*
      quantity;

    return `
      <section class="desktop-detail-summary">
        <div class="desktop-detail-summary__row">
          <span>${escapeHtml(c.unitPrice)}</span>
          <strong>${escapeHtml(money(unit))}</strong>
        </div>

        <div class="desktop-detail-summary__row desktop-detail-summary__row--total">
          <span>${escapeHtml(c.estimatedTotal)}</span>
          <strong>${escapeHtml(money(total))}</strong>
        </div>

        <p>${escapeHtml(c.pricingNote)}</p>

        <button
          class="desktop-detail-add"
          type="button"
          data-desktop-detail-action="add-inquiry"
        >
          ${escapeHtml(c.addInquiry)}
          <span aria-hidden="true">→</span>
        </button>

        <button
          class="desktop-detail-custom-link"
          type="button"
          data-desktop-detail-action="custom-project"
        >
          ${escapeHtml(c.customProject)}
          <span aria-hidden="true">→</span>
        </button>

        <div
          class="desktop-detail-add-feedback"
          role="status"
          aria-live="polite"
          hidden
        >
          ${escapeHtml(c.added)}
        </div>
      </section>
    `;
  }

  function informationHtml(view){
    const c=copy();

    const sizes=
      view.options?.sizes||
      [];

    const configured=[
      [
        c.size,
        choiceLabel(
          view.config?.size
        )
      ],
      [
        c.scent,
        text(
          view.config?.scent
        )
      ],
      [
        c.pattern,
        choiceLabel(
          view.config?.pattern
        )
      ],
      [
        c.packaging,
        choiceLabel(
          view.config?.pack
        )
      ]
    ].filter(
      row=>Boolean(row[1])
    );

    return `
      <section class="desktop-detail-lower desktop-container--wide">
        <article class="desktop-detail-info-card">
          <div class="desktop-eyebrow">
            ${escapeHtml(c.productDetails)}
          </div>

          <div class="desktop-detail-info-list">
            <div>
              <span>${escapeHtml(c.productId)}</span>
              <strong>${escapeHtml(view.product?.id||'—')}</strong>
            </div>

            <div>
              <span>${escapeHtml(c.series)}</span>
              <strong>${escapeHtml(seriesLabel(view.product?.series))}</strong>
            </div>

            <div>
              <span>${escapeHtml(c.availableSizes)}</span>
              <strong>${escapeHtml(sizes.join(' / '))}</strong>
            </div>

            <div>
              <span>${escapeHtml(c.moq)}</span>
              <strong>${escapeHtml(view.pricing?.moq||1)} ${escapeHtml(qtyUnit())}</strong>
            </div>
          </div>
        </article>

        <article class="desktop-detail-info-card">
          <div class="desktop-eyebrow">
            ${escapeHtml(c.configuredOptions)}
          </div>

          <div class="desktop-detail-info-list">
            ${configured
              .map(
                ([label,value])=>`
                  <div>
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>
                `
              )
              .join('')}
          </div>
        </article>
      </section>
    `;
  }

  function configurationHtml(view){
    const c=copy();
    const product=view.product;
    const description=
      productDescription(
        product
      );

    return `
      <aside class="desktop-detail-config">
        <div class="desktop-detail-heading">
          <div class="desktop-eyebrow">
            ${escapeHtml(seriesLabel(product?.series))}
          </div>

          <h1>${escapeHtml(productName(product))}</h1>

          ${
            description
              ? `<p class="desktop-detail-heading__description">${escapeHtml(description)}</p>`
              : ''
          }

          <div class="desktop-detail-heading__commercial">
            <strong>
              ${escapeHtml(
                config?.productPrice?.(
                  product
                )||
                money(
                  view.pricing?.unitPrice||
                  0
                )
              )}
            </strong>

            <span>${escapeHtml(moqRuleCompactText(view))}</span>
          </div>

          <div class="desktop-detail-product-id">
            ${escapeHtml(c.productId)}
            ·
            ${escapeHtml(product?.id||'—')}
          </div>
        </div>

        <div class="desktop-detail-options">
          ${sizeOptionsHtml(view)}
          ${scentSeriesHtml(view)}
          ${scentHtml(view)}
          ${visualOptionsHtml(
            view,
            'pattern',
            view.options?.patterns||[],
            c.pattern
          )}
          ${packagingHtml(view)}
        </div>

        <div class="desktop-detail-config-footer">
          <div class="desktop-detail-moq-rule">
            <strong>${escapeHtml(r15UiCopy('moqRuleHeading'))}</strong>
            <span>${escapeHtml(moqRuleText(view))}</span>
          </div>

          <p>${escapeHtml(c.pricingNote)}</p>

          <button
            class="desktop-detail-custom-link"
            type="button"
            data-desktop-detail-action="custom-project"
          >
            ${escapeHtml(c.customProject)}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    `;
  }

  function pageHtml(view){
    const c=copy();

    if(view.empty){
      return `
        <div class="desktop-detail-empty desktop-container">
          <p>${escapeHtml(c.empty)}</p>
          <button
            class="desktop-primary-button"
            type="button"
            data-desktop-detail-action="back"
          >
            ${escapeHtml(c.back)}
          </button>
        </div>
      `;
    }

    syncProductGallery(view);

    const product=view.product;
    const images=currentImages(view);
    const description=
      productDescription(
        product
      );

    return `
      <div class="desktop-detail-page" data-desktop-detail-presentation="${escapeHtml(PRESENTATION_VERSION)}" data-desktop-detail-polish="${escapeHtml(POLISH_VERSION)}" data-desktop-detail-interaction="${escapeHtml(INTERACTION_VERSION)}">
        <div class="desktop-container--wide">
          <button
            class="desktop-detail-back"
            type="button"
            data-desktop-detail-action="back"
          >
            <span aria-hidden="true">←</span>
            ${escapeHtml(c.back)}
          </button>

          <div class="desktop-detail-layout">
            ${galleryHtml(view,images)}

            ${configurationHtml(view)}
          </div>
        </div>

        ${dockHtml(view)}
        ${inquiryDrawerHtml()}
        <!-- B7-00B.4D R1.5 — duplicate lower Product Details / Current Configuration removed. -->
      </div>
    `;
  }

  async function selectGalleryImage(nextIndex){
    if(!detailRoot){
      return false;
    }

    const view=viewModel();
    const images=currentImages(view);

    if(!images.length){
      return false;
    }

    activeImageIndex=
      Math.max(
        0,
        Math.min(
          Math.trunc(Number(nextIndex)||0),
          images.length-1
        )
      );

    const source=
      images[activeImageIndex];

    const mainImage=
      detailRoot.querySelector(
        '.desktop-detail-main-image'
      );

    if(mainImage&&source){
      mainImage.dataset
        .desktopDetailSource=
        source;

      mainImage.alt=
        productName(view.product);

      const frame=
        mainImage.closest?.(
          '.media-frame'
        );

      frame?.classList?.remove(
        'is-loaded'
      );

      const media=
        config?.media?.();

      if(media?.loadResponsiveImage){
        await media.loadResponsiveImage(
          mainImage,
          source,
          'detail',
          'high'
        );
      }else{
        mainImage.src=source;
        frame?.classList?.add(
          'is-loaded'
        );
      }
    }

    for(const thumb of detailRoot.querySelectorAll(
      '[data-desktop-detail-action="gallery"]'
    )){
      const index=
        Number(
          thumb.dataset
            .desktopDetailIndex
        );

      const active=
        index===activeImageIndex;

      thumb.classList.toggle(
        'is-active',
        active
      );

      thumb.setAttribute(
        'aria-pressed',
        active
          ? 'true'
          : 'false'
      );
    }

    syncGalleryCaption(
      view,
      images
    );

    return true;
  }

  function renderConfiguration({
    preserveScroll=true
  }={}){
    if(!detailRoot){
      return false;
    }

    const current=
      detailRoot.querySelector(
        '.desktop-detail-config'
      );

    if(!current){
      return render({
        preserveScroll
      });
    }

    const y=
      preserveScroll
        ? Number(root.scrollY||0)
        : null;

    current.outerHTML=
      configurationHtml(
        viewModel()
      );

    const next=
      detailRoot.querySelector(
        '.desktop-detail-config'
      );

    loadResponsiveMedia(next);
    syncPersistentCommerce(
      viewModel()
    );

    if(
      preserveScroll&&
      Number.isFinite(y)
    ){
      root.requestAnimationFrame?.(
        ()=>
          root.scrollTo?.(
            0,
            y
          )
      );
    }

    return true;
  }

  async function loadResponsiveMedia(scope=detailRoot){
    if(!scope){
      return;
    }

    const media=
      config?.media?.();

    const images=[
      ...scope.querySelectorAll(
        'img[data-desktop-detail-source]'
      )
    ];

    await Promise.all(
      images.map(async img=>{
        const source=
          text(
            img.dataset
              .desktopDetailSource
          );

        if(!source){
          return;
        }

        const kind=
          text(
            img.dataset
              .desktopDetailKind
          )||
          'detail';

        const priority=
          text(
            img.dataset
              .desktopDetailPriority
          )||
          'auto';

        if(
          media?.loadResponsiveImage
        ){
          await media
            .loadResponsiveImage(
              img,
              source,
              kind,
              priority
            );

          return;
        }

        img.src=source;
      })
    );
  }

  function preserveWindowScroll(
    callback
  ){
    const y=
      Number(
        root.scrollY||
        0
      );

    callback();

    root.requestAnimationFrame?.(
      ()=>
        root.scrollTo?.(
          0,
          y
        )
    );
  }

  function render({
    preserveScroll=false
  }={}){
    if(!detailRoot){
      return false;
    }

    const view=
      viewModel();

    const y=
      preserveScroll
        ? Number(root.scrollY||0)
        : null;

    detailRoot.innerHTML=
      pageHtml(view);

    loadResponsiveMedia();

    if(
      preserveScroll&&
      Number.isFinite(y)
    ){
      root.requestAnimationFrame?.(
        ()=>
          root.scrollTo?.(
            0,
            y
          )
      );
    }

    return true;
  }

  function flashAdded(message=''){
    const node=
      detailRoot?.querySelector(
        '[data-desktop-detail-dock-feedback]'
      )||
      detailRoot?.querySelector(
        '.desktop-detail-add-feedback'
      );

    if(!node){
      return;
    }

    root.clearTimeout?.(
      feedbackTimer
    );

    if(message){
      node.textContent=message;
    }

    node.hidden=false;

    feedbackTimer=
      root.setTimeout?.(
        ()=>{
          node.hidden=true;
        },
        1800
      );
  }

  function onClick(event){
    const target=
      event.target.closest?.(
        '[data-desktop-detail-action]'
      );

    if(
      !target||
      !detailRoot?.contains(target)
    ){
      return;
    }

    const action=
      target.dataset
        .desktopDetailAction;

    if(action==='back'){
      config?.actions?.back?.();
      return;
    }

    if(action==='toggle-inquiry-drawer'){
      inquiryDrawerOpen=!inquiryDrawerOpen;
      syncPersistentCommerce(
        viewModel()
      );
      return;
    }

    if(action==='close-inquiry-drawer'){
      inquiryDrawerOpen=false;
      syncPersistentCommerce(
        viewModel()
      );
      return;
    }

    if(action==='open-inquiry'){
      inquiryDrawerOpen=false;
      config?.actions?.openInquiry?.();
      return;
    }

    if(action==='dock-quantity-delta'){
      quantityValidation=null;
      config?.actions?.adjustQuantity?.(
        Number(
          target.dataset.desktopDetailDelta||0
        )
      );
      syncDock(
        viewModel()
      );
      return;
    }

    if(action==='drawer-delta'){
      config?.actions?.adjustInquiryQuantity?.(
        target.dataset.desktopDetailInquiryId,
        Number(target.dataset.desktopDetailDelta||0)
      );
      syncPersistentCommerce(
        viewModel()
      );
      return;
    }

    if(action==='drawer-remove'){
      config?.actions?.removeInquiryItem?.(
        target.dataset.desktopDetailInquiryId
      );
      syncPersistentCommerce(
        viewModel()
      );
      return;
    }

    if(action==='gallery'){
      const next=
        Number(
          target.dataset
            .desktopDetailIndex
        );

      if(Number.isInteger(next)){
        selectGalleryImage(next);
      }

      return;
    }

    if(action==='option'){
      quantityValidation=null;

      config?.actions
        ?.setOption?.(
          target.dataset
            .desktopDetailKey,
          target.dataset
            .desktopDetailValue
        );

      renderConfiguration({
        preserveScroll:true
      });

      return;
    }

    if(action==='scent'){
      quantityValidation=null;

      config?.actions
        ?.setScent?.(
          target.dataset
            .desktopDetailScent
        );

      renderConfiguration({
        preserveScroll:true
      });

      return;
    }

    if(action==='quantity-delta'){
      quantityValidation=null;

      config?.actions
        ?.adjustQuantity?.(
          Number(
            target.dataset
              .desktopDetailDelta||
            0
          )
        );

      renderConfiguration({
        preserveScroll:true
      });

      return;
    }

    if(action==='add-inquiry'){
      const committedView=
        commitDockQuantity();
      const batchQuantity=
        currentQuantity(committedView);
      const beforeData=
        inquiryView();
      const beforeItem=
        currentInquiryItem(
          committedView,
          beforeData
        );

      config?.actions
        ?.addInquiry?.();

      const afterData=
        inquiryView();
      const afterItem=
        currentInquiryItem(
          committedView,
          afterData
        );
      const afterQuantity=
        afterItem
          ? inquiryItemQuantity(afterItem)
          : batchQuantity;

      syncPersistentCommerce(
        committedView
      );

      const feedback=
        beforeItem
          ? r151Format(
              r15UiCopy('addedAgain'),
              {
                count:batchQuantity,
                total:afterQuantity
              }
            )
          : r151Format(
              r15UiCopy('addedFirst'),
              {count:batchQuantity}
            );

      root.requestAnimationFrame?.(
        ()=>{
          if(
            detailRoot&&
            !detailRoot.hidden
          ){
            flashAdded(feedback);
          }
        }
      );

      return;
    }

    if(action==='custom-project'){
      config?.actions
        ?.customProject?.();
    }
  }

  function onInput(event){
    const dockInput=
      event.target.closest?.(
        '[data-desktop-detail-dock-quantity]'
      );

    if(
      !dockInput||
      !detailRoot?.contains(dockInput)
    ){
      return;
    }

    const raw=Number(dockInput.value);
    if(!Number.isFinite(raw)||raw<1){
      return;
    }

    quantityValidation=
      config?.actions
        ?.setQuantity?.(
          dockInput.value
        )||
      null;

    syncDock(
      viewModel(),
      {preserveQuantityInput:true}
    );
  }

  function onChange(event){
    const dockInput=
      event.target.closest?.(
        '[data-desktop-detail-dock-quantity]'
      );

    if(
      dockInput&&
      detailRoot?.contains(dockInput)
    ){
      quantityValidation=
        config?.actions
          ?.setQuantity?.(
            dockInput.value
          )||
        null;

      syncDock(
        viewModel()
      );
      return;
    }

    const drawerInput=
      event.target.closest?.(
        '[data-desktop-detail-drawer-quantity]'
      );

    if(
      drawerInput&&
      detailRoot?.contains(drawerInput)
    ){
      config?.actions?.setInquiryQuantity?.(
        drawerInput.dataset.desktopDetailDrawerQuantity,
        drawerInput.value
      );
      syncPersistentCommerce(
        viewModel()
      );
      return;
    }

    const input=
      event.target.closest?.(
        '[data-desktop-detail-quantity]'
      );

    if(
      !input||
      !detailRoot?.contains(input)
    ){
      return;
    }

    quantityValidation=
      config?.actions
        ?.setQuantity?.(
          input.value
        )||
      null;

    preserveWindowScroll(
      ()=>render()
    );
  }

  function onKeyDown(event){
    if(
      event.key==='Escape'&&
      inquiryDrawerOpen
    ){
      inquiryDrawerOpen=false;
      syncPersistentCommerce(
        viewModel()
      );
      return;
    }

    const input=
      event.target.closest?.(
        '[data-desktop-detail-quantity], [data-desktop-detail-dock-quantity], [data-desktop-detail-drawer-quantity]'
      );

    if(
      !input||
      event.key!=='Enter'
    ){
      return;
    }

    event.preventDefault();
    input.blur();
  }

  function configure(options={}){
    config={
      content:
        typeof options.content==='function'
          ? options.content
          : ()=>({}),
      language:
        typeof options.language==='function'
          ? options.language
          : ()=>'en',
      viewModel:
        typeof options.viewModel==='function'
          ? options.viewModel
          : ()=>({empty:true}),
      seriesLabel:
        options.seriesLabel,
      productName:
        options.productName,
      productDescription:
        options.productDescription,
      productCover:
        options.productCover,
      productImages:
        options.productImages,
      productPrice:
        options.productPrice,
      choiceLabel:
        options.choiceLabel,
      scentDisplayText:
        options.scentDisplayText,
      sizeDimensions:
        options.sizeDimensions,
      optionPreview:
        options.optionPreview,
      packSurcharge:
        options.packSurcharge,
      money:
        options.money,
      qtyUnit:
        options.qtyUnit,
      media:
        typeof options.media==='function'
          ? options.media
          : ()=>null,
      inquiryViewModel:
        typeof options.inquiryViewModel==='function'
          ? options.inquiryViewModel
          : ()=>({empty:true,items:[],summary:{itemCount:0}}),
      itemScentLabel:
        options.itemScentLabel,
      itemMoq:
        options.itemMoq,
      actions:
        options.actions||
        {}
    };

    return snapshot();
  }

  function mount(rootElement){
    detailRoot=
      rootElement||
      detailRoot;

    if(!detailRoot){
      return false;
    }

    if(!mounted){
      detailRoot.addEventListener(
        'click',
        onClick
      );

      detailRoot.addEventListener(
        'change',
        onChange
      );

      detailRoot.addEventListener(
        'input',
        onInput
      );

      detailRoot.addEventListener(
        'keydown',
        onKeyDown
      );

      mounted=true;
    }

    render();

    return true;
  }

  function refresh(options={}){
    return render(options);
  }

  function syncInquiry(){
    if(
      detailRoot&&
      !detailRoot.hidden
    ){
      syncPersistentCommerce(
        viewModel()
      );
    }
    return true;
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      configured:Boolean(config),
      mounted,
      productId:activeProductId,
      imageIndex:activeImageIndex
    });
  }

  root.DreamlandDesktopDetail=
    Object.freeze({
      version:VERSION,
      configure,
      mount,
      refresh,
      syncInquiry,
      flashAdded,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

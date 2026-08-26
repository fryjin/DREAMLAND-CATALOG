(function(root){
  'use strict';

  if(root.DreamlandDesktopDetail){
    return;
  }

  const VERSION='B7-00B.3B';

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
      <div class="desktop-detail-gallery">
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
      <section class="desktop-detail-lower desktop-container">
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
      <div class="desktop-detail-page">
        <div class="desktop-container">
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

            <aside class="desktop-detail-config">
              <div class="desktop-detail-heading">
                <div class="desktop-eyebrow">
                  ${escapeHtml(seriesLabel(product?.series))}
                </div>

                <h1>${escapeHtml(productName(product))}</h1>

                ${
                  description
                    ? `<p>${escapeHtml(description)}</p>`
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

                  <span>
                    ${escapeHtml(c.moq)}
                    ${escapeHtml(view.pricing?.moq||1)}
                  </span>
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
                ${quantityHtml(view)}
              </div>

              ${summaryHtml(view)}
            </aside>
          </div>
        </div>

        ${informationHtml(view)}
      </div>
    `;
  }

  async function loadResponsiveMedia(){
    if(!detailRoot){
      return;
    }

    const media=
      config?.media?.();

    const images=[
      ...detailRoot.querySelectorAll(
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

  function flashAdded(){
    const node=
      detailRoot?.querySelector(
        '.desktop-detail-add-feedback'
      );

    if(!node){
      return;
    }

    root.clearTimeout?.(
      feedbackTimer
    );

    node.hidden=false;

    feedbackTimer=
      root.setTimeout?.(
        ()=>{
          node.hidden=true;
        },
        2200
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

    if(action==='gallery'){
      const next=
        Number(
          target.dataset
            .desktopDetailIndex
        );

      if(Number.isInteger(next)){
        activeImageIndex=
          Math.max(
            0,
            next
          );

        preserveWindowScroll(
          ()=>render()
        );
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

      preserveWindowScroll(
        ()=>render()
      );

      return;
    }

    if(action==='scent'){
      quantityValidation=null;

      config?.actions
        ?.setScent?.(
          target.dataset
            .desktopDetailScent
        );

      preserveWindowScroll(
        ()=>render()
      );

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

      preserveWindowScroll(
        ()=>render()
      );

      return;
    }

    if(action==='add-inquiry'){
      config?.actions
        ?.addInquiry?.();

      root.requestAnimationFrame?.(
        ()=>{
          if(
            detailRoot&&
            !detailRoot.hidden
          ){
            flashAdded();
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

  function onChange(event){
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
    const input=
      event.target.closest?.(
        '[data-desktop-detail-quantity]'
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

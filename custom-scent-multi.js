(function(){
  'use strict';

  if(window.DreamlandCustomScent)return;

  const SERIES_ORDER=['classic','advanced','masterpiece'];
  const selectedScentIds=new Set();
  let selectedSeries='classic';
  let readinessTimer=null;

  const COPY={
    zh:{
      seriesLabel:'香薰系列 *',
      seriesHint:'先选择香薰系列',
      scentLabel:'具体香型 *',
      scentHint:'可选择多种香型进行组合',
      selected:'已选 {count} 种',
      required:'请选择至少一种具体香型。',
      empty:'当前系列暂无可选香型'
    },
    en:{
      seriesLabel:'Fragrance series *',
      seriesHint:'Select a fragrance series first',
      scentLabel:'Scents *',
      scentHint:'Select multiple scents for a combination',
      selected:'{count} selected',
      required:'Select at least one scent.',
      empty:'No scents are available in this series'
    },
    ko:{
      seriesLabel:'향 시리즈 *',
      seriesHint:'향 시리즈를 먼저 선택해 주세요',
      scentLabel:'세부 향 *',
      scentHint:'여러 향을 조합해 선택할 수 있습니다',
      selected:'{count}개 선택됨',
      required:'세부 향을 하나 이상 선택해 주세요.',
      empty:'현재 시리즈에 선택 가능한 향이 없습니다'
    }
  };

  function language(){
    return (
      typeof currentLang!=='undefined'&&
      ['zh','en','ko'].includes(currentLang)
    )
      ? currentLang
      : document.body?.dataset?.lang||'zh';
  }

  function copy(key,variables={}){
    let text=(COPY[language()]||COPY.zh)[key]||COPY.zh[key]||key;
    Object.entries(variables).forEach(([name,value])=>{
      text=text.split(`{${name}}`).join(String(value));
    });
    return text;
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function availableScents(series){
    if(
      typeof scentsBySeries==='undefined'||
      !(scentsBySeries instanceof Map)
    ){
      return [];
    }

    return (scentsBySeries.get(series)||[])
      .filter(scent=>{
        const name=String(scent?.name?.zh||'').trim();
        return scent?.status!=='hidden'&&name!=='无香';
      });
  }

  function availableSeries(){
    const withScents=SERIES_ORDER.filter(series=>availableScents(series).length>0);
    return withScents.length?withScents:SERIES_ORDER;
  }

  function ensureSeries(){
    const options=availableSeries();
    if(!options.includes(selectedSeries)){
      selectedSeries=options[0]||'classic';
      selectedScentIds.clear();
    }
    return selectedSeries;
  }

  function scentName(scent){
    if(typeof scentDisplayText==='function'){
      return scentDisplayText(scent?.name)||scent?.id||'';
    }

    return (
      scent?.name?.[language()]||
      scent?.name?.en||
      scent?.name?.zh||
      scent?.id||
      ''
    );
  }

  function canonicalScentName(scent){
    return (
      scent?.name?.zh||
      scent?.name?.en||
      scent?.id||
      ''
    );
  }

  function seriesName(series){
    return typeof seriesLabel==='function'
      ? seriesLabel(series)
      : series;
  }

  function customField(){
    return document.querySelector(
      '[data-screen="custom"] .custom-scent-field'
    );
  }

  function mount(){
    let field=customField();
    if(field)return field;

    const old=document.getElementById('customScent');
    field=old?.closest('.field')||null;
    if(!field)return null;

    field.classList.add('custom-scent-field');
    field.innerHTML=`
      <label class="label custom-scent-series-label"></label>
      <div class="custom-scent-panel">
        <div class="custom-scent-series-head">
          <span class="custom-scent-hint custom-scent-series-hint"></span>
        </div>
        <div class="custom-scent-series-grid" role="radiogroup"></div>
        <div class="custom-scent-divider"></div>
        <div class="custom-scent-subhead">
          <strong class="custom-scent-sub-label"></strong>
          <span class="custom-scent-count"></span>
        </div>
        <div class="custom-scent-hint custom-scent-choice-hint"></div>
        <div class="custom-scent-options" role="group"></div>
      </div>
      <div class="error custom-scent-error"></div>
    `;

    return field;
  }

  function selectedScents(){
    const map=new Map(
      availableScents(ensureSeries())
        .map(scent=>[scent.id,scent])
    );

    return [...selectedScentIds]
      .map(id=>map.get(id))
      .filter(Boolean);
  }

  function render(){
    const field=mount();
    if(!field)return;

    ensureSeries();

    const seriesOptions=availableSeries();
    const scentOptions=availableScents(selectedSeries);

    const label=field.querySelector('.custom-scent-series-label');
    const seriesHint=field.querySelector('.custom-scent-series-hint');
    const seriesGrid=field.querySelector('.custom-scent-series-grid');
    const subLabel=field.querySelector('.custom-scent-sub-label');
    const count=field.querySelector('.custom-scent-count');
    const choiceHint=field.querySelector('.custom-scent-choice-hint');
    const options=field.querySelector('.custom-scent-options');
    const error=field.querySelector('.custom-scent-error');

    if(label)label.textContent=copy('seriesLabel');
    if(seriesHint)seriesHint.textContent=copy('seriesHint');
    if(subLabel)subLabel.textContent=copy('scentLabel');
    if(choiceHint)choiceHint.textContent=copy('scentHint');
    if(count)count.textContent=copy('selected',{count:selectedScentIds.size});
    if(error)error.textContent=copy('required');

    if(seriesGrid){
      seriesGrid.innerHTML=seriesOptions.map(series=>`
        <button
          class="custom-scent-series-option ${series===selectedSeries?'active':''}"
          type="button"
          role="radio"
          aria-checked="${series===selectedSeries?'true':'false'}"
          onclick="DreamlandCustomScent.setSeries('${series}')"
        >
          ${escapeHtml(seriesName(series))}
        </button>
      `).join('');
    }

    if(options){
      options.innerHTML=scentOptions.length
        ? scentOptions.map(scent=>`
            <button
              class="custom-scent-option ${selectedScentIds.has(scent.id)?'active':''}"
              type="button"
              aria-pressed="${selectedScentIds.has(scent.id)?'true':'false'}"
              onclick="DreamlandCustomScent.toggleScent('${escapeHtml(scent.id)}')"
            >
              <span class="custom-scent-check">✓</span>
              <span>${escapeHtml(scentName(scent))}</span>
            </button>
          `).join('')
        : `<div class="custom-scent-empty">${escapeHtml(copy('empty'))}</div>`;
    }
  }

  function setSeries(series){
    if(!SERIES_ORDER.includes(series))return;
    if(selectedSeries===series)return;

    selectedSeries=series;
    selectedScentIds.clear();
    customField()?.classList.remove('invalid');
    render();
  }

  function toggleScent(scentId){
    const valid=availableScents(ensureSeries())
      .some(scent=>scent.id===scentId);
    if(!valid)return;

    if(selectedScentIds.has(scentId)){
      selectedScentIds.delete(scentId);
    }else{
      selectedScentIds.add(scentId);
    }

    customField()?.classList.remove('invalid');
    render();
  }

  function customScentLabel(item){
    if(!item)return '';

    let names=[];

    if(Array.isArray(item.scentIds)&&item.scentIds.length){
      names=item.scentIds
        .map(id=>{
          const scent=(typeof scentMap!=='undefined'&&scentMap instanceof Map)
            ? scentMap.get(id)
            : null;
          return scent?scentName(scent):'';
        })
        .filter(Boolean);
    }

    if(!names.length&&Array.isArray(item.scents)){
      names=item.scents.map(value=>String(value||'').trim()).filter(Boolean);
    }

    if(!names.length&&item.scent){
      names=[String(item.scent).trim()].filter(Boolean);
    }

    const scentText=names.join(' / ');
    const seriesText=item.scentSeries
      ? seriesName(item.scentSeries)
      : '';

    return [seriesText,scentText]
      .filter(Boolean)
      .join(' · ');
  }

  function installStyles(){
    if(document.getElementById('dreamlandCustomScentStyles'))return;

    const style=document.createElement('style');
    style.id='dreamlandCustomScentStyles';
    style.textContent=`
      .custom-scent-panel{
        padding:13px;
        border:1px solid #ededf1;
        border-radius:18px;
        background:#f9f9fb;
        transition:border-color .18s ease,box-shadow .18s ease,background .18s ease;
      }
      .custom-scent-series-head,
      .custom-scent-subhead{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }
      .custom-scent-hint{
        color:#96989f;
        font-size:10px;
        line-height:1.45;
        font-weight:750;
      }
      .custom-scent-series-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:7px;
        margin-top:9px;
      }
      .custom-scent-series-option{
        min-width:0;
        height:38px;
        padding:0 7px;
        border:1px solid #e7e7eb;
        border-radius:999px;
        background:#fff;
        color:#7b7d85;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        font-size:11px;
        font-weight:850;
      }
      .custom-scent-series-option.active{
        border-color:#111;
        background:#111;
        color:#fff;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }
      .custom-scent-divider{
        height:1px;
        margin:14px 0 12px;
        background:rgba(0,0,0,.06);
      }
      .custom-scent-sub-label{
        color:#24252a;
        font-size:12px;
        line-height:1.35;
        font-weight:900;
      }
      .custom-scent-count{
        color:#8c8f97;
        font-size:10px;
        line-height:1.35;
        font-weight:800;
      }
      .custom-scent-choice-hint{
        margin-top:4px;
      }
      .custom-scent-options{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:10px;
        max-height:188px;
        overflow-y:auto;
        overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;
      }
      .custom-scent-options::-webkit-scrollbar{display:none}
      .custom-scent-option{
        min-height:38px;
        max-width:100%;
        padding:0 13px;
        border:1px solid #e8e8ec;
        border-radius:999px;
        background:#fff;
        color:#70737b;
        display:inline-flex;
        align-items:center;
        gap:6px;
        font-size:12px;
        line-height:1.25;
        font-weight:850;
        text-align:left;
      }
      .custom-scent-option.active{
        border-color:#111;
        background:#111;
        color:#fff;
        box-shadow:0 8px 18px rgba(0,0,0,.12);
      }
      .custom-scent-check{
        display:none;
        flex:none;
        font-size:10px;
        line-height:1;
      }
      .custom-scent-option.active .custom-scent-check{display:inline}
      .custom-scent-empty{
        width:100%;
        padding:14px;
        border-radius:14px;
        background:#fff;
        color:#999ba2;
        font-size:11px;
        font-weight:750;
        text-align:center;
      }
      .custom-scent-field.invalid .custom-scent-panel{
        border-color:#d34b4b;
        background:#fff7f7;
        box-shadow:0 0 0 4px rgba(211,75,75,.06);
        animation:shake .26s ease;
      }
      .custom-scent-field.invalid .custom-scent-error{display:block}
      body[data-lang="en"] .custom-scent-series-option,
      body[data-lang="ko"] .custom-scent-series-option{
        font-size:10px;
        letter-spacing:-.02em;
      }
    `;
    document.head.appendChild(style);
  }

  function installHooks(){
    if(typeof applyI18n==='function'){
      const originalApplyI18n=applyI18n;
      applyI18n=function(){
        const result=originalApplyI18n.apply(this,arguments);
        render();
        return result;
      };
    }

    if(typeof go==='function'){
      const originalGo=go;
      go=function(screen){
        const result=originalGo.apply(this,arguments);
        if(screen==='custom'){
          requestAnimationFrame(render);
        }
        return result;
      };
    }

    if(typeof itemScentLabel==='function'){
      const originalItemScentLabel=itemScentLabel;
      itemScentLabel=function(item){
        if(item?.type==='custom'){
          return customScentLabel(item)||ui('scentRecommend');
        }
        return originalItemScentLabel.apply(this,arguments);
      };
    }

    if(typeof renderItem==='function'){
      const originalRenderItem=renderItem;
      renderItem=function(item){
        if(item?.type!=='custom'){
          return originalRenderItem.apply(this,arguments);
        }

        const title=`${ui('customInquiry')} · ${choiceLabel(item.use)||ui('notFilled')}`;
        const line1=`${item.qty||ui('qtyPending')}${qtyUnit()} · ${choiceLabel(item.sizePref)||ui('sizeRecommend')} · ${customScentLabel(item)||ui('scentRecommend')}`;
        const line2=`${item.color||ui('colorPending')} · ${choiceLabel(item.pack)||ui('packRecommend')}`;
        const trashSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6"/><path d="M5 7h14"/><path d="M8 7l1 12h6l1-12"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';

        return `
          <div class="swipe-shell" data-id="${escapeHtml(item.id)}">
            <div class="swipe-card">
              <div class="inquiry-row">
                <div class="inquiry-media"><span class="custom-icon">✦</span></div>
                <div class="inquiry-main">
                  <div class="inquiry-title">${escapeHtml(title)}</div>
                  <div class="inquiry-attr">${escapeHtml(line1)}</div>
                  <div class="inquiry-attr">${escapeHtml(line2)}</div>
                  <div class="qty-line">
                    <div class="inquiry-attr">${escapeHtml(ui('quantity'))}：${escapeHtml(item.qty||ui('toConfirm'))} ${escapeHtml(qtyUnit())}</div>
                  </div>
                </div>
                <div class="inquiry-side">
                  <button class="delete-action" type="button" aria-label="删除" onclick="del('${escapeHtml(item.id)}')">${trashSvg}</button>
                  <div class="price-stack">
                    <div class="price-unit">${escapeHtml(item.budget||ui('budgetPending'))}</div>
                    <div class="price-total">${escapeHtml(ui('quotePending'))}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      };
    }

    if(typeof addCustomIntent==='function'){
      addCustomIntent=function(){
        document
          .querySelectorAll('[data-screen="custom"] .field')
          .forEach(field=>field.classList.remove('invalid'));

        const use=fieldValue('customUse');
        const rawQty=Number(fieldValue('customQty'));
        const min=customMoq();
        const chosen=selectedScents();
        let valid=true;

        if(!use){
          document.getElementById('customUse')
            ?.closest('.field')
            ?.classList.add('invalid');
          valid=false;
        }

        if(
          !Number.isInteger(rawQty)||
          rawQty<min||
          rawQty>maximumQuantity()
        ){
          document.getElementById('customQty')
            ?.closest('.field')
            ?.classList.add('invalid');
          toast(
            rawQty>maximumQuantity()
              ? ui('quantityTooLarge')
              : ui('customMinQtyError')
          );
          valid=false;
        }

        if(!chosen.length){
          customField()?.classList.add('invalid');
          toast(copy('required'));
          valid=false;
        }

        if(!valid)return;

        const scentIds=chosen.map(scent=>scent.id);
        const canonicalNames=chosen.map(canonicalScentName);

        state.items.push({
          id:uid(),
          type:'custom',
          use,
          qty:rawQty,
          moq:min,
          budget:fieldValue('customBudget'),
          date:fieldValue('customDate'),
          sizePref:fieldValue('customSize'),
          scentSeries:selectedSeries,
          scentIds,
          scents:canonicalNames,
          scent:canonicalNames.join(' / '),
          color:fieldValue('customColor'),
          pack:fieldValue('customPack'),
          branding:fieldValue('customBranding'),
          note:fieldValue('customNote')
        });

        save();
        toast(toastText('addedCustom'));
        go('inquiry');
      };
    }

    if(typeof itemText==='function'){
      const originalItemText=itemText;
      itemText=function(item){
        if(item?.type!=='custom'){
          return originalItemText.apply(this,arguments);
        }

        return `${ui('customInquiry')} - ${choiceLabel(item.use)||ui('notFilled')}，${item.qty||ui('qtyPending')} ${qtyUnit()}，${item.budget||ui('budgetPending')}，${choiceLabel(item.sizePref)||ui('sizeRecommend')}，${customScentLabel(item)||ui('scentRecommend')}，${item.color||ui('colorPending')}，${choiceLabel(item.pack)||ui('packRecommend')}，${choiceLabel(item.branding)||ui('brandingPending')}，${item.date||ui('datePending')}，${ui('note')}：${item.note||ui('none')}`;
      };
    }

    if(typeof renderPreview==='function'){
      renderPreview=function(){
        const contact=state.contact||{};
        const productsSelected=state.items.filter(item=>item.type==='product');
        const customSelected=state.items.filter(item=>item.type==='custom');
        const inquiryId=ensureInquiryId();

        const previewContainer=document.getElementById('previewContent');
        if(!previewContainer)return;

        previewContainer.innerHTML=`
          <div class="preview-card"><h3>${ui('inquiryNumber')}</h3>${kv(ui('inquiryNumber'),inquiryId)}</div>
          <div class="preview-card"><h3>${ui('personalInfo')}</h3>${kv(ui('nameLabel').replace(' *',''),contact.name)}${kv(ui('companyBrand'),contact.company||ui('notProvided'))}${kv(ui('countryRegion'),contact.country)}${kv(ui('cityLabel'),contact.city||ui('notProvided'))}${kv(ui('emailLabel').replace(' *',''),contact.email)}${kv(ui('contactMethod'),contact.phone)}${kv(ui('buyerType'),choiceLabel(contact.buyerType)||ui('toConfirm'))}${kv(ui('note'),contact.message||ui('notProvided'))}</div>
          <div class="preview-card"><h3>${ui('productInquiry')}</h3>${productsSelected.length?productsSelected.map(item=>kv(productDisplayName(item),`${item.qty} ${qtyUnit()} · MOQ ${itemMoq(item)} · ${item.size} · ${itemScentLabel(item)} · ${choiceLabel(item.pack||defaultPack(item.series))} · ${money(itemSubtotal(item))}`)).join(''):kv(ui('products'),ui('none'))}</div>
          <div class="preview-card"><h3>${ui('customInquiry')}</h3>${customSelected.length?customSelected.map(item=>kv(choiceLabel(item.use)||ui('customNeed'),`${item.qty||ui('qtyPending')} ${qtyUnit()} · ${item.budget||ui('budgetPending')} · ${choiceLabel(item.sizePref)||ui('sizeRecommend')} · ${customScentLabel(item)||ui('scentRecommend')} · ${item.color||ui('colorPending')} · ${choiceLabel(item.pack)||ui('packRecommend')} · ${choiceLabel(item.branding)||ui('brandingPending')} · ${item.date||ui('datePending')}`)).join(''):kv(ui('custom'),ui('none'))}</div>
          <div class="preview-card"><h3>${ui('amountEstimate')}</h3>${kv(ui('productEstimate'),money(total()))}${kv(ui('customPart'),ui('consultantConfirm'))}${kv(ui('syncStatus'),web3formsReady()?ui('syncReady'):ui('syncPending'))}</div>
          <div class="preview-card verification-card">
            <label class="consent-check"><input id="privacyConsent" type="checkbox" onchange="handlePrivacyConsentChange(this)"><span>${ui('privacyAgreePrefix')} <a href="${privacyUrl()}" target="_blank" rel="noopener">${ui('privacyLink')}</a></span></label>
            <div class="risk-status" id="riskStatus">${riskText('checking')}</div>
            <div class="captcha-section" id="captchaSection" hidden><div class="captcha-wrap" id="hcaptchaContainer"></div></div>
            <div class="verification-error" id="verificationError"></div>
          </div>
        `;

        requestAnimationFrame(assessSubmissionRisk);
      };
    }

    if(typeof clearSubmittedInquiry==='function'){
      const originalClearSubmittedInquiry=clearSubmittedInquiry;
      clearSubmittedInquiry=function(){
        const result=originalClearSubmittedInquiry.apply(this,arguments);
        selectedSeries=availableSeries()[0]||'classic';
        selectedScentIds.clear();
        render();
        return result;
      };
    }
  }

  function scheduleReadinessCheck(){
    if(readinessTimer)clearTimeout(readinessTimer);

    let attempts=0;
    const check=()=>{
      attempts+=1;
      render();

      if(
        typeof scentsBySeries!=='undefined'&&
        scentsBySeries instanceof Map&&
        scentsBySeries.size>0
      ){
        readinessTimer=null;
        return;
      }

      if(attempts<30){
        readinessTimer=setTimeout(check,200);
      }else{
        readinessTimer=null;
      }
    };

    check();
  }

  installStyles();
  installHooks();
  mount();
  scheduleReadinessCheck();

  window.DreamlandCustomScent={
    setSeries,
    toggleScent,
    render,
    selectedScents,
    customScentLabel
  };
})();

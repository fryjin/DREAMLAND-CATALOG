(function(root){
  'use strict';

  if(root.DreamlandCustomScent){
    return;
  }

  const VERSION='B6-05';

  let feature=null;

  let language=
    ()=>'zh';

  let seriesLabel=
    value=>
      String(value||'');

  let scentDisplayText=
    value=>
      String(
        value?.zh||
        value?.en||
        ''
      );

  let scentById=
    ()=>null;

  const COPY={
    zh:{
      seriesLabel:'香薰系列 *',
      seriesHint:'选择一个香薰系列',
      scentLabel:'选择香型 *',
      scentHint:'同一系列可多选',
      selected:'已选 {count} 种',
      required:'请至少选择一种香型。',
      empty:'当前系列暂无可选香型'
    },
    en:{
      seriesLabel:'Fragrance Series *',
      seriesHint:'Choose a fragrance series',
      scentLabel:'Select Scents *',
      scentHint:'Select more than one within the same series',
      selected:'{count} selected',
      required:'Select at least one scent.',
      empty:'No scents are available in this series'
    },
    ko:{
      seriesLabel:'향 시리즈 *',
      seriesHint:'향 시리즈를 선택해 주세요',
      scentLabel:'향 선택 *',
      scentHint:'같은 시리즈에서 여러 향을 선택할 수 있어요',
      selected:'{count}개 선택',
      required:'향을 하나 이상 선택해 주세요.',
      empty:'선택할 수 있는 향이 아직 없어요'
    }
  };

  function functionOr(
    value,
    fallback
  ){
    return typeof value==='function'
      ? value
      : fallback;
  }

  function ready(){
    return Boolean(
      feature&&
      typeof feature.ready==='function'&&
      typeof feature.availableSeries==='function'&&
      typeof feature.availableScents==='function'&&
      typeof feature.selectedSeries==='function'&&
      typeof feature.selectedScents==='function'&&
      typeof feature.setSeries==='function'&&
      typeof feature.toggleScent==='function'
    );
  }

  function configure(
    options={}
  ){
    if(
      options.feature&&
      typeof options.feature==='object'
    ){
      feature=
        options.feature;
    }

    language=
      functionOr(
        options.language,
        language
      );

    seriesLabel=
      functionOr(
        options.seriesLabel,
        seriesLabel
      );

    scentDisplayText=
      functionOr(
        options.scentDisplayText,
        scentDisplayText
      );

    scentById=
      functionOr(
        options.scentById,
        scentById
      );

    render();

    return snapshot();
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      ready:ready(),
      featureReady:
        Boolean(
          feature?.ready?.()
        )
    });
  }

  function copy(
    key,
    variables={}
  ){
    const lang=
      ['zh','en','ko'].includes(
        language()
      )
        ? language()
        : 'zh';

    let text=
      (
        COPY[lang]||
        COPY.zh
      )[key]||
      COPY.zh[key]||
      key;

    Object.entries(
      variables
    ).forEach(
      ([
        name,
        value
      ])=>{
        text=
          text
            .split(
              `{${name}}`
            )
            .join(
              String(value)
            );
      }
    );

    return text;
  }

  function escapeHtml(
    value
  ){
    return String(
      value??''
    )
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function customField(){
    return document.querySelector(
      '[data-screen="custom"] .custom-scent-field'
    );
  }

  function mount(){
    let field=
      customField();

    if(field){
      return field;
    }

    const old=
      document.getElementById(
        'customScent'
      );

    field=
      old?.closest(
        '.field'
      )||
      null;

    if(!field){
      return null;
    }

    field.classList.add(
      'custom-scent-field'
    );

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

  function displayScentName(
    scent
  ){
    return (
      scentDisplayText(
        scent?.name
      )||
      scent?.id||
      ''
    );
  }

  function render(){
    if(
      !ready()||
      !feature.ready?.()
    ){
      return false;
    }

    const field=
      mount();

    if(!field){
      return false;
    }

    const series=
      feature.selectedSeries();

    const seriesOptions=
      feature.availableSeries();

    const scentOptions=
      feature.availableScents(
        series
      );

    const selectedIds=
      new Set(
        feature
          .selectedScents()
          .map(
            scent=>scent?.id
          )
      );

    const label=
      field.querySelector(
        '.custom-scent-series-label'
      );

    const seriesHint=
      field.querySelector(
        '.custom-scent-series-hint'
      );

    const seriesGrid=
      field.querySelector(
        '.custom-scent-series-grid'
      );

    const subLabel=
      field.querySelector(
        '.custom-scent-sub-label'
      );

    const count=
      field.querySelector(
        '.custom-scent-count'
      );

    const choiceHint=
      field.querySelector(
        '.custom-scent-choice-hint'
      );

    const options=
      field.querySelector(
        '.custom-scent-options'
      );

    const error=
      field.querySelector(
        '.custom-scent-error'
      );

    if(label){
      label.textContent=
        copy(
          'seriesLabel'
        );
    }

    if(seriesHint){
      seriesHint.textContent=
        copy(
          'seriesHint'
        );
    }

    if(subLabel){
      subLabel.textContent=
        copy(
          'scentLabel'
        );
    }

    if(choiceHint){
      choiceHint.textContent=
        copy(
          'scentHint'
        );
    }

    if(count){
      count.textContent=
        copy(
          'selected',
          {
            count:
              selectedIds.size
          }
        );
    }

    if(error){
      error.textContent=
        copy(
          'required'
        );
    }

    if(seriesGrid){
      seriesGrid.innerHTML=
        seriesOptions
          .map(
            option=>`
              <button
                class="custom-scent-series-option ${option===series?'active':''}"
                type="button"
                role="radio"
                aria-checked="${option===series?'true':'false'}"
                onclick="DreamlandCustomScent.setSeries('${escapeHtml(option)}')"
              >
                ${escapeHtml(seriesLabel(option))}
              </button>
            `
          )
          .join('');
    }

    if(options){
      options.innerHTML=
        scentOptions.length
          ? scentOptions
              .map(
                scent=>`
                  <button
                    class="custom-scent-option ${selectedIds.has(scent.id)?'active':''}"
                    type="button"
                    aria-pressed="${selectedIds.has(scent.id)?'true':'false'}"
                    onclick="DreamlandCustomScent.toggleScent('${escapeHtml(scent.id)}')"
                  >
                    <span class="custom-scent-check">✓</span>
                    <span>${escapeHtml(displayScentName(scent))}</span>
                  </button>
                `
              )
              .join('')
          : `<div class="custom-scent-empty">${escapeHtml(copy('empty'))}</div>`;
    }

    return true;
  }

  function setSeries(
    series
  ){
    if(!ready()){
      return false;
    }

    const changed=
      feature.setSeries(
        series
      );

    clearInvalid();
    render();

    return changed;
  }

  function toggleScent(
    scentId
  ){
    if(!ready()){
      return false;
    }

    const changed=
      feature.toggleScent(
        scentId
      );

    clearInvalid();
    render();

    return changed;
  }

  function selectedScents(){
    return ready()
      ? feature.selectedScents()
      : [];
  }

  function markInvalid(){
    customField()
      ?.classList
      ?.add(
        'invalid'
      );
  }

  function clearInvalid(){
    customField()
      ?.classList
      ?.remove(
        'invalid'
      );
  }

  function requiredMessage(){
    return copy(
      'required'
    );
  }

  function reset(){
    feature?.reset?.();
    clearInvalid();
    render();
  }

  function customScentLabel(
    item
  ){
    if(!item){
      return '';
    }

    let names=[];

    if(
      Array.isArray(
        item.scentIds
      )&&
      item.scentIds.length
    ){
      names=
        item.scentIds
          .map(
            id=>{
              const scent=
                scentById(
                  id
                );

              return scent
                ? displayScentName(
                    scent
                  )
                : '';
            }
          )
          .filter(Boolean);
    }

    if(
      !names.length&&
      Array.isArray(
        item.scents
      )
    ){
      names=
        item.scents
          .map(
            value=>
              String(
                value||''
              ).trim()
          )
          .filter(Boolean);
    }

    if(
      !names.length&&
      item.scent
    ){
      names=[
        String(
          item.scent
        ).trim()
      ].filter(Boolean);
    }

    const scentText=
      names.join(
        ' / '
      );

    const seriesText=
      item.scentSeries
        ? seriesLabel(
            item.scentSeries
          )
        : '';

    return [
      seriesText,
      scentText
    ]
      .filter(Boolean)
      .join(
        ' · '
      );
  }

  function installStyles(){
    if(
      document.getElementById(
        'dreamlandCustomScentStyles'
      )
    ){
      return;
    }

    const style=
      document.createElement(
        'style'
      );

    style.id=
      'dreamlandCustomScentStyles';

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
      .custom-scent-options::-webkit-scrollbar{
        display:none
      }
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
      .custom-scent-option.active .custom-scent-check{
        display:inline
      }
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
      .custom-scent-field.invalid .custom-scent-error{
        display:block
      }
      body[data-lang="en"] .custom-scent-series-option,
      body[data-lang="ko"] .custom-scent-series-option{
        font-size:10px;
        letter-spacing:-.02em;
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function bootDom(){
    installStyles();
    mount();
  }

  if(
    document.readyState===
      'loading'
  ){
    document.addEventListener(
      'DOMContentLoaded',
      bootDom,
      {once:true}
    );
  }else{
    bootDom();
  }

  root.DreamlandCustomScent=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      render,
      setSeries,
      toggleScent,
      selectedScents,
      markInvalid,
      clearInvalid,
      requiredMessage,
      reset,
      customScentLabel
    });
})(window);

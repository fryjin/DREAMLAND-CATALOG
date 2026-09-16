(function(root){
  'use strict';
  if(root.DreamlandCustomRuntime) return;

  const VERSION='R4.6B';
  const RUNTIME_ID='DREAMLAND_R4_CUSTOM_RUNTIME_R4_6B';
  let state=null;
  let custom=null;
  let inquiry=null;
  let currentLanguage='en';
  let draft=null;
  let mounted=false;
  let statusTimer=0;

  function text(value){ return String(value??'').trim(); }
  function safeJson(value){ try{return JSON.parse(String(value||''));}catch(_){return null;} }
  function storage(){ try{return root.localStorage||null;}catch(_){return null;} }
  function readStorage(key){ const s=storage(); if(!s)return ''; try{return s.getItem(key)||'';}catch(_){return '';} }
  function writeStorage(key,value){ const s=storage(); if(!s)return false; try{s.setItem(key,String(value));return true;}catch(_){return false;} }
  function normalizeLanguage(value,fallback='en',supported=['en','zh','ko']){
    const next=text(value).toLowerCase(); return supported.includes(next)?next:fallback;
  }
  function inquiryCount(value){
    const data=typeof value==='string'?safeJson(value):value;
    if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.items)) return 0;
    return data.items.reduce((total,item)=>item?.type==='product'?total+(Number(item?.qty)||0):total+1,0);
  }
  function uid(){ return 'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8); }
  function parseState(){
    const node=document.getElementById('customRuntimeState');
    const parsed=node?safeJson(node.textContent):null;
    return parsed&&parsed.version===VERSION&&parsed.storage&&parsed.limits&&parsed.series&&parsed.languages?parsed:null;
  }
  function currentView(){ return state?.languages?.[currentLanguage]||state?.languages?.[state?.defaultLanguage]||state?.languages?.en||{}; }
  function copy(){ return currentView().copy||{}; }
  function setText(node,value){ if(node) node.textContent=text(value); }
  function pathValue(source,path){ return text(path).split('.').filter(Boolean).reduce((value,key)=>value==null?undefined:value[key],source); }
  function esc(value){ return text(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function configureCustom(){
    const grouped=new Map();
    for(const scent of state.scents||[]){
      const series=text(scent?.series); if(!series)continue;
      if(!grouped.has(series))grouped.set(series,[]);
      grouped.get(series).push(scent);
    }
    custom.configure({
      scentsBySeries:grouped,
      seriesOrder:[...(state.series?.order||[])],
      defaultSeries:state.series?.default||'classic',
      customMoq:()=>Number(state.limits?.customMoq)||1,
      maximumQuantity:()=>Number(state.limits?.maxQuantity)||1000000
    });
    custom.reset();
  }
  function configureInquiry(){
    inquiry.configure({
      storage:storage(),
      storageKey:state.storage.inquiryKey,
      version:state.storage.inquiryVersion
    });
  }
  function freshDraft(){ return {use:'',qty:'',budget:'',date:'',sizePref:'',color:'',pack:'',branding:'',note:''}; }
  function optionByValue(rows,value){ return (rows||[]).find(row=>text(row?.value)===text(value))||null; }
  function seriesView(key){ return (currentView().fragranceSeries||[]).find(row=>row?.key===key)||null; }
  function scentView(id){
    for(const series of currentView().fragranceSeries||[]){
      const scent=(series.scents||[]).find(row=>row?.id===id); if(scent)return scent;
    }
    return null;
  }
  function localizedOption(kind,value){
    const v=currentView();
    const maps={use:v.useCases,budget:v.budgets,sizePref:v.sizes,pack:v.packages,branding:v.brandingOptions};
    return optionByValue(maps[kind],value)?.label||text(value);
  }
  function notSelected(){
    return copy().notSelected||(currentLanguage==='zh'?'未选择':currentLanguage==='ko'?'선택하지 않음':'Not selected');
  }
  function pieces(){ return copy().pieces||(currentLanguage==='zh'?'件':currentLanguage==='ko'?'개':'pcs'); }
  function statusText(key,details={}){
    const c=copy();
    const source={
      use:c.validationUse||c.useRequired,
      quantity:c.validationQuantity||c.quantityRequired,
      'quantity-min':c.validationQuantityMin||c.minimumQuantityError,
      'quantity-max':c.validationQuantityMax||c.maximumQuantityError,
      scents:c.validationScents||c.scentsRequired,
      added:c.addedInquiry||c.addedToInquiry
    }[key];
    const fallback={
      en:{use:'Select a use case.',quantity:'Enter a whole-number quantity.','quantity-min':'Quantity is below the Custom MOQ of {min}.','quantity-max':'Quantity exceeds the maximum of {max}.',scents:'Select at least one scent.',added:'Custom project added to Inquiry.'},
      zh:{use:'请选择使用场景。',quantity:'请输入整数数量。','quantity-min':'数量不能低于定制起订量 {min}。','quantity-max':'数量不能超过上限 {max}。',scents:'请至少选择一个香型。',added:'定制项目已加入询价单。'},
      ko:{use:'사용 목적을 선택하세요.',quantity:'정수 수량을 입력하세요.','quantity-min':'수량은 최소 주문 수량 {min}개 이상이어야 합니다.','quantity-max':'수량은 최대 {max}개를 초과할 수 없습니다.',scents:'향을 하나 이상 선택하세요.',added:'커스텀 프로젝트를 문의 목록에 추가했습니다.'}
    };
    return text(source||fallback[currentLanguage]?.[key]||fallback.en[key]||'')
      .replace('{min}',String(details.min??state.limits.customMoq))
      .replace('{max}',String(details.max??state.limits.maxQuantity));
  }
  function applyHomeBindings(){
    const content=currentView().content||{};
    document.querySelectorAll('[data-home-bind]').forEach(node=>{
      const value=pathValue(content,node.dataset.homeBind); if(value!==undefined)setText(node,value);
    });
  }
  function applyCopyBindings(){
    const c=copy();
    document.querySelectorAll('[data-custom-copy]').forEach(node=>{
      const value=c[node.dataset.customCopy]; if(value!==undefined&&value!==null)setText(node,value);
    });
    const q=document.querySelector('[data-custom-quantity]'); if(q)q.placeholder=c.quantityPlaceholder||q.placeholder||'';
    const d=document.querySelector('[data-custom-delivery]'); if(d)d.placeholder=c.deliveryPlaceholder||'';
    const color=document.querySelector('[data-custom-color]'); if(color)color.placeholder=c.colorPlaceholder||'';
    const notes=document.querySelector('[data-custom-notes]'); if(notes)notes.placeholder=c.notesPlaceholder||'';
  }
  function applyOptionLabels(selector,rows){
    const map=new Map((rows||[]).map(row=>[text(row?.value),row]));
    document.querySelectorAll(selector).forEach(button=>{
      const value=text(button.dataset.customUseOption||button.dataset.customSizeOption||button.dataset.customPackagingOption||button.dataset.customBrandingOption);
      const row=map.get(value); if(!row)return;
      setText(button.querySelector('[data-custom-option-label]'),row.label);
      const body=button.querySelector('[data-custom-option-body]'); if(body)setText(body,row.body);
    });
  }
  function applyBudgetOptions(){
    const select=document.querySelector('[data-custom-budget]'); if(!select)return;
    const selected=draft.budget;
    select.innerHTML=['<option value="">'+esc(notSelected())+'</option>',...(currentView().budgets||[]).map(row=>'<option value="'+esc(row.value)+'">'+esc(row.label)+'</option>')].join('');
    select.value=selected;
  }
  function applySeriesAndScentLabels(){
    document.querySelectorAll('[data-custom-fragrance-series]').forEach(button=>{
      const series=seriesView(button.dataset.customFragranceSeries); if(series)setText(button.querySelector('[data-custom-series-label]'),series.label);
    });
    document.querySelectorAll('[data-custom-fragrance-group]').forEach(group=>{
      const series=seriesView(group.dataset.customFragranceGroup); if(!series)return;
      setText(group.querySelector(':scope > div:first-child [data-custom-series-label]'),series.label);
      setText(group.querySelector('[data-custom-scent-count]'),series.scents?.length||0);
    });
    document.querySelectorAll('[data-custom-scent-option]').forEach(button=>{
      const scent=scentView(button.dataset.customScentOption); if(scent)setText(button.querySelector('[data-custom-scent-label]'),scent.name);
    });
  }
  function applyLanguageBindings(){
    const v=currentView();
    applyHomeBindings(); applyCopyBindings();
    applyOptionLabels('[data-custom-use-option]',v.useCases);
    applyOptionLabels('[data-custom-size-option]',v.sizes);
    applyOptionLabels('[data-custom-packaging-option]',v.packages);
    applyOptionLabels('[data-custom-branding-option]',v.brandingOptions);
    applyBudgetOptions(); applySeriesAndScentLabels();
    const select=document.querySelector('[data-home-language-select]');
    if(select){select.disabled=false;select.value=currentLanguage;select.setAttribute('aria-label',v.content?.navigation?.language||'Language');}
    document.documentElement.setAttribute('lang',currentLanguage==='zh'?'zh-CN':currentLanguage==='ko'?'ko-KR':'en');
    if(document.body)document.body.dataset.customLanguage=currentLanguage;
  }
  function selection(){ return custom.selection(); }
  function renderButtons(){
    const defs=[['[data-custom-use-option]','customUseOption','use'],['[data-custom-size-option]','customSizeOption','sizePref'],['[data-custom-packaging-option]','customPackagingOption','pack'],['[data-custom-branding-option]','customBrandingOption','branding']];
    defs.forEach(([selector,dataKey,key])=>document.querySelectorAll(selector).forEach(button=>{
      const active=button.dataset[dataKey]===draft[key]; button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',active?'true':'false');
    }));
  }
  function renderFragrance(){
    const selected=selection();
    document.querySelectorAll('[data-custom-fragrance-series]').forEach(button=>{
      const active=button.dataset.customFragranceSeries===selected.scentSeries;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',active?'true':'false');
    });
    document.querySelectorAll('[data-custom-fragrance-group]').forEach(group=>{
      const active=group.dataset.customFragranceGroup===selected.scentSeries;group.hidden=!active;group.classList.toggle('is-featured',active);
    });
    const ids=new Set(selected.scentIds||[]);
    document.querySelectorAll('[data-custom-scent-option]').forEach(button=>{
      const active=ids.has(button.dataset.customScentOption);button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',active?'true':'false');
    });
    setText(document.querySelector('[data-custom-scents-summary]'),text(copy().scentsHint||'{count} selected').replace('{count}',String(selected.scentIds?.length||0)));
  }
  function renderInputs(){
    const q=document.querySelector('[data-custom-quantity]'); if(q){if(document.activeElement!==q)q.value=draft.qty;q.min=String(state.limits.customMoq);q.max=String(state.limits.maxQuantity);}
    const budget=document.querySelector('[data-custom-budget]'); if(budget)budget.value=draft.budget;
    const delivery=document.querySelector('[data-custom-delivery]'); if(delivery&&document.activeElement!==delivery)delivery.value=draft.date;
    const color=document.querySelector('[data-custom-color]'); if(color&&document.activeElement!==color)color.value=draft.color;
    const notes=document.querySelector('[data-custom-notes]'); if(notes&&document.activeElement!==notes)notes.value=draft.note;
    setText(document.querySelector('[data-custom-minimum-quantity]'),state.limits.customMoq);
  }
  function summaryValue(key){
    const selected=selection();
    if(key==='use')return draft.use?localizedOption('use',draft.use):notSelected();
    if(key==='qty')return draft.qty?draft.qty+' '+pieces():notSelected();
    if(key==='budget')return draft.budget?localizedOption('budget',draft.budget):notSelected();
    if(key==='date')return draft.date||notSelected();
    if(key==='sizePref')return draft.sizePref?localizedOption('sizePref',draft.sizePref):notSelected();
    if(key==='pack')return draft.pack?localizedOption('pack',draft.pack):notSelected();
    if(key==='branding')return draft.branding?localizedOption('branding',draft.branding):notSelected();
    if(key==='scents'){
      const names=(selected.scentIds||[]).map(id=>scentView(id)?.name||'').filter(Boolean);
      if(!names.length)return notSelected();
      return [seriesView(selected.scentSeries)?.label||selected.scentSeries,names.join(' / ')].filter(Boolean).join(' · ');
    }
    return notSelected();
  }
  function renderSummary(){ ['use','qty','budget','date','sizePref','scents','pack','branding'].forEach(key=>setText(document.querySelector('[data-custom-summary="'+key+'"]'),summaryValue(key))); }
  function clearErrors(){
    document.querySelectorAll('[data-custom-error]').forEach(node=>{node.hidden=true;setText(node,'');});
    document.querySelectorAll('[data-custom-field]').forEach(node=>node.classList.remove('has-error'));
  }
  function showValidation(validation){
    clearErrors(); if(!validation||validation.valid)return true;
    const grouped=new Map();
    for(const code of validation.errors||[]){const field=code==='use'?'use':code==='scents'?'scents':'qty';if(!grouped.has(field))grouped.set(field,code);}
    for(const [field,code] of grouped){
      const node=document.querySelector('[data-custom-error="'+field+'"]');
      if(node){setText(node,statusText(code,{min:validation.minimumQuantity,max:validation.maximumQuantity}));node.hidden=false;}
      document.querySelector('[data-custom-field="'+field+'"]')?.classList.add('has-error');
    }
    return false;
  }
  function updateInquiryBadge(){
    const count=inquiryCount(inquiry?.snapshot?inquiry.snapshot():readStorage(state.storage.inquiryKey));
    const node=document.querySelector('[data-home-inquiry-count]');
    if(node){setText(node,count);node.setAttribute('aria-label',count+' '+(currentView()?.content?.navigation?.inquiry||'Inquiry'));}
    return count;
  }
  function status(message,kind='ok'){
    const node=document.querySelector('[data-custom-runtime-status]'); if(!node)return;
    root.clearTimeout(statusTimer);setText(node,message);node.hidden=false;node.dataset.kind=kind;
    statusTimer=root.setTimeout(()=>{node.hidden=true;},2800);
  }
  function render(){ applyLanguageBindings();renderButtons();renderFragrance();renderInputs();renderSummary();updateInquiryBadge();return {draft:{...draft},selection:selection()}; }
  function applyLanguage(language,{persist=true}={}){
    currentLanguage=normalizeLanguage(language,state.defaultLanguage||'en',Object.keys(state.languages||{}));
    if(persist)writeStorage(state.storage.languageKey,currentLanguage);render();return currentLanguage;
  }
  function addToInquiry(){
    const validation=custom.validateDraft(draft);
    if(!showValidation(validation)){status(statusText(validation.errors?.[0]||'quantity',{min:validation.minimumQuantity,max:validation.maximumQuantity}),'warn');return null;}
    const intent=custom.buildIntent(draft,{id:uid()}); if(!intent)return null;
    inquiry.addCustom(intent);inquiry.persist();updateInquiryBadge();status(statusText('added'));return intent;
  }
  function scalar(key,value){draft[key]=value;clearErrors();renderSummary();return draft[key];}
  function bindChoice(selector,key,dataKey){
    document.querySelectorAll(selector).forEach(button=>button.addEventListener('click',()=>{draft[key]=button.dataset[dataKey]||'';clearErrors();renderButtons();renderSummary();}));
  }
  function bindEvents(){
    bindChoice('[data-custom-use-option]','use','customUseOption');
    bindChoice('[data-custom-size-option]','sizePref','customSizeOption');
    bindChoice('[data-custom-packaging-option]','pack','customPackagingOption');
    bindChoice('[data-custom-branding-option]','branding','customBrandingOption');
    document.querySelectorAll('[data-custom-fragrance-series]').forEach(button=>button.addEventListener('click',()=>{custom.setSeries(button.dataset.customFragranceSeries);clearErrors();renderFragrance();renderSummary();}));
    document.querySelectorAll('[data-custom-scent-option]').forEach(button=>button.addEventListener('click',()=>{custom.toggleScent(button.dataset.customScentOption);clearErrors();renderFragrance();renderSummary();}));
    document.querySelector('[data-custom-quantity]')?.addEventListener('input',event=>scalar('qty',event.currentTarget?.value||''));
    document.querySelector('[data-custom-budget]')?.addEventListener('change',event=>scalar('budget',event.currentTarget?.value||''));
    document.querySelector('[data-custom-delivery]')?.addEventListener('input',event=>scalar('date',event.currentTarget?.value||''));
    document.querySelector('[data-custom-color]')?.addEventListener('input',event=>scalar('color',event.currentTarget?.value||''));
    document.querySelector('[data-custom-notes]')?.addEventListener('input',event=>scalar('note',event.currentTarget?.value||''));
    document.querySelector('[data-custom-add-inquiry]')?.addEventListener('click',addToInquiry);
    document.querySelector('[data-home-language-select]')?.addEventListener('change',event=>applyLanguage(event.currentTarget?.value));
    document.querySelector('[data-custom-editor]')?.addEventListener('focusin',event=>{
      const section=event.target?.closest?event.target.closest('[data-custom-section]'):null;if(!section)return;
      document.querySelectorAll('[data-custom-flow-step]').forEach(step=>step.classList.toggle('is-active',step.dataset.customFlowStep===section.dataset.customSection));
    });
    root.addEventListener('storage',event=>{
      if(event.key===state.storage.languageKey){applyLanguage(event.newValue,{persist:false});return;}
      if(event.key===state.storage.inquiryKey){configureInquiry();updateInquiryBadge();}
    });
    root.addEventListener('pageshow',()=>{configureInquiry();updateInquiryBadge();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){configureInquiry();updateInquiryBadge();}});
  }
  function mount(){
    if(mounted){updateInquiryBadge();return true;}
    state=parseState();custom=root.DreamlandCustom;inquiry=root.DreamlandInquiry;
    if(!state||!custom||!inquiry)return false;
    configureCustom();configureInquiry();draft=freshDraft();
    currentLanguage=normalizeLanguage(readStorage(state.storage.languageKey),state.defaultLanguage||'en',Object.keys(state.languages));
    bindEvents();applyLanguage(currentLanguage,{persist:true});mounted=true;return true;
  }

  root.DreamlandCustomRuntime=Object.freeze({
    version:VERSION,id:RUNTIME_ID,normalizeLanguage,inquiryCount,mount,render,applyLanguage,updateInquiryBadge,addToInquiry
  });

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
  }
})(typeof globalThis!=='undefined'?globalThis:this);

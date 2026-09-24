(function(root){
'use strict';
const VERSION='PDP-OPTIONS-1B';let state,mounted=false;
const t=v=>String(v??'').trim(),q=s=>document.querySelector(s);
function sourceFor(f){return q(f==='pattern'?'[data-pdp-pattern]':f==='pack'?'[data-pdp-pack]':f==='scentSeries'?'[data-pdp-scent-series]':'[data-pdp-scent]')}
function language(v){v=t(v||document.body?.dataset?.pdpLanguage||document.documentElement?.lang||state?.defaultLanguage||'en').toLowerCase();return v.startsWith('zh')?'zh':v.startsWith('ko')?'ko':'en'}
function label(o,l){return t(o?.labels?.[l])||t(o?.labels?.en)||t(o?.labels?.zh)||t(o?.value)}
function size(v){return(t(v?.config?.size)||t(q('[data-pdp-size].is-default')?.dataset?.pdpSize)||t(state?.product?.defaultSize)).toUpperCase()}
function items(f,v){return f==='pattern'?(state?.visualOptions?.patternsBySize?.[size(v)]||[]):(state?.visualOptions?.packagesBySeries?.[t(state?.product?.series)]||[])}
function field(f,v,l){
 const s=q(`[data-pdp-visual-field="${f}"]`),r=s?.querySelector(`[data-pdp-visual-options="${f}"]`),x=sourceFor(f);if(!s||!r||!x)return;
 const a=new Set([...x.options].map(o=>t(o.value)).filter(Boolean)),c=t(x.value),g=document.createDocumentFragment(),rows=items(f,v).filter(o=>a.has(t(o?.value)));
 for(const o of rows){const y=t(o?.value),b=document.createElement('button'),i=document.createElement('img'),n=document.createElement('span'),z=y===c;b.type='button';b.className='pdp-visual-option'+(z?' is-selected':'');b.dataset.pdpVisualOption=f;b.dataset.pdpVisualValue=y;b.setAttribute('aria-pressed',z?'true':'false');i.src=t(o?.preview)||t(o?.image);i.alt='';i.loading='lazy';i.decoding='async';n.textContent=label(o,l);b.setAttribute('aria-label',n.textContent);b.append(i,n);g.append(b)}
 r.replaceChildren(g);const k=s.querySelector('[data-pdp-visual-count]');if(k)k.textContent=String(rows.length);s.hidden=!rows.length
}
function direct(f){
 const a=f==='scentSeries',s=q(a?'[data-pdp-scent-series-direct]':'[data-pdp-scent-direct]'),r=q(a?'[data-pdp-scent-series-direct-options]':'[data-pdp-scent-direct-options]'),x=sourceFor(f);if(!s||!r||!x)return;
 const g=document.createDocumentFragment(),c=t(x.value),rows=[...x.options];
 for(const o of rows){const y=t(o.value),b=document.createElement('button'),z=y===c;b.type='button';b.className='pdp-scent-direct__option'+(z?' is-selected':'');a?b.dataset.pdpScentSeriesDirectOption=y:b.dataset.pdpScentDirectOption=y;b.setAttribute('aria-pressed',z?'true':'false');b.textContent=o.textContent||y;g.append(b)}
 r.replaceChildren(g);s.hidden=!rows.length
}
function render(v,l){if(state?.visualOptions?.version!==1)return;l=language(l);field('pattern',v,l);field('pack',v,l);direct('scentSeries');direct('scent');const h=document.documentElement;h.dataset.pdpVisualOptionsReady='true';h.dataset.pdpScentDirectReady='true';h.dataset.pdpScentSeriesDirectReady='true'}
function mount(){if(mounted){render();return true}try{state=JSON.parse(q('#pdpRuntimeState')?.textContent||'{}')}catch(_){return false}if(state?.visualOptions?.version!==1)return false;
 document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-pdp-visual-option],[data-pdp-scent-direct-option],[data-pdp-scent-series-direct-option]');if(!b)return;const f=b.dataset.pdpScentSeriesDirectOption?'scentSeries':b.dataset.pdpScentDirectOption?'scent':b.dataset.pdpVisualOption,select=sourceFor(f),n=t(b.dataset.pdpScentSeriesDirectOption||b.dataset.pdpScentDirectOption||b.dataset.pdpVisualValue);if(!select||!n||select.value===n)return;select.value=n;select.dispatchEvent(new Event('change',{bubbles:true}))});
 document.addEventListener('dreamland:pdp-render',e=>render(e.detail?.view,e.detail?.language));mounted=true;render();return true}
root.DreamlandPdpVisualOptions=Object.freeze({version:VERSION,mount,render});
if(typeof document!=='undefined'){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount()}
})(typeof globalThis!=='undefined'?globalThis:this);

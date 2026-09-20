(function(root){
'use strict';
const VERSION='PDP-OPTIONS-1B';let state,mounted=false;
const text=v=>String(v??'').trim();
function sourceFor(field){return document.querySelector(field==='pattern'?'[data-pdp-pattern]':'[data-pdp-pack]')}
function language(v){v=text(v||document.body?.dataset?.pdpLanguage||document.documentElement?.lang||state?.defaultLanguage||'en').toLowerCase();return v.startsWith('zh')?'zh':v.startsWith('ko')?'ko':'en'}
function label(o,l){return text(o?.labels?.[l])||text(o?.labels?.en)||text(o?.labels?.zh)||text(o?.value)}
function size(v){return(text(v?.config?.size)||text(document.querySelector('[data-pdp-size].is-default')?.dataset?.pdpSize)||text(state?.product?.defaultSize)).toUpperCase()}
function items(f,v){return f==='pattern'?(state?.visualOptions?.patternsBySize?.[size(v)]||[]):(state?.visualOptions?.packagesBySeries?.[text(state?.product?.series)]||[])}
function field(f,v,l){
 const s=document.querySelector(`[data-pdp-visual-field="${f}"]`),r=s?.querySelector(`[data-pdp-visual-options="${f}"]`),q=sourceFor(f);
 if(!s||!r||!q)return;
 const a=new Set([...q.options].map(o=>text(o.value)).filter(Boolean)),c=text(q.value),g=document.createDocumentFragment();
 const rows=items(f,v).filter(o=>a.has(text(o?.value)));
 for(const o of rows){
  const x=text(o?.value),b=document.createElement('button'),i=document.createElement('img'),n=document.createElement('span'),z=x===c;
  b.type='button';b.className='pdp-visual-option'+(z?' is-selected':'');b.dataset.pdpVisualOption=f;b.dataset.pdpVisualValue=x;b.setAttribute('aria-pressed',z?'true':'false');
  i.src=text(o?.preview)||text(o?.image);i.alt='';i.loading='lazy';i.decoding='async';n.textContent=label(o,l);b.setAttribute('aria-label',n.textContent);b.append(i,n);g.append(b)
 }
 r.replaceChildren(g);const k=s.querySelector('[data-pdp-visual-count]');if(k)k.textContent=String(rows.length);s.hidden=!rows.length
}
function render(v,l){if(state?.visualOptions?.version!==1)return;l=language(l);field('pattern',v,l);field('pack',v,l);document.documentElement.dataset.pdpVisualOptionsReady='true'}
function mount(){if(mounted){render();return true}try{state=JSON.parse(document.getElementById('pdpRuntimeState')?.textContent||'{}')}catch(_){return false}if(state?.visualOptions?.version!==1)return false;
 document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-pdp-visual-option]');if(!b)return;const select=sourceFor(b.dataset.pdpVisualOption),n=text(b.dataset.pdpVisualValue);if(!select||!n||select.value===n)return;select.value=n;select.dispatchEvent(new Event('change',{bubbles:true}))});
 document.addEventListener('dreamland:pdp-render',e=>render(e.detail?.view,e.detail?.language));mounted=true;render();return true}
root.DreamlandPdpVisualOptions=Object.freeze({version:VERSION,mount,render});
if(typeof document!=='undefined'){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount()}
})(typeof globalThis!=='undefined'?globalThis:this);

(function(root){
  'use strict';

  if(root.DreamlandDesktopSuccess){
    return;
  }

  const VERSION='B7-00B.3D';

  let config=null;
  let successRoot=null;
  let mounted=false;

  function text(value){
    return String(value??'').trim();
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function copy(){
    return config?.content?.()?.inquiryFlow||{};
  }

  function data(){
    return config?.lastSubmission?.()||{};
  }

  function dateText(value){
    if(!value){
      return '—';
    }

    try{
      return new Date(value).toLocaleDateString(
        config?.locale?.()||undefined
      );
    }catch(_){
      return text(value)||'—';
    }
  }

  function pageHtml(){
    const c=copy();
    const snapshot=data();

    return `
      <div class="desktop-success-page">
        <div class="desktop-container desktop-success-container">
          <div class="desktop-success-mark" aria-hidden="true">✓</div>
          <div class="desktop-eyebrow">${escapeHtml(c.successKicker)}</div>
          <h1>${escapeHtml(c.successTitle)}</h1>
          <p class="desktop-success-lead">${escapeHtml(c.successBody)}</p>

          <dl class="desktop-success-details">
            <div>
              <dt>${escapeHtml(c.inquiryNumber)}</dt>
              <dd>${escapeHtml(snapshot.inquiryId||'—')}</dd>
            </div>
            <div>
              <dt>${escapeHtml(c.submitted)}</dt>
              <dd>${escapeHtml(dateText(snapshot.submittedAt))}</dd>
            </div>
            <div>
              <dt>${escapeHtml(c.productEstimate)}</dt>
              <dd>${escapeHtml(snapshot.amountDisplay||'—')}</dd>
            </div>
            <div>
              <dt>${escapeHtml(c.status)}</dt>
              <dd>${escapeHtml(c.awaitingReview)}</dd>
            </div>
          </dl>

          <section class="desktop-success-next">
            <div class="desktop-eyebrow">${escapeHtml(c.whatNextKicker)}</div>
            <h2>${escapeHtml(c.whatNextTitle)}</h2>
            <ol>
              ${(c.whatNextSteps||[]).map((step,index)=>`
                <li>
                  <b>${String(index+1).padStart(2,'0')}</b>
                  <span>${escapeHtml(step)}</span>
                </li>
              `).join('')}
            </ol>
          </section>

          <div class="desktop-success-actions">
            <button
              class="desktop-flow-primary"
              type="button"
              data-desktop-success-action="explore"
            >
              ${escapeHtml(c.continueExploring)}
              <span aria-hidden="true">→</span>
            </button>

            <button
              class="desktop-flow-secondary"
              type="button"
              data-desktop-success-action="custom"
            >${escapeHtml(c.startAnotherProject)}</button>
          </div>
        </div>
      </div>
    `;
  }

  function render(){
    if(!successRoot){
      return false;
    }

    successRoot.innerHTML=pageHtml();
    return true;
  }

  function onClick(event){
    const target=event.target.closest?.('[data-desktop-success-action]');

    if(!target||!successRoot?.contains(target)){
      return;
    }

    const action=target.dataset.desktopSuccessAction;

    if(action==='explore'){
      config?.actions?.explore?.();
      return;
    }

    if(action==='custom'){
      config?.actions?.custom?.();
    }
  }

  function configure(options={}){
    config={
      content:typeof options.content==='function'?options.content:()=>({}),
      lastSubmission:typeof options.lastSubmission==='function'?options.lastSubmission:()=>({}),
      locale:typeof options.locale==='function'?options.locale:()=>undefined,
      actions:options.actions||{}
    };

    return snapshot();
  }

  function mount(rootElement){
    successRoot=rootElement||successRoot;

    if(!successRoot){
      return false;
    }

    if(!mounted){
      successRoot.addEventListener('click',onClick);
      mounted=true;
    }

    render();
    return true;
  }

  function refresh(){
    return render();
  }

  function snapshot(){
    const snapshot=data();

    return Object.freeze({
      version:VERSION,
      configured:Boolean(config),
      mounted,
      inquiryId:text(snapshot.inquiryId)
    });
  }

  root.DreamlandDesktopSuccess=Object.freeze({
    version:VERSION,
    configure,
    mount,
    refresh,
    snapshot
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

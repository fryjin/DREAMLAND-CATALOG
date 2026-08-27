(function(root){
  'use strict';

  if(root.DreamlandDesktopReview){
    return;
  }

  const VERSION='B7-00B.3D';

  let config=null;
  let reviewRoot=null;
  let mounted=false;
  let privacyAccepted=false;
  let submitting=false;
  let submitError='';

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

  function projection(){
    return config?.projection?.()||{
      inquiryId:'',
      contact:{},
      products:[],
      customs:[],
      estimatedTotalDisplay:''
    };
  }

  function progress(){
    const c=copy();
    const labels=[
      c.stepSelection||'Selection',
      c.stepContact||'Contact',
      c.stepReview||'Review'
    ];

    return `
      <div class="desktop-flow-progress" aria-label="${escapeHtml(c.progressLabel||'Inquiry progress')}">
        ${labels.map((label,index)=>`
          <span class="${index===2?'is-active':''} ${index<2?'is-complete':''}">
            <b>${String(index+1).padStart(2,'0')}</b>
            ${escapeHtml(label)}
          </span>
        `).join('')}
      </div>
    `;
  }

  function section(title,action,body){
    const c=copy();

    return `
      <section class="desktop-review-section">
        <header>
          <h2>${escapeHtml(title)}</h2>
          <button
            type="button"
            data-desktop-review-action="${escapeHtml(action)}"
          >${escapeHtml(c.edit)} →</button>
        </header>
        ${body}
      </section>
    `;
  }

  function contactHtml(data){
    const c=copy();
    const rows=[
      [c.name,data.name],
      [c.company,data.company||c.notProvided],
      [c.country,data.country],
      [c.city,data.city||c.notProvided],
      [c.email,data.email],
      [c.phone,data.phone],
      [c.buyerType,data.buyerType||c.notProvided],
      [c.message,data.message||c.notProvided]
    ];

    return `
      <dl class="desktop-review-kv">
        ${rows.map(([label,value])=>`
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value||'—')}</dd>
          </div>
        `).join('')}
      </dl>
    `;
  }

  function productHtml(rows){
    const c=copy();

    if(!rows.length){
      return `<p class="desktop-review-empty">${escapeHtml(c.none)}</p>`;
    }

    return `
      <div class="desktop-review-items">
        ${rows.map(item=>`
          <article>
            <strong>${escapeHtml(item.previewKey)}</strong>
            <p>${escapeHtml(item.previewValue)}</p>
            <span>${escapeHtml(item.subtotalDisplay)}</span>
          </article>
        `).join('')}
      </div>
    `;
  }

  function customHtml(rows){
    const c=copy();

    if(!rows.length){
      return `<p class="desktop-review-empty">${escapeHtml(c.none)}</p>`;
    }

    return `
      <div class="desktop-review-items desktop-review-items--custom">
        ${rows.map(item=>`
          <article>
            <strong>${escapeHtml(item.previewKey)}</strong>
            <p>${escapeHtml(item.previewValue)}</p>
            <span>${escapeHtml(c.customQuotedSeparately)}</span>
          </article>
        `).join('')}
      </div>
    `;
  }

  function securityHtml(){
    const c=copy();
    const state=config?.riskState?.()||{};

    let label=c.securityChecking;

    if(state.requiresCaptcha&&state.verified){
      label=c.securityVerified;
    }else if(state.requiresCaptcha){
      label=c.securityAdditional;
    }else if(state.pending===false){
      label=c.securityReady;
    }

    return `
      <div class="desktop-review-security">
        <span>${escapeHtml(c.security)}</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
    `;
  }

  function summaryHtml(data){
    const c=copy();

    return `
      <aside class="desktop-review-summary">
        <div class="desktop-eyebrow">${escapeHtml(c.summaryKicker)}</div>
        <h2>${escapeHtml(c.reviewSummaryTitle)}</h2>

        <div class="desktop-review-summary__id">
          <span>${escapeHtml(c.inquiryNumber)}</span>
          <strong>${escapeHtml(data.inquiryId||'—')}</strong>
        </div>

        <div class="desktop-review-summary__amount">
          <span>${escapeHtml(c.productEstimate)}</span>
          <strong>${escapeHtml(data.estimatedTotalDisplay||'—')}</strong>
        </div>

        ${
          data.customs?.length
            ? `<div class="desktop-review-summary__custom">
                <span>${escapeHtml(c.customProject)}</span>
                <strong>${escapeHtml(c.customQuotedSeparately)}</strong>
              </div>`
            : ''
        }

        <p>${escapeHtml(c.beforeSubmitBody)}</p>

        <label class="desktop-review-consent">
          <input
            type="checkbox"
            data-desktop-review-privacy
            ${privacyAccepted?'checked':''}
          >
          <span>
            ${escapeHtml(c.privacyPrefix)}
            <button
              type="button"
              data-desktop-review-action="privacy"
            >${escapeHtml(c.privacyLink)}</button>
          </span>
        </label>

        ${securityHtml()}

        ${
          submitError
            ? `<div class="desktop-review-submit-error" role="alert">${escapeHtml(submitError)}</div>`
            : ''
        }

        <button
          class="desktop-flow-primary desktop-review-submit"
          type="button"
          data-desktop-review-action="submit"
          ${submitting?'disabled':''}
        >
          ${escapeHtml(submitting?c.submitting:c.submitInquiry)}
          <span aria-hidden="true">${submitting?'':'→'}</span>
        </button>
      </aside>
    `;
  }

  function pageHtml(){
    const c=copy();
    const data=projection();

    return `
      <div class="desktop-flow-page desktop-review-page">
        <div class="desktop-container">
          <header class="desktop-flow-hero">
            <div class="desktop-eyebrow">${escapeHtml(c.reviewKicker)}</div>
            <h1>${escapeHtml(c.reviewTitle)}</h1>
            <p>${escapeHtml(c.reviewBody)}</p>
            ${progress()}
          </header>

          <div class="desktop-review-layout">
            <div class="desktop-review-main">
              ${section(
                c.contactDetailsTitle,
                'edit-contact',
                contactHtml(data.contact||{})
              )}

              ${section(
                c.selectedProducts,
                'edit-inquiry',
                productHtml(data.products||[])
              )}

              ${
                data.customs?.length
                  ? section(
                      c.customProject,
                      'edit-inquiry',
                      customHtml(data.customs||[])
                    )
                  : ''
              }

              <section class="desktop-review-notice">
                <div class="desktop-eyebrow">${escapeHtml(c.beforeSubmitKicker)}</div>
                <h2>${escapeHtml(c.beforeSubmitTitle)}</h2>
                <p>${escapeHtml(c.beforeSubmitBody)}</p>
              </section>
            </div>

            ${summaryHtml(data)}
          </div>
        </div>
      </div>
    `;
  }

  function render({preserveScroll=false}={}){
    if(!reviewRoot){
      return false;
    }

    const y=preserveScroll?Number(root.scrollY||0):null;
    reviewRoot.innerHTML=pageHtml();

    if(preserveScroll&&Number.isFinite(y)){
      root.requestAnimationFrame?.(
        ()=>root.scrollTo?.(0,y)
      );
    }

    return true;
  }

  async function submit(){
    const c=copy();
    submitError='';

    if(!privacyAccepted){
      submitError=c.privacyRequired;
      render({preserveScroll:true});
      return;
    }

    submitting=true;
    render({preserveScroll:true});

    try{
      const result=
        await config?.actions?.submit?.(
          privacyAccepted
        );

      if(result?.ok){
        return;
      }

      submitError=text(
        result?.message||
        c.submitFailed
      );
    }catch(error){
      console.error(error);
      submitError=c.submitFailed;
    }finally{
      submitting=false;

      if(reviewRoot&&!reviewRoot.hidden){
        render({preserveScroll:true});
      }
    }
  }

  function onChange(event){
    const input=event.target.closest?.('[data-desktop-review-privacy]');

    if(!input||!reviewRoot?.contains(input)){
      return;
    }

    privacyAccepted=Boolean(input.checked);
    submitError='';
    config?.actions?.privacyChanged?.(privacyAccepted);
    render({preserveScroll:true});
  }

  function onClick(event){
    const target=event.target.closest?.('[data-desktop-review-action]');

    if(!target||!reviewRoot?.contains(target)){
      return;
    }

    const action=target.dataset.desktopReviewAction;

    if(action==='edit-contact'){
      config?.actions?.editContact?.();
      return;
    }

    if(action==='edit-inquiry'){
      config?.actions?.editInquiry?.();
      return;
    }

    if(action==='privacy'){
      config?.actions?.privacy?.();
      return;
    }

    if(action==='submit'){
      submit();
    }
  }

  function configure(options={}){
    config={
      content:typeof options.content==='function'?options.content:()=>({}),
      projection:typeof options.projection==='function'?options.projection:()=>({}),
      riskState:typeof options.riskState==='function'?options.riskState:()=>({}),
      actions:options.actions||{}
    };

    return snapshot();
  }

  function mount(rootElement){
    reviewRoot=rootElement||reviewRoot;

    if(!reviewRoot){
      return false;
    }

    if(!mounted){
      reviewRoot.addEventListener('click',onClick);
      reviewRoot.addEventListener('change',onChange);
      mounted=true;
    }

    render();
    return true;
  }

  function refresh(options={}){
    return render(options);
  }

  function syncInquiry(){
    return render({preserveScroll:true});
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      configured:Boolean(config),
      mounted,
      privacyAccepted,
      submitting
    });
  }

  root.DreamlandDesktopReview=Object.freeze({
    version:VERSION,
    configure,
    mount,
    refresh,
    syncInquiry,
    snapshot
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

(function(root){
  'use strict';

  if(root.DreamlandDesktopReview){
    return;
  }

  const VERSION='B7-00B.3D';
  const PRESENTATION_VERSION='B7-00B.4I-R1';

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

  function qtyUnit(){
    return text(config?.qtyUnit?.()||'pcs');
  }

  function choice(value){
    return text(config?.choiceLabel?.(value)||value);
  }

  function series(value){
    return text(config?.seriesLabel?.(value)||value);
  }

  function itemScent(item){
    const direct=text(config?.itemScentLabel?.(item));

    if(direct){
      return direct;
    }

    if(Array.isArray(item?.scents)){
      return item.scents.map(text).filter(Boolean).join(' / ');
    }

    return text(item?.scent);
  }

  function itemMoq(item){
    return Math.max(
      1,
      Number(config?.itemMoq?.(item)||item?.moq||1)||1
    );
  }

  function progress(){
    const c=copy();
    const labels=[
      c.stepSelection||'Inquiry',
      c.stepContact||'Contact',
      c.stepReview||'Review'
    ];

    return `
      <div
        class="desktop-flow-progress desktop-review-flow"
        aria-label="${escapeHtml(c.progressLabel||'Inquiry progress')}"
      >
        ${labels.map((label,index)=>`
          <span class="${index===2?'is-active':''} ${index<2?'is-complete':''}">
            <b>${String(index+1).padStart(2,'0')}</b>
            <strong>${escapeHtml(label)}</strong>
          </span>
        `).join('')}
      </div>
    `;
  }

  function section(index,title,action,body){
    const c=copy();

    return `
      <section class="desktop-review-section">
        <header>
          <div class="desktop-review-section__title">
            <span>${String(index).padStart(2,'0')}</span>
            <h2>${escapeHtml(title)}</h2>
          </div>
          <button
            type="button"
            data-desktop-review-action="${escapeHtml(action)}"
          >${escapeHtml(c.edit)} →</button>
        </header>
        ${body}
      </section>
    `;
  }

  function countryDisplay(value){
    const raw=text(value);
    const code=raw.toUpperCase();
    const rows=Array.isArray(copy().countryRegions)?copy().countryRegions:[];
    const match=rows.find(row=>text(row?.code).toUpperCase()===code);

    return match
      ? `${text(match.label)} (${text(match.code)})`
      : raw;
  }

  function buyerTypeDisplay(value){
    const raw=text(value);
    const match=(copy().buyerTypes||[])
      .find(row=>text(row?.value)===raw);

    return text(match?.label||raw);
  }

  function budgetDisplay(value){
    const raw=text(value);
    const rows=
      typeof config?.budgetOptions==='function'
        ? config.budgetOptions()
        : [];

    const match=(Array.isArray(rows)?rows:[])
      .find(row=>text(row?.value)===raw);

    return text(match?.label||raw);
  }

  function contactHtml(data){
    const c=copy();
    const rows=[
      [c.name,data.name],
      [c.company,data.company||c.notProvided],
      [c.buyerType,buyerTypeDisplay(data.buyerType)||c.notProvided],
      [c.country,countryDisplay(data.country)],
      [c.city,data.city||c.notProvided],
      [c.email,data.email],
      [c.phone,data.phone],
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

  function productConfigLine(item){
    const raw=item?.raw||{};
    return [
      text(raw.size),
      itemScent(raw),
      choice(raw.pattern),
      choice(raw.pack)
    ].filter(Boolean).join(' · ');
  }

  function productHtml(rows){
    const c=copy();

    if(!rows.length){
      return `<p class="desktop-review-empty">${escapeHtml(c.none)}</p>`;
    }

    return `
      <div class="desktop-review-products">
        ${rows.map(item=>{
          const raw=item?.raw||{};
          const quantity=Number(raw.qty||item?.snapshotItem?.qty||0)||0;
          const cover=text(item?.snapshotItem?.cover||raw.cover);

          return `
            <article class="desktop-review-product">
              <div class="desktop-review-product__media">
                ${
                  cover
                    ? `<img
                        src="${escapeHtml(cover)}"
                        alt="${escapeHtml(item.previewKey)}"
                        loading="lazy"
                        decoding="async"
                      >`
                    : '<span aria-hidden="true"></span>'
                }
              </div>

              <div class="desktop-review-product__body">
                <div class="desktop-eyebrow">${escapeHtml(series(raw.series))}</div>
                <h3>${escapeHtml(item.previewKey)}</h3>
                <p>${escapeHtml(productConfigLine(item))}</p>
                <span>${escapeHtml(quantity)} ${escapeHtml(qtyUnit())}</span>
              </div>

              <strong>${escapeHtml(item.subtotalDisplay)}</strong>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function customConfigLine(item){
    const raw=item?.raw||{};

    return [
      raw.qty ? `${raw.qty} ${qtyUnit()}` : '',
      budgetDisplay(raw.budget),
      choice(raw.sizePref),
      series(raw.scentSeries),
      itemScent(raw),
      choice(raw.pack),
      choice(raw.branding)
    ].filter(Boolean).join(' · ');
  }

  function customHtml(rows){
    const c=copy();

    if(!rows.length){
      return `<p class="desktop-review-empty">${escapeHtml(c.none)}</p>`;
    }

    return `
      <div class="desktop-review-customs">
        ${rows.map((item,index)=>`
          <article class="desktop-review-custom">
            <span>CUSTOM / ${String(index+1).padStart(2,'0')}</span>
            <div>
              <h3>${escapeHtml(choice(item?.raw?.use)||item.previewKey)}</h3>
              <p>${escapeHtml(customConfigLine(item))}</p>
            </div>
            <strong>${escapeHtml(c.customQuotedSeparately)}</strong>
          </article>
        `).join('')}
      </div>
    `;
  }

  function deriveMoqGroups(data=projection()){
    const groups=new Map();

    for(const item of data.products||[]){
      const raw=item?.raw||{};

      if(raw?.type&&raw.type!=='product'){
        continue;
      }

      const seriesKey=text(raw.series)||'unknown';
      const sizeKey=text(raw.size)||'—';
      const key=`${seriesKey}|${sizeKey}`;

      if(!groups.has(key)){
        groups.set(key,{
          key,
          quantity:0,
          moq:1
        });
      }

      const group=groups.get(key);
      group.quantity+=Number(raw.qty||item?.snapshotItem?.qty||0)||0;
      group.moq=Math.max(group.moq,itemMoq(raw));
    }

    return [...groups.values()].map(group=>Object.freeze({
      ...group,
      ready:group.quantity>=group.moq,
      remaining:Math.max(0,group.moq-group.quantity)
    }));
  }

  function moqStatusText(data){
    const c=copy();
    const groups=deriveMoqGroups(data);
    const ready=groups.filter(group=>group.ready).length;

    return text(c.reviewMoqGroupsReady||'{ready} / {total} groups ready')
      .replace('{ready}',String(ready))
      .replace('{total}',String(groups.length));
  }

  function securityHtml(){
    const c=copy();
    const state=config?.riskState?.()||{};

    if(!state.requiresCaptcha){
      return '';
    }

    const label=state.verified
      ? c.securityVerified
      : c.securityAdditional;

    return `
      <div class="desktop-review-security ${state.verified?'is-verified':'is-required'}">
        <span>${escapeHtml(c.security)}</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
    `;
  }

  function summaryHtml(data){
    const c=copy();
    const groups=deriveMoqGroups(data);

    return `
      <aside class="desktop-review-summary desktop-review-submit-rail">
        <div class="desktop-eyebrow">${escapeHtml(c.summaryKicker)}</div>
        <h2>${escapeHtml(c.reviewSummaryTitle)}</h2>

        <div class="desktop-review-summary__rows">
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

          ${
            groups.length
              ? `<div class="desktop-review-summary__moq">
                  <span>${escapeHtml(c.reviewMoqStatus||c.moq||'MOQ')}</span>
                  <strong>${escapeHtml(moqStatusText(data))}</strong>
                </div>`
              : ''
          }
        </div>

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

        <div
          class="desktop-review-submit-error"
          role="alert"
          data-desktop-review-submit-error
          ${submitError?'':'hidden'}
        >${escapeHtml(submitError)}</div>

        <button
          class="desktop-flow-primary desktop-review-submit"
          type="button"
          data-desktop-review-action="submit"
          ${submitting?'disabled':''}
        >
          <span data-desktop-review-submit-label>
            ${escapeHtml(submitting?c.submitting:c.submitInquiry)}
          </span>
          <span
            data-desktop-review-submit-arrow
            aria-hidden="true"
          >${submitting?'':'→'}</span>
        </button>
      </aside>
    `;
  }

  function pageHtml(){
    const c=copy();
    const data=projection();

    return `
      <div
        class="desktop-flow-page desktop-review-page desktop-final-review"
        data-desktop-review-presentation="${PRESENTATION_VERSION}"
      >
        <div class="desktop-container desktop-container--wide">
          <header class="desktop-flow-hero desktop-review-hero">
            <div class="desktop-eyebrow">${escapeHtml(c.reviewKicker)}</div>
            <h1>${escapeHtml(c.reviewTitle)}</h1>
            <p>${escapeHtml(c.reviewBody)}</p>
            ${progress()}
          </header>

          <div class="desktop-review-layout">
            <div class="desktop-review-main">
              ${section(
                1,
                c.contactDetailsTitle,
                'edit-contact',
                contactHtml(data.contact||{})
              )}

              ${section(
                2,
                c.selectedProducts,
                'edit-inquiry',
                productHtml(data.products||[])
              )}

              ${
                data.customs?.length
                  ? section(
                      3,
                      c.customProject,
                      'edit-inquiry',
                      customHtml(data.customs||[])
                    )
                  : ''
              }

              <section class="desktop-review-notice">
                <div class="desktop-review-section__title">
                  <span>${data.customs?.length?'04':'03'}</span>
                  <div>
                    <div class="desktop-eyebrow">${escapeHtml(c.beforeSubmitKicker)}</div>
                    <h2>${escapeHtml(c.beforeSubmitTitle)}</h2>
                  </div>
                </div>
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

  function syncSubmitError(){
    const node=reviewRoot?.querySelector(
      '[data-desktop-review-submit-error]'
    );

    if(!node){
      return false;
    }

    node.textContent=submitError;
    node.hidden=!submitError;
    return true;
  }

  function syncSubmitState(){
    const c=copy();
    const button=reviewRoot?.querySelector(
      '[data-desktop-review-action="submit"]'
    );
    const label=reviewRoot?.querySelector(
      '[data-desktop-review-submit-label]'
    );
    const arrow=reviewRoot?.querySelector(
      '[data-desktop-review-submit-arrow]'
    );

    if(button){
      button.disabled=submitting;
      button.setAttribute(
        'aria-busy',
        submitting?'true':'false'
      );
    }

    if(label){
      label.textContent=submitting?c.submitting:c.submitInquiry;
    }

    if(arrow){
      arrow.textContent=submitting?'':'→';
    }

    return true;
  }

  function syncConsent(){
    submitError='';
    syncSubmitError();
    return true;
  }

  async function submit(){
    const c=copy();
    submitError='';

    if(!privacyAccepted){
      submitError=c.privacyRequired;
      syncSubmitError();
      return;
    }

    submitting=true;
    syncSubmitError();
    syncSubmitState();

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
        syncSubmitError();
        syncSubmitState();
      }
    }
  }

  function onChange(event){
    const input=event.target.closest?.('[data-desktop-review-privacy]');

    if(!input||!reviewRoot?.contains(input)){
      return;
    }

    privacyAccepted=Boolean(input.checked);
    config?.actions?.privacyChanged?.(privacyAccepted);
    syncConsent();
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
      budgetOptions:typeof options.budgetOptions==='function'?options.budgetOptions:()=>[],
      qtyUnit:options.qtyUnit,
      choiceLabel:options.choiceLabel,
      seriesLabel:options.seriesLabel,
      itemScentLabel:options.itemScentLabel,
      itemMoq:options.itemMoq,
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
      presentation:PRESENTATION_VERSION,
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

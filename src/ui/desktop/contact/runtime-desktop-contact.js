(function(root){
  'use strict';

  if(root.DreamlandDesktopContact){
    return;
  }

  const VERSION='B7-00B.3D';

  let config=null;
  let contactRoot=null;
  let mounted=false;
  let validation=null;
  let contact={};

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

  function feature(){
    return config?.feature||null;
  }

  function summary(){
    return config?.summary?.()||{
      itemCount:0,
      productQuantity:0,
      estimatedTotal:0,
      customCount:0
    };
  }

  function money(value){
    return text(config?.money?.(Number(value)||0)||value);
  }

  function qtyUnit(){
    return text(config?.qtyUnit?.()||'pcs');
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
          <span class="${index===1?'is-active':''} ${index<1?'is-complete':''}">
            <b>${String(index+1).padStart(2,'0')}</b>
            ${escapeHtml(label)}
          </span>
        `).join('')}
      </div>
    `;
  }

  function fieldError(field){
    const row=(validation?.errors||[]).find(error=>error?.field===field);

    if(!row){
      return '';
    }

    const c=copy();

    return text(
      c.validation?.[row.code]||
      c.validation?.generic||
      row.code
    );
  }

  function field({
    key,
    label,
    placeholder='',
    type='text',
    autocomplete='',
    required=false
  }){
    const error=fieldError(key);

    return `
      <div class="desktop-contact-field ${error?'is-invalid':''}">
        <label for="desktopContact_${escapeHtml(key)}">
          ${escapeHtml(label)}
          ${required?' *':''}
        </label>

        <input
          id="desktopContact_${escapeHtml(key)}"
          type="${escapeHtml(type)}"
          value="${escapeHtml(contact[key]||'')}"
          placeholder="${escapeHtml(placeholder)}"
          autocomplete="${escapeHtml(autocomplete)}"
          data-desktop-contact-field="${escapeHtml(key)}"
          ${required?'required':''}
        >

        ${error?`<p>${escapeHtml(error)}</p>`:''}
      </div>
    `;
  }

  function formHtml(){
    const c=copy();

    return `
      <section class="desktop-contact-card">
        <header class="desktop-contact-card__head">
          <div class="desktop-eyebrow">${escapeHtml(c.contactDetailsKicker)}</div>
          <h2>${escapeHtml(c.contactDetailsTitle)}</h2>
          <p>${escapeHtml(c.contactDetailsBody)}</p>
        </header>

        <div class="desktop-contact-grid">
          ${field({
            key:'name',
            label:c.name,
            placeholder:c.namePlaceholder,
            autocomplete:'name',
            required:true
          })}

          ${field({
            key:'company',
            label:c.company,
            placeholder:c.companyPlaceholder,
            autocomplete:'organization'
          })}

          ${field({
            key:'country',
            label:c.country,
            placeholder:c.countryPlaceholder,
            autocomplete:'country-name',
            required:true
          })}

          ${field({
            key:'city',
            label:c.city,
            placeholder:c.cityPlaceholder,
            autocomplete:'address-level2'
          })}

          ${field({
            key:'email',
            label:c.email,
            placeholder:c.emailPlaceholder,
            type:'email',
            autocomplete:'email',
            required:true
          })}

          ${field({
            key:'phone',
            label:c.phone,
            placeholder:c.phonePlaceholder,
            autocomplete:'tel',
            required:true
          })}

          <div class="desktop-contact-field">
            <label for="desktopContact_buyerType">${escapeHtml(c.buyerType)}</label>
            <select
              id="desktopContact_buyerType"
              data-desktop-contact-field="buyerType"
            >
              ${(c.buyerTypes||[]).map(row=>`
                <option
                  value="${escapeHtml(row.value)}"
                  ${text(contact.buyerType)===text(row.value)?'selected':''}
                >${escapeHtml(row.label)}</option>
              `).join('')}
            </select>
          </div>

          <div class="desktop-contact-field desktop-contact-field--wide">
            <label for="desktopContact_message">${escapeHtml(c.message)}</label>
            <textarea
              id="desktopContact_message"
              placeholder="${escapeHtml(c.messagePlaceholder)}"
              data-desktop-contact-field="message"
            >${escapeHtml(contact.message||'')}</textarea>
          </div>
        </div>

        ${
          validation?.global
            ? `<div class="desktop-contact-global-error" role="alert">${escapeHtml(validation.global)}</div>`
            : ''
        }

        <div class="desktop-contact-actions">
          <button
            class="desktop-flow-secondary"
            type="button"
            data-desktop-contact-action="back"
          >${escapeHtml(c.backInquiry)}</button>

          <button
            class="desktop-flow-primary"
            type="button"
            data-desktop-contact-action="continue"
          >
            ${escapeHtml(c.reviewInquiry)}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    `;
  }

  function asideHtml(){
    const c=copy();
    const data=summary();

    return `
      <aside class="desktop-contact-aside">
        <section class="desktop-contact-summary">
          <div class="desktop-eyebrow">${escapeHtml(c.summaryKicker)}</div>
          <h2>${escapeHtml(c.summaryTitle)}</h2>

          <div>
            <span>${escapeHtml(c.selectedItems)}</span>
            <strong>${escapeHtml(data.itemCount||0)}</strong>
          </div>
          <div>
            <span>${escapeHtml(c.totalQuantity)}</span>
            <strong>${escapeHtml(data.productQuantity||0)} ${escapeHtml(qtyUnit())}</strong>
          </div>
          <div>
            <span>${escapeHtml(c.productEstimate)}</span>
            <strong>${escapeHtml(money(data.estimatedTotal||0))}</strong>
          </div>
          ${
            Number(data.customCount||0)>0
              ? `<div>
                  <span>${escapeHtml(c.customProject)}</span>
                  <strong>${escapeHtml(c.customQuotedSeparately)}</strong>
                </div>`
              : ''
          }
        </section>

        <section class="desktop-contact-next">
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
      </aside>
    `;
  }

  function pageHtml(){
    const c=copy();

    return `
      <div class="desktop-flow-page desktop-contact-page">
        <div class="desktop-container">
          <header class="desktop-flow-hero">
            <div class="desktop-eyebrow">${escapeHtml(c.contactKicker)}</div>
            <h1>${escapeHtml(c.contactTitle)}</h1>
            <p>${escapeHtml(c.contactBody)}</p>
            ${progress()}
          </header>

          <div class="desktop-contact-layout">
            ${formHtml()}
            ${asideHtml()}
          </div>
        </div>
      </div>
    `;
  }

  function render({
    preserveScroll=false
  }={}){
    if(!contactRoot){
      return false;
    }

    const y=preserveScroll?Number(root.scrollY||0):null;
    contactRoot.innerHTML=pageHtml();

    if(preserveScroll&&Number.isFinite(y)){
      root.requestAnimationFrame?.(
        ()=>root.scrollTo?.(0,y)
      );
    }

    return true;
  }

  function mutate(field,value){
    contact={
      ...contact,
      [field]:text(value)
    };

    feature()?.patch?.({
      [field]:text(value)
    });

    feature()?.scheduleDraft?.(
      contact,
      250
    );

    if(validation){
      validation={
        ...validation,
        errors:(validation.errors||[])
          .filter(error=>error?.field!==field)
      };
    }
  }

  function focusFirstError(){
    const first=validation?.errors?.[0]?.field;

    if(!first){
      return;
    }

    const target=contactRoot?.querySelector(
      `[data-desktop-contact-field="${first}"]`
    );

    target?.scrollIntoView?.({
      behavior:'smooth',
      block:'center'
    });

    root.setTimeout?.(
      ()=>target?.focus?.(),
      220
    );
  }

  function onInput(event){
    const target=event.target.closest?.('[data-desktop-contact-field]');

    if(!target||!contactRoot?.contains(target)){
      return;
    }

    mutate(
      target.dataset.desktopContactField,
      target.value
    );
  }

  function onChange(event){
    const target=event.target.closest?.('[data-desktop-contact-field]');

    if(!target||!contactRoot?.contains(target)){
      return;
    }

    mutate(
      target.dataset.desktopContactField,
      target.value
    );

    render({preserveScroll:true});
  }

  function onClick(event){
    const target=event.target.closest?.('[data-desktop-contact-action]');

    if(!target||!contactRoot?.contains(target)){
      return;
    }

    const action=target.dataset.desktopContactAction;

    if(action==='back'){
      feature()?.flushDraft?.(contact);
      config?.actions?.back?.();
      return;
    }

    if(action==='continue'){
      feature()?.replace?.(contact);

      const result=config?.actions?.continue?.({...contact})||{
        valid:false,
        errors:[]
      };

      if(result.valid){
        validation=null;
        return;
      }

      validation=result;
      render({preserveScroll:true});
      focusFirstError();
    }
  }

  function loadDraft(){
    contact={
      ...(
        feature()?.loadDraft?.()||
        feature()?.snapshot?.()||
        {}
      )
    };

    return contact;
  }

  function configure(options={}){
    config={
      content:typeof options.content==='function'?options.content:()=>({}),
      feature:options.feature||null,
      summary:typeof options.summary==='function'?options.summary:()=>({}),
      money:options.money,
      qtyUnit:options.qtyUnit,
      actions:options.actions||{}
    };

    return snapshot();
  }

  function mount(rootElement){
    contactRoot=rootElement||contactRoot;

    if(!contactRoot){
      return false;
    }

    if(!mounted){
      contactRoot.addEventListener('input',onInput);
      contactRoot.addEventListener('change',onChange);
      contactRoot.addEventListener('click',onClick);
      mounted=true;
    }

    loadDraft();
    render();
    return true;
  }

  function refresh(options={}){
    contact={
      ...(
        feature()?.snapshot?.()||
        contact
      )
    };

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
      contact:Object.freeze({...contact})
    });
  }

  root.DreamlandDesktopContact=Object.freeze({
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

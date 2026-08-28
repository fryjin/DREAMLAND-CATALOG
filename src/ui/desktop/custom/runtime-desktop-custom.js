(function(root){
  'use strict';

  if(root.DreamlandDesktopCustom){
    return;
  }

  const VERSION='B7-00B.3C';
  const PRESENTATION_VERSION='B7-00B.4E-R1';

  const DEFAULT_DRAFT=Object.freeze({
    use:'',
    qty:'',
    budget:'待确认',
    date:'',
    sizePref:'待推荐',
    color:'',
    pack:'待推荐',
    branding:'暂不需要',
    note:''
  });

  let config=null;
  let customRoot=null;
  let mounted=false;
  let draft={
    ...DEFAULT_DRAFT
  };
  let validation=null;
  let added=false;

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

  function content(){
    return (
      config?.content?.()
        ?.customProject||
      {}
    );
  }

  function feature(){
    return config?.feature||null;
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      presentation:PRESENTATION_VERSION,
      configured:Boolean(config),
      mounted,
      added,
      draft:Object.freeze({
        ...draft
      }),
      feature:
        feature()
          ?.snapshot?.()||
        null
    });
  }

  function seriesLabel(value){
    return text(
      config?.seriesLabel?.(
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
      scent?.name?.en||
      scent?.name?.zh||
      scent?.id
    );
  }

  function options(key){
    const rows=
      content()?.[key];

    return Array.isArray(rows)
      ? rows
      : [];
  }

  function optionLabel(
    key,
    value
  ){
    const row=
      options(key)
        .find(
          item=>
            text(item?.value)===
            text(value)
        );

    return text(
      row?.label||
      value
    );
  }

  function featureSnapshot(){
    return (
      feature()
        ?.snapshot?.()||
      {
        minimumQuantity:1,
        maximumQuantity:1000000,
        selectedSeries:'classic'
      }
    );
  }

  function selectedSeries(){
    return text(
      feature()
        ?.selectedSeries?.()||
      featureSnapshot()
        .selectedSeries||
      'classic'
    );
  }

  function selectedScents(){
    const rows=
      feature()
        ?.selectedScents?.();

    return Array.isArray(rows)
      ? rows
      : [];
  }

  function availableSeries(){
    const rows=
      feature()
        ?.availableSeries?.();

    return Array.isArray(rows)
      ? rows
      : [];
  }

  function availableScents(){
    const rows=
      feature()
        ?.availableScents?.(
          selectedSeries()
        );

    return Array.isArray(rows)
      ? rows
      : [];
  }

  function fieldError(field){
    const errors=
      validation?.errors||
      [];

    const copy=content();
    const limits=
      featureSnapshot();

    if(
      field==='use'&&
      errors.includes('use')
    ){
      return text(copy.errorUse);
    }

    if(
      field==='qty'&&
      errors.some(
        code=>
          code==='quantity'||
          code==='quantity-min'||
          code==='quantity-max'
      )
    ){
      if(
        errors.includes(
          'quantity-min'
        )
      ){
        return text(copy.errorQuantityMin)
          .replace(
            '{min}',
            String(
              limits.minimumQuantity||
              1
            )
          );
      }

      if(
        errors.includes(
          'quantity-max'
        )
      ){
        return text(copy.errorQuantityMax)
          .replace(
            '{max}',
            String(
              limits.maximumQuantity||
              ''
            )
          );
      }

      return text(copy.errorQuantity);
    }

    if(
      field==='scents'&&
      errors.includes('scents')
    ){
      return text(copy.errorScents);
    }

    return '';
  }

  function inputClass(field){
    return fieldError(field)
      ? 'is-invalid'
      : '';
  }

  function fieldHtml({
    label,
    hint='',
    body,
    field=''
  }){
    const error=
      field
        ? fieldError(field)
        : '';

    return `
      <div
        class="desktop-custom-field ${error?'is-invalid':''}"
        ${field?`data-desktop-custom-validation="${escapeHtml(field)}"`:''}
      >
        <div class="desktop-custom-field__head">
          <label>${escapeHtml(label)}</label>
          ${
            hint
              ? `<span>${escapeHtml(hint)}</span>`
              : ''
          }
        </div>

        ${body}

        ${
          error
            ? `
              <p
                class="desktop-custom-error"
                data-desktop-custom-error="${escapeHtml(field)}"
              >
                ${escapeHtml(error)}
              </p>
            `
            : ''
        }
      </div>
    `;
  }

  function cardChoices(
    key,
    field,
    className=''
  ){
    return `
      <div
        class="desktop-custom-choice-grid ${className}"
        data-desktop-custom-choice-group="${escapeHtml(field)}"
      >
        ${options(key)
          .map((option,index)=>{
            const value=
              text(option.value);

            const active=
              text(draft[field])===
              value;

            return `
              <button
                class="desktop-custom-choice desktop-custom-editorial-choice ${active?'is-active':''}"
                type="button"
                data-desktop-custom-pick="${escapeHtml(field)}"
                data-desktop-custom-value="${escapeHtml(value)}"
                aria-pressed="${active?'true':'false'}"
              >
                <span class="desktop-custom-choice__index" aria-hidden="true">
                  ${String(index+1).padStart(2,'0')}
                </span>
                <span class="desktop-custom-choice__copy">
                  <strong>${escapeHtml(option.label)}</strong>
                  ${
                    option.body
                      ? `<span>${escapeHtml(option.body)}</span>`
                      : ''
                  }
                </span>
                <span class="desktop-custom-choice__mark" aria-hidden="true">✓</span>
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function selectHtml(
    key,
    field,
    ariaLabel
  ){
    return `
      <select
        class="desktop-custom-select"
        data-desktop-custom-field="${escapeHtml(field)}"
        aria-label="${escapeHtml(ariaLabel)}"
      >
        ${options(key)
          .map(option=>`
            <option
              value="${escapeHtml(option.value)}"
              ${text(draft[field])===text(option.value)?'selected':''}
            >
              ${escapeHtml(option.label)}
            </option>
          `)
          .join('')}
      </select>
    `;
  }

  function projectBasicsHtml(){
    const c=content();
    const limits=featureSnapshot();

    return `
      <section
        class="desktop-custom-section desktop-custom-section--context"
        data-desktop-custom-section="basics"
      >
        <div class="desktop-custom-section__heading">
          <div class="desktop-eyebrow">
            ${escapeHtml(c.sectionBasicsKicker)}
          </div>
          <h2>${escapeHtml(c.sectionBasicsTitle)}</h2>
          <p>${escapeHtml(c.sectionBasicsBody)}</p>
        </div>

        ${fieldHtml({
          label:c.useCase,
          field:'use',
          body:cardChoices(
            'useCases',
            'use',
            'desktop-custom-choice-grid--use'
          )
        })}

        <div class="desktop-custom-two desktop-custom-two--project-parameters">
          ${fieldHtml({
            label:c.quantity,
            hint:`${c.minimumQuantity} · ${limits.minimumQuantity||1} ${c.pieces}`,
            field:'qty',
            body:`
              <div class="desktop-custom-input-wrap ${inputClass('qty')}">
                <input
                  class="desktop-custom-input"
                  type="number"
                  min="${escapeHtml(limits.minimumQuantity||1)}"
                  max="${escapeHtml(limits.maximumQuantity||1000000)}"
                  step="1"
                  inputmode="numeric"
                  placeholder="${escapeHtml(c.quantityPlaceholder)}"
                  value="${escapeHtml(draft.qty)}"
                  data-desktop-custom-field="qty"
                >
                <span>${escapeHtml(c.pieces)}</span>
              </div>
            `
          })}

          ${fieldHtml({
            label:c.budget,
            body:selectHtml(
              'budgets',
              'budget',
              c.budget
            )
          })}
        </div>

        ${fieldHtml({
          label:c.delivery,
          hint:c.deliveryHint,
          body:`
            <input
              class="desktop-custom-input desktop-custom-input--standalone"
              type="text"
              value="${escapeHtml(draft.date)}"
              placeholder="${escapeHtml(c.deliveryPlaceholder)}"
              data-desktop-custom-field="date"
            >
          `
        })}
      </section>
    `;
  }

  function fragranceHtml(){
    const c=content();
    const series=
      selectedSeries();
    const selectedIds=
      new Set(
        selectedScents()
          .map(
            scent=>
              text(scent?.id)
          )
      );

    return `
      <div
        class="desktop-custom-fragrance-panel"
        data-desktop-custom-fragrance
      >
        ${fieldHtml({
          label:c.fragranceCollection,
          hint:c.collectionResetHint||'',
          body:`
            <div
              class="desktop-custom-series"
              role="radiogroup"
            >
              ${availableSeries()
                .map(value=>`
                  <button
                    class="desktop-custom-series__button ${value===series?'is-active':''}"
                    type="button"
                    data-desktop-custom-series="${escapeHtml(value)}"
                    role="radio"
                    aria-checked="${value===series?'true':'false'}"
                  >
                    ${escapeHtml(seriesLabel(value))}
                  </button>
                `)
                .join('')}
            </div>
          `
        })}

        ${fieldHtml({
          label:c.scents,
          hint:c.scentsHint
            .replace(
              '{count}',
              String(selectedIds.size)
            ),
          field:'scents',
          body:`
            <div
              class="desktop-custom-scents desktop-custom-fragrance-matrix"
              data-desktop-custom-scents
            >
              ${availableScents()
                .map(scent=>{
                  const id=text(scent?.id);
                  const active=
                    selectedIds.has(id);

                  return `
                    <button
                      class="desktop-custom-scent ${active?'is-active':''}"
                      type="button"
                      data-desktop-custom-scent="${escapeHtml(id)}"
                      aria-pressed="${active?'true':'false'}"
                    >
                      <span class="desktop-custom-scent__check" aria-hidden="true">✓</span>
                      <span>${escapeHtml(scentLabel(scent))}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          `
        })}
      </div>
    `;
  }

  function productDirectionHtml(){
    const c=content();

    return `
      <section
        class="desktop-custom-section desktop-custom-section--product"
        data-desktop-custom-section="product"
      >
        <div class="desktop-custom-section__heading">
          <div class="desktop-eyebrow">
            ${escapeHtml(c.sectionProductKicker)}
          </div>
          <h2>${escapeHtml(c.sectionProductTitle)}</h2>
          <p>${escapeHtml(c.sectionProductBody)}</p>
        </div>

        ${fieldHtml({
          label:c.size,
          body:cardChoices(
            'sizes',
            'sizePref',
            'desktop-custom-choice-grid--compact desktop-custom-size-selector'
          )
        })}

        ${fragranceHtml()}

        ${fieldHtml({
          label:c.color,
          hint:c.optional,
          body:`
            <input
              class="desktop-custom-input desktop-custom-input--standalone"
              type="text"
              value="${escapeHtml(draft.color)}"
              placeholder="${escapeHtml(c.colorPlaceholder)}"
              data-desktop-custom-field="color"
            >
          `
        })}
      </section>
    `;
  }

  function packagingHtml(){
    const c=content();

    return `
      <section
        class="desktop-custom-section desktop-custom-section--presentation"
        data-desktop-custom-section="packaging"
      >
        <div class="desktop-custom-section__heading">
          <div class="desktop-eyebrow">
            ${escapeHtml(c.sectionPackagingKicker)}
          </div>
          <h2>${escapeHtml(c.sectionPackagingTitle)}</h2>
          <p>${escapeHtml(c.sectionPackagingBody)}</p>
        </div>

        ${fieldHtml({
          label:c.packaging,
          body:cardChoices(
            'packages',
            'pack',
            'desktop-custom-choice-grid--packaging desktop-custom-packaging-selector'
          )
        })}

        ${fieldHtml({
          label:c.branding,
          body:cardChoices(
            'brandingOptions',
            'branding',
            'desktop-custom-choice-grid--branding desktop-custom-branding-selector'
          )
        })}

        ${fieldHtml({
          label:c.notes,
          hint:c.optional,
          body:`
            <textarea
              class="desktop-custom-textarea desktop-custom-project-notes"
              placeholder="${escapeHtml(c.notesPlaceholder)}"
              data-desktop-custom-field="note"
            >${escapeHtml(draft.note)}</textarea>
          `
        })}
      </section>
    `;
  }

  function summaryValue(
    label,
    value,
    className=''
  ){
    if(!text(value)){
      return '';
    }

    return `
      <div class="desktop-custom-summary__row ${className}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function liveBriefHtml(){
    const c=content();
    const scents=
      selectedScents();
    const scentNames=
      scents
        .map(scentLabel)
        .filter(Boolean);

    const rows=[
      summaryValue(
        c.useCase,
        draft.use
          ? optionLabel('useCases',draft.use)
          : ''
      ),
      summaryValue(
        c.quantity,
        draft.qty
          ? `${draft.qty} ${c.pieces}`
          : ''
      ),
      summaryValue(
        c.budget,
        draft.budget
          ? optionLabel('budgets',draft.budget)
          : ''
      ),
      summaryValue(
        c.delivery,
        draft.date
      ),
      summaryValue(
        c.size,
        draft.sizePref
          ? optionLabel('sizes',draft.sizePref)
          : ''
      ),
      summaryValue(
        c.fragranceCollection,
        scentNames.length
          ? seriesLabel(selectedSeries())
          : ''
      ),
      summaryValue(
        c.scents,
        scentNames.length
          ? scentNames.join(' / ')
          : ''
      ),
      summaryValue(
        c.color,
        draft.color
      ),
      summaryValue(
        c.packaging,
        draft.pack
          ? optionLabel('packages',draft.pack)
          : ''
      ),
      summaryValue(
        c.branding,
        draft.branding
          ? optionLabel('brandingOptions',draft.branding)
          : ''
      )
    ].filter(Boolean).join('');

    return `
      <div class="desktop-custom-summary desktop-custom-live-brief">
        <div class="desktop-custom-live-brief__head">
          <div class="desktop-eyebrow">
            ${escapeHtml(c.summaryKicker)}
          </div>
          <h2>${escapeHtml(c.summaryTitle)}</h2>
        </div>

        <div class="desktop-custom-summary__rows desktop-custom-live-brief__rows">
          ${
            rows||
            `<p class="desktop-custom-live-brief__empty">${escapeHtml(c.body||c.notSelected||'')}</p>`
          }
        </div>

        <div class="desktop-custom-summary__quotation desktop-custom-live-brief__quotation">
          <span>${escapeHtml(c.customization)}</span>
          <strong>${escapeHtml(c.quotedAfterReview)}</strong>
          <p>${escapeHtml(c.summaryNote)}</p>
        </div>

        <div class="desktop-custom-live-brief__footer">
          <button
            class="desktop-custom-submit"
            type="button"
            data-desktop-custom-action="submit"
            ${added?'disabled':''}
          >
            <span>
              ${escapeHtml(
                added
                  ? c.addedButton
                  : c.addInquiry
              )}
            </span>
            <span aria-hidden="true">${added?'✓':'→'}</span>
          </button>

          ${
            added
              ? `
                <div
                  class="desktop-custom-success"
                  role="status"
                  aria-live="polite"
                >
                  <strong>${escapeHtml(c.addedTitle)}</strong>
                  <p>${escapeHtml(c.addedBody)}</p>

                  <div>
                    <button
                      type="button"
                      data-desktop-custom-action="explore"
                    >
                      ${escapeHtml(c.exploreCollection)}
                    </button>

                    <button
                      type="button"
                      data-desktop-custom-action="review"
                    >
                      ${escapeHtml(c.reviewInquiry)}
                    </button>
                  </div>
                </div>
              `
              : ''
          }
        </div>
      </div>
    `;
  }

  function pageHtml(){
    const c=content();

    return `
      <div
        class="desktop-custom-page"
        data-desktop-custom-presentation="${PRESENTATION_VERSION}"
      >
        <div class="desktop-container--wide desktop-custom-shell">
          <header class="desktop-custom-hero">
            <div class="desktop-eyebrow">
              ${escapeHtml(c.kicker)}
            </div>

            <h1>${escapeHtml(c.title)}</h1>
            <p>${escapeHtml(c.body)}</p>
          </header>

          <div class="desktop-custom-layout">
            <main class="desktop-custom-builder desktop-custom-brief-builder">
              ${projectBasicsHtml()}
              ${productDirectionHtml()}
              ${packagingHtml()}
            </main>

            <aside
              class="desktop-custom-summary-wrap"
              data-desktop-custom-summary
            >
              ${liveBriefHtml()}
            </aside>
          </div>
        </div>
      </div>
    `;
  }

  function render({
    preserveScroll=false
  }={}){
    if(!customRoot){
      return false;
    }

    const y=
      preserveScroll
        ? Number(root.scrollY||0)
        : null;

    customRoot.innerHTML=
      pageHtml();

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

  function renderLiveBrief(){
    const node=
      customRoot?.querySelector(
        '[data-desktop-custom-summary]'
      );

    if(!node){
      return false;
    }

    node.innerHTML=
      liveBriefHtml();

    return true;
  }

  function refreshSummary(){
    return renderLiveBrief();
  }

  function clearFieldError(field){
    if(!validation){
      return;
    }

    const errors=
      [...(
        validation.errors||
        []
      )];

    const filtered=
      errors.filter(code=>{
        if(field==='use'){
          return code!=='use';
        }

        if(field==='qty'){
          return ![
            'quantity',
            'quantity-min',
            'quantity-max'
          ].includes(code);
        }

        if(field==='scents'){
          return code!=='scents';
        }

        return true;
      });

    validation={
      ...validation,
      errors:filtered,
      valid:filtered.length===0
    };
  }

  function mutateDraft(
    field,
    value
  ){
    draft={
      ...draft,
      [field]:
        text(value)
    };

    added=false;
    clearFieldError(field);
  }

  function syncChoiceState(field){
    const value=text(draft[field]);

    customRoot
      ?.querySelectorAll(
        `[data-desktop-custom-pick="${field}"]`
      )
      .forEach(button=>{
        const active=
          text(
            button.dataset
              .desktopCustomValue
          )===value;

        button.classList
          .toggle(
            'is-active',
            active
          );

        button.setAttribute(
          'aria-pressed',
          active
            ? 'true'
            : 'false'
        );
      });
  }

  function syncScentState(){
    const selected=
      new Set(
        selectedScents()
          .map(scent=>text(scent?.id))
      );

    customRoot
      ?.querySelectorAll(
        '[data-desktop-custom-scent]'
      )
      .forEach(button=>{
        const active=
          selected.has(
            text(
              button.dataset
                .desktopCustomScent
            )
          );

        button.classList
          .toggle(
            'is-active',
            active
          );

        button.setAttribute(
          'aria-pressed',
          active
            ? 'true'
            : 'false'
        );
      });

    const field=
      customRoot?.querySelector(
        '[data-desktop-custom-validation="scents"]'
      );

    const hint=
      field?.querySelector(
        '.desktop-custom-field__head span'
      );

    if(hint){
      hint.textContent=
        text(content().scentsHint)
          .replace(
            '{count}',
            String(selected.size)
          );
    }
  }

  function renderFragrancePanel(){
    const current=
      customRoot?.querySelector(
        '[data-desktop-custom-fragrance]'
      );

    if(!current){
      return false;
    }

    const wrapper=
      root.document
        ?.createElement?.('div');

    if(!wrapper){
      return false;
    }

    wrapper.innerHTML=
      fragranceHtml();

    const next=
      wrapper.firstElementChild;

    if(!next){
      return false;
    }

    current.replaceWith(next);
    return true;
  }

  function syncFieldError(field){
    const wrap=
      customRoot?.querySelector(
        `[data-desktop-custom-validation="${field}"]`
      );

    if(!wrap){
      return;
    }

    const error=fieldError(field);
    const current=
      wrap.querySelector(
        `[data-desktop-custom-error="${field}"]`
      );

    wrap.classList.toggle(
      'is-invalid',
      Boolean(error)
    );

    if(field==='qty'){
      wrap.querySelector(
        '.desktop-custom-input-wrap'
      )?.classList.toggle(
        'is-invalid',
        Boolean(error)
      );
    }

    if(!error){
      current?.remove();
      return;
    }

    if(current){
      current.textContent=error;
      return;
    }

    const node=
      root.document
        ?.createElement?.('p');

    if(!node){
      return;
    }

    node.className=
      'desktop-custom-error';
    node.dataset
      .desktopCustomError=
      field;
    node.textContent=error;
    wrap.append(node);
  }

  function syncValidationUi(){
    for(const field of [
      'use',
      'qty',
      'scents'
    ]){
      syncFieldError(field);
    }
  }

  function focusFirstError(){
    if(
      !validation||
      validation.valid
    ){
      return;
    }

    const errors=
      validation.errors||
      [];

    let selector='';

    if(errors.includes('use')){
      selector=
        '[data-desktop-custom-section="basics"] [data-desktop-custom-pick="use"]';
    }else if(
      errors.some(
        code=>
          code==='quantity'||
          code==='quantity-min'||
          code==='quantity-max'
      )
    ){
      selector=
        '[data-desktop-custom-field="qty"]';
    }else if(
      errors.includes('scents')
    ){
      selector=
        '[data-desktop-custom-section="product"] [data-desktop-custom-scent]';
    }

    const target=
      selector
        ? customRoot?.querySelector(
            selector
          )
        : null;

    target?.scrollIntoView?.({
      behavior:'smooth',
      block:'center'
    });

    root.setTimeout?.(
      ()=>target?.focus?.(),
      260
    );
  }

  function submit(){
    const result=
      feature()
        ?.validateDraft?.(
          draft
        );

    validation=
      result||
      {
        valid:false,
        errors:[]
      };

    if(!validation.valid){
      added=false;
      syncValidationUi();
      renderLiveBrief();
      focusFirstError();
      return false;
    }

    const saved=
      config?.actions
        ?.addIntent?.(
          {
            ...draft
          }
        );

    if(!saved){
      return false;
    }

    added=true;
    validation=null;
    syncValidationUi();
    renderLiveBrief();

    config?.actions
      ?.syncInquiry?.();

    return true;
  }

  function onClick(event){
    const pick=
      event.target.closest?.(
        '[data-desktop-custom-pick]'
      );

    if(
      pick&&
      customRoot?.contains(pick)
    ){
      const field=
        pick.dataset
          .desktopCustomPick;

      mutateDraft(
        field,
        pick.dataset
          .desktopCustomValue
      );

      syncChoiceState(field);
      syncFieldError(field);
      renderLiveBrief();
      return;
    }

    const series=
      event.target.closest?.(
        '[data-desktop-custom-series]'
      );

    if(
      series&&
      customRoot?.contains(series)
    ){
      feature()
        ?.setSeries?.(
          series.dataset
            .desktopCustomSeries
        );

      added=false;
      clearFieldError('scents');
      renderFragrancePanel();
      syncFieldError('scents');
      renderLiveBrief();
      return;
    }

    const scent=
      event.target.closest?.(
        '[data-desktop-custom-scent]'
      );

    if(
      scent&&
      customRoot?.contains(scent)
    ){
      feature()
        ?.toggleScent?.(
          scent.dataset
            .desktopCustomScent
        );

      added=false;
      clearFieldError('scents');
      syncScentState();
      syncFieldError('scents');
      renderLiveBrief();
      return;
    }

    const action=
      event.target.closest?.(
        '[data-desktop-custom-action]'
      );

    if(
      !action||
      !customRoot?.contains(action)
    ){
      return;
    }

    const name=
      action.dataset
        .desktopCustomAction;

    if(name==='submit'){
      submit();
      return;
    }

    if(name==='explore'){
      config?.actions
        ?.explore?.();
      return;
    }

    if(name==='review'){
      config?.actions
        ?.review?.();
    }
  }

  function onInput(event){
    const field=
      event.target.closest?.(
        '[data-desktop-custom-field]'
      );

    if(
      !field||
      !customRoot?.contains(field)
    ){
      return;
    }

    const name=
      field.dataset
        .desktopCustomField;

    mutateDraft(
      name,
      field.value
    );

    syncFieldError(name);
    renderLiveBrief();
  }

  function onChange(event){
    const field=
      event.target.closest?.(
        '[data-desktop-custom-field]'
      );

    if(
      !field||
      !customRoot?.contains(field)
    ){
      return;
    }

    const name=
      field.dataset
        .desktopCustomField;

    mutateDraft(
      name,
      field.value
    );

    syncFieldError(name);
    renderLiveBrief();
  }

  function configure(options={}){
    config={
      content:
        typeof options.content==='function'
          ? options.content
          : ()=>({}),
      feature:
        options.feature&&
        typeof options.feature==='object'
          ? options.feature
          : null,
      seriesLabel:
        options.seriesLabel,
      scentDisplayText:
        options.scentDisplayText,
      actions:
        options.actions||
        {}
    };

    return snapshot();
  }

  function mount(rootElement){
    customRoot=
      rootElement||
      customRoot;

    if(!customRoot){
      return false;
    }

    if(!mounted){
      customRoot.addEventListener(
        'click',
        onClick
      );

      customRoot.addEventListener(
        'input',
        onInput
      );

      customRoot.addEventListener(
        'change',
        onChange
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
    renderLiveBrief();
    return true;
  }

  root.DreamlandDesktopCustom=
    Object.freeze({
      version:VERSION,
      presentation:PRESENTATION_VERSION,
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

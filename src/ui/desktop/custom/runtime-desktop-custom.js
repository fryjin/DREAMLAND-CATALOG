(function(root){
  'use strict';

  if(root.DreamlandDesktopCustom){
    return;
  }

  const VERSION='B7-00B.3C';

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
      <div class="desktop-custom-field ${error?'is-invalid':''}">
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
      <div class="desktop-custom-choice-grid ${className}">
        ${options(key)
          .map(option=>{
            const value=
              text(option.value);

            const active=
              text(draft[field])===
              value;

            return `
              <button
                class="desktop-custom-choice ${active?'is-active':''}"
                type="button"
                data-desktop-custom-pick="${escapeHtml(field)}"
                data-desktop-custom-value="${escapeHtml(value)}"
                aria-pressed="${active?'true':'false'}"
              >
                <strong>${escapeHtml(option.label)}</strong>
                ${
                  option.body
                    ? `<span>${escapeHtml(option.body)}</span>`
                    : ''
                }
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
        class="desktop-custom-section"
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

        <div class="desktop-custom-two">
          ${fieldHtml({
            label:c.quantity,
            hint:`${c.minimumQuantity} ${limits.minimumQuantity||1}`,
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
      ${fieldHtml({
        label:c.fragranceCollection,
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
          <div class="desktop-custom-scents">
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
    `;
  }

  function productDirectionHtml(){
    const c=content();

    return `
      <section
        class="desktop-custom-section"
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
            'desktop-custom-choice-grid--compact'
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
        class="desktop-custom-section"
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
            'desktop-custom-choice-grid--packaging'
          )
        })}

        ${fieldHtml({
          label:c.branding,
          body:cardChoices(
            'brandingOptions',
            'branding',
            'desktop-custom-choice-grid--branding'
          )
        })}

        ${fieldHtml({
          label:c.notes,
          hint:c.optional,
          body:`
            <textarea
              class="desktop-custom-textarea"
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
    value
  ){
    return `
      <div class="desktop-custom-summary__row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value||content().notSelected)}</strong>
      </div>
    `;
  }

  function summaryHtml(){
    const c=content();
    const scents=
      selectedScents();
    const scentNames=
      scents
        .map(scentLabel)
        .filter(Boolean);

    const summarySeries=
      scentNames.length
        ? seriesLabel(
            selectedSeries()
          )
        : c.notSelected;

    return `
      <div class="desktop-custom-summary">
        <div class="desktop-eyebrow">
          ${escapeHtml(c.summaryKicker)}
        </div>

        <h2>${escapeHtml(c.summaryTitle)}</h2>

        <div class="desktop-custom-summary__rows">
          ${summaryValue(
            c.useCase,
            optionLabel(
              'useCases',
              draft.use
            )
          )}

          ${summaryValue(
            c.quantity,
            draft.qty
              ? `${draft.qty} ${c.pieces}`
              : ''
          )}

          ${summaryValue(
            c.size,
            optionLabel(
              'sizes',
              draft.sizePref
            )
          )}

          ${summaryValue(
            c.fragranceCollection,
            summarySeries
          )}

          ${summaryValue(
            c.scents,
            scentNames.length
              ? c.scentCount
                  .replace(
                    '{count}',
                    String(scentNames.length)
                  )
              : ''
          )}

          ${summaryValue(
            c.packaging,
            optionLabel(
              'packages',
              draft.pack
            )
          )}

          ${summaryValue(
            c.branding,
            optionLabel(
              'brandingOptions',
              draft.branding
            )
          )}
        </div>

        <div class="desktop-custom-summary__quotation">
          <span>${escapeHtml(c.customization)}</span>
          <strong>${escapeHtml(c.quotedAfterReview)}</strong>
          <p>${escapeHtml(c.summaryNote)}</p>
        </div>

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
    `;
  }

  function pageHtml(){
    const c=content();

    return `
      <div class="desktop-custom-page">
        <div class="desktop-container">
          <header class="desktop-custom-hero">
            <div class="desktop-eyebrow">
              ${escapeHtml(c.kicker)}
            </div>

            <h1>${escapeHtml(c.title)}</h1>
            <p>${escapeHtml(c.body)}</p>
          </header>

          <div class="desktop-custom-layout">
            <div class="desktop-custom-builder">
              ${projectBasicsHtml()}
              ${productDirectionHtml()}
              ${packagingHtml()}
            </div>

            <aside
              class="desktop-custom-summary-wrap"
              data-desktop-custom-summary
            >
              ${summaryHtml()}
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

  function refreshSummary(){
    const node=
      customRoot?.querySelector(
        '[data-desktop-custom-summary]'
      );

    if(!node){
      return;
    }

    node.innerHTML=
      summaryHtml();
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
      render({
        preserveScroll:true
      });
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
    render({
      preserveScroll:true
    });

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

      render({
        preserveScroll:true
      });
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
      render({
        preserveScroll:true
      });
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
      render({
        preserveScroll:true
      });
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

    mutateDraft(
      field.dataset
        .desktopCustomField,
      field.value
    );

    refreshSummary();
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

    mutateDraft(
      field.dataset
        .desktopCustomField,
      field.value
    );

    render({
      preserveScroll:true
    });
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
    refreshSummary();
    return true;
  }

  root.DreamlandDesktopCustom=
    Object.freeze({
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

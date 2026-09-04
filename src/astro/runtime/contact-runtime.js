(function(root){
  'use strict';

  if(root.DreamlandContactRuntime){
    return;
  }

  const VERSION='R4.8B';

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function parseState(
    documentRef
  ){
    const node=
      documentRef
        ?.getElementById(
          'contactRuntimeState'
        );

    if(!node){
      throw new Error(
        'R4.8B Contact runtime state is missing.'
      );
    }

    const state=
      JSON.parse(
        node.textContent||
        '{}'
      );

    if(
      state.version!==
      VERSION
    ){
      throw new Error(
        'R4.8B Contact runtime state version mismatch.'
      );
    }

    return state;
  }

  function supportedLanguage(
    value,
    state
  ){
    const requested=
      text(
        value
      );

    return (
      state.languages
        .includes(
          requested
        )
        ? requested
        : state.defaultLanguage
    );
  }

  function readLanguage(
    state,
    storage
  ){
    let stored='';

    try{
      stored=
        storage
          ?.getItem(
            state.storage
              .languageKey
          )||
        '';
    }catch(_){
      stored='';
    }

    return supportedLanguage(
      stored,
      state
    );
  }

  function writeLanguage(
    language,
    state,
    storage
  ){
    try{
      storage
        ?.setItem(
          state.storage
            .languageKey,
          language
        );
    }catch(_){
    }
  }

  function localeFor(
    language,
    state
  ){
    return (
      state.locales
        ?.[language]||
      state.locales
        ?.[state.defaultLanguage]||
      {}
    );
  }

  function pathValue(
    source,
    pathValueText
  ){
    return text(
      pathValueText
    )
      .split('.')
      .filter(Boolean)
      .reduce(
        (
          value,
          key
        )=>
          value
            ?.[key],
        source
      );
  }

  function money(
    value,
    language,
    state,
    pricing
  ){
    return pricing.money(
      Number(value)||
      0,
      language,
      state.currencyMap
    );
  }

  function configureInquiry(
    inquiry,
    pricing,
    state,
    storage
  ){
    return inquiry.configure({
      storage,
      storageKey:
        state.storage
          .inquiryKey,
      version:
        state.storage
          .inquiryVersion,
      normalizeQuantity:
        (
          value,
          min
        )=>
          pricing.normalizeQuantity(
            value,
            min
          ),
      pricingSeriesFor:
        item=>
          pricing.pricingSeriesFor(
            item,
            state.seriesMeta
          ),
      tierUnitCny:
        (
          series,
          size,
          quantity
        )=>
          pricing.tierUnitCny(
            series,
            size,
            quantity,
            state.seriesMeta
          ),
      packSurchargeCny:
        (
          series,
          pack
        )=>
          pricing.packSurchargeCny(
            series,
            pack,
            state.seriesMeta
          ),
      convertCnyToBase:
        value=>
          pricing.cnyToBase(
            value,
            state.currencyMap
          )
    });
  }

  function configureContact(
    contact,
    state,
    storage
  ){
    return contact.configure({
      storage,
      storageKey:
        state.storage
          .contactKey,
      ttlMs:
        state.storage
          .contactTtlMs,
      fieldIds:
        state.storage
          .contactFieldIds
    });
  }

  function inquiryView(
    inquiry
  ){
    return inquiry
      .buildViewModel();
  }

  function guardSatisfied(
    inquiry
  ){
    const view=
      inquiryView(
        inquiry
      );

    return Boolean(
      !view.empty&&
      Number(
        view.summary
          ?.itemCount||
        0
      )>0
    );
  }

  function renderGlobalBindings(
    documentRef,
    locale
  ){
    const source={
      navigation:
        locale.content
          ?.navigation||
        {},
      footer:
        locale.content
          ?.footer||
        {}
    };

    for(const node of documentRef.querySelectorAll(
      '[data-home-bind]'
    )){
      const value=
        pathValue(
          source,
          node.dataset
            .homeBind
        );

      if(
        value!==undefined&&
        value!==null
      ){
        node.textContent=
          String(
            value
          );
      }
    }
  }

  function renderContactBindings(
    documentRef,
    locale
  ){
    const copy=
      locale.copy||
      {};

    for(const node of documentRef.querySelectorAll(
      '[data-contact-bind]'
    )){
      const key=
        node.dataset
          .contactBind;

      if(
        Object.prototype
          .hasOwnProperty
          .call(
            copy,
            key
          )
      ){
        node.textContent=
          String(
            copy[key]??
            ''
          );
      }
    }

    for(const node of documentRef.querySelectorAll(
      '[data-contact-placeholder]'
    )){
      const key=
        node.dataset
          .contactPlaceholder;

      if(
        Object.prototype
          .hasOwnProperty
          .call(
            copy,
            key
          )
      ){
        node.placeholder=
          String(
            copy[key]??
            ''
          );
      }
    }

    const next=
      documentRef.querySelector(
        '[data-contact-next-steps]'
      );

    if(next){
      next.replaceChildren(
        ...(
          copy.whatNextSteps||
          []
        ).map(
          (
            step,
            index
          )=>{
            const item=
              documentRef.createElement(
                'li'
              );

            const count=
              documentRef.createElement(
                'b'
              );

            count.textContent=
              String(
                index+1
              ).padStart(
                2,
                '0'
              );

            const label=
              documentRef.createElement(
                'span'
              );

            label.textContent=
              text(
                step
              );

            item.append(
              count,
              label
            );

            return item;
          }
        )
      );
    }
  }

  function rebuildSelect(
    documentRef,
    selector,
    rows,
    placeholder,
    value,
    {
      valueKey,
      label
    }
  ){
    const select=
      documentRef.querySelector(
        selector
      );

    if(!select){
      return;
    }

    const current=
      text(
        value
      );

    const option=
      documentRef.createElement(
        'option'
      );

    option.value='';
    option.textContent=
      text(
        placeholder
      );

    const options=[
      option
    ];

    for(const row of rows||[]){
      const item=
        documentRef.createElement(
          'option'
        );

      item.value=
        text(
          row
            ?.[valueKey]
        );

      item.textContent=
        label(
          row
        );

      options.push(
        item
      );
    }

    if(
      current&&
      !(
        rows||
        []
      ).some(
        row=>
          text(
            row
              ?.[valueKey]
          )===
          current
      )
    ){
      const fallback=
        documentRef.createElement(
          'option'
        );

      fallback.value=
        current;

      fallback.textContent=
        current;

      options.push(
        fallback
      );
    }

    select.replaceChildren(
      ...options
    );

    select.value=
      current;
  }

  function renderSelects(
    documentRef,
    locale,
    contact
  ){
    const copy=
      locale.copy||
      {};

    rebuildSelect(
      documentRef,
      '[data-contact-country-select]',
      copy.countryRegions||
      [],
      copy.countryPlaceholder||
      copy.country||
      '',
      contact.country,
      {
        valueKey:'code',
        label:
          row=>{
            const code=
              text(
                row?.code
              );

            const label=
              text(
                row?.label
              );

            return label+
              (
                code
                  ? ' ('+code+')'
                  : ''
              );
          }
      }
    );

    rebuildSelect(
      documentRef,
      '[data-contact-buyer-select]',
      copy.buyerTypes||
      [],
      copy.selectBuyerType||
      copy.buyerType||
      '',
      contact.buyerType,
      {
        valueKey:'value',
        label:
          row=>
            text(
              row?.label||
              row?.value
            )
      }
    );
  }

  function renderFieldValues(
    documentRef,
    contact
  ){
    for(const node of documentRef.querySelectorAll(
      '[data-contact-field]'
    )){
      const key=
        node.dataset
          .contactField;

      node.value=
        String(
          contact
            ?.[key]||
          ''
        );
    }
  }

  function clearValidation(
    documentRef,
    field=''
  ){
    const fields=
      field
        ? [
            field
          ]
        : [
            ...documentRef.querySelectorAll(
              '[data-contact-field-error]'
            )
          ].map(
            node=>
              node.dataset
                .contactFieldError
          );

    for(const key of fields){
      const error=
        documentRef.querySelector(
          '[data-contact-field-error="'+
          key+
          '"]'
        );

      const shell=
        documentRef.querySelector(
          '[data-contact-field-shell="'+
          key+
          '"]'
        );

      if(error){
        error.textContent='';
        error.hidden=true;
      }

      shell
        ?.classList
        .remove(
          'is-invalid'
        );
    }

    if(!field){
      const global=
        documentRef.querySelector(
          '[data-contact-global-error]'
        );

      if(global){
        global.textContent='';
        global.hidden=true;
      }
    }
  }

  function renderValidation(
    documentRef,
    result,
    locale
  ){
    clearValidation(
      documentRef
    );

    const copy=
      locale.copy||
      {};

    for(const errorRow of result.errors||[]){
      const key=
        text(
          errorRow?.field
        );

      const code=
        text(
          errorRow?.code
        );

      const node=
        documentRef.querySelector(
          '[data-contact-field-error="'+
          key+
          '"]'
        );

      const shell=
        documentRef.querySelector(
          '[data-contact-field-shell="'+
          key+
          '"]'
        );

      if(node){
        node.textContent=
          text(
            copy.validation
              ?.[code]||
            copy.validation
              ?.generic||
            code
          );

        node.hidden=false;
      }

      shell
        ?.classList
        .add(
          'is-invalid'
        );
    }

    const first=
      result.errors
        ?.[0]
        ?.field;

    if(first){
      const target=
        documentRef.querySelector(
          '[data-contact-field="'+
          first+
          '"]'
        );

      target
        ?.scrollIntoView?.({
          behavior:'smooth',
          block:'center'
        });

      root.setTimeout(
        ()=>
          target
            ?.focus?.(),
        180
      );
    }
  }

  function setInteractive(
    documentRef,
    enabled
  ){
    for(const node of documentRef.querySelectorAll(
      '[data-contact-field]'
    )){
      node.disabled=
        !enabled;
    }

    const next=
      documentRef.querySelector(
        '[data-contact-continue]'
      );

    if(next){
      next.disabled=
        !enabled;
    }

    const select=
      documentRef.querySelector(
        '[data-home-language-select]'
      );

    if(select){
      select.disabled=
        !enabled;

      select.dataset
        .siteLanguageEnabled=
        enabled
          ? 'true'
          : 'false';
    }
  }

  function renderSummary(
    documentRef,
    inquiry,
    language,
    locale,
    state,
    pricing
  ){
    const view=
      inquiryView(
        inquiry
      );

    const summary=
      view.summary||
      {};

    const values={
      items:
        Number(
          summary.itemCount
        )||
        0,
      quantity:
        (
          Number(
            summary.productQuantity
          )||
          0
        )+
        ' '+
        text(
          locale.ui
            ?.pieces||
          'pcs'
        ),
      estimate:
        money(
          summary.estimatedTotal,
          language,
          state,
          pricing
        )
    };

    for(const [
      key,
      value
    ] of Object.entries(values)){
      const node=
        documentRef.querySelector(
          '[data-contact-summary-value="'+
          key+
          '"]'
        );

      if(node){
        node.textContent=
          String(
            value
          );
      }
    }

    const badge=
      documentRef.querySelector(
        '[data-home-inquiry-count]'
      );

    if(badge){
      const count=
        (
          Number(
            summary.productQuantity
          )||
          0
        )+
        (
          Number(
            summary.customCount
          )||
          0
        );

      badge.textContent=
        String(
          count
        );

      badge.setAttribute(
        'aria-label',
        count+
        ' inquiry items'
      );
    }
  }

  function renderLanguage(
    documentRef,
    language,
    locale,
    contactValue
  ){
    documentRef
      .documentElement
      .setAttribute(
        'lang',
        language==='zh'
          ? 'zh-CN'
          : language
      );

    const select=
      documentRef.querySelector(
        '[data-home-language-select]'
      );

    if(select){
      select.value=
        language;
    }

    renderGlobalBindings(
      documentRef,
      locale
    );

    renderContactBindings(
      documentRef,
      locale
    );

    renderSelects(
      documentRef,
      locale,
      contactValue
    );

    documentRef.title=
      text(
        locale.copy
          ?.contactTitle
      )+
      ' — DREAMLAND';
  }

  function createController({
    documentRef,
    state,
    pricing,
    inquiry,
    contact,
    storage
  }){
    let language=
      readLanguage(
        state,
        storage
      );

    let currentContact=
      {};

    function locale(){
      return localeFor(
        language,
        state
      );
    }

    function redirectWithoutInquiry(){
      setInteractive(
        documentRef,
        false
      );

      root.location
        ?.replace?.(
          state.routes
            .inquiry
        );
    }

    function enforceGuard(){
      configureInquiry(
        inquiry,
        pricing,
        state,
        storage
      );

      if(
        !guardSatisfied(
          inquiry
        )
      ){
        redirectWithoutInquiry();
        return false;
      }

      return true;
    }

    function loadContact(){
      currentContact={
        ...contact
          .loadDraft()
      };

      return currentContact;
    }

    function refresh({
      reloadContact=true
    }={}){
      if(
        !enforceGuard()
      ){
        return false;
      }

      if(reloadContact){
        loadContact();
      }else{
        currentContact={
          ...contact
            .snapshot()
        };
      }

      renderLanguage(
        documentRef,
        language,
        locale(),
        currentContact
      );

      renderFieldValues(
        documentRef,
        currentContact
      );

      renderSummary(
        documentRef,
        inquiry,
        language,
        locale(),
        state,
        pricing
      );

      setInteractive(
        documentRef,
        true
      );

      clearValidation(
        documentRef
      );

      return true;
    }

    function setLanguage(
      value
    ){
      language=
        supportedLanguage(
          value,
          state
        );

      writeLanguage(
        language,
        state,
        storage
      );

      renderLanguage(
        documentRef,
        language,
        locale(),
        currentContact
      );

      renderSummary(
        documentRef,
        inquiry,
        language,
        locale(),
        state,
        pricing
      );

      clearValidation(
        documentRef
      );
    }

    function mutate(
      field,
      value
    ){
      const key=
        text(
          field
        );

      if(
        !state.storage
          .contactFieldIds
          .includes(
            key
          )
      ){
        return;
      }

      currentContact={
        ...currentContact,
        [key]:
          text(
            value
          )
      };

      contact.patch({
        [key]:
          currentContact[key]
      });

      contact.scheduleDraft(
        undefined,
        250
      );

      clearValidation(
        documentRef,
        key
      );
    }

    function continueToReview(){
      contact.replace(
        currentContact
      );

      const result=
        contact.validate(
          contact.get()
        );

      if(!result.valid){
        renderValidation(
          documentRef,
          result,
          locale()
        );
        return false;
      }

      currentContact={
        ...result.contact
      };

      contact.flushDraft(
        currentContact
      );

      root.location
        ?.assign?.(
          state.routes
            .review
        );

      return true;
    }

    function flush(){
      contact.flushDraft(
        currentContact
      );
    }

    function onInput(
      event
    ){
      const target=
        event.target
          ?.closest?.(
            '[data-contact-field]'
          );

      if(
        !target||
        !documentRef
          .contains(
            target
          )
      ){
        return;
      }

      mutate(
        target.dataset
          .contactField,
        target.value
      );
    }

    function onChange(
      event
    ){
      const languageSelect=
        event.target
          ?.closest?.(
            '[data-home-language-select]'
          );

      if(languageSelect){
        setLanguage(
          languageSelect.value
        );
        return;
      }

      const target=
        event.target
          ?.closest?.(
            '[data-contact-field]'
          );

      if(
        !target||
        !documentRef
          .contains(
            target
          )
      ){
        return;
      }

      mutate(
        target.dataset
          .contactField,
        target.value
      );
    }

    function onClick(
      event
    ){
      const next=
        event.target
          ?.closest?.(
            '[data-contact-continue]'
          );

      if(next){
        event.preventDefault();
        continueToReview();
        return;
      }

      const back=
        event.target
          ?.closest?.(
            '[data-contact-back]'
          );

      if(back){
        flush();
      }
    }

    function onStorage(
      event
    ){
      if(
        event.key===
        state.storage
          .languageKey
      ){
        language=
          readLanguage(
            state,
            storage
          );

        renderLanguage(
          documentRef,
          language,
          locale(),
          currentContact
        );

        renderSummary(
          documentRef,
          inquiry,
          language,
          locale(),
          state,
          pricing
        );

        return;
      }

      if(
        event.key===
        state.storage
          .inquiryKey
      ){
        refresh({
          reloadContact:false
        });
        return;
      }

      if(
        event.key===
        state.storage
          .contactKey
      ){
        refresh({
          reloadContact:true
        });
      }
    }

    function onPageShow(){
      language=
        readLanguage(
          state,
          storage
        );

      refresh({
        reloadContact:true
      });
    }

    function onVisibility(){
      if(
        documentRef
          .visibilityState===
        'hidden'
      ){
        flush();
        return;
      }

      onPageShow();
    }

    function mount(){
      setInteractive(
        documentRef,
        false
      );

      configureContact(
        contact,
        state,
        storage
      );

      if(
        !refresh({
          reloadContact:true
        })
      ){
        return false;
      }

      documentRef.addEventListener(
        'input',
        onInput
      );

      documentRef.addEventListener(
        'change',
        onChange
      );

      documentRef.addEventListener(
        'click',
        onClick
      );

      root.addEventListener(
        'storage',
        onStorage
      );

      root.addEventListener(
        'pageshow',
        onPageShow
      );

      root.addEventListener(
        'pagehide',
        flush
      );

      documentRef.addEventListener(
        'visibilitychange',
        onVisibility
      );

      return true;
    }

    return Object.freeze({
      mount,
      refresh,
      flush,
      setLanguage,
      continueToReview
    });
  }

  function boot(){
    const documentRef=
      root.document;

    if(!documentRef){
      return false;
    }

    const state=
      parseState(
        documentRef
      );

    const pricing=
      root
        .DreamlandPricingPolicy;

    const inquiry=
      root
        .DreamlandInquiry;

    const contact=
      root
        .DreamlandContact;

    if(
      !pricing||
      !inquiry||
      !contact
    ){
      throw new Error(
        'R4.8B Contact requires PricingPolicy + Inquiry + Contact canonical owners.'
      );
    }

    const controller=
      createController({
        documentRef,
        state,
        pricing,
        inquiry,
        contact,
        storage:
          root.localStorage
      });

    root.DreamlandContactRuntimeController=
      controller;

    return controller
      .mount();
  }

  root.DreamlandContactRuntime=
    Object.freeze({
      version:
        VERSION,
      boot
    });

  if(
    root.document
      ?.readyState===
    'loading'
  ){
    root.document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once:true
      }
    );
  }else{
    boot();
  }
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

(function(root){
  'use strict';

  if(root.DreamlandReviewRuntime){
    return;
  }

  const VERSION='R4.9B';

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function number(value,fallback=0){
    const parsed=
      Number(value);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : fallback;
  }

  function parseState(documentRef){
    const node=
      documentRef
        ?.getElementById(
          'reviewRuntimeState'
        );

    if(!node){
      throw new Error(
        'R4.9B Review runtime state is missing.'
      );
    }

    const state=
      JSON.parse(
        node.textContent||
        '{}'
      );

    if(
      state.version!==
        VERSION||
      state.storage
        ?.languageKey!==
        'productManualLang'||
      state.storage
        ?.inquiryKey!==
        'productManualV2State'||
      state.storage
        ?.inquiryVersion!==
        2||
      state.storage
        ?.contactKey!==
        'dreamlandContactDraftV1'||
      state.storage
        ?.contactTtlMs!==
        86400000||
      state.storage
        ?.pendingInquiryKey!==
        'dreamlandPendingInquiryIdV1'||
      state.guard!==
        'hasValidContact'
    ){
      throw new Error(
        'R4.9B Review runtime-state contract mismatch.'
      );
    }

    return state;
  }

  function supportedLanguage(value,state){
    const requested=
      text(value);

    return state.languages
      .includes(
        requested
      )
      ? requested
      : state.defaultLanguage;
  }

  function localeFor(language,state){
    return (
      state.locales
        ?.[language]||
      state.locales
        ?.[state.defaultLanguage]||
      {}
    );
  }

  function readLanguage(state,storage){
    let value='';

    try{
      value=
        storage
          ?.getItem(
            state.storage
              .languageKey
          )||
        '';
    }catch(_){
      value='';
    }

    return supportedLanguage(
      value,
      state
    );
  }

  function writeLanguage(language,state,storage){
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

  function productMap(state){
    return new Map(
      (
        state.products||
        []
      ).map(
        product=>[
          text(
            product.id
          )
            .toUpperCase(),
          product
        ]
      )
    );
  }

  function scentMap(state){
    return new Map(
      (
        state.scents||
        []
      ).map(
        scent=>[
          text(
            scent.id
          ),
          scent
        ]
      )
    );
  }

  function productName(item,language,products){
    const id=
      text(
        item?.productId||
        item?.id
      )
        .toUpperCase();

    const product=
      products.get(
        id
      );

    return (
      product?.names
        ?.[language]||
      product?.names
        ?.en||
      product?.names
        ?.zh||
      item?.name||
      item?.productId||
      id
    );
  }

  function seriesLabel(series,language,state){
    return (
      state.seriesMeta
        ?.[series]
        ?.labels
        ?.[language]||
      state.seriesMeta
        ?.[series]
        ?.labels
        ?.en||
      state.seriesMeta
        ?.[series]
        ?.labels
        ?.zh||
      text(series)
    );
  }

  function choiceLabel(value,locale){
    const raw=
      text(value);

    return (
      locale.choices
        ?.[raw]||
      raw
    );
  }

  function scentLabel(item,language,scents){
    const ids=
      Array.isArray(
        item?.scentIds
      )
        ? item.scentIds
        : (
            item?.scentId
              ? [
                  item.scentId
                ]
              : []
          );

    const labels=
      ids.map(
        id=>{
          const scent=
            scents.get(
              text(id)
            );

          return (
            scent?.name
              ?.[language]||
            scent?.name
              ?.en||
            scent?.name
              ?.zh||
            ''
          );
        }
      )
        .map(text)
        .filter(Boolean);

    if(labels.length){
      return labels.join(
        ' / '
      );
    }

    if(
      Array.isArray(
        item?.scents
      )
    ){
      const rows=
        item.scents
          .map(
            value=>
              text(
                value?.label||
                value?.name||
                value
              )
          )
          .filter(Boolean);

      if(rows.length){
        return rows.join(
          ' / '
        );
      }
    }

    return text(
      item?.scent
    );
  }

  function money(value,language,state,pricing){
    return pricing.money(
      number(
        value,
        0
      ),
      language,
      state.currencyMap||
      {}
    );
  }

  function itemMoq(item,state,pricing){
    return pricing
      .moqForSeriesSize(
        item?.series,
        item?.size,
        state.seriesMeta||
        {}
      );
  }

  function defaultPack(series,state){
    return text(
      state.seriesMeta
        ?.[series]
        ?.packaging
        ?.default
    );
  }

  function configureContact(contact,state,storage){
    contact.configure({
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

    return contact
      .loadDraft();
  }

  function configureInquiry(
    inquiry,
    pricing,
    state,
    storage,
    language,
    locale,
    products,
    scents
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
          pricing
            .normalizeQuantity(
              value,
              min,
              state.limits
                ?.maxQuantity||
              1000000
            ),
      pricingSeriesFor:
        item=>
          pricing
            .pricingSeriesFor(
              item,
              state.seriesMeta||
              {}
            ),
      tierUnitCny:
        (
          series,
          size,
          quantity
        )=>
          pricing
            .tierUnitCny(
              series,
              size,
              quantity,
              state.seriesMeta||
              {}
            ),
      packSurchargeCny:
        (
          series,
          pack
        )=>
          pricing
            .packSurchargeCny(
              series,
              pack,
              state.seriesMeta||
              {}
            ),
      convertCnyToBase:
        value=>
          pricing
            .cnyToBase(
              value,
              state.currencyMap||
              {}
            ),
      projectionText:
        key=>
          (
            locale.copy
              ?.[key]||
            locale.ui
              ?.[key]||
            key
          ),
      projectionProductDisplayName:
        item=>
          productName(
            item,
            language,
            products
          ),
      projectionSeriesLabel:
        series=>
          seriesLabel(
            series,
            language,
            state
          ),
      projectionChoiceLabel:
        value=>
          choiceLabel(
            value,
            locale
          ),
      projectionQtyUnit:
        ()=>
          (
            locale.ui
              ?.pieces||
            (
              language==='zh'
                ? '件'
                : language==='ko'
                  ? '개'
                  : 'pcs'
            )
          ),
      projectionItemMoq:
        item=>
          itemMoq(
            item,
            state,
            pricing
          ),
      projectionItemScentLabel:
        item=>
          scentLabel(
            item,
            language,
            scents
          ),
      projectionDefaultPack:
        series=>
          defaultPack(
            series,
            state
          ),
      projectionMoney:
        value=>
          money(
            value,
            language,
            state,
            pricing
          )
    });
  }

  function guardResult(pageGuards,inquiry,contact){
    return pageGuards.evaluate(
      'review',
      {
        inquiry,
        contact
      }
    );
  }

  function generateInquiryId(){
    const now=
      new Date();

    const date=[
      now.getFullYear(),
      String(
        now.getMonth()+1
      ).padStart(
        2,
        '0'
      ),
      String(
        now.getDate()
      ).padStart(
        2,
        '0'
      )
    ].join('');

    const bytes=
      new Uint8Array(
        4
      );

    if(
      root.crypto
        ?.getRandomValues
    ){
      root.crypto
        .getRandomValues(
          bytes
        );
    }else{
      bytes.forEach(
        (
          _,
          index
        )=>{
          bytes[index]=
            Math.floor(
              Math.random()*256
            );
        }
      );
    }

    const code=[
      ...bytes
    ].map(
      value=>
        value
          .toString(
            36
          )
          .padStart(
            2,
            '0'
          )
    )
      .join('')
      .slice(
        0,
        6
      )
      .toUpperCase();

    return (
      'DL-'+
      date+
      '-'+
      code
    );
  }

  function ensureInquiryId(state,storage){
    const key=
      state.storage
        .pendingInquiryKey;

    let value='';

    try{
      value=
        text(
          storage
            ?.getItem(
              key
            )
        );
    }catch(_){
      value='';
    }

    if(value){
      return value;
    }

    value=
      generateInquiryId();

    try{
      storage
        ?.setItem(
          key,
          value
        );
    }catch(_){
    }

    return value;
  }

  function clearPendingInquiryId(state,storage){
    try{
      storage
        ?.removeItem(
          state.storage
            .pendingInquiryKey
        );
    }catch(_){
    }
  }

  function renderHomeBindings(documentRef,locale){
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
      const path=
        text(
          node.dataset
            .homeBind
        )
          .split('.')
          .filter(Boolean);

      const value=
        path.reduce(
          (
            current,
            key
          )=>
            current
              ?.[key],
          source
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

  function renderReviewBindings(documentRef,locale){
    const copy=
      locale.copy||
      {};

    for(const node of documentRef.querySelectorAll(
      '[data-review-bind]'
    )){
      const key=
        node.dataset
          .reviewBind;

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
  }

  function countryDisplay(value,copy){
    const raw=
      text(value);

    const code=
      raw.toUpperCase();

    const row=
      (
        copy.countryRegions||
        []
      ).find(
        item=>
          text(
            item?.code
          )
            .toUpperCase()===
          code
      );

    return row
      ? (
          text(
            row.label
          )+
          (
            text(
              row.code
            )
              ? ' ('+
                text(
                  row.code
                )+
                ')'
              : ''
          )
        )
      : raw;
  }

  function buyerTypeDisplay(value,copy){
    const raw=
      text(value);

    const row=
      (
        copy.buyerTypes||
        []
      ).find(
        item=>
          text(
            item?.value
          )===
          raw
      );

    return text(
      row?.label||
      raw
    );
  }

  function renderContact(documentRef,projection,locale){
    const copy=
      locale.copy||
      {};

    const contact=
      projection.contact||
      {};

    const labels={
      name:
        copy.name,
      company:
        copy.company,
      buyerType:
        copy.buyerType,
      country:
        copy.country,
      city:
        copy.city,
      email:
        copy.email,
      phone:
        copy.phone,
      message:
        copy.message
    };

    const values={
      ...contact,
      buyerType:
        buyerTypeDisplay(
          contact.buyerType,
          copy
        ),
      country:
        countryDisplay(
          contact.country,
          copy
        )
    };

    for(const [
      key,
      label
    ] of Object.entries(labels)){
      const node=
        documentRef.querySelector(
          '[data-review-contact-label="'+
          key+
          '"]'
        );

      if(node){
        node.textContent=
          text(
            label
          );
      }
    }

    for(const key of Object.keys(labels)){
      const node=
        documentRef.querySelector(
          '[data-review-contact-value="'+
          key+
          '"]'
        );

      if(node){
        node.textContent=
          text(
            values[key]
          )||
          text(
            copy.notProvided
          )||
          '—';
      }
    }
  }

  function createElement(documentRef,tag,className=''){
    const node=
      documentRef
        .createElement(
          tag
        );

    if(className){
      node.className=
        className;
    }

    return node;
  }

  function appendText(
    documentRef,
    parent,
    tag,
    className,
    value
  ){
    const node=
      createElement(
        documentRef,
        tag,
        className
      );

    node.textContent=
      text(
        value
      );

    parent.appendChild(
      node
    );

    return node;
  }

  function productCard(documentRef,item){
    const article=
      createElement(
        documentRef,
        'article',
        'review-runtime-item review-runtime-item--product'
      );

    const rawCover=
      text(
        item?.snapshotItem
          ?.cover
      );

    const cover=
      rawCover.startsWith(
        './'
      )
        ? '/'+
          rawCover.slice(
            2
          )
        : rawCover;

    const media=
      createElement(
        documentRef,
        'div',
        'review-runtime-item__media'
      );

    if(cover){
      const image=
        createElement(
          documentRef,
          'img'
        );

      image.src=cover;
      image.alt=
        text(
          item.previewKey
        );
      image.loading='lazy';
      image.decoding='async';

      media.appendChild(
        image
      );
    }else{
      appendText(
        documentRef,
        media,
        'span',
        '',
        'D'
      );
    }

    const body=
      createElement(
        documentRef,
        'div',
        'review-runtime-item__body'
      );

    appendText(
      documentRef,
      body,
      'h3',
      '',
      item.previewKey
    );

    appendText(
      documentRef,
      body,
      'p',
      '',
      item.previewValue
    );

    appendText(
      documentRef,
      article,
      'strong',
      'review-runtime-item__amount',
      item.subtotalDisplay
    );

    article.prepend(
      media,
      body
    );

    return article;
  }

  function customCard(documentRef,item,index,locale){
    const article=
      createElement(
        documentRef,
        'article',
        'review-runtime-item review-runtime-item--custom'
      );

    appendText(
      documentRef,
      article,
      'span',
      'review-runtime-item__mark',
      'CUSTOM / '+
      String(
        index+1
      ).padStart(
        2,
        '0'
      )
    );

    const body=
      createElement(
        documentRef,
        'div',
        'review-runtime-item__body'
      );

    appendText(
      documentRef,
      body,
      'h3',
      '',
      item.previewKey
    );

    appendText(
      documentRef,
      body,
      'p',
      '',
      item.previewValue
    );

    article.appendChild(
      body
    );

    appendText(
      documentRef,
      article,
      'strong',
      'review-runtime-item__amount',
      locale.copy
        ?.customQuotedSeparately||
      ''
    );

    return article;
  }

  function renderProjection(
    documentRef,
    projection,
    viewModel,
    locale
  ){
    renderContact(
      documentRef,
      projection,
      locale
    );

    const products=
      documentRef.querySelector(
        '[data-review-products-list]'
      );

    if(products){
      if(
        projection.products
          ?.length
      ){
        products.replaceChildren(
          ...projection.products.map(
            item=>
              productCard(
                documentRef,
                item
              )
          )
        );
      }else{
        const empty=
          createElement(
            documentRef,
            'p',
            'review-empty'
          );

        empty.textContent=
          locale.copy
            ?.none||
          'None';

        products.replaceChildren(
          empty
        );
      }
    }

    const customSection=
      documentRef.querySelector(
        '[data-review-custom-section]'
      );

    const customs=
      documentRef.querySelector(
        '[data-review-customs-list]'
      );

    const hasCustom=
      Boolean(
        projection.customs
          ?.length
      );

    if(customSection){
      customSection.hidden=
        !hasCustom;
    }

    if(customs){
      customs.replaceChildren(
        ...(
          projection.customs||
          []
        ).map(
          (
            item,
            index
          )=>
            customCard(
              documentRef,
              item,
              index,
              locale
            )
        )
      );
    }

    const noticeIndex=
      documentRef.querySelector(
        '[data-review-notice-index]'
      );

    if(noticeIndex){
      noticeIndex.textContent=
        hasCustom
          ? '04'
          : '03';
    }

    const customSummary=
      documentRef.querySelector(
        '[data-review-custom-summary]'
      );

    if(customSummary){
      customSummary.hidden=
        !hasCustom;
    }

    const inquiryId=
      documentRef.querySelector(
        '[data-review-inquiry-id]'
      );

    if(inquiryId){
      inquiryId.textContent=
        projection.inquiryId||
        '—';
    }

    const estimate=
      documentRef.querySelector(
        '[data-review-estimate]'
      );

    if(estimate){
      estimate.textContent=
        projection.estimatedTotalDisplay||
        '—';
    }

    const badge=
      documentRef.querySelector(
        '[data-home-inquiry-count]'
      );

    if(badge){
      const count=
        (
          number(
            viewModel.summary
              ?.productQuantity,
            0
          )+
          number(
            viewModel.summary
              ?.customCount,
            0
          )
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

  function setLanguagePresentation(
    documentRef,
    language,
    locale
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
      select.disabled=false;
      select.dataset
        .siteLanguageEnabled=
        'true';
    }

    renderHomeBindings(
      documentRef,
      locale
    );

    renderReviewBindings(
      documentRef,
      locale
    );

    documentRef.title=
      (
        text(
          locale.copy
            ?.reviewTitle
        )||
        'Review Inquiry'
      )+
      ' — DREAMLAND';
  }

  function createController({
    documentRef,
    state,
    pricing,
    inquiry,
    contact,
    pageGuards,
    storage
  }){
    const products=
      productMap(
        state
      );

    const scents=
      scentMap(
        state
      );

    let language=
      readLanguage(
        state,
        storage
      );

    function locale(){
      return localeFor(
        language,
        state
      );
    }

    function redirect(guard){
      const target=
        text(
          guard?.target
        )||
        state.routes
          .inquiry;

      if(
        guard?.code===
        'INQUIRY_REQUIRED'
      ){
        clearPendingInquiryId(
          state,
          storage
        );
      }

      root.location
        ?.replace?.(
          target
        );
    }

    function hydrateAndGuard(){
      configureContact(
        contact,
        state,
        storage
      );

      configureInquiry(
        inquiry,
        pricing,
        state,
        storage,
        language,
        locale(),
        products,
        scents
      );

      const guard=
        guardResult(
          pageGuards,
          inquiry,
          contact
        );

      if(!guard.allowed){
        redirect(
          guard
        );
        return null;
      }

      return guard;
    }

    function projection(){
      const inquiryId=
        ensureInquiryId(
          state,
          storage
        );

      return inquiry
        .buildProjection({
          contact:
            contact.snapshot(),
          inquiryId,
          language,
          privacyVersion:
            state.privacyVersion||
            ''
        });
    }

    function render(){
      if(
        !hydrateAndGuard()
      ){
        return false;
      }

      const currentLocale=
        locale();

      setLanguagePresentation(
        documentRef,
        language,
        currentLocale
      );

      const result=
        projection();

      const viewModel=
        inquiry
          .buildViewModel();

      renderProjection(
        documentRef,
        result,
        viewModel,
        currentLocale
      );

      return true;
    }

    function setLanguage(value){
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

      return render();
    }

    function onChange(event){
      const select=
        event.target
          ?.closest?.(
            '[data-home-language-select]'
          );

      if(select){
        setLanguage(
          select.value
        );
      }
    }

    function onStorage(event){
      if(
        [
          state.storage
            .languageKey,
          state.storage
            .inquiryKey,
          state.storage
            .contactKey,
          state.storage
            .pendingInquiryKey
        ].includes(
          event.key
        )
      ){
        language=
          readLanguage(
            state,
            storage
          );

        render();
      }
    }

    function onPageShow(){
      language=
        readLanguage(
          state,
          storage
        );

      render();
    }

    function mount(){
      const select=
        documentRef.querySelector(
          '[data-home-language-select]'
        );

      if(select){
        select.disabled=true;
      }

      if(!render()){
        return false;
      }

      documentRef.addEventListener(
        'change',
        onChange
      );

      root.addEventListener(
        'storage',
        onStorage
      );

      root.addEventListener(
        'pageshow',
        onPageShow
      );

      documentRef.addEventListener(
        'visibilitychange',
        ()=>{
          if(
            documentRef
              .visibilityState===
            'visible'
          ){
            onPageShow();
          }
        }
      );

      return true;
    }

    return Object.freeze({
      mount,
      render,
      setLanguage
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

    const pageGuards=
      root
        .DreamlandPageGuards;

    if(
      !pricing||
      !inquiry||
      !contact||
      !pageGuards
    ){
      throw new Error(
        'R4.9B Review requires PricingPolicy + Inquiry + Contact + PageGuards canonical owners.'
      );
    }

    const controller=
      createController({
        documentRef,
        state,
        pricing,
        inquiry,
        contact,
        pageGuards,
        storage:
          root.localStorage
      });

    root.DreamlandReviewRuntimeController=
      controller;

    return controller
      .mount();
  }

  root.DreamlandReviewRuntime=
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

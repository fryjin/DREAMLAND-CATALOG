(function(root){
  'use strict';

  if(root.DreamlandReviewRuntime){
    return;
  }

  const VERSION='R4.9C';

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
        'R4.9C Review runtime state is missing.'
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
        'hasValidContact'||
      !state.submission||
      !state.submission.inquiryEndpoint||
      !state.submission.riskEndpoint||
      !state.privacyVersion
    ){
      throw new Error(
        'R4.9C Review runtime-state contract mismatch.'
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

  function privacyHref(state,language){
    const raw=
      text(
        state.routes
          ?.privacy
      )||
      '/privacy/';

    const base=
      raw.replace(
        /#.*$/,
        ''
      );

    return (
      base+
      '#'+
      supportedLanguage(
        language,
        state
      )
    );
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
      state.routeLocale||
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

  function guardResult(pageGuards,inquiry,contact,state){
    const normalizedContact =
      contact &&
      typeof contact.snapshot === 'function' &&
      typeof contact.validate === 'function'
        ? contact
        : contact;

    return pageGuards.evaluate(
      'review',
      {
        inquiry,
        contact:normalizedContact,
        route:{
          inquiry:()=>
            state.localeRoutes
              ?.inquiry||
            state.routes
              ?.inquiry||
            '/inquiry/',
          contact:()=>
            state.localeRoutes
              ?.contact||
            state.routes
              ?.contact||
            '/inquiry/contact/'
        }
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

    const optionalContactKeys=new Set(['phone','company','buyerType','city','message']);

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
      const value=text(values[key]);
      const shell=documentRef.querySelector('[data-review-static-contact-field="'+key+'"]');
      if(shell&&optionalContactKeys.has(key)) shell.hidden=!value;
      const node=documentRef.querySelector('[data-review-contact-value="'+key+'"]');
      if(node) node.textContent=value||text(copy.notProvided)||'—';
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

  function conciseProductPreview(item){
    const parts=text(item?.previewValue).split(' · ').map(text).filter(Boolean);
    return parts.filter((part,index)=>index!==parts.length-1&&!/^MOQ\s+/i.test(part)).join(' · ');
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
      conciseProductPreview(item)
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

    const productQuantity=number(viewModel.summary?.productQuantity,0);
    const quantityRow=documentRef.querySelector('[data-review-product-quantity-summary]');
    if(quantityRow) quantityRow.hidden=productQuantity<=0;
    const quantityValue=documentRef.querySelector('[data-review-total-quantity]');
    if(quantityValue) quantityValue.textContent=productQuantity>0
      ? productQuantity+' '+(text(locale.ui?.pieces)||'pcs')
      : '—';

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
    locale,
    state
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

    const privacyLink=
      documentRef.querySelector(
        '[data-review-privacy-link]'
      );

    if(privacyLink){
      privacyLink.setAttribute(
        'href',
        privacyHref(
          state,
          language
        )
      );
    }

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
    submissionPayload,
    risk,
    submission,
    pwa,
    submissionFlow,
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

    let privacyAccepted=false;
    let submitting=false;
    let activeInquiryId='';
    let attemptGate=Object.freeze({active:false,code:'',state:'idle',retryAfterMs:0});
    let attemptGateTimer=null;

    const statusCopy=Object.freeze({
      en:Object.freeze({
        privacy:'Please agree to the Privacy Notice before sending.',
        submitting:'Submitting Quote Request…',
        captcha:'Please complete the verification to continue.',
        filtered:'We couldn’t submit this quote request yet. Please check the details and try again.',
        failed:'We can’t submit your quote request right now. Please try again shortly.',
        offline:'You’re offline. Your quote request is still saved on this device.',
        timeout:'This is taking longer than expected. Your quote request is still saved — please try again.',
        security:'We couldn’t complete the verification. Please try again.',
        provider:'We can’t submit your quote request right now. Your selections are still saved — please try again.',
        config:'We can’t submit your quote request right now. Your selections are still saved.',
        cooldown:'Please wait {seconds}s, then try again.',
        duplicate:'This quote request is already being submitted in another tab.',
        unknown:'We couldn’t confirm whether your quote request was submitted. Please wait {seconds}s before trying again.'
      }),
      zh:Object.freeze({
        privacy:'发送前请先同意隐私说明。',
        submitting:'正在发送询价…',
        captcha:'请完成验证后继续。',
        filtered:'这份询价暂时无法发送，请检查信息后再试。',
        failed:'现在暂时无法发送询价，请稍后再试。',
        offline:'当前网络不可用，询价内容仍保存在这台设备上。',
        timeout:'发送时间比预期更久，询价内容已经保留，请稍后再试。',
        security:'验证没有完成，请重新尝试。',
        provider:'现在暂时无法发送询价，你选择的内容已经保留，请稍后再试。',
        config:'现在暂时无法发送询价，你选择的内容已经保留。',
        cooldown:'请等待 {seconds} 秒后再试。',
        duplicate:'这份询价正在另一个页面发送，请稍等。',
        unknown:'暂时无法确认是否已经发送，请等待 {seconds} 秒后再试。'
      }),
      ko:Object.freeze({
        privacy:'문의 전 개인정보 안내에 동의해 주세요.',
        submitting:'견적 요청 제출 중…',
        captcha:'계속하려면 확인을 완료해 주세요.',
        filtered:'지금은 이 견적 요청을 제출할 수 없습니다. 내용을 확인한 뒤 다시 시도해 주세요.',
        failed:'지금은 견적 요청을 제출할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        offline:'현재 네트워크에 연결할 수 없습니다. 견적 요청 내용은 이 기기에 저장되어 있습니다.',
        timeout:'전송에 예상보다 시간이 걸리고 있습니다. 견적 요청 내용은 저장되어 있으니 잠시 후 다시 시도해 주세요.',
        security:'확인을 완료하지 못했습니다. 다시 시도해 주세요.',
        provider:'지금은 견적 요청을 제출할 수 없습니다. 선택한 내용은 저장되어 있으니 다시 시도해 주세요.',
        config:'지금은 견적 요청을 제출할 수 없습니다. 선택한 내용은 저장되어 있습니다.',
        cooldown:'{seconds}초 후에 다시 시도해 주세요.',
        duplicate:'이 견적 요청은 다른 탭에서 이미 제출 중입니다.',
        unknown:'견적 요청의 전송 여부를 확인하지 못했습니다. {seconds}초 후에 다시 시도해 주세요.'
      })
    });

    function locale(){
      return localeFor(
        language,
        state
      );
    }

    function statusText(key){
      const current=
        locale();

      const copy=
        current.copy||
        {};

      const ui=
        current.ui||
        {};

      const canonical={
        privacy:
          copy.privacyRequired||
          ui.privacyRequired,
        submitting:
          copy.submitting,
        captcha:
          ui.captchaRequired||
          copy.securityAdditional,
        failed:
          copy.submitFailed||
          ui.submitFailed,
        provider:
          copy.submitFailed||
          ui.submitFailed,
        config:
          ui.formNotConfigured||
          copy.submitFailed||
          ui.submitFailed,
        duplicate:
          ui.submissionDuplicate
      }[key];

      return (
        text(
          canonical
        )||
        statusCopy[language]?.[key]||
        statusCopy.en[key]||
        key
      );
    }

    function statusWithSeconds(key,retryAfterMs){
      return statusText(key).replace('{seconds}',String(Math.max(1,Math.ceil(Number(retryAfterMs||0)/1000))));
    }

    function classifySubmissionError(error){
      const code=text(error?.code);
      if(error?.reachable===false||code==='OFFLINE') return 'offline';
      if(code==='RISK_FILTERED') return 'filtered';
      if(code.startsWith('CAPTCHA_')) return 'security';
      if(code==='RISK_TIMEOUT') return 'timeout';
      if(code==='COOLDOWN') return 'cooldown';
      if(code==='DUPLICATE') return 'duplicate';
      if(code==='UNKNOWN_PENDING'||code==='SUBMISSION_TIMEOUT') return 'unknown';
      if(code==='NOT_CONFIGURED'||code.startsWith('DIRECT_CONFIG_')) return 'config';
      if(code==='SUBMISSION_FAILED'||Number(error?.status||0)>0) return 'provider';
      return 'failed';
    }

    function setStatus(message='',kind=''){
      const node=
        documentRef.querySelector(
          '[data-review-runtime-status]'
        );

      if(node){
        node.textContent=
          text(message);
        node.dataset.reviewStatus=
          text(kind);
      }
    }

    function clearAttemptGateTimer(){if(attemptGateTimer){clearTimeout(attemptGateTimer);attemptGateTimer=null;}}

    function refreshAttemptGate(announce=false){
      clearAttemptGateTimer();
      const previousActive=attemptGate.active;
      attemptGate=activeInquiryId&&typeof submissionFlow.attemptState==='function'?submissionFlow.attemptState(activeInquiryId):Object.freeze({active:false,code:'',state:'idle',retryAfterMs:0});
      if(attemptGate.active&&announce&&!submitting){
        const key=attemptGate.code==='UNKNOWN_PENDING'?'unknown':attemptGate.code==='COOLDOWN'?'cooldown':'duplicate';
        setStatus(key==='duplicate'?statusText(key):statusWithSeconds(key,attemptGate.retryAfterMs),'error');
      }else if(previousActive&&!attemptGate.active&&!submitting){setStatus('');}
      if(attemptGate.active&&attemptGate.retryAfterMs>0){attemptGateTimer=setTimeout(()=>{refreshAttemptGate(true);syncSubmitUi();},Math.min(1000,attemptGate.retryAfterMs));}
      return attemptGate;
    }

    function syncSubmitUi(){
      const privacy=
        documentRef.querySelector(
          '[data-review-privacy]'
        );

      const submitButton=
        documentRef.querySelector(
          '[data-review-submit]'
        );

      if(privacy){
        privacy.disabled=
          submitting;
        privacy.checked=
          privacyAccepted;
      }

      if(submitButton){
        submitButton.disabled=
          submitting||
          attemptGate.active;
        submitButton.setAttribute(
          'aria-busy',
          submitting
            ? 'true'
            : 'false'
        );
      }
    }

    function configureSubmissionBoundary(){
      const config=
        state.submission||
        {};

      risk.configure({
        endpoint:
          config.riskEndpoint,
        storage,
        storageKey:
          'dreamlandRiskAttempts',
        repeatWindowMs:
          config.riskControl?.repeatWindowMs,
        hcaptcha:
          config.hcaptcha||{},
        documentRef,
        navigatorRef:
          root.navigator
      });

      submission.configure({
        submitUrl:
          config.inquiryEndpoint,
        accessKeyEndpoint:
          config.clientConfigEndpoint,
        transport:
          config.transport
      });

      pwa.configure({
        storage:Object.freeze({
          local:storage,
          session:
            root.sessionStorage
        }),
        getLanguage:
          ()=>language,
        getConfig:
          ()=>config.pwa||{},
        getActiveScreen:
          ()=>'review',
        getConnectivityEndpoint:
          ()=>config.riskEndpoint
      });

      submissionFlow.configure({
        submission,
        risk,
        pwa,
        inquiry,
        contact,
        storage,
        archiveKey:
          'dreamlandInquiryArchiveV1',
        lastSubmissionKey:
          'dreamlandLastSubmissionV1',
        pendingInquiryKey:
          state.storage.pendingInquiryKey,
        archiveLimit:
          config.archiveLimit,
        cooldownMs:
          config.cooldownMs,
        attemptKey:config.attemptKey,
        attemptTtlMs:config.attemptTtlMs,
        unknownRetryDelayMs:config.unknownRetryDelayMs,
        submissionTimeoutMs:config.submissionTimeoutMs
      });

      risk.markFormStart();
      risk.bindInteractionTracking(
        documentRef
      );

      if(
        config.hcaptcha?.enabled!==false
      ){
        risk.preloadCaptcha();
      }
    }

    function projectionForSubmission(){
      const inquiryId=
        ensureInquiryId(
          state,
          storage
        );

      return inquiry.buildProjection({
        contact:
          contact.snapshot(),
        inquiryId,
        submittedAt:
          new Date().toISOString(),
        language,
        privacyVersion:
          state.privacyVersion
      });
    }

    async function runWithTimeout(task,timeoutMs,code){
      const duration=Math.max(0,Number(timeoutMs)||0);
      if(duration<=0||typeof root.AbortController!=='function') return task(null);
      const controller=new root.AbortController();
      let timedOut=false;
      const timer=setTimeout(()=>{timedOut=true;controller.abort();},duration);
      try{return await task(controller.signal);}catch(error){if(timedOut||error?.name==='AbortError'){const timeoutError=new Error(code);timeoutError.code=code;throw timeoutError;}throw error;}finally{clearTimeout(timer);}
    }

    async function assessRisk(payload){
      const assessment=
        await runWithTimeout(
          signal=>risk.assess(payload,{website:'',language,...(signal?{signal}:{})}),
          state.submission.riskTimeoutMs,
          'RISK_TIMEOUT'
        );

      if(assessment.filtered){
        const error=
          new Error(
            statusText('filtered')
          );
        error.code=
          'RISK_FILTERED';
        throw error;
      }

      if(!assessment.captchaRequired){
        return '';
      }

      const security=
        documentRef.querySelector(
          '[data-review-security]'
        );

      const copy=
        documentRef.querySelector(
          '[data-review-security-copy]'
        );

      const container=
        documentRef.querySelector(
          '[data-review-captcha]'
        );

      if(security){
        security.hidden=false;
      }

      if(copy){
        copy.textContent=
          statusText('captcha');
      }

      await risk.renderCaptcha(
        container,
        {
          siteKey:
            assessment.siteKey
        }
      );

      return risk.ensureCaptcha({
        required:true
      });
    }

    async function submitReview(){
      if(submitting){
        return false;
      }

      if(!privacyAccepted){
        setStatus(
          statusText('privacy'),
          'error'
        );

        const privacy=
          documentRef.querySelector(
            '[data-review-privacy]'
          );

        privacy?.focus?.();
        syncSubmitUi();
        return false;
      }

      if(!hydrateAndGuard()){
        return false;
      }

      refreshAttemptGate(true);
      if(attemptGate.active){syncSubmitUi();return false;}

      submitting=true;
      syncSubmitUi();
      setStatus(
        statusText('submitting'),
        'pending'
      );

      try{
        const projection=
          projectionForSubmission();

        const payload=
          submissionPayload.build(
            projection
          );

        const validation=
          submissionPayload.validate(
            payload
          );

        if(!validation.ok){
          const error=
            new Error(
              validation.code
            );
          error.code=
            validation.code;
          throw error;
        }

        const captchaToken=
          await assessRisk(
            payload
          );

        const result=
          await submissionFlow.submit({
            inquiryId:
              projection.inquiryId,
            payload,
            submissionSnapshot:
              projection,
            captchaToken
          });

        if(!result?.success){
          throw new Error(
            'SUBMISSION_FAILED'
          );
        }

        root.location?.assign?.(
          state.localeRoutes
            ?.success||
          '/inquiry/success/'
        );

        return true;
      }catch(error){
        risk.resetCaptcha();

        const security=
          documentRef.querySelector(
            '[data-review-security]'
        );

        if(security){
          security.hidden=true;
        }

        refreshAttemptGate(false);
        const category=classifySubmissionError(error);
        setStatus(
          category==='cooldown'||category==='unknown'
            ? statusWithSeconds(category,error?.retryAfterMs||attemptGate.retryAfterMs)
            : statusText(category),
          'error'
        );

        return false;
      }finally{
        submitting=false;
        syncSubmitUi();
      }
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
          contact,
          state
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
        currentLocale,
        state
      );

      const result=
        projection();

      activeInquiryId=result.inquiryId;
      refreshAttemptGate(true);

      const viewModel=
        inquiry
          .buildViewModel();

      renderProjection(
        documentRef,
        result,
        viewModel,
        currentLocale
      );

      syncSubmitUi();

      return true;
    }

    function setLanguage(value){
      language=
        supportedLanguage(
          state.routeLocale||
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
        const option=
          select.options
            ?.[select.selectedIndex];
        const requested=
          select.value;
        const href=
          option?.dataset
            ?.localeHref||
          '';

        if(href){
          writeLanguage(
            requested,
            state,
            storage
          );

          const url=
            new URL(
              href,
              root.location?.origin||
                'https://dreamlandart.net'
            );

          url.search=
            root.location?.search||
            '';

          url.hash=
            root.location?.hash||
            '';

          root.location
            ?.assign?.(
              url.pathname+
              url.search+
              url.hash
            );

          return;
        }

        setLanguage(
          requested
        );
        return;
      }

      const privacy=
        event.target
          ?.closest?.(
            '[data-review-privacy]'
          );

      if(privacy){
        privacyAccepted=
          privacy.checked===true;
        setStatus('');
        syncSubmitUi();
      }
    }

    function onClick(event){
      const submitButton=
        event.target
          ?.closest?.(
            '[data-review-submit]'
          );

      if(!submitButton){
        return;
      }

      event.preventDefault();
      submitReview();
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
            .pendingInquiryKey,
          state.submission
            .attemptKey
        ].includes(
          event.key
        )
      ){
        if(event.key===state.submission.attemptKey){refreshAttemptGate(true);syncSubmitUi();return;}

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

      configureSubmissionBoundary();

      if(!render()){
        return false;
      }

      syncSubmitUi();

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
      setLanguage,
      submitReview
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

    const submissionPayload=
      root
        .DreamlandSubmissionPayload;

    const risk=
      root
        .DreamlandRisk;

    const submission=
      root
        .DreamlandSubmission;

    const pwa=
      root
        .DreamlandPwa;

    const submissionFlow=
      root
        .DreamlandInquirySubmissionFlow;

    if(
      !pricing||
      !inquiry||
      !contact||
      !pageGuards||
      !submissionPayload||
      !risk||
      !submission||
      !pwa||
      !submissionFlow
    ){
      throw new Error(
        'R4.9C Review requires canonical projection, risk and submission owners.'
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
        submissionPayload,
        risk,
        submission,
        pwa,
        submissionFlow,
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

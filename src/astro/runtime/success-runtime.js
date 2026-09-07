(function(root){
  'use strict';

  if(root.DreamlandSuccessRuntime){
    return;
  }

  const VERSION='R4.10B';

  let state=null;
  let language='en';
  let lastSubmission=null;
  let booted=false;

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function parseState(documentRef){
    const node=
      documentRef
        ?.getElementById(
          'successRuntimeState'
        );

    if(!node){
      throw new Error(
        'R4.10B Success runtime state is missing.'
      );
    }

    const parsed=
      JSON.parse(
        node.textContent||
        '{}'
      );

    if(
      parsed.version!==
        VERSION||
      parsed.storage
        ?.languageKey!==
        'productManualLang'||
      parsed.storage
        ?.lastSubmissionKey!==
        'dreamlandLastSubmissionV1'||
      parsed.routes
        ?.inquiry!==
        '/inquiry/'||
      parsed.routes
        ?.catalog!==
        '/products/'||
      parsed.routes
        ?.custom!==
        '/custom/'||
      parsed.guard!==
        'hasLastSubmission'||
      !Array.isArray(
        parsed.languages
      )||
      !parsed.languages.length
    ){
      throw new Error(
        'R4.10B Success runtime-state contract mismatch.'
      );
    }

    return parsed;
  }

  function supportedLanguage(value,runtimeState){
    const requested=
      text(
        value
      );

    return runtimeState.languages
      .includes(
        requested
      )
      ? requested
      : runtimeState.defaultLanguage;
  }

  function localeFor(value,runtimeState){
    return (
      runtimeState.locales
        ?.[value]||
      runtimeState.locales
        ?.[runtimeState.defaultLanguage]||
      {}
    );
  }

  function readLanguage(runtimeState,storage,record){
    let stored='';

    try{
      stored=
        storage
          ?.getItem(
            runtimeState.storage
              .languageKey
          )||
        '';
    }catch(_){
      stored='';
    }

    const candidate=
      text(
        stored
      )||
      text(
        record?.language
      )||
      runtimeState.defaultLanguage;

    return supportedLanguage(
      candidate,
      runtimeState
    );
  }

  function writeLanguage(value,runtimeState,storage){
    try{
      storage
        ?.setItem(
          runtimeState.storage
            .languageKey,
          value
        );
    }catch(_){
    }
  }

  function readLastSubmission(runtimeState,storage){
    let raw='';

    try{
      raw=
        storage
          ?.getItem(
            runtimeState.storage
              .lastSubmissionKey
          )||
        '';
    }catch(_){
      raw='';
    }

    if(!raw){
      return {};
    }

    try{
      const parsed=
        JSON.parse(
          raw
        );

      return (
        parsed&&
        typeof parsed==='object'&&
        !Array.isArray(parsed)
      )
        ? parsed
        : {};
    }catch(_){
      return {};
    }
  }

  function localeName(value){
    if(value==='zh'){
      return 'zh-CN';
    }

    if(value==='ko'){
      return 'ko-KR';
    }

    return 'en-US';
  }

  function dateText(value,lang){
    const raw=
      text(
        value
      );

    if(!raw){
      return '—';
    }

    try{
      const date=
        new Date(
          raw
        );

      if(
        Number.isNaN(
          date.getTime()
        )
      ){
        return raw;
      }

      return date.toLocaleDateString(
        localeName(
          lang
        )
      );
    }catch(_){
      return raw;
    }
  }

  function projection(record,lang){
    const inquiryId=
      text(
        record?.inquiryId||
        record?.clientInquiryId
      );

    return Object.freeze({
      inquiryId,
      submittedAt:
        dateText(
          record?.submittedAt,
          lang
        ),
      amountDisplay:
        text(
          record?.amountDisplay||
          record?.estimatedTotalDisplay
        )||
        '—'
    });
  }

  function setText(documentRef,selector,value){
    const node=
      documentRef
        ?.querySelector(
          selector
        );

    if(node){
      node.textContent=
        String(
          value??
          ''
        );
    }
  }

  function renderHomeBindings(documentRef,locale){
    const source={
      navigation:
        locale.navigation||
        {},
      footer:
        locale.footer||
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

  function renderSuccessCopy(documentRef,locale){
    const copy=
      locale.copy||
      {};

    setText(
      documentRef,
      '.success-hero .success-eyebrow',
      copy.successKicker||
      'INQUIRY RECEIVED'
    );

    setText(
      documentRef,
      '#successTitle',
      copy.successTitle||
      'We have received your inquiry.'
    );

    setText(
      documentRef,
      '.success-lead',
      copy.successBody||
      ''
    );

    setText(
      documentRef,
      '[data-success-static-reference] > div:nth-child(1) dt',
      copy.inquiryNumber||
      'Inquiry number'
    );

    setText(
      documentRef,
      '[data-success-static-reference] > div:nth-child(2) dt',
      copy.submitted||
      'Submitted'
    );

    setText(
      documentRef,
      '[data-success-static-next] .success-eyebrow',
      copy.whatNextKicker||
      'AFTER SUBMISSION'
    );

    setText(
      documentRef,
      '[data-success-static-next] h2',
      copy.whatNextTitle||
      'What happens after submission'
    );

    const steps=
      Array.isArray(
        copy.whatNextSteps
      )
        ? copy.whatNextSteps
        : [];

    const stepNodes=
      documentRef.querySelectorAll(
        '[data-success-static-next] li span'
      );

    stepNodes.forEach(
      (
        node,
        index
      )=>{
        if(
          steps[index]!==undefined
        ){
          node.textContent=
            String(
              steps[index]
            );
        }
      }
    );

    setText(
      documentRef,
      '[data-success-static-details] > div:nth-child(1) dt',
      copy.productEstimate||
      'Estimated product amount'
    );

    setText(
      documentRef,
      '[data-success-static-details] > div:nth-child(2) dt',
      copy.status||
      'Status'
    );

    setText(
      documentRef,
      '[data-success-static-status]',
      copy.awaitingReview||
      'In review'
    );

    setText(
      documentRef,
      '[data-success-static-action="explore"] span:first-child',
      copy.continueExploring||
      'Continue Exploring'
    );

    setText(
      documentRef,
      '[data-success-static-action="custom"]',
      copy.startAnotherProject||
      'Start a New Inquiry'
    );
  }

  function renderSubmission(documentRef,record,lang){
    const value=
      projection(
        record,
        lang
      );

    setText(
      documentRef,
      '[data-success-static-value="inquiryId"]',
      value.inquiryId||
      '—'
    );

    setText(
      documentRef,
      '[data-success-static-value="submittedAt"]',
      value.submittedAt||
      '—'
    );

    setText(
      documentRef,
      '[data-success-static-value="amountDisplay"]',
      value.amountDisplay||
      '—'
    );

    return value;
  }

  function renderActions(documentRef,runtimeState){
    const explore=
      documentRef.querySelector(
        '[data-success-static-action="explore"]'
      );

    const custom=
      documentRef.querySelector(
        '[data-success-static-action="custom"]'
      );

    if(explore){
      explore.setAttribute(
        'href',
        runtimeState.routes
          .catalog
      );
    }

    if(custom){
      custom.setAttribute(
        'href',
        runtimeState.routes
          .custom
      );
    }
  }

  function applyLanguage(documentRef,runtimeState,storage,record,nextLanguage){
    language=
      supportedLanguage(
        nextLanguage,
        runtimeState
      );

    const locale=
      localeFor(
        language,
        runtimeState
      );

    documentRef.documentElement
      ?.setAttribute(
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

    renderHomeBindings(
      documentRef,
      locale
    );

    renderSuccessCopy(
      documentRef,
      locale
    );

    renderSubmission(
      documentRef,
      record,
      language
    );

    writeLanguage(
      language,
      runtimeState,
      storage
    );
  }

  function updateGuardMetadata(documentRef,guard){
    const main=
      documentRef.querySelector(
        '[data-success-static-presentation]'
      );

    if(!main){
      return;
    }

    main.dataset.successGuardName=
      'hasLastSubmission';

    main.dataset.successGuardAllowed=
      guard.allowed===true
        ? 'true'
        : 'false';

    main.dataset.successGuardCode=
      text(
        guard.code
      );

    main.dataset.successGuardTarget=
      text(
        guard.target
      );
  }

  function boot({
    documentRef=root.document,
    storage=
      root.DreamlandStorage
        ?.local,
    pageGuards=
      root.DreamlandPageGuards
  }={}){
    if(
      !documentRef||
      !storage||
      !pageGuards
    ){
      throw new Error(
        'R4.10B Success runtime requires Document, DreamlandStorage and DreamlandPageGuards.'
      );
    }

    state=
      parseState(
        documentRef
      );

    lastSubmission=
      readLastSubmission(
        state,
        storage
      );

    const guard=
      pageGuards.evaluate(
        'success',
        {
          lastSubmission
        }
      );

    updateGuardMetadata(
      documentRef,
      guard
    );

    if(!guard.allowed){
      const target=
        text(
          guard.target
        )||
        state.routes
          .inquiry;

      root.location
        ?.replace?.(
          target
        );

      return false;
    }

    language=
      readLanguage(
        state,
        storage,
        lastSubmission
      );

    applyLanguage(
      documentRef,
      state,
      storage,
      lastSubmission,
      language
    );

    renderActions(
      documentRef,
      state
    );

    const select=
      documentRef.querySelector(
        '[data-home-language-select]'
      );

    select
      ?.addEventListener(
        'change',
        event=>{
          applyLanguage(
            documentRef,
            state,
            storage,
            lastSubmission,
            event.target
              ?.value
          );
        }
      );

    booted=true;

    return true;
  }

  function snapshot(){
    const value=
      projection(
        lastSubmission||
        {},
        language
      );

    return Object.freeze({
      version:
        VERSION,
      booted,
      language,
      inquiryId:
        value.inquiryId
    });
  }

  root.DreamlandSuccessRuntime=
    Object.freeze({
      version:
        VERSION,
      boot,
      projection,
      snapshot
    });

  if(root.document){
    boot();
  }
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

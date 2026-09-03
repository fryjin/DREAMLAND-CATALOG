(function(root){
  'use strict';

  if(root.DreamlandPdpRuntime){
    return;
  }

  const VERSION='R4.5B';
  const RUNTIME_ID=
    'DREAMLAND_R4_PDP_RUNTIME_R4_5B';

  let state=null;
  let detail=null;
  let pricing=null;
  let inquiry=null;
  let currentLanguage='en';
  let currentView=null;
  let mounted=false;
  let statusTimer=0;
  let scentMap=
    new Map();

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function safeJson(value){
    try{
      return JSON.parse(
        String(
          value||
          ''
        )
      );
    }catch(_){
      return null;
    }
  }

  function storage(){
    try{
      return root.localStorage||null;
    }catch(_){
      return null;
    }
  }

  function readStorage(key){
    const target=
      storage();

    if(!target){
      return '';
    }

    try{
      return target.getItem(key)||'';
    }catch(_){
      return '';
    }
  }

  function writeStorage(
    key,
    value
  ){
    const target=
      storage();

    if(!target){
      return false;
    }

    try{
      target.setItem(
        key,
        String(value)
      );
      return true;
    }catch(_){
      return false;
    }
  }

  function normalizeLanguage(
    value,
    fallback='en',
    supported=[
      'en',
      'zh',
      'ko'
    ]
  ){
    const next=
      text(value)
        .toLowerCase();

    return supported.includes(next)
      ? next
      : fallback;
  }

  function inquiryCount(value){
    const data=
      typeof value===
      'string'
        ? safeJson(value)
        : value;

    if(
      !data||
      typeof data!==
      'object'||
      !Array.isArray(
        data.items
      )
    ){
      return 0;
    }

    return data.items.reduce(
      (
        total,
        item
      )=>
        total+
        (
          item?.type===
          'product'
            ? (
                Number(
                  item?.qty
                )||
                0
              )
            : 1
        ),
      0
    );
  }

  function uid(){
    return (
      'pdp-'+
      text(
        state?.product?.id
      )+
      '-'+
      Date.now()
        .toString(36)+
      '-'+
      Math.random()
        .toString(36)
        .slice(2,8)
    );
  }

  function content(){
    return (
      state?.languages
        ?.[currentLanguage]||
      state?.languages
        ?.[state?.defaultLanguage]||
      state?.languages?.en||
      {}
    );
  }

  function languageName(){
    return (
      content().name||
      state?.product?.names
        ?.[currentLanguage]||
      state?.product?.names?.en||
      state?.product?.id||
      ''
    );
  }

  function languageDescription(){
    return (
      content().description||
      state?.product
        ?.descriptions
        ?.[currentLanguage]||
      state?.product
        ?.descriptions
        ?.en||
      ''
    );
  }

  function scentDisplay(
    value
  ){
    if(
      value&&
      typeof value===
      'object'
    ){
      return (
        value?.[currentLanguage]||
        value?.en||
        value?.zh||
        ''
      );
    }

    return text(value);
  }

  function seriesLabel(
    key
  ){
    return (
      state?.seriesMeta
        ?.[key]
        ?.labels
        ?.[currentLanguage]||
      state?.seriesMeta
        ?.[key]
        ?.labels
        ?.en||
      key
    );
  }

  function setText(
    node,
    value
  ){
    if(node){
      node.textContent=
        text(value);
    }
  }

  function pathValue(
    source,
    path
  ){
    return text(path)
      .split('.')
      .filter(Boolean)
      .reduce(
        (
          value,
          key
        )=>
          value==
          null
            ? undefined
            : value[key],
        source
      );
  }

  function parseState(){
    const node=
      document.getElementById(
        'pdpRuntimeState'
      );

    if(!node){
      return null;
    }

    const parsed=
      safeJson(
        node.textContent
      );

    if(
      !parsed||
      parsed.version!==
        VERSION||
      !parsed.product?.id||
      !parsed.seriesMeta||
      !parsed.languages||
      !parsed.storage
    ){
      return null;
    }

    return parsed;
  }

  function availableScents(
    product,
    override=''
  ){
    const allowed=
      override
        ? [
            override
          ]
        : (
            product
              ?.availableScentSeries
              ?.length
              ? product
                  .availableScentSeries
              : [
                  product?.series
                ]
          );

    return (
      state?.scents||
      []
    )
      .filter(
        scent=>
          allowed.includes(
            scent.series
          )
      );
  }

  function initialScentSeries(
    product
  ){
    return product?.series===
      'holiday'
      ? (
          product
            ?.availableScentSeries
            ?.[0]||
          state?.seriesMeta
            ?.holiday
            ?.scentSeriesOptions
            ?.[0]||
          'classic'
        )
      : '';
  }

  function configureDetail(){
    detail.configure({
      products:[
        state.product
      ],
      sizes:
        state.product
          .availableSizes,
      qtyMin:
        state.quantity.min,
      qtyStep:
        state.quantity.step,
      defaultProductSize:
        product=>
          pricing
            .defaultProductSize(
              product
            ),
      initialScentSeries,
      patternsForSize:
        size=>
          state
            .patternsBySize
            ?.[size]||
          [],
      scentSeriesOptions:
        product=>
          product?.series===
            'holiday'
            ? (
                product
                  ?.availableScentSeries||
                state?.seriesMeta
                  ?.holiday
                  ?.scentSeriesOptions||
                []
              )
            : [],
      availableScents,
      scentById:
        id=>
          scentMap.get(id)||
          null,
      scentDisplayText:
        scentDisplay,
      defaultPack:
        series=>
          pricing.defaultPack(
            series,
            state.seriesMeta
          ),
      packOptions:
        series=>
          pricing.packOptions(
            series,
            state.seriesMeta
          ),
      normalizeQuantity:
        (
          value,
          min
        )=>
          pricing.normalizeQuantity(
            value,
            min,
            state.quantity.max
          ),
      maximumQuantity:
        ()=>
          state.quantity.max,
      moqForSeriesSize:
        (
          series,
          size
        )=>
          pricing.moqForSeriesSize(
            series,
            size,
            state.seriesMeta
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
            state.currencies
          )
    });

    currentView=
      detail.openProduct(
        state.product.id
      );
  }

  function configureInquiry(){
    inquiry.configure({
      storage:
        storage(),
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
            min,
            state.quantity.max
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
            state.currencies
          )
    });
  }

  function money(value){
    return pricing.money(
      value,
      currentLanguage,
      state.currencies
    );
  }

  function currencyUnit(){
    return pricing.currencyUnit(
      currentLanguage,
      state.currencies
    );
  }

  function uiValue(key){
    return (
      content()
        ?.ui
        ?.[key]||
      ''
    );
  }

  function applyLanguageBindings(){
    const lang=
      content();

    document
      .querySelectorAll(
        '[data-home-bind]'
      )
      .forEach(node=>{
        const value=
          pathValue(
            lang.content,
            node.dataset
              .homeBind
          );

        if(value!==undefined){
          setText(
            node,
            value
          );
        }
      });

    document
      .querySelectorAll(
        '[data-pdp-bind]'
      )
      .forEach(node=>{
        const value=
          pathValue(
            lang.content,
            node.dataset
              .pdpBind
          );

        if(value!==undefined){
          setText(
            node,
            value
          );
        }
      });

    document
      .querySelectorAll(
        '[data-pdp-ui]'
      )
      .forEach(node=>{
        const key=
          node.dataset
            .pdpUi;

        const value=
          lang.ui?.[key];

        if(value){
          setText(
            node,
            value
          );
        }
      });

    document
      .querySelectorAll(
        '[data-pdp-product-name]'
      )
      .forEach(
        node=>
          setText(
            node,
            languageName()
          )
      );

    document
      .querySelectorAll(
        '[data-pdp-product-description]'
      )
      .forEach(
        node=>
          setText(
            node,
            languageDescription()
          )
      );

    document
      .querySelectorAll(
        '[data-pdp-series-label]'
      )
      .forEach(
        node=>
          setText(
            node,
            lang.seriesLabel||
            seriesLabel(
              state.product.series
            )
          )
      );

    const languageSelect=
      document.querySelector(
        '[data-home-language-select]'
      );

    if(languageSelect){
      languageSelect.disabled=
        false;
      languageSelect.value=
        currentLanguage;

      languageSelect.setAttribute(
        'aria-label',
        lang.content
          ?.navigation
          ?.language||
        'Language'
      );
    }

    document.documentElement
      .setAttribute(
        'lang',
        currentLanguage===
          'zh'
          ? 'zh-CN'
          : currentLanguage===
              'ko'
            ? 'ko-KR'
            : 'en'
      );

    if(document.body){
      document.body.dataset
        .pdpLanguage=
        currentLanguage;
    }
  }

  function renderScents(view){
    const select=
      document.querySelector(
        '[data-pdp-scent]'
      );

    if(!select){
      return;
    }

    const selected=
      view.config.scentId;

    select.innerHTML=
      view.options.scents
        .map(
          scent=>
            '<option value="'+
            text(scent.id)
              .replace(/"/g,'&quot;')+
            '">'+
            scentDisplay(
              scent.name
            )
              .replace(/&/g,'&amp;')
              .replace(/</g,'&lt;')+
            '</option>'
        )
        .join('');

    select.value=
      selected;
  }

  function renderPatterns(view){
    const select=
      document.querySelector(
        '[data-pdp-pattern]'
      );

    if(!select){
      return;
    }

    select.innerHTML=
      view.options.patterns
        .map(
          pattern=>
            '<option value="'+
            text(pattern)
              .replace(/"/g,'&quot;')+
            '">'+
            text(pattern)
              .replace(/&/g,'&amp;')
              .replace(/</g,'&lt;')+
            '</option>'
        )
        .join('');

    select.value=
      view.config.pattern;
  }

  function renderPacks(view){
    const select=
      document.querySelector(
        '[data-pdp-pack]'
      );

    if(!select){
      return;
    }

    select.innerHTML=
      view.options.packs
        .map(
          pack=>
            '<option value="'+
            text(pack)
              .replace(/"/g,'&quot;')+
            '">'+
            text(pack)
              .replace(/&/g,'&amp;')
              .replace(/</g,'&lt;')+
            '</option>'
        )
        .join('');

    select.value=
      view.config.pack;
  }

  function renderScentSeries(view){
    const select=
      document.querySelector(
        '[data-pdp-scent-series]'
      );

    if(!select){
      return;
    }

    select.innerHTML=
      view.options
        .scentSeries
        .map(
          series=>
            '<option value="'+
            text(series)
              .replace(/"/g,'&quot;')+
            '">'+
            text(
              seriesLabel(
                series
              )
            )
              .replace(/&/g,'&amp;')
              .replace(/</g,'&lt;')+
            '</option>'
        )
        .join('');

    select.value=
      view.config
        .scentSeries;
  }

  function renderSizes(view){
    document
      .querySelectorAll(
        '[data-pdp-size]'
      )
      .forEach(button=>{
        const active=
          button.dataset
            .pdpSize===
          view.config.size;

        button.classList
          .toggle(
            'is-default',
            active
          );

        button.setAttribute(
          'aria-pressed',
          active
            ? 'true'
            : 'false'
        );
      });

    setText(
      document.querySelector(
        '[data-pdp-size-summary]'
      ),
      view.config.size
    );
  }

  function renderQuantity(view){
    const input=
      document.querySelector(
        '[data-pdp-quantity]'
      );

    if(input){
      input.value=
        String(
          view.config.qty
        );

      input.min=
        String(
          view.limits.qtyMin
        );

      input.max=
        String(
          view.limits.qtyMax
        );

      input.step=
        String(
          view.limits.qtyStep
        );
    }
  }

  function renderPricing(view){
    document
      .querySelectorAll(
        '[data-pdp-current-price]'
      )
      .forEach(
        node=>
          setText(
            node,
            money(
              view.pricing
                .unitPrice
            )
          )
      );

    document
      .querySelectorAll(
        '[data-pdp-current-moq]'
      )
      .forEach(
        node=>
          setText(
            node,
            view.pricing.moq
          )
      );

    setText(
      document.querySelector(
        '[data-pdp-currency-unit]'
      ),
      currencyUnit()
    );

    const note=
      document.querySelector(
        '[data-pdp-moq-note]'
      );

    if(note){
      const below=
        Number(
          view.config.qty
        )<
        Number(
          view.pricing.moq
        );

      setText(
        note,
        below
          ? (
              uiValue(
                'submitMoqCheck'
              )||
              'MOQ is checked on submission.'
            )
          : (
              uiValue(
                'moqHint'
              )||
              'MOQ reached.'
            )
      );

      note.dataset
        .pdpMoqReached=
        below
          ? 'false'
          : 'true';
    }
  }

  function updatePrimaryForSize(view){
    const src=
      state.product
        .sizeImages
        ?.[view.config.size];

    if(!src){
      return;
    }

    const image=
      document.querySelector(
        '[data-pdp-primary-image="true"]'
      );

    if(image){
      image.src=
        src;
    }
  }

  function render(
    view=
      detail.buildViewModel()
  ){
    currentView=
      view;

    applyLanguageBindings();
    renderSizes(view);
    renderScentSeries(view);
    renderScents(view);
    renderPatterns(view);
    renderPacks(view);
    renderQuantity(view);
    renderPricing(view);
    updateInquiryBadge();

    return view;
  }

  function applyLanguage(
    language,
    {
      persist=true
    }={}
  ){
    const supported=
      Object.keys(
        state.languages||
        {}
      );

    currentLanguage=
      normalizeLanguage(
        language,
        state.defaultLanguage||
          'en',
        supported
      );

    if(persist){
      writeStorage(
        state.storage
          .languageKey,
        currentLanguage
      );
    }

    currentView=
      detail.buildViewModel();

    render(
      currentView
    );

    return currentLanguage;
  }

  function updateInquiryBadge(){
    const count=
      inquiryCount(
        inquiry?.snapshot
          ? inquiry.snapshot()
          : readStorage(
              state.storage
                .inquiryKey
            )
      );

    const node=
      document.querySelector(
        '[data-home-inquiry-count]'
      );

    if(node){
      setText(
        node,
        count
      );

      node.setAttribute(
        'aria-label',
        count+
        ' '+
        (
          content()
            ?.content
            ?.navigation
            ?.inquiry||
          'Inquiry'
        )
      );
    }

    return count;
  }

  function status(
    message,
    kind='ok'
  ){
    const node=
      document.querySelector(
        '[data-pdp-runtime-status]'
      );

    if(!node){
      return;
    }

    root.clearTimeout(
      statusTimer
    );

    setText(
      node,
      message
    );

    node.hidden=false;
    node.dataset.kind=
      kind;

    statusTimer=
      root.setTimeout(
        ()=>{
          node.hidden=true;
        },
        2600
      );
  }

  function itemFromView(view){
    const product=
      state.product;

    return {
      id:uid(),
      type:'product',
      productId:
        product.id,
      name:
        product.name,
      names:{
        ...(
          product.names||
          {}
        )
      },
      series:
        product.series,
      color:
        product.color,
      colorCode:
        product.colorCode,
      cover:
        product.cover,
      moq:
        view.pricing.moq,
      size:
        view.config.size,
      scentSeries:
        view.config
          .scentSeries,
      scentId:
        view.config.scentId,
      scent:
        view.config.scent,
      pattern:
        view.config.pattern,
      pack:
        view.config.pack,
      qty:
        view.config.qty
    };
  }

  function addToInquiry(){
    const view=
      detail.buildViewModel();

    const item=
      itemFromView(
        view
      );

    inquiry.addOrMergeProduct(
      item
    );

    inquiry.persist();

    updateInquiryBadge();

    status(
      uiValue(
        'addedInquiry'
      )||
      'Added to inquiry.'
    );

    return item;
  }

  function commit(
    action,
    {
      sizeImage=false
    }={}
  ){
    action();

    const view=
      detail.buildViewModel();

    render(view);

    if(sizeImage){
      updatePrimaryForSize(
        view
      );
    }

    return view;
  }

  function bindEvents(){
    document
      .querySelectorAll(
        '[data-pdp-size]'
      )
      .forEach(button=>{
        button.addEventListener(
          'click',
          ()=>{
            commit(
              ()=>
                detail.setOption(
                  'size',
                  button.dataset
                    .pdpSize
                ),
              {
                sizeImage:true
              }
            );
          }
        );
      });

    document
      .querySelector(
        '[data-pdp-scent-series]'
      )
      ?.addEventListener(
        'change',
        event=>{
          commit(
            ()=>
              detail.setOption(
                'scentSeries',
                event.currentTarget
                  ?.value
              )
          );
        }
      );

    document
      .querySelector(
        '[data-pdp-scent]'
      )
      ?.addEventListener(
        'change',
        event=>{
          commit(
            ()=>
              detail.setScent(
                event.currentTarget
                  ?.value
              )
          );
        }
      );

    document
      .querySelector(
        '[data-pdp-pattern]'
      )
      ?.addEventListener(
        'change',
        event=>{
          commit(
            ()=>
              detail.setOption(
                'pattern',
                event.currentTarget
                  ?.value
              )
          );
        }
      );

    document
      .querySelector(
        '[data-pdp-pack]'
      )
      ?.addEventListener(
        'change',
        event=>{
          commit(
            ()=>
              detail.setOption(
                'pack',
                event.currentTarget
                  ?.value
              )
          );
        }
      );

    document
      .querySelector(
        '[data-pdp-quantity]'
      )
      ?.addEventListener(
        'change',
        event=>{
          const result=
            detail.setQuantity(
              event.currentTarget
                ?.value
            );

          render(
            detail.buildViewModel()
          );

          if(result?.aboveMax){
            status(
              uiValue(
                'quantityTooLarge'
              )||
              'Quantity exceeds the allowed range.',
              'warn'
            );
          }else if(
            result?.invalid||
            result?.belowMin
          ){
            status(
              uiValue(
                'minQtyError'
              )||
              'Quantity must be at least 1.',
              'warn'
            );
          }
        }
      );

    document
      .querySelectorAll(
        '[data-pdp-qty-adjust]'
      )
      .forEach(button=>{
        button.addEventListener(
          'click',
          ()=>{
            detail.adjustQuantity(
              Number(
                button.dataset
                  .pdpQtyAdjust
              )||
              0
            );

            render(
              detail.buildViewModel()
            );
          }
        );
      });

    document
      .querySelector(
        '[data-pdp-add-inquiry]'
      )
      ?.addEventListener(
        'click',
        addToInquiry
      );

    document
      .querySelector(
        '[data-home-language-select]'
      )
      ?.addEventListener(
        'change',
        event=>{
          applyLanguage(
            event.currentTarget
              ?.value
          );
        }
      );

    document
      .querySelectorAll(
        '[data-pdp-gallery-select]'
      )
      .forEach(button=>{
        button.addEventListener(
          'click',
          ()=>{
            const image=
              document.querySelector(
                '[data-pdp-primary-image="true"]'
              );

            if(
              image&&
              button.dataset
                .pdpGallerySelect
            ){
              image.src=
                button.dataset
                  .pdpGallerySelect;
            }
          }
        );
      });

    root.addEventListener(
      'storage',
      event=>{
        if(
          event.key===
          state.storage
            .languageKey
        ){
          applyLanguage(
            event.newValue,
            {
              persist:false
            }
          );
          return;
        }

        if(
          event.key===
          state.storage
            .inquiryKey
        ){
          configureInquiry();
          updateInquiryBadge();
        }
      }
    );

    root.addEventListener(
      'pageshow',
      ()=>{
        configureInquiry();
        updateInquiryBadge();
      }
    );

    document.addEventListener(
      'visibilitychange',
      ()=>{
        if(
          document.visibilityState===
          'visible'
        ){
          configureInquiry();
          updateInquiryBadge();
        }
      }
    );
  }

  function mount(){
    if(mounted){
      updateInquiryBadge();
      return true;
    }

    state=
      parseState();

    detail=
      root.DreamlandDetail;

    pricing=
      root.DreamlandPricingPolicy;

    inquiry=
      root.DreamlandInquiry;

    if(
      !state||
      !detail||
      !pricing||
      !inquiry
    ){
      return false;
    }

    scentMap=
      new Map(
        (
          state.scents||
          []
        )
          .map(
            scent=>[
              scent.id,
              scent
            ]
          )
      );

    currentLanguage=
      normalizeLanguage(
        readStorage(
          state.storage
            .languageKey
        ),
        state.defaultLanguage||
          'en',
        Object.keys(
          state.languages
        )
      );

    configureDetail();
    configureInquiry();
    bindEvents();

    applyLanguage(
      currentLanguage,
      {
        persist:true
      }
    );

    mounted=true;

    return true;
  }

  root.DreamlandPdpRuntime=
    Object.freeze({
      version:VERSION,
      id:RUNTIME_ID,
      normalizeLanguage,
      inquiryCount,
      mount,
      render,
      applyLanguage,
      updateInquiryBadge,
      addToInquiry
    });

  if(
    typeof document!==
    'undefined'
  ){
    if(
      document.readyState===
      'loading'
    ){
      document.addEventListener(
        'DOMContentLoaded',
        mount,
        {
          once:true
        }
      );
    }else{
      mount();
    }
  }
})(
  typeof globalThis!==
    'undefined'
    ? globalThis
    : this
);

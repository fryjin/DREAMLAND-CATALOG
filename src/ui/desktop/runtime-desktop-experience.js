(function(root){
  'use strict';

  if(root.DreamlandDesktopExperience){
    return;
  }

  const VERSION='B7-00B.3D';
  const BREAKPOINT='(min-width: 1024px)';

  let config=null;
  let rootElement=null;
  let mediaQuery=null;
  let desktopMounted=false;
  let desktopReadySignaled=false;
  let currentScreen='home';
  let mode='mobile';

  function localizedContent(){
    const lang=
      String(
        config?.language?.()||
        'en'
      );

    const languages=
      config?.siteContent
        ?.languages||
      {};

    return (
      languages[lang]||
      languages.en||
      languages.zh||
      {}
    );
  }

  function languageNames(){
    return (
      config?.languageNames?.()||
      {}
    );
  }

  /*
   * B7-00B.4A R1.1 — presentation-only language hook.
   * Typography needs a stable locale selector without reaching into Mobile DOM.
   */
  function syncPresentationLanguage(){
    if(
      !rootElement||
      !config
    ){
      return;
    }

    const requested=
      String(
        config.language?.()||
        'en'
      );

    const lang=
      ['en','zh','ko']
        .includes(
          requested
        )
        ? requested
        : 'en';

    rootElement.dataset
      .lang=
      lang;

    rootElement.setAttribute(
      'lang',
      lang==='zh'
        ? 'zh-CN'
        : lang
    );
  }

  function inquiryCount(){
    return Math.max(
      0,
      Math.trunc(
        Number(
          config?.inquiryCount?.()||
          0
        )
      )
    );
  }

  function catalogView(){
    return root
      .DreamlandDesktopCatalogView;
  }

  function catalogPresentation(){
    return root
      .DreamlandDesktopCatalog;
  }

  function detailPresentation(){
    return root
      .DreamlandDesktopDetail;
  }

  function customPresentation(){
    return root
      .DreamlandDesktopCustom;
  }

  function inquiryPresentation(){
    return root
      .DreamlandDesktopInquiry;
  }

  function contactPresentation(){
    return root
      .DreamlandDesktopContact;
  }

  function reviewPresentation(){
    return root
      .DreamlandDesktopReview;
  }

  function successPresentation(){
    return root
      .DreamlandDesktopSuccess;
  }

  function ensureStructure(){
    if(
      !rootElement||
      rootElement.dataset
        .desktopStructured===
        'true'
    ){
      return;
    }

    rootElement.innerHTML=`
      <div class="desktop-site-shell">
        <div id="desktopHeaderRoot"></div>

        <main
          class="desktop-site-main"
          id="desktopSiteMain"
        >
          <div id="desktopHomeRoot"></div>
          <div id="desktopCatalogRoot" hidden></div>
          <div id="desktopDetailRoot" hidden></div>
          <div id="desktopCustomRoot" hidden></div>
          <div id="desktopInquiryRoot" hidden></div>
          <div id="desktopContactRoot" hidden></div>
          <div id="desktopReviewRoot" hidden></div>
          <div id="desktopSuccessRoot" hidden></div>
        </main>

        <div id="desktopFooterRoot"></div>
      </div>
    `;

    rootElement.dataset
      .desktopStructured=
      'true';
  }

  function scrollCatalogTop(){
    const catalogRoot=
      rootElement?.querySelector(
        '#desktopCatalogRoot'
      );

    const browseBar=
      catalogRoot?.querySelector?.(
        '.desktop-catalog-browse-bar'
      );

    const target=
      browseBar||
      catalogRoot;

    const top=
      Math.max(
        0,
        (
          target
            ?.getBoundingClientRect?.()
            .top||
          0
        )+
        (
          root.scrollY||
          0
        )-
        84
      );

    catalogView()
      ?.setScrollY?.(
        top
      );

    root.scrollTo?.({
      top,
      behavior:'smooth'
    });
  }

  function refreshCatalog(options={}){
    catalogPresentation()
      ?.refresh?.(
        options
      );
  }

  function syncCanonicalSeries(scope){
    if(
      scope&&
      scope!=='all'
    ){
      config.actions
        ?.selectCatalogSeries?.(
          scope
        );
    }
  }

  function enterCatalog(
    scope='all',
    {
      fresh=true,
      navigate=true
    }={}
  ){
    const view=
      catalogView();

    if(view){
      if(fresh){
        view.reset({
          scope
        });
      }else{
        view.setScope(
          scope
        );
      }
    }

    syncCanonicalSeries(
      scope
    );

    refreshCatalog();

    if(navigate){
      config.actions
        ?.navigate?.(
          'catalog'
        );
    }
  }

  function navigateDesktop(screen){
    if(screen==='catalog'){
      enterCatalog(
        'all',
        {
          fresh:true,
          navigate:true
        }
      );

      return;
    }

    config.actions
      ?.navigate?.(
        screen
      );
  }

  function openSeriesDesktop(series){
    const scope=
      String(
        series||
        'all'
      );

    const view=
      catalogView();

    view?.reset?.({
      scope
    });

    syncCanonicalSeries(
      scope
    );

    refreshCatalog();

    config.actions
      ?.openSeries?.(
        scope
      );
  }

  function configurePresentations(){
    const shell=
      root.DreamlandDesktopShell;

    const home=
      root.DreamlandDesktopHome;

    const view=
      catalogView();

    const catalog=
      catalogPresentation();

    const detail=
      detailPresentation();

    const custom=
      customPresentation();

    const inquiry=
      inquiryPresentation();

    const contact=
      contactPresentation();

    const review=
      reviewPresentation();

    const success=
      successPresentation();

    if(
      !shell||
      !home||
      !view||
      !catalog||
      !detail||
      !custom||
      !inquiry||
      !contact||
      !review||
      !success
    ){
      throw new Error(
        'Desktop Shell/Home/Catalog/Detail/Custom/Inquiry/Contact/Review/Success runtimes must load before Desktop Experience.'
      );
    }

    view.configure({
      products:
        config.products,

      seriesMeta:
        config.seriesMeta,

      batchSize:24,

      productName:
        config.productName,

      productPriceValue:
        config.productPriceValue,

      productMoq:
        config.productMoq
    });

    shell.configure({
      content:
        localizedContent,
      language:
        config.language,
      languageNames,
      actions:{
        navigate:
          navigateDesktop,

        chooseLanguage:
          lang=>
            config.actions
              ?.chooseLanguage?.(
                lang
              ),

        openSeries:
          openSeriesDesktop,

        privacy:
          ()=>
            config.actions
              ?.privacy?.()
      }
    });

    home.configure({
      content:
        localizedContent,

      homeConfig:
        config.siteContent
          ?.home||
        {},

      products:
        config.products,

      seriesMeta:
        config.seriesMeta,

      seriesLabel:
        config.seriesLabel,

      productName:
        config.productName,

      productCover:
        config.productCover,

      productAngle:
        config.productAngle,

      productDetail:
        config.productDetail,

      productPrice:
        config.productPrice,

      productMoq:
        config.productMoq,

      inquiryCount,

      media:
        config.media,

      actions:{
        navigate:
          navigateDesktop,

        openSeries:
          openSeriesDesktop,

        openProduct:
          id=>
            config.actions
              ?.openProduct?.(
                id
              )
      }
    });

    detail.configure({
      content:
        localizedContent,

      language:
        config.language,

      viewModel:
        ()=>config.detailState
          ?.buildViewModel?.()||
          {
            empty:true
          },

      seriesLabel:
        config.seriesLabel,

      productName:
        config.productName,

      productDescription:
        config.productDescription,

      productCover:
        config.productCover,

      productImages:
        config.productImages,

      productPrice:
        config.productPrice,

      choiceLabel:
        config.choiceLabel,

      scentDisplayText:
        config.scentDisplayText,

      sizeDimensions:
        config.sizeDimensions,

      optionPreview:
        config.optionPreview,

      packSurcharge:
        config.packSurcharge,

      money:
        config.money,

      qtyUnit:
        config.qtyUnit,

      media:
        config.media,

      actions:{
        back:
          ()=>config.actions
            ?.detailBack?.(),

        setOption:
          (
            key,
            value
          )=>
            config.detailState
              ?.setOption?.(
                key,
                value
              ),

        setScent:
          scentId=>
            config.detailState
              ?.setScent?.(
                scentId
              ),

        setQuantity:
          value=>{
            const result=
              config.detailState
                ?.setQuantity?.(
                  value
                )||
              null;

            config.actions
              ?.detailQuantityFeedback?.(
                result
              );

            return result;
          },

        adjustQuantity:
          delta=>
            config.detailState
              ?.adjustQuantity?.(
                delta
              ),

        addInquiry:
          ()=>{
            config.actions
              ?.addConfiguredProduct?.();

            syncInquiry();
          },

        customProject:
          ()=>config.actions
            ?.navigate?.(
              'custom'
            )
      }
    });

    custom.configure({
      content:
        localizedContent,

      feature:
        config.customState,

      seriesLabel:
        config.seriesLabel,

      scentDisplayText:
        config.scentDisplayText,

      actions:{
        addIntent:
          draft=>
            config.actions
              ?.addCustomIntent?.(
                draft
              ),

        syncInquiry,

        explore:
          ()=>enterCatalog(
            'all',
            {
              fresh:true,
              navigate:true
            }
          ),

        review:
          ()=>config.actions
            ?.navigate?.(
              'inquiry'
            )
      }
    });

    inquiry.configure({
      content:
        localizedContent,

      viewModel:
        ()=>config.inquiryState
          ?.buildViewModel?.()||
          {
            empty:true,
            items:[],
            summary:{
              itemCount:0,
              productCount:0,
              customCount:0,
              productQuantity:0,
              estimatedTotal:0
            }
          },

      productName:
        config.productName,

      seriesLabel:
        config.seriesLabel,

      choiceLabel:
        config.choiceLabel,

      itemScentLabel:
        config.itemScentLabel,

      itemMoq:
        config.itemMoq,

      money:
        config.money,

      qtyUnit:
        config.qtyUnit,

      actions:{
        adjustQuantity:
          (
            id,
            delta
          )=>
            config.actions
              ?.adjustInquiryQuantity?.(
                id,
                delta
              ),

        setQuantity:
          (
            id,
            value
          )=>
            config.actions
              ?.setInquiryQuantity?.(
                id,
                value
              ),

        remove:
          id=>
            config.actions
              ?.removeInquiryItem?.(
                id
              ),

        edit:
          id=>
            config.actions
              ?.editInquiryItem?.(
                id
              ),

        clear:
          ()=>config.actions
            ?.clearInquiryDesktop?.(),

        continue:
          ()=>config.actions
            ?.continueInquiry?.(),

        explore:
          ()=>enterCatalog(
            'all',
            {
              fresh:true,
              navigate:true
            }
          ),

        custom:
          ()=>config.actions
            ?.navigate?.(
              'custom'
            ),

        feedback:
          message=>config.actions
            ?.feedback?.(
              message
            ),

        syncInquiry
      }
    });

    contact.configure({
      content:
        localizedContent,

      feature:
        config.contactState,

      summary:
        ()=>config.inquiryState
          ?.derivedSummary?.()||
          {
            itemCount:0,
            productQuantity:0,
            estimatedTotal:0,
            customCount:0
          },

      money:
        config.money,

      qtyUnit:
        config.qtyUnit,

      actions:{
        back:
          ()=>config.actions
            ?.navigate?.(
              'inquiry'
            ),

        continue:
          contactValue=>
            config.actions
              ?.continueContact?.(
                contactValue
              )
      }
    });

    review.configure({
      content:
        localizedContent,

      projection:
        ()=>config.actions
          ?.reviewProjection?.()||
          {},

      riskState:
        ()=>config.actions
          ?.riskState?.()||
          {},

      actions:{
        editContact:
          ()=>config.actions
            ?.navigate?.(
              'contact'
            ),

        editInquiry:
          ()=>config.actions
            ?.navigate?.(
              'inquiry'
            ),

        privacy:
          ()=>config.actions
            ?.privacy?.(),

        privacyChanged:
          accepted=>config.actions
            ?.privacyChanged?.(
              accepted
            ),

        submit:
          accepted=>config.actions
            ?.submitInquiryDesktop?.(
              accepted
            )
      }
    });

    success.configure({
      content:
        localizedContent,

      lastSubmission:
        ()=>config.actions
          ?.lastSubmission?.()||
          {},

      locale:
        ()=>config.actions
          ?.locale?.(),

      actions:{
        explore:
          ()=>enterCatalog(
            'all',
            {
              fresh:true,
              navigate:true
            }
          ),

        custom:
          ()=>config.actions
            ?.navigate?.(
              'custom'
            )
      }
    });

    catalog.configure({
      content:
        localizedContent,

      viewModel:
        ()=>view
          .buildViewModel(),

      seriesLabel:
        config.seriesLabel,

      productName:
        config.productName,

      productCover:
        config.productCover,

      productPrice:
        config.productPrice,

      productMoq:
        config.productMoq,

      inquiryCount,

      afterRender:
        config.catalogAfterRender,

      actions:{
        setScope:
          scope=>{
            view.setScope(
              scope
            );

            syncCanonicalSeries(
              scope
            );

            refreshCatalog();

            scrollCatalogTop();
          },

        setQuery:
          query=>{
            view.setQuery(
              query
            );

            refreshCatalog({
              preserveSearchFocus:true,
              preserveScroll:true
            });
          },

        setSizes:
          sizes=>{
            view.setSizes(
              sizes
            );

            refreshCatalog();

            scrollCatalogTop();
          },

        setSort:
          sort=>{
            view.setSort(
              sort
            );

            refreshCatalog();

            scrollCatalogTop();
          },

        loadMore:
          ()=>{
            view.setScrollY(
              root.scrollY||
              0
            );

            view.loadMore();

            refreshCatalog({
              preserveScroll:true
            });
          },

        clearBrowse:
          ()=>{
            const scope=
              view.snapshot()
                .scope||
              'all';

            view.reset({
              scope
            });

            syncCanonicalSeries(
              scope
            );

            refreshCatalog();

            scrollCatalogTop();
          },

        openProduct:
          id=>{
            view.setScrollY(
              root.scrollY||
              0
            );

            config.actions
              ?.openProduct?.(
                id
              );
          },

        reviewInquiry:
          ()=>
            config.actions
              ?.navigate?.(
                'inquiry'
              )
      }
    });
  }

  function signalDesktopReady(){
    if(
      desktopReadySignaled||
      !desktopMounted||
      mode!=='desktop'
    ){
      return;
    }

    const dispatch=()=>{
      if(desktopReadySignaled){
        return;
      }

      desktopReadySignaled=true;

      root.document
        ?.documentElement
        ?.classList
        ?.remove(
          'dreamland-desktop-boot'
        );

      root.document
        ?.documentElement
        ?.setAttribute(
          'data-dreamland-release',
          String(
            root.DREAMLAND_RELEASE||
            ''
          )
        );

      root.dispatchEvent(
        new CustomEvent(
          'dreamland:desktop-ready',
          {
            detail:{
              version:VERSION,
              screen:currentScreen
            }
          }
        )
      );
    };

    if(
      typeof root.requestAnimationFrame===
      'function'
    ){
      root.requestAnimationFrame(
        ()=>
          root.requestAnimationFrame(
            dispatch
          )
      );
    }else{
      root.setTimeout?.(
        dispatch,
        0
      );
    }
  }

  function mountDesktop(){
    if(desktopMounted){
      return;
    }

    ensureStructure();
    syncPresentationLanguage();
    configurePresentations();

    root.DreamlandDesktopShell
      .mount({
        header:
          rootElement.querySelector(
            '#desktopHeaderRoot'
          ),
        footer:
          rootElement.querySelector(
            '#desktopFooterRoot'
          )
      });

    root.DreamlandDesktopHome
      .mount(
        rootElement.querySelector(
          '#desktopHomeRoot'
        )
      );

    root.DreamlandDesktopCatalog
      .mount(
        rootElement.querySelector(
          '#desktopCatalogRoot'
        )
      );

    root.DreamlandDesktopDetail
      .mount(
        rootElement.querySelector(
          '#desktopDetailRoot'
        )
      );

    root.DreamlandDesktopCustom
      .mount(
        rootElement.querySelector(
          '#desktopCustomRoot'
        )
      );

    root.DreamlandDesktopInquiry
      .mount(
        rootElement.querySelector(
          '#desktopInquiryRoot'
        )
      );

    root.DreamlandDesktopContact
      .mount(
        rootElement.querySelector(
          '#desktopContactRoot'
        )
      );

    root.DreamlandDesktopReview
      .mount(
        rootElement.querySelector(
          '#desktopReviewRoot'
        )
      );

    root.DreamlandDesktopSuccess
      .mount(
        rootElement.querySelector(
          '#desktopSuccessRoot'
        )
      );

    desktopMounted=true;

    syncInquiry();
    syncScreen(
      currentScreen
    );

    signalDesktopReady();
  }

  function applyMode(){
    const desktop=
      Boolean(
        mediaQuery?.matches
      );

    mode=
      desktop
        ? 'desktop'
        : 'mobile';

    document.body
      .classList
      .toggle(
        'desktop-experience-ready',
        desktop
      );

    document.body.dataset
      .experienceMode=
      mode;

    if(!rootElement){
      return;
    }

    rootElement.hidden=
      !desktop;

    rootElement.setAttribute(
      'aria-hidden',
      desktop
        ? 'false'
        : 'true'
    );

    const app=
      document.getElementById(
        'app'
      );

    if(!desktop){
      app?.setAttribute(
        'aria-hidden',
        'false'
      );

      return;
    }

    mountDesktop();
    syncScreen(
      currentScreen
    );
  }

  function configure(options={}){
    rootElement=
      options.root||
      document.getElementById(
        'desktopExperience'
      );

    config={
      siteContent:
        options.siteContent||{},

      products:
        Array.isArray(
          options.products
        )
          ? options.products
          : [],

      seriesMeta:
        options.seriesMeta||{},

      language:
        typeof options.language==='function'
          ? options.language
          : ()=>'en',

      languageNames:
        typeof options.languageNames==='function'
          ? options.languageNames
          : ()=>({}),

      seriesLabel:
        options.seriesLabel,

      productName:
        options.productName,

      productCover:
        options.productCover,

      productAngle:
        options.productAngle,

      productDetail:
        options.productDetail,

      productDescription:
        options.productDescription,

      productImages:
        options.productImages,

      detailState:
        options.detailState,

      customState:
        options.customState,

      inquiryState:
        options.inquiryState,

      contactState:
        options.contactState,

      itemScentLabel:
        options.itemScentLabel,

      itemMoq:
        options.itemMoq,

      choiceLabel:
        options.choiceLabel,

      scentDisplayText:
        options.scentDisplayText,

      sizeDimensions:
        options.sizeDimensions,

      optionPreview:
        options.optionPreview,

      packSurcharge:
        options.packSurcharge,

      money:
        options.money,

      qtyUnit:
        options.qtyUnit,

      productPrice:
        options.productPrice,

      productPriceValue:
        typeof options.productPriceValue==='function'
          ? options.productPriceValue
          : ()=>0,

      productMoq:
        options.productMoq,

      inquiryCount:
        typeof options.inquiryCount==='function'
          ? options.inquiryCount
          : ()=>0,

      media:
        typeof options.media==='function'
          ? options.media
          : ()=>null,

      catalogAfterRender:
        typeof options.catalogAfterRender==='function'
          ? options.catalogAfterRender
          : ()=>{},

      actions:
        options.actions||
        {}
    };

    return snapshot();
  }

  function mount(){
    if(
      !rootElement||
      !config
    ){
      return false;
    }

    mediaQuery=
      root.matchMedia?.(
        BREAKPOINT
      )||
      {
        matches:false,
        addEventListener(){}
      };

    mediaQuery.addEventListener?.(
      'change',
      applyMode
    );

    applyMode();

    return true;
  }

  function syncScreen(screen){
    const next=
      String(
        screen||
        'home'
      );

    if(
      mode==='desktop'&&
      currentScreen==='catalog'&&
      next!=='catalog'
    ){
      catalogView()
        ?.setScrollY?.(
          root.scrollY||
          0
        );
    }

    currentScreen=next;

    if(
      mode!=='desktop'||
      !rootElement
    ){
      return;
    }

    syncPresentationLanguage();

    document.body.dataset
      .desktopScreen=
      currentScreen;

    const home=
      currentScreen==='home';

    const catalog=
      currentScreen==='catalog';

    const detail=
      currentScreen==='detail';

    const custom=
      currentScreen==='custom';

    const inquiry=
      currentScreen==='inquiry';

    const contact=
      currentScreen==='contact';

    const review=
      currentScreen==='preview';

    const success=
      currentScreen==='success';

    /*
     * Keep the established Home/Catalog aggregate marker intact for the
     * historical 3A gate. Detail (3B), Custom (3C), and the Inquiry Closure
     * screens (3D) are explicit successor Desktop-owned screens.
     */
    const desktopManaged=
      home||
      catalog;

    const detailManaged=
      detail;

    const customManaged=
      custom;

    const inquiryManaged=
      inquiry||
      contact||
      review||
      success;

    rootElement.classList
      .toggle(
        'is-home',
        home
      );

    rootElement.classList
      .toggle(
        'is-catalog',
        catalog
      );

    rootElement.classList
      .toggle(
        'is-detail',
        detail
      );

    rootElement.classList
      .toggle(
        'is-custom',
        custom
      );

    rootElement.classList
      .toggle(
        'is-inquiry',
        inquiry
      );

    rootElement.classList
      .toggle(
        'is-contact',
        contact
      );

    rootElement.classList
      .toggle(
        'is-review',
        review
      );

    rootElement.classList
      .toggle(
        'is-success',
        success
      );

    root.DreamlandDesktopShell
      ?.setScreen?.(
        currentScreen
      );

    const homeRoot=
      rootElement.querySelector(
        '#desktopHomeRoot'
      );

    const catalogRoot=
      rootElement.querySelector(
        '#desktopCatalogRoot'
      );

    const detailRoot=
      rootElement.querySelector(
        '#desktopDetailRoot'
      );

    const customRoot=
      rootElement.querySelector(
        '#desktopCustomRoot'
      );

    const inquiryRoot=
      rootElement.querySelector(
        '#desktopInquiryRoot'
      );

    const contactRoot=
      rootElement.querySelector(
        '#desktopContactRoot'
      );

    const reviewRoot=
      rootElement.querySelector(
        '#desktopReviewRoot'
      );

    const successRoot=
      rootElement.querySelector(
        '#desktopSuccessRoot'
      );

    if(homeRoot){
      homeRoot.hidden=
        !home;
    }

    if(catalogRoot){
      catalogRoot.hidden=
        !catalog;
    }

    if(detailRoot){
      detailRoot.hidden=
        !detail;
    }

    if(customRoot){
      customRoot.hidden=
        !custom;
    }

    if(inquiryRoot){
      inquiryRoot.hidden=
        !inquiry;
    }

    if(contactRoot){
      contactRoot.hidden=
        !contact;
    }

    if(reviewRoot){
      reviewRoot.hidden=
        !review;
    }

    if(successRoot){
      successRoot.hidden=
        !success;
    }

    const app=
      document.getElementById(
        'app'
      );

    app?.setAttribute(
      'aria-hidden',
      (
        desktopManaged||
        detailManaged||
        customManaged||
        inquiryManaged
      )
        ? 'true'
        : 'false'
    );

    if(home){
      root.DreamlandDesktopHome
        ?.syncInquiry?.();
    }

    if(detail){
      root.DreamlandDesktopDetail
        ?.refresh?.();

      root.requestAnimationFrame?.(
        ()=>
          root.scrollTo?.(
            0,
            0
          )
      );
    }

    if(custom){
      root.DreamlandDesktopCustom
        ?.refresh?.();

      root.requestAnimationFrame?.(
        ()=>
          root.scrollTo?.(
            0,
            0
          )
      );
    }

    if(inquiry){
      root.DreamlandDesktopInquiry
        ?.refresh?.();
    }

    if(contact){
      root.DreamlandDesktopContact
        ?.refresh?.();
    }

    if(review){
      root.DreamlandDesktopReview
        ?.refresh?.();
    }

    if(success){
      root.DreamlandDesktopSuccess
        ?.refresh?.();
    }

    if(
      inquiry||
      contact||
      review||
      success
    ){
      root.requestAnimationFrame?.(
        ()=>
          root.scrollTo?.(
            0,
            0
          )
      );
    }

    if(catalog){
      refreshCatalog();

      const restoreY=
        catalogView()
          ?.snapshot?.()
          .scrollY||
        0;

      root.requestAnimationFrame?.(
        ()=>
          root.scrollTo?.(
            0,
            restoreY
          )
      );
    }
  }

  function refresh(){
    if(
      mode!=='desktop'||
      !desktopMounted
    ){
      return;
    }

    syncPresentationLanguage();

    root.DreamlandDesktopShell
      ?.refresh?.();

    root.DreamlandDesktopHome
      ?.refresh?.();

    if(currentScreen==='detail'){
      root.DreamlandDesktopDetail
        ?.refresh?.({
          preserveScroll:true
        });
    }

    if(currentScreen==='custom'){
      root.DreamlandDesktopCustom
        ?.refresh?.({
          preserveScroll:true
        });
    }

    if(currentScreen==='inquiry'){
      root.DreamlandDesktopInquiry
        ?.refresh?.();
    }

    if(currentScreen==='contact'){
      root.DreamlandDesktopContact
        ?.refresh?.({
          preserveScroll:true
        });
    }

    if(currentScreen==='preview'){
      root.DreamlandDesktopReview
        ?.refresh?.({
          preserveScroll:true
        });
    }

    if(currentScreen==='success'){
      root.DreamlandDesktopSuccess
        ?.refresh?.();
    }

    if(currentScreen==='catalog'){
      const restoreY=
        catalogView()
          ?.snapshot?.()
          .scrollY||
        root.scrollY||
        0;

      refreshCatalog({
        preserveScroll:true
      });

      root.requestAnimationFrame?.(
        ()=>
          root.scrollTo?.(
            0,
            restoreY
          )
      );
    }

    syncScreen(
      currentScreen
    );
  }

  function syncInquiry(){
    if(!desktopMounted){
      return;
    }

    const count=
      inquiryCount();

    root.DreamlandDesktopShell
      ?.setInquiryCount?.(
        count
      );

    root.DreamlandDesktopHome
      ?.syncInquiry?.();

    root.DreamlandDesktopDetail
      ?.syncInquiry?.();

    root.DreamlandDesktopCustom
      ?.syncInquiry?.();

    root.DreamlandDesktopInquiry
      ?.syncInquiry?.();

    root.DreamlandDesktopContact
      ?.syncInquiry?.();

    root.DreamlandDesktopReview
      ?.syncInquiry?.();

    if(
      currentScreen===
      'catalog'
    ){
      refreshCatalog({
        preserveScroll:true
      });
    }
  }

  function setCatalogScope(
    scope,
    {
      fresh=true
    }={}
  ){
    const view=
      catalogView();

    if(!view){
      return false;
    }

    if(fresh){
      view.reset({
        scope
      });
    }else{
      view.setScope(
        scope
      );
    }

    syncCanonicalSeries(
      scope
    );

    if(
      mode==='desktop'&&
      currentScreen==='catalog'
    ){
      refreshCatalog();
    }

    return true;
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      breakpoint:BREAKPOINT,
      configured:Boolean(config),
      desktopMounted,
      desktopReadySignaled,
      mode,
      screen:currentScreen,
      inquiryCount:
        inquiryCount(),
      catalog:
        catalogView()
          ?.snapshot?.()||
        null,
      detail:
        detailPresentation()
          ?.snapshot?.()||
        null,
      custom:
        customPresentation()
          ?.snapshot?.()||
        null,
      inquiry:
        inquiryPresentation()
          ?.snapshot?.()||
        null,
      contact:
        contactPresentation()
          ?.snapshot?.()||
        null,
      review:
        reviewPresentation()
          ?.snapshot?.()||
        null,
      success:
        successPresentation()
          ?.snapshot?.()||
        null
    });
  }

  root.DreamlandDesktopExperience=
    Object.freeze({
      version:VERSION,
      breakpoint:BREAKPOINT,
      configure,
      mount,
      syncScreen,
      refresh,
      syncInquiry,
      setCatalogScope,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

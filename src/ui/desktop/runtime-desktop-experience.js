(function(root){
  'use strict';

  if(root.DreamlandDesktopExperience){
    return;
  }

  const VERSION='B7-00B.1';
  const BREAKPOINT='(min-width: 1024px)';

  let config=null;
  let rootElement=null;
  let mediaQuery=null;
  let desktopMounted=false;
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

    const top=
      Math.max(
        0,
        (
          catalogRoot
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

    if(
      !shell||
      !home||
      !view||
      !catalog
    ){
      throw new Error(
        'Desktop Shell/Home/Catalog runtimes must load before Desktop Experience.'
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

  function mountDesktop(){
    if(desktopMounted){
      return;
    }

    ensureStructure();
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

    desktopMounted=true;

    syncInquiry();
    syncScreen(
      currentScreen
    );
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

    document.body.dataset
      .desktopScreen=
      currentScreen;

    const home=
      currentScreen==='home';

    const catalog=
      currentScreen==='catalog';

    const desktopManaged=
      home||
      catalog;

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

    if(homeRoot){
      homeRoot.hidden=
        !home;
    }

    if(catalogRoot){
      catalogRoot.hidden=
        !catalog;
    }

    const app=
      document.getElementById(
        'app'
      );

    app?.setAttribute(
      'aria-hidden',
      desktopManaged
        ? 'true'
        : 'false'
    );

    if(home){
      root.DreamlandDesktopHome
        ?.syncInquiry?.();
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

    root.DreamlandDesktopShell
      ?.refresh?.();

    root.DreamlandDesktopHome
      ?.refresh?.();

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
      mode,
      screen:currentScreen,
      inquiryCount:
        inquiryCount(),
      catalog:
        catalogView()
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

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
        </main>

        <div id="desktopFooterRoot"></div>
      </div>
    `;

    rootElement.dataset
      .desktopStructured=
      'true';
  }

  function configurePresentations(){
    const shell=
      root.DreamlandDesktopShell;

    const home=
      root.DreamlandDesktopHome;

    if(
      !shell||
      !home
    ){
      throw new Error(
        'Desktop Shell/Home runtimes must load before Desktop Experience.'
      );
    }

    shell.configure({
      content:
        localizedContent,
      language:
        config.language,
      languageNames,
      actions:{
        navigate:
          screen=>
            config.actions
              ?.navigate?.(
                screen
              ),
        chooseLanguage:
          lang=>
            config.actions
              ?.chooseLanguage?.(
                lang
              ),
        openSeries:
          series=>
            config.actions
              ?.openSeries?.(
                series
              ),
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
          screen=>
            config.actions
              ?.navigate?.(
                screen
              ),
        openSeries:
          series=>
            config.actions
              ?.openSeries?.(
                series
              ),
        openProduct:
          id=>
            config.actions
              ?.openProduct?.(
                id
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
        Array.isArray(options.products)
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
      actions:
        options.actions||{}
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
    currentScreen=
      String(
        screen||
        'home'
      );

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

    rootElement.classList
      .toggle(
        'is-home',
        home
      );

    root.DreamlandDesktopShell
      ?.setScreen?.(
        currentScreen
      );

    const app=
      document.getElementById(
        'app'
      );

    app?.setAttribute(
      'aria-hidden',
      home
        ? 'true'
        : 'false'
    );

    if(home){
      root.DreamlandDesktopHome
        ?.syncInquiry?.();
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
        inquiryCount()
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
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

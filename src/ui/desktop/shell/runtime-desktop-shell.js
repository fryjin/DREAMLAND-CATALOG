(function(root){
  'use strict';

  if(root.DreamlandDesktopShell){
    return;
  }

  const VERSION='B7-00B.1';

  const screenMap=Object.freeze({
    detail:'catalog',
    contact:'inquiry',
    preview:'inquiry',
    success:'inquiry'
  });

  const fallbackLanguages=Object.freeze({
    zh:{label:'中文',short:'ZH'},
    en:{label:'English',short:'EN'},
    ko:{label:'한국어',short:'KO'}
  });

  let config=null;
  let headerRoot=null;
  let footerRoot=null;
  let mounted=false;
  let activeScreen='home';
  let inquiryCount=0;
  let languageMenuOpen=false;
  let documentClickHandler=null;
  let documentKeyHandler=null;
  let scrollHandler=null;

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function localized(){
    return (
      config?.content?.()||
      {}
    );
  }

  function language(){
    return String(
      config?.language?.()||
      'en'
    );
  }

  function languageMap(){
    return (
      config?.languageNames?.()||
      fallbackLanguages
    );
  }

  function normalizedScreen(value){
    return (
      screenMap[value]||
      value||
      'home'
    );
  }

  function inquiryLabel(){
    return (
      localized()
        ?.navigation
        ?.inquiry||
      'Inquiry'
    );
  }

  function inquiryText(){
    const label=
      inquiryLabel();

    return inquiryCount>0
      ? `${label} ${String(inquiryCount).padStart(2,'0')}`
      : label;
  }

  function headerHtml(){
    const content=
      localized();
    const nav=
      content.navigation||{};
    const currentLanguage=
      language();
    const languages=
      languageMap();
    const languageEntry=
      languages[currentLanguage]||
      fallbackLanguages[currentLanguage]||
      fallbackLanguages.en;
    const normalized=
      normalizedScreen(
        activeScreen
      );

    return `
      <header
        class="desktop-site-header"
        id="desktopSiteHeader"
      >
        <div class="desktop-site-header__inner">
          <button
            class="desktop-brand"
            type="button"
            data-desktop-shell-action="home"
            aria-label="DREAMLAND Home"
          >
            DREAMLAND
          </button>

          <nav
            class="desktop-site-nav"
            aria-label="Primary"
          >
            <button
              class="desktop-site-nav__item ${normalized==='catalog'?'is-active':''}"
              type="button"
              data-desktop-shell-action="catalog"
              ${normalized==='catalog'?'aria-current="page"':''}
            >
              ${escapeHtml(nav.collection||'Collection')}
            </button>

            <button
              class="desktop-site-nav__item ${normalized==='custom'?'is-active':''}"
              type="button"
              data-desktop-shell-action="custom"
              ${normalized==='custom'?'aria-current="page"':''}
            >
              ${escapeHtml(nav.custom||'Custom')}
            </button>
          </nav>

          <div class="desktop-site-header__actions">
            <div class="desktop-language">
              <button
                class="desktop-language__toggle"
                type="button"
                data-desktop-shell-action="language-toggle"
                aria-haspopup="menu"
                aria-expanded="${languageMenuOpen?'true':'false'}"
                aria-label="${escapeHtml(nav.language||'Language')}"
              >
                <span
                  class="desktop-language__globe"
                  aria-hidden="true"
                >
                  ·
                </span>

                <span>
                  ${escapeHtml(languageEntry.short||languageEntry.label||currentLanguage.toUpperCase())}
                </span>

                <span
                  class="desktop-language__caret"
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>

              <div
                class="desktop-language__menu ${languageMenuOpen?'is-open':''}"
                role="menu"
                aria-label="${escapeHtml(nav.language||'Language')}"
              >
                ${['en','zh','ko'].map(key=>{
                  const entry=
                    languages[key]||
                    fallbackLanguages[key];

                  return `
                    <button
                      class="desktop-language__option ${key===currentLanguage?'is-active':''}"
                      type="button"
                      role="menuitemradio"
                      aria-checked="${key===currentLanguage?'true':'false'}"
                      data-desktop-language="${key}"
                    >
                      <span>
                        ${escapeHtml(entry.label||key)}
                      </span>

                      <small>
                        ${escapeHtml(entry.short||key.toUpperCase())}
                      </small>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <button
              class="desktop-inquiry-button ${normalized==='inquiry'?'is-active':''}"
              type="button"
              data-desktop-shell-action="inquiry"
              ${normalized==='inquiry'?'aria-current="page"':''}
            >
              ${escapeHtml(inquiryText())}
            </button>
          </div>
        </div>
      </header>
    `;
  }

  function footerHtml(){
    const footer=
      localized().footer||{};
    const currentLanguage=
      language();

    return `
      <footer
        class="desktop-site-footer"
        id="desktopSiteFooter"
      >
        <div class="desktop-container">
          <div class="desktop-site-footer__top">
            <div>
              <div class="desktop-footer-brand">
                DREAMLAND
              </div>

              <p class="desktop-footer-description">
                ${escapeHtml(footer.description||'')}
              </p>
            </div>

            <div class="desktop-footer-group">
              <h3>
                ${escapeHtml(footer.explore||'Explore')}
              </h3>

              <div class="desktop-footer-links">
                <button
                  class="desktop-footer-link"
                  type="button"
                  data-desktop-shell-action="catalog"
                >
                  ${escapeHtml(footer.collection||'Collection')}
                </button>

                <button
                  class="desktop-footer-link"
                  type="button"
                  data-desktop-series="masterpiece"
                >
                  ${escapeHtml(footer.masterpiece||'Masterpiece')}
                </button>

                <button
                  class="desktop-footer-link"
                  type="button"
                  data-desktop-series="advanced"
                >
                  ${escapeHtml(footer.advanced||'Advanced')}
                </button>
              </div>
            </div>

            <div class="desktop-footer-group">
              <h3>
                ${escapeHtml(footer.projects||'Projects')}
              </h3>

              <div class="desktop-footer-links">
                <button
                  class="desktop-footer-link"
                  type="button"
                  data-desktop-shell-action="custom"
                >
                  ${escapeHtml(footer.custom||'Custom')}
                </button>

                <button
                  class="desktop-footer-link"
                  type="button"
                  data-desktop-shell-action="inquiry"
                >
                  ${escapeHtml(footer.inquiry||'Inquiry')}
                </button>
              </div>
            </div>

            <div class="desktop-footer-group">
              <h3>
                ${escapeHtml(footer.language||'Language')}
              </h3>

              <div class="desktop-footer-links">
                ${[
                  ['en','English'],
                  ['zh','中文'],
                  ['ko','한국어']
                ].map(([key,label])=>`
                  <button
                    class="desktop-footer-link ${key===currentLanguage?'is-current':''}"
                    type="button"
                    data-desktop-language="${key}"
                  >
                    ${escapeHtml(label)}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="desktop-footer-group">
              <h3>
                ${escapeHtml(footer.legal||'Legal')}
              </h3>

              <div class="desktop-footer-links">
                <button
                  class="desktop-footer-link"
                  type="button"
                  data-desktop-shell-action="privacy"
                >
                  ${escapeHtml(footer.privacy||'Privacy')}
                </button>
              </div>
            </div>
          </div>

          <div class="desktop-footer-bottom">
            ${escapeHtml(footer.copyright||'© DREAMLAND')}
          </div>
        </div>
      </footer>
    `;
  }

  function renderHeader(){
    if(!headerRoot){
      return;
    }

    headerRoot.innerHTML=
      headerHtml();
  }

  function renderFooter(){
    if(!footerRoot){
      return;
    }

    footerRoot.innerHTML=
      footerHtml();
  }

  function render(){
    renderHeader();
    renderFooter();
  }

  function closeLanguage(){
    if(!languageMenuOpen){
      return;
    }

    languageMenuOpen=false;
    renderHeader();
  }

  function toggleLanguage(){
    languageMenuOpen=
      !languageMenuOpen;

    renderHeader();
  }

  function onRootClick(event){
    const languageButton=
      event.target.closest?.(
        '[data-desktop-language]'
      );

    if(languageButton){
      closeLanguage();

      config?.actions
        ?.chooseLanguage?.(
          languageButton.dataset
            .desktopLanguage
        );

      return;
    }

    const seriesButton=
      event.target.closest?.(
        '[data-desktop-series]'
      );

    if(seriesButton){
      closeLanguage();

      config?.actions
        ?.openSeries?.(
          seriesButton.dataset
            .desktopSeries
        );

      return;
    }

    const actionButton=
      event.target.closest?.(
        '[data-desktop-shell-action]'
      );

    if(!actionButton){
      return;
    }

    const action=
      actionButton.dataset
        .desktopShellAction;

    if(action==='language-toggle'){
      event.stopPropagation();
      toggleLanguage();
      return;
    }

    closeLanguage();

    if(action==='home'){
      config?.actions?.navigate?.('home');
      return;
    }

    if(action==='catalog'){
      config?.actions?.navigate?.('catalog');
      return;
    }

    if(action==='custom'){
      config?.actions?.navigate?.('custom');
      return;
    }

    if(action==='inquiry'){
      config?.actions?.navigate?.('inquiry');
      return;
    }

    if(action==='privacy'){
      config?.actions?.privacy?.();
    }
  }

  function installDocumentEvents(){
    if(documentClickHandler){
      return;
    }

    documentClickHandler=
      event=>{
        const languageRoot=
          headerRoot?.querySelector(
            '.desktop-language'
          );

        if(
          languageRoot&&
          !languageRoot.contains(
            event.target
          )
        ){
          closeLanguage();
        }
      };

    documentKeyHandler=
      event=>{
        if(event.key==='Escape'){
          closeLanguage();
        }
      };

    scrollHandler=()=>{
      headerRoot
        ?.querySelector(
          '.desktop-site-header'
        )
        ?.classList
        .toggle(
          'is-scrolled',
          window.scrollY>18
        );
    };

    document.addEventListener(
      'click',
      documentClickHandler
    );

    document.addEventListener(
      'keydown',
      documentKeyHandler
    );

    window.addEventListener(
      'scroll',
      scrollHandler,
      {passive:true}
    );
  }

  function configure(options={}){
    config={
      content:
        typeof options.content==='function'
          ? options.content
          : ()=>({}),
      language:
        typeof options.language==='function'
          ? options.language
          : ()=>'en',
      languageNames:
        typeof options.languageNames==='function'
          ? options.languageNames
          : ()=>fallbackLanguages,
      actions:
        options.actions||{}
    };

    return snapshot();
  }

  function mount({
    header,
    footer
  }={}){
    headerRoot=header||null;
    footerRoot=footer||null;

    if(
      !headerRoot||
      !footerRoot
    ){
      return false;
    }

    if(!mounted){
      headerRoot.addEventListener(
        'click',
        onRootClick
      );

      footerRoot.addEventListener(
        'click',
        onRootClick
      );

      installDocumentEvents();
      mounted=true;
    }

    render();

    return true;
  }

  function setScreen(screen){
    activeScreen=
      String(screen||'home');

    renderHeader();
  }

  function setInquiryCount(count){
    inquiryCount=
      Math.max(
        0,
        Math.trunc(
          Number(count)||0
        )
      );

    renderHeader();
  }

  function refresh(){
    render();
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      mounted,
      screen:activeScreen,
      inquiryCount,
      language:language()
    });
  }

  root.DreamlandDesktopShell=
    Object.freeze({
      version:VERSION,
      configure,
      mount,
      setScreen,
      setInquiryCount,
      refresh,
      closeLanguage,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

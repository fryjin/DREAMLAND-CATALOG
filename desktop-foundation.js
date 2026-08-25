(function(){
  'use strict';

  if(window.DreamlandDesktopFoundation){
    return;
  }

  const VERSION='B7-00B.1';
  const BREAKPOINT='(min-width: 1024px)';

  const languageLabels=Object.freeze({
    zh:'中文',
    en:'English',
    ko:'한국어'
  });

  const navMap=Object.freeze({
    detail:'catalog',
    contact:'inquiry',
    preview:'inquiry',
    success:'inquiry'
  });

  let root=null;
  let languageWrap=null;
  let languageToggle=null;
  let languageMenu=null;
  let initialized=false;

  function currentLanguage(){
    const bodyLang=
      document.body?.dataset?.lang;

    if(
      bodyLang&&
      languageLabels[bodyLang]
    ){
      return bodyLang;
    }

    const htmlLang=
      String(
        document.documentElement?.lang||
        'zh'
      )
        .toLowerCase()
        .split('-')[0];

    return languageLabels[htmlLang]
      ? htmlLang
      : 'zh';
  }

  function text(key,fallback){
    const value=
      window.ui?.(key);

    return (
      value&&
      value!==key
    )
      ? value
      : fallback;
  }

  function normalizedScreen(screen){
    return (
      navMap[screen]||
      screen||
      'home'
    );
  }

  function closeLanguage(){
    languageMenu
      ?.classList
      .remove('show');

    languageToggle
      ?.setAttribute(
        'aria-expanded',
        'false'
      );
  }

  function toggleLanguage(event){
    event?.stopPropagation?.();

    if(!languageMenu){
      return;
    }

    const open=
      !languageMenu
        .classList
        .contains('show');

    closeLanguage();

    if(open){
      languageMenu
        .classList
        .add('show');

      languageToggle
        ?.setAttribute(
          'aria-expanded',
          'true'
        );
    }
  }

  function syncLanguage(){
    const lang=
      currentLanguage();

    const current=
      root?.querySelector(
        '.desktop-language__current'
      );

    if(current){
      current.textContent=
        languageLabels[lang];
    }

    root
      ?.querySelectorAll(
        '[data-desktop-lang]'
      )
      .forEach(option=>{
        const active=
          option.dataset.desktopLang===
          lang;

        option.classList.toggle(
          'is-active',
          active
        );

        option.setAttribute(
          'aria-checked',
          String(active)
        );
      });
  }

  function syncCopy(){
    const copy={
      home:text('home','Home'),
      catalog:text('products','Collection'),
      custom:text('custom','Custom')
    };

    Object.entries(copy)
      .forEach(([key,value])=>{
        root
          ?.querySelectorAll(
            `[data-desktop-copy="${key}"]`
          )
          .forEach(node=>{
            node.textContent=value;
          });
      });
  }

  function syncInquiry(count=0){
    const value=
      Math.max(
        0,
        Math.trunc(
          Number(count)||0
        )
      );

    const label=
      text(
        'inquiry',
        'Inquiry'
      );

    const node=
      root?.querySelector(
        '[data-desktop-inquiry-label]'
      );

    if(node){
      node.textContent=
        value>0
          ? `${label} ${String(value).padStart(2,'0')}`
          : label;
    }

    root
      ?.querySelector(
        '.desktop-inquiry'
      )
      ?.setAttribute(
        'aria-label',
        value>0
          ? `${label} ${value}`
          : label
      );
  }

  function syncNavigation(screen){
    const current=
      normalizedScreen(screen);

    root
      ?.querySelectorAll(
        '[data-desktop-nav]'
      )
      .forEach(item=>{
        const active=
          item.dataset.desktopNav===
          current;

        item.classList.toggle(
          'is-active',
          active
        );

        if(active){
          item.setAttribute(
            'aria-current',
            'page'
          );
        }else{
          item.removeAttribute(
            'aria-current'
          );
        }
      });
  }

  function syncI18n(){
    syncCopy();
    syncLanguage();

    const mobileCount=
      Number(
        document.getElementById(
          'badge'
        )?.textContent||
        0
      );

    syncInquiry(mobileCount);
  }

  function openScreen(screen){
    closeLanguage();
    window.go?.(screen);
  }

  function chooseLanguage(lang){
    closeLanguage();

    if(!languageLabels[lang]){
      return;
    }

    window.chooseLang?.(lang);
  }

  function bind(){
    root
      ?.querySelectorAll(
        '[data-desktop-nav]'
      )
      .forEach(item=>{
        item.addEventListener(
          'click',
          ()=>{
            openScreen(
              item.dataset.desktopNav
            );
          }
        );
      });

    languageToggle
      ?.addEventListener(
        'click',
        toggleLanguage
      );

    root
      ?.querySelectorAll(
        '[data-desktop-lang]'
      )
      .forEach(option=>{
        option.addEventListener(
          'click',
          ()=>{
            chooseLanguage(
              option.dataset.desktopLang
            );
          }
        );
      });

    document.addEventListener(
      'click',
      event=>{
        if(
          languageWrap&&
          !languageWrap.contains(
            event.target
          )
        ){
          closeLanguage();
        }
      }
    );

    document.addEventListener(
      'keydown',
      event=>{
        if(event.key==='Escape'){
          closeLanguage();
        }
      }
    );
  }

  function init(){
    if(initialized){
      return true;
    }

    root=
      document.getElementById(
        'desktopHeader'
      );

    if(!root){
      return false;
    }

    languageWrap=
      root.querySelector(
        '.desktop-language'
      );

    languageToggle=
      root.querySelector(
        '.desktop-language__toggle'
      );

    languageMenu=
      root.querySelector(
        '.desktop-language__menu'
      );

    bind();

    const activeScreen=
      document.querySelector(
        '.screen.active'
      )?.dataset?.screen||
      'home';

    syncNavigation(activeScreen);
    syncI18n();

    initialized=true;
    return true;
  }

  const api=Object.freeze({
    version:VERSION,
    breakpoint:BREAKPOINT,
    init,
    syncNavigation,
    syncInquiry,
    syncI18n,
    closeLanguage
  });

  window.DreamlandDesktopFoundation=
    api;

  if(
    document.readyState===
    'loading'
  ){
    document.addEventListener(
      'DOMContentLoaded',
      init,
      {once:true}
    );
  }else{
    init();
  }
})();

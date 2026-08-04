(function(){
  'use strict';

  if(window.DreamlandStartupLoader){
    return;
  }

  const VERSION='v61';
  const SEEN_KEY=`dreamland-startup-seen-${VERSION}`;
  const ROOT_CLASS='dreamland-booting';
  const LOADER_ID='dreamlandStartup';
  const DATA_PATHS=[
    '/data/products.csv',
    '/data/products.json',
    '/data/shared-assets.csv',
    '/data/scents.csv',
    '/data/series.json',
    '/data/i18n.json',
    '/data/app-config.json'
  ];

  const startedAt=performance.now();
  const reducedMotion=window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  )?.matches===true;

  let seenBefore=false;
  try{
    seenBefore=localStorage.getItem(SEEN_KEY)==='1';
  }catch(_){}

  const minimumDuration=reducedMotion
    ? 120
    : seenBefore
      ? 350
      : 1600;

  const maximumDuration=reducedMotion
    ? 900
    : seenBefore
      ? 1400
      : 3200;

  const copy={
    zh:{
      label:'产品手册',
      preparing:'正在准备产品手册',
      data:'正在载入产品与配置',
      visual:'正在准备首页视觉',
      ready:'准备完成'
    },
    en:{
      label:'PRODUCT CATALOG',
      preparing:'Preparing the product catalog',
      data:'Loading products and options',
      visual:'Preparing the home visual',
      ready:'Ready'
    },
    ko:{
      label:'제품 카탈로그',
      preparing:'제품 카탈로그를 준비하고 있어요',
      data:'제품과 옵션을 불러오고 있어요',
      visual:'홈 화면을 준비하고 있어요',
      ready:'준비가 완료됐어요'
    }
  };

  let language=resolveLanguage();
  let domReady=false;
  let heroReady=false;
  let dataObserved=false;
  let dataQuiet=false;
  let pendingData=0;
  let quietTimer=0;
  let hardTimer=0;
  let finishTimer=0;
  let loader=null;
  let progressBar=null;
  let statusText=null;
  let dismissed=false;

  const originalFetch=window.fetch?.bind(window);
  let wrappedFetch=null;

  document.documentElement.classList.add(ROOT_CLASS);

  function resolveLanguage(){
    const direct=String(
      document.documentElement.lang||''
    ).toLowerCase();

    if(direct.startsWith('ko'))return 'ko';
    if(direct.startsWith('en'))return 'en';

    try{
      for(let index=0;index<localStorage.length;index++){
        const key=localStorage.key(index)||'';
        if(!/lang|language/i.test(key))continue;

        const value=String(
          localStorage.getItem(key)||''
        ).toLowerCase();

        if(value==='ko'||value.startsWith('ko-'))return 'ko';
        if(value==='en'||value.startsWith('en-'))return 'en';
        if(value==='zh'||value.startsWith('zh-'))return 'zh';
      }
    }catch(_){}

    return 'zh';
  }

  function message(key){
    return copy[language]?.[key]||copy.zh[key]||key;
  }

  function trackedDataRequest(input){
    let value='';

    if(typeof input==='string'){
      value=input;
    }else if(input instanceof URL){
      value=input.href;
    }else{
      value=input?.url||'';
    }

    try{
      const url=new URL(value,location.href);
      return DATA_PATHS.some(path=>url.pathname.endsWith(path));
    }catch(_){
      return DATA_PATHS.some(path=>value.includes(path));
    }
  }

  function installFetchTracker(){
    if(!originalFetch)return;

    wrappedFetch=function(input,init){
      const tracked=trackedDataRequest(input);

      if(tracked){
        dataObserved=true;
        dataQuiet=false;
        pendingData++;
        setProgress(46);
        setStatus('data');
      }

      return originalFetch(input,init).then(
        response=>{
          if(tracked)settleDataRequest();
          return response;
        },
        error=>{
          if(tracked)settleDataRequest();
          throw error;
        }
      );
    };

    window.fetch=wrappedFetch;
  }

  function restoreFetch(){
    if(
      originalFetch&&
      wrappedFetch&&
      window.fetch===wrappedFetch
    ){
      window.fetch=originalFetch;
    }
  }

  function settleDataRequest(){
    pendingData=Math.max(0,pendingData-1);

    if(pendingData!==0){
      return;
    }

    clearTimeout(quietTimer);
    quietTimer=window.setTimeout(()=>{
      dataQuiet=true;
      setProgress(70);
      setStatus(heroReady?'ready':'visual');
      maybeFinish();
    },140);
  }

  function setProgress(value){
    if(!progressBar)return;

    const next=Math.max(
      0,
      Math.min(100,Number(value)||0)
    );

    progressBar.style.setProperty(
      '--startup-progress',
      `${next}%`
    );

    progressBar.setAttribute(
      'aria-valuenow',
      String(Math.round(next))
    );
  }

  function setStatus(key){
    if(!statusText)return;
    statusText.textContent=message(key);
  }

  function createLoader(){
    if(loader||!document.body)return;

    language=resolveLanguage();

    loader=document.createElement('div');
    loader.id=LOADER_ID;
    loader.className='dreamland-startup';
    loader.setAttribute('role','status');
    loader.setAttribute('aria-live','polite');
    loader.setAttribute('aria-label',message('preparing'));

    loader.innerHTML=`
      <div class="dreamland-startup__shell">
        <div class="dreamland-startup__topline">
          <span class="dreamland-startup__signal" aria-hidden="true"></span>
          <span>${message('label')}</span>
        </div>

        <div class="dreamland-startup__wordmark" aria-hidden="true">
          <span>DREAM</span>
          <span>LAND</span>
        </div>

        <p class="dreamland-startup__copy">
          ${message('preparing')}
        </p>

        <div
          class="dreamland-startup__progress"
          role="progressbar"
          aria-label="${message('preparing')}"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="12"
        >
          <i></i>
        </div>

        <div class="dreamland-startup__status">
          ${message('preparing')}
        </div>
      </div>
    `;

    document.body.prepend(loader);

    progressBar=loader.querySelector(
      '.dreamland-startup__progress'
    );
    statusText=loader.querySelector(
      '.dreamland-startup__status'
    );

    setProgress(18);

    requestAnimationFrame(()=>{
      loader?.classList.add('is-visible');
    });
  }

  function observeHero(){
    const image=document.querySelector(
      '.screen[data-screen="home"] .hero-product-img'
    );

    if(!image){
      heroReady=true;
      setProgress(dataQuiet?88:58);
      maybeFinish();
      return;
    }

    const complete=()=>{
      if(heroReady)return;
      heroReady=true;
      setProgress(dataQuiet?88:72);
      setStatus(dataQuiet?'ready':'data');
      maybeFinish();
    };

    if(image.complete&&image.naturalWidth>0){
      complete();
      return;
    }

    image.addEventListener('load',complete,{once:true});
    image.addEventListener('error',complete,{once:true});

    const observer=new MutationObserver(()=>{
      if(image.complete&&image.naturalWidth>0){
        observer.disconnect();
        complete();
      }
    });

    observer.observe(image,{
      attributes:true,
      attributeFilter:['src','srcset']
    });

    window.setTimeout(()=>{
      observer.disconnect();
      if(!heroReady){
        heroReady=true;
        setProgress(dataQuiet?88:72);
        maybeFinish();
      }
    },2200);
  }

  function dataReady(){
    if(dataObserved){
      return pendingData===0&&dataQuiet;
    }

    return (
      domReady&&
      performance.now()-startedAt>=520
    );
  }

  function allReady(){
    return domReady&&heroReady&&dataReady();
  }

  function maybeFinish(){
    if(dismissed||!allReady())return;

    const elapsed=performance.now()-startedAt;
    const remaining=Math.max(0,minimumDuration-elapsed);

    clearTimeout(finishTimer);
    finishTimer=window.setTimeout(
      ()=>dismiss('ready'),
      remaining
    );
  }

  function dismiss(reason='timeout'){
    if(dismissed)return;
    dismissed=true;

    clearTimeout(hardTimer);
    clearTimeout(quietTimer);
    clearTimeout(finishTimer);

    setProgress(100);
    setStatus('ready');

    try{
      localStorage.setItem(SEEN_KEY,'1');
    }catch(_){}

    const revealDelay=reducedMotion?0:120;
    const removeDelay=reducedMotion?30:520;

    window.setTimeout(()=>{
      document.documentElement.classList.remove(ROOT_CLASS);
      loader?.classList.add('is-leaving');
    },revealDelay);

    window.setTimeout(()=>{
      loader?.remove();
      restoreFetch();

      window.dispatchEvent(
        new CustomEvent('dreamland:startup-hidden',{
          detail:{
            version:VERSION,
            reason,
            duration:Math.round(
              performance.now()-startedAt
            )
          }
        })
      );
    },removeDelay);
  }

  function onDomReady(){
    domReady=true;
    createLoader();
    setProgress(30);
    setStatus(dataObserved?'data':'preparing');
    observeHero();

    if(!dataObserved){
      window.setTimeout(()=>{
        dataQuiet=true;
        setProgress(heroReady?88:64);
        maybeFinish();
      },540);
    }

    maybeFinish();
  }

  installFetchTracker();

  hardTimer=window.setTimeout(
    ()=>dismiss('maximum-duration'),
    maximumDuration
  );

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      onDomReady,
      {once:true}
    );
  }else{
    onDomReady();
  }

  window.addEventListener('pageshow',event=>{
    if(event.persisted){
      dismiss('back-forward-cache');
    }
  });

  window.DreamlandStartupLoader={
    version:VERSION,
    dismiss,
    state(){
      return {
        domReady,
        heroReady,
        dataObserved,
        dataQuiet,
        pendingData,
        dismissed
      };
    }
  };
})();

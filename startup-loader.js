(function(){
  'use strict';

  if(window.DreamlandStartupLoader){
    return;
  }

  const VERSION='v63';
  const SEEN_KEY=`dreamland-startup-seen-${VERSION}`;
  const ROOT_CLASS='dreamland-booting';
  const LOADER_ID='dreamlandStartup';
  const PRODUCT_CSV_PATH='/data/products.csv';
  const PRODUCT_JSON_PATH='/data/products.json';
  const DATA_PATHS=[
    PRODUCT_CSV_PATH,
    PRODUCT_JSON_PATH,
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

  const desktopViewport=
    window.matchMedia?.(
      '(min-width: 1024px)'
    )?.matches===true;

  /*
   * B7-00B.3A R5
   * Desktop owns its own progressive boot experience. Do not create the
   * Mobile startup overlay, do not wrap fetch, and do not preload the Mobile
   * hero / catalog batch before Desktop Presentation can render.
   */
  if(desktopViewport){
    document.documentElement
      .classList
      .remove(
        ROOT_CLASS
      );

    window.DreamlandStartupLoader=
      Object.freeze({
        version:VERSION,
        mode:'desktop-bypass',

        dismiss(){
          document.documentElement
            .classList
            .remove(
              ROOT_CLASS
            );
        },

        hasPreloaded(){
          return false;
        },

        state(){
          return {
            desktopViewport:true,
            desktopBypass:true,
            dismissed:true,
            dismissing:false,
            productPreloadStarted:false,
            productPreloadDone:false,
            productPreloadTarget:0,
            productPreloadAttempted:0,
            productPreloadLoaded:0,
            mediaReady:false,
            desktopReady:false,
            preloadedProductCount:0
          };
        }
      });

    return;
  }

  let seenBefore=false;
  try{
    seenBefore=localStorage.getItem(SEEN_KEY)==='1';
  }catch(_){}

  const minimumDuration=reducedMotion
    ? 600
    : seenBefore
      ? 1600
      : 3000;

  const maximumDuration=reducedMotion
    ? 1800
    : seenBefore
      ? 5200
      : 7200;

  const completionHold=reducedMotion
    ? 80
    : seenBefore
      ? 300
      : 520;

  const copy={
    zh:{
      label:'产品手册',
      preparing:'正在加载完整手册内容',
      data:'正在载入产品与配置',
      visual:'正在准备首页视觉',
      media:'正在连接商品图片',
      images:(loaded,total)=>`正在预载产品图 ${loaded}/${total}`,
      ready:'产品与图片已准备完成'
    },
    en:{
      label:'PRODUCT CATALOG',
      preparing:'Preparing the complete catalog',
      data:'Loading products and options',
      visual:'Preparing the home visual',
      media:'Connecting catalog images',
      images:(loaded,total)=>`Preloading product images ${loaded}/${total}`,
      ready:'Catalog and images are ready'
    },
    ko:{
      label:'제품 카탈로그',
      preparing:'전체 카탈로그를 준비하고 있어요',
      data:'제품과 옵션을 불러오고 있어요',
      visual:'홈 화면을 준비하고 있어요',
      media:'상품 이미지를 연결하고 있어요',
      images:(loaded,total)=>`제품 이미지를 불러오고 있어요 ${loaded}/${total}`,
      ready:'카탈로그와 이미지가 준비됐어요'
    }
  };

  let language=resolveLanguage();
  let domReady=false;
  let heroReady=false;
  let dataObserved=false;
  let dataQuiet=false;
  let pendingData=0;

  let productPreloadStarted=false;
  let productPreloadDone=false;
  let productPreloadLoaded=0;
  let productPreloadAttempted=0;
  let productPreloadTarget=0;
  let mediaReady=false;
  let mediaReadyHandler=null;

  let desktopReady=
    !desktopViewport;
  let desktopReadyHandler=null;

  const preloadedProductSources=new Set();

  let quietTimer=0;
  let hardTimer=0;
  let finishTimer=0;
  let fallbackCatalogTimer=0;
  let loader=null;
  let progressBar=null;
  let statusText=null;
  let dismissed=false;
  let dismissing=false;

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
    const value=copy[language]?.[key]||copy.zh[key]||key;
    return typeof value==='function'
      ? value.apply(null,[...arguments].slice(1))
      : value;
  }

  function requestPath(input){
    let value='';

    if(typeof input==='string'){
      value=input;
    }else if(input instanceof URL){
      value=input.href;
    }else{
      value=input?.url||'';
    }

    try{
      return new URL(value,location.href).pathname;
    }catch(_){
      return value;
    }
  }

  function trackedDataRequest(input){
    const path=requestPath(input);
    return DATA_PATHS.some(item=>path.endsWith(item));
  }

  function productDataRequest(input){
    const path=requestPath(input);
    return (
      path.endsWith(PRODUCT_CSV_PATH)||
      path.endsWith(PRODUCT_JSON_PATH)
    );
  }

  function installFetchTracker(){
    if(!originalFetch)return;

    wrappedFetch=function(input,init){
      const tracked=trackedDataRequest(input);
      const productData=productDataRequest(input);

      if(tracked){
        dataObserved=true;
        dataQuiet=false;
        pendingData++;
        setProgress(44);
        setStatus('data');
      }

      return originalFetch(input,init).then(
        response=>{
          if(productData){
            inspectProductResponse(
              response.clone(),
              requestPath(input)
            );
          }

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
      setProgress(productPreloadStarted?62:56);

      if(productPreloadStarted&&!productPreloadDone){
        setImageStatus();
      }else{
        setStatus(heroReady?'ready':'visual');
      }

      maybeFinish();
    },180);
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

  function setImageStatus(){
    if(!statusText||!productPreloadTarget)return;

    statusText.textContent=message(
      'images',
      productPreloadLoaded,
      productPreloadTarget
    );
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

    setProgress(16);

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
      setProgress(productPreloadStarted?62:54);
      maybeFinish();
      return;
    }

    const complete=()=>{
      if(heroReady)return;
      heroReady=true;
      setProgress(productPreloadStarted?66:58);

      if(productPreloadStarted&&!productPreloadDone){
        setImageStatus();
      }else{
        setStatus(dataQuiet?'ready':'data');
      }

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
        setProgress(productPreloadStarted?66:58);
        maybeFinish();
      }
    },2800);
  }

  function catalogMediaAvailable(){
    return Boolean(
      window.DreamlandMedia&&
      window.ImageManager&&
      window.DreamlandResponsiveImages
        ?.mountResponsiveCatalog
    );
  }

  function markCatalogMediaReady(){
    if(mediaReady){
      return true;
    }

    if(!catalogMediaAvailable()){
      return false;
    }

    mediaReady=true;

    if(productPreloadDone){
      setProgress(96);
      setStatus('ready');
    }else if(productPreloadStarted){
      setImageStatus();
    }else{
      setStatus('media');
    }

    maybeFinish();
    return true;
  }

  function installCatalogMediaGate(){
    if(mediaReadyHandler){
      markCatalogMediaReady();
      return;
    }

    mediaReadyHandler=()=>{
      markCatalogMediaReady();
    };

    window.addEventListener(
      'dreamland:catalog-media-ready',
      mediaReadyHandler
    );

    markCatalogMediaReady();
  }

  function releaseCatalogMediaGate(){
    if(!mediaReadyHandler){
      return;
    }

    window.removeEventListener(
      'dreamland:catalog-media-ready',
      mediaReadyHandler
    );

    mediaReadyHandler=null;
  }

  function markDesktopExperienceReady(){
    if(desktopReady){
      return true;
    }

    const snapshot=
      window.DreamlandDesktopExperience
        ?.snapshot?.();

    if(
      snapshot?.mode!=='desktop'||
      snapshot?.desktopMounted!==true
    ){
      return false;
    }

    desktopReady=true;
    maybeFinish();
    return true;
  }

  function installDesktopExperienceGate(){
    if(!desktopViewport){
      desktopReady=true;
      return;
    }

    if(desktopReadyHandler){
      markDesktopExperienceReady();
      return;
    }

    desktopReadyHandler=()=>{
      desktopReady=true;
      maybeFinish();
    };

    window.addEventListener(
      'dreamland:desktop-ready',
      desktopReadyHandler
    );

    markDesktopExperienceReady();
  }

  function releaseDesktopExperienceGate(){
    if(!desktopReadyHandler){
      return;
    }

    window.removeEventListener(
      'dreamland:desktop-ready',
      desktopReadyHandler
    );

    desktopReadyHandler=null;
  }

  function connectionProfile(){
    const connection=
      navigator.connection||
      navigator.mozConnection||
      navigator.webkitConnection||
      {};

    const effectiveType=String(
      connection.effectiveType||''
    ).toLowerCase();

    const memory=Number(
      navigator.deviceMemory||0
    );

    if(connection.saveData||effectiveType.includes('2g')){
      return {count:4,concurrency:2};
    }

    if(effectiveType==='3g'){
      return {count:8,concurrency:3};
    }

    if(memory>0&&memory<=2){
      return {count:seenBefore?8:12,concurrency:3};
    }

    if(effectiveType==='4g'){
      return {count:seenBefore?12:20,concurrency:5};
    }

    return {count:seenBefore?14:24,concurrency:6};
  }

  function parseCsv(source){
    const text=String(source||'').replace(/^\uFEFF/,'');
    const rows=[];
    let row=[];
    let cell='';
    let quoted=false;

    for(let index=0;index<text.length;index++){
      const char=text[index];
      const next=text[index+1];

      if(quoted){
        if(char==='"'&&next==='"'){
          cell+='"';
          index++;
        }else if(char==='"'){
          quoted=false;
        }else{
          cell+=char;
        }
        continue;
      }

      if(char==='"'){
        quoted=true;
      }else if(char===','){
        row.push(cell);
        cell='';
      }else if(char==='\n'){
        row.push(cell.replace(/\r$/,''));
        rows.push(row);
        row=[];
        cell='';
      }else{
        cell+=char;
      }
    }

    if(cell||row.length){
      row.push(cell.replace(/\r$/,''));
      rows.push(row);
    }

    const headers=(rows.shift()||[]).map(value=>value.trim());

    return rows
      .filter(values=>values.some(Boolean))
      .map(values=>{
        const record={};
        headers.forEach((header,index)=>{
          record[header]=String(values[index]??'').trim();
        });
        return record;
      });
  }

  function normalizedProductRows(records){
    return records
      .filter(record=>{
        const status=String(record.status||'active').toLowerCase();
        return status==='active';
      })
      .map(record=>({
        series:String(record.series||'other'),
        sort:Number(
          record.list_sort||
          record.sort_order||
          0
        ),
        cover:String(
          record.cover_image||
          record.cover||
          record.image||
          ''
        ).trim()
      }))
      .filter(record=>record.cover);
  }

  function productRowsFromJson(data){
    const products=Array.isArray(data)
      ? data
      : Array.isArray(data?.products)
        ? data.products
        : [];

    return products
      .filter(product=>{
        const status=String(product.status||'active').toLowerCase();
        return status==='active';
      })
      .map(product=>({
        series:String(product.series||'other'),
        sort:Number(
          product.listSort||
          product.sortOrder||
          product.sort_order||
          0
        ),
        cover:String(
          product.coverImage||
          product.cover_image||
          product.cover||
          product.images?.cover||
          ''
        ).trim()
      }))
      .filter(record=>record.cover);
  }

  function roundRobinCovers(rows,limit){
    const groups=new Map();

    rows.forEach(record=>{
      const key=record.series||'other';
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(record);
    });

    groups.forEach(values=>{
      values.sort((a,b)=>b.sort-a.sort);
    });

    const output=[];
    const seen=new Set();
    const queues=[...groups.values()];

    while(output.length<limit){
      let moved=false;

      for(const queue of queues){
        const record=queue.shift();
        if(!record)continue;
        moved=true;

        if(!seen.has(record.cover)){
          seen.add(record.cover);
          output.push(record.cover);
        }

        if(output.length>=limit)break;
      }

      if(!moved)break;
    }

    return output;
  }

  function prioritizedCovers(
    rows,
    limit,
    preferredSeries=''
  ){
    const output=[];
    const seen=new Set();

    const add=record=>{
      const cover=String(
        record?.cover||''
      ).trim();

      if(
        !cover||
        seen.has(cover)||
        output.length>=limit
      ){
        return;
      }

      seen.add(cover);
      output.push(cover);
    };

    const primary=
      rows
        .filter(
          record=>
            record.series===
            preferredSeries
        )
        .sort(
          (a,b)=>b.sort-a.sort
        );

    primary
      .slice(
        0,
        Math.min(5,limit)
      )
      .forEach(add);

    const remaining=
      rows.filter(
        record=>
          !seen.has(
            String(
              record.cover||''
            ).trim()
          )
      );

    roundRobinCovers(
      remaining,
      Math.max(
        0,
        limit-output.length
      )
    ).forEach(
      cover=>
        add({cover})
    );

    return output;
  }

  async function resolveDefaultSeries(rows){
    const fallback=
      String(
        rows?.[0]?.series||
        ''
      ).trim();

    if(!originalFetch){
      return fallback;
    }

    try{
      const response=
        await originalFetch(
          './data/series.json',
          {cache:'force-cache'}
        );

      if(!response.ok){
        return fallback;
      }

      const data=
        await response.json();

      return String(
        data?.defaultSeries||
        fallback
      ).trim();
    }catch(_){
      return fallback;
    }
  }

  function responsiveVariantPath(source,width=480){
    const value=String(source||'').trim();
    if(!value||value.includes('/images/generated/'))return value;

    let url;
    try{
      url=new URL(value,location.href);
    }catch(_){
      return value;
    }

    const marker='/images/';
    const markerIndex=url.pathname.indexOf(marker);
    if(markerIndex<0)return value;

    const extensionIndex=url.pathname.lastIndexOf('.');
    if(extensionIndex<=markerIndex+marker.length)return value;

    const prefix=url.pathname.slice(0,markerIndex+marker.length);
    const relative=url.pathname.slice(
      markerIndex+marker.length,
      extensionIndex
    );

    url.pathname=`${prefix}generated/${relative}-${width}.webp`;
    return url.href;
  }

  function unique(values){
    return [...new Set(values.filter(Boolean))];
  }

  function sourceKey(value){
    try{
      return new URL(
        String(value||'').trim(),
        location.href
      ).href;
    }catch(_){
      return String(value||'').trim();
    }
  }

  function preloadImageSource(source){
    const candidates=unique([
      responsiveVariantPath(source,480),
      new URL(source,location.href).href
    ]);

    return new Promise(resolve=>{
      const tryCandidate=index=>{
        if(index>=candidates.length){
          resolve(false);
          return;
        }

        const image=new Image();
        let settled=false;

        const finish=success=>{
          if(settled)return;
          settled=true;
          clearTimeout(timer);
          image.onload=null;
          image.onerror=null;

          if(success){
            image.decode?.().catch(()=>{}).finally(()=>resolve(true));
          }else{
            tryCandidate(index+1);
          }
        };

        const timer=window.setTimeout(
          ()=>finish(false),
          5200
        );

        image.decoding='async';
        image.loading='eager';
        image.fetchPriority='low';
        image.onload=()=>finish(image.naturalWidth>0);
        image.onerror=()=>finish(false);
        image.src=candidates[index];

        if(image.complete&&image.naturalWidth>0){
          queueMicrotask(()=>finish(true));
        }
      };

      tryCandidate(0);
    });
  }

  async function runPool(items,concurrency,worker){
    let cursor=0;

    async function next(){
      while(cursor<items.length){
        const index=cursor++;
        await worker(items[index],index);
      }
    }

    await Promise.all(
      Array.from(
        {length:Math.min(concurrency,items.length)},
        next
      )
    );
  }

  async function startProductPreload(rows){
    if(productPreloadStarted||dismissed)return;

    productPreloadStarted=true;

    const profile=connectionProfile();
    const preferredSeries=
      await resolveDefaultSeries(rows);

    if(dismissed){
      return;
    }

    const covers=
      prioritizedCovers(
        rows,
        profile.count,
        preferredSeries
      );
    productPreloadTarget=covers.length;
    productPreloadLoaded=0;
    productPreloadAttempted=0;

    if(!covers.length){
      productPreloadDone=true;
      setProgress(88);
      maybeFinish();
      return;
    }

    setProgress(62);
    setImageStatus();

    runPool(
      covers,
      profile.concurrency,
      async source=>{
        const success=await preloadImageSource(source);
        productPreloadAttempted++;

        if(success){
          productPreloadLoaded++;
          preloadedProductSources.add(
            sourceKey(source)
          );
        }

        const ratio=
          productPreloadTarget
            ? productPreloadAttempted/productPreloadTarget
            : 1;

        setProgress(62+Math.round(ratio*32));
        setImageStatus();
      }
    ).finally(()=>{
      productPreloadDone=true;
      setProgress(96);
      setStatus(
        mediaReady
          ? 'ready'
          : 'media'
      );
      maybeFinish();
    });
  }

  async function inspectProductResponse(response,path){
    if(productPreloadStarted||dismissed)return;

    try{
      if(path.endsWith(PRODUCT_CSV_PATH)){
        const rows=normalizedProductRows(
          parseCsv(await response.text())
        );
        startProductPreload(rows);
        return;
      }

      if(path.endsWith(PRODUCT_JSON_PATH)){
        startProductPreload(
          productRowsFromJson(await response.json())
        );
      }
    }catch(error){
      console.warn('[startup] Product preload source failed:',error);
    }
  }

  function ensureProductCatalogSource(){
    if(
      productPreloadStarted||
      dismissed||
      !originalFetch
    ){
      return;
    }

    originalFetch('./data/products.csv',{cache:'force-cache'})
      .then(response=>{
        if(!response.ok){
          throw new Error(`products.csv: ${response.status}`);
        }
        return response.text();
      })
      .then(text=>{
        startProductPreload(
          normalizedProductRows(parseCsv(text))
        );
      })
      .catch(error=>{
        console.warn('[startup] Fallback product preload failed:',error);
        productPreloadStarted=true;
        productPreloadDone=true;
        maybeFinish();
      });
  }

  function dataReady(){
    if(dataObserved){
      return pendingData===0&&dataQuiet;
    }

    return (
      domReady&&
      performance.now()-startedAt>=700
    );
  }

  function imagesReady(){
    return productPreloadStarted&&productPreloadDone;
  }

  function allReady(){
    return (
      domReady&&
      heroReady&&
      dataReady()&&
      imagesReady()&&
      mediaReady&&
      desktopReady
    );
  }

  function maybeFinish(){
    if(dismissed||dismissing||!allReady())return;

    const elapsed=performance.now()-startedAt;
    const remaining=Math.max(0,minimumDuration-elapsed);

    clearTimeout(finishTimer);
    finishTimer=window.setTimeout(
      ()=>dismiss('ready'),
      remaining
    );
  }

  function dismiss(reason='timeout'){
    if(dismissed||dismissing)return;
    dismissing=true;

    clearTimeout(hardTimer);
    clearTimeout(quietTimer);
    clearTimeout(finishTimer);
    clearTimeout(fallbackCatalogTimer);
    releaseCatalogMediaGate();
    releaseDesktopExperienceGate();

    setProgress(100);
    setStatus('ready');

    try{
      localStorage.setItem(SEEN_KEY,'1');
    }catch(_){}

    const revealDelay=completionHold;
    const removeDelay=completionHold+(reducedMotion?80:720);

    window.setTimeout(()=>{
      document.documentElement.classList.remove(ROOT_CLASS);
      loader?.classList.add('is-leaving');
    },revealDelay);

    window.setTimeout(()=>{
      dismissed=true;
      loader?.remove();
      restoreFetch();

      window.dispatchEvent(
        new CustomEvent('dreamland:startup-hidden',{
          detail:{
            version:VERSION,
            reason,
            duration:Math.round(
              performance.now()-startedAt
            ),
            productImages:{
              target:productPreloadTarget,
              attempted:productPreloadAttempted,
              loaded:productPreloadLoaded
            }
          }
        })
      );
    },removeDelay);
  }

  function onDomReady(){
    domReady=true;
    createLoader();
    installCatalogMediaGate();
    setProgress(28);
    setStatus(dataObserved?'data':'preparing');
    observeHero();

    if(!dataObserved){
      window.setTimeout(()=>{
        dataQuiet=true;
        setProgress(heroReady?58:48);
        maybeFinish();
      },700);
    }

    fallbackCatalogTimer=window.setTimeout(
      ensureProductCatalogSource,
      900
    );

    maybeFinish();
  }

  installDesktopExperienceGate();
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
    hasPreloaded(source){
      return preloadedProductSources.has(
        sourceKey(source)
      );
    },
    state(){
      return {
        domReady,
        heroReady,
        dataObserved,
        dataQuiet,
        pendingData,
        productPreloadStarted,
        productPreloadDone,
        productPreloadTarget,
        productPreloadAttempted,
        productPreloadLoaded,
        mediaReady,
        desktopViewport,
        desktopReady,
        preloadedProductCount:
          preloadedProductSources.size,
        dismissed,
        dismissing
      };
    }
  };
})();

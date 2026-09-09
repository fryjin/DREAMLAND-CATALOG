(function(root){
  'use strict';

  if(root.DreamlandHomeRuntime){
    return;
  }

  const VERSION='R4.3B';
  const RUNTIME_ID='DREAMLAND_R4_HOME_RUNTIME_R4_3B';

  let state=null;
  let currentLanguage='en';
  let mounted=false;

  function text(value){
    return String(
      value??
      ''
    );
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
    const target=storage();

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
    const target=storage();

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
      String(
        value||
        ''
      )
        .trim()
        .toLowerCase();

    return supported.includes(next)
      ? next
      : fallback;
  }

  function inquiryCount(value){
    const data=
      typeof value==='string'
        ? safeJson(value)
        : value;

    if(
      !data||
      typeof data!=='object'||
      Array.isArray(data)||
      !Array.isArray(data.items)
    ){
      return 0;
    }

    return data.items.reduce(
      (
        total,
        item
      )=>{
        if(
          item?.type===
          'product'
        ){
          return (
            total+
            (
              Number(
                item?.qty
              )||
              0
            )
          );
        }

        return total+1;
      },
      0
    );
  }

  function pathValue(
    source,
    path
  ){
    return String(
      path||
      ''
    )
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

  function setNodeText(
    node,
    value
  ){
    if(!node){
      return;
    }

    node.textContent=
      text(value);
  }

  function contentFor(
    language
  ){
    return (
      state?.languages?.[language]||
      state?.languages
        ?.[state?.defaultLanguage]||
      state?.languages?.en||
      null
    );
  }

  function applyGenericBindings(
    view
  ){
    document
      .querySelectorAll(
        '[data-home-bind]'
      )
      .forEach(node=>{
        const value=
          pathValue(
            view?.content,
            node.dataset.homeBind
          );

        if(value===undefined){
          return;
        }

        setNodeText(
          node,
          text(value)+
          text(
            node.dataset
              .homeSuffix
          )
        );
      });
  }

  function applyCollections(
    view
  ){
    const source=
      Array.isArray(
        view?.collections
      )
        ? view.collections
        : [];

    const collectionCopy=
      view?.content
        ?.collections||
      {};

    document
      .querySelectorAll(
        '[data-home-collection]'
      )
      .forEach(card=>{
        const id=
          String(
            card.dataset
              .homeCollection||
            ''
          );

        const item=
          source.find(
            row=>
              row?.id===id
          );

        if(!item){
          return;
        }

        setNodeText(
          card.querySelector(
            '[data-home-collection-label]'
          ),
          item.label
        );

        const designLabel=
          Number(item.count)===1
            ? (
                collectionCopy
                  .designSingular||
                collectionCopy
                  .designPlural||
                ''
              )
            : (
                collectionCopy
                  .designPlural||
                collectionCopy
                  .designSingular||
                ''
              );

        setNodeText(
          card.querySelector(
            '[data-home-collection-count]'
          ),
          item.count+
          ' '+
          designLabel
        );
      });
  }

  function applyFeatured(
    view
  ){
    const products=
      Array.isArray(
        view?.featuredProducts
      )
        ? view.featuredProducts
        : [];

    const featured=
      view?.content
        ?.featured||
      {};

    document
      .querySelectorAll(
        '[data-home-featured-product]'
      )
      .forEach(card=>{
        const id=
          String(
            card.dataset
              .homeFeaturedProduct||
            ''
          );

        const product=
          products.find(
            row=>
              row?.id===id
          );

        if(!product){
          return;
        }

        setNodeText(
          card.querySelector(
            '[data-home-product-name]'
          ),
          product.name
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-series]'
          ),
          product.seriesLabel
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-price]'
          ),
          product.price
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-moq]'
          ),
          (
            featured.moq||
            'MOQ'
          )+
          ' '+
          product.moq
        );

        setNodeText(
          card.querySelector(
            '[data-home-product-details]'
          ),
          (
            featured.viewDetails||
            'View details'
          )+
          ' →'
        );

        const image=
          card.querySelector('img');

        if(image){
          image.alt=
            text(product.name);
        }
      });
  }

  function applyIndexedText(
    selector,
    values,
    field
  ){
    const rows=
      Array.isArray(values)
        ? values
        : [];

    document
      .querySelectorAll(
        selector
      )
      .forEach(node=>{
        const index=
          Number(
            node.dataset
              .homeArrayIndex
          );

        const item=
          rows[index];

        if(
          !Number.isInteger(index)||
          item==null
        ){
          return;
        }

        setNodeText(
          node,
          field
            ? item?.[field]
            : item
        );
      });
  }

  function applyLanguage(
    language,
    {
      persist=true
    }={}
  ){
    if(!state){
      return false;
    }

    const supported=
      Object.keys(
        state.languages||
        {}
      );

    const next=
      normalizeLanguage(
        language,
        state.defaultLanguage||
          'en',
        supported
      );

    const view=
      contentFor(next);

    if(!view){
      return false;
    }

    currentLanguage=next;

    document
      .documentElement
      .setAttribute(
        'lang',
        next==='zh'
          ? 'zh-CN'
          : next==='ko'
            ? 'ko-KR'
            : 'en'
      );

    if(document.body){
      document.body.dataset
        .homeLanguage=
        next;
    }

    const select=
      document.querySelector(
        '[data-home-language-select]'
      );

    if(select){
      select.value=next;
      select.setAttribute(
        'aria-label',
        text(
          view?.content
            ?.navigation
            ?.language||
          'Language'
        )
      );
    }

    applyGenericBindings(view);
    applyCollections(view);
    applyFeatured(view);

    applyIndexedText(
      '[data-home-custom-feature]',
      view?.content?.custom
        ?.features
    );

    applyIndexedText(
      '[data-home-wholesale-title]',
      view?.content?.wholesale
        ?.facts,
      'title'
    );

    applyIndexedText(
      '[data-home-wholesale-body]',
      view?.content?.wholesale
        ?.facts,
      'body'
    );

    if(persist){
      writeStorage(
        state.storage
          .languageKey,
        next
      );
    }

    updateInquiryBadge();

    try{
      root.dispatchEvent(
        new CustomEvent(
          'dreamland:home-language',
          {
            detail:{
              language:next
            }
          }
        )
      );
    }catch(_){}

    return true;
  }

  function updateInquiryBadge(){
    if(!state){
      return 0;
    }

    const count=
      inquiryCount(
        readStorage(
          state.storage
            .inquiryKey
        )
      );

    const node=
      document.querySelector(
        '[data-home-inquiry-count]'
      );

    if(node){
      node.textContent=
        String(count);

      const inquiryLabel=
        contentFor(
          currentLanguage
        )
          ?.content
          ?.navigation
          ?.inquiry||
        'Inquiry';

      node.setAttribute(
        'aria-label',
        count+
        ' '+
        inquiryLabel
      );
    }

    return count;
  }


  const MOBILE_STARTUP_VERSION='R4.11B4.1C-A';
  const MOBILE_STARTUP_QUERY='(max-width:720px)';
  const MOBILE_STARTUP_SESSION='dreamlandMobileStartupSeen:R4.11B4.1C';
  let mobileStartup={active:false,released:false,profile:'none',target:0,minimum:0,ready:0,settled:0,failed:0};

  let mobileCatalogWarmup=null;
  async function awaitMobileCatalogReady(timeout=1500){
    if(mobileStartup.ready>=mobileStartup.minimum)return true;
    if(!mobileCatalogWarmup)return false;
    await Promise.race([mobileCatalogWarmup.waitFor(mobileStartup.minimum),wait(timeout)]);
    return mobileStartup.ready>=mobileStartup.minimum;
  }
  function mountMobileCoverGate(){
    const gate=document.querySelector('[data-mobile-cover-gate]');
    if(!gate||root.matchMedia?.(MOBILE_STARTUP_QUERY)?.matches!==true||gate.dataset.mobileGateMounted==='true')return false;
    const track=gate.querySelector('[data-mobile-cover-track]');
    const thumb=gate.querySelector('[data-mobile-cover-thumb]');
    if(!track||!thumb)return false;
    gate.dataset.mobileGateMounted='true';
    let dragging=false,moved=false,progress=0,start=0;
    const paint=value=>{
      progress=Math.max(0,Math.min(1,Number(value)||0));
      const travel=Math.max(0,track.clientWidth-thumb.offsetWidth-8);
      gate.style.setProperty('--dl-cover-progress',Math.round(progress*100)+'%');
      gate.style.setProperty('--dl-cover-shift',(travel*progress)+'px');
    };
    const enter=async()=>{
      if(gate.dataset.state==='entering')return;
      gate.dataset.state='preparing';
      await awaitMobileCatalogReady();
      gate.dataset.state='entering';
      document.body?.setAttribute('data-mobile-cover-leaving','true');
      if(!root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)await wait(180);
      root.location.assign(gate.href);
    };
    gate.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;moved=false;start=e.clientX;gate.setPointerCapture?.(e.pointerId);});
    gate.addEventListener('pointermove',e=>{if(!dragging)return;const delta=Math.max(0,e.clientX-start);const travel=Math.max(1,track.clientWidth-thumb.offsetWidth-8);if(delta>5)moved=true;paint(delta/travel);});
    gate.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;gate.releasePointerCapture?.(e.pointerId);if(progress>=.72){e.preventDefault();enter();return;}paint(0);});
    gate.addEventListener('pointercancel',()=>{dragging=false;paint(0);});
    gate.addEventListener('click',e=>{e.preventDefault();if(moved){moved=false;return;}enter();});
    root.addEventListener('pageshow',()=>{gate.dataset.state='';document.body?.removeAttribute('data-mobile-cover-leaving');paint(0);});
    return true;
  }

  function sessionStore(){
    try{return root.sessionStorage||null;}catch(_){return null;}
  }
  function parseMobileStartupState(){
    const parsed=safeJson(document.getElementById('mobileHomeStartupState')?.textContent);
    if(!parsed||parsed.version!==MOBILE_STARTUP_VERSION||!parsed.cover||!Array.isArray(parsed.catalogImages))return null;
    return parsed;
  }
  function mobileProfile(){
    const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection||{};
    const type=text(connection.effectiveType).toLowerCase();
    const memory=Number(navigator.deviceMemory||0);
    const downlink=Number(connection.downlink||0);
    if(connection.saveData||type.includes('2g'))return {name:'save-data',target:4,minimum:4,concurrency:2,preferFull:false};
    if(type==='3g'||(memory>0&&memory<=2))return {name:'constrained',target:12,minimum:8,concurrency:3,preferFull:false};
    if(type==='4g'||downlink>=5){
      const preferFull=memory>=6;
      return {name:preferFull?'fast-full':'fast',target:24,minimum:preferFull?24:16,concurrency:4,preferFull};
    }
    return {name:'normal',target:16,minimum:12,concurrency:3,preferFull:false};
  }
  function startupPaint(loader,progress,status){
    if(!loader)return;
    const next=Math.max(0,Math.min(100,Math.round(progress)));
    loader.style.setProperty('--dl-startup-progress',next+'%');
    loader.querySelector('[data-mobile-startup-progress]')?.setAttribute('aria-valuenow',String(next));
    const node=loader.querySelector('[data-mobile-startup-status]');
    if(node&&status)node.textContent=status;
  }
  function wait(ms){return new Promise(resolve=>root.setTimeout(resolve,Math.max(0,ms)));}
  function decodeImage(url){
    return new Promise(resolve=>{
      if(!url){resolve(false);return;}
      const image=new root.Image();
      image.decoding='async';
      let closed=false;
      const done=async ok=>{
        if(closed)return;
        closed=true;image.onload=null;image.onerror=null;
        if(ok&&typeof image.decode==='function'){try{await image.decode();}catch(_){}}
        resolve(ok);
      };
      image.onload=()=>done(true);image.onerror=()=>done(false);image.src=url;
      if(image.complete&&image.naturalWidth>0)done(true);
    });
  }
  function startCatalogWarmup(manifest,profile,loader=null){
    const images=manifest.catalogImages.slice(0,profile.target);
    let cursor=0,ready=0,settled=0,failed=0;
    const waiters=[];
    const notify=()=>{
      mobileStartup.ready=ready;mobileStartup.settled=settled;mobileStartup.failed=failed;
      startupPaint(loader,32+(images.length?(settled/images.length)*60:60),'Preparing collection '+ready+' / '+images.length);
      waiters.slice().forEach(waiter=>{if(ready>=waiter.count){waiter.resolve(ready);waiters.splice(waiters.indexOf(waiter),1);}});
    };
    const waitFor=count=>ready>=count?Promise.resolve(ready):new Promise(resolve=>waiters.push({count,resolve}));
    const worker=async()=>{while(cursor<images.length){const index=cursor++;const ok=await decodeImage(images[index]);settled++;ok?ready++:failed++;notify();}};
    const workers=Array.from({length:Math.min(profile.concurrency,Math.max(1,images.length))},()=>worker());
    const done=Promise.all(workers).then(()=>{startupPaint(loader,96,'Collection ready');return {ready,settled,failed};});
    notify();
    return {done,waitFor,target:images.length};
  }
  function releaseMobileStartup(loader,{immediate=false}={}){
    mobileStartup.released=true;mobileStartup.active=false;
    try{sessionStore()?.setItem(MOBILE_STARTUP_SESSION,'1');}catch(_){}
    if(!loader)return;
    if(immediate){loader.dataset.active='false';return;}
    startupPaint(loader,100,'Collection ready');loader.classList.add('is-leaving');
    root.setTimeout(()=>{loader.dataset.active='false';loader.classList.remove('is-leaving');},220);
  }
  function mobileStartupSnapshot(){return Object.freeze({...mobileStartup});}
  async function mountMobileStartup(){
    if(typeof document==='undefined')return false;
    const loader=document.getElementById('dreamlandMobileStartup');
    const manifest=parseMobileStartupState();
    const mobile=root.matchMedia?.(MOBILE_STARTUP_QUERY)?.matches===true;
    if(!mobile||!loader||!manifest){if(loader)loader.dataset.active='false';return false;}
    const profile=mobileProfile();
    mobileStartup={active:true,released:false,profile:profile.name,target:profile.target,minimum:profile.minimum,ready:0,settled:0,failed:0};
    const seen=sessionStore()?.getItem(MOBILE_STARTUP_SESSION)==='1';
    if(seen){releaseMobileStartup(loader,{immediate:true});decodeImage(manifest.cover);mobileCatalogWarmup=startCatalogWarmup(manifest,profile);return true;}
    const started=root.performance?.now?.()||Date.now();
    startupPaint(loader,14,'Loading cover');
    const cover=await Promise.race([decodeImage(manifest.cover),wait(2200).then(()=>false)]);
    startupPaint(loader,cover?32:28,'Preparing collection 0 / '+Math.min(profile.target,manifest.catalogImages.length));
    const warmup=mobileCatalogWarmup=startCatalogWarmup(manifest,profile,loader);
    const releaseCount=Math.min(warmup.target,profile.preferFull?profile.target:profile.minimum);
    const elapsed=(root.performance?.now?.()||Date.now())-started;
    await Promise.race([warmup.waitFor(releaseCount),wait(Math.max(0,3200-elapsed))]);
    const visibleFor=(root.performance?.now?.()||Date.now())-started;
    if(visibleFor<500)await wait(500-visibleFor);
    releaseMobileStartup(loader);warmup.done.catch(()=>{});return true;
  }

  function parseRuntimeState(){
    const node=
      document.getElementById(
        'homeRuntimeState'
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
      !parsed.languages||
      !parsed.storage
    ){
      return null;
    }

    return parsed;
  }

  function mount(){
    if(mounted){
      updateInquiryBadge();
      return true;
    }

    state=
      parseRuntimeState();

    if(!state){
      return false;
    }

    const supported=
      Object.keys(
        state.languages
      );

    const stored=
      readStorage(
        state.storage
          .languageKey
      );

    const initial=
      normalizeLanguage(
        stored,
        state.defaultLanguage||
          'en',
        supported
      );

    const select=
      document.querySelector(
        '[data-home-language-select]'
      );

    select?.addEventListener(
      'change',
      event=>{
        applyLanguage(
          event.currentTarget
            ?.value
        );
      }
    );

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
          updateInquiryBadge();
        }
      }
    );

    root.addEventListener(
      'pageshow',
      ()=>{
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
          updateInquiryBadge();
        }
      }
    );

    mounted=true;

    applyLanguage(
      initial,
      {
        persist:true
      }
    );

    return true;
  }

  root.DreamlandHomeRuntime=
    Object.freeze({
      version:VERSION,
      id:RUNTIME_ID,
      normalizeLanguage,
      inquiryCount,
      mount,
      applyLanguage,
      updateInquiryBadge,
      mobileStartupSnapshot
    });

  if(
    typeof document!==
    'undefined'
  ){
    mountMobileStartup();
    mountMobileCoverGate();

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
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

(function(){
  'use strict';

  if(window.DreamlandProgressiveDetail)return;

  const responsive=window.DreamlandResponsiveImages;
  if(!responsive?.variantPath){
    console.warn('[catalog] Progressive detail loader requires image-variants.js');
    return;
  }

  const PREVIEW_WIDTH=480;
  const FULL_WIDTH=960;
  const FIRST_NEIGHBOR_DELAY=650;
  const SECOND_NEIGHBOR_DELAY=1350;
  const states=new WeakMap();
  let renderSequence=0;

  function clean(value){
    return String(value||'').trim();
  }

  function unique(values){
    return [...new Set(values.map(clean).filter(Boolean))];
  }

  function isConstrainedNetwork(){
    const connection=
      navigator.connection||
      navigator.mozConnection||
      navigator.webkitConnection;

    return Boolean(
      connection?.saveData||
      /(^|-)2g$/i.test(connection?.effectiveType||'')
    );
  }

  function escapeAttr(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/"/g,'&quot;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function frameFor(img){
    return img?.closest('.detail-slide,.media-frame')||null;
  }

  function markLoading(img){
    const frame=frameFor(img);
    frame?.classList.add('is-loading');
    frame?.classList.remove('is-loaded','is-error');
  }

  function markLoaded(img,quality){
    const frame=frameFor(img);
    frame?.classList.add('is-loaded');
    frame?.classList.remove('is-loading','is-error');
    img.classList.remove('is-missing');
    img.dataset.responsiveQuality=quality;
  }

  function markError(img){
    const frame=frameFor(img);
    frame?.classList.add('is-error');
    frame?.classList.remove('is-loading','is-loaded');
    img.classList.add('is-missing');
  }

  function loadIntoElement(img,source,token){
    return new Promise(resolve=>{
      let settled=false;

      const finish=success=>{
        if(settled)return;
        settled=true;
        img.onload=null;
        img.onerror=null;
        resolve(
          success&&
          states.get(img)?.token===token
        );
      };

      img.onload=()=>finish(img.naturalWidth>0);
      img.onerror=()=>finish(false);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src=source;

      if(img.complete){
        queueMicrotask(()=>finish(img.naturalWidth>0));
      }
    });
  }

  function preloadSource(source,priority='auto'){
    return new Promise(resolve=>{
      const probe=new Image();
      let settled=false;

      const finish=success=>{
        if(settled)return;
        settled=true;
        probe.onload=null;
        probe.onerror=null;
        resolve(success?probe:null);
      };

      probe.decoding='async';
      probe.fetchPriority=priority;
      probe.onload=async()=>{
        if(typeof probe.decode==='function'){
          try{
            await probe.decode();
          }catch{
            /* The completed load is still usable. */
          }
        }
        finish(probe.naturalWidth>0);
      };
      probe.onerror=()=>finish(false);
      probe.src=source;

      if(probe.complete){
        queueMicrotask(()=>finish(probe.naturalWidth>0));
      }
    });
  }

  function getOrCreateState(img,originalSource){
    const original=clean(originalSource);
    const existing=states.get(img);

    if(existing?.original===original){
      return existing;
    }

    const state={
      original,
      token:Symbol('progressive-detail'),
      previewPromise:null,
      upgradePromise:null,
      previewLoaded:false,
      fullLoaded:false,
      currentSource:''
    };

    states.set(img,state);
    return state;
  }

  async function ensurePreview(img,originalSource,priority='high'){
    if(!img)return false;

    const state=getOrCreateState(img,originalSource);
    if(state.previewLoaded||state.fullLoaded)return true;
    if(state.previewPromise)return state.previewPromise;

    markLoading(img);
    img.fetchPriority=priority;
    img.loading=priority==='high'?'eager':'lazy';
    img.decoding='async';

    const preview=responsive.variantPath(state.original,PREVIEW_WIDTH);
    const full=responsive.variantPath(state.original,FULL_WIDTH);
    const candidates=unique([preview,full,state.original]);
    const token=state.token;

    state.previewPromise=(async()=>{
      for(const source of candidates){
        const success=await loadIntoElement(img,source,token);
        if(!success)continue;

        const current=states.get(img);
        if(!current||current.token!==token)return false;

        current.currentSource=source;
        current.previewLoaded=true;
        current.fullLoaded=source!==preview;
        markLoaded(img,current.fullLoaded?'full':'preview');
        return true;
      }

      if(states.get(img)?.token===token){
        markError(img);
      }
      return false;
    })();

    return state.previewPromise;
  }

  async function ensureFull(img,originalSource,priority='auto'){
    if(!img||isConstrainedNetwork())return false;

    const previewReady=await ensurePreview(img,originalSource,priority);
    if(!previewReady)return false;

    const state=getOrCreateState(img,originalSource);
    if(state.fullLoaded)return true;
    if(state.upgradePromise)return state.upgradePromise;

    const token=state.token;
    const full=responsive.variantPath(state.original,FULL_WIDTH);
    const candidates=unique([full,state.original])
      .filter(source=>source!==state.currentSource);

    state.upgradePromise=(async()=>{
      for(const source of candidates){
        const probe=await preloadSource(source,priority);
        const current=states.get(img);

        if(
          !probe||
          !current||
          current.token!==token||
          !img.isConnected
        ){
          if(current?.token!==token)return false;
          continue;
        }

        /*
         * The source has already loaded and decoded in a detached Image.
         * Assigning the cached response keeps the 480px preview visible until
         * the 960px replacement is ready, avoiding a second blank state.
         */
        img.src=source;
        current.currentSource=source;
        current.fullLoaded=true;
        markLoaded(img,'full');
        return true;
      }

      return false;
    })();

    return state.upgradePromise;
  }

  function detailSlideAt(container,index){
    return container?.querySelector(
      `.detail-slide[data-progressive-index="${index}"]`
    )||null;
  }

  async function loadDetailSlide(
    container,
    index,
    {priority='auto',upgrade=true}={}
  ){
    const slide=detailSlideAt(container,index);
    const img=slide?.querySelector('img[data-progressive-source]');
    if(!img)return false;

    const original=img.dataset.progressiveSource;
    const shown=await ensurePreview(img,original,priority);

    if(shown&&upgrade){
      /* Do not block UI on the high-resolution replacement. */
      ensureFull(img,original,priority);
    }

    return shown;
  }

  function scheduleTask(callback,delay){
    setTimeout(()=>{
      if('requestIdleCallback' in window){
        requestIdleCallback(callback,{timeout:700});
      }else{
        callback();
      }
    },delay);
  }

  function preloadNeighbors(container,index,renderId){
    const slides=[
      ...container.querySelectorAll(
        '.detail-slide[data-progressive-index]'
      )
    ];
    const count=slides.length;
    if(count<=1)return;

    const next=(index+1)%count;
    const previous=(index-1+count)%count;

    scheduleTask(()=>{
      if(
        !container.isConnected||
        container.dataset.progressiveRenderId!==String(renderId)
      )return;

      loadDetailSlide(container,next,{
        priority:'auto',
        upgrade:false
      });
    },FIRST_NEIGHBOR_DELAY);

    if(previous!==next){
      scheduleTask(()=>{
        if(
          !container.isConnected||
          container.dataset.progressiveRenderId!==String(renderId)
        )return;

        loadDetailSlide(container,previous,{
          priority:'auto',
          upgrade:false
        });
      },SECOND_NEIGHBOR_DELAY);
    }
  }

  function renderProgressiveDetailMedia(){
    const container=document.getElementById('detailMedia');
    if(!container||!activeProduct)return;

    const images=productCarouselImages(activeProduct);
    if(detailSlideIndex>=images.length)detailSlideIndex=0;

    const renderId=++renderSequence;
    container.dataset.progressiveRenderId=String(renderId);

    const slidesHtml=images.length
      ? `
        <div class="detail-slides">
          ${images.map((source,index)=>`
            <div
              class="detail-slide media-frame ${index===detailSlideIndex?'active':''}"
              data-progressive-index="${index}"
            >
              <span class="media-skeleton" aria-hidden="true"></span>
              <img
                data-progressive-source="${escapeAttr(source)}"
                alt="${escapeAttr(productDisplayName(activeProduct))} ${index+1}"
                width="960"
                height="1440"
                loading="lazy"
                decoding="async"
              >
            </div>
          `).join('')}
        </div>
      `
      : `
        <div class="detail-slide media-frame active is-error">
          <span class="media-skeleton" aria-hidden="true"></span>
        </div>
      `;

    const controlsHtml=images.length>1
      ? `
        <button
          class="carousel-btn prev"
          onclick="event.stopPropagation();changeDetailSlide(-1)"
        >
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <button
          class="carousel-btn next"
          onclick="event.stopPropagation();changeDetailSlide(1)"
        >
          <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
        </button>

        <div class="carousel-dots">
          ${images.map((_,index)=>`
            <button
              class="carousel-dot ${index===detailSlideIndex?'active':''}"
              onclick="event.stopPropagation();setDetailSlide(${index})"
            ></button>
          `).join('')}
        </div>
      `
      : '';

    container.className=`detail-media ${activeProduct.color}`;
    container.innerHTML=`
      ${slidesHtml}
      ${controlsHtml}
      <div class="detail-titlebox">
        <h2>${productDisplayName(activeProduct)}</h2>
        <p>${productDesc(activeProduct)}</p>
      </div>
    `;

    bindDetailSwipe();
    loadDetailSlide(container,detailSlideIndex,{
      priority:'high',
      upgrade:true
    }).then(shown=>{
      if(shown){
        preloadNeighbors(container,detailSlideIndex,renderId);
      }
    });
    startDetailCarousel();
  }

  function installHooks(){
    if(typeof renderDetailMedia==='function'){
      renderDetailMedia=renderProgressiveDetailMedia;
    }

    if(typeof updateDetailSlide==='function'){
      const previousUpdateDetailSlide=updateDetailSlide;

      updateDetailSlide=function(){
        const result=previousUpdateDetailSlide.apply(this,arguments);
        const container=document.getElementById('detailMedia');

        if(container){
          const renderId=Number(
            container.dataset.progressiveRenderId||0
          );

          loadDetailSlide(container,detailSlideIndex,{
            priority:'high',
            upgrade:true
          }).then(shown=>{
            if(shown){
              preloadNeighbors(
                container,
                detailSlideIndex,
                renderId
              );
            }
          });
        }

        return result;
      };
    }
  }

  installHooks();

  window.DreamlandProgressiveDetail={
    loadDetailSlide,
    ensurePreview,
    ensureFull
  };
})();

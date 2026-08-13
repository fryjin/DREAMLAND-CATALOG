(function(){
  'use strict';

  if(
    window
      .DreamlandProgressiveDetail
  ){
    return;
  }

  const media=
    window.DreamlandMedia;

  const hooks=
    window.DreamlandRuntimeHooks;

  if(!media){
    console.warn(
      '[catalog] Progressive detail loader requires DreamlandMedia.'
    );
    return;
  }

  if(!hooks){
    console.warn(
      '[catalog] Progressive detail loader requires DreamlandRuntimeHooks.'
    );
    return;
  }

  const PREVIEW_WIDTH=480;
  const FULL_WIDTH=960;
  const FORWARD_QUEUE_START_DELAY=40;
  const FULL_UPGRADE_FAST_DELAY=1500;
  const FULL_UPGRADE_NORMAL_DELAY=2400;
  const AUTO_CAROUSEL_DELAY=4200;
  const FAST_PREVIEW_MS=300;
  const SLOW_PREVIEW_MS=700;
  const MAX_METRIC_SAMPLES=6;

  const states=
    new WeakMap();

  const queueStates=
    new WeakMap();

  const fullUpgradeTimers=
    new WeakMap();

  let renderSequence=0;
  let autoSequence=0;

  const metrics={
    previewSamples:[],
    previewAverageMs:0,
    networkProfile:'unknown'
  };

  function now(){
    return (
      typeof performance!==
        'undefined'&&
      typeof performance.now===
        'function'
    )
      ? performance.now()
      : Date.now();
  }

  function delay(ms){
    return new Promise(
      resolve=>
        setTimeout(
          resolve,
          ms
        )
    );
  }

  function isConstrainedNetwork(){
    return media
      .isConstrainedNetwork(
        metrics.networkProfile
      );
  }

  function recordPreviewDuration(
    durationMs
  ){
    if(
      !Number.isFinite(
        durationMs
      )||
      durationMs<0
    ){
      return;
    }

    metrics.previewSamples.push(
      Math.round(
        durationMs
      )
    );

    if(
      metrics.previewSamples.length>
      MAX_METRIC_SAMPLES
    ){
      metrics.previewSamples.shift();
    }

    metrics.previewAverageMs=
      Math.round(
        metrics.previewSamples
          .reduce(
            (sum,value)=>
              sum+value,
            0
          )/
        metrics.previewSamples.length
      );

    metrics.networkProfile=
      metrics.previewAverageMs<=
      FAST_PREVIEW_MS
        ? 'fast'
        : (
            metrics.previewAverageMs>
            SLOW_PREVIEW_MS
              ? 'slow'
              : 'normal'
          );

    document.documentElement
      .dataset
      .imageNetworkProfile=
      metrics.networkProfile;
  }

  function fullUpgradeDelay(){
    return (
      metrics.networkProfile===
      'fast'
    )
      ? FULL_UPGRADE_FAST_DELAY
      : FULL_UPGRADE_NORMAL_DELAY;
  }

  function escapeAttr(value){
    return String(
      value??''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      );
  }

  function getOrCreateState(
    img,
    originalSource
  ){
    const original=
      media.cleanPath(
        originalSource
      );

    const existing=
      states.get(img);

    if(
      existing?.original===
      original
    ){
      return existing;
    }

    const state={
      original,
      token:
        Symbol(
          'progressive-detail'
        ),
      previewPromise:null,
      upgradePromise:null,
      previewLoaded:false,
      fullLoaded:false,
      currentSource:'',
      previewDurationMs:null
    };

    states.set(
      img,
      state
    );

    return state;
  }

  async function ensurePreview(
    img,
    originalSource,
    priority='high'
  ){
    if(!img){
      return false;
    }

    const state=
      getOrCreateState(
        img,
        originalSource
      );

    if(
      state.previewLoaded||
      state.fullLoaded
    ){
      return true;
    }

    if(
      state.previewPromise
    ){
      return state.previewPromise;
    }

    media.markLoading(img);

    media.configureImage(
      img,
      priority
    );

    const preview=
      media.variantPath(
        state.original,
        PREVIEW_WIDTH
      );

    const full=
      media.variantPath(
        state.original,
        FULL_WIDTH
      );

    const candidates=
      media.unique([
        preview,
        full,
        state.original
      ]);

    const token=
      state.token;

    state.previewPromise=
      (async()=>{
        for(
          const source of
          candidates
        ){
          const startedAt=
            now();

          const success=
            await media
              .loadElementSource(
                img,
                source,
                {
                  isCurrent:()=>(
                    states
                      .get(img)
                      ?.token===
                    token
                  )
                }
              );

          if(!success){
            continue;
          }

          const current=
            states.get(img);

          if(
            !current||
            current.token!==
            token
          ){
            return false;
          }

          current.currentSource=
            source;

          current.previewLoaded=
            true;

          current.fullLoaded=
            source!==preview;

          current.previewDurationMs=
            Math.max(
              0,
              now()-
              startedAt
            );

          if(
            source===
            preview
          ){
            recordPreviewDuration(
              current
                .previewDurationMs
            );
          }

          media.markLoaded(
            img,
            current.fullLoaded
              ? 'full'
              : 'preview'
          );

          return true;
        }

        if(
          states
            .get(img)
            ?.token===
          token
        ){
          media.markError(
            img
          );
        }

        return false;
      })();

    return state
      .previewPromise;
  }

  async function ensureFull(
    img,
    originalSource,
    priority='low'
  ){
    if(
      !img||
      isConstrainedNetwork()
    ){
      return false;
    }

    const previewReady=
      await ensurePreview(
        img,
        originalSource,
        'auto'
      );

    if(!previewReady){
      return false;
    }

    const state=
      getOrCreateState(
        img,
        originalSource
      );

    if(state.fullLoaded){
      return true;
    }

    if(
      state.upgradePromise
    ){
      return state
        .upgradePromise;
    }

    const token=
      state.token;

    const full=
      media.variantPath(
        state.original,
        FULL_WIDTH
      );

    const candidates=
      media.unique([
        full,
        state.original
      ]).filter(
        source=>
          source!==
          state.currentSource
      );

    state.upgradePromise=
      (async()=>{
        for(
          const source of
          candidates
        ){
          const probe=
            await media
              .preloadSource(
                source,
                priority
              );

          const current=
            states.get(img);

          if(
            !probe||
            !current||
            current.token!==
              token||
            !img.isConnected
          ){
            if(
              current?.token!==
              token
            ){
              return false;
            }

            continue;
          }

          img.src=source;

          current.currentSource=
            source;

          current.fullLoaded=
            true;

          media.markLoaded(
            img,
            'full'
          );

          return true;
        }

        return false;
      })();

    return state
      .upgradePromise;
  }

  function detailSlideAt(
    container,
    index
  ){
    return (
      container
        ?.querySelector(
          `.detail-slide[data-progressive-index="${index}"]`
        )||
      null
    );
  }

  function detailImageAt(
    container,
    index
  ){
    return (
      detailSlideAt(
        container,
        index
      )
        ?.querySelector(
          'img[data-progressive-source]'
        )||
      null
    );
  }

  async function loadDetailSlide(
    container,
    index,
    {
      priority='auto',
      upgrade=false
    }={}
  ){
    const img=
      detailImageAt(
        container,
        index
      );

    if(!img){
      return false;
    }

    const original=
      img.dataset
        .progressiveSource;

    const shown=
      await ensurePreview(
        img,
        original,
        priority
      );

    if(
      shown&&
      upgrade
    ){
      ensureFull(
        img,
        original,
        'low'
      );
    }

    return shown;
  }

  function forwardIndexes(
    index,
    count
  ){
    const indexes=[];

    for(
      let offset=1;
      offset<count;
      offset++
    ){
      indexes.push(
        (index+offset)%
        count
      );
    }

    return indexes;
  }

  function queueIsCurrent(
    container,
    queueToken,
    renderId
  ){
    return Boolean(
      container?.isConnected&&
      container.dataset
        .progressiveRenderId===
        String(renderId)&&
      queueStates
        .get(container)
        ?.token===
        queueToken
    );
  }

  function preloadForwardQueue(
    container,
    index,
    renderId
  ){
    const slides=[
      ...container
        .querySelectorAll(
          '.detail-slide[data-progressive-index]'
        )
    ];

    const count=
      slides.length;

    if(count<=1){
      return Promise.resolve(
        true
      );
    }

    const queueToken=
      Symbol(
        'forward-preview-queue'
      );

    const queueState={
      token:queueToken,
      promise:null
    };

    queueStates.set(
      container,
      queueState
    );

    queueState.promise=
      (async()=>{
        await delay(
          FORWARD_QUEUE_START_DELAY
        );

        const indexes=
          forwardIndexes(
            index,
            count
          );

        for(
          let position=0;
          position<
          indexes.length;
          position++
        ){
          if(
            !queueIsCurrent(
              container,
              queueToken,
              renderId
            )
          ){
            return false;
          }

          const loaded=
            await loadDetailSlide(
              container,
              indexes[position],
              {
                priority:
                  position===0
                    ? 'high'
                    : 'auto',
                upgrade:false
              }
            );

          if(
            !loaded&&
            metrics
              .networkProfile===
              'slow'
          ){
            return false;
          }
        }

        return true;
      })();

    return queueState
      .promise;
  }

  function slideIsActive(
    container,
    index,
    renderId
  ){
    return Boolean(
      container?.isConnected&&
      container.dataset
        .progressiveRenderId===
        String(renderId)&&
      Number(
        detailSlideIndex
      )===
      Number(index)&&
      detailSlideAt(
        container,
        index
      )
        ?.classList
        .contains(
          'active'
        )
    );
  }

  function scheduleFullUpgrade(
    container,
    index,
    renderId,
    queuePromise
  ){
    const img=
      detailImageAt(
        container,
        index
      );

    if(
      !img||
      isConstrainedNetwork()
    ){
      return;
    }

    const previousTimer=
      fullUpgradeTimers
        .get(img);

    if(previousTimer){
      clearTimeout(
        previousTimer
      );
    }

    const timer=
      setTimeout(
        async()=>{
          fullUpgradeTimers
            .delete(img);

          if(
            !slideIsActive(
              container,
              index,
              renderId
            )||
            metrics
              .networkProfile===
              'slow'
          ){
            return;
          }

          await Promise.race([
            Promise.resolve(
              queuePromise
            ).catch(
              ()=>false
            ),
            delay(
              fullUpgradeDelay()
            )
          ]);

          if(
            !slideIsActive(
              container,
              index,
              renderId
            )||
            metrics
              .networkProfile===
              'slow'
          ){
            return;
          }

          const original=
            img.dataset
              .progressiveSource;

          ensureFull(
            img,
            original,
            'low'
          );
        },
        0
      );

    fullUpgradeTimers.set(
      img,
      timer
    );
  }

  async function activateDetailSlide(
    container,
    index,
    renderId
  ){
    const shown=
      await loadDetailSlide(
        container,
        index,
        {
          priority:'high',
          upgrade:false
        }
      );

    if(!shown){
      return false;
    }

    const queuePromise=
      preloadForwardQueue(
        container,
        index,
        renderId
      );

    scheduleFullUpgrade(
      container,
      index,
      renderId,
      queuePromise
    );

    return true;
  }

  function clearDetailTimer(){
    autoSequence+=1;

    if(
      typeof detailTimer===
        'undefined'||
      !detailTimer
    ){
      return;
    }

    clearTimeout(
      detailTimer
    );

    clearInterval(
      detailTimer
    );

    detailTimer=null;
  }

  function canAutoAdvance(){
    if(
      document
        .visibilityState===
      'hidden'
    ){
      return false;
    }

    if(
      typeof activeScreen!==
        'undefined'&&
      activeScreen!==
        'detail'
    ){
      return false;
    }

    if(
      typeof detailSwipePointerId!==
        'undefined'&&
      detailSwipePointerId!==
        null
    ){
      return false;
    }

    return true;
  }

  function scheduleAutoAdvance(){
    clearDetailTimer();

    const cycle=
      autoSequence;

    const images=
      productCarouselImages(
        activeProduct
      );

    if(
      images.length<=1
    ){
      return;
    }

    detailTimer=
      setTimeout(
        async()=>{
          if(
            cycle!==
            autoSequence
          ){
            return;
          }

          const container=
            document
              .getElementById(
                'detailMedia'
              );

          const currentImages=
            productCarouselImages(
              activeProduct
            );

          if(
            !container||
            currentImages.length<=1
          ){
            if(
              cycle===
              autoSequence
            ){
              scheduleAutoAdvance();
            }

            return;
          }

          if(
            !canAutoAdvance()
          ){
            if(
              cycle===
              autoSequence
            ){
              scheduleAutoAdvance();
            }

            return;
          }

          const startingIndex=
            detailSlideIndex;

          const renderId=
            container.dataset
              .progressiveRenderId||
            '';

          const next=
            (
              startingIndex+1
            )%
            currentImages.length;

          const ready=
            await loadDetailSlide(
              container,
              next,
              {
                priority:'high',
                upgrade:false
              }
            );

          if(
            cycle!==
            autoSequence
          ){
            return;
          }

          if(
            ready&&
            canAutoAdvance()&&
            container.isConnected&&
            detailSlideIndex===
              startingIndex&&
            container.dataset
              .progressiveRenderId===
              renderId
          ){
            detailSlideIndex=
              next;

            updateDetailSlide();
          }

          if(
            cycle===
            autoSequence
          ){
            scheduleAutoAdvance();
          }
        },
        AUTO_CAROUSEL_DELAY
      );
  }

  function renderProgressiveDetailMedia(){
    const container=
      document.getElementById(
        'detailMedia'
      );

    if(
      !container||
      !activeProduct
    ){
      return;
    }

    const images=
      productCarouselImages(
        activeProduct
      );

    if(
      detailSlideIndex>=
      images.length
    ){
      detailSlideIndex=0;
    }

    const renderId=
      ++renderSequence;

    container.dataset
      .progressiveRenderId=
      String(renderId);

    const slidesHtml=
      images.length
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

    const controlsHtml=
      images.length>1
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

    container.className=
      `detail-media ${activeProduct.color}`;

    container.innerHTML=`
      ${slidesHtml}
      ${controlsHtml}
      <div class="detail-titlebox">
        <h2>${productDisplayName(activeProduct)}</h2>
        <p>${productDesc(activeProduct)}</p>
      </div>
    `;

    bindDetailSwipe();

    activateDetailSlide(
      container,
      detailSlideIndex,
      renderId
    );

    startDetailCarousel();
  }

  function registerHooks(){
    hooks.register(
      'detail.renderMedia',
      renderProgressiveDetailMedia,
      {
        owner:'detail-progressive'
      }
    );

    hooks.register(
      'detail.startCarousel',
      scheduleAutoAdvance,
      {
        owner:'detail-progressive'
      }
    );

    hooks.subscribe(
      'detail.afterSlideUpdate',
      payload=>{
        const container=
          payload?.container||
          document.getElementById(
            'detailMedia'
          );

        if(container){
          const renderId=
            Number(
              container.dataset
                .progressiveRenderId||
              0
            );

          activateDetailSlide(
            container,
            Number(
              payload?.index??
              detailSlideIndex
            ),
            renderId
          );
        }
      },
      {
        owner:'detail-progressive'
      }
    );

    document.addEventListener(
      'visibilitychange',
      ()=>{
        if(
          document
            .visibilityState===
          'visible'
        ){
          if(
            typeof activeScreen===
              'undefined'||
            activeScreen===
              'detail'
          ){
            scheduleAutoAdvance();
          }
        }else{
          clearDetailTimer();
        }
      }
    );
  }

  registerHooks();

  window.DreamlandProgressiveDetail=
    Object.freeze({
      loadDetailSlide,
      ensurePreview,
      ensureFull,
      preloadForwardQueue,
      metrics
    });
})();

(function(root){
  'use strict';

  if(root.DreamlandMedia){
    return;
  }

  const CATALOG_WIDTH=480;
  const DETAIL_WIDTH=960;
  const SHARED_WIDTH=960;

  const responsiveStates=new WeakMap();

  function cleanPath(value){
    return String(value||'').trim();
  }

  function unique(values){
    return [
      ...new Set(
        (Array.isArray(values)?values:[])
          .map(cleanPath)
          .filter(Boolean)
      )
    ];
  }

  function connectionInfo(){
    return (
      root.navigator?.connection||
      root.navigator?.mozConnection||
      root.navigator?.webkitConnection||
      null
    );
  }

  function isConstrainedNetwork(
    networkProfile=''
  ){
    const connection=connectionInfo();

    return Boolean(
      connection?.saveData||
      /(^|-)2g$/i.test(
        connection?.effectiveType||''
      )||
      networkProfile==='slow'
    );
  }

  function responsiveWidth(
    kind='detail',
    networkProfile=''
  ){
    if(kind==='catalog'){
      return CATALOG_WIDTH;
    }

    if(kind==='shared'){
      return isConstrainedNetwork(
        networkProfile
      )
        ? CATALOG_WIDTH
        : SHARED_WIDTH;
    }

    return isConstrainedNetwork(
      networkProfile
    )
      ? CATALOG_WIDTH
      : DETAIL_WIDTH;
  }

  function variantPath(
    source,
    width
  ){
    const value=cleanPath(source);

    if(
      !value||
      value.includes(
        '/images/generated/'
      )
    ){
      return value;
    }

    const suffixMatch=
      value.match(/([?#].*)$/);

    const suffix=
      suffixMatch?.[1]||'';

    const base=
      suffix
        ? value.slice(
            0,
            -suffix.length
          )
        : value;

    const marker='/images/';
    const markerIndex=
      base.indexOf(marker);

    if(markerIndex<0){
      return value;
    }

    const extensionIndex=
      base.lastIndexOf('.');

    if(
      extensionIndex<=
      markerIndex+
      marker.length
    ){
      return value;
    }

    const prefix=
      base.slice(
        0,
        markerIndex+
        marker.length
      );

    const relative=
      base.slice(
        markerIndex+
        marker.length,
        extensionIndex
      );

    return (
      `${prefix}generated/`+
      `${relative}-${width}.webp`+
      suffix
    );
  }

  function frameFor(img){
    return (
      img?.closest?.(
        '.media-frame,'+
        '.product-visual,'+
        '.detail-slide,'+
        '.inquiry-media'
      )||
      null
    );
  }

  function markLoading(img){
    const frame=frameFor(img);

    frame?.classList.add(
      'is-loading'
    );

    frame?.classList.remove(
      'is-loaded',
      'is-error'
    );
  }

  function markLoaded(
    img,
    quality=''
  ){
    const frame=frameFor(img);

    frame?.classList.add(
      'is-loaded'
    );

    frame?.classList.remove(
      'is-loading',
      'is-error'
    );

    img?.classList?.remove(
      'is-missing'
    );

    if(
      img?.dataset&&
      quality
    ){
      img.dataset.responsiveQuality=
        quality;
    }
  }

  function markError(img){
    const frame=frameFor(img);

    frame?.classList.add(
      'is-error'
    );

    frame?.classList.remove(
      'is-loading',
      'is-loaded'
    );

    img?.classList?.add(
      'is-missing'
    );
  }

  function configureImage(
    img,
    priority='auto'
  ){
    if(!img){
      return;
    }

    img.fetchPriority=priority;
    img.loading=
      priority==='high'
        ? 'eager'
        : 'lazy';
    img.decoding='async';
  }

  function loadElementSource(
    img,
    source,
    {
      isCurrent=()=>true
    }={}
  ){
    return new Promise(resolve=>{
      if(
        !img||
        !cleanPath(source)
      ){
        resolve(false);
        return;
      }

      let settled=false;

      const finish=success=>{
        if(settled){
          return;
        }

        settled=true;
        img.onload=null;
        img.onerror=null;

        resolve(
          Boolean(
            success&&
            isCurrent()
          )
        );
      };

      img.onload=()=>{
        finish(
          img.naturalWidth>0
        );
      };

      img.onerror=()=>{
        finish(false);
      };

      img.removeAttribute(
        'srcset'
      );

      img.removeAttribute(
        'sizes'
      );

      img.src=source;

      if(img.complete){
        queueMicrotask(()=>{
          finish(
            img.naturalWidth>0
          );
        });
      }
    });
  }

  async function decodeImage(img){
    if(
      !img||
      typeof img.decode!==
      'function'
    ){
      return;
    }

    try{
      await img.decode();
    }catch{
      /* load event already confirms a usable image */
    }
  }

  async function loadCandidates(
    img,
    candidates,
    {
      priority='auto',
      quality='',
      isCurrent=()=>true,
      markState=true
    }={}
  ){
    if(!img){
      return {
        success:false,
        source:''
      };
    }

    const sources=
      unique(candidates);

    if(!sources.length){
      if(markState){
        markError(img);
      }

      return {
        success:false,
        source:''
      };
    }

    configureImage(
      img,
      priority
    );

    if(markState){
      markLoading(img);
    }

    for(
      const source of
      sources
    ){
      if(!isCurrent()){
        return {
          success:false,
          source:''
        };
      }

      const success=
        await loadElementSource(
          img,
          source,
          {isCurrent}
        );

      if(!success){
        continue;
      }

      await decodeImage(img);

      if(
        !isCurrent()||
        !img.naturalWidth
      ){
        continue;
      }

      if(markState){
        markLoaded(
          img,
          quality
        );
      }

      return {
        success:true,
        source
      };
    }

    if(
      markState&&
      isCurrent()
    ){
      markError(img);
    }

    return {
      success:false,
      source:''
    };
  }

  function resetResponsiveImage(
    img
  ){
    if(!img){
      return;
    }

    responsiveStates.delete(img);
  }

  async function loadResponsiveImage(
    img,
    originalSource,
    kind='catalog',
    priority='auto',
    networkProfile=''
  ){
    if(!img){
      return false;
    }

    const current=
      responsiveStates.get(img);

    if(
      current?.status===
      'loaded'
    ){
      return true;
    }

    if(
      current?.status===
      'loading'
    ){
      return current.promise;
    }

    const width=
      responsiveWidth(
        kind,
        networkProfile
      );

    const sources=
      unique([
        variantPath(
          originalSource,
          width
        ),
        originalSource
      ]);

    const token=
      Symbol(
        'dreamland-media-responsive'
      );

    /*
     * Register the loading token before loadCandidates() starts.
     *
     * Async functions execute synchronously until the first await.
     * The previous order allowed loadCandidates() to evaluate
     * isCurrent() before responsiveStates contained this token,
     * cancelling every fresh Catalog responsive image.
     */
    const loadingState={
      status:'loading',
      token,
      promise:null
    };

    responsiveStates.set(
      img,
      loadingState
    );

    const promise=(async()=>{
      const result=
        await loadCandidates(
          img,
          sources,
          {
            priority,
            quality:
              width===CATALOG_WIDTH
                ? 'preview'
                : 'full',
            isCurrent:()=>(
              responsiveStates
                .get(img)
                ?.token===
              token
            )
          }
        );

      if(result.success){
        responsiveStates.set(
          img,
          {
            status:'loaded',
            token,
            source:result.source
          }
        );

        return true;
      }

      if(
        responsiveStates
          .get(img)
          ?.token===
        token
      ){
        responsiveStates.set(
          img,
          {
            status:'error',
            token
          }
        );
      }

      return false;
    })();

    loadingState.promise=
      promise;

    return promise;
  }

  function preloadSource(
    source,
    priority='low'
  ){
    return new Promise(resolve=>{
      const clean=
        cleanPath(source);

      if(
        !clean||
        typeof root.Image!==
        'function'
      ){
        resolve(null);
        return;
      }

      const probe=
        new root.Image();

      let settled=false;

      const finish=success=>{
        if(settled){
          return;
        }

        settled=true;
        probe.onload=null;
        probe.onerror=null;

        resolve(
          success
            ? probe
            : null
        );
      };

      probe.decoding='async';
      probe.fetchPriority=
        priority;

      probe.onload=async()=>{
        await decodeImage(probe);

        finish(
          probe.naturalWidth>0
        );
      };

      probe.onerror=()=>{
        finish(false);
      };

      probe.src=clean;

      if(probe.complete){
        queueMicrotask(()=>{
          finish(
            probe.naturalWidth>0
          );
        });
      }
    });
  }

  const api=Object.freeze({
    version:'B2-04',
    widths:Object.freeze({
      catalog:CATALOG_WIDTH,
      detail:DETAIL_WIDTH,
      shared:SHARED_WIDTH
    }),
    cleanPath,
    unique,
    connectionInfo,
    isConstrainedNetwork,
    responsiveWidth,
    variantPath,
    frameFor,
    markLoading,
    markLoaded,
    markError,
    configureImage,
    loadElementSource,
    loadCandidates,
    loadResponsiveImage,
    resetResponsiveImage,
    preloadSource
  });

  root.DreamlandMedia=api;
})(
  typeof globalThis!==
  'undefined'
    ? globalThis
    : this
);

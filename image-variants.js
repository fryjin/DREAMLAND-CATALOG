(function(){
  'use strict';

  if(window.DreamlandResponsiveImages)return;

  const CATALOG_WIDTH=480;
  const DETAIL_WIDTH=960;
  const SHARED_WIDTH=960;
  const imageStates=new WeakMap();
  let catalogObserver=null;

  function cleanPath(value){
    return String(value||'').trim();
  }

  function unique(values){
    return [...new Set(values.map(cleanPath).filter(Boolean))];
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

  function responsiveWidth(kind){
    if(kind==='catalog')return CATALOG_WIDTH;
    if(kind==='shared')return isConstrainedNetwork()?CATALOG_WIDTH:SHARED_WIDTH;
    return isConstrainedNetwork()?CATALOG_WIDTH:DETAIL_WIDTH;
  }

  function variantPath(source,width){
    const value=cleanPath(source);
    if(!value||value.includes('/images/generated/'))return value;

    const suffixMatch=value.match(/([?#].*)$/);
    const suffix=suffixMatch?.[1]||'';
    const base=suffix?value.slice(0,-suffix.length):value;
    const marker='/images/';
    const markerIndex=base.indexOf(marker);

    if(markerIndex<0)return value;

    const extensionIndex=base.lastIndexOf('.');
    if(extensionIndex<=markerIndex+marker.length)return value;

    const prefix=base.slice(0,markerIndex+marker.length);
    const relative=base.slice(markerIndex+marker.length,extensionIndex);

    return `${prefix}generated/${relative}-${width}.webp${suffix}`;
  }

  function frameFor(img){
    return img?.closest(
      '.media-frame,.product-visual,.detail-slide,.inquiry-media'
    )||null;
  }

  function markLoading(img){
    const frame=frameFor(img);
    frame?.classList.add('is-loading');
    frame?.classList.remove('is-loaded','is-error');
  }

  function markLoaded(img){
    const frame=frameFor(img);
    frame?.classList.add('is-loaded');
    frame?.classList.remove('is-loading','is-error');
    img.classList.remove('is-missing');
  }

  function markError(img){
    const frame=frameFor(img);
    frame?.classList.add('is-error');
    frame?.classList.remove('is-loading','is-loaded');
    img.classList.add('is-missing');
  }

  function loadCandidate(img,source,token){
    return new Promise(resolve=>{
      const finish=success=>{
        img.onload=null;
        img.onerror=null;
        resolve(success&&imageStates.get(img)?.token===token);
      };

      img.onload=()=>finish(
        img.naturalWidth>0
      );
      img.onerror=()=>finish(false);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src=source;

      if(img.complete){
        queueMicrotask(()=>{
          if(img.naturalWidth>0)finish(true);
        });
      }
    });
  }

  async function loadResponsiveImage(
    img,
    originalSource,
    kind='catalog',
    priority='auto'
  ){
    if(!img)return false;

    const current=imageStates.get(img);
    if(current?.status==='loaded')return true;
    if(current?.status==='loading')return current.promise;

    const width=responsiveWidth(kind);
    const sources=unique([
      variantPath(originalSource,width),
      originalSource
    ]);

    const token=Symbol('responsive-image');
    markLoading(img);

    img.fetchPriority=priority;
    img.loading=priority==='high'?'eager':'lazy';
    img.decoding='async';

    const promise=(async()=>{
      for(const source of sources){
        const success=await loadCandidate(img,source,token);
        if(success){
          imageStates.set(img,{
            status:'loaded',
            token,
            source
          });
          markLoaded(img);
          return true;
        }
      }

      imageStates.set(img,{
        status:'error',
        token
      });
      markError(img);
      return false;
    })();

    imageStates.set(img,{
      status:'loading',
      token,
      promise
    });

    return promise;
  }

  function escapeAttr(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/"/g,'&quot;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function catalogRoot(){
    return document.querySelector(
      '.screen[data-screen="catalog"] .content'
    );
  }

  function getCatalogObserver(){
    if(catalogObserver)return catalogObserver;
    if(!('IntersectionObserver' in window))return null;

    catalogObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;

        const img=entry.target;
        loadResponsiveImage(
          img,
          img.dataset.responsiveSource,
          'catalog',
          img.dataset.responsivePriority||'auto'
        );
        catalogObserver.unobserve(img);
      });
    },{
      root:catalogRoot(),
      rootMargin:'100px 0px 220px 0px',
      threshold:0.01
    });

    return catalogObserver;
  }

  function mountResponsiveCatalog(container=document){
    container
      .querySelectorAll?.(
        '.product-cover[data-responsive-source]'
      )
      .forEach(img=>{
        if(img.dataset.responsiveBound==='1')return;
        img.dataset.responsiveBound='1';

        const priority=
          img.dataset.responsivePriority||
          'auto';

        if(priority==='high'){
          loadResponsiveImage(
            img,
            img.dataset.responsiveSource,
            'catalog',
            'high'
          );
          return;
        }

        const observer=getCatalogObserver();
        if(observer){
          observer.observe(img);
        }else{
          loadResponsiveImage(
            img,
            img.dataset.responsiveSource,
            'catalog'
          );
        }
      });
  }

  function enhancedProductCard(product,index,tall=false){
    const original=productCover(product);
    const name=productDisplayName(product);
    const priority=index<2?'high':'auto';

    return `
      <article
        class="product-card ${tall?'tall':''}"
        style="animation-delay:${Math.min(index%5,4)*42}ms"
        onclick="openDetail('${escapeAttr(product.id)}')"
      >
        <div class="product-visual media-frame">
          <span class="media-skeleton" aria-hidden="true"></span>
          <img
            class="product-cover"
            data-image-manager-catalog="1"
            data-responsive-source="${escapeAttr(original)}"
            data-responsive-priority="${priority}"
            alt="${escapeAttr(name)}"
            width="480"
            height="720"
            loading="lazy"
            decoding="async"
          >
        </div>

        <button
          class="add-mini"
          onclick="event.stopPropagation();quickAdd('${escapeAttr(product.id)}')"
        >
          +
        </button>

        <div class="product-name">${name}</div>
        <div class="price-row">
          <span class="price">${fromPrice(catalogUnit(product))}</span>
        </div>
      </article>
    `;
  }

  function detailSlideAt(container,index){
    return container?.querySelector(
      `.detail-slide[data-responsive-index="${index}"]`
    )||null;
  }

  function loadResponsiveDetail(container,index,priority='auto'){
    const slide=detailSlideAt(container,index);
    const img=slide?.querySelector(
      'img[data-responsive-source]'
    );

    if(!img)return Promise.resolve(false);

    return loadResponsiveImage(
      img,
      img.dataset.responsiveSource,
      'detail',
      priority
    );
  }

  function preloadDetailNeighbors(container,index){
    const slides=[
      ...container.querySelectorAll(
        '.detail-slide[data-responsive-index]'
      )
    ];
    const count=slides.length;
    if(count<=1)return;

    const task=()=>{
      loadResponsiveDetail(
        container,
        (index+1)%count
      );
      loadResponsiveDetail(
        container,
        (index-1+count)%count
      );
    };

    if('requestIdleCallback' in window){
      requestIdleCallback(task,{timeout:800});
    }else{
      setTimeout(task,180);
    }
  }

  function enhancedRenderDetailMedia(){
    const container=document.getElementById('detailMedia');
    if(!container||!activeProduct)return;

    const images=productCarouselImages(activeProduct);
    if(detailSlideIndex>=images.length)detailSlideIndex=0;

    const slidesHtml=images.length
      ? `
        <div class="detail-slides">
          ${images.map((source,index)=>`
            <div
              class="detail-slide media-frame ${index===detailSlideIndex?'active':''}"
              data-responsive-index="${index}"
            >
              <span class="media-skeleton" aria-hidden="true"></span>
              <img
                data-responsive-source="${escapeAttr(source)}"
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
    loadResponsiveDetail(
      container,
      detailSlideIndex,
      'high'
    ).then(success=>{
      if(success){
        preloadDetailNeighbors(
          container,
          detailSlideIndex
        );
      }
    });
    startDetailCarousel();
  }

  function installSharedAssetVariants(){
    if(typeof sharedAssetCandidates!=='function')return;

    const originalSharedAssetCandidates=
      sharedAssetCandidates;

    sharedAssetCandidates=function(
      category,
      lookupKey,
      size='',
      fallback=''
    ){
      const originals=originalSharedAssetCandidates(
        category,
        lookupKey,
        size,
        fallback
      );

      if(String(category||'').toLowerCase()==='home'){
        return originals;
      }

      const width=responsiveWidth('shared');
      return unique([
        ...originals.map(source=>variantPath(source,width)),
        ...originals
      ]);
    };
  }

  function installHooks(){
    if(typeof renderProductCard==='function'){
      renderProductCard=enhancedProductCard;
    }

    if(typeof appendCatalogBatch==='function'){
      const previousAppendCatalogBatch=
        appendCatalogBatch;

      appendCatalogBatch=function(){
        const result=previousAppendCatalogBatch.apply(
          this,
          arguments
        );

        requestAnimationFrame(()=>{
          const grid=document.getElementById('productGrid');
          if(grid)mountResponsiveCatalog(grid);
        });

        return result;
      };
    }

    if(typeof renderDetailMedia==='function'){
      renderDetailMedia=enhancedRenderDetailMedia;
    }

    if(typeof updateDetailSlide==='function'){
      const previousUpdateDetailSlide=
        updateDetailSlide;

      updateDetailSlide=function(){
        const result=previousUpdateDetailSlide.apply(
          this,
          arguments
        );
        const container=document.getElementById('detailMedia');

        if(container){
          loadResponsiveDetail(
            container,
            detailSlideIndex,
            'high'
          ).then(success=>{
            if(success){
              preloadDetailNeighbors(
                container,
                detailSlideIndex
              );
            }
          });
        }

        return result;
      };
    }
  }

  installSharedAssetVariants();
  installHooks();

  window.DreamlandResponsiveImages={
    variantPath,
    loadResponsiveImage,
    mountResponsiveCatalog
  };
})();

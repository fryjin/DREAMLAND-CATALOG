(function(){
  'use strict';

  if(window.ImageManager)return;

  const states=new WeakMap();
  let catalogObserver=null;

  function installStyles(){
    if(document.getElementById('dreamlandImageManagerStyles'))return;

    const style=document.createElement('style');
    style.id='dreamlandImageManagerStyles';
    style.textContent=`
      .media-frame{
        position:relative!important;
        overflow:hidden!important;
        background:#e9edf2!important;
      }

      .media-frame>.product-img{
        display:none!important;
      }

      .media-frame::before{
        display:none!important;
      }

      .media-skeleton{
        position:absolute;
        inset:0;
        z-index:2;
        pointer-events:none;
        overflow:hidden;
        background:linear-gradient(145deg,#eef1f4,#e4e8ed 52%,#f1f3f6);
        opacity:1;
        visibility:visible;
        transition:opacity .14s ease,visibility .14s ease;
      }

      .media-skeleton::after{
        content:"";
        position:absolute;
        inset:0;
        transform:translateX(-110%);
        background:linear-gradient(100deg,transparent 22%,rgba(255,255,255,.72) 48%,transparent 74%);
        animation:dreamlandImageShimmer 1.1s ease-in-out infinite;
      }

      @keyframes dreamlandImageShimmer{
        to{transform:translateX(110%)}
      }

      .media-frame img{
        opacity:0!important;
        visibility:hidden!important;
      }

      .media-frame.is-loaded img{
        opacity:1!important;
        visibility:visible!important;
      }

      .media-frame.is-loaded>.media-skeleton{
        opacity:0;
        visibility:hidden;
      }

      .media-frame.is-error>.media-skeleton::after{
        animation:none;
        opacity:0;
      }

      .detail-slides{
        position:absolute!important;
        inset:0!important;
        z-index:1!important;
        overflow:hidden!important;
      }

      .detail-slide{
        position:absolute!important;
        inset:0!important;
        opacity:0!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }

      .detail-slide.active{
        opacity:1!important;
        visibility:visible!important;
        pointer-events:auto!important;
      }

      .detail-slide img{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        object-fit:cover!important;
        display:block!important;
        z-index:1!important;
      }

      .detail-titlebox,
      .carousel-btn,
      .carousel-dots{
        z-index:4!important;
      }

      @media (prefers-reduced-motion:reduce){
        .media-skeleton::after{animation:none}
      }
    `;
    document.head.appendChild(style);
  }

  function frameFor(img){
    return img?.closest('.media-frame,.product-visual,.detail-slide,.inquiry-media')||null;
  }

  function ensureFrame(frame){
    if(!frame)return;
    frame.classList.add('media-frame');

    if(!frame.querySelector(':scope > .media-skeleton')){
      const skeleton=document.createElement('span');
      skeleton.className='media-skeleton';
      skeleton.setAttribute('aria-hidden','true');
      frame.prepend(skeleton);
    }
  }

  function markLoaded(img){
    const frame=frameFor(img);
    ensureFrame(frame);

    states.set(img,'loaded');
    img.classList.remove('is-missing');
    frame?.classList.add('is-loaded');
    frame?.classList.remove('is-loading','is-error');
  }

  function markError(img){
    const frame=frameFor(img);
    ensureFrame(frame);

    states.set(img,'error');
    frame?.classList.add('is-error');
    frame?.classList.remove('is-loading','is-loaded');
  }

  async function load(img,{priority='auto'}={}){
    if(!img)return false;

    const current=states.get(img);
    if(current==='loaded')return true;
    if(current==='loading')return false;

    const src=(img.dataset.src||img.getAttribute('src')||'').trim();
    if(!src){
      markError(img);
      return false;
    }

    const frame=frameFor(img);
    ensureFrame(frame);
    states.set(img,'loading');
    frame?.classList.add('is-loading');
    frame?.classList.remove('is-loaded','is-error');

    img.fetchPriority=priority;
    img.decoding='async';
    img.loading=priority==='high'?'eager':'lazy';

    const loaded=new Promise((resolve,reject)=>{
      if(img.complete&&img.naturalWidth>0){
        resolve();
        return;
      }

      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',reject,{once:true});
    });

    if(!img.getAttribute('src')){
      img.src=src;
    }

    try{
      await loaded;

      if(typeof img.decode==='function'){
        try{
          await img.decode();
        }catch{
          /* The load event already confirms a usable image. */
        }
      }

      if(!img.naturalWidth){
        throw new Error('Image has no natural size');
      }

      markLoaded(img);
      return true;
    }catch{
      markError(img);
      return false;
    }
  }

  function catalogRoot(){
    return document.querySelector('.screen[data-screen="catalog"] .content');
  }

  function getCatalogObserver(){
    if(catalogObserver)return catalogObserver;
    if(!('IntersectionObserver' in window))return null;

    catalogObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;

        const img=entry.target;
        load(img,{
          priority:img.dataset.priority==='high'?'high':'auto'
        });

        catalogObserver.unobserve(img);
      });
    },{
      root:catalogRoot(),
      rootMargin:'120px 0px 260px 0px',
      threshold:0.01
    });

    return catalogObserver;
  }

  function mountCatalog(container=document){
    container.querySelectorAll?.('.product-cover').forEach((img,index)=>{
      const frame=frameFor(img);
      ensureFrame(frame);

      if(img.dataset.imageManagerCatalog==='1')return;
      img.dataset.imageManagerCatalog='1';

      const observer=getCatalogObserver();
      if(index<2){
        load(img,{priority:'high'});
      }else if(observer){
        observer.observe(img);
      }else{
        load(img);
      }
    });
  }

  function mountInquiry(container=document){
    container.querySelectorAll?.('.inquiry-media img').forEach(img=>{
      const frame=frameFor(img);
      ensureFrame(frame);
      load(img,{priority:'auto'});
    });
  }

  function detailSlide(container,index){
    return container?.querySelector(`.detail-slide[data-detail-index="${index}"]`)||null;
  }

  function loadDetail(container,index,priority='auto'){
    const slide=detailSlide(container,index);
    const img=slide?.querySelector('img');
    if(!slide||!img)return Promise.resolve(false);

    ensureFrame(slide);
    return load(img,{priority});
  }

  function preloadDetailNeighbors(container,index){
    const slides=[...container.querySelectorAll('.detail-slide[data-detail-index]')];
    const count=slides.length;
    if(count<=1)return;

    const task=()=>{
      loadDetail(container,(index+1)%count,'auto');
      loadDetail(container,(index-1+count)%count,'auto');
    };

    if('requestIdleCallback' in window){
      requestIdleCallback(task,{timeout:650});
    }else{
      setTimeout(task,140);
    }
  }

  function mountDetail(container,index=0){
    loadDetail(container,index,'high').then(success=>{
      if(success)preloadDetailNeighbors(container,index);
    });
  }

  function showDetailSlide(container,index=0){
    loadDetail(container,index,'high').then(success=>{
      if(success)preloadDetailNeighbors(container,index);
    });
  }

  function enhancedProductCard(product,index,tall=false){
    const cover=productCover(product);
    const name=productDisplayName(product);
    const priority=index<2?'high':'auto';

    return `
      <article
        class="product-card ${tall?'tall':''}"
        style="animation-delay:${Math.min(index%5,4)*42}ms"
        onclick="openDetail('${product.id}')"
      >
        <div class="product-visual media-frame">
          <span class="media-skeleton" aria-hidden="true"></span>
          <img
            class="product-cover"
            data-src="${cover}"
            data-priority="${priority}"
            alt="${name}"
            width="1200"
            height="1800"
            loading="lazy"
            decoding="async"
            onerror="imgMiss(this)"
          >
        </div>

        <button
          class="add-mini"
          onclick="event.stopPropagation();quickAdd('${product.id}')"
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

  function enhancedRenderDetailMedia(){
    const container=document.getElementById('detailMedia');
    if(!container||!activeProduct)return;

    const imgs=productCarouselImages(activeProduct);
    if(detailSlideIndex>=imgs.length)detailSlideIndex=0;

    const slidesHtml=imgs.length
      ? `
        <div class="detail-slides">
          ${imgs.map((src,index)=>`
            <div
              class="detail-slide media-frame ${index===detailSlideIndex?'active':''}"
              data-detail-index="${index}"
            >
              <span class="media-skeleton" aria-hidden="true"></span>
              <img
                data-src="${src}"
                alt="${productDisplayName(activeProduct)} ${index+1}"
                width="1200"
                height="1800"
                loading="lazy"
                decoding="async"
                onerror="imgMiss(this)"
              >
            </div>
          `).join('')}
        </div>
      `
      : `<div class="detail-slide media-frame active is-error"><span class="media-skeleton" aria-hidden="true"></span></div>`;

    const controlsHtml=imgs.length>1
      ? `
        <button class="carousel-btn prev" onclick="event.stopPropagation();changeDetailSlide(-1)">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <button class="carousel-btn next" onclick="event.stopPropagation();changeDetailSlide(1)">
          <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
        </button>

        <div class="carousel-dots">
          ${imgs.map((_,index)=>`
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
    mountDetail(container,detailSlideIndex);
    startDetailCarousel();
  }

  function installHooks(){
    if(typeof renderProductCard==='function'){
      renderProductCard=enhancedProductCard;
    }

    if(typeof appendCatalogBatch==='function'){
      const originalAppendCatalogBatch=appendCatalogBatch;
      appendCatalogBatch=function(){
        const result=originalAppendCatalogBatch.apply(this,arguments);
        requestAnimationFrame(()=>{
          const grid=document.getElementById('productGrid');
          if(grid)mountCatalog(grid);
        });
        return result;
      };
    }

    if(typeof renderDetailMedia==='function'){
      renderDetailMedia=enhancedRenderDetailMedia;
    }

    if(typeof updateDetailSlide==='function'){
      const originalUpdateDetailSlide=updateDetailSlide;
      updateDetailSlide=function(){
        const result=originalUpdateDetailSlide.apply(this,arguments);
        const container=document.getElementById('detailMedia');
        if(container)showDetailSlide(container,detailSlideIndex);
        return result;
      };
    }

    if(typeof renderInquiry==='function'){
      const originalRenderInquiry=renderInquiry;
      renderInquiry=function(){
        const result=originalRenderInquiry.apply(this,arguments);
        requestAnimationFrame(()=>{
          const list=document.getElementById('inquiryList');
          if(list)mountInquiry(list);
        });
        return result;
      };
    }
  }

  installStyles();
  installHooks();

  window.ImageManager={
    load,
    mountCatalog,
    mountDetail,
    showDetailSlide,
    mountInquiry
  };
})();

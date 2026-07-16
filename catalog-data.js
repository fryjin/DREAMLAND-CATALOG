/* DREAMLAND catalog data + media loader v31 */
(function(){
  'use strict';

  const IMAGE_FIELDS = [
    'cover_image',
    'angle_image',
    'detail_image',
    'size_s_image',
    'size_m_image',
    'size_l_image',
    'size_xl_image',
    'packaging_image',
    'scene_image_1',
    'scene_image_2',
    'scene_image_3',
    'scene_image_4'
  ];

  function text(value){
    return String(value ?? '').trim();
  }

  function number(value,fallback=0){
    const parsed=Number(text(value));
    return Number.isFinite(parsed)?parsed:fallback;
  }

  function boolean(value){
    return ['1','true','yes','y','是'].includes(text(value).toLowerCase());
  }

  function splitList(value,separator=','){
    return text(value)
      .split(separator)
      .map(item=>item.trim())
      .filter(Boolean);
  }

  function parseCsv(csvText){
    const source=String(csvText||'').replace(/^\uFEFF/,'');
    const table=[];
    let row=[];
    let cell='';
    let quoted=false;

    for(let index=0;index<source.length;index++){
      const char=source[index];
      const next=source[index+1];

      if(char==='"'){
        if(quoted&&next==='"'){
          cell+='"';
          index++;
        }else{
          quoted=!quoted;
        }
        continue;
      }

      if(char===','&&!quoted){
        row.push(cell);
        cell='';
        continue;
      }

      if((char==='\n'||char==='\r')&&!quoted){
        if(char==='\r'&&next==='\n')index++;
        row.push(cell);
        cell='';
        if(row.some(value=>value!==''))table.push(row);
        row=[];
        continue;
      }

      cell+=char;
    }

    if(cell!==''||row.length){
      row.push(cell);
      if(row.some(value=>value!==''))table.push(row);
    }

    if(!table.length)return [];

    const headers=table.shift().map(value=>text(value));

    return table.map(values=>{
      const record={};
      headers.forEach((header,index)=>{
        record[header]=values[index]??'';
      });
      return record;
    });
  }

  function mapCsvProduct(row){
    const id=text(row.product_id);
    const defaultSize=text(row.default_size)||'S';

    const shortDescriptions={
      zh:text(row.short_desc_zh),
      en:text(row.short_desc_en),
      ko:text(row.short_desc_ko)
    };

    const detailDescriptions={
      zh:text(row.detail_desc_zh),
      en:text(row.detail_desc_en),
      ko:text(row.detail_desc_ko)
    };

    const product={
      id,
      productId:id,
      series:text(row.series),
      status:text(row.status).toLowerCase()||'hidden',
      sortOrder:number(row.sort_order),
      listSort:number(row.list_sort,number(row.sort_order)),
      name:text(row.name_zh)||id,
      names:{
        zh:text(row.name_zh)||id,
        en:text(row.name_en)||text(row.name_zh)||id,
        ko:text(row.name_ko)||text(row.name_zh)||id
      },
      desc:shortDescriptions.zh||detailDescriptions.zh,
      descriptions:{
        zh:shortDescriptions.zh||detailDescriptions.zh,
        en:shortDescriptions.en||detailDescriptions.en||shortDescriptions.zh,
        ko:shortDescriptions.ko||detailDescriptions.ko||shortDescriptions.zh
      },
      detailDescriptions,
      size:defaultSize,
      defaultSize,
      availableSizes:splitList(row.available_sizes),
      availablePatterns:text(row.available_patterns),
      availableScentSeries:splitList(row.available_scent_series),
      color:text(row.color_class)||'color-1',
      tags:{
        zh:splitList(row.tags_zh),
        en:splitList(row.tags_en),
        ko:splitList(row.tags_ko)
      },
      featured:boolean(row.featured),
      launchDate:text(row.launch_date),
      updatedAt:text(row.updated_at),
      colorCode:text(row.color_code),
      pdfSeriesLabel:text(row.pdf_series_label),
      pdfSourcePage:number(row.pdf_source_page)
    };

    IMAGE_FIELDS.forEach(field=>{
      product[field]=text(row[field]);
    });

    return product;
  }

  function assertValidProducts(products){
    const ids=new Set();

    products.forEach(product=>{
      if(!product.id){
        throw new Error('CSV contains a product without product_id');
      }
      if(ids.has(product.id)){
        throw new Error(`CSV contains duplicate product_id: ${product.id}`);
      }
      ids.add(product.id);
    });
  }

  async function loadProductsFromCsv(){
    const response=await fetch('./data/products.csv',{cache:'no-cache'});
    if(!response.ok){
      throw new Error(`products.csv request failed: ${response.status}`);
    }

    const records=parseCsv(await response.text());
    const mapped=records.map(mapCsvProduct).filter(product=>product.id);
    assertValidProducts(mapped);

    const active=mapped.filter(product=>product.status==='active');
    if(!active.length){
      throw new Error('products.csv contains no active products');
    }

    return active;
  }

  async function loadProductsWithFallback(){
    try{
      return await loadProductsFromCsv();
    }catch(error){
      console.warn('[catalog] CSV load failed; using products.json fallback.',error);

      const response=await fetch('./data/products.json',{cache:'no-cache'});
      if(!response.ok){
        throw new Error(`products.json fallback failed: ${response.status}`);
      }

      const data=await response.json();
      return Array.isArray(data.products)?data.products:[];
    }
  }

  window.DreamlandCatalogData={
    parseCsv,
    mapCsvProduct,
    loadProductsFromCsv,
    loadProductsWithFallback
  };
})();

(function(){
  'use strict';

  const loadedUrls=new Set();
  let catalogObserver=null;
  let mediaMutationObserver=null;
  let enhancementsInstalled=false;

  function installMediaStyles(){
    if(document.getElementById('dreamlandMediaStyles'))return;

    const style=document.createElement('style');
    style.id='dreamlandMediaStyles';
    style.textContent=`
      .media-skeleton{
        position:absolute;
        inset:0;
        z-index:0;
        overflow:hidden;
        pointer-events:none;
        background:linear-gradient(145deg,#eef0f4 0%,#e6e9ee 52%,#f1f3f6 100%);
        opacity:1;
        visibility:visible;
        transition:opacity .14s ease,visibility .14s ease;
      }

      .media-skeleton::after{
        content:"";
        position:absolute;
        inset:0;
        transform:translateX(-110%);
        background:linear-gradient(100deg,transparent 22%,rgba(255,255,255,.7) 48%,transparent 74%);
        animation:dreamlandMediaShimmer 1.15s ease-in-out infinite;
      }

      @keyframes dreamlandMediaShimmer{
        to{transform:translateX(110%)}
      }

      .product-visual>.product-img,
      .detail-media>.product-img,
      .inquiry-media>.product-img{
        display:none!important;
      }

      .product-visual,
      .inquiry-media{
        position:relative;
        background:#eaedf1!important;
      }

      .product-visual::before{
        display:none!important;
      }

      .product-cover,
      .inquiry-media img{
        opacity:1;
        transition:opacity .14s ease;
      }

      .product-visual.media-loading .product-cover,
      .inquiry-media.media-loading img{
        opacity:0;
      }

      .inquiry-media img{
        position:relative;
        z-index:1;
      }

      .product-cover.media-loaded,
      .inquiry-media img.media-loaded{
        opacity:1;
      }

      .product-visual.media-loaded .media-skeleton,
      .inquiry-media.media-loaded .media-skeleton,
      .detail-slide.media-loaded .media-skeleton{
        opacity:0;
        visibility:hidden;
      }

      .product-visual.media-failed .media-skeleton,
      .inquiry-media.media-failed .media-skeleton,
      .detail-slide.media-failed .media-skeleton{
        background:linear-gradient(145deg,#eceff3,#e3e7ec);
      }

      .product-visual.media-failed .media-skeleton::after,
      .inquiry-media.media-failed .media-skeleton::after,
      .detail-slide.media-failed .media-skeleton::after{
        animation:none;
        opacity:0;
      }

      .detail-media.media-enhanced{
        background:#eaedf1!important;
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
        transition:none!important;
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
        opacity:0!important;
        transition:none!important;
        -webkit-user-drag:none;
      }

      .detail-slide.media-loaded img{
        opacity:1!important;
      }

      .detail-slide .media-skeleton{
        z-index:0;
      }

      .detail-titlebox,
      .carousel-btn,
      .carousel-dots{
        z-index:4!important;
      }

      @media (prefers-reduced-motion:reduce){
        .media-skeleton::after{animation:none}
        .product-cover,.inquiry-media img{transition:none}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSkeleton(container){
    if(!container||container.querySelector(':scope > .media-skeleton'))return;
    const skeleton=document.createElement('span');
    skeleton.className='media-skeleton';
    skeleton.setAttribute('aria-hidden','true');
    container.prepend(skeleton);
  }

  function markMediaLoaded(img){
    if(!img)return;
    const container=img.closest('.product-visual,.detail-slide,.inquiry-media');
    img.classList.add('media-loaded');
    img.classList.remove('is-missing');
    if(container){
      container.classList.add('media-loaded');
      container.classList.remove('media-loading','media-failed');
    }
    if(img.dataset.src)loadedUrls.add(img.dataset.src);
    if(img.currentSrc||img.src)loadedUrls.add(img.currentSrc||img.src);
  }

  function markMediaFailed(img){
    if(!img)return;
    const container=img.closest('.product-visual,.detail-slide,.inquiry-media');
    img.classList.add('is-missing');
    if(container){
      container.classList.add('media-failed');
      container.classList.remove('media-loading','media-loaded');
    }
  }

  function settleImageState(img,attempt=0){
    if(!img)return;

    if(img.complete&&img.naturalWidth>0){
      markMediaLoaded(img);
      return;
    }

    if(img.complete&&img.getAttribute('src')&&img.naturalWidth===0){
      markMediaFailed(img);
      return;
    }

    if(attempt<12){
      setTimeout(()=>settleImageState(img,attempt+1),80);
    }
  }

  function bindImageState(img){
    if(!img||img.dataset.mediaStateBound==='1')return;
    img.dataset.mediaStateBound='1';

    img.addEventListener('load',()=>markMediaLoaded(img));
    img.addEventListener('error',()=>markMediaFailed(img));

    queueMicrotask(()=>settleImageState(img));
    requestAnimationFrame(()=>settleImageState(img));
  }

  function beginImageLoad(img,priority='auto'){
    if(!img)return;

    const src=img.dataset.src||img.getAttribute('src')||'';
    if(!src)return;

    const container=img.closest('.product-visual,.detail-slide,.inquiry-media');
    ensureSkeleton(container);
    container?.classList.add('media-loading');
    bindImageState(img);

    if(img.dataset.srcAssigned!=='1'){
      img.fetchPriority=priority;
      img.loading=priority==='high'?'eager':'lazy';
      img.decoding='async';
      img.dataset.srcAssigned='1';

      if(!img.getAttribute('src')){
        img.src=src;
      }
    }

    if(typeof img.decode==='function'){
      img.decode().then(()=>markMediaLoaded(img)).catch(()=>settleImageState(img));
    }

    settleImageState(img);
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
        const priority=img.dataset.priority==='high'?'high':'auto';
        beginImageLoad(img,priority);
        catalogObserver.unobserve(img);
      });
    },{
      root:catalogRoot(),
      rootMargin:'120px 0px 260px 0px',
      threshold:0.01
    });

    return catalogObserver;
  }

  function prepareCatalogImage(img){
    if(!img||img.dataset.catalogObserved==='1')return;
    img.dataset.catalogObserved='1';

    const existingSrc=img.getAttribute('src')||'';
    if(!img.dataset.src&&existingSrc){
      img.dataset.src=existingSrc;
    }

    const container=img.closest('.product-visual');
    ensureSkeleton(container);
    container?.classList.add('media-loading');
    bindImageState(img);

    if(img.complete&&img.naturalWidth>0){
      markMediaLoaded(img);
      return;
    }

    const observer=getCatalogObserver();
    if(observer){
      observer.observe(img);
    }else{
      beginImageLoad(img,img.dataset.priority==='high'?'high':'auto');
    }
  }

  function prepareDirectImage(img){
    if(!img)return;
    const container=img.closest('.inquiry-media');
    ensureSkeleton(container);
    container?.classList.add('media-loading');
    bindImageState(img);
    img.loading='lazy';
    img.decoding='async';
  }

  function scanMedia(root=document){
    root.querySelectorAll?.('.product-cover').forEach(prepareCatalogImage);
    root.querySelectorAll?.('.inquiry-media img').forEach(prepareDirectImage);
  }

  function installMutationObserver(){
    if(mediaMutationObserver)return;
    mediaMutationObserver=new MutationObserver(mutations=>{
      mutations.forEach(mutation=>{
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType!==1)return;
          if(node.matches?.('.product-cover'))prepareCatalogImage(node);
          if(node.matches?.('.inquiry-media img'))prepareDirectImage(node);
          scanMedia(node);
        });
      });
    });
    mediaMutationObserver.observe(document.body,{childList:true,subtree:true});
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
        <div class="product-visual media-loading">
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
            onload="DreamlandMediaLoaded(this)"
            onerror="DreamlandMediaFailed(this)"
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

  function detailSlideElement(index){
    return document.querySelector(`.detail-slide[data-detail-index="${index}"]`);
  }

  function loadDetailSlide(index,priority='auto',preloadNeighbors=false){
    const slide=detailSlideElement(index);
    const img=slide?.querySelector('img[data-src]');
    if(!slide||!img)return;

    ensureSkeleton(slide);
    slide.classList.add('media-loading');
    bindImageState(img);

    if(preloadNeighbors&&img.dataset.neighborHook!=='1'){
      img.dataset.neighborHook='1';
      img.addEventListener('load',()=>scheduleDetailNeighbors(index),{once:true});
    }

    beginImageLoad(img,priority);
  }

  function scheduleDetailNeighbors(index){
    const count=typeof detailImageCount==='function'?detailImageCount():0;
    if(count<=1)return;

    const task=()=>{
      loadDetailSlide((index+1)%count,'auto',false);
      loadDetailSlide((index-1+count)%count,'auto',false);
    };

    if('requestIdleCallback' in window){
      requestIdleCallback(task,{timeout:650});
    }else{
      setTimeout(task,140);
    }
  }

  function enhancedRenderDetailMedia(){
    const media=document.getElementById('detailMedia');
    if(!media||!activeProduct)return;

    const imgs=productCarouselImages(activeProduct);
    if(detailSlideIndex>=imgs.length)detailSlideIndex=0;

    const slidesHtml=imgs.length
      ? `
        <div class="detail-slides">
          ${imgs.map((src,index)=>`
            <div
              class="detail-slide ${index===detailSlideIndex?'active':''} media-loading"
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
                onload="DreamlandMediaLoaded(this)"
                onerror="DreamlandMediaFailed(this)"
              >
            </div>
          `).join('')}
        </div>
      `
      : `<div class="detail-slide active media-failed"><span class="media-skeleton" aria-hidden="true"></span></div>`;

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

    media.className=`detail-media media-enhanced ${activeProduct.color}`;
    media.innerHTML=`
      ${slidesHtml}
      ${controlsHtml}
      <div class="detail-titlebox">
        <h2>${productDisplayName(activeProduct)}</h2>
        <p>${productDesc(activeProduct)}</p>
      </div>
    `;

    bindDetailSwipe();
    loadDetailSlide(detailSlideIndex,'high',true);
    startDetailCarousel();
  }

  function installFunctionOverrides(){
    if(typeof renderProductCard==='function'){
      renderProductCard=enhancedProductCard;
    }

    if(typeof renderDetailMedia==='function'){
      renderDetailMedia=enhancedRenderDetailMedia;
    }

    if(typeof updateDetailSlide==='function'){
      const originalUpdateDetailSlide=updateDetailSlide;
      updateDetailSlide=function(){
        originalUpdateDetailSlide.apply(this,arguments);
        loadDetailSlide(detailSlideIndex,'high',true);
      };
    }
  }

  function installEnhancements(){
    if(enhancementsInstalled)return;
    enhancementsInstalled=true;

    window.DreamlandMediaLoaded=markMediaLoaded;
    window.DreamlandMediaFailed=markMediaFailed;

    document.addEventListener('load',event=>{
      const img=event.target;
      if(img instanceof HTMLImageElement&&img.matches('.product-cover,.detail-slide img,.inquiry-media img')){
        markMediaLoaded(img);
      }
    },true);

    document.addEventListener('error',event=>{
      const img=event.target;
      if(img instanceof HTMLImageElement&&img.matches('.product-cover,.detail-slide img,.inquiry-media img')){
        markMediaFailed(img);
      }
    },true);

    installMediaStyles();
    installFunctionOverrides();
    installMutationObserver();
    scanMedia(document);
  }

  setTimeout(installEnhancements,0);
})();

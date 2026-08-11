(function(){
  'use strict';

  const contract=
    globalThis.DreamlandProductDataContract;

  if(!contract){
    throw new Error(
      'DreamlandProductDataContract must load before catalog-data.js'
    );
  }

  const {
    text,
    number,
    splitList,
    parseCsv,
    mapCsvProduct,
    applyProductOverrides
  }=contract;

  function mapCsvScent(row){
    return {
      id:text(row.scent_id),
      series:text(row.series),
      status:text(row.status).toLowerCase(),
      sortOrder:number(row.sort_order,999),
      name:{
        zh:text(row.name_zh),
        en:text(row.name_en),
        ko:text(row.name_ko)
      },
      notes:{
        top:{
          zh:text(row.top_zh),
          en:text(row.top_en),
          ko:text(row.top_ko)
        },
        heart:{
          zh:text(row.heart_zh),
          en:text(row.heart_en),
          ko:text(row.heart_ko)
        },
        base:{
          zh:text(row.base_zh),
          en:text(row.base_en),
          ko:text(row.base_ko)
        }
      },
      supplier:{
        zh:text(row.supplier_zh),
        en:text(row.supplier_en),
        ko:text(row.supplier_ko)
      },
      fragranceRatio:text(row.fragrance_ratio),
      updatedAt:text(row.updated_at)
    };
  }

  function mapCsvSharedAsset(row){
    return {
      assetId:text(row.asset_id),
      category:text(row.category).toLowerCase(),
      lookupKey:text(row.lookup_key),
      size:text(row.size).toUpperCase(),
      labels:{
        zh:text(row.label_zh),
        en:text(row.label_en),
        ko:text(row.label_ko)
      },
      imagePath:text(row.image_path),
      fallbackPath:text(row.fallback_path),
      status:
        text(row.status).toLowerCase()||
        'hidden',
      sortOrder:number(row.sort_order),
      updatedAt:text(row.updated_at)
    };
  }

  async function fetchText(path,label){
    const response=await fetch(
      path,
      {cache:'no-cache'}
    );

    if(!response.ok){
      throw new Error(
        `${label} request failed: ${response.status}`
      );
    }

    return response.text();
  }

  async function loadSharedAssetsFromCsv(){
    try{
      return parseCsv(
        await fetchText(
          './data/shared-assets.csv',
          'shared-assets.csv'
        )
      )
        .map(mapCsvSharedAsset)
        .filter(
          item=>
            item.assetId&&
            item.status==='active'
        )
        .sort(
          (a,b)=>
            a.sortOrder-
            b.sortOrder
        );
    }catch(error){
      console.warn(
        '[catalog] Shared assets load failed; using legacy image paths.',
        error
      );

      return [];
    }
  }

  async function loadScentsFromCsv(){
    try{
      return parseCsv(
        await fetchText(
          './data/scents.csv',
          'scents.csv'
        )
      )
        .map(mapCsvScent)
        .filter(
          item=>
            item.id&&
            item.status==='active'
        )
        .sort((a,b)=>{
          if(a.series!==b.series){
            return a.series.localeCompare(
              b.series
            );
          }

          return (
            a.sortOrder-
            b.sortOrder
          );
        });
    }catch(error){
      console.warn(
        '[DREAMLAND] scents.csv load failed.',
        error
      );

      return [];
    }
  }

  function assertValidProducts(products){
    const ids=new Set();

    products.forEach(product=>{
      if(!product.id){
        throw new Error(
          'CSV contains a product without product_id'
        );
      }

      if(ids.has(product.id)){
        throw new Error(
          `CSV contains duplicate product_id: ${product.id}`
        );
      }

      ids.add(product.id);
    });
  }

  async function loadProductsFromCsv(){
    const records=parseCsv(
      await fetchText(
        './data/products.csv',
        'products.csv'
      )
    );

    const mapped=records
      .map(mapCsvProduct)
      .filter(product=>product.id);

    assertValidProducts(mapped);

    const active=mapped.filter(
      product=>
        product.status==='active'
    );

    if(!active.length){
      throw new Error(
        'products.csv contains no active products'
      );
    }

    return active;
  }

  async function loadProductsWithFallback(){
    try{
      return await loadProductsFromCsv();
    }catch(error){
      console.warn(
        '[catalog] CSV load failed; using products.json fallback.',
        error
      );

      const response=await fetch(
        './data/products.json',
        {cache:'no-cache'}
      );

      if(!response.ok){
        throw new Error(
          `products.json fallback failed: ${response.status}`
        );
      }

      const data=
        await response.json();

      return Array.isArray(data.products)
        ? data.products.map(
            applyProductOverrides
          )
        : [];
    }
  }

  window.DreamlandCatalogData={
    parseCsv,
    mapCsvProduct,
    applyProductOverrides,
    mapCsvSharedAsset,
    loadProductsFromCsv,
    loadProductsWithFallback,
    mapCsvScent,
    loadScentsFromCsv,
    loadSharedAssetsFromCsv
  };
})();

/* Load optional UI infrastructure after the page script is ready. */
(function(){
  'use strict';

  function loadScript(src,marker){
    return new Promise(resolve=>{
      const selector=`script[${marker}]`;
      const existing=document.querySelector(
        selector
      );

      if(existing){
        resolve(existing);
        return;
      }

      const script=
        document.createElement(
          'script'
        );

      script.src=src;
      script.setAttribute(
        marker,
        '1'
      );

      script.onload=()=>resolve(
        script
      );

      script.onerror=()=>{
        console.warn(
          `[catalog] Failed to load ${src}`
        );

        resolve(script);
      };

      document.head.appendChild(
        script
      );
    });
  }

  async function loadUiInfrastructure(){
    /*
     * Replace the legacy custom-scent select
     * without delaying image loading.
     */
    const customScentReady=
      loadScript(
        './custom-scent-multi.js',
        'data-dreamland-custom-scent-multi'
      );

    const copyPolishReady=
      customScentReady.then(
        ()=>loadScript(
          './copy-polish.js',
          'data-dreamland-copy-polish'
        )
      );

    await loadScript(
      './image-manager.js',
      'data-dreamland-image-manager'
    );

    await loadScript(
      './image-variants.js',
      'data-dreamland-image-variants'
    );

    await loadScript(
      './detail-progressive.js',
      'data-dreamland-detail-progressive'
    );

    await loadScript(
      './pattern-preview-swipe.js',
      'data-dreamland-pattern-preview-swipe'
    );

    await customScentReady;
    await copyPolishReady;
  }

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      loadUiInfrastructure,
      {once:true}
    );
  }else{
    setTimeout(
      loadUiInfrastructure,
      0
    );
  }
})();

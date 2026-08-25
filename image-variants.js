(function(){
  'use strict';

  if(
    window
      .DreamlandResponsiveImages
  ){
    return;
  }

  const media=
    window.DreamlandMedia;

  const hooks=
    window.DreamlandRuntimeHooks;

  if(!media){
    console.warn(
      '[catalog] Responsive images require DreamlandMedia.'
    );
    return;
  }

  if(!hooks){
    console.warn(
      '[catalog] Responsive images require DreamlandRuntimeHooks.'
    );
    return;
  }

  let catalogObserver=null;

  function catalogRoot(){
    return document
      .querySelector(
        '.screen[data-screen="catalog"] .content'
      );
  }

  function getCatalogObserver(){
    if(catalogObserver){
      return catalogObserver;
    }

    if(
      !(
        'IntersectionObserver'
        in window
      )
    ){
      return null;
    }

    catalogObserver=
      new IntersectionObserver(
        entries=>{
          entries.forEach(
            entry=>{
              if(
                !entry
                  .isIntersecting
              ){
                return;
              }

              const img=
                entry.target;

              media.loadResponsiveImage(
                img,
                img.dataset
                  .responsiveSource,
                'catalog',
                img.dataset
                  .responsivePriority||
                  'auto'
              );

              catalogObserver
                .unobserve(
                  img
                );
            }
          );
        },
        {
          root:
            catalogRoot(),
          rootMargin:
            '100px 0px 220px 0px',
          threshold:0.01
        }
      );

    return catalogObserver;
  }

  function mountResponsiveCatalog(
    container=document
  ){
    container
      .querySelectorAll?.(
        '.product-cover[data-responsive-source]'
      )
      .forEach(
        img=>{
          if(
            img.dataset
              .responsiveBound===
            '1'
          ){
            return;
          }

          img.dataset
            .responsiveBound=
            '1';

          const priority=
            img.dataset
              .responsivePriority||
            'auto';

          const startupPreloaded=
            window.DreamlandStartupLoader
              ?.hasPreloaded?.(
                img.dataset
                  .responsiveSource
              )===true;

          if(
            priority==='high'||
            startupPreloaded
          ){
            media
              .loadResponsiveImage(
                img,
                img.dataset
                  .responsiveSource,
                'catalog',
                'high'
              );

            return;
          }

          const observer=
            getCatalogObserver();

          if(observer){
            observer.observe(
              img
            );
          }else{
            media
              .loadResponsiveImage(
                img,
                img.dataset
                  .responsiveSource,
                'catalog'
              );
          }
        }
      );
  }


  function transformSharedAssetCandidates(
    payload={}
  ){
    const category=
      String(
        payload.category||
        ''
      ).toLowerCase();

    const originals=
      media.unique(
        payload.candidates
      );

    if(category==='home'){
      return originals;
    }

    const width=
      media.responsiveWidth(
        'shared'
      );

    return media.unique([
      ...originals.map(
        source=>
          media.variantPath(
            source,
            width
          )
      ),
      ...originals
    ]);
  }


  function registerHooks(){
    hooks.register(
      'sharedAssets.transformCandidates',
      transformSharedAssetCandidates,
      {
        owner:'image-variants'
      }
    );

    hooks.subscribe(
      'catalog.afterAppendBatch',
      payload=>{
        requestAnimationFrame(
          ()=>{
            const grid=
              payload?.grid||
              document
                .getElementById(
                  'productGrid'
                );

            if(grid){
              mountResponsiveCatalog(
                grid
              );
            }
          }
        );
      },
      {
        owner:'image-variants'
      }
    );
  }

  registerHooks();

  /*
   * If catalog cards already exist when this late-loaded adapter is ready,
   * bind any responsive markup that is already present.
   */
  requestAnimationFrame(
    ()=>{
      const grid=
        document.getElementById(
          'productGrid'
        );

      if(grid){
        mountResponsiveCatalog(
          grid
        );
      }
    }
  );

  window.DreamlandResponsiveImages=
    Object.freeze({
      variantPath:
        media.variantPath,
      responsiveWidth:
        media.responsiveWidth,
      loadResponsiveImage:
        media.loadResponsiveImage,
      transformSharedAssetCandidates,
      mountResponsiveCatalog
    });
})();

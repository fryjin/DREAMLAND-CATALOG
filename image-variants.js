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

          if(
            priority===
            'high'
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

  function enhancedProductCard(
    product,
    index,
    tall=false
  ){
    const original=
      productCover(product);

    const name=
      productDisplayName(
        product
      );

    const priority=
      index<2
        ? 'high'
        : 'auto';

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

  function installSharedAssetVariants(){
    if(
      typeof sharedAssetCandidates!==
      'function'
    ){
      return;
    }

    const originalSharedAssetCandidates=
      sharedAssetCandidates;

    sharedAssetCandidates=function(
      category,
      lookupKey,
      size='',
      fallback=''
    ){
      const originals=
        originalSharedAssetCandidates(
          category,
          lookupKey,
          size,
          fallback
        );

      if(
        String(
          category||''
        ).toLowerCase()===
        'home'
      ){
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
    };
  }

  function registerHooks(){
    hooks.register(
      'catalog.renderProductCard',
      enhancedProductCard,
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

  installSharedAssetVariants();
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
      mountResponsiveCatalog
    });
})();

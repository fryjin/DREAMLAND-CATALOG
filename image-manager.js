(function(){
  'use strict';

  if(window.ImageManager){
    return;
  }

  const media=
    window.DreamlandMedia;

  if(!media){
    console.warn(
      '[catalog] ImageManager requires DreamlandMedia.'
    );
    return;
  }

  function installStyles(){
    if(
      document.getElementById(
        'dreamlandImageManagerStyles'
      )
    ){
      return;
    }

    const style=
      document.createElement(
        'style'
      );

    style.id=
      'dreamlandImageManagerStyles';

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

    document.head.appendChild(
      style
    );
  }

  function ensureFrame(frame){
    if(!frame){
      return;
    }

    frame.classList.add(
      'media-frame'
    );

    if(
      !frame.querySelector(
        ':scope > .media-skeleton'
      )
    ){
      const skeleton=
        document.createElement(
          'span'
        );

      skeleton.className=
        'media-skeleton';

      skeleton.setAttribute(
        'aria-hidden',
        'true'
      );

      frame.prepend(
        skeleton
      );
    }
  }

  async function load(
    img,
    {
      priority='auto'
    }={}
  ){
    if(!img){
      return false;
    }

    ensureFrame(
      media.frameFor(img)
    );

    const source=
      (
        img.dataset.src||
        img.getAttribute(
          'src'
        )||
        ''
      ).trim();

    const result=
      await media.loadCandidates(
        img,
        [source],
        {priority}
      );

    return result.success;
  }

  function mountCatalog(
    container=document
  ){
    if(
      window
        .DreamlandResponsiveImages
        ?.mountResponsiveCatalog
    ){
      window
        .DreamlandResponsiveImages
        .mountResponsiveCatalog(
          container
        );
    }
  }

  function inquiryItemForMedia(
    mediaNode
  ){
    const itemId=
      mediaNode
        ?.closest(
          '.swipe-shell[data-id]'
        )
        ?.dataset.id||
      '';

    if(
      !itemId||
      typeof state===
        'undefined'||
      !Array.isArray(
        state.items
      )
    ){
      return null;
    }

    return (
      state.items.find(
        item=>
          item.id===itemId
      )||
      null
    );
  }

  function currentInquiryProduct(
    item
  ){
    if(
      !item?.productId||
      typeof products===
        'undefined'||
      !Array.isArray(
        products
      )
    ){
      return null;
    }

    return (
      products.find(
        product=>
          product.id===
          item.productId
      )||
      null
    );
  }

  function inquiryImageCandidates(
    item
  ){
    const candidates=[];
    const currentProduct=
      currentInquiryProduct(item);

    if(
      currentProduct&&
      typeof productCover===
      'function'
    ){
      candidates.push(
        productCover(
          currentProduct
        )
      );
    }

    if(item?.productId){
      candidates.push(
        `./images/products/${item.productId}/cover.webp`
      );
    }

    if(item?.cover){
      candidates.push(
        item.cover
      );
    }

    return media.unique(
      candidates
    );
  }

  function syncActiveInquiryCovers(){
    if(
      typeof state===
        'undefined'||
      !Array.isArray(
        state.items
      )||
      typeof products===
        'undefined'||
      !Array.isArray(
        products
      )
    ){
      return;
    }

    let changed=false;

    state.items.forEach(
      item=>{
        if(
          item.type!==
          'product'
        ){
          return;
        }

        const currentProduct=
          currentInquiryProduct(
            item
          );

        if(
          !currentProduct||
          typeof productCover!==
          'function'
        ){
          return;
        }

        const currentCover=
          productCover(
            currentProduct
          );

        if(
          currentCover&&
          item.cover!==
          currentCover
        ){
          item.cover=
            currentCover;

          changed=true;
        }
      }
    );

    if(
      changed&&
      typeof save===
      'function'
    ){
      save();
    }
  }

  function createInquiryImage(
    mediaNode,
    item
  ){
    mediaNode
      .querySelectorAll(
        ':scope > img, :scope > .product-img'
      )
      .forEach(
        node=>
          node.remove()
      );

    ensureFrame(
      mediaNode
    );

    const img=
      document.createElement(
        'img'
      );

    img.alt=
      typeof productDisplayName===
      'function'
        ? productDisplayName(
            item
          )
        : String(
            item?.name||
            ''
          );

    img.width=1200;
    img.height=1800;
    img.loading='lazy';
    img.decoding='async';

    mediaNode.appendChild(
      img
    );

    return img;
  }

  async function loadInquiryImage(
    mediaNode,
    item
  ){
    const img=
      createInquiryImage(
        mediaNode,
        item
      );

    const candidates=
      inquiryImageCandidates(
        item
      );

    const result=
      await media.loadCandidates(
        img,
        candidates,
        {
          priority:'auto'
        }
      );

    if(
      result.success&&
      item.cover!==
      result.source
    ){
      item.cover=
        result.source;

      if(
        typeof save===
        'function'
      ){
        save();
      }
    }
  }

  function mountInquiry(
    container=document
  ){
    container
      .querySelectorAll?.(
        '.inquiry-media'
      )
      .forEach(
        mediaNode=>{
          const item=
            inquiryItemForMedia(
              mediaNode
            );

          if(
            !item||
            item.type!==
            'product'
          ){
            return;
          }

          loadInquiryImage(
            mediaNode,
            item
          );
        }
      );
  }

  function mountDetail(
    container,
    index=0
  ){
    if(
      window
        .DreamlandProgressiveDetail
        ?.loadDetailSlide
    ){
      return window
        .DreamlandProgressiveDetail
        .loadDetailSlide(
          container,
          index,
          {
            priority:'high',
            upgrade:false
          }
        );
    }

    return Promise.resolve(
      false
    );
  }

  function showDetailSlide(
    container,
    index=0
  ){
    return mountDetail(
      container,
      index
    );
  }

  function installHooks(){
    if(
      typeof renderInquiry===
      'function'
    ){
      const originalRenderInquiry=
        renderInquiry;

      renderInquiry=function(){
        syncActiveInquiryCovers();

        const result=
          originalRenderInquiry
            .apply(
              this,
              arguments
            );

        requestAnimationFrame(
          ()=>{
            const list=
              document.getElementById(
                'inquiryList'
              );

            if(list){
              mountInquiry(
                list
              );
            }
          }
        );

        return result;
      };
    }
  }

  installStyles();
  installHooks();

  window.ImageManager=
    Object.freeze({
      load,
      mountCatalog,
      mountDetail,
      showDetailSlide,
      mountInquiry
    });
})();

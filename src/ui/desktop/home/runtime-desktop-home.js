(function(root){
  'use strict';

  if(root.DreamlandDesktopHome){
    return;
  }

  const VERSION='B7-00B.1';

  let config=null;
  let homeRoot=null;
  let mounted=false;
  let revealObserver=null;

  function text(value){
    return String(
      value??''
    ).trim();
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function activeProduct(product){
    const status=
      text(product?.status)
        .toLowerCase();

    return (
      !status||
      status==='active'
    );
  }

  function sortProducts(a,b){
    const order=
      (
        Number(b?.listSort)||
        Number(b?.sortOrder)||
        0
      )-
      (
        Number(a?.listSort)||
        Number(a?.sortOrder)||
        0
      );

    return (
      order||
      text(a?.id)
        .localeCompare(
          text(b?.id)
        )
    );
  }

  function uniqueProducts(products){
    const seen=new Set();

    return products.filter(product=>{
      const id=
        text(product?.id);

      if(
        !id||
        seen.has(id)
      ){
        return false;
      }

      seen.add(id);
      return true;
    });
  }

  function buildViewModel(input={}){
    const content=
      input.content||{};
    const homeConfig=
      input.homeConfig||{};
    const products=
      (
        Array.isArray(input.products)
          ? input.products
          : []
      )
        .filter(activeProduct)
        .slice()
        .sort(sortProducts);

    const seriesMeta=
      input.seriesMeta||{};

    const collectionOrder=
      Array.isArray(
        homeConfig.collectionOrder
      )&&
      homeConfig.collectionOrder.length
        ? homeConfig.collectionOrder
        : Object.keys(seriesMeta);

    const featuredSeriesOrder=
      Array.isArray(
        homeConfig.featuredSeriesOrder
      )&&
      homeConfig.featuredSeriesOrder.length
        ? homeConfig.featuredSeriesOrder
        : collectionOrder;

    const seriesLabel=
      typeof input.seriesLabel==='function'
        ? input.seriesLabel
        : value=>text(value);

    const productName=
      typeof input.productName==='function'
        ? input.productName
        : product=>
            text(
              product?.name||
              product?.id
            );

    const productCover=
      typeof input.productCover==='function'
        ? input.productCover
        : product=>
            text(
              product?.cover_image||
              product?.cover
            );

    const productAngle=
      typeof input.productAngle==='function'
        ? input.productAngle
        : product=>
            text(
              product?.angle_image
            );

    const productDetail=
      typeof input.productDetail==='function'
        ? input.productDetail
        : product=>
            text(
              product?.detail_image
            );

    const productPrice=
      typeof input.productPrice==='function'
        ? input.productPrice
        : ()=>'';

    const productMoq=
      typeof input.productMoq==='function'
        ? input.productMoq
        : ()=>1;

    const productsForSeries=
      series=>
        products.filter(
          product=>
            product.series===series
        );

    const collections=
      collectionOrder
        .map((series,index)=>{
          const list=
            productsForSeries(series);

          const representative=
            list[0]||null;

          return Object.freeze({
            id:series,
            label:seriesLabel(series),
            count:list.length,
            image:
              representative
                ? productCover(representative)
                : '',
            layout:
              index===0||index===3
                ? 'wide'
                : 'narrow'
          });
        })
        .filter(
          item=>item.count>0
        );

    const explicitFeatured=
      products.filter(
        product=>
          product.featured===true
      );

    const seriesFeatured=
      featuredSeriesOrder
        .map(
          series=>
            productsForSeries(series)[0]||
            null
        )
        .filter(Boolean);

    const featuredProducts=
      uniqueProducts([
        ...explicitFeatured,
        ...seriesFeatured,
        ...products
      ])
        .slice(0,4)
        .map(product=>
          Object.freeze({
            id:text(product.id),
            name:productName(product),
            series:text(product.series),
            seriesLabel:
              seriesLabel(
                product.series
              ),
            cover:
              productCover(product),
            angle:
              productAngle(product),
            price:
              productPrice(product),
            moq:
              Math.max(
                1,
                Number(
                  productMoq(product)
                )||1
              )
          })
        );

    const craftProduct=
      products.find(
        product=>
          product.series==='masterpiece'&&
          productDetail(product)
      )||
      products.find(
        product=>
          productDetail(product)
      )||
      products[0]||
      null;

    const customProduct=
      products.find(
        product=>
          product.series==='masterpiece'&&
          productAngle(product)
      )||
      products.find(
        product=>
          productAngle(product)
      )||
      products[1]||
      products[0]||
      null;

    return Object.freeze({
      content,
      hero:Object.freeze({
        image:
          text(homeConfig.heroImage)||
          './images/shared/home/HOME001/cover.webp'
      }),
      collections:Object.freeze(
        collections
      ),
      featuredProducts:Object.freeze(
        featuredProducts
      ),
      craft:Object.freeze({
        image:
          craftProduct
            ? (
                productDetail(craftProduct)||
                productAngle(craftProduct)||
                productCover(craftProduct)
              )
            : ''
      }),
      custom:Object.freeze({
        image:
          customProduct
            ? (
                productAngle(customProduct)||
                productCover(customProduct)
              )
            : ''
      }),
      inquiryCount:
        Math.max(
          0,
          Math.trunc(
            Number(input.inquiryCount)||0
          )
        )
    });
  }

  function currentViewModel(){
    if(!config){
      return buildViewModel();
    }

    return buildViewModel({
      content:
        config.content?.()||{},
      homeConfig:
        config.homeConfig||{},
      products:
        config.products||[],
      seriesMeta:
        config.seriesMeta||{},
      seriesLabel:
        config.seriesLabel,
      productName:
        config.productName,
      productCover:
        config.productCover,
      productAngle:
        config.productAngle,
      productDetail:
        config.productDetail,
      productPrice:
        config.productPrice,
      productMoq:
        config.productMoq,
      inquiryCount:
        config.inquiryCount?.()||0
    });
  }

  function designLabel(
    count,
    content
  ){
    const collections=
      content.collections||{};

    const unit=
      count===1
        ? (
            collections.designSingular||
            collections.designPlural||
            ''
          )
        : (
            collections.designPlural||
            collections.designSingular||
            ''
          );

    return `${count} ${unit}`.trim();
  }

  function heroHtml(view){
    const hero=
      view.content.hero||{};

    return `
      <section
        class="desktop-home-hero desktop-reveal"
        aria-labelledby="desktopHeroTitle"
      >
        <div
          class="desktop-home-hero__media media-frame desktop-media-placeholder"
        >
          <img
            data-desktop-image
            data-desktop-source="${escapeHtml(view.hero.image)}"
            data-desktop-kind="shared"
            data-desktop-priority="high"
            alt=""
          >
        </div>

        <div class="desktop-home-hero__copy">
          <div class="desktop-eyebrow">
            ${escapeHtml(hero.kicker||'')}
          </div>

          <h1
            class="desktop-home-hero__title"
            id="desktopHeroTitle"
          >
            ${escapeHtml(hero.title||'')}
          </h1>

          <p class="desktop-home-hero__body">
            ${escapeHtml(hero.body||'')}
          </p>

          <div class="desktop-home-hero__actions">
            <button
              class="desktop-primary-button"
              type="button"
              data-desktop-home-action="catalog"
            >
              ${escapeHtml(hero.primary||'')}
              <span aria-hidden="true">→</span>
            </button>

            <button
              class="desktop-text-button desktop-arrow-link"
              type="button"
              data-desktop-home-action="custom"
            >
              ${escapeHtml(hero.secondary||'')}
              <span class="desktop-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function collectionsHtml(view){
    const content=
      view.content.collections||{};

    return `
      <section
        class="desktop-home-section desktop-container desktop-reveal"
        aria-labelledby="desktopCollectionsTitle"
      >
        <div class="desktop-home-section__head">
          <div>
            <div class="desktop-eyebrow">
              ${escapeHtml(content.kicker||'')}
            </div>

            <h2
              class="desktop-home-section__title"
              id="desktopCollectionsTitle"
            >
              ${escapeHtml(content.title||'')}
            </h2>
          </div>

          <p class="desktop-home-section__body">
            ${escapeHtml(content.body||'')}
          </p>
        </div>

        <div class="desktop-collection-grid">
          ${view.collections.map(item=>`
            <button
              class="desktop-collection-card ${item.layout==='wide'?'is-wide':''}"
              type="button"
              data-desktop-home-action="series"
              data-desktop-series="${escapeHtml(item.id)}"
            >
              <div
                class="desktop-collection-media media-frame desktop-media-placeholder"
              >
                <img
                  data-desktop-image
                  data-desktop-source="${escapeHtml(item.image)}"
                  data-desktop-kind="shared"
                  data-desktop-priority="auto"
                  alt="${escapeHtml(item.label)}"
                >
              </div>

              <div class="desktop-collection-meta">
                <div>
                  <div class="desktop-collection-name">
                    ${escapeHtml(item.label)}
                  </div>

                  <div class="desktop-collection-count">
                    ${escapeHtml(
                      designLabel(
                        item.count,
                        view.content
                      )
                    )}
                  </div>
                </div>

                <span class="desktop-arrow-link">
                  ${escapeHtml(content.explore||'')}
                  <span class="desktop-arrow" aria-hidden="true">→</span>
                </span>
              </div>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function featuredHtml(view){
    const content=
      view.content.featured||{};

    return `
      <section
        class="desktop-home-section desktop-container desktop-reveal"
        aria-labelledby="desktopFeaturedTitle"
      >
        <div class="desktop-featured-head">
          <div class="desktop-featured-copy">
            <div class="desktop-eyebrow">
              ${escapeHtml(content.kicker||'')}
            </div>

            <h2
              class="desktop-home-section__title"
              id="desktopFeaturedTitle"
            >
              ${escapeHtml(content.title||'')}
            </h2>

            <p class="desktop-home-section__body">
              ${escapeHtml(content.body||'')}
            </p>
          </div>

          <button
            class="desktop-text-button desktop-arrow-link"
            type="button"
            data-desktop-home-action="catalog"
          >
            ${escapeHtml(content.viewAll||'')}
            <span class="desktop-arrow" aria-hidden="true">→</span>
          </button>
        </div>

        <div class="desktop-product-grid">
          ${view.featuredProducts.map(product=>`
            <article
              class="desktop-product-card"
              data-desktop-product-card="${escapeHtml(product.id)}"
            >
              <button
                class="desktop-product-link"
                type="button"
                data-desktop-home-action="product"
                data-desktop-product="${escapeHtml(product.id)}"
              >
                <div
                  class="desktop-product-media media-frame desktop-media-placeholder"
                >
                  <img
                    class="desktop-product-media__cover"
                    data-desktop-image
                    data-desktop-source="${escapeHtml(product.cover)}"
                    data-desktop-kind="catalog"
                    data-desktop-priority="auto"
                    alt="${escapeHtml(product.name)}"
                  >

                  ${
                    product.angle
                      ? `
                        <img
                          class="desktop-product-media__angle"
                          data-desktop-angle-source="${escapeHtml(product.angle)}"
                          alt=""
                        >
                      `
                      : ''
                  }
                </div>

                <div class="desktop-product-info">
                  <h3 class="desktop-product-name">
                    ${escapeHtml(product.name)}
                  </h3>

                  <div class="desktop-product-series">
                    ${escapeHtml(product.seriesLabel)}
                  </div>

                  <div class="desktop-product-commercial">
                    <span class="desktop-product-price">
                      ${escapeHtml(product.price)}
                    </span>

                    <span class="desktop-product-moq">
                      ${escapeHtml(content.moq||'MOQ')}
                      ${escapeHtml(product.moq)}
                    </span>
                  </div>

                  <div class="desktop-product-detail-link desktop-arrow-link">
                    ${escapeHtml(content.viewDetails||'')}
                    <span class="desktop-arrow" aria-hidden="true">→</span>
                  </div>
                </div>
              </button>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function craftHtml(view){
    const content=
      view.content.craft||{};

    return `
      <section
        class="desktop-home-band desktop-home-band--sand desktop-reveal"
        aria-labelledby="desktopCraftTitle"
      >
        <div class="desktop-container desktop-editorial-grid">
          <div
            class="desktop-editorial-media media-frame desktop-media-placeholder"
          >
            <img
              data-desktop-image
              data-desktop-source="${escapeHtml(view.craft.image)}"
              data-desktop-kind="detail"
              data-desktop-priority="auto"
              alt=""
            >
          </div>

          <div class="desktop-editorial-copy">
            <div class="desktop-eyebrow">
              ${escapeHtml(content.kicker||'')}
            </div>

            <h2
              class="desktop-editorial-title"
              id="desktopCraftTitle"
            >
              ${escapeHtml(content.title||'')}
            </h2>

            <p class="desktop-editorial-body">
              ${escapeHtml(content.body||'')}
            </p>
          </div>
        </div>
      </section>
    `;
  }

  function customHtml(view){
    const content=
      view.content.custom||{};
    const features=
      Array.isArray(content.features)
        ? content.features
        : [];

    return `
      <section
        class="desktop-home-section desktop-container desktop-reveal"
        aria-labelledby="desktopCustomTitle"
      >
        <div class="desktop-custom-card">
          <div class="desktop-custom-copy">
            <div class="desktop-eyebrow">
              ${escapeHtml(content.kicker||'')}
            </div>

            <h2
              class="desktop-custom-title"
              id="desktopCustomTitle"
            >
              ${escapeHtml(content.title||'')}
            </h2>

            <p class="desktop-custom-body">
              ${escapeHtml(content.body||'')}
            </p>

            <div class="desktop-custom-features">
              ${features.map(feature=>`
                <div class="desktop-custom-feature">
                  ${escapeHtml(feature)}
                </div>
              `).join('')}
            </div>

            <button
              class="desktop-text-button desktop-arrow-link"
              type="button"
              data-desktop-home-action="custom"
            >
              ${escapeHtml(content.action||'')}
              <span class="desktop-arrow" aria-hidden="true">→</span>
            </button>
          </div>

          <div
            class="desktop-custom-media media-frame desktop-media-placeholder"
          >
            <img
              data-desktop-image
              data-desktop-source="${escapeHtml(view.custom.image)}"
              data-desktop-kind="detail"
              data-desktop-priority="auto"
              alt=""
            >
          </div>
        </div>
      </section>
    `;
  }

  function wholesaleHtml(view){
    const content=
      view.content.wholesale||{};
    const facts=
      Array.isArray(content.facts)
        ? content.facts
        : [];

    return `
      <section
        class="desktop-home-section desktop-container desktop-reveal"
        aria-labelledby="desktopWholesaleTitle"
      >
        <div class="desktop-wholesale-head">
          <div class="desktop-eyebrow">
            ${escapeHtml(content.kicker||'')}
          </div>

          <h2
            class="desktop-home-section__title"
            id="desktopWholesaleTitle"
          >
            ${escapeHtml(content.title||'')}
          </h2>
        </div>

        <div class="desktop-wholesale-grid">
          ${facts.map(fact=>`
            <article class="desktop-wholesale-fact">
              <h3>
                ${escapeHtml(fact.title||'')}
              </h3>

              <p>
                ${escapeHtml(fact.body||'')}
              </p>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function ctaHtml(view){
    const content=
      view.content.cta||{};
    const hasInquiry=
      view.inquiryCount>0;

    return `
      <section
        class="desktop-home-cta desktop-reveal"
        aria-labelledby="desktopCtaTitle"
      >
        <div class="desktop-container desktop-home-cta__inner">
          <div>
            <div class="desktop-eyebrow">
              ${escapeHtml(content.kicker||'')}
            </div>

            <h2
              class="desktop-home-cta__title"
              id="desktopCtaTitle"
            >
              ${escapeHtml(content.title||'')}
            </h2>

            <p class="desktop-home-cta__body">
              ${escapeHtml(content.body||'')}
            </p>
          </div>

          <div class="desktop-home-cta__actions">
            <button
              class="desktop-primary-button"
              type="button"
              data-desktop-home-action="${hasInquiry?'inquiry':'catalog'}"
              data-home-inquiry-cta
            >
              ${
                hasInquiry
                  ? `${escapeHtml(content.review||'Review inquiry')} ${String(view.inquiryCount).padStart(2,'0')}`
                  : escapeHtml(content.explore||'Explore collection')
              }
              <span aria-hidden="true">→</span>
            </button>

            <button
              class="desktop-text-button desktop-arrow-link"
              type="button"
              data-desktop-home-action="custom"
            >
              ${escapeHtml(content.custom||'')}
              <span class="desktop-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function render(view){
    if(!homeRoot){
      return false;
    }

    homeRoot.innerHTML=`
      <div class="desktop-home">
        ${heroHtml(view)}
        ${collectionsHtml(view)}
        ${featuredHtml(view)}
        ${craftHtml(view)}
        ${customHtml(view)}
        ${wholesaleHtml(view)}
        ${ctaHtml(view)}
      </div>
    `;

    mountImages();
    mountReveal();

    return true;
  }

  function mediaApi(){
    return config?.media?.()||null;
  }

  async function loadImage(
    img,
    source,
    kind='catalog',
    priority='auto'
  ){
    if(
      !img||
      !source
    ){
      return false;
    }

    const media=
      mediaApi();

    if(
      media?.loadResponsiveImage
    ){
      return media.loadResponsiveImage(
        img,
        source,
        kind,
        priority
      );
    }

    img.loading=
      priority==='high'
        ? 'eager'
        : 'lazy';

    img.fetchPriority=
      priority;

    img.src=source;

    return true;
  }

  function mountImages(){
    homeRoot
      ?.querySelectorAll(
        '[data-desktop-image]'
      )
      .forEach(img=>{
        loadImage(
          img,
          img.dataset.desktopSource,
          img.dataset.desktopKind||'catalog',
          img.dataset.desktopPriority||'auto'
        );
      });
  }

  function mountReveal(){
    revealObserver
      ?.disconnect?.();

    revealObserver=null;

    const elements=[
      ...(
        homeRoot
          ?.querySelectorAll(
            '.desktop-reveal'
          )||
        []
      )
    ];

    if(
      !elements.length
    ){
      return;
    }

    if(
      root.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )?.matches||
      typeof root.IntersectionObserver!==
        'function'
    ){
      elements.forEach(
        element=>
          element.classList
            .add('is-visible')
      );

      return;
    }

    revealObserver=
      new root.IntersectionObserver(
        entries=>{
          entries.forEach(entry=>{
            if(!entry.isIntersecting){
              return;
            }

            entry.target
              .classList
              .add('is-visible');

            revealObserver
              ?.unobserve(
                entry.target
              );
          });
        },
        {
          rootMargin:'0px 0px -8% 0px',
          threshold:.08
        }
      );

    elements.forEach(
      element=>
        revealObserver
          ?.observe(element)
    );
  }

  async function activateAngle(card){
    const angle=
      card?.querySelector(
        '[data-desktop-angle-source]'
      );

    if(
      !angle||
      !angle.dataset.desktopAngleSource
    ){
      return;
    }

    if(
      angle.dataset.angleLoaded!==
      'true'
    ){
      const success=
        await loadImage(
          angle,
          angle.dataset
            .desktopAngleSource,
          'catalog',
          'low'
        );

      if(!success){
        return;
      }

      angle.dataset.angleLoaded='true';
      angle.classList.add(
        'is-angle-ready'
      );
    }

    card.classList.add(
      'is-angle-active'
    );
  }

  function deactivateAngle(card){
    card?.classList.remove(
      'is-angle-active'
    );
  }

  function onPointerOver(event){
    const card=
      event.target.closest?.(
        '[data-desktop-product-card]'
      );

    if(
      !card||
      (
        event.relatedTarget&&
        card.contains(
          event.relatedTarget
        )
      )
    ){
      return;
    }

    activateAngle(card);
  }

  function onPointerOut(event){
    const card=
      event.target.closest?.(
        '[data-desktop-product-card]'
      );

    if(
      !card||
      (
        event.relatedTarget&&
        card.contains(
          event.relatedTarget
        )
      )
    ){
      return;
    }

    deactivateAngle(card);
  }

  function onClick(event){
    const actionNode=
      event.target.closest?.(
        '[data-desktop-home-action]'
      );

    if(!actionNode){
      return;
    }

    const action=
      actionNode.dataset
        .desktopHomeAction;

    if(action==='catalog'){
      config?.actions
        ?.navigate?.('catalog');
      return;
    }

    if(action==='custom'){
      config?.actions
        ?.navigate?.('custom');
      return;
    }

    if(action==='inquiry'){
      config?.actions
        ?.navigate?.('inquiry');
      return;
    }

    if(action==='series'){
      config?.actions
        ?.openSeries?.(
          actionNode.dataset
            .desktopSeries
        );
      return;
    }

    if(action==='product'){
      config?.actions
        ?.openProduct?.(
          actionNode.dataset
            .desktopProduct
        );
    }
  }

  function configure(options={}){
    config={
      content:
        typeof options.content==='function'
          ? options.content
          : ()=>({}),
      homeConfig:
        options.homeConfig||{},
      products:
        Array.isArray(options.products)
          ? options.products
          : [],
      seriesMeta:
        options.seriesMeta||{},
      seriesLabel:
        options.seriesLabel,
      productName:
        options.productName,
      productCover:
        options.productCover,
      productAngle:
        options.productAngle,
      productDetail:
        options.productDetail,
      productPrice:
        options.productPrice,
      productMoq:
        options.productMoq,
      inquiryCount:
        typeof options.inquiryCount==='function'
          ? options.inquiryCount
          : ()=>0,
      media:
        typeof options.media==='function'
          ? options.media
          : ()=>null,
      actions:
        options.actions||{}
    };

    return snapshot();
  }

  function mount(rootElement){
    homeRoot=
      rootElement||null;

    if(!homeRoot){
      return false;
    }

    if(!mounted){
      homeRoot.addEventListener(
        'click',
        onClick
      );

      homeRoot.addEventListener(
        'pointerover',
        onPointerOver
      );

      homeRoot.addEventListener(
        'pointerout',
        onPointerOut
      );

      mounted=true;
    }

    return render(
      currentViewModel()
    );
  }

  function refresh(){
    if(!mounted){
      return false;
    }

    return render(
      currentViewModel()
    );
  }

  function syncInquiry(){
    if(!mounted){
      return;
    }

    const button=
      homeRoot?.querySelector(
        '[data-home-inquiry-cta]'
      );

    if(!button){
      return;
    }

    const count=
      Math.max(
        0,
        Math.trunc(
          Number(
            config?.inquiryCount?.()||
            0
          )
        )
      );

    const cta=
      config?.content?.()
        ?.cta||{};

    button.dataset.desktopHomeAction=
      count>0
        ? 'inquiry'
        : 'catalog';

    button.innerHTML=
      count>0
        ? `${escapeHtml(cta.review||'Review inquiry')} ${String(count).padStart(2,'0')} <span aria-hidden="true">→</span>`
        : `${escapeHtml(cta.explore||'Explore collection')} <span aria-hidden="true">→</span>`;
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      configured:Boolean(config),
      mounted,
      productCount:
        config?.products?.length||0
    });
  }

  root.DreamlandDesktopHome=
    Object.freeze({
      version:VERSION,
      buildViewModel,
      configure,
      mount,
      refresh,
      syncInquiry,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

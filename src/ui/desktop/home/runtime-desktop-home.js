(function(root){
  'use strict';

  if(root.DreamlandDesktopHome){
    return;
  }

  const VERSION='B7-00B.4B-R4.2';

  const DEFAULT_ASSETS=Object.freeze({
    hero:{
      image:'./images/desktop/home/hero/hero-main.webp'
    },
    story:{
      image:'./images/desktop/home/r4-1/brand-story-main.jpg'
    },
    collections:{
      masterpiece:{
        image:'./images/desktop/home/collections/masterpiece.webp'
      },
      advanced:{
        image:'./images/desktop/home/collections/advanced.webp'
      },
      holiday:{
        image:'./images/desktop/home/collections/holiday.webp'
      },
      classic:{
        image:'./images/desktop/home/collections/classic.webp'
      }
    },
    featured:[
      {
        series:'advanced',
        image:'./images/desktop/home/featured/featured-01.webp'
      },
      {
        series:'masterpiece',
        image:'./images/desktop/home/featured/featured-02.webp'
      },
      {
        series:'holiday',
        image:'./images/desktop/home/featured/featured-03.webp'
      },
      {
        series:'classic',
        image:'./images/desktop/home/featured/featured-04.webp'
      }
    ],
    craft:{
      image:'./images/desktop/home/craft/craft-main.webp'
    },
    custom:{
      image:'./images/desktop/home/custom/custom-main.webp'
    },
    wholesale:{
      image:'./images/desktop/home/wholesale/wholesale-main.webp'
    }
  });

  let config=null;
  let homeRoot=null;
  let mounted=false;
  let revealObserver=null;
  let assetConfig=DEFAULT_ASSETS;
  let assetLoadStarted=false;

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

  function productsForSeries(
    products,
    series
  ){
    return products.filter(
      product=>
        product.series===series
    );
  }

  function resolveFeaturedProduct(
    products,
    slot
  ){
    if(slot?.productId){
      const byId=
        products.find(
          product=>
            text(product?.id)===
            text(slot.productId)
        );

      if(byId){
        return byId;
      }
    }

    if(slot?.series){
      const bySeries=
        products.find(
          product=>
            product.series===
            slot.series
        );

      if(bySeries){
        return bySeries;
      }
    }

    return null;
  }

  function buildViewModel(input={}){
    const content=
      input.content||{};

    const homeConfig=
      input.homeConfig||{};

    const assets=
      input.assets||
      DEFAULT_ASSETS;

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
              product?.cover||
              product?.image
            );

    const productPrice=
      typeof input.productPrice==='function'
        ? input.productPrice
        : ()=>'';

    const productMoq=
      typeof input.productMoq==='function'
        ? input.productMoq
        : ()=>1;

    const collections=
      collectionOrder
        .map((series,index)=>{
          const list=
            productsForSeries(
              products,
              series
            );

          return Object.freeze({
            id:series,
            label:seriesLabel(series),
            count:list.length,
            image:
              text(
                assets
                  ?.collections
                  ?.[series]
                  ?.image
              ),
            layout:
              index===0||
              index===3
                ? 'wide'
                : 'narrow'
          });
        })
        .filter(
          item=>item.count>0
        );

    const featuredSlots=
      Array.isArray(
        assets?.featured
      )
        ? assets.featured
        : DEFAULT_ASSETS.featured;

    /*
     * B7-00B.4B R4.1.2 — Current Picks
     * Exactly 3 Masterpiece + 2 Advanced products.
     * Product cover media is canonical; the historical four marketing slots
     * remain only as a visual fallback and do not cap the shelf at four.
     */
    const currentPickPlan=[
      ['masterpiece',3],
      ['advanced',2]
    ];

    const used=new Set();
    const featuredProducts=[];

    for(const [series,limit] of currentPickPlan){
      const candidates=
        productsForSeries(
          products,
          series
        )
          .filter(
            product=>
              !used.has(
                text(product.id)
              )
          )
          .slice(0,limit);

      for(const product of candidates){
        const slot=
          featuredSlots[
            featuredProducts.length%
            Math.max(
              1,
              featuredSlots.length
            )
          ]||{};

        used.add(
          text(product.id)
        );

        featuredProducts.push(
          Object.freeze({
            id:text(product.id),
            name:productName(product),
            series:text(product.series),
            seriesLabel:
              seriesLabel(
                product.series
              ),
            image:
              text(
                productCover(product)
              )||
              text(slot?.image),
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
      }
    }

    return Object.freeze({
      content,

      hero:Object.freeze({
        image:
          text(
            assets?.hero?.image
          )||
          DEFAULT_ASSETS.hero.image
      }),

      story:Object.freeze({
        image:
          text(
            assets?.story?.image
          )||
          DEFAULT_ASSETS.story.image
      }),

      collections:Object.freeze(
        collections
      ),

      featuredProducts:Object.freeze(
        featuredProducts
      ),

      craft:Object.freeze({
        image:
          text(
            assets?.craft?.image
          )||
          DEFAULT_ASSETS.craft.image
      }),

      custom:Object.freeze({
        image:
          text(
            assets?.custom?.image
          )||
          DEFAULT_ASSETS.custom.image
      }),

      wholesale:Object.freeze({
        image:
          text(
            assets?.wholesale?.image
          )||
          DEFAULT_ASSETS.wholesale.image
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
      return buildViewModel({
        assets:assetConfig
      });
    }

    return buildViewModel({
      content:
        config.content?.()||{},

      homeConfig:
        config.homeConfig||{},

      assets:
        assetConfig,

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

      productPrice:
        config.productPrice,

      productMoq:
        config.productMoq,

      inquiryCount:
        config.inquiryCount?.()||0
    });
  }

  function desktopMarketingAsset(source){
    return (
      text(source)
        .includes(
          '/images/desktop/home/'
        )
    );
  }

  function releaseAssetSource(source){
    const clean=
      text(source);

    if(
      !clean||
      !desktopMarketingAsset(
        clean
      )
    ){
      return clean;
    }

    const release=
      text(
        root.DREAMLAND_RELEASE
      );

    if(!release){
      return clean;
    }

    const separator=
      clean.includes('?')
        ? '&'
        : '?';

    return (
      clean+
      separator+
      'release='+
      encodeURIComponent(
        release
      )
    );
  }

  function assetImageSignature(assets){
    const collections=
      assets?.collections||{};

    return JSON.stringify({
      hero:
        text(
          assets?.hero?.image
        ),

      collections:
        Object.keys(collections)
          .sort()
          .map(key=>[
            key,
            text(
              collections
                ?.[key]
                ?.image
            )
          ]),

      featured:
        (
          Array.isArray(
            assets?.featured
          )
            ? assets.featured
            : []
        ).map(slot=>[
          text(slot?.series),
          text(slot?.productId),
          text(slot?.image)
        ]),

      craft:
        text(
          assets?.craft?.image
        ),

      custom:
        text(
          assets?.custom?.image
        ),

      wholesale:
        text(
          assets?.wholesale?.image
        )
    });
  }

  function scheduleAssetContractLoad(){
    if(assetLoadStarted){
      return;
    }

    const start=()=>{
      loadAssetContract();
    };

    if(
      typeof root.requestIdleCallback===
      'function'
    ){
      root.requestIdleCallback(
        start,
        {
          timeout:1600
        }
      );

      return;
    }

    root.setTimeout(
      start,
      650
    );
  }

  async function loadAssetContract(){
    if(assetLoadStarted){
      return;
    }

    assetLoadStarted=true;

    try{
      const response=
        await fetch(
          './data/desktop-home-assets.json',
          {
            cache:'default'
          }
        );

      if(!response.ok){
        return;
      }

      const loaded=
        await response.json();

      if(
        loaded&&
        typeof loaded==='object'
      ){
        const previousSignature=
          assetImageSignature(
            assetConfig
          );

        const nextSignature=
          assetImageSignature(
            loaded
          );

        assetConfig=loaded;

        if(
          previousSignature!==
            nextSignature&&
          mounted
        ){
          refresh();
        }
      }
    }catch(error){
      console.warn(
        '[DesktopHome] asset contract fallback:',
        error
      );
    }
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
    return `
      <section
        class="desktop-home-hero desktop-home-hero--cover desktop-reveal"
        aria-labelledby="desktopHeroTitle"
      >
        <h1
          class="desktop-home-hero__sr-title"
          id="desktopHeroTitle"
        >
          DREAMLAND
        </h1>

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
      </section>
    `;
  }

  function storyHtml(view){
    const content=
      view.content.story||{};

    return `
      <section
        class="desktop-home-story desktop-container desktop-reveal"
        aria-labelledby="desktopStoryTitle"
      >
        <div
          class="desktop-home-story__media media-frame desktop-media-placeholder"
        >
          <img
            data-desktop-image
            data-desktop-source="${escapeHtml(view.story.image)}"
            data-desktop-kind="shared"
            data-desktop-priority="auto"
            alt=""
          >
        </div>

        <div class="desktop-home-story__copy">
          <div class="desktop-eyebrow">
            ${escapeHtml(content.eyebrow||content.kicker||'')}
          </div>

          <h2
            class="desktop-home-story__title"
            id="desktopStoryTitle"
          >
            ${escapeHtml(content.title||content.mark||'meet DREAMLAND')}
          </h2>

          <p class="desktop-home-story__body">
            ${escapeHtml(content.body||'')}
          </p>

          <p class="desktop-home-story__note">
            ${escapeHtml(content.note||'')}
          </p>
        </div>
      </section>
    `;
  }

  function collectionsHtml(view){
    const content=
      view.content.collections||{};

    return `
      <section
        class="desktop-home-section desktop-home-collections desktop-container desktop-reveal"
        aria-labelledby="desktopCollectionsTitle"
      >
        <div class="desktop-home-collections__note" aria-hidden="true">
          <span class="desktop-home-collections__note-column">HAND-CARVED / CANDLE ART</span>
          <span class="desktop-home-collections__note-column">WARMTH IN WAX, ART IN LIGHT</span>
          <span class="desktop-home-collections__note-column">SCULPTED SLOWLY, MADE TO STAY</span>
        </div>

        <div class="desktop-home-collections__body">
          <div class="desktop-home-section__head desktop-home-collections__intro">
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

          <div class="desktop-collection-grid desktop-home-collections__grid">
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

                  <span class="desktop-collection-hover" aria-hidden="true">
                    ${escapeHtml(content.explore||'Explore')}
                    <span>→</span>
                  </span>
                </div>

                <div class="desktop-collection-meta">
                  <div>
                    <div class="desktop-collection-name">
                      ${escapeHtml(item.label)}
                    </div>
                    <div class="desktop-collection-count">
                      ${escapeHtml(designLabel(item.count,view.content))}
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
        </div>
      </section>
    `;
  }

  function featuredHtml(view){
    const content=
      view.content.featured||{};

    return `
      <section
        class="desktop-home-section desktop-home-featured desktop-container desktop-reveal"
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

        <div class="desktop-product-grid desktop-home-featured__grid">
          ${view.featuredProducts.map(product=>`
            <article
              class="desktop-product-card desktop-home-featured__card"
              data-desktop-product-card="${escapeHtml(product.id)}"
            >
              <button
                class="desktop-product-link"
                type="button"
                data-desktop-home-action="product"
                data-desktop-product="${escapeHtml(product.id)}"
                aria-label="${escapeHtml(`${content.viewDetails||'View details'}: ${product.name}`)}"
              >
                <div
                  class="desktop-product-media desktop-home-featured__media media-frame desktop-media-placeholder"
                >
                  <img
                    class="desktop-product-media__image"
                    data-desktop-image
                    data-desktop-source="${escapeHtml(product.image)}"
                    data-desktop-kind="catalog"
                    data-desktop-priority="auto"
                    alt="${escapeHtml(product.name)}"
                  >

                  <span class="desktop-product-overlay" aria-hidden="true">
                    <span class="desktop-product-overlay__label">
                      ${escapeHtml(content.viewDetails||'View details')}
                      <span>→</span>
                    </span>
                  </span>
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
        <div class="desktop-wholesale-layout">
          <div
            class="desktop-wholesale-media media-frame desktop-media-placeholder"
          >
            <img
              data-desktop-image
              data-desktop-source="${escapeHtml(view.wholesale.image)}"
              data-desktop-kind="detail"
              data-desktop-priority="auto"
              alt=""
            >
          </div>

          <div class="desktop-wholesale-copy">
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
              ${facts.map((fact,index)=>`
                <article class="desktop-wholesale-fact">
                  <span class="desktop-wholesale-index" aria-hidden="true">
                    ${String(index+1).padStart(2,'0')}
                  </span>

                  <div>
                    <h3>${escapeHtml(fact.title||'')}</h3>
                    <p>${escapeHtml(fact.body||'')}</p>
                  </div>
                </article>
              `).join('')}
            </div>
          </div>
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
        ${storyHtml(view)}
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
      desktopMarketingAsset(
        source
      )
    ){
      const directSource=
        releaseAssetSource(
          source
        );

      if(
        media?.loadCandidates
      ){
        return media
          .loadCandidates(
            img,
            [
              directSource
            ],
            {
              priority,
              quality:'marketing'
            }
          )
          .then(
            result=>
              result.success
          );
      }

      img.loading=
        priority==='high'
          ? 'eager'
          : 'lazy';

      img.fetchPriority=
        priority;

      img.decoding='async';
      img.src=directSource;

      return true;
    }

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

    if(!elements.length){
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

    scheduleAssetContractLoad();

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

      mounted=true;
    }

    scheduleAssetContractLoad();

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
        config?.products?.length||0,
      assetContract:
        assetConfig?.stage||
        'fallback'
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

(function(root){
  'use strict';

  if(root.DreamlandDesktopCatalog){
    return;
  }

  const VERSION='B7-00B.3A';
  const PRESENTATION_VERSION='B7-00B.4C-R1.1';
  const SEARCH_DELAY=260;
  const SIZE_OPTIONS=Object.freeze([
    'S',
    'M',
    'L',
    'XL'
  ]);

  let config=null;
  let catalogRoot=null;
  let mounted=false;
  let filterOpen=false;
  let draftSizes=[];
  let searchTimer=null;

  function text(value){
    return String(
      value??
      ''
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

  function content(){
    return (
      config?.content?.()
        ?.catalog||
      {}
    );
  }

  function viewModel(){
    return (
      config?.viewModel?.()||
      {
        scope:'all',
        query:'',
        sort:'featured',
        selectedSizes:[],
        availableScopes:['all'],
        allCount:0,
        seriesCounts:{},
        totalCount:0,
        renderedCount:0,
        hasMore:false,
        products:[]
      }
    );
  }

  function seriesLabel(value){
    if(value==='all'){
      return (
        content().all||
        'All'
      );
    }

    return text(
      config?.seriesLabel?.(
        value
      )||
      value
    );
  }

  function productName(product){
    return text(
      config?.productName?.(
        product
      )||
      product?.name||
      product?.id
    );
  }

  function productCover(product){
    return text(
      config?.productCover?.(
        product
      )
    );
  }

  function productPrice(product){
    return text(
      config?.productPrice?.(
        product
      )
    );
  }

  function productMoq(product){
    return Math.max(
      1,
      Math.trunc(
        Number(
          product
            ?.desktopCatalogMoq||
          config?.productMoq?.(
            product
          )||
          1
        )
      )
    );
  }

  function scopeCount(
    view,
    scope
  ){
    if(scope==='all'){
      return Number(
        view.allCount||
        0
      );
    }

    return Number(
      view.seriesCounts
        ?.[scope]||
      0
    );
  }

  function sortOptionsHtml(
    value
  ){
    const copy=
      content();

    const options=[
      [
        'featured',
        copy.sortFeatured||
          'Featured'
      ],
      [
        'name',
        copy.sortName||
          'Name A–Z'
      ],
      [
        'price-low',
        copy.sortPriceLow||
          'Price low to high'
      ],
      [
        'price-high',
        copy.sortPriceHigh||
          'Price high to low'
      ],
      [
        'moq-low',
        copy.sortMoq||
          'MOQ low to high'
      ]
    ];

    return options
      .map(
        ([key,label])=>`
          <option
            value="${escapeHtml(key)}"
            ${key===value?'selected':''}
          >
            ${escapeHtml(label)}
          </option>
        `
      )
      .join('');
  }

  function scopeNavigationHtml(
    view
  ){
    return `
      <div
        class="desktop-catalog-series desktop-catalog-series-index desktop-catalog-series-tabs"
        role="tablist"
        aria-label="${escapeHtml(content().seriesNavigation||'Series')}"
      >
        ${view.availableScopes
          .map(
            scope=>`
              <button
                class="desktop-catalog-series__item ${scope===view.scope?'is-active':''}"
                type="button"
                role="tab"
                aria-selected="${scope===view.scope?'true':'false'}"
                data-desktop-catalog-scope="${escapeHtml(scope)}"
              >
                <span class="desktop-catalog-series__label">
                  ${escapeHtml(seriesLabel(scope))}
                </span>
                <small class="desktop-catalog-series__count">
                  ${escapeHtml(scopeCount(view,scope))}
                </small>
              </button>
            `
          )
          .join('')}
      </div>
    `;
  }

  function filterHtml(view){
    const copy=
      content();

    const active=
      view.selectedSizes||
      [];

    const draft=
      filterOpen
        ? draftSizes
        : active;

    return `
      <div class="desktop-catalog-filter">
        <button
          class="desktop-catalog-tool-button ${active.length?'is-active':''}"
          type="button"
          data-desktop-catalog-action="toggle-filter"
          aria-expanded="${filterOpen?'true':'false'}"
        >
          ${escapeHtml(copy.filters||'Filters')}
          ${active.length
            ? `<span class="desktop-catalog-tool-count">${active.length}</span>`
            : ''}
        </button>

        <div
          class="desktop-catalog-filter__popover ${filterOpen?'is-open':''}"
          ${filterOpen?'':'hidden'}
        >
          <div class="desktop-catalog-filter__head">
            <strong>
              ${escapeHtml(copy.size||'Size')}
            </strong>

            <button
              class="desktop-catalog-filter__clear"
              type="button"
              data-desktop-catalog-action="clear-filter-draft"
            >
              ${escapeHtml(copy.clear||'Clear')}
            </button>
          </div>

          <div class="desktop-catalog-size-options">
            ${SIZE_OPTIONS
              .map(
                size=>`
                  <label class="desktop-catalog-size-option">
                    <input
                      type="checkbox"
                      value="${size}"
                      data-desktop-catalog-size
                      ${draft.includes(size)?'checked':''}
                    >
                    <span>${size}</span>
                  </label>
                `
              )
              .join('')}
          </div>

          <button
            class="desktop-primary-button desktop-catalog-filter__apply"
            type="button"
            data-desktop-catalog-action="apply-filters"
          >
            ${escapeHtml(copy.apply||'Apply')}
          </button>
        </div>
      </div>
    `;
  }

  function activeFiltersHtml(
    view
  ){
    if(!view.selectedSizes?.length){
      return '';
    }

    const copy=
      content();

    return `
      <div class="desktop-catalog-active-filters">
        ${view.selectedSizes
          .map(
            size=>`
              <button
                class="desktop-catalog-filter-chip"
                type="button"
                data-desktop-catalog-remove-size="${escapeHtml(size)}"
              >
                ${escapeHtml(copy.size||'Size')}: ${escapeHtml(size)}
                <span aria-hidden="true">×</span>
              </button>
            `
          )
          .join('')}
      </div>
    `;
  }

  function cardHtml(
    product,
    index
  ){
    const copy=content();
    const id=text(product?.id||product?.productId);
    const name=productName(product);
    const cover=productCover(product);
    const priority=index<8?'high':'auto';

    return `
      <article
        class="desktop-catalog-card"
        data-desktop-catalog-card-series="${escapeHtml(product?.series||'')}"
      >
        <button
          class="desktop-catalog-card__link"
          type="button"
          data-desktop-catalog-product="${escapeHtml(id)}"
          aria-label="${escapeHtml((copy.viewDetails||'View details')+': '+name)}"
        >
          <div class="desktop-catalog-card__media media-frame">
            <span class="media-skeleton" aria-hidden="true"></span>

            <img
              class="desktop-catalog-card__image"
              data-image-manager-catalog="1"
              data-responsive-source="${escapeHtml(cover)}"
              data-responsive-priority="${priority}"
              alt="${escapeHtml(name)}"
              width="720"
              height="900"
              loading="${index<8?'eager':'lazy'}"
              decoding="async"
            >

            <span class="desktop-catalog-card__overlay" aria-hidden="true">
              <span>
                ${escapeHtml(copy.viewDetails||'View details')}
                <b>→</b>
              </span>
            </span>
          </div>

          <div class="desktop-catalog-card__info">
            <div class="desktop-catalog-card__identity">
              <h2>${escapeHtml(name)}</h2>
              <p>${escapeHtml(seriesLabel(product?.series))}</p>
            </div>

            <div class="desktop-catalog-card__commercial">
              <strong>${escapeHtml(productPrice(product))}</strong>
              <span>
                ${escapeHtml(copy.moq||'MOQ')}
                ${escapeHtml(productMoq(product))}
              </span>
            </div>
          </div>
        </button>
      </article>
    `;
  }

  function emptyHtml(view){
    const copy=
      content();

    const search=
      text(view.query);

    return `
      <div class="desktop-catalog-empty">
        <div class="desktop-eyebrow">
          ${escapeHtml(copy.emptyKicker||'NO MATCHES')}
        </div>

        <h2>
          ${
            search
              ? escapeHtml(
                  (copy.searchEmptyTitle||'No results for “{query}”')
                    .replace(
                      '{query}',
                      search
                    )
                )
              : escapeHtml(
                  copy.emptyTitle||
                  'No designs match these filters.'
                )
          }
        </h2>

        <p>
          ${escapeHtml(
            copy.emptyBody||
            'Try another size or clear your filters.'
          )}
        </p>

        <button
          class="desktop-text-button desktop-arrow-link"
          type="button"
          data-desktop-catalog-action="clear-browse"
        >
          ${escapeHtml(copy.clearFilters||'Clear filters')}
          <span class="desktop-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    `;
  }

  function gridHtml(view){
    if(view.empty){
      return emptyHtml(view);
    }

    return `
      <div
        class="desktop-catalog-grid"
        id="desktopCatalogGrid"
      >
        ${view.products
          .map(
            (
              product,
              index
            )=>
              cardHtml(
                product,
                index
              )
          )
          .join('')}
      </div>

      <div class="desktop-catalog-pagination">
        <p>
          ${escapeHtml(content().showing||'Showing')}
          <strong>${view.renderedCount}</strong>
          ${escapeHtml(content().of||'of')}
          <strong>${view.totalCount}</strong>
        </p>

        ${
          view.hasMore
            ? `
              <button
                class="desktop-catalog-load-more"
                type="button"
                data-desktop-catalog-action="load-more"
              >
                ${escapeHtml(content().loadMore||'Load more')}
              </button>
            `
            : ''
        }
      </div>
    `;
  }

  function ctaHtml(){
    const copy=
      content();

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

    const ready=
      count>0;

    return `
      <section class="desktop-catalog-cta">
        <div>
          <div class="desktop-eyebrow">
            ${escapeHtml(copy.ctaKicker||'YOUR INQUIRY')}
          </div>

          <h2>
            ${escapeHtml(
              ready
                ? (
                    copy.ctaReadyTitle||
                    'Your inquiry is taking shape.'
                  )
                : (
                    copy.ctaEmptyTitle||
                    'Found something you like?'
                  )
            )}
          </h2>

          <p>
            ${escapeHtml(
              ready
                ? (
                    (copy.ctaReadyBody||'{count} selected items are ready to review.')
                      .replace(
                        '{count}',
                        String(count)
                      )
                  )
                : (
                    copy.ctaEmptyBody||
                    'Open a piece to configure size, scent and packaging.'
                  )
            )}
          </p>
        </div>

        ${
          ready
            ? `
              <button
                class="desktop-primary-button"
                type="button"
                data-desktop-catalog-action="review-inquiry"
              >
                ${escapeHtml(copy.reviewInquiry||'Review inquiry')}
                <span aria-hidden="true">→</span>
              </button>
            `
            : ''
        }
      </section>
    `;
  }

  function pageHtml(view){
    const copy=content();

    return `
      <div
        class="desktop-catalog-page"
        data-desktop-catalog-presentation="${escapeHtml(PRESENTATION_VERSION)}"
      >
        <section
          class="desktop-catalog-intro desktop-catalog-cover desktop-container--wide"
          aria-labelledby="desktopCatalogTitle"
        >
          <div class="desktop-eyebrow">${escapeHtml(copy.kicker||'THE COLLECTION')}</div>

          <div class="desktop-catalog-intro__layout">
            <div class="desktop-catalog-intro__copy">
              <h1 id="desktopCatalogTitle">${escapeHtml(copy.title||'Explore the DREAMLAND collection')}</h1>
              <p>${escapeHtml(copy.body||'')}</p>
            </div>

            <div class="desktop-catalog-intro__count">
              <strong>${view.allCount}</strong>
              <span>${escapeHtml(copy.activeDesigns||'DREAMS')}</span>
            </div>
          </div>
        </section>

        <div class="desktop-catalog-sticky desktop-catalog-browse-bar">
          <div class="desktop-container--wide">
            <div class="desktop-catalog-browse-layout">
              ${scopeNavigationHtml(view)}

              <div class="desktop-catalog-browse-actions">
                <div class="desktop-catalog-result-count">
                  <strong>${view.totalCount}</strong>
                  <span>${escapeHtml(copy.designs||'designs')}</span>
                </div>

                <div class="desktop-catalog-tools">
                  <label class="desktop-catalog-search">
                    <span class="desktop-catalog-search__icon" aria-hidden="true">⌕</span>
                    <input
                      type="search"
                      value="${escapeHtml(view.query)}"
                      placeholder="${escapeHtml(copy.searchPlaceholder||'Search designs or product ID')}"
                      autocomplete="off"
                      data-desktop-catalog-search
                    >
                  </label>

                  ${filterHtml(view)}

                  <label class="desktop-catalog-sort">
                    <span class="sr-only">${escapeHtml(copy.sort||'Sort')}</span>
                    <select data-desktop-catalog-sort>
                      ${sortOptionsHtml(view.sort)}
                    </select>
                  </label>

                  <button
                    class="desktop-catalog-back-top"
                    type="button"
                    data-desktop-catalog-action="back-top"
                  >
                    <span>${escapeHtml(copy.backToTop||'Back to top')}</span>
                    <b aria-hidden="true">↑</b>
                  </button>
                </div>
              </div>
            </div>

            ${activeFiltersHtml(view)}
          </div>
        </div>

        <section class="desktop-catalog-products desktop-container--wide">
          ${gridHtml(view)}
        </section>

        <div class="desktop-container--wide">
          ${ctaHtml()}
        </div>
      </div>
    `;
  }

  function afterRender(view){
    config?.afterRender?.({
      root:catalogRoot,
      grid:
        catalogRoot?.querySelector(
          '#desktopCatalogGrid'
        ),
      renderedCount:
        view.renderedCount
    });
  }

  function render({
    preserveSearchFocus=false,
    preserveScroll=false
  }={}){
    if(!catalogRoot){
      return false;
    }

    const active=
      preserveSearchFocus&&
      catalogRoot.contains(
        document.activeElement
      )&&
      document.activeElement
        ?.matches?.(
          '[data-desktop-catalog-search]'
        );

    const selection=
      active
        ? {
            start:
              document.activeElement
                .selectionStart,
            end:
              document.activeElement
                .selectionEnd
          }
        : null;

    const scrollY=
      preserveScroll
        ? window.scrollY
        : null;

    const view=
      viewModel();

    catalogRoot.innerHTML=
      pageHtml(view);

    if(filterOpen){
      draftSizes=[
        ...(
          draftSizes.length
            ? draftSizes
            : view.selectedSizes
        )
      ];
    }

    afterRender(view);

    if(active){
      root.requestAnimationFrame?.(
        ()=>{
          const input=
            catalogRoot.querySelector(
              '[data-desktop-catalog-search]'
            );

          input?.focus?.();

          if(
            input&&
            selection
          ){
            try{
              input.setSelectionRange(
                selection.start,
                selection.end
              );
            }catch(_){}
          }
        }
      );
    }

    if(scrollY!=null){
      root.requestAnimationFrame?.(
        ()=>root.scrollTo?.(
          0,
          scrollY
        )
      );
    }

    return true;
  }

  function closeFilter(){
    filterOpen=false;
    draftSizes=[];
    render({
      preserveScroll:true
    });
  }

  function onClick(event){
    const scopeButton=
      event.target.closest?.(
        '[data-desktop-catalog-scope]'
      );

    if(scopeButton){
      filterOpen=false;
      draftSizes=[];

      config?.actions
        ?.setScope?.(
          scopeButton.dataset
            .desktopCatalogScope
        );

      return;
    }

    const productButton=
      event.target.closest?.(
        '[data-desktop-catalog-product]'
      );

    if(productButton){
      config?.actions
        ?.openProduct?.(
          productButton.dataset
            .desktopCatalogProduct
        );

      return;
    }

    const removeSize=
      event.target.closest?.(
        '[data-desktop-catalog-remove-size]'
      );

    if(removeSize){
      const current=
        viewModel()
          .selectedSizes||
        [];

      config?.actions
        ?.setSizes?.(
          current.filter(
            value=>
              value!==
              removeSize.dataset
                .desktopCatalogRemoveSize
          )
        );

      return;
    }

    const actionButton=
      event.target.closest?.(
        '[data-desktop-catalog-action]'
      );

    if(!actionButton){
      return;
    }

    const action=
      actionButton.dataset
        .desktopCatalogAction;

    if(action==='toggle-filter'){
      filterOpen=
        !filterOpen;

      draftSizes=[
        ...(
          viewModel()
            .selectedSizes||
          []
        )
      ];

      render({
        preserveScroll:true
      });

      return;
    }

    if(action==='clear-filter-draft'){
      draftSizes=[];

      render({
        preserveScroll:true
      });

      return;
    }

    if(action==='apply-filters'){
      filterOpen=false;

      config?.actions
        ?.setSizes?.(
          draftSizes
        );

      draftSizes=[];
      return;
    }

    if(action==='load-more'){
      config?.actions
        ?.loadMore?.();

      return;
    }

    if(action==='clear-browse'){
      filterOpen=false;
      draftSizes=[];

      config?.actions
        ?.clearBrowse?.();

      return;
    }

    if(action==='back-top'){
      filterOpen=false;
      draftSizes=[];

      root.scrollTo?.({
        top:0,
        behavior:'smooth'
      });

      return;
    }

    if(action==='review-inquiry'){
      config?.actions
        ?.reviewInquiry?.();
    }
  }

  function onChange(event){
    const sort=
      event.target.closest?.(
        '[data-desktop-catalog-sort]'
      );

    if(sort){
      config?.actions
        ?.setSort?.(
          sort.value
        );

      return;
    }

    const size=
      event.target.closest?.(
        '[data-desktop-catalog-size]'
      );

    if(size){
      const selected=
        [
          ...catalogRoot
            .querySelectorAll(
              '[data-desktop-catalog-size]:checked'
            )
        ]
          .map(
            input=>
              input.value
          );

      draftSizes=
        selected;
    }
  }

  function onInput(event){
    const search=
      event.target.closest?.(
        '[data-desktop-catalog-search]'
      );

    if(!search){
      return;
    }

    if(searchTimer){
      root.clearTimeout(
        searchTimer
      );
    }

    const value=
      search.value;

    searchTimer=
      root.setTimeout(
        ()=>{
          searchTimer=null;

          config?.actions
            ?.setQuery?.(
              value
            );
        },
        SEARCH_DELAY
      );
  }

  function onKeydown(event){
    if(
      event.key==='Escape'&&
      filterOpen
    ){
      closeFilter();
    }
  }

  function onDocumentPointerDown(event){
    if(
      !filterOpen||
      !catalogRoot
    ){
      return;
    }

    const insideFilter=
      event.target
        ?.closest?.(
          '.desktop-catalog-filter'
        );

    if(
      insideFilter&&
      catalogRoot.contains(
        insideFilter
      )
    ){
      return;
    }

    closeFilter();
  }

  function configure(options={}){
    config={
      content:
        typeof options.content==='function'
          ? options.content
          : ()=>({}),

      viewModel:
        typeof options.viewModel==='function'
          ? options.viewModel
          : ()=>({}),

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

      afterRender:
        typeof options.afterRender==='function'
          ? options.afterRender
          : ()=>{},

      actions:
        options.actions||
        {}
    };

    return snapshot();
  }

  function mount(rootElement){
    catalogRoot=
      rootElement||
      null;

    if(!catalogRoot){
      return false;
    }

    if(!mounted){
      catalogRoot.addEventListener(
        'click',
        onClick
      );

      catalogRoot.addEventListener(
        'change',
        onChange
      );

      catalogRoot.addEventListener(
        'input',
        onInput
      );

      catalogRoot.addEventListener(
        'keydown',
        onKeydown
      );

      document.addEventListener(
        'pointerdown',
        onDocumentPointerDown,
        true
      );

      mounted=true;
    }

    render();

    return true;
  }

  function refresh(options={}){
    return render(options);
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      mounted,
      filterOpen,
      searchPending:
        Boolean(searchTimer)
    });
  }

  root.DreamlandDesktopCatalog=
    Object.freeze({
      version:VERSION,
      configure,
      mount,
      refresh,
      closeFilter,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

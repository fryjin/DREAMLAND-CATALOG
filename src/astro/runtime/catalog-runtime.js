(function(root){
  'use strict';

  if(root.DreamlandCatalogRuntime){
    return;
  }

  const VERSION='R4.4B';
  const RUNTIME_ID='DREAMLAND_R4_CATALOG_RUNTIME_R4_4B';
  const SEARCH_DELAY=180;

  let state=null;
  let catalog=null;
  let currentLanguage='en';
  let mounted=false;
  let searchTimer=0;

  function text(value){
    return String(
      value??
      ''
    );
  }

  function safeJson(value){
    try{
      return JSON.parse(
        String(
          value||
          ''
        )
      );
    }catch(_){
      return null;
    }
  }

  function storage(){
    try{
      return root.localStorage||null;
    }catch(_){
      return null;
    }
  }

  function readStorage(key){
    const target=storage();

    if(!target){
      return '';
    }

    try{
      return target.getItem(key)||'';
    }catch(_){
      return '';
    }
  }

  function writeStorage(
    key,
    value
  ){
    const target=storage();

    if(!target){
      return false;
    }

    try{
      target.setItem(
        key,
        String(value)
      );

      return true;
    }catch(_){
      return false;
    }
  }

  function normalizeLanguage(
    value,
    fallback='en',
    supported=[
      'en',
      'zh',
      'ko'
    ]
  ){
    const next=
      text(value)
        .trim()
        .toLowerCase();

    return supported.includes(next)
      ? next
      : fallback;
  }

  function inquiryCount(value){
    const data=
      typeof value==='string'
        ? safeJson(value)
        : value;

    if(
      !data||
      typeof data!=='object'||
      Array.isArray(data)||
      !Array.isArray(data.items)
    ){
      return 0;
    }

    return data.items.reduce(
      (
        total,
        item
      )=>{
        if(item?.type==='product'){
          return total+
            (
              Number(
                item?.qty
              )||
              0
            );
        }

        return total+1;
      },
      0
    );
  }

  function escapeHtml(value){
    return text(value)
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#39;'
      );
  }

  function pathValue(
    source,
    path
  ){
    return text(path)
      .split('.')
      .filter(Boolean)
      .reduce(
        (
          value,
          key
        )=>
          value==
          null
            ? undefined
            : value[key],
        source
      );
  }

  function contentFor(
    language
  ){
    return (
      state?.languages?.[language]||
      state?.languages
        ?.[state?.defaultLanguage]||
      state?.languages?.en||
      null
    );
  }

  function productName(product){
    return (
      product?.names
        ?.[currentLanguage]||
      product?.names?.en||
      product?.id||
      ''
    );
  }

  function productSeries(product){
    return (
      product?.seriesLabels
        ?.[currentLanguage]||
      product?.seriesLabels?.en||
      product?.series||
      ''
    );
  }

  function productPrice(product){
    return (
      product?.prices
        ?.[currentLanguage]||
      product?.prices?.en||
      ''
    );
  }

  function setText(
    node,
    value
  ){
    if(node){
      node.textContent=
        text(value);
    }
  }

  function applyGenericBindings(
    content
  ){
    document
      .querySelectorAll(
        '[data-home-bind],[data-catalog-bind]'
      )
      .forEach(node=>{
        const path=
          node.dataset
            .homeBind||
          node.dataset
            .catalogBind;

        const value=
          pathValue(
            content,
            path
          );

        if(value!==undefined){
          setText(
            node,
            value
          );
        }
      });
  }

  function parseRuntimeState(){
    const node=
      document.getElementById(
        'catalogRuntimeState'
      );

    if(!node){
      return null;
    }

    const parsed=
      safeJson(
        node.textContent
      );

    if(
      !parsed||
      parsed.version!==VERSION||
      !Array.isArray(
        parsed.products
      )||
      !parsed.languages||
      !parsed.storage||
      !parsed.url
    ){
      return null;
    }

    return parsed;
  }

  function urlState(
    search=
      root.location?.search||
      ''
  ){
    const params=
      new URLSearchParams(
        search
      );

    const sizes=
      text(
        params.get(
          state.url.sizes
        )
      )
        .split(',')
        .map(
          value=>
            value
              .trim()
              .toUpperCase()
        )
        .filter(Boolean);

    const page=
      Math.max(
        1,
        Math.trunc(
          Number(
            params.get(
              state.url.page
            )
          )||
          1
        )
      );

    return Object.freeze({
      series:
        params.get(
          state.url.series
        )||
        'all',
      query:
        params.get(
          state.url.query
        )||
        '',
      sizes:Object.freeze(
        [
          ...new Set(sizes)
        ]
      ),
      sort:
        params.get(
          state.url.sort
        )||
        'featured',
      page
    });
  }

  function currentPage(view){
    return Math.max(
      1,
      Math.ceil(
        Number(
          view?.renderedCount||
          0
        )/
        Number(
          state?.batchSize||
          24
        )
      )
    );
  }

  function syncUrl(
    mode,
    view
  ){
    const snapshot=
      catalog.snapshot();

    const url=
      new URL(
        root.location.href
      );

    const owned=
      state.url;

    for(const key of Object.values(owned)){
      url.searchParams.delete(key);
    }

    if(snapshot.scope!=='all'){
      url.searchParams.set(
        owned.series,
        snapshot.scope
      );
    }

    if(text(snapshot.query).trim()){
      url.searchParams.set(
        owned.query,
        text(snapshot.query).trim()
      );
    }

    if(snapshot.sizes.length){
      url.searchParams.set(
        owned.sizes,
        snapshot.sizes.join(',')
      );
    }

    if(snapshot.sort!=='featured'){
      url.searchParams.set(
        owned.sort,
        snapshot.sort
      );
    }

    const page=
      currentPage(view);

    if(page>1){
      url.searchParams.set(
        owned.page,
        String(page)
      );
    }

    const href=
      url.pathname+
      (
        url.searchParams.toString()
          ? '?'+
            url.searchParams.toString()
          : ''
      )+
      url.hash;

    if(mode==='push'){
      root.history.pushState(
        {
          dreamlandCatalog:true
        },
        '',
        href
      );
      return;
    }

    root.history.replaceState(
      {
        dreamlandCatalog:true
      },
      '',
      href
    );
  }

  function applyUrlState({
    canonicalize=false
  }={}){
    const browse=
      urlState();

    catalog.reset({
      scope:
        browse.series
    });

    catalog.setQuery(
      browse.query
    );

    catalog.setSizes(
      browse.sizes
    );

    catalog.setSort(
      browse.sort
    );

    for(
      let page=1;
      page<browse.page;
      page+=1
    ){
      catalog.loadMore();
    }

    const view=
      catalog.buildViewModel();

    render(view);

    if(canonicalize){
      syncUrl(
        'replace',
        view
      );
    }

    return view;
  }

  function sortLabel(
    sort,
    copy
  ){
    const key={
      featured:'sortFeatured',
      name:'sortName',
      'price-low':'sortPriceLow',
      'price-high':'sortPriceHigh',
      'moq-low':'sortMoq'
    }[sort];

    return (
      copy?.[key]||
      sort
    );
  }

  function cardHtml(
    product,
    index,
    copy
  ){
    const name=
      productName(product);

    const series=
      productSeries(product);

    const price=
      productPrice(product);

    const priority=
      index<4
        ? 'high'
        : 'auto';

    const loading=
      index<4
        ? 'eager'
        : 'lazy';

    const label=
      escapeHtml(
        (
          copy?.viewDetails||
          'View details'
        )+
        ': '+
        name
      );

    return (
      '<article class="catalog-card" data-catalog-product="'+
      escapeHtml(product.id)+
      '">'+
        '<a class="catalog-card__link" href="'+
        escapeHtml(product.href)+
        '" aria-label="'+
        label+
        '">'+
          '<div class="catalog-card__media">'+
            '<img src="'+
            escapeHtml(product.cover)+
            '" alt="'+
            escapeHtml(name)+
            '" width="720" height="900" loading="'+
            loading+
            '" fetchpriority="'+
            priority+
            '" decoding="async">'+
            '<span class="catalog-card__overlay" aria-hidden="true">'+
              escapeHtml(
                copy?.viewDetails||
                'View details'
              )+
              '<b>→</b>'+
            '</span>'+
          '</div>'+
          '<div class="catalog-card__copy">'+
            '<div>'+
              '<h2>'+
                escapeHtml(name)+
              '</h2>'+
              '<p>'+
                escapeHtml(series)+
              '</p>'+
            '</div>'+
            '<div class="catalog-card__commercial">'+
              '<strong>'+
                escapeHtml(price)+
              '</strong>'+
              '<span>'+
                escapeHtml(
                  copy?.moq||
                  'MOQ'
                )+
                ' '+
                escapeHtml(product.moq)+
              '</span>'+
            '</div>'+
          '</div>'+
        '</a>'+
      '</article>'
    );
  }

  function updateSeries(
    view,
    copy
  ){
    document
      .querySelectorAll(
        '[data-catalog-series]'
      )
      .forEach(button=>{
        const scope=
          button.dataset
            .catalogSeries;

        const active=
          scope===
          view.scope;

        button.classList
          .toggle(
            'is-active',
            active
          );

        button.setAttribute(
          'aria-selected',
          active
            ? 'true'
            : 'false'
        );

        const label=
          scope==='all'
            ? copy.all
            : (
                state.products
                  .find(
                    product=>
                      product.series===
                      scope
                  )
                  ?.seriesLabels
                  ?.[currentLanguage]||
                scope
              );

        setText(
          button.querySelector(
            '[data-catalog-series-label]'
          ),
          label
        );

        const count=
          scope==='all'
            ? view.allCount
            : Number(
                view.seriesCounts
                  ?.[scope]||
                0
              );

        setText(
          button.querySelector(
            '[data-catalog-series-count]'
          ),
          count
        );
      });
  }

  function updateControls(
    view,
    copy
  ){
    const search=
      document.querySelector(
        '[data-catalog-search]'
      );

    if(
      search&&
      search.value!==view.query
    ){
      search.value=
        view.query;
    }

    if(search){
      search.placeholder=
        copy.searchPlaceholder||
        '';

      search.setAttribute(
        'aria-label',
        copy.searchPlaceholder||
        'Search'
      );
    }

    const sort=
      document.querySelector(
        '[data-catalog-sort]'
      );

    if(sort){
      sort.value=
        view.sort;

      sort.setAttribute(
        'aria-label',
        copy.sort||
        'Sort'
      );
    }

    document
      .querySelectorAll(
        '[data-catalog-sort-option]'
      )
      .forEach(option=>{
        setText(
          option,
          sortLabel(
            option.value,
            copy
          )
        );
      });

    const selected=
      new Set(
        view.selectedSizes
      );

    document
      .querySelectorAll(
        '[data-catalog-size]'
      )
      .forEach(input=>{
        input.checked=
          selected.has(
            text(input.value)
              .toUpperCase()
          );
      });
  }

  function emptyTitle(
    view,
    copy
  ){
    if(
      text(view.query).trim()
    ){
      return text(
        copy.searchEmptyTitle||
        'No results for “{query}”'
      )
        .replace(
          '{query}',
          text(view.query).trim()
        );
    }

    return (
      copy.emptyTitle||
      'No designs match these filters.'
    );
  }

  function render(
    view=
      catalog.buildViewModel()
  ){
    const language=
      contentFor(
        currentLanguage
      );

    const content=
      language||{};

    const copy=
      content.catalog||{};

    applyGenericBindings(
      content
    );

    updateSeries(
      view,
      copy
    );

    updateControls(
      view,
      copy
    );

    setText(
      document.querySelector(
        '[data-catalog-all-count-value]'
      ),
      view.allCount
    );

    setText(
      document.querySelector(
        '[data-catalog-result-count]'
      ),
      view.totalCount
    );

    setText(
      document.querySelector(
        '[data-catalog-rendered-count]'
      ),
      view.renderedCount
    );

    setText(
      document.querySelector(
        '[data-catalog-total-count]'
      ),
      view.totalCount
    );

    const grid=
      document.querySelector(
        '[data-catalog-product-grid]'
      );

    const empty=
      document.querySelector(
        '[data-catalog-empty]'
      );

    if(grid){
      grid.innerHTML=
        view.products
          .map(
            (
              product,
              index
            )=>
              cardHtml(
                product,
                index,
                copy
              )
          )
          .join('');

      grid.hidden=
        view.empty;
    }

    if(empty){
      empty.hidden=
        !view.empty;
    }

    setText(
      document.querySelector(
        '[data-catalog-empty-title]'
      ),
      emptyTitle(
        view,
        copy
      )
    );

    const pagination=
      document.querySelector(
        '[data-catalog-pagination-copy]'
      );

    if(pagination){
      pagination.hidden=
        view.empty;
    }

    const loadMore=
      document.querySelector(
        '[data-catalog-load-more]'
      );

    if(loadMore){
      loadMore.hidden=
        !view.hasMore||
        view.empty;
    }

    updateInquiryBadge();

    return view;
  }

  function applyLanguage(
    language,
    {
      persist=true
    }={}
  ){
    if(!state){
      return false;
    }

    const supported=
      Object.keys(
        state.languages||
        {}
      );

    currentLanguage=
      normalizeLanguage(
        language,
        state.defaultLanguage||
          'en',
        supported
      );

    document
      .documentElement
      .setAttribute(
        'lang',
        currentLanguage==='zh'
          ? 'zh-CN'
          : currentLanguage==='ko'
            ? 'ko-KR'
            : 'en'
      );

    if(document.body){
      document.body.dataset
        .catalogLanguage=
        currentLanguage;
    }

    const select=
      document.querySelector(
        '[data-home-language-select]'
      );

    if(select){
      select.disabled=false;
      select.value=
        currentLanguage;

      select.setAttribute(
        'aria-label',
        contentFor(
          currentLanguage
        )
          ?.navigation
          ?.language||
        'Language'
      );
    }

    if(persist){
      writeStorage(
        state.storage
          .languageKey,
        currentLanguage
      );
    }

    render();

    return true;
  }

  function updateInquiryBadge(){
    if(!state){
      return 0;
    }

    const count=
      inquiryCount(
        readStorage(
          state.storage
            .inquiryKey
        )
      );

    const node=
      document.querySelector(
        '[data-home-inquiry-count]'
      );

    if(node){
      setText(
        node,
        count
      );

      node.setAttribute(
        'aria-label',
        count+
        ' '+
        (
          contentFor(
            currentLanguage
          )
            ?.navigation
            ?.inquiry||
          'Inquiry'
        )
      );
    }

    return count;
  }

  function commit(
    update,
    mode='push'
  ){
    update();

    const view=
      catalog.buildViewModel();

    syncUrl(
      mode,
      view
    );

    render(view);

    return view;
  }

  function selectedSizeInputs(){
    return [
      ...document.querySelectorAll(
        '[data-catalog-size]:checked'
      )
    ].map(
      input=>
        text(input.value)
          .toUpperCase()
    );
  }

  function bindEvents(){
    document
      .querySelectorAll(
        '[data-catalog-series]'
      )
      .forEach(button=>{
        button.addEventListener(
          'click',
          ()=>{
            commit(
              ()=>
                catalog.setScope(
                  button.dataset
                    .catalogSeries
                )
            );
          }
        );
      });

    const search=
      document.querySelector(
        '[data-catalog-search]'
      );

    search?.addEventListener(
      'input',
      event=>{
        root.clearTimeout(
          searchTimer
        );

        searchTimer=
          root.setTimeout(
            ()=>{
              commit(
                ()=>
                  catalog.setQuery(
                    event.currentTarget
                      ?.value
                  ),
                'replace'
              );
            },
            SEARCH_DELAY
          );
      }
    );

    const sort=
      document.querySelector(
        '[data-catalog-sort]'
      );

    sort?.addEventListener(
      'change',
      event=>{
        commit(
          ()=>
            catalog.setSort(
              event.currentTarget
                ?.value
            )
        );
      }
    );

    const filter=
      document.querySelector(
        '[data-catalog-filter-panel]'
      );

    document
      .querySelector(
        '[data-catalog-size-apply]'
      )
      ?.addEventListener(
        'click',
        ()=>{
          commit(
            ()=>
              catalog.setSizes(
                selectedSizeInputs()
              )
          );

          if(filter){
            filter.open=false;
          }
        }
      );

    document
      .querySelector(
        '[data-catalog-size-clear]'
      )
      ?.addEventListener(
        'click',
        ()=>{
          commit(
            ()=>
              catalog.setSizes([])
          );

          if(filter){
            filter.open=false;
          }
        }
      );

    document
      .querySelector(
        '[data-catalog-clear-filters]'
      )
      ?.addEventListener(
        'click',
        ()=>{
          commit(
            ()=>{
              catalog.setQuery('');
              catalog.setSizes([]);
              catalog.setSort(
                'featured'
              );
            }
          );
        }
      );

    document
      .querySelector(
        '[data-catalog-load-more]'
      )
      ?.addEventListener(
        'click',
        ()=>{
          commit(
            ()=>
              catalog.loadMore()
          );
        }
      );

    document
      .querySelector(
        '[data-home-language-select]'
      )
      ?.addEventListener(
        'change',
        event=>{
          applyLanguage(
            event.currentTarget
              ?.value
          );
        }
      );

    root.addEventListener(
      'popstate',
      ()=>{
        applyUrlState();
      }
    );

    root.addEventListener(
      'storage',
      event=>{
        if(
          event.key===
          state.storage
            .languageKey
        ){
          applyLanguage(
            event.newValue,
            {
              persist:false
            }
          );
          return;
        }

        if(
          event.key===
          state.storage
            .inquiryKey
        ){
          updateInquiryBadge();
        }
      }
    );

    root.addEventListener(
      'pageshow',
      ()=>{
        updateInquiryBadge();
      }
    );

    document.addEventListener(
      'visibilitychange',
      ()=>{
        if(
          document.visibilityState===
          'visible'
        ){
          updateInquiryBadge();
        }
      }
    );
  }

  function mount(){
    if(mounted){
      updateInquiryBadge();
      return true;
    }

    state=
      parseRuntimeState();

    catalog=
      root
        .DreamlandDesktopCatalogView;

    if(
      !state||
      !catalog
    ){
      return false;
    }

    currentLanguage=
      normalizeLanguage(
        readStorage(
          state.storage
            .languageKey
        ),
        state.defaultLanguage||
          'en',
        Object.keys(
          state.languages
        )
      );

    catalog.configure({
      products:
        state.products,
      seriesMeta:
        Object.fromEntries(
          state.scopeIds
            .filter(
              scope=>
                scope!=='all'
            )
            .map(
              scope=>[
                scope,
                {}
              ]
            )
        ),
      batchSize:
        state.batchSize,
      productName,
      productPriceValue:
        product=>
          Number(
            product?.priceValue
          )||
          0,
      productMoq:
        product=>
          Number(
            product?.moq
          )||
          1
    });

    bindEvents();

    applyLanguage(
      currentLanguage,
      {
        persist:true
      }
    );

    applyUrlState({
      canonicalize:true
    });

    mounted=true;

    return true;
  }

  root.DreamlandCatalogRuntime=
    Object.freeze({
      version:VERSION,
      id:RUNTIME_ID,
      normalizeLanguage,
      inquiryCount,
      urlState,
      mount,
      render,
      applyLanguage,
      applyUrlState,
      updateInquiryBadge
    });

  if(
    typeof document!==
    'undefined'
  ){
    if(
      document.readyState===
      'loading'
    ){
      document.addEventListener(
        'DOMContentLoaded',
        mount,
        {
          once:true
        }
      );
    }else{
      mount();
    }
  }
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

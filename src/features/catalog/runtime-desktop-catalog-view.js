(function(root){
  'use strict';

  if(root.DreamlandDesktopCatalogView){
    return;
  }

  const VERSION='B7-00B.3A';
  const ALL_SCOPE='all';
  const DEFAULT_BATCH_SIZE=24;
  const SORTS=Object.freeze([
    'featured',
    'name',
    'price-low',
    'price-high',
    'moq-low'
  ]);

  let configured=false;

  let config={
    products:[],
    seriesMeta:{},
    batchSize:DEFAULT_BATCH_SIZE,
    productName:
      product=>
        String(
          product?.name||
          product?.id||
          ''
        ),
    productPriceValue:
      ()=>0,
    productMoq:
      ()=>1
  };

  let state={
    scope:ALL_SCOPE,
    query:'',
    sort:'featured',
    sizes:[],
    visibleCount:DEFAULT_BATCH_SIZE,
    scrollY:0
  };

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function number(
    value,
    fallback=0
  ){
    const parsed=
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function positiveInteger(
    value,
    fallback
  ){
    const parsed=
      Math.trunc(
        number(value)
      );

    return parsed>0
      ? parsed
      : fallback;
  }

  function functionOr(
    value,
    fallback
  ){
    return typeof value==='function'
      ? value
      : fallback;
  }

  function plainObject(value){
    return Boolean(
      value&&
      typeof value==='object'&&
      !Array.isArray(value)
    );
  }

  function clone(value){
    if(value===undefined){
      return undefined;
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function deepFreeze(value){
    if(
      !value||
      typeof value!=='object'||
      Object.isFrozen(value)
    ){
      return value;
    }

    Object.freeze(value);

    Object.values(value)
      .forEach(deepFreeze);

    return value;
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

  function seriesIds(){
    const configuredIds=
      Object.keys(
        config.seriesMeta
      );

    if(configuredIds.length){
      return configuredIds;
    }

    return [
      ...new Set(
        config.products
          .map(
            product=>
              text(
                product?.series
              )
          )
          .filter(Boolean)
      )
    ];
  }

  function hasSeries(value){
    return seriesIds()
      .includes(
        text(value)
      );
  }

  function normalizeScope(value){
    const next=
      text(value);

    if(
      next===ALL_SCOPE||
      hasSeries(next)
    ){
      return next;
    }

    return ALL_SCOPE;
  }

  function normalizeSort(value){
    const next=
      text(value);

    return SORTS.includes(next)
      ? next
      : 'featured';
  }

  function normalizeSizes(values){
    const list=
      Array.isArray(values)
        ? values
        : [];

    return [
      ...new Set(
        list
          .map(
            value=>
              text(value)
                .toUpperCase()
          )
          .filter(Boolean)
      )
    ];
  }

  function resetBrowseFields(){
    state.query='';
    state.sort='featured';
    state.sizes=[];
    state.visibleCount=
      config.batchSize;
    state.scrollY=0;
  }

  function configure(
    {
      products=[],
      seriesMeta={},
      batchSize=DEFAULT_BATCH_SIZE,
      productName,
      productPriceValue,
      productMoq
    }={}
  ){
    config={
      products:
        Array.isArray(products)
          ? products
          : [],

      seriesMeta:
        plainObject(seriesMeta)
          ? seriesMeta
          : {},

      batchSize:
        positiveInteger(
          batchSize,
          DEFAULT_BATCH_SIZE
        ),

      productName:
        functionOr(
          productName,
          config.productName
        ),

      productPriceValue:
        functionOr(
          productPriceValue,
          config.productPriceValue
        ),

      productMoq:
        functionOr(
          productMoq,
          config.productMoq
        )
    };

    state={
      scope:ALL_SCOPE,
      query:'',
      sort:'featured',
      sizes:[],
      visibleCount:
        config.batchSize,
      scrollY:0
    };

    configured=true;

    return snapshot();
  }

  function ready(){
    return configured;
  }

  function setScope(
    scope,
    {
      resetBrowse=false
    }={}
  ){
    const next=
      normalizeScope(scope);

    if(resetBrowse){
      resetBrowseFields();
    }

    state.scope=next;
    state.visibleCount=
      config.batchSize;
    state.scrollY=0;

    return snapshot();
  }

  function reset({
    scope=ALL_SCOPE
  }={}){
    resetBrowseFields();
    state.scope=
      normalizeScope(scope);

    return snapshot();
  }

  function setQuery(value){
    state.query=
      text(value);

    state.visibleCount=
      config.batchSize;

    return snapshot();
  }

  function setSizes(values){
    state.sizes=
      normalizeSizes(values);

    state.visibleCount=
      config.batchSize;
    state.scrollY=0;

    return snapshot();
  }

  function setSort(value){
    state.sort=
      normalizeSort(value);

    state.visibleCount=
      config.batchSize;
    state.scrollY=0;

    return snapshot();
  }

  function loadMore(){
    state.visibleCount+=
      config.batchSize;

    return snapshot();
  }

  function setScrollY(value){
    state.scrollY=
      Math.max(
        0,
        number(
          value,
          0
        )
      );

    return snapshot();
  }

  function searchableText(product){
    const names=
      plainObject(
        product?.names
      )
        ? Object.values(
            product.names
          )
        : [];

    const tags=
      plainObject(
        product?.tags
      )
        ? Object.values(
            product.tags
          )
            .flatMap(
              value=>
                Array.isArray(value)
                  ? value
                  : [value]
            )
        : [];

    return [
      product?.id,
      product?.productId,
      product?.name,
      ...names,
      ...tags
    ]
      .map(text)
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
  }

  function supportsSelectedSize(
    product
  ){
    if(!state.sizes.length){
      return true;
    }

    const available=
      normalizeSizes(
        Array.isArray(
          product?.availableSizes
        )
          ? product.availableSizes
          : [
              product?.defaultSize||
              product?.size
            ]
      );

    return state.sizes
      .some(
        size=>
          available.includes(size)
      );
  }

  function featuredCompare(
    a,
    b
  ){
    const diff=
      (
        number(
          b?.listSort,
          number(
            b?.sortOrder,
            0
          )
        )
      )-
      (
        number(
          a?.listSort,
          number(
            a?.sortOrder,
            0
          )
        )
      );

    return (
      diff||
      text(a?.id)
        .localeCompare(
          text(b?.id)
        )
    );
  }

  function sortProducts(
    products
  ){
    const list=[
      ...products
    ];

    if(state.sort==='name'){
      return list.sort(
        (a,b)=>
          text(
            config.productName(a)
          )
            .localeCompare(
              text(
                config.productName(b)
              ),
              undefined,
              {
                numeric:true,
                sensitivity:'base'
              }
            )||
          featuredCompare(
            a,
            b
          )
      );
    }

    if(
      state.sort==='price-low'||
      state.sort==='price-high'
    ){
      const direction=
        state.sort==='price-high'
          ? -1
          : 1;

      return list.sort(
        (a,b)=>
          direction*(
            number(
              config.productPriceValue(a)
            )-
            number(
              config.productPriceValue(b)
            )
          )||
          featuredCompare(
            a,
            b
          )
      );
    }

    if(state.sort==='moq-low'){
      return list.sort(
        (a,b)=>
          (
            positiveInteger(
              config.productMoq(a),
              1
            )-
            positiveInteger(
              config.productMoq(b),
              1
            )
          )||
          featuredCompare(
            a,
            b
          )
      );
    }

    return list.sort(
      featuredCompare
    );
  }

  function buildViewModel(){
    const query=
      text(state.query)
        .toLocaleLowerCase();

    const active=
      config.products
        .filter(
          activeProduct
        );

    const seriesCounts={};

    seriesIds()
      .forEach(
        series=>{
          seriesCounts[series]=
            active.filter(
              product=>
                product?.series===
                series
            ).length;
        }
      );

    let filtered=
      active.filter(
        product=>
          state.scope===ALL_SCOPE||
          product?.series===
            state.scope
      );

    if(query){
      filtered=
        filtered.filter(
          product=>
            searchableText(
              product
            ).includes(query)
        );
    }

    filtered=
      filtered.filter(
        supportsSelectedSize
      );

    filtered=
      sortProducts(
        filtered
      );

    const totalCount=
      filtered.length;

    const renderedCount=
      Math.min(
        state.visibleCount,
        totalCount
      );

    const products=
      filtered
        .slice(
          0,
          renderedCount
        )
        .map(
          product=>
            deepFreeze({
              ...clone(product),
              desktopCatalogPriceValue:
                number(
                  config.productPriceValue(
                    product
                  )
                ),
              desktopCatalogMoq:
                positiveInteger(
                  config.productMoq(
                    product
                  ),
                  1
                )
            })
        );

    return Object.freeze({
      empty:
        totalCount===0,

      scope:
        state.scope,

      query:
        state.query,

      sort:
        state.sort,

      selectedSizes:
        Object.freeze([
          ...state.sizes
        ]),

      availableScopes:
        Object.freeze([
          ALL_SCOPE,
          ...seriesIds()
        ]),

      allCount:
        active.length,

      seriesCounts:
        deepFreeze(
          clone(
            seriesCounts
          )
        ),

      totalCount,

      renderedCount,

      visibleLimit:
        state.visibleCount,

      hasMore:
        renderedCount<
        totalCount,

      scrollY:
        state.scrollY,

      products:
        Object.freeze(
          products
        )
    });
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      configured,
      batchSize:
        config.batchSize,
      scope:
        state.scope,
      query:
        state.query,
      sort:
        state.sort,
      sizes:
        Object.freeze([
          ...state.sizes
        ]),
      visibleCount:
        state.visibleCount,
      scrollY:
        state.scrollY,
      productCount:
        config.products.length
    });
  }

  root.DreamlandDesktopCatalogView=
    Object.freeze({
      version:VERSION,
      allScope:ALL_SCOPE,
      sorts:SORTS,
      configure,
      ready,
      reset,
      setScope,
      setQuery,
      setSizes,
      setSort,
      loadMore,
      setScrollY,
      buildViewModel,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

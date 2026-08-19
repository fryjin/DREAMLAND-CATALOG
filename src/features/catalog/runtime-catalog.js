(function(root){
  'use strict';

  if(root.DreamlandCatalog){
    return;
  }

  const VERSION='B6-01';

  let configured=false;

  let config={
    products:[],
    seriesMeta:{},
    defaultSeries:''
  };

  let currentSeries='';

  function text(value){
    return String(
      value??
      ''
    ).trim();
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
      JSON.stringify(
        value
      )
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

  function seriesIds(){
    return Object.keys(
      config.seriesMeta
    );
  }

  function hasSeries(series){
    return Object.prototype
      .hasOwnProperty
      .call(
        config.seriesMeta,
        series
      );
  }

  function resolveSeries(
    requested=''
  ){
    const requestedId=
      text(requested);

    if(
      requestedId&&
      hasSeries(requestedId)
    ){
      return requestedId;
    }

    const defaultId=
      text(
        config.defaultSeries
      );

    if(
      defaultId&&
      hasSeries(defaultId)
    ){
      return defaultId;
    }

    return (
      seriesIds()[0]||
      'advanced'
    );
  }

  function configure(
    {
      products=[],
      seriesMeta={},
      defaultSeries=''
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

      defaultSeries:
        text(defaultSeries)
    };

    currentSeries=
      resolveSeries(
        config.defaultSeries
      );

    configured=true;

    return snapshot();
  }

  function ready(){
    return configured;
  }

  function activeSeries(){
    return currentSeries;
  }

  function setActiveSeries(
    series
  ){
    const next=
      text(series);

    if(
      next&&
      hasSeries(next)
    ){
      currentSeries=next;
    }

    return currentSeries;
  }

  function availableSeries(){
    return Object.freeze([
      ...seriesIds()
    ]);
  }

  function productSort(
    a,
    b
  ){
    const sortDiff=
      (
        Number(
          b?.listSort
        )||
        Number(
          b?.sortOrder
        )||
        0
      )-
      (
        Number(
          a?.listSort
        )||
        Number(
          a?.sortOrder
        )||
        0
      );

    return (
      sortDiff||
      String(
        a?.id??
        ''
      ).localeCompare(
        String(
          b?.id??
          ''
        )
      )
    );
  }

  function buildViewModel(){
    const products=
      config.products
        .filter(
          product=>
            product?.series===
            currentSeries
        )
        .slice()
        .sort(
          productSort
        )
        .map(
          product=>
            deepFreeze(
              clone(product)
            )
        );

    const series=
      deepFreeze(
        clone(
          config.seriesMeta[
            currentSeries
          ]||
          {}
        )
      );

    return Object.freeze({
      empty:
        products.length===0,

      activeSeries:
        currentSeries,

      availableSeries:
        availableSeries(),

      displayCount:
        products.length,

      series,

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
      activeSeries:
        currentSeries,
      defaultSeries:
        config.defaultSeries,
      availableSeries:
        availableSeries(),
      productCount:
        config.products.length
    });
  }

  root.DreamlandCatalog=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      activeSeries,
      setActiveSeries,
      availableSeries,
      buildViewModel
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

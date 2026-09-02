(function(root){
  'use strict';

  if(root.DreamlandPricingPolicy){
    return;
  }

  const VERSION='R4.2A';

  function finiteNumber(
    value,
    fallback=0
  ){
    const parsed=Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function tiersFor(
    seriesKey,
    seriesMeta={}
  ){
    const tiers=
      seriesMeta?.[seriesKey]
        ?.priceTiers;

    return Array.isArray(tiers)
      ? tiers
      : [];
  }

  function pricingSeriesFor(
    item,
    seriesMeta={}
  ){
    if(item?.series==='holiday'){
      return (
        item.scentSeries||
        seriesMeta?.holiday
          ?.scentSeriesOptions?.[0]||
        'classic'
      );
    }

    return item?.series||'';
  }

  function tierFor(
    seriesKey,
    quantity,
    seriesMeta={}
  ){
    const tiers=
      tiersFor(
        seriesKey,
        seriesMeta
      );

    return (
      tiers.find(tier=>{
        const min=
          Number(tier?.minQty)||0;

        const max=
          tier?.maxQty==null
            ? Infinity
            : Number(tier.maxQty);

        return (
          quantity>=min&&
          quantity<=max
        );
      })||
      tiers[tiers.length-1]||
      null
    );
  }

  function tierRangeLabel(tier){
    const min=
      Number(tier?.minQty)||1;

    const max=
      tier?.maxQty;

    if(max==null){
      return min+'+';
    }

    return min+'-'+max;
  }

  function currentTierIndex(
    seriesKey,
    quantity,
    seriesMeta={}
  ){
    const tiers=
      tiersFor(
        seriesKey,
        seriesMeta
      );

    return Math.max(
      0,
      tiers.findIndex(tier=>{
        const min=
          Number(tier?.minQty)||0;

        const max=
          tier?.maxQty==null
            ? Infinity
            : Number(tier.maxQty);

        return (
          quantity>=min&&
          quantity<=max
        );
      })
    );
  }

  function nextTierFor(
    seriesKey,
    quantity,
    seriesMeta={}
  ){
    return (
      tiersFor(
        seriesKey,
        seriesMeta
      )
        .find(
          tier=>
            Number(tier?.minQty)>
            quantity
        )||
      null
    );
  }

  function tierUnitCny(
    seriesKey,
    size,
    quantity,
    seriesMeta={}
  ){
    const tier=
      tierFor(
        seriesKey,
        quantity,
        seriesMeta
      );

    return Number(
      tier?.pricesCny?.[size]||
      0
    );
  }

  function packOptions(
    series,
    seriesMeta={}
  ){
    const options=
      seriesMeta?.[series]
        ?.packaging
        ?.options;

    return (
      Array.isArray(options)&&
      options.length
    )
      ? options
      : ['批发包装'];
  }

  function defaultPack(
    series,
    seriesMeta={}
  ){
    return (
      seriesMeta?.[series]
        ?.packaging
        ?.default||
      packOptions(
        series,
        seriesMeta
      )[0]||
      '批发包装'
    );
  }

  function packSurchargeCny(
    series,
    pack,
    seriesMeta={}
  ){
    return Number(
      seriesMeta?.[series]
        ?.packaging
        ?.surchargesCny?.[pack]||
      0
    );
  }

  function moqForSeriesSize(
    series,
    size,
    seriesMeta={}
  ){
    const value=
      Number(
        seriesMeta?.[series]
          ?.moqBySize?.[size]
      );

    return (
      Number.isInteger(value)&&
      value>0
    )
      ? value
      : 1;
  }

  function defaultProductSize(product){
    return product?.defaultSize||'S';
  }

  function productMoq(
    product,
    seriesMeta={}
  ){
    if(!product){
      return 1;
    }

    const configured=
      moqForSeriesSize(
        product.series,
        product.size,
        seriesMeta
      );

    if(configured>1){
      return configured;
    }

    const own=
      Number(product.moq);

    return (
      Number.isInteger(own)&&
      own>0
    )
      ? own
      : 1;
  }

  function currencyFor(
    language,
    currencyMap={}
  ){
    return (
      currencyMap?.[language]||
      currencyMap?.zh||
      currencyMap?.en||
      {
        locale:'en-US',
        prefix:'',
        rate:1,
        digits:2,
        unit:''
      }
    );
  }

  function cnyToBase(
    cny,
    currencyMap={}
  ){
    const cnyRate=
      Number(
        currencyMap?.zh
          ?.rate
      )||
      7.2;

    return Number(cny||0)/
      cnyRate;
  }

  function money(
    value,
    language,
    currencyMap={}
  ){
    const currency=
      currencyFor(
        language,
        currencyMap
      );

    const rate=
      finiteNumber(
        currency.rate,
        1
      );

    const digitsRaw=
      Number(currency.digits);

    const digits=
      Number.isInteger(digitsRaw)&&
      digitsRaw>=0
        ? digitsRaw
        : 2;

    const amount=
      Number(value||0)*
      rate;

    return (
      String(currency.prefix||'')+
      amount.toLocaleString(
        currency.locale||'en-US',
        {
          minimumFractionDigits:
            digits,
          maximumFractionDigits:
            digits
        }
      )
    );
  }

  function currencyUnit(
    language,
    currencyMap={}
  ){
    return String(
      currencyFor(
        language,
        currencyMap
      ).unit||
      ''
    );
  }

  function normalizeQuantity(
    value,
    min=1,
    max=1000000
  ){
    const minimum=
      finiteNumber(
        min,
        1
      );

    const maximum=
      Math.max(
        minimum,
        finiteNumber(
          max,
          1000000
        )
      );

    let quantity=
      Number(value);

    if(!Number.isFinite(quantity)){
      quantity=minimum;
    }

    quantity=
      Math.trunc(quantity);

    return Math.min(
      maximum,
      Math.max(
        minimum,
        quantity
      )
    );
  }

  function catalogUnit(
    product,
    seriesMeta={},
    currencyMap={}
  ){
    if(!product){
      return 0;
    }

    const pricingSeries=
      product.series==='holiday'
        ? (
            seriesMeta?.holiday
              ?.scentSeriesOptions?.[0]||
            'classic'
          )
        : product.series;

    const size=
      defaultProductSize(
        product
      );

    const quantity=
      moqForSeriesSize(
        product.series,
        size,
        seriesMeta
      );

    const priceCny=
      tierUnitCny(
        pricingSeries,
        size,
        quantity,
        seriesMeta
      );

    const packageCny=
      packSurchargeCny(
        product.series,
        defaultPack(
          product.series,
          seriesMeta
        ),
        seriesMeta
      );

    return cnyToBase(
      priceCny+
      packageCny,
      currencyMap
    );
  }

  root.DreamlandPricingPolicy=
    Object.freeze({
      version:VERSION,
      pricingSeriesFor,
      tiersFor,
      tierFor,
      tierRangeLabel,
      currentTierIndex,
      nextTierFor,
      tierUnitCny,
      packOptions,
      defaultPack,
      packSurchargeCny,
      moqForSeriesSize,
      defaultProductSize,
      productMoq,
      currencyFor,
      cnyToBase,
      money,
      currencyUnit,
      normalizeQuantity,
      catalogUnit
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

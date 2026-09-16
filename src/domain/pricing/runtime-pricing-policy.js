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

  /*
   * R4.11B4.1E-C1 — Commercial Pricing Intelligence Foundation
   *
   * This is a read-only commercial projection over the canonical pricing
   * policy. It does not create a second pricing engine.
   *
   * Important ownership rules:
   * - productSeries owns MOQ + packaging policy.
   * - pricingSeries owns the tier table.
   * - Holiday may delegate pricingSeries through selected scentSeries.
   * - displayed unit price always includes the selected package surcharge.
   */
  function commercialSnapshot(
    options={}
  ){
    const item=
      options.item||
      options.product||
      {};

    const seriesMeta=
      options.seriesMeta||
      {};

    const currencyMap=
      options.currencyMap||
      {};

    const language=
      String(
        options.language||
        'en'
      );

    const productSeries=
      String(
        item.series||
        options.series||
        ''
      ).trim();

    const scentSeries=
      String(
        options.scentSeries??
        item.scentSeries??
        ''
      ).trim();

    const pricingSeries=
      pricingSeriesFor(
        {
          ...item,
          series:productSeries,
          scentSeries
        },
        seriesMeta
      );

    const size=
      String(
        options.size||
        item.size||
        item.defaultSize||
        'S'
      )
        .trim()
        .toUpperCase();

    const quantity=
      normalizeQuantity(
        options.quantity??
        item.quantity??
        1,
        1,
        1000000
      );

    const fallbackPack=
      defaultPack(
        productSeries,
        seriesMeta
      );

    const pack=
      String(
        options.pack||
        item.pack||
        fallbackPack
      ).trim()||
      fallbackPack;

    const packageSurchargeCny=
      packSurchargeCny(
        productSeries,
        pack,
        seriesMeta
      );

    const moq=
      moqForSeriesSize(
        productSeries,
        size,
        seriesMeta
      );

    const sourceTiers=
      tiersFor(
        pricingSeries,
        seriesMeta
      );

    const selectedTier=
      tierFor(
        pricingSeries,
        quantity,
        seriesMeta
      );

    const selectedTierIndex=
      selectedTier
        ? sourceTiers.indexOf(
            selectedTier
          )
        : -1;

    function projectTier(
      tier,
      index
    ){
      const tierUnitPriceCny=
        Number(
          tier?.pricesCny?.[size]||
          0
        );

      const effectiveUnitCny=
        tierUnitPriceCny+
        packageSurchargeCny;

      const unitBase=
        cnyToBase(
          effectiveUnitCny,
          currencyMap
        );

      return Object.freeze({
        index,
        minQty:
          Number(tier?.minQty)||
          1,
        maxQty:
          tier?.maxQty==null
            ? null
            : Number(
                tier.maxQty
              ),
        rangeLabel:
          tierRangeLabel(
            tier
          ),
        tierUnitCny:
          tierUnitPriceCny,
        packageSurchargeCny,
        effectiveUnitCny,
        unitBase,
        displayUnitPrice:
          money(
            unitBase,
            language,
            currencyMap
          ),
        isCurrent:
          index===
          selectedTierIndex
      });
    }

    const tiers=
      Object.freeze(
        sourceTiers.map(
          projectTier
        )
      );

    const currentTier=
      selectedTierIndex>=0
        ? tiers[
            selectedTierIndex
          ]
        : null;

    const nextSourceTier=
      nextTierFor(
        pricingSeries,
        quantity,
        seriesMeta
      );

    const nextIndex=
      nextSourceTier
        ? sourceTiers.indexOf(
            nextSourceTier
          )
        : -1;

    const nextProjected=
      nextIndex>=0
        ? tiers[nextIndex]
        : null;

    const nextTier=
      nextProjected
        ? (()=>{
            const additionalQty=
              Math.max(
                0,
                nextProjected.minQty-
                quantity
              );

            const unitSavingCny=
              Math.max(
                0,
                Number(
                  currentTier
                    ?.effectiveUnitCny||
                  0
                )-
                nextProjected
                  .effectiveUnitCny
              );

            const unitSavingBase=
              cnyToBase(
                unitSavingCny,
                currencyMap
              );

            return Object.freeze({
              ...nextProjected,
              additionalQty,
              unitSavingCny,
              unitSavingBase,
              displayUnitSaving:
                money(
                  unitSavingBase,
                  language,
                  currencyMap
                ),
              hasUnitSaving:
                unitSavingCny>0
            });
          })()
        : null;

    return Object.freeze({
      schemaVersion:1,
      productSeries,
      pricingSeries,
      pricingMode:
        String(
          seriesMeta
            ?.[productSeries]
            ?.pricingMode||
          'series'
        ),
      size,
      quantity,
      pack,
      moq,
      meetsMoq:
        quantity>=moq,
      quantityToMoq:
        Math.max(
          0,
          moq-
          quantity
        ),
      packageSurchargeCny,
      currencyUnit:
        currencyUnit(
          language,
          currencyMap
        ),
      hasVolumeBreaks:
        tiers.length>1,
      currentTierIndex:
        selectedTierIndex,
      currentTier,
      nextTier,
      isBestAvailableTier:
        Boolean(
          currentTier&&
          !nextTier
        ),
      tiers
    });
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
      commercialSnapshot,
      catalogUnit
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

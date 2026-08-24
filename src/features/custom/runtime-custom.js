(function(root){
  'use strict';

  if(root.DreamlandCustom){
    return;
  }

  const VERSION='B6-05';
  const DEFAULT_SERIES_ORDER=[
    'classic',
    'advanced',
    'masterpiece'
  ];

  let config={
    scentsBySeries:null,
    seriesOrder:[
      ...DEFAULT_SERIES_ORDER
    ],
    defaultSeries:'classic',
    customMoq:null,
    maximumQuantity:null
  };

  let selectedSeries=
    config.defaultSeries;

  const selectedScentIds=
    new Set();

  function string(
    value
  ){
    return String(
      value??''
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

  function functionOr(
    value,
    fallback=null
  ){
    return typeof value==='function'
      ? value
      : fallback;
  }

  function normalizeSeriesOrder(
    value
  ){
    const source=
      Array.isArray(value)
        ? value
        : DEFAULT_SERIES_ORDER;

    const output=[];

    source.forEach(
      entry=>{
        const series=
          string(entry);

        if(
          series&&
          !output.includes(series)
        ){
          output.push(series);
        }
      }
    );

    return output.length
      ? output
      : [
          ...DEFAULT_SERIES_ORDER
        ];
  }

  function scentsMap(){
    return config.scentsBySeries
      instanceof Map
      ? config.scentsBySeries
      : null;
  }

  function ready(){
    return Boolean(
      scentsMap()&&
      typeof config.customMoq===
        'function'&&
      typeof config.maximumQuantity===
        'function'
    );
  }

  function customMinimum(){
    return Math.max(
      1,
      Math.trunc(
        number(
          config.customMoq?.(),
          1
        )
      )
    );
  }

  function quantityMaximum(){
    return Math.max(
      customMinimum(),
      Math.trunc(
        number(
          config.maximumQuantity?.(),
          customMinimum()
        )
      )
    );
  }

  function availableScents(
    series
  ){
    const map=
      scentsMap();

    if(!map){
      return [];
    }

    return (
      map.get(
        string(series)
      )||[]
    ).filter(
      scent=>{
        const chineseName=
          string(
            scent?.name?.zh
          );

        return (
          scent?.status!=='hidden'&&
          chineseName!=='无香'
        );
      }
    );
  }

  function availableSeries(){
    const withScents=
      config.seriesOrder.filter(
        series=>
          availableScents(
            series
          ).length>0
      );

    return withScents.length
      ? [
          ...withScents
        ]
      : [
          ...config.seriesOrder
        ];
  }

  function ensureSeries(){
    const options=
      availableSeries();

    if(
      !options.includes(
        selectedSeries
      )
    ){
      selectedSeries=
        options[0]||
        config.defaultSeries||
        config.seriesOrder[0]||
        'classic';

      selectedScentIds.clear();
    }

    return selectedSeries;
  }

  function configure(
    options={}
  ){
    if(
      options.scentsBySeries
      instanceof Map
    ){
      config.scentsBySeries=
        options.scentsBySeries;
    }

    if(
      options.seriesOrder
    ){
      config.seriesOrder=
        normalizeSeriesOrder(
          options.seriesOrder
        );
    }

    if(
      string(
        options.defaultSeries
      )
    ){
      config.defaultSeries=
        string(
          options.defaultSeries
        );
    }

    config.customMoq=
      functionOr(
        options.customMoq,
        config.customMoq
      );

    config.maximumQuantity=
      functionOr(
        options.maximumQuantity,
        config.maximumQuantity
      );

    if(
      !selectedSeries
    ){
      selectedSeries=
        config.defaultSeries;
    }

    ensureSeries();

    return snapshot();
  }

  function selectedSeriesValue(){
    return ensureSeries();
  }

  function selectedScents(){
    const selected=
      new Set(
        selectedScentIds
      );

    return availableScents(
      ensureSeries()
    ).filter(
      scent=>
        selected.has(
          scent?.id
        )
    );
  }

  function canonicalScentName(
    scent
  ){
    return (
      string(
        scent?.name?.zh
      )||
      string(
        scent?.name?.en
      )||
      string(
        scent?.id
      )
    );
  }

  function selection(){
    const scents=
      selectedScents();

    return Object.freeze({
      scentSeries:
        ensureSeries(),
      scentIds:
        Object.freeze(
          scents
            .map(
              scent=>
                string(
                  scent?.id
                )
            )
            .filter(Boolean)
        ),
      scents:
        Object.freeze(
          scents
            .map(
              canonicalScentName
            )
            .filter(Boolean)
        )
    });
  }

  function snapshot(){
    const current=
      selection();

    return Object.freeze({
      version:VERSION,
      ready:ready(),
      selectedSeries:
        current.scentSeries,
      selectedScentIds:
        current.scentIds,
      availableSeries:
        Object.freeze(
          availableSeries()
        ),
      minimumQuantity:
        customMinimum(),
      maximumQuantity:
        quantityMaximum()
    });
  }

  function reset(){
    selectedScentIds.clear();

    const options=
      availableSeries();

    selectedSeries=
      options.includes(
        config.defaultSeries
      )
        ? config.defaultSeries
        : (
            options[0]||
            config.defaultSeries||
            'classic'
          );

    return snapshot();
  }

  function setSeries(
    series
  ){
    const next=
      string(series);

    if(
      !config.seriesOrder.includes(
        next
      )
    ){
      return false;
    }

    if(
      selectedSeries===next
    ){
      ensureSeries();
      return true;
    }

    selectedSeries=next;
    selectedScentIds.clear();
    ensureSeries();

    return (
      selectedSeries===next
    );
  }

  function toggleScent(
    scentId
  ){
    const id=
      string(scentId);

    const valid=
      availableScents(
        ensureSeries()
      ).some(
        scent=>
          string(
            scent?.id
          )===id
      );

    if(!valid){
      return false;
    }

    if(
      selectedScentIds.has(id)
    ){
      selectedScentIds.delete(id);
    }else{
      selectedScentIds.add(id);
    }

    return true;
  }

  function normalizeDraft(
    draft={}
  ){
    return {
      use:
        string(
          draft.use
        ),
      qty:
        draft.qty,
      budget:
        string(
          draft.budget
        ),
      date:
        string(
          draft.date
        ),
      sizePref:
        string(
          draft.sizePref
        ),
      color:
        string(
          draft.color
        ),
      pack:
        string(
          draft.pack
        ),
      branding:
        string(
          draft.branding
        ),
      note:
        string(
          draft.note
        )
    };
  }

  function validateDraft(
    draft={}
  ){
    const values=
      normalizeDraft(
        draft
      );

    const errors=[];
    const minimum=
      customMinimum();
    const maximum=
      quantityMaximum();
    const quantity=
      Number(
        values.qty
      );

    if(!values.use){
      errors.push(
        'use'
      );
    }

    if(
      !Number.isInteger(quantity)
    ){
      errors.push(
        'quantity'
      );
    }else if(
      quantity<minimum
    ){
      errors.push(
        'quantity-min'
      );
    }else if(
      quantity>maximum
    ){
      errors.push(
        'quantity-max'
      );
    }

    if(
      selectedScents()
        .length<1
    ){
      errors.push(
        'scents'
      );
    }

    return Object.freeze({
      valid:
        errors.length===0,
      errors:
        Object.freeze([
          ...errors
        ]),
      minimumQuantity:
        minimum,
      maximumQuantity:
        maximum,
      quantity:
        Number.isInteger(
          quantity
        )
          ? quantity
          : null,
      values:
        Object.freeze({
          ...values
        }),
      selection:
        selection()
    });
  }

  function buildIntent(
    draft={},
    {
      id=''
    }={}
  ){
    const validation=
      validateDraft(
        draft
      );

    if(
      !validation.valid
    ){
      return null;
    }

    const chosen=
      validation.selection;

    return {
      id:
        string(id),
      type:'custom',
      use:
        validation.values.use,
      qty:
        validation.quantity,
      moq:
        validation.minimumQuantity,
      budget:
        validation.values.budget,
      date:
        validation.values.date,
      sizePref:
        validation.values.sizePref,
      scentSeries:
        chosen.scentSeries,
      scentIds:[
        ...chosen.scentIds
      ],
      scents:[
        ...chosen.scents
      ],
      scent:
        chosen.scents.join(
          ' / '
        ),
      color:
        validation.values.color,
      pack:
        validation.values.pack,
      branding:
        validation.values.branding,
      note:
        validation.values.note
    };
  }

  root.DreamlandCustom=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      reset,
      availableSeries,
      availableScents,
      selectedSeries:
        selectedSeriesValue,
      selectedScents,
      selection,
      setSeries,
      toggleScent,
      validateDraft,
      buildIntent
    });
})(
  typeof window!=='undefined'
    ? window
    : globalThis
);

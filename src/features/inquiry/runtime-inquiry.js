(function(root){
  'use strict';

  if(root.DreamlandInquiry){
    return;
  }

  const DEFAULT_VERSION=2;
  const DEFAULT_STORAGE_KEY=
    'productManualV2State';

  let config={
    storage:null,
    storageKey:
      DEFAULT_STORAGE_KEY,
    version:
      DEFAULT_VERSION,
    identityKey:null,
    normalizeQuantity:null,
    pricingSeriesFor:null,
    tierUnitCny:null,
    packSurchargeCny:null,
    convertCnyToBase:null
  };

  let state=
    emptyState(
      DEFAULT_VERSION
    );

  function emptyState(
    version
  ){
    return {
      version,
      items:[],
      contact:{}
    };
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

  function normalize(
    value,
    min=1
  ){
    if(
      typeof config.normalizeQuantity===
      'function'
    ){
      return config.normalizeQuantity(
        value,
        min
      );
    }

    const quantity=
      Math.trunc(
        number(
          value,
          min
        )
      );

    return Math.max(
      min,
      quantity
    );
  }

  function identity(
    item
  ){
    if(
      typeof config.identityKey===
      'function'
    ){
      return String(
        config.identityKey(
          item
        )||
        ''
      );
    }

    return [
      item?.type||'product',
      item?.productId||'',
      item?.series||'',
      item?.scentSeries||'',
      item?.size||'',
      item?.scentId||
        item?.scent||
        '',
      item?.pattern||'',
      item?.pack||''
    ].join('|');
  }

  function storageRef(){
    return config.storage;
  }

  function hydrate(){
    const storage=
      storageRef();

    let nextState=null;

    if(storage){
      try{
        nextState=
          JSON.parse(
            storage.getItem(
              config.storageKey
            )||
            'null'
          );
      }catch(_){
        nextState=null;
      }
    }

    if(
      !nextState||
      typeof nextState!=='object'||
      Array.isArray(
        nextState
      )||
      nextState.version!==
        config.version
    ){
      nextState=
        emptyState(
          config.version
        );
    }

    if(
      !Array.isArray(
        nextState.items
      )
    ){
      nextState.items=[];
    }

    if(
      !nextState.contact||
      typeof nextState.contact!==
        'object'||
      Array.isArray(
        nextState.contact
      )
    ){
      nextState.contact={};
    }

    state=
      nextState;

    return state;
  }

  function configure(
    {
      storage=null,
      storageKey=
        DEFAULT_STORAGE_KEY,
      version=
        DEFAULT_VERSION,
      identityKey=null,
      normalizeQuantity=null,
      pricingSeriesFor=null,
      tierUnitCny=null,
      packSurchargeCny=null,
      convertCnyToBase=null
    }={}
  ){
    config={
      storage:
        storage&&
        typeof storage.getItem===
          'function'&&
        typeof storage.setItem===
          'function'
          ? storage
          : null,
      storageKey:
        String(
          storageKey||
          DEFAULT_STORAGE_KEY
        ),
      version:
        number(
          version,
          DEFAULT_VERSION
        ),
      identityKey:
        typeof identityKey===
          'function'
          ? identityKey
          : null,
      normalizeQuantity:
        typeof normalizeQuantity===
          'function'
          ? normalizeQuantity
          : null,
      pricingSeriesFor:
        typeof pricingSeriesFor===
          'function'
          ? pricingSeriesFor
          : null,
      tierUnitCny:
        typeof tierUnitCny===
          'function'
          ? tierUnitCny
          : null,
      packSurchargeCny:
        typeof packSurchargeCny===
          'function'
          ? packSurchargeCny
          : null,
      convertCnyToBase:
        typeof convertCnyToBase===
          'function'
          ? convertCnyToBase
          : null
    };

    return hydrate();
  }

  function getState(){
    return state;
  }

  function items(){
    return state.items;
  }

  function snapshot(){
    return JSON.parse(
      JSON.stringify(
        state
      )
    );
  }

  function persist(){
    state.version=
      config.version;

    const persistedState={
      ...state,
      contact:{}
    };

    const storage=
      storageRef();

    if(storage){
      storage.setItem(
        config.storageKey,
        JSON.stringify(
          persistedState
        )
      );
    }

    return persistedState;
  }

  function findItem(
    id
  ){
    return (
      state.items.find(
        item=>
          item?.id===id
      )||
      null
    );
  }

  function addOrMergeProduct(
    item
  ){
    if(
      !item||
      item.type!=='product'
    ){
      return null;
    }

    const key=
      identity(
        item
      );

    const existing=
      state.items.find(
        row=>
          row?.type==='product'&&
          identity(row)===key
      );

    if(existing){
      existing.qty=
        normalize(
          (
            number(
              existing.qty,
              0
            )+
            number(
              item.qty,
              0
            )
          ),
          1
        );

      return existing;
    }

    state.items.push(
      item
    );

    return item;
  }

  function mergeDuplicateProducts(){
    const map=
      new Map();

    const merged=[];

    state.items.forEach(
      item=>{
        if(
          item?.type!==
          'product'
        ){
          merged.push(
            item
          );

          return;
        }

        const key=
          identity(
            item
          );

        const existing=
          map.get(
            key
          );

        if(existing){
          existing.qty=
            normalize(
              (
                number(
                  existing.qty,
                  0
                )+
                number(
                  item.qty,
                  0
                )
              ),
              1
            );

          return;
        }

        map.set(
          key,
          item
        );

        merged.push(
          item
        );
      }
    );

    state.items.splice(
      0,
      state.items.length,
      ...merged
    );

    return state.items;
  }

  function replaceItem(
    id,
    item
  ){
    const index=
      state.items.findIndex(
        row=>
          row?.id===id
      );

    if(index<0){
      return null;
    }

    state.items.splice(
      index,
      1,
      item
    );

    return item;
  }

  function setProductQuantity(
    id,
    value,
    min=1
  ){
    const item=
      findItem(
        id
      );

    if(
      !item||
      item.type!=='product'
    ){
      return null;
    }

    item.qty=
      normalize(
        value,
        min
      );

    return item;
  }

  function removeItem(
    id
  ){
    const index=
      state.items.findIndex(
        item=>
          item?.id===id
      );

    if(index<0){
      return null;
    }

    return state.items.splice(
      index,
      1
    )[0]||null;
  }

  function clearItems(){
    state.items.splice(
      0,
      state.items.length
    );

    return state.items;
  }

  function addCustom(
    item
  ){
    if(
      !item||
      item.type!=='custom'
    ){
      return null;
    }

    state.items.push(
      item
    );

    return item;
  }

  function pricingReady(){
    return Boolean(
      config.pricingSeriesFor&&
      config.tierUnitCny&&
      config.packSurchargeCny&&
      config.convertCnyToBase
    );
  }

  function pricingSeries(
    item
  ){
    if(
      typeof config.pricingSeriesFor===
      'function'
    ){
      return String(
        config.pricingSeriesFor(
          item
        )||
        ''
      );
    }

    return String(
      item?.series||
      ''
    );
  }

  function pricingGroupKey(
    item
  ){
    if(
      item?.series==='holiday'
    ){
      return (
        'holiday:'+
        pricingSeries(
          item
        )
      );
    }

    return String(
      item?.series||
      ''
    );
  }

  function seriesQuantity(
    series
  ){
    return state.items
      .filter(
        item=>
          item?.type===
            'product'&&
          item?.series===
            series
      )
      .reduce(
        (
          total,
          item
        )=>
          total+
          number(
            item?.qty,
            0
          ),
        0
      );
  }

  function pricingGroupQuantity(
    item
  ){
    const key=
      pricingGroupKey(
        item
      );

    return state.items
      .filter(
        row=>
          row?.type===
            'product'&&
          pricingGroupKey(
            row
          )===key
      )
      .reduce(
        (
          total,
          row
        )=>
          total+
          number(
            row?.qty,
            0
          ),
        0
      );
  }

  function itemUnit(
    item
  ){
    if(
      item?.type!==
      'product'
    ){
      return 0;
    }

    if(!pricingReady()){
      return 0;
    }

    const series=
      pricingSeries(
        item
      );

    const quantity=
      pricingGroupQuantity(
        item
      );

    const basePriceCny=
      number(
        config.tierUnitCny(
          series,
          item?.size,
          quantity
        ),
        0
      );

    const packageCny=
      number(
        config.packSurchargeCny(
          item?.series,
          item?.pack
        ),
        0
      );

    return number(
      config.convertCnyToBase(
        basePriceCny+
        packageCny
      ),
      0
    );
  }

  function itemSubtotal(
    item
  ){
    return item?.type===
      'product'
      ? number(
          item?.qty,
          0
        )*
        itemUnit(
          item
        )
      : 0;
  }

  function total(){
    return state.items.reduce(
      (
        sum,
        item
      )=>
        sum+
        itemSubtotal(
          item
        ),
      0
    );
  }

  function derivedSummary(){
    let productCount=0;
    let customCount=0;
    let productQuantity=0;

    state.items.forEach(
      item=>{
        if(
          item?.type===
          'product'
        ){
          productCount+=1;
          productQuantity+=
            number(
              item?.qty,
              0
            );
          return;
        }

        if(
          item?.type===
          'custom'
        ){
          customCount+=1;
        }
      }
    );

    return Object.freeze({
      itemCount:
        state.items.length,
      productCount,
      customCount,
      productQuantity,
      estimatedTotal:
        total()
    });
  }


  function buildItemView(
    item
  ){
    const base={
      ...item
    };

    if(
      item?.type!==
      'product'
    ){
      return Object.freeze({
        ...base,
        normalizedQty:
          number(
            item?.qty,
            0
          ),
        unitPrice:0,
        subtotal:0
      });
    }

    return Object.freeze({
      ...base,
      normalizedQty:
        normalize(
          item?.qty,
          1
        ),
      unitPrice:
        itemUnit(
          item
        ),
      subtotal:
        itemSubtotal(
          item
        )
    });
  }

  function buildViewModel(){
    const itemViews=
      state.items.map(
        buildItemView
      );

    const groupMap=
      new Map();

    itemViews.forEach(
      item=>{
        const key=
          item?.type===
            'custom'
            ? 'custom'
            : String(
                item?.series||
                ''
              );

        if(
          !groupMap.has(
            key
          )
        ){
          groupMap.set(
            key,
            {
              key,
              type:
                key==='custom'
                  ? 'custom'
                  : 'product',
              items:[]
            }
          );
        }

        groupMap
          .get(
            key
          )
          .items
          .push(
            item
          );
      }
    );

    const groups=
      [...groupMap.values()]
        .map(
          group=>
            Object.freeze({
              key:
                group.key,
              type:
                group.type,
              itemCount:
                group.items.length,
              quantity:
                group.type===
                  'product'
                  ? seriesQuantity(
                      group.key
                    )
                  : 0,
              items:
                Object.freeze([
                  ...group.items
                ])
            })
        );

    const summary=
      derivedSummary();

    return Object.freeze({
      empty:
        summary.itemCount===0,
      items:
        Object.freeze([
          ...itemViews
        ]),
      groups:
        Object.freeze(
          groups
        ),
      summary
    });
  }

  root.DreamlandInquiry=
    Object.freeze({
      version:'B5-03',
      configure,
      getState,
      items,
      snapshot,
      persist,
      findItem,
      addOrMergeProduct,
      mergeDuplicateProducts,
      replaceItem,
      setProductQuantity,
      removeItem,
      clearItems,
      addCustom,
      pricingReady,
      seriesQuantity,
      pricingGroupQuantity,
      itemUnit,
      itemSubtotal,
      total,
      derivedSummary,
      buildViewModel
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

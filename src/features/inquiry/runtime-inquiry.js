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
    convertCnyToBase:null,
    projectionText:null,
    projectionProductDisplayName:null,
    projectionSeriesLabel:null,
    projectionChoiceLabel:null,
    projectionQtyUnit:null,
    projectionItemMoq:null,
    projectionItemScentLabel:null,
    projectionDefaultPack:null,
    projectionMoney:null
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
      convertCnyToBase=null,
      projectionText=null,
      projectionProductDisplayName=null,
      projectionSeriesLabel=null,
      projectionChoiceLabel=null,
      projectionQtyUnit=null,
      projectionItemMoq=null,
      projectionItemScentLabel=null,
      projectionDefaultPack=null,
      projectionMoney=null
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
          : null,
      projectionText:
        typeof projectionText===
          'function'
          ? projectionText
          : null,
      projectionProductDisplayName:
        typeof projectionProductDisplayName===
          'function'
          ? projectionProductDisplayName
          : null,
      projectionSeriesLabel:
        typeof projectionSeriesLabel===
          'function'
          ? projectionSeriesLabel
          : null,
      projectionChoiceLabel:
        typeof projectionChoiceLabel===
          'function'
          ? projectionChoiceLabel
          : null,
      projectionQtyUnit:
        typeof projectionQtyUnit===
          'function'
          ? projectionQtyUnit
          : null,
      projectionItemMoq:
        typeof projectionItemMoq===
          'function'
          ? projectionItemMoq
          : null,
      projectionItemScentLabel:
        typeof projectionItemScentLabel===
          'function'
          ? projectionItemScentLabel
          : null,
      projectionDefaultPack:
        typeof projectionDefaultPack===
          'function'
          ? projectionDefaultPack
          : null,
      projectionMoney:
        typeof projectionMoney===
          'function'
          ? projectionMoney
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

  function productMoqGroups(
    itemMoq=()=>1
  ){
    const groups=
      new Map();

    state.items.forEach(
      item=>{
        if(
          item?.type!==
          'product'
        ){
          return;
        }

        const series=
          String(
            item?.series||
            ''
          );

        const size=
          String(
            item?.size||
            ''
          );

        const key=
          series+
          '|'+
          size;

        const moq=
          Math.max(
            1,
            Math.trunc(
              number(
                itemMoq(
                  item
                ),
                1
              )
            )
          );

        if(
          !groups.has(
            key
          )
        ){
          groups.set(
            key,
            {
              key,
              series,
              size,
              qty:0,
              moq
            }
          );
        }

        const group=
          groups.get(
            key
          );

        group.qty+=
          number(
            item?.qty,
            0
          );

        group.moq=
          Math.max(
            group.moq,
            moq
          );
      }
    );

    return [
      ...groups.values()
    ].map(
      group=>
        Object.freeze({
          ...group
        })
    );
  }

  function firstUnmetProductMoqGroup(
    itemMoq=()=>1
  ){
    return (
      productMoqGroups(
        itemMoq
      )
        .find(
          group=>
            group.qty<
            group.moq
        )||
      null
    );
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


  function projectionReady(){
    return Boolean(
      config.projectionText&&
      config.projectionProductDisplayName&&
      config.projectionSeriesLabel&&
      config.projectionChoiceLabel&&
      config.projectionQtyUnit&&
      config.projectionItemMoq&&
      config.projectionItemScentLabel&&
      config.projectionDefaultPack&&
      config.projectionMoney
    );
  }

  function projectionClone(
    value
  ){
    if(value===undefined){
      return undefined;
    }

    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }

  function projectionText(
    key
  ){
    return String(
      config.projectionText?.(
        key
      )??
      ''
    );
  }

  function projectionProductDisplayName(
    item
  ){
    return String(
      config.projectionProductDisplayName?.(
        item
      )??
      ''
    );
  }

  function projectionSeriesLabel(
    series
  ){
    return String(
      config.projectionSeriesLabel?.(
        series
      )??
      ''
    );
  }

  function projectionChoiceLabel(
    value
  ){
    return String(
      config.projectionChoiceLabel?.(
        value
      )??
      ''
    );
  }

  function projectionQtyUnit(){
    return String(
      config.projectionQtyUnit?.()??
      ''
    );
  }

  function projectionItemMoq(
    item
  ){
    return number(
      config.projectionItemMoq?.(
        item
      ),
      1
    );
  }

  function projectionItemScentLabel(
    item
  ){
    return String(
      config.projectionItemScentLabel?.(
        item
      )??
      ''
    );
  }

  function projectionDefaultPack(
    series
  ){
    return String(
      config.projectionDefaultPack?.(
        series
      )??
      ''
    );
  }

  function projectionMoney(
    value
  ){
    return String(
      config.projectionMoney?.(
        value
      )??
      ''
    );
  }

  function buildProductProjection(
    item
  ){
    const raw=
      projectionClone(
        item
      );

    const displayName=
      projectionProductDisplayName(
        item
      );

    const seriesDisplay=
      projectionSeriesLabel(
        item?.series
      )||
      String(
        item?.series||
        ''
      );

    const quantity=
      number(
        item?.qty,
        0
      );

    const quantityUnit=
      projectionQtyUnit();

    const scentDisplay=
      projectionItemScentLabel(
        item
      );

    const packValue=
      item?.pack||
      projectionDefaultPack(
        item?.series
      );

    const packDisplay=
      projectionChoiceLabel(
        packValue
      );

    const patternDisplay=
      projectionChoiceLabel(
        item?.pattern
      );

    const subtotal=
      itemSubtotal(
        item
      );

    const subtotalDisplay=
      projectionMoney(
        subtotal
      );

    const previewValue=
      `${quantity} ${quantityUnit} · MOQ ${projectionItemMoq(item)} · ${item?.size||''} · ${scentDisplay} · ${packDisplay} · ${subtotalDisplay}`;

    const summaryText=
      `${displayName}（${seriesDisplay} / ${item?.productId||''}） - ${quantity} ${quantityUnit}，${item?.size||''}，${scentDisplay}，${patternDisplay}，${packDisplay}，${projectionText('productEstimate')} ${subtotalDisplay}`;

    const snapshotItem=
      Object.freeze({
        type:
          item?.type||
          '',
        productId:
          item?.productId||
          '',
        name:
          displayName,
        qty:
          number(
            item?.qty,
            0
          ),
        size:
          item?.size||
          item?.sizePref||
          '',
        cover:
          item?.cover||
          ''
      });

    return Object.freeze({
      type:'product',
      raw:
        Object.freeze(
          raw
        ),
      previewKey:
        displayName,
      previewValue,
      summaryText,
      subtotal,
      subtotalDisplay,
      snapshotItem
    });
  }

  function buildCustomProjection(
    item
  ){
    const raw=
      projectionClone(
        item
      );

    const quantityUnit=
      projectionQtyUnit();

    const useDisplay=
      projectionChoiceLabel(
        item?.use
      );

    const sizeDisplay=
      projectionChoiceLabel(
        item?.sizePref
      );

    const scentDisplay=
      projectionItemScentLabel(
        item
      );

    const packDisplay=
      projectionChoiceLabel(
        item?.pack
      );

    const brandingDisplay=
      projectionChoiceLabel(
        item?.branding
      );

    const previewKey=
      useDisplay||
      projectionText(
        'customNeed'
      );

    const previewValue=
      `${item?.qty||projectionText('qtyPending')} ${quantityUnit} · ${item?.budget||projectionText('budgetPending')} · ${sizeDisplay||projectionText('sizeRecommend')} · ${scentDisplay||projectionText('scentRecommend')} · ${item?.color||projectionText('colorPending')} · ${packDisplay||projectionText('packRecommend')} · ${brandingDisplay||projectionText('brandingPending')} · ${item?.date||projectionText('datePending')}`;

    const summaryText=
      `${projectionText('customInquiry')} - ${useDisplay||projectionText('notFilled')}，${item?.qty||projectionText('qtyPending')} ${quantityUnit}，${item?.budget||projectionText('budgetPending')}，${sizeDisplay||projectionText('sizeRecommend')}，${scentDisplay||projectionText('scentRecommend')}，${item?.color||projectionText('colorPending')}，${packDisplay||projectionText('packRecommend')}，${brandingDisplay||projectionText('brandingPending')}，${item?.date||projectionText('datePending')}，${projectionText('note')}：${item?.note||projectionText('none')}`;

    const snapshotItem=
      Object.freeze({
        type:
          item?.type||
          '',
        productId:
          item?.productId||
          '',
        name:
          projectionProductDisplayName(
            item
          ),
        qty:
          number(
            item?.qty,
            0
          ),
        size:
          item?.size||
          item?.sizePref||
          '',
        cover:
          item?.cover||
          ''
      });

    return Object.freeze({
      type:'custom',
      raw:
        Object.freeze(
          raw
        ),
      previewKey,
      previewValue,
      summaryText,
      subtotal:0,
      subtotalDisplay:
        projectionMoney(
          0
        ),
      snapshotItem
    });
  }

  function buildProjection(
    {
      contact={},
      inquiryId='',
      submittedAt='',
      language='',
      privacyVersion=''
    }={}
  ){
    if(!projectionReady()){
      throw new Error(
        'DreamlandInquiry projection adapters are not configured.'
      );
    }

    const contactSnapshot=
      Object.freeze(
        projectionClone(
          (
            contact&&
            typeof contact==='object'&&
            !Array.isArray(contact)
          )
            ? contact
            : {}
        )
      );

    const itemProjections=
      state.items.map(
        item=>
          item?.type==='custom'
            ? buildCustomProjection(
                item
              )
            : buildProductProjection(
                item
              )
      );

    const products=
      itemProjections.filter(
        item=>
          item.type==='product'
      );

    const customs=
      itemProjections.filter(
        item=>
          item.type==='custom'
      );

    const rawProductItems=
      products.map(
        item=>
          item.raw
      );

    const rawCustomItems=
      customs.map(
        item=>
          item.raw
      );

    const snapshotItems=
      itemProjections.map(
        item=>
          item.snapshotItem
      );

    const estimatedTotal=
      total();

    return Object.freeze({
      inquiryId:
        String(
          inquiryId||
          ''
        ),
      submittedAt:
        String(
          submittedAt||
          ''
        ),
      language:
        String(
          language||
          ''
        ),
      privacyVersion:
        String(
          privacyVersion||
          ''
        ),
      contact:
        contactSnapshot,
      items:
        Object.freeze([
          ...itemProjections
        ]),
      products:
        Object.freeze([
          ...products
        ]),
      customs:
        Object.freeze([
          ...customs
        ]),
      rawProductItems:
        Object.freeze([
          ...rawProductItems
        ]),
      rawCustomItems:
        Object.freeze([
          ...rawCustomItems
        ]),
      snapshotItems:
        Object.freeze([
          ...snapshotItems
        ]),
      itemCount:
        itemProjections.length,
      productCount:
        products.length,
      customCount:
        customs.length,
      /*
       * B6 Exit keeps each item human-readable in transport/email output.
       */
      itemsSummary:
        itemProjections
          .map(
            item=>
              item.summaryText
          )
          .join('\n'),
      estimatedTotal,
      estimatedTotalDisplay:
        projectionMoney(
          estimatedTotal
        )
    });
  }

  root.DreamlandInquiry=
    Object.freeze({
      version:'B5-05',
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
      productMoqGroups,
      firstUnmetProductMoqGroup,
      pricingReady,
      seriesQuantity,
      pricingGroupQuantity,
      itemUnit,
      itemSubtotal,
      total,
      derivedSummary,
      buildViewModel,
      projectionReady,
      buildProjection
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

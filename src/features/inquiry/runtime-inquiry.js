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
    normalizeQuantity:null
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
      normalizeQuantity=null
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

  root.DreamlandInquiry=
    Object.freeze({
      version:'B5-01',
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
      addCustom
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

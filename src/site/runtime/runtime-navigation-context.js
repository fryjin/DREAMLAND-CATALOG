(function(root){
  'use strict';

  if(root.DreamlandNavigationContext){
    return;
  }

  const VERSION='B7-00B.4J-R1';
  const STORAGE_KEY='dreamlandNavigationContextV1';
  const MAX_AGE_MS=2*60*60*1000;

  let storage=null;

  function text(value){
    return String(value??'').trim();
  }

  function now(){
    return Date.now();
  }

  function configure(options={}){
    storage=options.storage||root.sessionStorage||null;
    return snapshot();
  }

  function valid(value){
    if(!value||typeof value!=='object'){
      return false;
    }

    const createdAt=Number(value.createdAt)||0;
    return createdAt>0&&now()-createdAt<=MAX_AGE_MS;
  }

  function read(){
    try{
      const raw=storage?.getItem?.(STORAGE_KEY);
      if(!raw){
        return null;
      }

      const parsed=JSON.parse(raw);
      if(!valid(parsed)){
        clear();
        return null;
      }

      return Object.freeze({...parsed});
    }catch(_){
      return null;
    }
  }

  function write(value={}){
    const next={
      mode:text(value.mode),
      itemId:text(value.itemId),
      productId:text(value.productId).toUpperCase(),
      returnTo:text(value.returnTo)||'/',
      createdAt:now()
    };

    try{
      storage?.setItem?.(
        STORAGE_KEY,
        JSON.stringify(next)
      );
    }catch(_){
      return null;
    }

    return Object.freeze(next);
  }

  function setEditInquiryItem(
    itemId,
    productId,
    returnTo='/inquiry/'
  ){
    return write({
      mode:'edit-inquiry-item',
      itemId,
      productId,
      returnTo
    });
  }

  function clear(){
    try{
      storage?.removeItem?.(STORAGE_KEY);
    }catch(_){}
  }

  function consume(expectedMode=''){
    const value=read();

    if(
      !value||
      (expectedMode&&value.mode!==expectedMode)
    ){
      return null;
    }

    clear();
    return value;
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      storageKey:STORAGE_KEY,
      maxAgeMs:MAX_AGE_MS,
      value:read()
    });
  }

  root.DreamlandNavigationContext=Object.freeze({
    version:VERSION,
    configure,
    read,
    write,
    setEditInquiryItem,
    consume,
    clear,
    snapshot
  });
})(typeof globalThis!=='undefined'?globalThis:this);

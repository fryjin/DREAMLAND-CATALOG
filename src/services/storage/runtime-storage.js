(function(root){
  'use strict';

  if(root.DreamlandStorage){
    return;
  }

  function nativeStorage(name){
    try{
      const storage=root?.[name];

      if(
        storage&&
        typeof storage.getItem==='function'&&
        typeof storage.setItem==='function'&&
        typeof storage.removeItem==='function'
      ){
        return storage;
      }
    }catch(_){}

    return null;
  }

  function safeStorage(name){
    const native=nativeStorage(name);
    const fallbackValues=new Map();
    const fallbackRemoved=new Set();

    function normalizedKey(key){
      return String(key);
    }

    function getItem(key){
      const normalized=normalizedKey(key);

      if(fallbackRemoved.has(normalized)){
        return null;
      }

      if(fallbackValues.has(normalized)){
        return fallbackValues.get(normalized);
      }

      if(native){
        try{
          return native.getItem(normalized);
        }catch(_){}
      }

      return null;
    }

    function setItem(key,value){
      const normalized=normalizedKey(key);
      const stringValue=String(value);

      if(native){
        try{
          native.setItem(normalized,stringValue);
          fallbackValues.delete(normalized);
          fallbackRemoved.delete(normalized);
          return;
        }catch(_){}
      }

      fallbackRemoved.delete(normalized);
      fallbackValues.set(normalized,stringValue);
    }

    function removeItem(key){
      const normalized=normalizedKey(key);

      if(native){
        try{
          native.removeItem(normalized);
          fallbackValues.delete(normalized);
          fallbackRemoved.delete(normalized);
          return;
        }catch(_){}
      }

      fallbackValues.delete(normalized);
      fallbackRemoved.add(normalized);
    }

    return Object.freeze({
      getItem,
      setItem,
      removeItem
    });
  }

  root.DreamlandStorage=Object.freeze({
    version:'B2-02',
    local:safeStorage('localStorage'),
    session:safeStorage('sessionStorage')
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

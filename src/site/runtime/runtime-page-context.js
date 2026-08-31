(function(root){
  'use strict';

  if(root.DreamlandPageContext){
    return;
  }

  const VERSION='B7-00B.4J-R1';
  let config=null;
  let current=null;

  function text(value){
    return String(value??'').trim();
  }

  function bodyDataset(){
    return config?.documentRef?.body?.dataset||{};
  }

  function locationValue(){
    const location=config?.locationRef||{};
    return (text(location.pathname)||'/')+text(location.search);
  }

  function derive(){
    const route=config?.route;
    const resolved=route?.resolve?.(locationValue())||{
      matched:false,
      page:'notFound',
      pathname:'/',
      productId:'',
      query:{}
    };

    const dataset=bodyDataset();
    const declaredPage=text(dataset.dreamlandPage);
    const declaredProductId=text(dataset.productId);

    const page=declaredPage||resolved.page||'notFound';
    const productId=declaredProductId||resolved.productId||'';
    const definition=route?.definition?.(page)||null;

    return Object.freeze({
      version:VERSION,
      page,
      productId,
      pathname:resolved.pathname||'/',
      query:Object.freeze({...resolved.query}),
      guard:text(definition?.guard||resolved.guard),
      public:Boolean(definition?.public??resolved.public),
      matched:Boolean(resolved.matched||declaredPage)
    });
  }

  function configure(options={}){
    config={
      route:options.route||root.DreamlandRoute||null,
      locationRef:options.locationRef||root.location||{pathname:'/',search:''},
      documentRef:options.documentRef||root.document||null
    };
    current=derive();
    return current;
  }

  function refresh(){
    if(!config){
      return null;
    }
    current=derive();
    return current;
  }

  function snapshot(){
    return current||Object.freeze({
      version:VERSION,
      page:'notFound',
      productId:'',
      pathname:'/',
      query:Object.freeze({}),
      guard:'',
      public:true,
      matched:false
    });
  }

  root.DreamlandPageContext=Object.freeze({
    version:VERSION,
    configure,
    refresh,
    snapshot
  });
})(typeof globalThis!=='undefined'?globalThis:this);

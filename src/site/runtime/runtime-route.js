(function(root){
  'use strict';

  if(root.DreamlandRoute){
    return;
  }

  const VERSION='B7-00B.4J-R1';
  let contract=null;

  function text(value){
    return String(value??'').trim();
  }

  function normalizePath(pathname){
    let value=text(pathname)||'/';
    try{
      value=decodeURI(value);
    }catch(_){}
    if(!value.startsWith('/')){
      value='/'+value;
    }
    value=value.replace(/\/{2,}/g,'/');
    if(value!=='/'&&!value.endsWith('/')){
      value+='/';
    }
    return value;
  }

  function normalizeProductId(value){
    const productId=text(value).toUpperCase();
    if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(productId)){
      throw new Error('Invalid DREAMLAND product id.');
    }
    return productId;
  }

  function configure(nextContract){
    if(!nextContract||typeof nextContract!=='object'||!nextContract.routes){
      throw new Error('DreamlandRoute requires a page route contract.');
    }
    contract=nextContract;
    return snapshot();
  }

  function ready(){
    return Boolean(contract?.routes);
  }

  function definition(name){
    return contract?.routes?.[name]||null;
  }

  function queryString(query={}){
    const params=new URLSearchParams();
    for(const [key,raw] of Object.entries(query||{})){
      if(raw==null||raw===''){
        continue;
      }
      const values=Array.isArray(raw)?raw:[raw];
      for(const value of values){
        const normalized=text(value);
        if(normalized){
          params.append(key,normalized);
        }
      }
    }
    const value=params.toString();
    return value?'?'+value:'';
  }

  function build(name,params={},query={}){
    const row=definition(name);
    if(!row){
      throw new Error('Unknown DREAMLAND route: '+name);
    }

    let pathname=text(row.path);
    if(row.dynamic==='productId'){
      pathname=pathname.replace(
        '{productId}',
        encodeURIComponent(normalizeProductId(params.productId))
      );
    }

    if(/\{[^}]+\}/.test(pathname)){
      throw new Error('Missing route parameter for '+name+'.');
    }

    return normalizePath(pathname)+queryString(query);
  }

  function home(){ return build('home'); }
  function catalog(query={}){ return build('catalog',{},query); }
  function product(productId,query={}){ return build('product',{productId},query); }
  function custom(){ return build('custom'); }
  function inquiry(){ return build('inquiry'); }
  function contact(){ return build('contact'); }
  function review(){ return build('review'); }
  function success(){ return build('success'); }
  function privacy(){ return build('privacy'); }

  function resolve(input){
    if(!ready()){
      return Object.freeze({
        matched:false,
        page:'notFound',
        pathname:'/',
        productId:'',
        query:Object.freeze({})
      });
    }

    let parsed;
    try{
      parsed=new URL(text(input)||'/','https://dreamland.local');
    }catch(_){
      parsed=new URL('/','https://dreamland.local');
    }

    const pathname=normalizePath(parsed.pathname);
    const query={};

    for(const [key,value] of parsed.searchParams.entries()){
      if(Object.prototype.hasOwnProperty.call(query,key)){
        query[key]=Array.isArray(query[key])
          ? [...query[key],value]
          : [query[key],value];
      }else{
        query[key]=value;
      }
    }

    for(const [name,row] of Object.entries(contract.routes)){
      if(row.dynamic==='productId'){
        const prefix=normalizePath(row.path.split('{productId}')[0]);
        if(pathname.startsWith(prefix)){
          const remainder=pathname.slice(prefix.length).replace(/\/$/,'');
          if(remainder&&!remainder.includes('/')){
            try{
              const productId=normalizeProductId(decodeURIComponent(remainder));
              return Object.freeze({
                matched:true,
                page:name,
                pathname,
                productId,
                guard:text(row.guard),
                public:Boolean(row.public),
                query:Object.freeze(query)
              });
            }catch(_){
              continue;
            }
          }
        }
        continue;
      }

      if(normalizePath(row.path)===pathname){
        return Object.freeze({
          matched:true,
          page:name,
          pathname,
          productId:'',
          guard:text(row.guard),
          public:Boolean(row.public),
          query:Object.freeze(query)
        });
      }
    }

    return Object.freeze({
      matched:false,
      page:'notFound',
      pathname,
      productId:'',
      guard:'',
      public:true,
      query:Object.freeze(query)
    });
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      configured:ready(),
      basePath:text(contract?.basePath)||'/',
      localePrefix:Object.freeze({
        enabled:Boolean(contract?.localePrefix?.enabled),
        supported:Object.freeze(
          Array.isArray(contract?.localePrefix?.supported)
            ? [...contract.localePrefix.supported]
            : []
        )
      }),
      routeNames:Object.freeze(Object.keys(contract?.routes||{}))
    });
  }

  root.DreamlandRoute=Object.freeze({
    version:VERSION,
    configure,
    ready,
    definition,
    normalizePath,
    normalizeProductId,
    build,
    home,
    catalog,
    product,
    custom,
    inquiry,
    contact,
    review,
    success,
    privacy,
    resolve,
    snapshot
  });
})(typeof globalThis!=='undefined'?globalThis:this);

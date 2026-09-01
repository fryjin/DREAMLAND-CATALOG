(function(root){
  'use strict';

  if(root.DreamlandCatalogUrlState){
    return;
  }

  const VERSION='B7-00B.4J-R2';
  const VALID_SORTS=new Set([
    'featured',
    'name',
    'price-low',
    'price-high',
    'moq-low'
  ]);

  let config=null;
  let mounted=false;
  let popstateHandler=null;
  let pollTimer=null;
  let previousSignature='';
  let pendingTimer=null;

  function text(value){
    return String(value??'').trim();
  }

  function uniqueSizes(values){
    return [
      ...new Set(
        (Array.isArray(values)?values:[])
          .map(
            value=>
              text(value)
                .toUpperCase()
          )
          .filter(
            value=>
              ['S','M','L','XL']
                .includes(value)
          )
      )
    ];
  }

  function parse(input){
    let url;

    try{
      url=new URL(
        text(input)||'/products/',
        'https://dreamland.local'
      );
    }catch(_){
      url=new URL(
        '/products/',
        'https://dreamland.local'
      );
    }

    const params=url.searchParams;

    const scope=
      text(
        params.get('series')
      )||
      'all';

    const query=
      text(
        params.get('q')
      );

    const sizes=
      uniqueSizes(
        params.getAll('size')
      );

    const rawSort=
      text(
        params.get('sort')
      );

    const sort=
      VALID_SORTS.has(rawSort)
        ? rawSort
        : 'featured';

    return Object.freeze({
      scope,
      query,
      sizes:Object.freeze(sizes),
      sort
    });
  }

  function fromView(view={}){
    return Object.freeze({
      scope:
        text(view.scope)||'all',
      query:
        text(view.query),
      sizes:Object.freeze(
        uniqueSizes(
          view.sizes||
          view.selectedSizes||
          []
        )
      ),
      sort:
        VALID_SORTS.has(
          text(view.sort)
        )
          ? text(view.sort)
          : 'featured'
    });
  }

  function queryObject(state){
    const value=
      fromView(state);

    const query={};

    if(
      value.scope&&
      value.scope!=='all'
    ){
      query.series=value.scope;
    }

    if(value.query){
      query.q=value.query;
    }

    if(value.sizes.length){
      query.size=[
        ...value.sizes
      ];
    }

    if(value.sort!=='featured'){
      query.sort=value.sort;
    }

    return query;
  }

  function href(state){
    const route=
      config?.route||
      root.DreamlandRoute;

    if(!route?.ready?.()){
      return '/products/';
    }

    return route.catalog(
      queryObject(state)
    );
  }

  function signature(state){
    const value=
      fromView(state);

    return JSON.stringify({
      scope:value.scope,
      query:value.query,
      sizes:[...value.sizes],
      sort:value.sort
    });
  }

  function desktopView(){
    return (
      config?.desktopView||
      root.DreamlandDesktopCatalogView||
      null
    );
  }

  function desktopPresentation(){
    return (
      config?.desktopPresentation||
      root.DreamlandDesktopCatalog||
      null
    );
  }

  function hydrateDesktop(state){
    const view=desktopView();

    if(!view?.ready?.()){
      return false;
    }

    view.reset({
      scope:
        state.scope||
        'all'
    });

    if(state.query){
      view.setQuery(
        state.query
      );
    }

    if(state.sizes?.length){
      view.setSizes(
        [...state.sizes]
      );
    }

    if(
      state.sort&&
      state.sort!=='featured'
    ){
      view.setSort(
        state.sort
      );
    }

    desktopPresentation()
      ?.refresh?.();

    return true;
  }

  function hydrateMobile(state){
    if(
      typeof config
        ?.setMobileSeries!==
      'function'
    ){
      return false;
    }

    config.setMobileSeries(
      state.scope||
      'all'
    );

    return true;
  }

  function readLocation(){
    const locationRef=
      config?.locationRef||
      root.location||
      {};

    return parse(
      (
        text(locationRef.pathname)||
        '/products/'
      )+
      text(locationRef.search)
    );
  }

  function writeHistory(
    state,
    {
      mode='push'
    }={}
  ){
    const historyRef=
      config?.historyRef||
      root.history;

    const url=href(state);

    if(mode==='replace'){
      historyRef?.replaceState?.(
        {
          dreamlandCatalog:
            fromView(state)
        },
        '',
        url
      );
    }else{
      historyRef?.pushState?.(
        {
          dreamlandCatalog:
            fromView(state)
        },
        '',
        url
      );
    }

    previousSignature=
      signature(state);

    return url;
  }

  function stateFromDesktop(){
    const view=desktopView();

    if(!view?.ready?.()){
      return null;
    }

    return fromView(
      view.snapshot()
    );
  }

  function scheduleSync(
    state,
    previous
  ){
    if(pendingTimer){
      root.clearTimeout(
        pendingTimer
      );
    }

    const queryChanged=
      previous&&
      previous.query!==state.query;

    pendingTimer=
      root.setTimeout(
        ()=>{
          pendingTimer=null;

          writeHistory(
            state,
            {
              mode:
                queryChanged
                  ? 'replace'
                  : 'push'
            }
          );
        },
        queryChanged
          ? 360
          : 20
      );
  }

  function poll(){
    if(
      root.DREAMLAND_MPA_ACTIVE!==true||
      root.DREAMLAND_PUBLIC_ROUTE_ENTRY
        ?.page!=='catalog'
    ){
      return;
    }

    const state=
      stateFromDesktop();

    if(!state){
      return;
    }

    const next=
      signature(state);

    if(next===previousSignature){
      return;
    }

    let previous=null;

    try{
      previous=
        previousSignature
          ? JSON.parse(
              previousSignature
            )
          : null;
    }catch(_){}

    scheduleSync(
      state,
      previous
    );
  }

  function syncMobileSeries(series){
    if(
      root.DREAMLAND_MPA_ACTIVE!==true||
      root.DREAMLAND_PUBLIC_ROUTE_ENTRY
        ?.page!=='catalog'
    ){
      return false;
    }

    const current=
      readLocation();

    const state={
      ...current,
      scope:
        text(series)||
        'all'
    };

    writeHistory(
      state,
      {
        mode:'push'
      }
    );

    return true;
  }

  function onPopState(){
    const state=
      readLocation();

    previousSignature=
      signature(state);

    hydrateDesktop(state);
    hydrateMobile(state);
  }

  function mount(options={}){
    config={
      route:
        options.route||
        root.DreamlandRoute||
        null,

      desktopView:
        options.desktopView||
        root.DreamlandDesktopCatalogView||
        null,

      desktopPresentation:
        options.desktopPresentation||
        root.DreamlandDesktopCatalog||
        null,

      setMobileSeries:
        options.setMobileSeries,

      historyRef:
        options.historyRef||
        root.history||
        null,

      locationRef:
        options.locationRef||
        root.location||
        null
    };

    const state=
      readLocation();

    previousSignature=
      signature(state);

    hydrateDesktop(state);
    hydrateMobile(state);

    if(
      mounted||
      root.DREAMLAND_MPA_ACTIVE!==true||
      root.DREAMLAND_PUBLIC_ROUTE_ENTRY
        ?.page!=='catalog'
    ){
      return snapshot();
    }

    popstateHandler=
      ()=>onPopState();

    root.addEventListener?.(
      'popstate',
      popstateHandler
    );

    pollTimer=
      root.setInterval(
        poll,
        180
      );

    mounted=true;

    return snapshot();
  }

  function unmount(){
    if(popstateHandler){
      root.removeEventListener?.(
        'popstate',
        popstateHandler
      );
    }

    if(pollTimer){
      root.clearInterval(
        pollTimer
      );
    }

    if(pendingTimer){
      root.clearTimeout(
        pendingTimer
      );
    }

    popstateHandler=null;
    pollTimer=null;
    pendingTimer=null;
    mounted=false;
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      mounted,
      state:
        readLocation()
    });
  }

  root.DreamlandCatalogUrlState=
    Object.freeze({
      version:VERSION,
      parse,
      fromView,
      queryObject,
      href,
      mount,
      unmount,
      syncMobileSeries,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

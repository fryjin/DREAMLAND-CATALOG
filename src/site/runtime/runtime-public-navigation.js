(function(root){
  'use strict';

  if(root.DreamlandPublicNavigation){
    return;
  }

  const VERSION='B7-00B.4J-R2';
  let config=null;

  function text(value){
    return String(value??'').trim();
  }

  function currentEntry(){
    return root.DREAMLAND_PUBLIC_ROUTE_ENTRY||{
      page:'home',
      productId:'',
      pathname:'/'
    };
  }

  function currentLocation(){
    const locationRef=config?.locationRef||root.location||{};
    return (
      text(locationRef.pathname)||'/'
    )+(
      text(locationRef.search)
    );
  }

  function route(){
    return config?.route||root.DreamlandRoute||null;
  }

  function navigationContext(){
    return (
      config?.navigationContext||
      root.DreamlandNavigationContext||
      null
    );
  }

  function catalogQueryFromDesktopView(){
    const view=
      root.DreamlandDesktopCatalogView
        ?.snapshot?.()||
      null;

    if(!view){
      return {};
    }

    const query={};

    if(
      view.scope&&
      view.scope!=='all'
    ){
      query.series=view.scope;
    }

    if(text(view.query)){
      query.q=text(view.query);
    }

    if(
      Array.isArray(view.sizes)&&
      view.sizes.length
    ){
      query.size=[...view.sizes];
    }

    if(
      view.sort&&
      view.sort!=='featured'
    ){
      query.sort=view.sort;
    }

    return query;
  }

  function href(screen,options={}){
    const router=route();

    if(!router?.ready?.()){
      return '';
    }

    const key=text(screen);

    if(key==='home'){
      return router.home();
    }

    if(key==='catalog'){
      const query=
        options.query||
        (
          options.preserveCatalogState
            ? catalogQueryFromDesktopView()
            : {}
        );

      return router.catalog(query);
    }

    if(key==='custom'){
      return router.custom();
    }

    if(key==='inquiry'){
      return router.inquiry();
    }

    if(key==='contact'){
      return router.contact();
    }

    if(
      key==='preview'||
      key==='review'
    ){
      return router.review();
    }

    if(key==='success'){
      return router.success();
    }

    if(key==='privacy'){
      return router.privacy();
    }

    return '';
  }

  function productHref(productId){
    const router=route();

    if(!router?.ready?.()){
      return '';
    }

    try{
      return router.product(productId);
    }catch(_){
      return '';
    }
  }

  function assign(url,replace=false){
    const value=text(url);

    if(!value){
      return false;
    }

    const locationRef=
      config?.locationRef||
      root.location;

    if(replace){
      locationRef?.replace?.(value);
    }else{
      locationRef?.assign?.(value);
    }

    return true;
  }

  function navigateScreen(
    screen,
    options={}
  ){
    if(
      root.DREAMLAND_MPA_ACTIVE!==true||
      root.__DREAMLAND_ROUTE_INITIALIZING===true
    ){
      return false;
    }

    const key=text(screen);
    let target='';

    if(key==='detail'){
      const productId=
        text(options.productId);

      if(!productId){
        return false;
      }

      target=productHref(productId);
    }else if(key==='catalog'){
      const entry=currentEntry();
      const preserve=
        options.preserveCatalogState===true||
        entry.page==='catalog';

      target=href(
        'catalog',
        {
          query:options.query,
          preserveCatalogState:preserve
        }
      );
    }else{
      target=href(key,options);
    }

    return assign(
      target,
      options.replace===true
    );
  }

  function openProduct(
    productId,
    {
      returnTo='',
      replace=false
    }={}
  ){
    if(
      root.DREAMLAND_MPA_ACTIVE!==true||
      root.__DREAMLAND_ROUTE_INITIALIZING===true
    ){
      return false;
    }

    const id=text(productId);

    if(!id){
      return false;
    }

    const context=
      navigationContext();

    context?.write?.({
      mode:'browse-product',
      productId:id,
      returnTo:
        text(returnTo)||
        currentLocation()
    });

    return assign(
      productHref(id),
      replace
    );
  }

  function editInquiryItem(
    itemId,
    productId,
    returnTo='/inquiry/'
  ){
    if(
      root.DREAMLAND_MPA_ACTIVE!==true||
      root.__DREAMLAND_ROUTE_INITIALIZING===true
    ){
      return false;
    }

    const context=
      navigationContext();

    context?.setEditInquiryItem?.(
      itemId,
      productId,
      returnTo
    );

    return assign(
      productHref(productId)
    );
  }

  function productBackHref(){
    const context=
      navigationContext()
        ?.read?.()||
      null;

    if(
      context&&
      ['browse-product','edit-inquiry-item']
        .includes(context.mode)&&
      text(context.returnTo)
    ){
      return text(context.returnTo);
    }

    return href('catalog');
  }

  function productBack(){
    if(
      root.DREAMLAND_MPA_ACTIVE!==true||
      root.__DREAMLAND_ROUTE_INITIALIZING===true
    ){
      return false;
    }

    return assign(
      productBackHref()
    );
  }

  function configure(options={}){
    config={
      route:
        options.route||
        root.DreamlandRoute||
        null,

      navigationContext:
        options.navigationContext||
        root.DreamlandNavigationContext||
        null,

      locationRef:
        options.locationRef||
        root.location||
        null
    };

    return snapshot();
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      active:
        root.DREAMLAND_MPA_ACTIVE===true,
      entry:Object.freeze({
        ...currentEntry()
      }),
      currentLocation:
        currentLocation()
    });
  }

  root.DreamlandPublicNavigation=
    Object.freeze({
      version:VERSION,
      configure,
      href,
      productHref,
      navigateScreen,
      openProduct,
      editInquiryItem,
      productBackHref,
      productBack,
      snapshot
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

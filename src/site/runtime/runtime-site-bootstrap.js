(function(root){
  'use strict';

  if(root.DreamlandSiteBootstrap){
    return;
  }

  const VERSION='B7-00B.4J-R1';
  const ROUTE_CONTRACT_URL='/data/page-routes.json';

  let contract=null;
  let mounted=false;
  let deviceUnmount=null;

  function text(value){
    return String(value??'').trim();
  }

  async function loadContract(){
    if(contract){
      return contract;
    }

    const response=await root.fetch(
      ROUTE_CONTRACT_URL,
      {cache:'no-store'}
    );

    if(!response.ok){
      throw new Error(
        'Unable to load DREAMLAND page route contract.'
      );
    }

    contract=await response.json();
    return contract;
  }

  function applyDeviceProfile(profile){
    const body=root.document?.body;

    if(!body||!profile){
      return;
    }

    body.dataset.deviceFamily=text(profile.family);
    body.dataset.presentation=text(profile.presentation);
    body.dataset.input=text(profile.input);
    body.dataset.hover=profile.hover?'true':'false';
    body.dataset.touchOptimized=
      profile.touchOptimized?'true':'false';
  }

  function applyPageContext(context){
    const body=root.document?.body;

    if(!body||!context){
      return;
    }

    body.dataset.dreamlandPage=
      text(context.page)||'notFound';

    if(context.productId){
      body.dataset.productId=text(context.productId);
    }
  }

  async function mount(options={}){
    if(mounted){
      return snapshot();
    }

    const route=options.route||root.DreamlandRoute;
    const pageContext=options.pageContext||root.DreamlandPageContext;
    const deviceProfile=options.deviceProfile||root.DreamlandDeviceProfile;
    const navigationContext=
      options.navigationContext||root.DreamlandNavigationContext;

    if(!route||!pageContext||!deviceProfile||!navigationContext){
      throw new Error(
        'DREAMLAND site foundation runtimes must load before Site Bootstrap.'
      );
    }

    route.configure(
      options.contract||
      await loadContract()
    );

    const page=pageContext.configure({
      route,
      locationRef:options.locationRef||root.location,
      documentRef:options.documentRef||root.document
    });

    navigationContext.configure({
      storage:options.sessionStorage||root.sessionStorage
    });

    const profile=deviceProfile.configure({
      windowRef:options.windowRef||root,
      navigatorRef:options.navigatorRef||root.navigator,
      storageRef:options.localStorage||root.localStorage
    });

    applyPageContext(page);
    applyDeviceProfile(profile);

    deviceUnmount=deviceProfile.mount(
      next=>applyDeviceProfile(next)
    );

    mounted=true;

    root.document
      ?.documentElement
      ?.setAttribute(
        'data-dreamland-site-foundation',
        VERSION
      );

    root.dispatchEvent?.(
      new CustomEvent(
        'dreamland:site-foundation-ready',
        {
          detail:{
            version:VERSION,
            page,
            device:profile
          }
        }
      )
    );

    return snapshot();
  }

  function unmount(){
    if(typeof deviceUnmount==='function'){
      deviceUnmount();
    }

    deviceUnmount=null;
    mounted=false;
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      mounted,
      route:root.DreamlandRoute?.snapshot?.()||null,
      page:root.DreamlandPageContext?.snapshot?.()||null,
      device:root.DreamlandDeviceProfile?.snapshot?.()||null,
      navigation:root.DreamlandNavigationContext?.snapshot?.()||null
    });
  }

  root.DreamlandSiteBootstrap=Object.freeze({
    version:VERSION,
    routeContractUrl:ROUTE_CONTRACT_URL,
    mount,
    unmount,
    snapshot
  });
})(typeof globalThis!=='undefined'?globalThis:this);

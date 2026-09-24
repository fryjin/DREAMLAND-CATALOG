(function(root){
  'use strict';

  if(root.DreamlandDeviceProfile){
    return;
  }

  const VERSION='B7-00B.4J-R1';
  const DESKTOP_MIN=1024;
  const OVERRIDE_KEY='dreamlandPresentationOverride';

  let config=null;
  let current=null;
  let mounted=false;
  let onChange=null;
  let resizeHandler=null;
  let mediaHandlers=[];

  function text(value){
    return String(value??'').trim();
  }

  function normalizeOverride(value){
    const next=text(value).toLowerCase();
    return next==='mobile'||next==='desktop'
      ? next
      : 'auto';
  }

  function classifySignals(signals={}){
    const ua=text(signals.userAgent);
    const platform=text(signals.platform);
    const width=Math.max(0,Number(signals.viewportWidth)||0);
    const height=Math.max(0,Number(signals.viewportHeight)||0);
    const touchPoints=Math.max(0,Number(signals.maxTouchPoints)||0);
    const coarsePointer=Boolean(signals.coarsePointer);
    const hover=Boolean(signals.hover);
    const uaMobile=Boolean(signals.uaMobile);
    const override=normalizeOverride(signals.presentationOverride);

    const appleTablet=
      /iPad/i.test(ua)||
      (/Mac/i.test(platform)&&touchPoints>1);

    const androidTablet=
      /Android/i.test(ua)&&!/Mobile/i.test(ua);

    const genericTablet=
      /Tablet|PlayBook|Silk/i.test(ua);

    const phone=
      uaMobile||
      /iPhone|iPod/i.test(ua)||
      (/Android/i.test(ua)&&/Mobile/i.test(ua))||
      /Windows Phone/i.test(ua);

    const tablet=
      !phone&&(appleTablet||androidTablet||genericTablet);

    const family=phone?'phone':tablet?'tablet':'desktop';

    let presentation;
    if(override!=='auto'){
      presentation=override;
    }else if(family==='phone'){
      presentation='mobile';
    }else if(width<DESKTOP_MIN){
      presentation='mobile';
    }else{
      presentation='desktop';
    }

    const input=
      coarsePointer||
      touchPoints>0||
      family==='phone'||
      family==='tablet'
        ? 'touch'
        : 'pointer';

    return Object.freeze({
      version:VERSION,
      family,
      presentation,
      input,
      hover,
      coarsePointer,
      touchPoints,
      viewportWidth:width,
      viewportHeight:height,
      presentationOverride:override,
      touchOptimized:presentation==='desktop'&&input==='touch'
    });
  }

  function media(query){
    return config?.windowRef?.matchMedia?.(query)||{
      matches:false,
      addEventListener(){},
      removeEventListener(){}
    };
  }

  function overrideValue(){
    try{
      return normalizeOverride(
        config?.storageRef?.getItem?.(config.overrideKey)
      );
    }catch(_){
      return 'auto';
    }
  }

  function detectSignals(){
    const win=config?.windowRef||{};
    const nav=config?.navigatorRef||{};

    return {
      userAgent:text(nav.userAgent),
      platform:text(nav.platform),
      uaMobile:Boolean(nav.userAgentData?.mobile),
      maxTouchPoints:Number(nav.maxTouchPoints)||0,
      viewportWidth:Number(win.innerWidth)||0,
      viewportHeight:Number(win.innerHeight)||0,
      coarsePointer:Boolean(media('(pointer: coarse)').matches),
      hover:Boolean(media('(hover: hover)').matches),
      presentationOverride:overrideValue()
    };
  }

  function refresh(){
    if(!config){
      return null;
    }

    const previous=current;
    current=classifySignals(detectSignals());

    if(
      onChange&&
      (
        !previous||
        JSON.stringify(previous)!==JSON.stringify(current)
      )
    ){
      onChange(current,previous);
    }

    return current;
  }

  function configure(options={}){
    config={
      windowRef:options.windowRef||root,
      navigatorRef:options.navigatorRef||root.navigator||{},
      storageRef:options.storageRef||root.localStorage||null,
      overrideKey:text(options.overrideKey)||OVERRIDE_KEY
    };

    current=classifySignals(detectSignals());
    return current;
  }

  function setPresentationOverride(value){
    const next=normalizeOverride(value);

    try{
      if(next==='auto'){
        config?.storageRef?.removeItem?.(config.overrideKey);
      }else{
        config?.storageRef?.setItem?.(config.overrideKey,next);
      }
    }catch(_){}

    return refresh();
  }

  function mount(callback){
    if(!config){
      configure();
    }

    onChange=typeof callback==='function'?callback:null;

    if(mounted){
      refresh();
      return unmount;
    }

    mounted=true;
    resizeHandler=()=>refresh();

    config.windowRef?.addEventListener?.(
      'resize',
      resizeHandler,
      {passive:true}
    );

    for(const query of ['(pointer: coarse)','(hover: hover)']){
      const target=media(query);
      const handler=()=>refresh();

      target.addEventListener?.('change',handler);
      mediaHandlers.push({target,handler});
    }

    refresh();
    return unmount;
  }

  function unmount(){
    if(!mounted){
      return;
    }

    config?.windowRef?.removeEventListener?.('resize',resizeHandler);

    for(const {target,handler} of mediaHandlers){
      target.removeEventListener?.('change',handler);
    }

    mediaHandlers=[];
    resizeHandler=null;
    mounted=false;
    onChange=null;
  }

  function snapshot(){
    return current||classifySignals({});
  }

  root.DreamlandDeviceProfile=Object.freeze({
    version:VERSION,
    desktopMin:DESKTOP_MIN,
    configure,
    classifySignals,
    refresh,
    mount,
    unmount,
    setPresentationOverride,
    snapshot
  });
})(typeof globalThis!=='undefined'?globalThis:this);

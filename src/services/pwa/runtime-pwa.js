(function(root){
  'use strict';

  if(root.DreamlandPwa){
    return;
  }

  const PWA_INSTALL_DISMISSED_KEY=
    'dreamlandPwaInstallDismissedAt';

  const PWA_UPDATE_SESSION_KEY=
    'dreamlandPwaUpdateDeferred';

  const RELEASE_TAG=
    'b7-00b4b-r4.2.6-v111';

  const PWA_COPY=Object.freeze({
    zh:Object.freeze({
      offline:'当前处于离线模式。已浏览内容可继续使用，联网后可提交意向。',
      online:'网络已恢复。',
      offlineSubmit:'当前离线，意向资料已保存在本机，请联网后再提交。',
      updateTitle:'发现新版本',
      updateCopy:'更新后可获得最新页面、数据和图片缓存策略。',
      updateNow:'立即更新',
      updating:'正在更新',
      installTitle:'安装 DREAMLAND',
      installCopy:'添加到桌面，下次可更快打开产品手册。',
      installNow:'安装',
      installGuide:'查看步骤',
      installed:'已安装',
      later:'稍后',
      iosTitle:'添加到主屏幕',
      iosCopy:'iPhone和iPad需要通过浏览器分享菜单安装。',
      iosSteps:Object.freeze([
        '点击浏览器底部或顶部的“分享”按钮。',
        '选择“添加到主屏幕”。',
        '确认名称后点击“添加”。'
      ]),
      wechatTitle:'请在系统浏览器中安装',
      wechatCopy:'微信内置浏览器不能直接安装PWA，请先在Safari或Chrome中打开。',
      wechatIosSteps:Object.freeze([
        '点击微信右上角“…”菜单。',
        '选择“在Safari中打开”；如无该选项，可复制链接后粘贴到Safari。',
        '在Safari中点击“分享”→“添加到主屏幕”。'
      ]),
      wechatAndroidSteps:Object.freeze([
        '点击微信右上角“…”菜单。',
        '选择“在浏览器打开”；如无该选项，可复制链接后粘贴到Chrome。',
        '在Chrome菜单中选择“安装应用”或“添加到主屏幕”。'
      ]),
      genericSteps:Object.freeze([
        '打开浏览器菜单。',
        '选择“安装应用”或“添加到主屏幕”。',
        '按照浏览器提示完成安装。'
      ]),
      copyLink:'复制链接',
      copied:'已复制',
      manualInstallTitle:'浏览器菜单安装',
      manualInstallCopy:'浏览器暂未提供快捷安装按钮，可从浏览器菜单安装到桌面。',
      manualInstallAction:'查看安装方法',
      done:'知道了'
    }),
    en:Object.freeze({
      offline:'You are offline. Previously viewed content remains available; submit after reconnecting.',
      online:'Connection restored.',
      offlineSubmit:'You are offline. Your inquiry is saved on this device; submit after reconnecting.',
      updateTitle:'A new version is available',
      updateCopy:'Update for the latest pages, data, and image-cache behavior.',
      updateNow:'Update now',
      updating:'Updating',
      installTitle:'Install DREAMLAND',
      installCopy:'Add it to your home screen for faster access.',
      installNow:'Install',
      installGuide:'View steps',
      installed:'Installed',
      later:'Later',
      iosTitle:'Add to Home Screen',
      iosCopy:'On iPhone and iPad, install through the browser Share menu.',
      iosSteps:Object.freeze([
        'Tap the Share button in the browser.',
        'Choose “Add to Home Screen”.',
        'Confirm the name and tap “Add”.'
      ]),
      wechatTitle:'Open in your system browser',
      wechatCopy:'The WeChat browser cannot install the PWA directly. Open it in Safari or Chrome first.',
      wechatIosSteps:Object.freeze([
        'Tap the “…” menu in WeChat.',
        'Choose “Open in Safari”, or copy the link into Safari.',
        'In Safari, tap Share → Add to Home Screen.'
      ]),
      wechatAndroidSteps:Object.freeze([
        'Tap the “…” menu in WeChat.',
        'Choose “Open in browser”, or copy the link into Chrome.',
        'In Chrome, choose Install app or Add to Home screen.'
      ]),
      genericSteps:Object.freeze([
        'Open the browser menu.',
        'Choose Install app or Add to Home screen.',
        'Follow the browser instructions.'
      ]),
      copyLink:'Copy link',
      copied:'Copied',
      manualInstallTitle:'Install from the browser menu',
      manualInstallCopy:'A quick install button is not available yet. Install from the browser menu instead.',
      manualInstallAction:'View install steps',
      done:'Done'
    }),
    ko:Object.freeze({
      offline:'현재 오프라인 상태입니다. 이전에 본 내용은 계속 이용할 수 있으며, 연결 후 문의를 제출할 수 있습니다.',
      online:'네트워크가 복구되었습니다.',
      offlineSubmit:'현재 오프라인입니다. 문의 내용은 기기에 저장되어 있으니 연결 후 제출해 주세요.',
      updateTitle:'새 버전이 있습니다',
      updateCopy:'최신 페이지, 데이터, 이미지 캐시 방식으로 업데이트합니다.',
      updateNow:'지금 업데이트',
      updating:'업데이트 중',
      installTitle:'DREAMLAND 설치',
      installCopy:'홈 화면에 추가하면 제품 카탈로그를 더 빠르게 열 수 있습니다.',
      installNow:'설치',
      installGuide:'설치 방법',
      installed:'설치됨',
      later:'나중에',
      iosTitle:'홈 화면에 추가',
      iosCopy:'iPhone과 iPad에서는 브라우저 공유 메뉴를 통해 설치합니다.',
      iosSteps:Object.freeze([
        '브라우저의 공유 버튼을 누릅니다.',
        '“홈 화면에 추가”를 선택합니다.',
        '이름을 확인한 뒤 “추가”를 누릅니다.'
      ]),
      wechatTitle:'기본 브라우저에서 열어 주세요',
      wechatCopy:'WeChat 내장 브라우저에서는 바로 설치할 수 없습니다. Safari 또는 Chrome에서 열어 주세요.',
      wechatIosSteps:Object.freeze([
        'WeChat 오른쪽 위 “…” 메뉴를 누릅니다.',
        '“Safari에서 열기”를 선택하거나 링크를 복사해 Safari에 붙여 넣습니다.',
        'Safari에서 공유 → 홈 화면에 추가를 선택합니다.'
      ]),
      wechatAndroidSteps:Object.freeze([
        'WeChat 오른쪽 위 “…” 메뉴를 누릅니다.',
        '“브라우저에서 열기”를 선택하거나 링크를 복사해 Chrome에 붙여 넣습니다.',
        'Chrome 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택합니다.'
      ]),
      genericSteps:Object.freeze([
        '브라우저 메뉴를 엽니다.',
        '앱 설치 또는 홈 화면에 추가를 선택합니다.',
        '브라우저 안내에 따라 설치합니다.'
      ]),
      copyLink:'링크 복사',
      copied:'복사됨',
      manualInstallTitle:'브라우저 메뉴에서 설치',
      manualInstallCopy:'빠른 설치 버튼을 사용할 수 없습니다. 브라우저 메뉴에서 홈 화면에 설치해 주세요.',
      manualInstallAction:'설치 방법 보기',
      done:'확인'
    })
  });

  let adapter={
    storage:null,
    getLanguage:null,
    getConfig:null,
    getActiveScreen:null,
    getConnectivityEndpoint:null
  };

  let deferredInstallPrompt=null;
  let pwaRegistration=null;
  let pwaActionType='';
  let pwaInitialized=false;
  let pwaReloading=false;
  let pwaNetworkWasOffline=false;
  let pwaUpdateCheckAt=0;
  let pwaInstallFallbackTimer=null;

  let connectivityProbePromise=null;
  let connectivityCheckedAt=0;
  let connectivityLastResult=null;

  function configure(options={}){
    adapter={
      ...adapter,
      ...options
    };

    return api;
  }

  function storage(){
    return adapter.storage||
      root.DreamlandStorage||
      null;
  }

  function localStorageBridge(){
    return storage()?.local;
  }

  function sessionStorageBridge(){
    return storage()?.session;
  }

  function safeCall(fn,fallback){
    if(typeof fn!=='function'){
      return fallback;
    }

    try{
      const value=fn();
      return value??fallback;
    }catch(_){
      return fallback;
    }
  }

  function language(){
    return safeCall(
      adapter.getLanguage,
      localStorageBridge()?.getItem(
        'productManualLang'
      )||'zh'
    );
  }

  function pwaConfig(){
    const value=safeCall(
      adapter.getConfig,
      {}
    );

    return value&&
      typeof value==='object'
      ? value
      : {};
  }

  function activeScreen(){
    return safeCall(
      adapter.getActiveScreen,
      ''
    );
  }

  function connectivityEndpoint(){
    return String(
      safeCall(
        adapter.getConnectivityEndpoint,
        './api/submit'
      )||
      './api/submit'
    );
  }

  function text(key){
    const lang=language();

    return (
      PWA_COPY[lang]?.[key]??
      PWA_COPY.zh[key]??
      key
    );
  }

  function connectivityProbeTimeoutMs(){
    return Math.max(
      1500,
      Number(
        pwaConfig().connectivityProbeTimeoutMs||
        4500
      )
    );
  }

  function connectivityProbeCacheMs(){
    return Math.max(
      0,
      Number(
        pwaConfig().connectivityProbeCacheMs||
        12000
      )
    );
  }

  function connectivityProbeUrl(){
    const endpoint=
      connectivityEndpoint();

    return endpoint+
      (
        endpoint.includes('?')
          ? '&'
          : '?'
      )+
      'connectivity_check='+
      Date.now();
  }

  async function probeReachability(force=false){
    if(root.navigator?.onLine===false){
      connectivityLastResult=false;
      connectivityCheckedAt=Date.now();
      return false;
    }

    const now=Date.now();

    if(
      !force&&
      connectivityLastResult!==null&&
      now-connectivityCheckedAt<
        connectivityProbeCacheMs()
    ){
      return connectivityLastResult;
    }

    if(connectivityProbePromise){
      return connectivityProbePromise;
    }

    const controller=
      new root.AbortController();

    const timeout=
      root.setTimeout(
        ()=>controller.abort(),
        connectivityProbeTimeoutMs()
      );

    connectivityProbePromise=
      root.fetch(
        connectivityProbeUrl(),
        {
          method:'GET',
          mode:'no-cors',
          cache:'no-store',
          credentials:'omit',
          redirect:'follow',
          signal:controller.signal
        }
      )
        .then(()=>true)
        .catch(()=>false)
        .then(result=>{
          connectivityLastResult=result;
          connectivityCheckedAt=Date.now();
          return result;
        })
        .finally(()=>{
          root.clearTimeout(timeout);
          connectivityProbePromise=null;
        });

    return connectivityProbePromise;
  }

  function hideNetworkBanner(){
    root.document
      ?.getElementById(
        'pwaNetworkBanner'
      )
      ?.setAttribute(
        'hidden',
        ''
      );
  }

  function setNetworkBanner(
    message,
    persistent=false
  ){
    const banner=
      root.document?.getElementById(
        'pwaNetworkBanner'
      );

    const copy=
      root.document?.getElementById(
        'pwaNetworkText'
      );

    if(!banner||!copy){
      return;
    }

    copy.textContent=message;
    banner.removeAttribute('hidden');

    if(!persistent){
      root.setTimeout(
        ()=>{
          if(
            root.navigator?.onLine!==
            false
          ){
            hideNetworkBanner();
          }
        },
        2200
      );
    }
  }

  function applyReachability(
    online,
    announceRecovery=true
  ){
    if(!online){
      pwaNetworkWasOffline=true;
      setNetworkBanner(
        text('offline'),
        true
      );
      return;
    }

    const wasOffline=
      pwaNetworkWasOffline;

    pwaNetworkWasOffline=false;

    if(
      wasOffline&&
      announceRecovery
    ){
      setNetworkBanner(
        text('online'),
        false
      );

      pwaRegistration
        ?.update?.()
        .catch(()=>{});
    }else{
      hideNetworkBanner();
    }
  }

  async function updateNetworkState(){
    if(
      root.navigator?.onLine===
      false
    ){
      applyReachability(
        false,
        false
      );

      return false;
    }

    const reachable=
      await probeReachability(true);

    applyReachability(
      reachable,
      true
    );

    return reachable;
  }

  function isStandalone(){
    return Boolean(
      root.matchMedia
        ?.('(display-mode: standalone)')
        .matches||
      root.navigator?.standalone===true
    );
  }

  function isIosDevice(){
    return (
      /iPad|iPhone|iPod/.test(
        root.navigator?.userAgent||''
      )||
      (
        root.navigator?.platform===
          'MacIntel'&&
        Number(
          root.navigator?.maxTouchPoints||
          0
        )>1
      )
    );
  }

  function isWechatBrowser(){
    return /MicroMessenger/i.test(
      root.navigator?.userAgent||''
    );
  }

  function installDismissMs(){
    return Number(
      pwaConfig().installDismissDays||
      7
    )*86400000;
  }

  function installWasDismissed(){
    const value=Number(
      localStorageBridge()
        ?.getItem(
          PWA_INSTALL_DISMISSED_KEY
        )||
      0
    );

    return (
      value>0&&
      Date.now()-value<
        installDismissMs()
    );
  }

  function showAction(type){
    if(
      isStandalone()&&
      (
        type==='install'||
        type==='manual'
      )
    ){
      return;
    }

    if(
      pwaActionType==='update'&&
      type!=='update'
    ){
      return;
    }

    pwaActionType=type;

    const banner=
      root.document?.getElementById(
        'pwaActionBanner'
      );

    const title=
      root.document?.getElementById(
        'pwaActionTitle'
      );

    const copy=
      root.document?.getElementById(
        'pwaActionCopy'
      );

    const primary=
      root.document?.getElementById(
        'pwaActionPrimary'
      );

    if(
      !banner||
      !title||
      !copy||
      !primary
    ){
      return;
    }

    if(type==='update'){
      title.textContent=
        text('updateTitle');
      copy.textContent=
        text('updateCopy');
      primary.textContent=
        text('updateNow');
    }else if(type==='wechat'){
      title.textContent=
        text('wechatTitle');
      copy.textContent=
        text('wechatCopy');
      primary.textContent=
        text('installGuide');
    }else if(type==='ios'){
      title.textContent=
        text('iosTitle');
      copy.textContent=
        text('iosCopy');
      primary.textContent=
        text('installGuide');
    }else if(type==='manual'){
      title.textContent=
        text('manualInstallTitle');
      copy.textContent=
        text('manualInstallCopy');
      primary.textContent=
        text('manualInstallAction');
    }else{
      title.textContent=
        text('installTitle');
      copy.textContent=
        text('installCopy');
      primary.textContent=
        text('installNow');
    }

    banner.removeAttribute(
      'hidden'
    );
  }

  function hideAction(){
    root.document
      ?.getElementById(
        'pwaActionBanner'
      )
      ?.setAttribute(
        'hidden',
        ''
      );

    pwaActionType='';
  }

  function dismissAction(){
    if(
      pwaActionType==='install'||
      pwaActionType==='manual'||
      pwaActionType==='ios'||
      pwaActionType==='wechat'
    ){
      localStorageBridge()
        ?.setItem(
          PWA_INSTALL_DISMISSED_KEY,
          String(Date.now())
        );
    }

    if(
      pwaActionType==='update'
    ){
      sessionStorageBridge()
        ?.setItem(
          PWA_UPDATE_SESSION_KEY,
          '1'
        );
    }

    hideAction();
  }

  function clearInstallFallback(){
    if(pwaInstallFallbackTimer){
      root.clearTimeout(
        pwaInstallFallbackTimer
      );

      pwaInstallFallbackTimer=null;
    }
  }

  function installFallbackDelayMs(){
    return Math.max(
      3000,
      Number(
        pwaConfig().installFallbackDelayMs||
        15000
      )
    );
  }

  function scheduleInstallFallback(){
    if(
      pwaInstallFallbackTimer||
      isStandalone()||
      installWasDismissed()||
      deferredInstallPrompt||
      isIosDevice()||
      isWechatBrowser()||
      pwaActionType==='update'
    ){
      return;
    }

    pwaInstallFallbackTimer=
      root.setTimeout(
        ()=>{
          pwaInstallFallbackTimer=null;

          if(
            isStandalone()||
            installWasDismissed()||
            deferredInstallPrompt||
            isIosDevice()||
            isWechatBrowser()||
            pwaActionType==='update'
          ){
            return;
          }

          if(
            activeScreen()==='home'
          ){
            root.setTimeout(
              maybeOfferInstall,
              3000
            );

            return;
          }

          showAction('manual');
        },
        installFallbackDelayMs()
      );
  }

  function maybeOfferInstall(){
    if(
      isStandalone()||
      installWasDismissed()||
      pwaActionType==='update'
    ){
      return;
    }

    if(activeScreen()==='home'){
      root.setTimeout(
        maybeOfferInstall,
        3000
      );

      return;
    }

    if(isWechatBrowser()){
      clearInstallFallback();
      return showAction('wechat');
    }

    if(deferredInstallPrompt){
      clearInstallFallback();
      return showAction('install');
    }

    if(isIosDevice()){
      clearInstallFallback();
      return showAction('ios');
    }

    scheduleInstallFallback();
  }

  async function triggerNativeInstall(){
    if(!deferredInstallPrompt){
      return openGuide();
    }

    const prompt=
      deferredInstallPrompt;

    deferredInstallPrompt=null;

    try{
      await prompt.prompt();

      const choice=
        await prompt.userChoice;

      if(
        choice?.outcome===
        'accepted'
      ){
        localStorageBridge()
          ?.removeItem(
            PWA_INSTALL_DISMISSED_KEY
          );

        hideAction();
      }else{
        localStorageBridge()
          ?.setItem(
            PWA_INSTALL_DISMISSED_KEY,
            String(Date.now())
          );

        hideAction();
      }
    }catch(error){
      console.error(
        'PWA install prompt failed:',
        error
      );

      openGuide();
    }
  }

  function guideSteps(){
    if(isWechatBrowser()){
      return isIosDevice()
        ? text('wechatIosSteps')
        : text('wechatAndroidSteps');
    }

    if(isIosDevice()){
      return text('iosSteps');
    }

    return text('genericSteps');
  }

  function openGuide(){
    const layer=
      root.document?.getElementById(
        'pwaGuideLayer'
      );

    const title=
      root.document?.getElementById(
        'pwaGuideTitle'
      );

    const copy=
      root.document?.getElementById(
        'pwaGuideCopy'
      );

    const steps=
      root.document?.getElementById(
        'pwaGuideSteps'
      );

    if(
      !layer||
      !title||
      !copy||
      !steps
    ){
      return;
    }

    const wechat=
      isWechatBrowser();

    title.textContent=
      wechat
        ? text('wechatTitle')
        : (
            isIosDevice()
              ? text('iosTitle')
              : text('installTitle')
          );

    copy.textContent=
      wechat
        ? text('wechatCopy')
        : (
            isIosDevice()
              ? text('iosCopy')
              : text('installCopy')
          );

    steps.innerHTML=
      guideSteps()
        .map(
          step=>
            `<div class="pwa-guide-step">${step}</div>`
        )
        .join('');

    const copyButton=
      root.document?.getElementById(
        'pwaCopyLinkBtn'
      );

    const doneButton=
      root.document?.getElementById(
        'pwaGuideDoneBtn'
      );

    if(copyButton){
      copyButton.textContent=
        text('copyLink');
    }

    if(doneButton){
      doneButton.textContent=
        text('done');
    }

    layer.removeAttribute(
      'hidden'
    );
  }

  function closeGuide(){
    root.document
      ?.getElementById(
        'pwaGuideLayer'
      )
      ?.setAttribute(
        'hidden',
        ''
      );
  }

  async function copyLink(){
    const button=
      root.document?.getElementById(
        'pwaCopyLinkBtn'
      );

    try{
      if(
        root.navigator
          ?.clipboard
          ?.writeText
      ){
        await root.navigator
          .clipboard
          .writeText(
            root.location.href
          );
      }else{
        const area=
          root.document
            .createElement(
              'textarea'
            );

        area.value=
          root.location.href;

        area.style.position=
          'fixed';

        area.style.opacity=
          '0';

        root.document
          .body
          .appendChild(area);

        area.select();

        root.document
          .execCommand('copy');

        area.remove();
      }

      if(button){
        button.textContent=
          text('copied');

        root.setTimeout(
          ()=>{
            button.textContent=
              text('copyLink');
          },
          1600
        );
      }
    }catch(error){
      console.error(
        'Copy link failed:',
        error
      );
    }
  }

  async function applyUpdate(){
    const primary=
      root.document?.getElementById(
        'pwaActionPrimary'
      );

    if(primary){
      primary.disabled=true;
      primary.textContent=
        text('updating');
    }

    try{
      if(
        !pwaRegistration?.waiting
      ){
        await pwaRegistration
          ?.update?.();
      }

      if(
        pwaRegistration?.waiting
      ){
        pwaRegistration.waiting
          .postMessage({
            type:'SKIP_WAITING'
          });
      }else{
        root.location.reload();
      }
    }catch(error){
      console.error(
        'PWA update failed:',
        error
      );

      if(primary){
        primary.disabled=false;
        primary.textContent=
          text('updateNow');
      }
    }
  }

  function handlePrimaryAction(){
    if(
      pwaActionType==='update'
    ){
      return applyUpdate();
    }

    if(
      pwaActionType==='install'
    ){
      return triggerNativeInstall();
    }

    return openGuide();
  }

  function refreshUi(){
    updateNetworkState();

    if(pwaActionType){
      showAction(
        pwaActionType
      );
    }

    if(
      !root.document
        ?.getElementById(
          'pwaGuideLayer'
        )
        ?.hasAttribute(
          'hidden'
        )
    ){
      openGuide();
    }
  }

  function currentRelease(){
    return String(
      root.DREAMLAND_RELEASE||
      ''
    ).trim();
  }

  function serviceWorkerUrl(){
    return (
      './sw.js?release='+
      encodeURIComponent(
        RELEASE_TAG
      )
    );
  }

  function safeForImmediateWorkerActivation(){
    const screen=
      activeScreen();

    return (
      !screen||
      screen==='home'||
      screen==='catalog'
    );
  }

  function activateWaitingWorker(
    registration
  ){
    const waiting=
      registration?.waiting;

    if(!waiting){
      return false;
    }

    waiting.postMessage({
      type:'SKIP_WAITING'
    });

    return true;
  }

  function handleWaitingUpdate(
    registration
  ){
    pwaRegistration=
      registration;

    if(
      currentRelease()===
        RELEASE_TAG&&
      safeForImmediateWorkerActivation()&&
      activateWaitingWorker(
        registration
      )
    ){
      return;
    }

    notifyUpdate(
      registration
    );
  }

  function notifyUpdate(
    registration
  ){
    pwaRegistration=
      registration;

    if(
      sessionStorageBridge()
        ?.getItem(
          PWA_UPDATE_SESSION_KEY
        )!=='1'
    ){
      showAction('update');
    }
  }

  async function registerServiceWorker(){
    if(
      !(
        'serviceWorker' in
        (root.navigator||{})
      )
    ){
      return;
    }

    try{
      const registration=
        await root.navigator
          .serviceWorker
          .register(
            serviceWorkerUrl(),
            {
              scope:'./',
              updateViaCache:'none'
            }
          );

      pwaRegistration=
        registration;

      if(
        registration.waiting&&
        root.navigator
          .serviceWorker
          .controller
      ){
        handleWaitingUpdate(
          registration
        );
      }

      registration.addEventListener(
        'updatefound',
        ()=>{
          const worker=
            registration.installing;

          if(!worker){
            return;
          }

          worker.addEventListener(
            'statechange',
            ()=>{
              if(
                worker.state===
                  'installed'&&
                root.navigator
                  .serviceWorker
                  .controller
              ){
                handleWaitingUpdate(
                  registration
                );
              }
            }
          );
        }
      );

      root.navigator
        .serviceWorker
        .addEventListener(
          'controllerchange',
          ()=>{
            /*
             * R4 critical assets are release-versioned. If this page already
             * runs the current release, controller takeover does not need a
             * second reload. This prevents an unnecessary double boot.
             */
            if(
              currentRelease()===
              RELEASE_TAG
            ){
              return;
            }

            if(pwaReloading){
              return;
            }

            pwaReloading=true;
            root.location.reload();
          }
        );

      const interval=
        Number(
          pwaConfig()
            .updateCheckIntervalMs||
          3600000
        );

      const check=()=>{
        const now=
          Date.now();

        if(
          now-pwaUpdateCheckAt<
          60000
        ){
          return;
        }

        pwaUpdateCheckAt=now;

        registration
          .update()
          .catch(()=>{});
      };

      root.addEventListener(
        'focus',
        check
      );

      root.document
        ?.addEventListener(
          'visibilitychange',
          ()=>{
            if(
              root.document
                .visibilityState===
              'visible'
            ){
              check();
            }
          }
        );

      root.setInterval(
        check,
        Math.max(
          interval,
          300000
        )
      );

      check();
    }catch(error){
      console.error(
        'Service worker registration failed:',
        error
      );
    }
  }

  function initExperience(){
    if(pwaInitialized){
      return;
    }

    pwaInitialized=true;

    updateNetworkState();

    root.addEventListener(
      'online',
      updateNetworkState
    );

    root.addEventListener(
      'offline',
      updateNetworkState
    );

    const delay=
      Number(
        pwaConfig()
          .installPromptDelayMs||
        10000
      );

    root.setTimeout(
      maybeOfferInstall,
      Math.max(
        delay,
        2000
      )
    );
  }

  function onBeforeInstallPrompt(
    event
  ){
    event.preventDefault();

    deferredInstallPrompt=
      event;

    clearInstallFallback();

    if(pwaInitialized){
      if(
        pwaActionType===
        'manual'
      ){
        showAction('install');
      }else{
        root.setTimeout(
          maybeOfferInstall,
          800
        );
      }
    }
  }

  function onAppInstalled(){
    deferredInstallPrompt=null;

    clearInstallFallback();

    localStorageBridge()
      ?.removeItem(
        PWA_INSTALL_DISMISSED_KEY
      );

    hideAction();
  }

  const api=Object.freeze({
    version:'B2-03',
    configure,
    text,
    probeReachability,
    applyReachability,
    updateNetworkState,
    refreshUi,
    initExperience,
    registerServiceWorker,
    hideNetworkBanner,
    handlePrimaryAction,
    dismissAction,
    openGuide,
    closeGuide,
    copyLink
  });

  root.DreamlandPwa=api;

  if(
    typeof root.addEventListener===
    'function'
  ){
    root.addEventListener(
      'beforeinstallprompt',
      onBeforeInstallPrompt
    );

    root.addEventListener(
      'appinstalled',
      onAppInstalled
    );

    root.addEventListener(
      'load',
      ()=>{
        registerServiceWorker();
      }
    );
  }
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

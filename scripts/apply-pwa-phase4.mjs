import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const SW_PATH = 'sw.js';
const MANIFEST_PATH = 'manifest.webmanifest';
const CONFIG_PATH = 'data/app-config.json';
const OFFLINE_PATH = 'offline.html';
const WORKFLOW_PATH = '.github/workflows/apply-pwa-phase4.yml';
const SELF_PATH = 'scripts/apply-pwa-phase4.mjs';

function fail(message) {
  throw new Error(`[pwa-phase4] ${message}`);
}

function replaceExact(text, search, replacement, label) {
  if (!text.includes(search)) fail(`Marker not found: ${label}`);
  return text.replace(search, replacement);
}

function insertBefore(text, marker, addition, label) {
  const index = text.indexOf(marker);
  if (index < 0) fail(`Insertion marker not found: ${label}`);
  return text.slice(0, index) + addition + text.slice(index);
}

let index = fs.readFileSync(INDEX_PATH, 'utf8');

if (!index.includes('id="pwaNetworkBanner"')) {
  const pwaCss = `
/* PWA phase 4: install, update and connectivity UI */
.pwa-network-banner{position:absolute;left:14px;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:130;min-height:42px;padding:10px 13px;border-radius:16px;background:#111;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 12px 30px rgba(0,0,0,.22);font-size:11px;font-weight:800;line-height:1.4}
.pwa-network-banner[hidden],.pwa-action-banner[hidden],.pwa-guide-layer[hidden]{display:none!important}
.pwa-network-banner button{flex:none;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:17px}
.pwa-action-banner{position:absolute;left:14px;right:14px;bottom:calc(92px + var(--safe));z-index:125;padding:15px;border-radius:22px;background:#fff;color:#111;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;box-shadow:0 18px 48px rgba(0,0,0,.22);border:1px solid rgba(0,0,0,.06)}
.pwa-action-copy{min-width:0}.pwa-action-copy strong{display:block;font-size:13px;font-weight:950;line-height:1.25;margin-bottom:3px}.pwa-action-copy span{display:block;color:#7f8189;font-size:10px;font-weight:750;line-height:1.4}
.pwa-action-primary{height:38px;padding:0 14px;border-radius:999px;background:#111;color:#fff;font-size:11px;font-weight:900;white-space:nowrap}
.pwa-action-close{width:32px;height:32px;border-radius:50%;background:#f1f1f3;color:#777;font-size:18px}
.pwa-guide-layer{position:absolute;inset:0;z-index:160;background:rgba(0,0,0,.28);display:flex;align-items:flex-end;padding:18px}
.pwa-guide-card{width:100%;max-height:82%;overflow:auto;background:#fff;border-radius:28px;padding:24px 20px calc(20px + var(--safe));box-shadow:0 26px 70px rgba(0,0,0,.30)}
.pwa-guide-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}.pwa-guide-head h3{font-size:20px;font-weight:950;line-height:1.2}.pwa-guide-head p{margin-top:6px;color:#858891;font-size:12px;line-height:1.55}.pwa-guide-close{width:36px;height:36px;border-radius:50%;background:#f1f1f3;color:#777;font-size:20px;flex:none}
.pwa-guide-steps{counter-reset:pwa-step;display:flex;flex-direction:column;gap:10px;margin:18px 0}.pwa-guide-step{counter-increment:pwa-step;display:grid;grid-template-columns:30px minmax(0,1fr);align-items:start;gap:10px;padding:12px;border-radius:16px;background:#f5f5f7;color:#333;font-size:12px;font-weight:750;line-height:1.55}.pwa-guide-step:before{content:counter(pwa-step);width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#111;color:#fff;font-size:12px;font-weight:900}
.pwa-guide-actions{display:flex;gap:10px}.pwa-guide-actions button{height:48px;border-radius:999px;font-size:13px;font-weight:900}.pwa-guide-actions .copy{flex:1;background:#111;color:#fff}.pwa-guide-actions .done{flex:1;background:#f0f0f2;color:#111}
@media(max-width:360px){.pwa-action-banner{grid-template-columns:minmax(0,1fr) auto}.pwa-action-close{display:none}.pwa-action-primary{padding:0 11px}}
`;
  index = insertBefore(index, '</style>', pwaCss, 'closing style');

  const pwaMarkup = `
<div class="pwa-network-banner" id="pwaNetworkBanner" role="status" aria-live="polite" hidden>
  <span id="pwaNetworkText"></span>
  <button type="button" aria-label="关闭" onclick="hideNetworkBanner()">×</button>
</div>
<div class="pwa-action-banner" id="pwaActionBanner" role="status" aria-live="polite" hidden>
  <div class="pwa-action-copy"><strong id="pwaActionTitle"></strong><span id="pwaActionCopy"></span></div>
  <button class="pwa-action-primary" id="pwaActionPrimary" type="button" onclick="handlePwaPrimaryAction()"></button>
  <button class="pwa-action-close" type="button" aria-label="稍后" onclick="dismissPwaAction()">×</button>
</div>
<div class="pwa-guide-layer" id="pwaGuideLayer" role="dialog" aria-modal="true" aria-labelledby="pwaGuideTitle" hidden onclick="if(event.target===this)closePwaGuide()">
  <div class="pwa-guide-card">
    <div class="pwa-guide-head">
      <div><h3 id="pwaGuideTitle"></h3><p id="pwaGuideCopy"></p></div>
      <button class="pwa-guide-close" type="button" aria-label="关闭" onclick="closePwaGuide()">×</button>
    </div>
    <div class="pwa-guide-steps" id="pwaGuideSteps"></div>
    <div class="pwa-guide-actions">
      <button class="copy" type="button" id="pwaCopyLinkBtn" onclick="copyPwaLink()"></button>
      <button class="done" type="button" id="pwaGuideDoneBtn" onclick="closePwaGuide()"></button>
    </div>
  </div>
</div>
`;
  index = insertBefore(index, '</main>', pwaMarkup, 'closing main');

  const pwaJs = `
const PWA_INSTALL_DISMISSED_KEY='dreamlandPwaInstallDismissedAt';
const PWA_UPDATE_SESSION_KEY='dreamlandPwaUpdateDeferred';
let deferredInstallPrompt=null;
let pwaRegistration=null;
let pwaActionType='';
let pwaInitialized=false;
let pwaReloading=false;
let pwaNetworkWasOffline=false;
let pwaUpdateCheckAt=0;

const PWA_COPY={
  zh:{
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
    iosSteps:['点击浏览器底部或顶部的“分享”按钮。','选择“添加到主屏幕”。','确认名称后点击“添加”。'],
    wechatTitle:'请在系统浏览器中安装',
    wechatCopy:'微信内置浏览器不能直接安装PWA，请先在Safari或Chrome中打开。',
    wechatIosSteps:['点击微信右上角“…”菜单。','选择“在Safari中打开”；如无该选项，可复制链接后粘贴到Safari。','在Safari中点击“分享”→“添加到主屏幕”。'],
    wechatAndroidSteps:['点击微信右上角“…”菜单。','选择“在浏览器打开”；如无该选项，可复制链接后粘贴到Chrome。','在Chrome菜单中选择“安装应用”或“添加到主屏幕”。'],
    genericSteps:['打开浏览器菜单。','选择“安装应用”或“添加到主屏幕”。','按照浏览器提示完成安装。'],
    copyLink:'复制链接',
    copied:'已复制',
    done:'知道了'
  },
  en:{
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
    iosSteps:['Tap the Share button in the browser.','Choose “Add to Home Screen”.','Confirm the name and tap “Add”.'],
    wechatTitle:'Open in your system browser',
    wechatCopy:'The WeChat browser cannot install the PWA directly. Open it in Safari or Chrome first.',
    wechatIosSteps:['Tap the “…” menu in WeChat.','Choose “Open in Safari”, or copy the link into Safari.','In Safari, tap Share → Add to Home Screen.'],
    wechatAndroidSteps:['Tap the “…” menu in WeChat.','Choose “Open in browser”, or copy the link into Chrome.','In Chrome, choose Install app or Add to Home screen.'],
    genericSteps:['Open the browser menu.','Choose Install app or Add to Home screen.','Follow the browser instructions.'],
    copyLink:'Copy link',
    copied:'Copied',
    done:'Done'
  },
  ko:{
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
    iosSteps:['브라우저의 공유 버튼을 누릅니다.','“홈 화면에 추가”를 선택합니다.','이름을 확인한 뒤 “추가”를 누릅니다.'],
    wechatTitle:'기본 브라우저에서 열어 주세요',
    wechatCopy:'WeChat 내장 브라우저에서는 바로 설치할 수 없습니다. Safari 또는 Chrome에서 열어 주세요.',
    wechatIosSteps:['WeChat 오른쪽 위 “…” 메뉴를 누릅니다.','“Safari에서 열기”를 선택하거나 링크를 복사해 Safari에 붙여 넣습니다.','Safari에서 공유 → 홈 화면에 추가를 선택합니다.'],
    wechatAndroidSteps:['WeChat 오른쪽 위 “…” 메뉴를 누릅니다.','“브라우저에서 열기”를 선택하거나 링크를 복사해 Chrome에 붙여 넣습니다.','Chrome 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택합니다.'],
    genericSteps:['브라우저 메뉴를 엽니다.','앱 설치 또는 홈 화면에 추가를 선택합니다.','브라우저 안내에 따라 설치합니다.'],
    copyLink:'링크 복사',
    copied:'복사됨',
    done:'확인'
  }
};

function pwaText(key){
  const lang=(typeof currentLang!=='undefined'&&currentLang)||localStorage.getItem('productManualLang')||'zh';
  return PWA_COPY[lang]?.[key]??PWA_COPY.zh[key]??key;
}
function isPwaStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true}
function isIosDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function isWechatBrowser(){return /MicroMessenger/i.test(navigator.userAgent)}
function pwaConfig(){return appConfig?.pwa||{}}
function installDismissMs(){return Number(pwaConfig().installDismissDays||7)*86400000}
function installWasDismissed(){const value=Number(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)||0);return value>0&&Date.now()-value<installDismissMs()}
function hideNetworkBanner(){document.getElementById('pwaNetworkBanner')?.setAttribute('hidden','')}
function setNetworkBanner(text,persistent=false){
  const banner=document.getElementById('pwaNetworkBanner'),copy=document.getElementById('pwaNetworkText');
  if(!banner||!copy)return;
  copy.textContent=text;banner.removeAttribute('hidden');
  if(!persistent)setTimeout(()=>{if(navigator.onLine!==false)hideNetworkBanner()},2200)
}
function updateNetworkState(){
  if(navigator.onLine===false){pwaNetworkWasOffline=true;setNetworkBanner(pwaText('offline'),true)}
  else if(pwaNetworkWasOffline){pwaNetworkWasOffline=false;setNetworkBanner(pwaText('online'),false);pwaRegistration?.update?.().catch(()=>{})}
  else hideNetworkBanner()
}
function showPwaAction(type){
  if(isPwaStandalone()&&type==='install')return;
  if(pwaActionType==='update'&&type!=='update')return;
  pwaActionType=type;
  const banner=document.getElementById('pwaActionBanner'),title=document.getElementById('pwaActionTitle'),copy=document.getElementById('pwaActionCopy'),primary=document.getElementById('pwaActionPrimary');
  if(!banner||!title||!copy||!primary)return;
  if(type==='update'){title.textContent=pwaText('updateTitle');copy.textContent=pwaText('updateCopy');primary.textContent=pwaText('updateNow')}
  else if(type==='wechat'){title.textContent=pwaText('wechatTitle');copy.textContent=pwaText('wechatCopy');primary.textContent=pwaText('installGuide')}
  else if(type==='ios'){title.textContent=pwaText('iosTitle');copy.textContent=pwaText('iosCopy');primary.textContent=pwaText('installGuide')}
  else{title.textContent=pwaText('installTitle');copy.textContent=pwaText('installCopy');primary.textContent=pwaText('installNow')}
  banner.removeAttribute('hidden')
}
function hidePwaAction(){document.getElementById('pwaActionBanner')?.setAttribute('hidden','');pwaActionType=''}
function dismissPwaAction(){
  if(pwaActionType==='install'||pwaActionType==='ios'||pwaActionType==='wechat')localStorage.setItem(PWA_INSTALL_DISMISSED_KEY,String(Date.now()));
  if(pwaActionType==='update')sessionStorage.setItem(PWA_UPDATE_SESSION_KEY,'1');
  hidePwaAction()
}
function maybeOfferPwaInstall(){
  if(isPwaStandalone()||installWasDismissed()||pwaActionType==='update')return;
  if(typeof activeScreen!=='undefined'&&activeScreen==='home'){setTimeout(maybeOfferPwaInstall,3000);return}
  if(isWechatBrowser())return showPwaAction('wechat');
  if(deferredInstallPrompt)return showPwaAction('install');
  if(isIosDevice())return showPwaAction('ios')
}
async function triggerNativeInstall(){
  if(!deferredInstallPrompt)return openPwaGuide();
  const prompt=deferredInstallPrompt;deferredInstallPrompt=null;
  try{
    await prompt.prompt();
    const choice=await prompt.userChoice;
    if(choice?.outcome==='accepted'){localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);hidePwaAction()}
    else{localStorage.setItem(PWA_INSTALL_DISMISSED_KEY,String(Date.now()));hidePwaAction()}
  }catch(error){console.error('PWA install prompt failed:',error);openPwaGuide()}
}
function guideSteps(){
  if(isWechatBrowser())return isIosDevice()?pwaText('wechatIosSteps'):pwaText('wechatAndroidSteps');
  if(isIosDevice())return pwaText('iosSteps');
  return pwaText('genericSteps')
}
function openPwaGuide(){
  const layer=document.getElementById('pwaGuideLayer'),title=document.getElementById('pwaGuideTitle'),copy=document.getElementById('pwaGuideCopy'),steps=document.getElementById('pwaGuideSteps');
  if(!layer||!title||!copy||!steps)return;
  const wechat=isWechatBrowser();
  title.textContent=wechat?pwaText('wechatTitle'):(isIosDevice()?pwaText('iosTitle'):pwaText('installTitle'));
  copy.textContent=wechat?pwaText('wechatCopy'):(isIosDevice()?pwaText('iosCopy'):pwaText('installCopy'));
  steps.innerHTML=guideSteps().map(step=>\`<div class="pwa-guide-step">\${step}</div>\`).join('');
  document.getElementById('pwaCopyLinkBtn').textContent=pwaText('copyLink');
  document.getElementById('pwaGuideDoneBtn').textContent=pwaText('done');
  layer.removeAttribute('hidden')
}
function closePwaGuide(){document.getElementById('pwaGuideLayer')?.setAttribute('hidden','')}
async function copyPwaLink(){
  const button=document.getElementById('pwaCopyLinkBtn');
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(location.href);
    else{
      const area=document.createElement('textarea');area.value=location.href;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()
    }
    if(button){button.textContent=pwaText('copied');setTimeout(()=>button.textContent=pwaText('copyLink'),1600)}
  }catch(error){console.error('Copy link failed:',error)}
}
async function applyPwaUpdate(){
  const primary=document.getElementById('pwaActionPrimary');
  if(primary){primary.disabled=true;primary.textContent=pwaText('updating')}
  try{
    if(!pwaRegistration?.waiting)await pwaRegistration?.update?.();
    if(pwaRegistration?.waiting)pwaRegistration.waiting.postMessage({type:'SKIP_WAITING'})
    else location.reload()
  }catch(error){console.error('PWA update failed:',error);if(primary){primary.disabled=false;primary.textContent=pwaText('updateNow')}}
}
function handlePwaPrimaryAction(){
  if(pwaActionType==='update')return applyPwaUpdate();
  if(pwaActionType==='install')return triggerNativeInstall();
  openPwaGuide()
}
function refreshPwaUi(){
  updateNetworkState();
  if(pwaActionType)showPwaAction(pwaActionType);
  if(!document.getElementById('pwaGuideLayer')?.hasAttribute('hidden'))openPwaGuide()
}
function notifyPwaUpdate(registration){
  pwaRegistration=registration;
  if(sessionStorage.getItem(PWA_UPDATE_SESSION_KEY)!=='1')showPwaAction('update')
}
async function registerPwaServiceWorker(){
  if(!('serviceWorker' in navigator))return;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    pwaRegistration=registration;
    if(registration.waiting&&navigator.serviceWorker.controller)notifyPwaUpdate(registration);
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)notifyPwaUpdate(registration)
      })
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(pwaReloading)return;pwaReloading=true;location.reload()
    });
    const interval=Number(pwaConfig().updateCheckIntervalMs||3600000);
    const check=()=>{const now=Date.now();if(now-pwaUpdateCheckAt<60000)return;pwaUpdateCheckAt=now;registration.update().catch(()=>{})};
    window.addEventListener('focus',check);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
    setInterval(check,Math.max(interval,300000));
    check()
  }catch(error){console.error('Service worker registration failed:',error)}
}
function initPwaExperience(){
  if(pwaInitialized)return;pwaInitialized=true;
  updateNetworkState();
  window.addEventListener('online',updateNetworkState);
  window.addEventListener('offline',updateNetworkState);
  const delay=Number(pwaConfig().installPromptDelayMs||10000);
  setTimeout(maybeOfferPwaInstall,Math.max(delay,2000))
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferredInstallPrompt=event;
  if(pwaInitialized)setTimeout(maybeOfferPwaInstall,800)
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);hidePwaAction()
});
`;
  index = insertBefore(index, "document.addEventListener('click'", pwaJs, 'main document click listener');

  index = replaceExact(
    index,
    "  rerenderCurrent();\n  toast(ui('switched'))",
    "  rerenderCurrent();\n  refreshPwaUi();\n  toast(ui('switched'))",
    'language switch refresh'
  );

  index = replaceExact(
    index,
    "async function submitInquiry(){\n  let btn=document.getElementById('submitBtn');\n  if(!btn)return;",
    "async function submitInquiry(){\n  let btn=document.getElementById('submitBtn');\n  if(!btn)return;\n  if(navigator.onLine===false){toast(pwaText('offlineSubmit'));updateNetworkState();return}",
    'offline submit guard'
  );

  index = replaceExact(
    index,
    "  initUnlock();\n}",
    "  initUnlock();\n  initPwaExperience();\n}",
    'PWA bootstrap initialization'
  );

  const oldRegistration = `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}
</script>`;
  const newRegistration = `<script>
window.addEventListener('load',registerPwaServiceWorker);
</script>`;
  index = replaceExact(index, oldRegistration, newRegistration, 'service worker registration block');
}

fs.writeFileSync(INDEX_PATH, index, 'utf8');

const serviceWorker = `const CACHE_VERSION = 'dreamland-pwa-v5';
const APP_CACHE = \`\${CACHE_VERSION}-app\`;
const RUNTIME_CACHE = \`\${CACHE_VERSION}-runtime\`;
const IMAGE_CACHE = \`\${CACHE_VERSION}-images\`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './privacy.html',
  './data/products.json',
  './data/series.json',
  './data/i18n.json',
  './data/app-config.json',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![APP_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  while (keys.length > maxItems) {
    await cache.delete(keys.shift());
  }
}

async function networkFirst(request, fallbackPaths = [], fresh = false) {
  try {
    const response = await fetch(request, fresh ? { cache: 'no-store' } : undefined);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const direct = await caches.match(request);
    if (direct) return direct;
    for (const path of fallbackPaths) {
      const fallback = await caches.match(path);
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName = RUNTIME_CACHE, maxItems = 200) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async response => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        await trimCache(cacheName, maxItems);
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || new Response('Offline', { status: 503, statusText: 'Offline' });
}

async function productImageNetworkFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await trimCache(IMAGE_CACHE, 240);
    }
    return response;
  } catch {
    return (await cache.match(request)) || new Response('', { status: 504, statusText: 'Image unavailable offline' });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, ['./index.html', './offline.html']));
    return;
  }

  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, [], true));
    return;
  }

  if (request.destination === 'image' && url.pathname.includes('/images/products/')) {
    event.respondWith(productImageNetworkFirst(request));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, 240));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 220));
});
`;
fs.writeFileSync(SW_PATH, serviceWorker, 'utf8');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
manifest.prefer_related_applications = false;
manifest.display_override = ['standalone', 'minimal-ui'];
fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
config.pwa = {
  offlineStrategy: 'on-demand',
  installPromptDelayMs: 10000,
  installDismissDays: 7,
  updateCheckIntervalMs: 3600000,
  productImageStrategy: 'network-first'
};
fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

let offline = fs.readFileSync(OFFLINE_PATH, 'utf8');
if (!offline.includes("window.addEventListener('online'")) {
  offline = offline.replace(
    '</script>',
    "window.addEventListener('online',()=>location.replace('./'));\n</script>"
  );
}
fs.writeFileSync(OFFLINE_PATH, offline, 'utf8');

const checklist = `# DREAMLAND PWA 第四阶段验收清单

## 已确定的离线策略

采用 **按需离线（on-demand）**：

- 首页、产品册程序、隐私页、Manifest和三个JSON数据文件预缓存。
- 产品图片只有在用户实际浏览后才缓存。
- 在线时产品图片使用 Network First，并绕过浏览器旧HTTP缓存。
- 离线时回退到此前浏览过的图片。
- 不预缓存全部产品详情图，避免首次访问下载数百张图片。

## Android Chrome

- [ ] 清除该网站的站点数据后重新打开。
- [ ] 进入产品目录并停留约10秒。
- [ ] 出现“安装DREAMLAND”提示。
- [ ] 点击安装后出现Chrome原生安装确认。
- [ ] 安装完成后从桌面图标打开，页面为独立窗口。
- [ ] 开启飞行模式，重新打开应用。
- [ ] 首页、目录和已浏览产品可打开。
- [ ] 离线状态条显示。
- [ ] 尝试提交意向时明确提示需联网。

## iPhone / iPad Safari

- [ ] 使用Safari打开网站。
- [ ] 进入产品目录并停留约10秒。
- [ ] 出现“添加到主屏幕”提示。
- [ ] 点击“查看步骤”，内容为“分享→添加到主屏幕→添加”。
- [ ] 完成添加后，从桌面图标启动。
- [ ] 页面为独立窗口，安全区域没有遮挡。
- [ ] 开启飞行模式后，已浏览内容可打开。
- [ ] 恢复网络后出现“网络已恢复”。

说明：iOS不提供 Chromium 的 \`beforeinstallprompt\`，因此使用引导步骤而不是强制弹出系统安装框。

## 微信内置浏览器

### Android微信

- [ ] 打开网站后进入产品目录。
- [ ] 安装提示说明微信内不能直接安装。
- [ ] “查看步骤”显示“右上角…→在浏览器打开→Chrome安装”。
- [ ] 复制链接按钮可用。
- [ ] 在Chrome打开后可触发原生安装。

### iPhone微信

- [ ] 安装提示说明需要Safari。
- [ ] “查看步骤”显示“右上角…→Safari→添加到主屏幕”。
- [ ] 复制链接按钮可用。
- [ ] 在Safari打开后可添加到主屏幕。

## Service Worker更新测试

1. 先安装并打开旧版本PWA。
2. 保持旧版本至少打开一次。
3. 部署新的 \`sw.js\` 版本。
4. 重新打开已安装应用。
5. 应出现“发现新版本”提示。
6. 点击“立即更新”。
7. Service Worker接管后页面自动刷新一次。
8. 意向单本地数据不应丢失。
9. 不应出现循环刷新。

## 正式图片更新测试

1. 在线打开产品ADV001，让封面进入图片缓存。
2. 保持文件名不变，替换：
   \`images/products/ADV001/cover.jpg\`
3. 等Cloudflare部署完成。
4. 完全关闭已安装PWA后重新打开。
5. 进入ADV001，在线时应直接获得新图片。
6. 再次开启飞行模式。
7. ADV001应显示刚刚缓存的新图片，而不是旧图。

说明：产品图片现在采用 Network First + \`cache: no-store\`。只替换图片、不修改应用代码时，不一定出现“发现新版本”，但在线重新访问产品时仍会更新图片缓存。

## 桌面Chrome / Edge补充测试

- [ ] 地址栏或站内提示可安装。
- [ ] 安装后以独立窗口运行。
- [ ] 部署新版本后出现更新提示。
- [ ] 点击更新后只刷新一次。
`;
fs.writeFileSync('PWA-TEST-CHECKLIST.md', checklist, 'utf8');

const validator = `import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const errors=[];

const requiredIndex=[
  'id="pwaNetworkBanner"',
  'id="pwaActionBanner"',
  'beforeinstallprompt',
  'appinstalled',
  "window.addEventListener('offline'",
  'registerPwaServiceWorker',
  "updateViaCache:'none'",
  "navigator.onLine===false"
];
for(const marker of requiredIndex)if(!index.includes(marker))errors.push('Missing index marker: '+marker);

const requiredSw=[
  "dreamland-pwa-v5",
  "event.data?.type === 'SKIP_WAITING'",
  'productImageNetworkFirst',
  "cache: 'no-store'",
  "'./data/app-config.json'"
];
for(const marker of requiredSw)if(!sw.includes(marker))errors.push('Missing service worker marker: '+marker);
if(sw.includes('.then(() => self.skipWaiting())'))errors.push('Service worker still forces skipWaiting during install');

if(manifest.prefer_related_applications!==false)errors.push('prefer_related_applications must be false');
if(config.pwa?.offlineStrategy!=='on-demand')errors.push('PWA offline strategy must be on-demand');
if(config.pwa?.productImageStrategy!=='network-first')errors.push('Product image strategy must be network-first');
if(!fs.existsSync('PWA-TEST-CHECKLIST.md'))errors.push('Missing PWA test checklist');

if(errors.length){console.error(errors.join('\\n'));process.exit(1)}
console.log('PWA phase 4 validation passed.');
`;
fs.writeFileSync('scripts/validate-pwa-phase4.mjs', validator, 'utf8');

if (fs.existsSync(WORKFLOW_PATH)) fs.rmSync(WORKFLOW_PATH);
if (fs.existsSync(SELF_PATH)) fs.rmSync(SELF_PATH);

console.log('PWA phase 4 refactor completed.');

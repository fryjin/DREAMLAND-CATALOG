import fs from 'node:fs';

const INDEX_PATH='index.html';
const SW_PATH='sw.js';
const CONFIG_PATH='data/app-config.json';
const WORKFLOW_PATH='.github/workflows/apply-install-fallback.yml';
const SELF_PATH='scripts/apply-install-fallback.mjs';

function fail(message){throw new Error(`[install-fallback] ${message}`)}
function replaceExact(text,search,replacement,label){
  if(!text.includes(search))fail(`Marker not found: ${label}`);
  return text.replace(search,replacement)
}

let index=fs.readFileSync(INDEX_PATH,'utf8');

if(!index.includes("manualInstallTitle:'浏览器菜单安装'")){
  index=replaceExact(
    index,
    "    copied:'已复制',\n    done:'知道了'",
    "    copied:'已复制',\n    manualInstallTitle:'浏览器菜单安装',\n    manualInstallCopy:'浏览器暂未提供快捷安装按钮，可从浏览器菜单安装到桌面。',\n    manualInstallAction:'查看安装方法',\n    done:'知道了'",
    'Chinese fallback copy'
  );

  index=replaceExact(
    index,
    "    copied:'Copied',\n    done:'Done'",
    "    copied:'Copied',\n    manualInstallTitle:'Install from the browser menu',\n    manualInstallCopy:'A quick install button is not available yet. Install from the browser menu instead.',\n    manualInstallAction:'View install steps',\n    done:'Done'",
    'English fallback copy'
  );

  index=replaceExact(
    index,
    "    copied:'복사됨',\n    done:'확인'",
    "    copied:'복사됨',\n    manualInstallTitle:'브라우저 메뉴에서 설치',\n    manualInstallCopy:'빠른 설치 버튼을 사용할 수 없습니다. 브라우저 메뉴에서 홈 화면에 설치해 주세요.',\n    manualInstallAction:'설치 방법 보기',\n    done:'확인'",
    'Korean fallback copy'
  );

  index=replaceExact(
    index,
    "let pwaUpdateCheckAt=0;",
    "let pwaUpdateCheckAt=0;\nlet pwaInstallFallbackTimer=null;",
    'fallback timer state'
  );

  index=replaceExact(
    index,
    "  if(isPwaStandalone()&&type==='install')return;",
    "  if(isPwaStandalone()&&(type==='install'||type==='manual'))return;",
    'standalone install suppression'
  );

  index=replaceExact(
    index,
    "  else if(type==='ios'){title.textContent=pwaText('iosTitle');copy.textContent=pwaText('iosCopy');primary.textContent=pwaText('installGuide')}\n  else{title.textContent=pwaText('installTitle');copy.textContent=pwaText('installCopy');primary.textContent=pwaText('installNow')}",
    "  else if(type==='ios'){title.textContent=pwaText('iosTitle');copy.textContent=pwaText('iosCopy');primary.textContent=pwaText('installGuide')}\n  else if(type==='manual'){title.textContent=pwaText('manualInstallTitle');copy.textContent=pwaText('manualInstallCopy');primary.textContent=pwaText('manualInstallAction')}\n  else{title.textContent=pwaText('installTitle');copy.textContent=pwaText('installCopy');primary.textContent=pwaText('installNow')}",
    'manual action rendering'
  );

  index=replaceExact(
    index,
    "  if(pwaActionType==='install'||pwaActionType==='ios'||pwaActionType==='wechat')localStorage.setItem(PWA_INSTALL_DISMISSED_KEY,String(Date.now()));",
    "  if(pwaActionType==='install'||pwaActionType==='manual'||pwaActionType==='ios'||pwaActionType==='wechat')localStorage.setItem(PWA_INSTALL_DISMISSED_KEY,String(Date.now()));",
    'manual action dismissal'
  );

  const oldOffer=`function maybeOfferPwaInstall(){
  if(isPwaStandalone()||installWasDismissed()||pwaActionType==='update')return;
  if(typeof activeScreen!=='undefined'&&activeScreen==='home'){setTimeout(maybeOfferPwaInstall,3000);return}
  if(isWechatBrowser())return showPwaAction('wechat');
  if(deferredInstallPrompt)return showPwaAction('install');
  if(isIosDevice())return showPwaAction('ios')
}
`;

  const newOffer=`function clearPwaInstallFallback(){
  if(pwaInstallFallbackTimer){
    clearTimeout(pwaInstallFallbackTimer);
    pwaInstallFallbackTimer=null
  }
}
function installFallbackDelayMs(){return Math.max(3000,Number(pwaConfig().installFallbackDelayMs||15000))}
function schedulePwaInstallFallback(){
  if(pwaInstallFallbackTimer||isPwaStandalone()||installWasDismissed()||deferredInstallPrompt||isIosDevice()||isWechatBrowser()||pwaActionType==='update')return;
  pwaInstallFallbackTimer=setTimeout(()=>{
    pwaInstallFallbackTimer=null;
    if(isPwaStandalone()||installWasDismissed()||deferredInstallPrompt||isIosDevice()||isWechatBrowser()||pwaActionType==='update')return;
    if(typeof activeScreen!=='undefined'&&activeScreen==='home'){
      setTimeout(maybeOfferPwaInstall,3000);
      return
    }
    showPwaAction('manual')
  },installFallbackDelayMs())
}
function maybeOfferPwaInstall(){
  if(isPwaStandalone()||installWasDismissed()||pwaActionType==='update')return;
  if(typeof activeScreen!=='undefined'&&activeScreen==='home'){setTimeout(maybeOfferPwaInstall,3000);return}
  if(isWechatBrowser()){clearPwaInstallFallback();return showPwaAction('wechat')}
  if(deferredInstallPrompt){clearPwaInstallFallback();return showPwaAction('install')}
  if(isIosDevice()){clearPwaInstallFallback();return showPwaAction('ios')}
  schedulePwaInstallFallback()
}
`;

  index=replaceExact(index,oldOffer,newOffer,'install offer function');

  const oldBefore=`window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferredInstallPrompt=event;
  if(pwaInitialized)setTimeout(maybeOfferPwaInstall,800)
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);hidePwaAction()
});`;

  const newBefore=`window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  clearPwaInstallFallback();
  if(pwaInitialized){
    if(pwaActionType==='manual')showPwaAction('install');
    else setTimeout(maybeOfferPwaInstall,800)
  }
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  clearPwaInstallFallback();
  localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
  hidePwaAction()
});`;

  index=replaceExact(index,oldBefore,newBefore,'beforeinstallprompt handling');
}

fs.writeFileSync(INDEX_PATH,index,'utf8');

let sw=fs.readFileSync(SW_PATH,'utf8');
sw=sw.replace(/const CACHE_VERSION = 'dreamland-pwa-v\d+';/,"const CACHE_VERSION = 'dreamland-pwa-v7';");
fs.writeFileSync(SW_PATH,sw,'utf8');

const config=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
config.pwa=config.pwa||{};
config.pwa.installFallbackDelayMs=15000;
config.pwa.installFallbackMode='browser-menu-guide';
fs.writeFileSync(CONFIG_PATH,`${JSON.stringify(config,null,2)}\n`,'utf8');

const validator=`import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const errors=[];

[
  "manualInstallTitle:'浏览器菜单安装'",
  "manualInstallAction:'查看安装方法'",
  'function schedulePwaInstallFallback()',
  "showPwaAction('manual')",
  "pwaActionType==='manual'",
  'clearPwaInstallFallback();'
].forEach(marker=>{if(!index.includes(marker))errors.push('Missing index marker: '+marker)});

if(!sw.includes("dreamland-pwa-v7"))errors.push('Service worker was not upgraded to v7');
if(config.pwa?.installFallbackMode!=='browser-menu-guide')errors.push('Fallback mode is not configured');
if(Number(config.pwa?.installFallbackDelayMs)!==15000)errors.push('Fallback delay must be 15000ms');

if(errors.length){console.error(errors.join('\\n'));process.exit(1)}
console.log('Install fallback validation passed.');
`;
fs.writeFileSync('scripts/validate-install-fallback.mjs',validator,'utf8');

if(fs.existsSync(WORKFLOW_PATH))fs.rmSync(WORKFLOW_PATH);
if(fs.existsSync(SELF_PATH))fs.rmSync(SELF_PATH);

console.log('Install fallback applied.');

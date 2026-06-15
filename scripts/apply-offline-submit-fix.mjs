import fs from 'node:fs';

const INDEX_PATH='index.html';
const SW_PATH='sw.js';
const CONFIG_PATH='data/app-config.json';
const WORKFLOW_PATH='.github/workflows/apply-offline-submit-fix.yml';
const SELF_PATH='scripts/apply-offline-submit-fix.mjs';

function fail(message){throw new Error(`[offline-submit-fix] ${message}`)}
function insertBefore(text,marker,addition,label){
  const index=text.indexOf(marker);
  if(index<0)fail(`Insertion marker not found: ${label}`);
  return text.slice(0,index)+addition+text.slice(index);
}
function replaceBetween(text,startMarker,endMarker,replacement,label){
  const start=text.indexOf(startMarker);
  if(start<0)fail(`Start marker not found: ${label}`);
  const end=text.indexOf(endMarker,start+startMarker.length);
  if(end<0)fail(`End marker not found: ${label}`);
  return text.slice(0,start)+replacement+text.slice(end);
}
function replaceExact(text,search,replacement,label){
  if(!text.includes(search))fail(`Marker not found: ${label}`);
  return text.replace(search,replacement);
}

let index=fs.readFileSync(INDEX_PATH,'utf8');

if(!index.includes('function probeWeb3FormsReachability(')){
  const connectivityCode=`
let pwaConnectivityProbePromise=null;
let pwaConnectivityCheckedAt=0;
let pwaConnectivityLastResult=null;

function connectivityProbeTimeoutMs(){return Math.max(1500,Number(pwaConfig().connectivityProbeTimeoutMs||4500))}
function connectivityProbeCacheMs(){return Math.max(0,Number(pwaConfig().connectivityProbeCacheMs||12000))}
function connectivityProbeUrl(){
  const endpoint=typeof web3formsEndpoint==='function'?web3formsEndpoint():'https://api.web3forms.com/submit';
  return endpoint+(endpoint.includes('?')?'&':'?')+'connectivity_check='+Date.now();
}
async function probeWeb3FormsReachability(force=false){
  if(navigator.onLine===false){
    pwaConnectivityLastResult=false;
    pwaConnectivityCheckedAt=Date.now();
    return false
  }
  const now=Date.now();
  if(!force&&pwaConnectivityLastResult!==null&&now-pwaConnectivityCheckedAt<connectivityProbeCacheMs()){
    return pwaConnectivityLastResult
  }
  if(pwaConnectivityProbePromise)return pwaConnectivityProbePromise;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),connectivityProbeTimeoutMs());
  pwaConnectivityProbePromise=fetch(connectivityProbeUrl(),{
    method:'GET',
    mode:'no-cors',
    cache:'no-store',
    credentials:'omit',
    redirect:'follow',
    signal:controller.signal
  }).then(()=>true).catch(()=>false).then(result=>{
    pwaConnectivityLastResult=result;
    pwaConnectivityCheckedAt=Date.now();
    return result
  }).finally(()=>{
    clearTimeout(timeout);
    pwaConnectivityProbePromise=null
  });
  return pwaConnectivityProbePromise
}
function applyPwaReachability(online,announceRecovery=true){
  if(!online){
    pwaNetworkWasOffline=true;
    setNetworkBanner(pwaText('offline'),true);
    return
  }
  const wasOffline=pwaNetworkWasOffline;
  pwaNetworkWasOffline=false;
  if(wasOffline&&announceRecovery){
    setNetworkBanner(pwaText('online'),false);
    pwaRegistration?.update?.().catch(()=>{})
  }else{
    hideNetworkBanner()
  }
}
`;
  index=insertBefore(index,'function isPwaStandalone()',connectivityCode,'PWA connectivity helpers');

  const oldNetworkState=`function updateNetworkState(){
  if(navigator.onLine===false){pwaNetworkWasOffline=true;setNetworkBanner(pwaText('offline'),true)}
  else if(pwaNetworkWasOffline){pwaNetworkWasOffline=false;setNetworkBanner(pwaText('online'),false);pwaRegistration?.update?.().catch(()=>{})}
  else hideNetworkBanner()
}
`;
  const newNetworkState=`async function updateNetworkState(){
  if(navigator.onLine===false){
    applyPwaReachability(false,false);
    return false
  }
  const reachable=await probeWeb3FormsReachability(true);
  applyPwaReachability(reachable,true);
  return reachable
}
`;
  index=replaceExact(index,oldNetworkState,newNetworkState,'network state function');

  const newSubmit=`async function submitInquiry(){
  let btn=document.getElementById('submitBtn'),error=document.getElementById('verificationError');
  if(!btn)return;
  if(submittingInquiry){toast(ui('submissionDuplicate'));return}
  const now=Date.now(),cooldown=Math.max(0,Number(appConfig.submitCooldownMs)||10000);
  if(now-lastSubmitAttemptAt<cooldown){toast(ui('submissionCooldown'));return}
  if(!web3formsReady()){toast(ui('formNotConfigured'));return}
  const consent=document.getElementById('privacyConsent');
  if(!consent?.checked){if(error){error.textContent=ui('privacyRequired');error.classList.add('show')}toast(ui('privacyRequired'));return}
  if(appConfig.hcaptcha?.enabled!==false&&!hcaptchaToken()){if(error){error.textContent=ui('captchaRequired');error.classList.add('show')}toast(ui('captchaRequired'));return}
  if(error)error.classList.remove('show');

  submittingInquiry=true;
  btn.disabled=true;
  btn.innerHTML='<span class="loader"></span>';

  try{
    const reachable=await probeWeb3FormsReachability(true);
    if(!reachable){
      const offlineError=new Error('Web3Forms is unreachable');
      offlineError.code='OFFLINE';
      throw offlineError
    }
    applyPwaReachability(true,false);
    lastSubmitAttemptAt=Date.now();

    const inquiryId=ensureInquiryId(),snapshot=submissionSnapshot(inquiryId);
    let res=await fetch(web3formsEndpoint(),{
      method:'POST',
      headers:{Accept:'application/json'},
      body:buildWeb3FormsFormData(inquiryId)
    }),data={};

    try{data=await res.json()}catch(_){}
    if(!res.ok||data.success!==true){
      throw new Error(data.message||data.body?.message||'Web3Forms did not confirm success')
    }

    archiveSubmission(snapshot);
    clearSubmittedInquiry();
    btn.textContent=ui('confirmSubmit');
    go('success')
  }catch(e){
    console.error(e);
    let reachable=e?.code==='OFFLINE'?false:await probeWeb3FormsReachability(true);
    if(!reachable){
      applyPwaReachability(false,false);
      toast(pwaText('offlineSubmit'))
    }else{
      toast(ui('submitFailed'))
    }
    btn.textContent=ui('confirmSubmit');
    try{if(hcaptchaWidgetId!==null)window.hcaptcha?.reset(hcaptchaWidgetId)}catch(_){}
  }finally{
    submittingInquiry=false;
    btn.disabled=false
  }
}
`;

  index=replaceBetween(
    index,
    'async function submitInquiry(){',
    'function renderSuccess(){',
    newSubmit,
    'submitInquiry function'
  );
}

fs.writeFileSync(INDEX_PATH,index,'utf8');

let sw=fs.readFileSync(SW_PATH,'utf8');
sw=sw.replace(/const CACHE_VERSION = 'dreamland-pwa-v\d+';/,"const CACHE_VERSION = 'dreamland-pwa-v6';");
fs.writeFileSync(SW_PATH,sw,'utf8');

const config=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
config.pwa=config.pwa||{};
config.pwa.connectivityProbeTimeoutMs=4500;
config.pwa.connectivityProbeCacheMs=12000;
config.pwa.connectivityProbeTarget='web3forms';
fs.writeFileSync(CONFIG_PATH,`${JSON.stringify(config,null,2)}\n`,'utf8');

const validator=`import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const errors=[];

[
  'function probeWeb3FormsReachability(',
  "mode:'no-cors'",
  "cache:'no-store'",
  "data.success!==true",
  "e?.code==='OFFLINE'",
  'applyPwaReachability(false,false)'
].forEach(marker=>{if(!index.includes(marker))errors.push('Missing index marker: '+marker)});

if(!sw.includes("dreamland-pwa-v6"))errors.push('Service worker was not upgraded to v6');
if(config.pwa?.connectivityProbeTarget!=='web3forms')errors.push('Connectivity probe target is not Web3Forms');
if(Number(config.pwa?.connectivityProbeTimeoutMs)<1500)errors.push('Connectivity probe timeout is invalid');

if(errors.length){console.error(errors.join('\\n'));process.exit(1)}
console.log('Offline submission protection validation passed.');
`;
fs.writeFileSync('scripts/validate-offline-submit-fix.mjs',validator,'utf8');

if(fs.existsSync(WORKFLOW_PATH))fs.rmSync(WORKFLOW_PATH);
if(fs.existsSync(SELF_PATH))fs.rmSync(SELF_PATH);

console.log('Offline submission protection applied.');

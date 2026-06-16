import fs from 'node:fs';

const INDEX_PATH='index.html';
const SW_PATH='sw.js';
const CONFIG_PATH='data/app-config.json';
const FUNCTION_PATH='functions/api/submit.js';
const WORKFLOW_PATH='.github/workflows/apply-adaptive-risk-hcaptcha.yml';
const SELF_PATH='scripts/apply-adaptive-risk-hcaptcha.mjs';

function fail(message){throw new Error(`[adaptive-risk-hcaptcha] ${message}`)}
function replaceExact(text,search,replacement,label){
  if(!text.includes(search))fail(`Marker not found: ${label}`);
  return text.replace(search,replacement)
}
function insertBefore(text,marker,addition,label){
  const index=text.indexOf(marker);
  if(index<0)fail(`Insertion marker not found: ${label}`);
  return text.slice(0,index)+addition+text.slice(index)
}
function replaceBetween(text,startMarker,endMarker,replacement,label){
  const start=text.indexOf(startMarker);
  if(start<0)fail(`Start marker not found: ${label}`);
  const end=text.indexOf(endMarker,start+startMarker.length);
  if(end<0)fail(`End marker not found: ${label}`);
  return text.slice(0,start)+replacement+text.slice(end)
}

let index=fs.readFileSync(INDEX_PATH,'utf8');

index=index.replace(/<script\s+src=["']https:\/\/js\.hcaptcha\.com\/1\/api\.js\?render=explicit["'][^>]*><\/script>\s*/i,'');

if(!index.includes('function assessSubmissionRisk(){')){
  const riskCss=`
/* Adaptive risk control */
.risk-honeypot{position:absolute!important;left:-10000px!important;top:auto!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
.risk-status{padding:12px 14px;border-radius:15px;background:#f5f5f7;color:#666;font-size:11px;font-weight:750;line-height:1.55}
.risk-status.is-safe{background:#edf7ef;color:#357446}
.risk-status.is-risk{background:#fff4e7;color:#9a5d16}
.risk-status.is-error{background:#fff0f0;color:#a33e3e}
.captcha-section[hidden]{display:none!important}
.captcha-retry{margin-top:9px;height:36px;padding:0 14px;border-radius:999px;background:#111;color:#fff;font-size:11px;font-weight:850}
.captcha-help{font-size:11px;line-height:1.55;color:#8e9098}
`;
  index=insertBefore(index,'</style>',riskCss,'adaptive risk CSS');

  index=replaceExact(
    index,
    "function web3formsAccessKey(){return String(appConfig.web3formsAccessKey||'').trim()}\nfunction web3formsEndpoint(){return appConfig.web3formsEndpoint||'https://api.web3forms.com/submit'}\nfunction web3formsReady(){\n  const key=web3formsAccessKey();\n  return key.length>10&&!key.includes('REPLACE_WITH_');\n}",
    "function web3formsEndpoint(){return appConfig.submissionEndpoint||'./api/submit'}\nfunction web3formsReady(){return Boolean(web3formsEndpoint())}",
    'submission endpoint helpers'
  );

  index=replaceExact(
    index,
    "    access_key:web3formsAccessKey(),subject,from_name:c.name||'DREAMLAND 产品手册访客',email:c.email||'',",
    "    subject,from_name:c.name||'DREAMLAND 产品手册访客',email:c.email||'',",
    'remove public Web3Forms access key'
  );

  index=replaceExact(
    index,
    "if(n==='catalog')renderProducts();if(n==='inquiry')renderInquiry();if(n==='preview')renderPreview();",
    "if(n==='catalog')renderProducts();if(n==='inquiry')renderInquiry();if(n==='contact'){markRiskFormStart();preloadHCaptchaScript()}if(n==='preview')renderPreview();",
    'contact preload and risk start'
  );

  const adaptiveCode=`
const RISK_ATTEMPT_KEY='dreamlandRiskAttempts';
const riskSessionStartedAt=Date.now();
let riskFormStartedAt=0;
let riskInteractionCount=0;
let riskAssessmentPending=false;
let submissionRiskRequiresCaptcha=false;
let submissionRiskScore=0;
let submissionRiskReasons=[];
let submissionRiskSiteKey='';
let hcaptchaScriptPromise=null;
let hcaptchaScriptTimer=null;

const RISK_COPY={
  zh:{
    checking:'正在进行无感安全检查…',
    safe:'安全检查通过，本次提交无需验证码。',
    captcha:'检测到需要额外验证，请完成下方验证码。',
    unavailable:'安全检查暂时无法完成，请检查网络后重试。',
    captchaLoading:'正在加载安全验证…',
    captchaSlow:'验证码加载较慢，请稍候或点击重试。',
    captchaFailed:'验证码暂时无法加载，请检查网络后重试。',
    retry:'重新加载验证码',
    captchaRequired:'请先完成安全验证。',
    configError:'验证码尚未完成配置，请联系管理员。'
  },
  en:{
    checking:'Running a background security check…',
    safe:'Security check passed. No CAPTCHA is required for this submission.',
    captcha:'Additional verification is required. Complete the CAPTCHA below.',
    unavailable:'The security check is temporarily unavailable. Check your connection and retry.',
    captchaLoading:'Loading security verification…',
    captchaSlow:'Verification is taking longer than expected. Please wait or retry.',
    captchaFailed:'Verification could not be loaded. Check your connection and retry.',
    retry:'Reload verification',
    captchaRequired:'Complete the security verification first.',
    configError:'CAPTCHA has not been configured. Contact the administrator.'
  },
  ko:{
    checking:'백그라운드 보안 검사를 진행하고 있습니다…',
    safe:'보안 검사를 통과했습니다. 이번 제출에는 인증이 필요하지 않습니다.',
    captcha:'추가 인증이 필요합니다. 아래 인증을 완료해 주세요.',
    unavailable:'보안 검사를 완료할 수 없습니다. 네트워크를 확인한 후 다시 시도해 주세요.',
    captchaLoading:'보안 인증을 불러오는 중입니다…',
    captchaSlow:'인증 로딩이 지연되고 있습니다. 잠시 기다리거나 다시 시도해 주세요.',
    captchaFailed:'인증을 불러올 수 없습니다. 네트워크를 확인한 후 다시 시도해 주세요.',
    retry:'인증 다시 불러오기',
    captchaRequired:'먼저 보안 인증을 완료해 주세요.',
    configError:'CAPTCHA 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.'
  }
};
function riskText(key){return RISK_COPY[currentLang]?.[key]||RISK_COPY.zh[key]||key}
function riskThreshold(){return Math.max(1,Number(appConfig.riskControl?.threshold||3))}
function markRiskFormStart(){if(!riskFormStartedAt)riskFormStartedAt=Date.now();ensureRiskHoneypot()}
function ensureRiskHoneypot(){
  let input=document.getElementById('riskWebsite');
  if(input)return input;
  const card=document.querySelector('[data-screen="contact"] .form-card');
  if(!card)return null;
  const wrap=document.createElement('div');
  wrap.className='risk-honeypot';
  wrap.setAttribute('aria-hidden','true');
  wrap.innerHTML='<label>Website<input id="riskWebsite" name="website" type="text" tabindex="-1" autocomplete="off"></label>';
  card.appendChild(wrap);
  return document.getElementById('riskWebsite')
}
function riskHoneypotValue(){return document.getElementById('riskWebsite')?.value||''}
function recentRiskAttempts(){
  const windowMs=Math.max(60000,Number(appConfig.riskControl?.repeatWindowMs||600000));
  let values=[];try{values=JSON.parse(localStorage.getItem(RISK_ATTEMPT_KEY)||'[]')}catch(_){}
  values=values.filter(value=>Number(value)>Date.now()-windowMs);
  localStorage.setItem(RISK_ATTEMPT_KEY,JSON.stringify(values));
  return values
}
function recordRiskAttempt(){
  const values=recentRiskAttempts();
  values.push(Date.now());
  localStorage.setItem(RISK_ATTEMPT_KEY,JSON.stringify(values.slice(-10)))
}
function buildRiskContext(){
  return{
    session_elapsed_ms:Math.max(0,Date.now()-riskSessionStartedAt),
    form_elapsed_ms:riskFormStartedAt?Math.max(0,Date.now()-riskFormStartedAt):0,
    interaction_count:riskInteractionCount,
    local_attempt_count:recentRiskAttempts().length,
    timezone_offset:new Date().getTimezoneOffset(),
    language:currentLang,
    viewport:[window.innerWidth||0,window.innerHeight||0].join('x')
  }
}
function trackRiskInteraction(event){
  if(!event?.isTrusted)return;
  riskInteractionCount=Math.min(1000,riskInteractionCount+1)
}
['pointerdown','keydown','input','change'].forEach(type=>document.addEventListener(type,trackRiskInteraction,{passive:true,capture:true}));

function setRiskStatus(type,text){
  const el=document.getElementById('riskStatus');
  if(!el)return;
  el.className='risk-status'+(type?' is-'+type:'');
  el.textContent=text
}
function captchaSection(show){
  const section=document.getElementById('captchaSection');
  if(!section)return;
  if(show)section.removeAttribute('hidden');else section.setAttribute('hidden','')
}
function hcaptchaLoadTimeoutMs(){return Math.max(5000,Number(appConfig.hcaptcha?.loadTimeoutMs||12000))}
function ensureHCaptchaConnectionHints(){
  [['dns-prefetch','https://js.hcaptcha.com'],['preconnect','https://js.hcaptcha.com'],['preconnect','https://newassets.hcaptcha.com']].forEach(([rel,href])=>{
    if(document.head.querySelector(\`link[rel="\${rel}"][href="\${href}"]\`))return;
    const link=document.createElement('link');link.rel=rel;link.href=href;
    if(rel==='preconnect')link.crossOrigin='anonymous';
    document.head.appendChild(link)
  })
}
function resetHCaptchaScriptLoader(){
  if(hcaptchaScriptTimer){clearTimeout(hcaptchaScriptTimer);hcaptchaScriptTimer=null}
  hcaptchaScriptPromise=null;
  const script=document.getElementById('dreamlandHcaptchaSdk');
  if(script&&!window.hcaptcha)script.remove()
}
function loadHCaptchaScript(){
  if(appConfig.hcaptcha?.enabled===false)return Promise.resolve(null);
  if(window.hcaptcha)return Promise.resolve(window.hcaptcha);
  if(hcaptchaScriptPromise)return hcaptchaScriptPromise;
  ensureHCaptchaConnectionHints();
  hcaptchaScriptPromise=new Promise((resolve,reject)=>{
    const callbackName='onDreamlandHCaptchaReady';
    let settled=false;
    const finish=error=>{
      if(settled)return;settled=true;
      if(hcaptchaScriptTimer){clearTimeout(hcaptchaScriptTimer);hcaptchaScriptTimer=null}
      error?reject(error):resolve(window.hcaptcha)
    };
    window[callbackName]=()=>finish(window.hcaptcha?null:new Error('hCaptcha SDK unavailable'));
    let script=document.getElementById('dreamlandHcaptchaSdk');
    if(!script){
      script=document.createElement('script');
      script.id='dreamlandHcaptchaSdk';
      script.async=true;script.defer=true;
      script.src='https://js.hcaptcha.com/1/api.js?onload='+callbackName+'&render=explicit&recaptchacompat=off';
      script.onerror=()=>finish(new Error('hCaptcha script failed to load'));
      document.head.appendChild(script)
    }
    hcaptchaScriptTimer=setTimeout(()=>finish(new Error('hCaptcha load timeout')),hcaptchaLoadTimeoutMs())
  }).catch(error=>{resetHCaptchaScriptLoader();throw error});
  return hcaptchaScriptPromise
}
function preloadHCaptchaScript(){
  if(appConfig.hcaptcha?.enabled===false||navigator.onLine===false)return Promise.resolve(null);
  return loadHCaptchaScript().catch(error=>{console.warn('hCaptcha preload failed:',error);return null})
}
function retryHCaptcha(){resetHCaptchaScriptLoader();renderHCaptcha(submissionRiskSiteKey)}
async function renderHCaptcha(siteKey=submissionRiskSiteKey){
  const container=document.getElementById('hcaptchaContainer');
  if(!container||!submissionRiskRequiresCaptcha)return;
  if(!siteKey||siteKey.includes('REPLACE_WITH_')){
    container.innerHTML=\`<div class="captcha-help">\${riskText('configError')}</div>\`;
    return
  }
  container.innerHTML=\`<span class="captcha-status">\${riskText('captchaLoading')}</span>\`;
  const slowTimer=setTimeout(()=>{
    if(document.getElementById('hcaptchaContainer')===container&&!window.hcaptcha){
      container.innerHTML=\`<div><div class="captcha-help">\${riskText('captchaSlow')}</div><button class="captcha-retry" type="button" onclick="retryHCaptcha()">\${riskText('retry')}</button></div>\`
    }
  },4000);
  try{
    await loadHCaptchaScript();
    clearTimeout(slowTimer);
    if(!document.body.contains(container))return;
    if(hcaptchaWidgetId!==null){try{window.hcaptcha.remove(hcaptchaWidgetId)}catch(_){}hcaptchaWidgetId=null}
    container.innerHTML='';
    hcaptchaWidgetId=window.hcaptcha.render(container,{
      sitekey:siteKey,
      theme:'light',
      size:'normal',
      'recaptchacompat':'off'
    })
  }catch(error){
    clearTimeout(slowTimer);
    console.error('hCaptcha load failed:',error);
    if(document.body.contains(container)){
      container.innerHTML=\`<div><div class="captcha-help">\${riskText('captchaFailed')}</div><button class="captcha-retry" type="button" onclick="retryHCaptcha()">\${riskText('retry')}</button></div>\`
    }
  }
}
function hcaptchaToken(){
  if(!submissionRiskRequiresCaptcha)return '';
  try{return hcaptchaWidgetId===null?'':window.hcaptcha?.getResponse(hcaptchaWidgetId)||''}catch(_){return ''}
}
async function assessSubmissionRisk(){
  if(riskAssessmentPending)return;
  const status=document.getElementById('riskStatus');
  if(!status)return;
  riskAssessmentPending=true;
  setRiskStatus('',riskText('checking'));
  captchaSection(false);
  submissionRiskRequiresCaptcha=false;
  submissionRiskScore=0;
  submissionRiskReasons=[];
  try{
    const inquiryId=ensureInquiryId();
    const response=await fetch(web3formsEndpoint(),{
      method:'POST',
      headers:{Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify({
        action:'assess',
        payload:buildWeb3FormsPayload(inquiryId),
        risk:buildRiskContext(),
        website:riskHoneypotValue()
      })
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||'Risk assessment failed');
    submissionRiskRequiresCaptcha=data.captcha_required===true;
    submissionRiskScore=Number(data.risk_score)||0;
    submissionRiskReasons=Array.isArray(data.reasons)?data.reasons:[];
    submissionRiskSiteKey=String(data.site_key||'');
    if(submissionRiskRequiresCaptcha){
      setRiskStatus('risk',riskText('captcha'));
      captchaSection(true);
      renderHCaptcha(submissionRiskSiteKey)
    }else{
      setRiskStatus('safe',riskText('safe'));
      captchaSection(false)
    }
  }catch(error){
    console.error(error);
    setRiskStatus('error',riskText('unavailable'))
  }finally{
    riskAssessmentPending=false
  }
}
`;

  index=replaceBetween(
    index,
    'function renderHCaptcha(){',
    'function renderPreview(){',
    '',
    'old hCaptcha renderer and token helper'
  );
  index=insertBefore(index,'function renderPreview(){',adaptiveCode,'adaptive risk code');

  const newRenderPreview=`function renderPreview(){
  let c=state.contact||{},ps=state.items.filter(i=>i.type==='product'),cs=state.items.filter(i=>i.type==='custom'),inquiryId=ensureInquiryId();
  previewContent.innerHTML=\`<div class="preview-card"><h3>\${ui('inquiryNumber')}</h3>\${kv(ui('inquiryNumber'),inquiryId)}</div><div class="preview-card"><h3>\${ui('personalInfo')}</h3>\${kv(ui('nameLabel').replace(' *',''),c.name)}\${kv(ui('companyBrand'),c.company||ui('notProvided'))}\${kv(ui('countryRegion'),c.country)}\${kv(ui('cityLabel'),c.city||ui('notProvided'))}\${kv(ui('emailLabel').replace(' *',''),c.email)}\${kv(ui('contactMethod'),c.phone)}\${kv(ui('buyerType'),choiceLabel(c.buyerType)||ui('toConfirm'))}\${kv(ui('note'),c.message||ui('notProvided'))}</div><div class="preview-card"><h3>\${ui('productInquiry')}</h3>\${ps.length?ps.map(i=>kv(productDisplayName(i),\`\${i.qty} \${qtyUnit()} · MOQ \${itemMoq(i)} · \${i.size} · \${choiceLabel(i.scent)} · \${choiceLabel(i.pack||defaultPack(i.series))} · \${money(itemSubtotal(i))}\`)).join(''):kv(ui('products'),ui('none'))}</div><div class="preview-card"><h3>\${ui('customInquiry')}</h3>\${cs.length?cs.map(i=>kv(choiceLabel(i.use)||ui('customNeed'),\`\${i.qty||ui('qtyPending')} \${qtyUnit()} · \${i.budget||ui('budgetPending')} · \${choiceLabel(i.sizePref)||ui('sizeRecommend')} · \${choiceLabel(i.scent)||ui('scentRecommend')} · \${i.color||ui('colorPending')} · \${choiceLabel(i.pack)||ui('packRecommend')} · \${choiceLabel(i.branding)||ui('brandingPending')} · \${i.date||ui('datePending')}\`)).join(''):kv(ui('custom'),ui('none'))}</div><div class="preview-card"><h3>\${ui('amountEstimate')}</h3>\${kv(ui('productEstimate'),money(total()))}\${kv(ui('customPart'),ui('consultantConfirm'))}\${kv(ui('syncStatus'),web3formsReady()?ui('syncReady'):ui('syncPending'))}</div><div class="preview-card verification-card"><label class="consent-check"><input id="privacyConsent" type="checkbox"><span>\${ui('privacyAgreePrefix')} <a href="\${privacyUrl()}" target="_blank" rel="noopener">\${ui('privacyLink')}</a></span></label><div class="risk-status" id="riskStatus">\${riskText('checking')}</div><div class="captcha-section" id="captchaSection" hidden><div class="captcha-label">\${ui('captchaLabel')}</div><div class="captcha-wrap" id="hcaptchaContainer"></div></div><div class="verification-error" id="verificationError"></div></div>\`;
  requestAnimationFrame(assessSubmissionRisk)
}
`;
  index=replaceBetween(index,'function renderPreview(){','function itemText(i){',newRenderPreview,'renderPreview function');

  const newSubmit=`async function submitInquiry(){
  let btn=document.getElementById('submitBtn'),error=document.getElementById('verificationError');
  if(!btn)return;
  if(submittingInquiry){toast(ui('submissionDuplicate'));return}
  const now=Date.now(),cooldown=Math.max(0,Number(appConfig.submitCooldownMs)||10000);
  if(now-lastSubmitAttemptAt<cooldown){toast(ui('submissionCooldown'));return}
  if(!web3formsReady()){toast(ui('formNotConfigured'));return}
  const consent=document.getElementById('privacyConsent');
  if(!consent?.checked){if(error){error.textContent=ui('privacyRequired');error.classList.add('show')}toast(ui('privacyRequired'));return}
  if(submissionRiskRequiresCaptcha&&!hcaptchaToken()){
    if(error){error.textContent=riskText('captchaRequired');error.classList.add('show')}
    toast(riskText('captchaRequired'));return
  }
  if(error)error.classList.remove('show');

  submittingInquiry=true;
  btn.disabled=true;
  btn.innerHTML='<span class="loader"></span>';

  try{
    const reachable=await probeWeb3FormsReachability(true);
    if(!reachable){const offlineError=new Error('Submission service is unreachable');offlineError.code='OFFLINE';throw offlineError}
    applyPwaReachability(true,false);
    lastSubmitAttemptAt=Date.now();
    recordRiskAttempt();

    const inquiryId=ensureInquiryId(),snapshot=submissionSnapshot(inquiryId);
    const response=await fetch(web3formsEndpoint(),{
      method:'POST',
      headers:{Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify({
        action:'submit',
        payload:buildWeb3FormsPayload(inquiryId),
        risk:buildRiskContext(),
        website:riskHoneypotValue(),
        hcaptcha_token:hcaptchaToken()
      })
    });
    let data={};try{data=await response.json()}catch(_){}

    if(data.captcha_required===true){
      submissionRiskRequiresCaptcha=true;
      submissionRiskScore=Number(data.risk_score)||submissionRiskScore;
      submissionRiskReasons=Array.isArray(data.reasons)?data.reasons:submissionRiskReasons;
      submissionRiskSiteKey=String(data.site_key||submissionRiskSiteKey);
      setRiskStatus('risk',riskText('captcha'));
      captchaSection(true);
      await renderHCaptcha(submissionRiskSiteKey);
      if(error){error.textContent=riskText('captchaRequired');error.classList.add('show')}
      toast(riskText('captchaRequired'));
      return
    }
    if(!response.ok||data.success!==true)throw new Error(data.message||'Submission failed');

    archiveSubmission(snapshot);
    clearSubmittedInquiry();
    btn.textContent=ui('confirmSubmit');
    go('success')
  }catch(errorObject){
    console.error(errorObject);
    const reachable=errorObject?.code==='OFFLINE'?false:await probeWeb3FormsReachability(true);
    if(!reachable){applyPwaReachability(false,false);toast(pwaText('offlineSubmit'))}
    else{toast(ui('submitFailed'))}
    btn.textContent=ui('confirmSubmit');
    try{if(hcaptchaWidgetId!==null)window.hcaptcha?.reset(hcaptchaWidgetId)}catch(_){}
  }finally{
    submittingInquiry=false;
    btn.disabled=false
  }
}
`;
  index=replaceBetween(index,'async function submitInquiry(){','function renderSuccess(){',newSubmit,'submitInquiry function');
}

fs.writeFileSync(INDEX_PATH,index,'utf8');

const config=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
delete config.web3formsAccessKey;
config.submissionEndpoint='./api/submit';
config.web3formsEndpoint='./api/submit';
config.pwa=config.pwa||{};
config.pwa.installPromptDelayMs=5000;
config.hcaptcha=config.hcaptcha||{};
config.hcaptcha.enabled=true;
delete config.hcaptcha.siteKey;
config.hcaptcha.mode='adaptive-risk';
config.hcaptcha.loadStrategy='contact-preload-risk-preview-render';
config.hcaptcha.loadTimeoutMs=12000;
config.riskControl={
  enabled:true,
  threshold:3,
  minimumSessionMs:15000,
  minimumFormMs:8000,
  minimumInteractions:3,
  repeatWindowMs:600000,
  repeatLimit:2,
  maximumUrls:2,
  kvBinding:'RISK_STORE'
};
fs.writeFileSync(CONFIG_PATH,`${JSON.stringify(config,null,2)}\n`,'utf8');

let sw=fs.readFileSync(SW_PATH,'utf8');
const versionMatch=sw.match(/const CACHE_VERSION = 'dreamland-pwa-v(\d+)';/);
if(!versionMatch)fail('Service worker cache version not found');
const nextVersion=Number(versionMatch[1])+1;
sw=sw.replace(versionMatch[0],`const CACHE_VERSION = 'dreamland-pwa-v${nextVersion}';`);
fs.writeFileSync(SW_PATH,sw,'utf8');

fs.mkdirSync('functions/api',{recursive:true});
const functionSource=`const WEB3FORMS_URL='https://api.web3forms.com/submit';
const HCAPTCHA_VERIFY_URL='https://api.hcaptcha.com/siteverify';

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    }
  })
}
function number(value,fallback=0){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:fallback
}
function text(value,max=10000){return String(value??'').trim().slice(0,max)}
function isEmail(value){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(text(value,320))}
function countUrls(value){return (text(value,50000).match(/https?:\\/\\//gi)||[]).length}
async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')
}
function validatePayload(payload){
  if(!payload||typeof payload!=='object')return 'Missing payload';
  if(text(payload.contact_name,160).length<2)return 'Invalid contact name';
  if(!text(payload.country_or_region,160))return 'Missing country or region';
  if(!isEmail(payload.email_address))return 'Invalid email address';
  if(text(payload.phone_or_wechat,200).length<5)return 'Invalid contact method';
  if(number(payload.product_count)+number(payload.custom_count)<1)return 'Inquiry is empty';
  if(text(payload.items_summary,50000).length<5)return 'Inquiry summary is missing';
  return ''
}
function evaluateRisk(request,body){
  const payload=body.payload||{};
  const risk=body.risk||{};
  const reasons=[];
  let score=0;
  const add=(points,reason)=>{score+=points;reasons.push(reason)};

  const origin=request.headers.get('Origin');
  const ownOrigin=new URL(request.url).origin;
  if(origin&&origin!==ownOrigin)add(5,'origin_mismatch');
  if(!request.headers.get('User-Agent'))add(2,'missing_user_agent');
  if(number(risk.session_elapsed_ms)<15000)add(2,'very_fast_session');
  if(number(risk.form_elapsed_ms)<8000)add(2,'very_fast_form');
  if(number(risk.interaction_count)<3)add(1,'few_interactions');
  if(number(risk.local_attempt_count)>=2)add(2,'repeated_local_attempts');
  if(countUrls(payload.message)+countUrls(payload.items_summary)>2)add(2,'many_urls');
  if(JSON.stringify(payload).length>60000)add(2,'oversized_payload');

  return{score,reasons}
}
async function readPersistentRisk(env,request,body,result){
  if(!env.RISK_STORE)return result;
  const ip=text(request.headers.get('CF-Connecting-IP')||'unknown',128);
  const email=text(body.payload?.email_address||'',320).toLowerCase();
  const signature=text(body.payload?.items_summary||'',50000);
  const ipKey='ip:'+await sha256(ip);
  const duplicateKey='dup:'+await sha256(email+'|'+signature);
  const ipCount=number(await env.RISK_STORE.get(ipKey));
  const duplicateCount=number(await env.RISK_STORE.get(duplicateKey));
  if(ipCount>=2){result.score+=3;result.reasons.push('ip_rate_limit')}
  if(duplicateCount>=1){result.score+=2;result.reasons.push('duplicate_submission')}
  result.storage={ipKey,duplicateKey,ipCount,duplicateCount};
  return result
}
async function recordPersistentRisk(env,result){
  if(!env.RISK_STORE||!result.storage)return;
  await Promise.all([
    env.RISK_STORE.put(result.storage.ipKey,String(result.storage.ipCount+1),{expirationTtl:600}),
    env.RISK_STORE.put(result.storage.duplicateKey,String(result.storage.duplicateCount+1),{expirationTtl:3600})
  ])
}
async function verifyHCaptcha(env,token,request){
  if(!env.HCAPTCHA_SECRET||!env.HCAPTCHA_SITE_KEY){
    return{success:false,configuration_error:true,error_codes:['missing-server-configuration']}
  }
  const form=new URLSearchParams();
  form.set('secret',env.HCAPTCHA_SECRET);
  form.set('response',token);
  form.set('sitekey',env.HCAPTCHA_SITE_KEY);
  const remoteip=request.headers.get('CF-Connecting-IP');
  if(remoteip)form.set('remoteip',remoteip);
  const response=await fetch(HCAPTCHA_VERIFY_URL,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:form
  });
  if(!response.ok)return{success:false,error_codes:['siteverify-http-'+response.status]};
  return response.json()
}
async function forwardToWeb3Forms(env,payload){
  if(!env.WEB3FORMS_ACCESS_KEY)throw new Error('WEB3FORMS_ACCESS_KEY is not configured');
  const form=new FormData();
  form.append('access_key',env.WEB3FORMS_ACCESS_KEY);
  for(const [key,value] of Object.entries(payload)){
    if(key==='access_key')continue;
    form.append(key,value&&typeof value==='object'?JSON.stringify(value):String(value??''))
  }
  const response=await fetch(WEB3FORMS_URL,{
    method:'POST',
    headers:{Accept:'application/json'},
    body:form
  });
  let data={};try{data=await response.json()}catch(_){}
  if(!response.ok||data.success!==true){
    throw new Error(data.message||'Web3Forms submission failed')
  }
  return data
}

export async function onRequestGet(){
  return json({success:true,service:'dreamland-submit',status:'ready'})
}

export async function onRequestPost(context){
  const{request,env}=context;
  let body={};try{body=await request.json()}catch(_){return json({success:false,message:'Invalid JSON body'},400)}
  const validationError=validatePayload(body.payload);
  if(validationError)return json({success:false,message:validationError},400);

  if(text(body.website,500)){
    return json({success:true,filtered:true})
  }

  let result=evaluateRisk(request,body);
  result=await readPersistentRisk(env,request,body,result);
  const threshold=Math.max(1,number(env.RISK_THRESHOLD,3));
  const captchaRequired=result.score>=threshold;
  const assessment={
    success:true,
    captcha_required:captchaRequired,
    risk_score:result.score,
    reasons:result.reasons,
    site_key:captchaRequired?text(env.HCAPTCHA_SITE_KEY,200):''
  };

  if(body.action==='assess')return json(assessment);
  if(body.action!=='submit')return json({success:false,message:'Unsupported action'},400);

  if(captchaRequired){
    const token=text(body.hcaptcha_token,10000);
    if(!token)return json({...assessment,success:false,message:'CAPTCHA required'},428);
    const verification=await verifyHCaptcha(env,token,request);
    if(!verification.success){
      const status=verification.configuration_error?500:403;
      return json({...assessment,success:false,message:verification.configuration_error?'CAPTCHA server configuration is missing':'CAPTCHA verification failed',captcha_errors:verification['error-codes']||verification.error_codes||[]},status)
    }
  }

  try{
    const web3forms=await forwardToWeb3Forms(env,body.payload);
    await recordPersistentRisk(env,result);
    return json({success:true,captcha_used:captchaRequired,risk_score:result.score,web3forms})
  }catch(error){
    console.error(error);
    return json({success:false,message:'Submission service failed'},502)
  }
}
`;
fs.writeFileSync(FUNCTION_PATH,functionSource,'utf8');

const functionCheck=await import('node:child_process');
functionCheck.execFileSync(process.execPath,['--check',FUNCTION_PATH],{stdio:'inherit'});

const validator=`import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const fn=fs.readFileSync('functions/api/submit.js','utf8');
const errors=[];

[
  'function assessSubmissionRisk(){',
  'function preloadHCaptchaScript(){',
  "if(n==='contact'){markRiskFormStart();preloadHCaptchaScript()}",
  "submissionRiskRequiresCaptcha",
  "action:'assess'",
  "action:'submit'",
  "risk-honeypot"
].forEach(marker=>{if(!index.includes(marker))errors.push('Missing index marker: '+marker)});

if(index.includes('https://js.hcaptcha.com/1/api.js?render=explicit\\" async defer'))errors.push('Static hCaptcha script still exists');
if(Number(config.pwa?.installPromptDelayMs)!==5000)errors.push('Install prompt delay is not 5000ms');
if(config.hcaptcha?.mode!=='adaptive-risk')errors.push('hCaptcha mode is not adaptive-risk');
if(config.riskControl?.enabled!==true)errors.push('Risk control is not enabled');
if(config.submissionEndpoint!=='./api/submit')errors.push('Submission endpoint is incorrect');
if('web3formsAccessKey' in config)errors.push('Public Web3Forms access key still exists');
[
  'export async function onRequestPost',
  'api.hcaptcha.com/siteverify',
  'WEB3FORMS_ACCESS_KEY',
  'HCAPTCHA_SECRET',
  'HCAPTCHA_SITE_KEY',
  'RISK_STORE',
  'captcha_required'
].forEach(marker=>{if(!fn.includes(marker))errors.push('Missing function marker: '+marker)});
if(!/const CACHE_VERSION = 'dreamland-pwa-v\\d+';/.test(sw))errors.push('Service worker version is missing');

if(errors.length){console.error(errors.join('\\n'));process.exit(1)}
console.log('Adaptive risk control validation passed.');
`;
fs.writeFileSync('scripts/validate-adaptive-risk-hcaptcha.mjs',validator,'utf8');

if(fs.existsSync(WORKFLOW_PATH))fs.rmSync(WORKFLOW_PATH);
if(fs.existsSync(SELF_PATH))fs.rmSync(SELF_PATH);

console.log(`Adaptive risk control applied. Service worker upgraded to v${nextVersion}.`);

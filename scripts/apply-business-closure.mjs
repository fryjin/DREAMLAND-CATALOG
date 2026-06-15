import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const SERIES_PATH = 'data/series.json';
const PRODUCTS_PATH = 'data/products.json';
const I18N_PATH = 'data/i18n.json';
const CONFIG_PATH = 'data/app-config.json';
const SW_PATH = 'sw.js';
const WORKFLOW_PATH = '.github/workflows/apply-business-closure.yml';
const SELF_PATH = 'scripts/apply-business-closure.mjs';

function fail(message) {
  throw new Error(`[business-closure] ${message}`);
}

function readJson(path) {
  if (!fs.existsSync(path)) fail(`Missing required file: ${path}`);
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`Could not find ${label || startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`Could not find end marker for ${label || startMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) fail(`Could not find ${label || search.slice(0, 80)}`);
  return source.replace(search, replacement);
}

function addUi(dict, values) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in dict)) dict[key] = value;
  }
}

const seriesData = readJson(SERIES_PATH);
const productData = readJson(PRODUCTS_PATH);
const i18nData = readJson(I18N_PATH);

const defaultMoqBySeries = {
  advanced: 50,
  masterpiece: 50,
  holiday: 100,
  classic: 100
};

for (const [key, series] of Object.entries(seriesData.series || {})) {
  if (!Number.isFinite(Number(series.defaultMoq)) || Number(series.defaultMoq) < 1) {
    series.defaultMoq = defaultMoqBySeries[key] || 50;
  }
  if (!series.moqStatus) series.moqStatus = 'placeholder';
}

for (const product of productData.products || []) {
  const defaultMoq = Number(seriesData.series?.[product.series]?.defaultMoq || 50);
  if (!Number.isFinite(Number(product.moq)) || Number(product.moq) < 1) {
    product.moq = defaultMoq;
  }
  if (!product.moqStatus) product.moqStatus = 'placeholder';
}

writeJson(SERIES_PATH, seriesData);
writeJson(PRODUCTS_PATH, productData);

const ui = i18nData.ui || (i18nData.ui = {});
ui.zh ||= {};
ui.en ||= {};
ui.ko ||= {};

addUi(ui.zh, {
  moq: '起订量',
  moqHint: '最低起订量',
  invalidEmail: '请输入有效的邮箱地址',
  invalidName: '联系人姓名至少填写 2 个字符',
  invalidPhone: '请填写有效的 WhatsApp、手机或微信联系方式',
  minQtyError: '数量不得低于该商品起订量',
  customMinQtyError: '定制数量不得低于最低起订量',
  quantityTooLarge: '数量超出可提交范围，请联系顾问确认',
  privacyAgreePrefix: '我已阅读并同意',
  privacyLink: '隐私说明',
  privacyRequired: '请先阅读并同意隐私说明',
  captchaLabel: '人机验证',
  captchaRequired: '请先完成人机验证',
  submissionDuplicate: '正在提交，请勿重复点击',
  submissionCooldown: '提交过于频繁，请稍后再试',
  inquiryNumber: '意向编号',
  formNotConfigured: '提交接口尚未配置，请先填写 Web3Forms Access Key',
  submissionArchived: '本次意向已归档，当前意向单已清空。',
  archiveStatus: '已归档',
  requiredFieldsInvalid: '请检查并修正必填信息',
  captchaLoading: '正在加载人机验证…'
});

addUi(ui.en, {
  moq: 'MOQ',
  moqHint: 'Minimum order quantity',
  invalidEmail: 'Please enter a valid email address.',
  invalidName: 'Please enter at least 2 characters for the contact name.',
  invalidPhone: 'Please enter a valid WhatsApp, phone or WeChat contact.',
  minQtyError: 'Quantity cannot be lower than the product MOQ.',
  customMinQtyError: 'Custom quantity cannot be lower than the minimum MOQ.',
  quantityTooLarge: 'Quantity exceeds the online submission limit. Please contact our consultant.',
  privacyAgreePrefix: 'I have read and agree to the',
  privacyLink: 'Privacy Notice',
  privacyRequired: 'Please read and accept the Privacy Notice.',
  captchaLabel: 'Human verification',
  captchaRequired: 'Please complete the human verification.',
  submissionDuplicate: 'Submission is in progress. Please do not submit again.',
  submissionCooldown: 'Too many submission attempts. Please try again shortly.',
  inquiryNumber: 'Inquiry ID',
  formNotConfigured: 'The submission service is not configured. Add the Web3Forms Access Key first.',
  submissionArchived: 'This inquiry has been archived and the current inquiry list has been cleared.',
  archiveStatus: 'Archived',
  requiredFieldsInvalid: 'Please review and correct the required information.',
  captchaLoading: 'Loading human verification…'
});

addUi(ui.ko, {
  moq: '최소 주문 수량',
  moqHint: '최소 주문 수량',
  invalidEmail: '유효한 이메일 주소를 입력해 주세요.',
  invalidName: '담당자 이름을 2자 이상 입력해 주세요.',
  invalidPhone: '유효한 WhatsApp, 휴대폰 또는 WeChat 연락처를 입력해 주세요.',
  minQtyError: '수량은 해당 상품의 최소 주문 수량보다 적을 수 없습니다.',
  customMinQtyError: '맞춤 수량은 최소 주문 수량보다 적을 수 없습니다.',
  quantityTooLarge: '온라인 제출 가능 수량을 초과했습니다. 담당자에게 문의해 주세요.',
  privacyAgreePrefix: '다음 내용을 읽고 동의합니다:',
  privacyLink: '개인정보 안내',
  privacyRequired: '개인정보 안내를 읽고 동의해 주세요.',
  captchaLabel: '사람 확인',
  captchaRequired: '사람 확인을 완료해 주세요.',
  submissionDuplicate: '제출 중입니다. 중복 제출하지 마세요.',
  submissionCooldown: '제출이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
  inquiryNumber: '의향 번호',
  formNotConfigured: '제출 서비스가 설정되지 않았습니다. Web3Forms Access Key를 먼저 입력해 주세요.',
  submissionArchived: '이번 의향이 보관되었으며 현재 의향 목록은 비워졌습니다.',
  archiveStatus: '보관 완료',
  requiredFieldsInvalid: '필수 정보를 확인하고 수정해 주세요.',
  captchaLoading: '사람 확인을 불러오는 중…'
});

writeJson(I18N_PATH, i18nData);

const appConfig = {
  schemaVersion: 1,
  web3formsEndpoint: 'https://api.web3forms.com/submit',
  web3formsAccessKey: 'REPLACE_WITH_WEB3FORMS_ACCESS_KEY',
  hcaptcha: {
    enabled: true,
    siteKey: '50b2fe65-b00b-4b9e-ad62-3ba471098be2'
  },
  privacyUrl: './privacy.html',
  privacyVersion: '2026-06-15',
  customMoq: 50,
  maxQuantity: 1000000,
  archiveLimit: 20,
  submitCooldownMs: 10000
};
writeJson(CONFIG_PATH, appConfig);

const privacyHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f3f4f8">
<title>DREAMLAND Privacy Notice</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f4f8;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;padding:24px;line-height:1.7}.wrap{width:min(100%,760px);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}.brand{font-size:18px;font-weight:900}.langs{display:flex;gap:8px}.langs button{border:0;border-radius:999px;padding:8px 12px;background:#fff;font-weight:800;cursor:pointer}.langs button.active{background:#111;color:#fff}.card{background:#fff;border-radius:26px;padding:28px;box-shadow:0 14px 40px rgba(0,0,0,.07)}h1{font-size:26px;line-height:1.25;margin:0 0 8px}h2{font-size:17px;margin:24px 0 8px}p,li{font-size:14px;color:#555}ul{padding-left:20px}.meta{font-size:12px;color:#92949b;margin-bottom:22px}.lang-section{display:none}.lang-section.active{display:block}.back{display:inline-flex;margin-top:18px;text-decoration:none;color:#111;font-weight:850}@media(max-width:560px){body{padding:14px}.card{padding:22px 18px}.top{align-items:flex-start;flex-direction:column}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><div class="brand">DREAMLAND</div><div class="langs"><button data-lang="zh">中文</button><button data-lang="en">EN</button><button data-lang="ko">한국어</button></div></div>
  <div class="card">
    <section class="lang-section" data-section="zh">
      <h1>隐私说明</h1><div class="meta">版本：2026-06-15</div>
      <p>本说明适用于 DREAMLAND 产品电子手册中的询盘、报价与定制需求提交。</p>
      <h2>我们收集的信息</h2><ul><li>联系人姓名、公司或品牌名称；</li><li>国家、城市、邮箱及 WhatsApp、手机或微信；</li><li>所选商品、数量、定制、包装、预算、交付时间及备注。</li></ul>
      <h2>使用目的</h2><p>上述信息仅用于报价、产品与定制确认、物流评估、订单沟通及必要的售后跟进。</p>
      <h2>第三方处理</h2><p>表单通过 Web3Forms 处理并转发至我们的业务邮箱。人机验证由 hCaptcha 提供。相关服务可能按照各自隐私政策处理必要的技术数据。</p>
      <h2>保存与删除</h2><p>询盘记录仅在业务跟进所需期间保存，通常不超过 12 个月；已进入交易或依法需要保存的记录除外。你可以通过下方邮箱申请查阅、更正或删除。</p>
      <h2>联系方式</h2><p>Indulgence (Guangzhou) Cultural and Creative Co., Ltd.<br>邮箱：unboundcandleart@163.com</p>
    </section>
    <section class="lang-section" data-section="en">
      <h1>Privacy Notice</h1><div class="meta">Version: 2026-06-15</div>
      <p>This notice applies to inquiries, quotation requests and customization requests submitted through the DREAMLAND product catalog.</p>
      <h2>Information we collect</h2><ul><li>Contact name and company or brand name;</li><li>Country, city, email and WhatsApp, phone or WeChat contact;</li><li>Selected products, quantities, customization, packaging, budget, delivery requirements and notes.</li></ul>
      <h2>How we use it</h2><p>We use the information only for quotation, product and customization confirmation, logistics evaluation, transaction communication and necessary follow-up.</p>
      <h2>Third-party processing</h2><p>Submissions are processed by Web3Forms and forwarded to our business email. Human verification is provided by hCaptcha. These services may process necessary technical data under their own privacy policies.</p>
      <h2>Retention and deletion</h2><p>Inquiry records are retained only as long as required for business follow-up, normally no longer than 12 months, except where an active transaction or law requires longer retention. You may request access, correction or deletion by email.</p>
      <h2>Contact</h2><p>Indulgence (Guangzhou) Cultural and Creative Co., Ltd.<br>Email: unboundcandleart@163.com</p>
    </section>
    <section class="lang-section" data-section="ko">
      <h1>개인정보 안내</h1><div class="meta">버전: 2026-06-15</div>
      <p>본 안내는 DREAMLAND 제품 카탈로그를 통해 제출되는 문의, 견적 및 맞춤 요청에 적용됩니다.</p>
      <h2>수집 정보</h2><ul><li>담당자 이름, 회사 또는 브랜드명;</li><li>국가, 도시, 이메일, WhatsApp, 휴대폰 또는 WeChat 연락처;</li><li>선택 상품, 수량, 맞춤, 포장, 예산, 납기 및 비고.</li></ul>
      <h2>이용 목적</h2><p>수집 정보는 견적, 상품 및 맞춤 확인, 물류 검토, 거래 커뮤니케이션과 필요한 후속 연락에만 사용합니다.</p>
      <h2>제3자 처리</h2><p>제출 정보는 Web3Forms를 통해 처리되어 당사 업무 이메일로 전달됩니다. 사람 확인은 hCaptcha가 제공합니다. 해당 서비스는 각자의 개인정보 정책에 따라 필요한 기술 데이터를 처리할 수 있습니다.</p>
      <h2>보관 및 삭제</h2><p>문의 기록은 업무 후속 처리에 필요한 기간 동안만 보관하며, 일반적으로 12개월을 넘지 않습니다. 진행 중인 거래 또는 법적 보관 의무가 있는 경우는 제외됩니다. 이메일로 열람, 수정 또는 삭제를 요청할 수 있습니다.</p>
      <h2>연락처</h2><p>Indulgence (Guangzhou) Cultural and Creative Co., Ltd.<br>이메일: unboundcandleart@163.com</p>
    </section>
    <a class="back" href="./">← DREAMLAND</a>
  </div>
</div>
<script>
const supported=['zh','en','ko'];
function showLang(lang){if(!supported.includes(lang))lang='zh';document.documentElement.lang=lang==='zh'?'zh-CN':lang==='ko'?'ko-KR':'en';document.querySelectorAll('[data-section]').forEach(el=>el.classList.toggle('active',el.dataset.section===lang));document.querySelectorAll('[data-lang]').forEach(el=>el.classList.toggle('active',el.dataset.lang===lang));history.replaceState(null,'','#'+lang)}
document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>showLang(button.dataset.lang)));
showLang(location.hash.replace('#','')||localStorage.getItem('productManualLang')||'zh');
</script>
</body>
</html>`;
fs.writeFileSync('privacy.html', privacyHtml, 'utf8');

let html = fs.readFileSync(INDEX_PATH, 'utf8');

const extraCss = `
.moq-note{font-size:10px;color:#9a9ca3;font-weight:800;white-space:nowrap}.validation-note{margin-top:8px;color:#c94747;font-size:11px;line-height:1.45;font-weight:750}.verification-card{display:flex;flex-direction:column;gap:16px}.consent-check{display:flex;align-items:flex-start;gap:10px;font-size:12px;line-height:1.55;color:#666;cursor:pointer}.consent-check input{width:18px;height:18px;margin-top:1px;flex:none;accent-color:#111}.consent-check a{color:#111;font-weight:850;text-underline-offset:3px}.captcha-label{font-size:12px;font-weight:850;color:#444}.captcha-wrap{min-height:78px;display:flex;align-items:center}.captcha-status{font-size:12px;color:#8e9098}.verification-error{display:none;color:#c94747;font-size:12px;font-weight:800}.verification-error.show{display:block}.submit-consent{display:none}.archive-note{margin-top:12px;font-size:12px;line-height:1.55;color:#777;text-align:center}
`;
if (!html.includes('.verification-card{')) {
  html = html.replace('</style>', `${extraCss}</style>`);
}

if (!html.includes('js.hcaptcha.com/1/api.js')) {
  html = html.replace('</head>', '<script src="https://js.hcaptcha.com/1/api.js?render=explicit" async defer></script>\n</head>');
}

html = replaceOnce(
  html,
  "let languageNames={};\nlet defaultSeries='advanced';",
  `let languageNames={};\nlet appConfig={};\nlet defaultSeries='advanced';\nconst SUBMISSION_ARCHIVE_KEY='dreamlandInquiryArchiveV1';\nconst LAST_SUBMISSION_KEY='dreamlandLastSubmissionV1';\nlet pendingInquiryId='';\nlet hcaptchaWidgetId=null;\nlet submittingInquiry=false;\nlet lastSubmitAttemptAt=0;`,
  'application state variables'
);

const newLoader = `async function loadCatalogData(){
  const [seriesResponse,productsResponse,i18nResponse,configResponse]=await Promise.all([
    fetch('./data/series.json',{cache:'no-cache'}),
    fetch('./data/products.json',{cache:'no-cache'}),
    fetch('./data/i18n.json',{cache:'no-cache'}),
    fetch('./data/app-config.json',{cache:'no-cache'})
  ]);
  const responses=[seriesResponse,productsResponse,i18nResponse,configResponse];
  if(responses.some(response=>!response.ok)){
    throw new Error('Catalog data request failed: '+responses.map(response=>response.status).join(','));
  }
  const [seriesData,productsData,i18nData,configData]=await Promise.all(responses.map(response=>response.json()));
  defaultSeries=seriesData.defaultSeries||seriesData.seriesOrder?.[0]||'advanced';
  patternsBySize=seriesData.patternsBySize||{};
  sizeDims=seriesData.sizes||{};
  products=Array.isArray(productsData.products)?productsData.products:[];
  currencyMap=i18nData.currencyMap||{};
  uiDict=i18nData.ui||{};
  choiceMaps=i18nData.choices||{};
  languageNames=i18nData.languageNames||{};
  appConfig=configData||{};
  seriesMeta={};
  seriesTabLabels={zh:{},en:{},ko:{}};
  (seriesData.seriesOrder||Object.keys(seriesData.series||{})).forEach(key=>{
    const item=seriesData.series?.[key];
    if(!item)return;
    seriesMeta[key]={
      name:item.labels?.zh||key,
      count:Number(item.count)||products.filter(product=>product.series===key).length,
      price:Array.isArray(item.prices)?item.prices:[0,0,0],
      scents:Array.isArray(item.scents)?item.scents:[],
      packaging:item.packaging||{options:['防震包装'],default:'防震包装',surchargesCny:{}},
      defaultMoq:Number(item.defaultMoq)||50
    };
    ['zh','en','ko'].forEach(lang=>{
      seriesTabLabels[lang][key]=item.labels?.[lang]||item.labels?.zh||key;
    });
  });
}`;
html = replaceRange(html, 'async function loadCatalogData(){', '\n\nfunction seriesTabLabel', newLoader, 'loadCatalogData');

html = replaceOnce(
  html,
  "  activeProduct=products[0]||null;\n  bindCtaReveal();",
  "  activeProduct=products[0]||null;\n  applyRuntimeLimits();\n  bindCtaReveal();",
  'runtime quantity limits'
);

const serviceConfig = `function web3formsAccessKey(){return String(appConfig.web3formsAccessKey||'').trim()}
function web3formsEndpoint(){return appConfig.web3formsEndpoint||'https://api.web3forms.com/submit'}
function web3formsReady(){
  const key=web3formsAccessKey();
  return key.length>10&&!key.includes('REPLACE_WITH_');
}`;
html = replaceRange(html, "const WEB3FORMS_ENDPOINT=", "\n['catalogInquiry'", serviceConfig, 'Web3Forms configuration');

const productHelpers = `function productMoq(product){
  if(!product)return 1;
  const own=Number(product.moq);
  if(Number.isInteger(own)&&own>0)return own;
  return Number(seriesMeta[product.series]?.defaultMoq)||1;
}
function itemMoq(item){
  const own=Number(item?.moq);
  if(Number.isInteger(own)&&own>0)return own;
  const product=products.find(p=>p.id===(item?.productId||item?.id));
  return productMoq(product||item);
}
function maximumQuantity(){return Math.max(1,Number(appConfig.maxQuantity)||1000000)}
function customMoq(){return Math.max(1,Number(appConfig.customMoq)||50)}
function normalizeQty(value,min=1){
  let quantity=Number(value);
  if(!Number.isFinite(quantity))quantity=min;
  quantity=Math.trunc(quantity);
  return Math.min(maximumQuantity(),Math.max(min,quantity));
}
function generateInquiryId(){
  const now=new Date();
  const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('');
  const bytes=new Uint8Array(4);
  if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);else bytes.forEach((_,index)=>bytes[index]=Math.floor(Math.random()*256));
  const code=[...bytes].map(value=>value.toString(36).padStart(2,'0')).join('').slice(0,6).toUpperCase();
  return \`DL-\${date}-\${code}\`;
}
function ensureInquiryId(){if(!pendingInquiryId)pendingInquiryId=generateInquiryId();return pendingInquiryId}
function privacyUrl(){return (appConfig.privacyUrl||'./privacy.html')+'#'+currentLang}
function applyRuntimeLimits(){let el=document.getElementById('customQty');if(el){el.min=customMoq();el.max=maximumQuantity();el.placeholder=String(customMoq())+'+'}}
`;
html = replaceOnce(html, 'function qtyUnit(){return ui(\'pieces\')}', `${productHelpers}function qtyUnit(){return ui('pieces')}`, 'product validation helpers');

html = replaceOnce(
  html,
  `setText('[data-screen="inquiry"] .page-title','inquiryTitle');setText('[data-screen="inquiry"] .page-sub','inquirySub');setText('[data-screen="inquiry"] .header .text-btn span','clear');setText('[data-screen="inquiry"] .sticky-action .btn','submitInquiry');`,
  `setText('[data-screen="inquiry"] .page-title','inquiryTitle');setText('[data-screen="inquiry"] .page-sub','inquirySub');setText('[data-screen="inquiry"] .header .icon-btn span','clear');setText('[data-screen="inquiry"] .sticky-action .btn','submitInquiry');`,
  'inquiry clear translation selector'
);
html = replaceOnce(
  html,
  `setText('.success-title','successTitle');let ss=document.querySelectorAll('.success-sub');if(ss[0])ss[0].textContent=ui('successSub1');if(ss[1])ss[1].textContent=ui('successSub2');setText('.success-actions .btn','continueSelect');`,
  `setText('.success-title','successTitle');let ss=document.querySelector('.success-sub');if(ss)ss.innerHTML=ui('successSub1')+'<br>'+ui('successSub2');let archiveNote=document.querySelector('.archive-note');if(archiveNote)archiveNote.textContent=ui('submissionArchived');setText('.success-actions .btn','continueSelect');`,
  'success message translation'
);

const renderProductCard = `function renderProductCard(p,idx,tall=false){return \`<article class="product-card \${tall?'tall':''}" style="animation-delay:\${Math.min(idx%CATALOG_BATCH_SIZE,4)*42}ms" onclick="openDetail('\${p.id}')"><div class="product-visual"><div class="product-img \${p.color}"></div><img class="product-cover" src="\${p.cover}" alt="\${productDisplayName(p)}" loading="lazy" decoding="async" onerror="imgMiss(this)"></div><button class="add-mini" onclick="event.stopPropagation();quickAdd('\${p.id}')">+</button><div class="product-name">\${productDisplayName(p)}</div><div class="price-row"><span class="price">\${money(seriesMeta[p.series].price[1])}</span><span class="moq-note">\${ui('moq')} \${productMoq(p)}</span></div></article>\`}
`;
html = replaceRange(html, 'function renderProductCard(', 'function cancelCatalogRender', renderProductCard, 'renderProductCard');

const openDetail = `function openDetail(id){cancelCatalogRender();activeProduct=products.find(p=>p.id===id)||products[0];if(!activeProduct)return;let m=seriesMeta[activeProduct.series];let min=productMoq(activeProduct);config={size:activeProduct.size,scent:m.scents[0],pattern:patternsBySize[activeProduct.size][0],pack:defaultPack(activeProduct.series),qty:min};detailSlideIndex=0;renderDetail();go('detail')}
`;
html = replaceRange(html, 'function openDetail(', 'function renderDetailMedia', openDetail, 'openDetail');

const renderDetail = `function renderDetail(){
  renderDetailMedia();
  let meta=seriesMeta[activeProduct.series],min=productMoq(activeProduct);
  config.qty=normalizeQty(config.qty,min);
  configCard.innerHTML=block(ui('size'),'size',['S','M','L','XL'],ui('sizeHint'))+block(ui('scent'),'scent',meta.scents,\`\${seriesLabel(activeProduct.series)} \${ui('scentHint')}\`)+block(ui('pattern'),'pattern',patternsBySize[config.size],ui('patternHint'))+block(ui('pack'),'pack',packOptions(activeProduct.series),packHint(activeProduct.series))+\`<div class="config-block"><div class="config-title"><h3>\${ui('quantity')}</h3><span>\${ui('moqHint')} \${min}</span></div><div class="qty-bar"><div><div class="summary-label">\${ui('currentUnitPrice')}</div><div class="amount">\${money(configUnit())}</div></div><div class="qty-stepper"><button class="step" onclick="changeDetailQty(-QTY_STEP)">−</button><input class="qty qty-input" id="detailQty" type="number" min="\${min}" max="\${maximumQuantity()}" step="\${QTY_STEP}" value="\${config.qty}" inputmode="numeric" onchange="setDetailQty(this.value)"><button class="step" onclick="changeDetailQty(QTY_STEP)">+</button></div></div></div>\`;
  requestAnimationFrame(bindHorizontalOptions)
}
`;
html = replaceRange(html, 'function renderDetail(){', 'function block(', renderDetail, 'renderDetail');

const quantityFunctions = `function setCfg(k,v){config[k]=v;if(k==='size')config.pattern=patternsBySize[v][0];if(k==='pack'&&!packOptions(activeProduct.series).includes(config.pack))config.pack=defaultPack(activeProduct.series);renderDetail()}
function setDetailQty(v){let min=productMoq(activeProduct),raw=Number(v);if(!Number.isFinite(raw)||raw<min)toast(ui('minQtyError'));if(raw>maximumQuantity())toast(ui('quantityTooLarge'));config.qty=normalizeQty(v,min);let el=document.getElementById('detailQty');if(el)el.value=config.qty;renderDetail()}
function changeDetailQty(d){config.qty=normalizeQty(Number(config.qty)+d,productMoq(activeProduct));renderDetail()}
`;
html = replaceRange(html, 'function setCfg(', 'function quickAdd(', quantityFunctions, 'quantity functions');

const addFunctions = `function quickAdd(id){
  let p=products.find(x=>x.id===id);if(!p)return;
  let m=seriesMeta[p.series],s=p.size,min=productMoq(p);
  state.items.push({id:uid(),type:'product',productId:p.id,name:p.name,names:p.names,series:p.series,color:p.color,cover:p.cover,moq:min,size:s,scent:m.scents[0],pattern:patternsBySize[s][0],pack:defaultPack(p.series),qty:min});
  save();toast(toastText('addedInquiry'))
}
function addConfiguredProduct(){
  if(!activeProduct)return;
  let min=productMoq(activeProduct);
  config.qty=normalizeQty(config.qty,min);
  state.items.push({id:uid(),type:'product',productId:activeProduct.id,name:activeProduct.name,names:activeProduct.names,series:activeProduct.series,color:activeProduct.color,cover:activeProduct.cover,moq:min,...config});
  save();toast(toastText('addedInquiry'));go('inquiry')
}
`;
html = replaceRange(html, 'function quickAdd(', 'function renderInquiry(', addFunctions, 'add-to-inquiry functions');

html = html.replace('min="${QTY_MIN}" step="${QTY_STEP}" value="${i.qty}"', 'min="${itemMoq(i)}" max="${maximumQuantity()}" step="${QTY_STEP}" value="${i.qty}"');

const itemQtyFunctions = `function qty(id,d){let i=state.items.find(x=>x.id===id);if(!i||i.type!=='product')return;i.qty=normalizeQty(Number(i.qty)+d,itemMoq(i));save();renderInquiry()}
function setItemQty(id,v){let i=state.items.find(x=>x.id===id);if(!i||i.type!=='product')return;let min=itemMoq(i),raw=Number(v);if(!Number.isFinite(raw)||raw<min)toast(ui('minQtyError'));if(raw>maximumQuantity())toast(ui('quantityTooLarge'));i.qty=normalizeQty(v,min);save();renderInquiry()}
`;
html = replaceRange(html, 'function qty(id,d)', 'function del(id)', itemQtyFunctions, 'inquiry quantity functions');

const addCustom = `function addCustomIntent(){
  document.querySelectorAll('[data-screen="custom"] .field').forEach(f=>f.classList.remove('invalid'));
  let use=fieldValue('customUse'),rawQty=Number(fieldValue('customQty')),min=customMoq(),ok=true;
  if(!use){document.getElementById('customUse').closest('.field').classList.add('invalid');ok=false}
  if(!Number.isInteger(rawQty)||rawQty<min||rawQty>maximumQuantity()){
    document.getElementById('customQty').closest('.field').classList.add('invalid');
    toast(rawQty>maximumQuantity()?ui('quantityTooLarge'):ui('customMinQtyError'));
    ok=false
  }
  if(!ok)return;
  state.items.push({
    id:uid(),type:'custom',use,qty:rawQty,moq:min,
    budget:fieldValue('customBudget'),date:fieldValue('customDate'),sizePref:fieldValue('customSize'),
    scent:fieldValue('customScent'),color:fieldValue('customColor'),pack:fieldValue('customPack'),
    branding:fieldValue('customBranding'),note:fieldValue('customNote')
  });
  save();toast(toastText('addedCustom'));go('inquiry')
}
`;
html = replaceRange(html, 'function addCustomIntent(){', 'function fieldValue(', addCustom, 'custom inquiry validation');

const goPreview = `function goPreview(){
  document.querySelectorAll('[data-screen="contact"] .field').forEach(f=>f.classList.remove('invalid'));
  let c=collect(),ok=true,emailEl=document.getElementById('email');
  if(c.name.length<2){document.getElementById('name').closest('.field').classList.add('invalid');toast(ui('invalidName'));ok=false}
  if(!c.country){document.getElementById('country').closest('.field').classList.add('invalid');ok=false}
  if(!emailEl||!c.email||!emailEl.checkValidity()){emailEl?.closest('.field')?.classList.add('invalid');toast(ui('invalidEmail'));ok=false}
  if(c.phone.length<5){document.getElementById('phone').closest('.field').classList.add('invalid');toast(ui('invalidPhone'));ok=false}
  for(const item of state.items){
    if(item.type==='product'&&(Number(item.qty)<itemMoq(item)||Number(item.qty)>maximumQuantity())){toast(ui('minQtyError'));ok=false;break}
    if(item.type==='custom'&&(Number(item.qty)<customMoq()||Number(item.qty)>maximumQuantity())){toast(ui('customMinQtyError'));ok=false;break}
  }
  if(!ok)return;
  ensureInquiryId();state.contact=c;save();go('preview')
}
`;
html = replaceRange(html, 'function goPreview(){', 'function kv(', goPreview, 'contact validation');

const previewFunctions = `function renderHCaptcha(){
  const container=document.getElementById('hcaptchaContainer');
  if(!container||appConfig.hcaptcha?.enabled===false)return;
  if(!window.hcaptcha){container.innerHTML=\`<span class="captcha-status">\${ui('captchaLoading')}</span>\`;setTimeout(renderHCaptcha,350);return}
  if(hcaptchaWidgetId!==null){try{window.hcaptcha.remove(hcaptchaWidgetId)}catch(_){}hcaptchaWidgetId=null}
  container.innerHTML='';
  hcaptchaWidgetId=window.hcaptcha.render(container,{sitekey:appConfig.hcaptcha?.siteKey||'50b2fe65-b00b-4b9e-ad62-3ba471098be2',theme:'light',size:'normal'});
}
function hcaptchaToken(){
  if(appConfig.hcaptcha?.enabled===false)return '';
  try{return hcaptchaWidgetId===null?'':window.hcaptcha?.getResponse(hcaptchaWidgetId)||''}catch(_){return ''}
}
function renderPreview(){
  let c=state.contact||{},ps=state.items.filter(i=>i.type==='product'),cs=state.items.filter(i=>i.type==='custom'),inquiryId=ensureInquiryId();
  previewContent.innerHTML=\`<div class="preview-card"><h3>\${ui('inquiryNumber')}</h3>\${kv(ui('inquiryNumber'),inquiryId)}</div><div class="preview-card"><h3>\${ui('personalInfo')}</h3>\${kv(ui('nameLabel').replace(' *',''),c.name)}\${kv(ui('companyBrand'),c.company||ui('notProvided'))}\${kv(ui('countryRegion'),c.country)}\${kv(ui('cityLabel'),c.city||ui('notProvided'))}\${kv(ui('emailLabel').replace(' *',''),c.email)}\${kv(ui('contactMethod'),c.phone)}\${kv(ui('buyerType'),choiceLabel(c.buyerType)||ui('toConfirm'))}\${kv(ui('note'),c.message||ui('notProvided'))}</div><div class="preview-card"><h3>\${ui('productInquiry')}</h3>\${ps.length?ps.map(i=>kv(productDisplayName(i),\`\${i.qty} \${qtyUnit()} · MOQ \${itemMoq(i)} · \${i.size} · \${choiceLabel(i.scent)} · \${choiceLabel(i.pack||defaultPack(i.series))} · \${money(itemSubtotal(i))}\`)).join(''):kv(ui('products'),ui('none'))}</div><div class="preview-card"><h3>\${ui('customInquiry')}</h3>\${cs.length?cs.map(i=>kv(choiceLabel(i.use)||ui('customNeed'),\`\${i.qty||ui('qtyPending')} \${qtyUnit()} · \${i.budget||ui('budgetPending')} · \${choiceLabel(i.sizePref)||ui('sizeRecommend')} · \${choiceLabel(i.scent)||ui('scentRecommend')} · \${i.color||ui('colorPending')} · \${choiceLabel(i.pack)||ui('packRecommend')} · \${choiceLabel(i.branding)||ui('brandingPending')} · \${i.date||ui('datePending')}\`)).join(''):kv(ui('custom'),ui('none'))}</div><div class="preview-card"><h3>\${ui('amountEstimate')}</h3>\${kv(ui('productEstimate'),money(total()))}\${kv(ui('customPart'),ui('consultantConfirm'))}\${kv(ui('syncStatus'),web3formsReady()?ui('syncReady'):ui('syncPending'))}</div><div class="preview-card verification-card"><label class="consent-check"><input id="privacyConsent" type="checkbox"><span>\${ui('privacyAgreePrefix')} <a href="\${privacyUrl()}" target="_blank" rel="noopener">\${ui('privacyLink')}</a></span></label><div><div class="captcha-label">\${ui('captchaLabel')}</div><div class="captcha-wrap" id="hcaptchaContainer"></div></div><div class="verification-error" id="verificationError"></div></div>\`;
  requestAnimationFrame(renderHCaptcha)
}
`;
html = replaceRange(html, 'function renderPreview(){', 'function itemText(', previewFunctions, 'preview and captcha');

const payloadFunctions = `function buildWeb3FormsPayload(inquiryId){
  let c=state.contact||{},ps=state.items.filter(i=>i.type==='product'),cs=state.items.filter(i=>i.type==='custom'),submittedAt=new Date().toISOString(),subject=\`[\${inquiryId}] DREAMLAND 产品电子手册意向单 - \${c.name||'未填写联系人'}\`;
  return{
    access_key:web3formsAccessKey(),subject,from_name:c.name||'DREAMLAND 产品手册访客',email:c.email||'',
    inquiry_id:inquiryId,submitted_at:submittedAt,privacy_version:appConfig.privacyVersion||'',privacy_accepted:'yes',
    contact_name:c.name||'',company:c.company||'',country_or_region:c.country||'',city:c.city||'',email_address:c.email||'',phone_or_wechat:c.phone||'',buyer_type:c.buyerType||'',message:c.message||'',
    personal_info:JSON.stringify(c,null,2),language:currentLang,estimated_amount:money(total()),estimated_amount_base_usd:total().toFixed(2),product_count:ps.length,custom_count:cs.length,
    items_summary:state.items.map(itemText).join('\\n'),product_items:JSON.stringify(ps,null,2),custom_items:JSON.stringify(cs,null,2)
  }
}
function buildWeb3FormsFormData(inquiryId){
  let payload=buildWeb3FormsPayload(inquiryId),formData=new FormData();
  Object.entries(payload).forEach(([key,value])=>formData.append(key,value==null?'':String(value)));
  const captcha=hcaptchaToken();if(captcha)formData.append('h-captcha-response',captcha);
  return formData
}
function submissionSnapshot(inquiryId){
  return{inquiryId,submittedAt:new Date().toISOString(),language:currentLang,amountBaseUsd:total(),amountDisplay:money(total()),itemCount:state.items.length,items:state.items.map(item=>({type:item.type,productId:item.productId||'',name:productDisplayName(item),qty:Number(item.qty)||0,size:item.size||item.sizePref||'',cover:item.cover||''}))}
}
function archiveSubmission(snapshot){
  let archive=[];try{archive=JSON.parse(localStorage.getItem(SUBMISSION_ARCHIVE_KEY)||'[]')}catch(_){}
  archive.unshift(snapshot);archive=archive.slice(0,Math.max(1,Number(appConfig.archiveLimit)||20));
  localStorage.setItem(SUBMISSION_ARCHIVE_KEY,JSON.stringify(archive));localStorage.setItem(LAST_SUBMISSION_KEY,JSON.stringify(snapshot))
}
function clearSubmittedInquiry(){
  state={version:2,items:[],contact:{}};save();pendingInquiryId='';
  ['name','company','country','city','email','phone','message','customQty','customDate','customColor','customNote'].forEach(id=>{let el=document.getElementById(id);if(el)el.value='' });
  ['buyerType','customUse','customBudget','customSize','customScent','customPack','customBranding'].forEach(id=>{let el=document.getElementById(id);if(el)el.selectedIndex=0})
}
`;
html = replaceRange(html, 'function buildWeb3FormsPayload(){', 'async function submitInquiry(){', payloadFunctions, 'submission payload');

const submitFunctions = `async function submitInquiry(){
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
  const inquiryId=ensureInquiryId(),snapshot=submissionSnapshot(inquiryId);
  submittingInquiry=true;lastSubmitAttemptAt=now;btn.disabled=true;btn.innerHTML='<span class="loader"></span>';
  try{
    let res=await fetch(web3formsEndpoint(),{method:'POST',headers:{Accept:'application/json'},body:buildWeb3FormsFormData(inquiryId)}),data={};
    try{data=await res.json()}catch(_){}
    if(!res.ok||data.success===false)throw new Error(data.message||'Web3Forms submit failed');
    archiveSubmission(snapshot);clearSubmittedInquiry();btn.textContent=ui('confirmSubmit');go('success')
  }catch(e){
    console.error(e);toast(ui('submitFailed'));btn.textContent=ui('confirmSubmit');
    try{if(hcaptchaWidgetId!==null)window.hcaptcha?.reset(hcaptchaWidgetId)}catch(_){}
  }finally{submittingInquiry=false;btn.disabled=false}
}
function renderSuccess(){
  let snapshot={};try{snapshot=JSON.parse(localStorage.getItem(LAST_SUBMISSION_KEY)||'{}')}catch(_){}
  let d=snapshot.submittedAt?new Date(snapshot.submittedAt):new Date();
  successId.textContent=snapshot.inquiryId||'—';successDate.textContent=d.toLocaleDateString(currencyMap[currentLang]?.locale||'zh-CN');successAmount.textContent=snapshot.amountDisplay||money(0);
  let sub=document.querySelector('.success-sub');if(sub)sub.innerHTML=\`\${ui('successSub1')}<br>\${ui('successSub2')}\`;
  let actions=document.querySelector('.success-actions');if(actions&&!actions.querySelector('.archive-note'))actions.insertAdjacentHTML('afterbegin',\`<p class="archive-note">\${ui('submissionArchived')}</p>\`)
}
`;
html = replaceRange(html, 'async function submitInquiry(){', 'function inquiryBadgeCount(){', submitFunctions, 'submit and success flow');

fs.writeFileSync(INDEX_PATH, html, 'utf8');

let sw = fs.readFileSync(SW_PATH, 'utf8');
sw = sw.replace(/const CACHE_VERSION = 'dreamland-pwa-v\d+';/, "const CACHE_VERSION = 'dreamland-pwa-v4';");
if (!sw.includes("'./privacy.html'")) sw = sw.replace("  './offline.html',", "  './offline.html',\n  './privacy.html',");
if (!sw.includes("url.pathname.endsWith('/data/app-config.json')")) {
  sw = sw.replace(
    "  if (request.mode === 'navigate') {",
    "  if (url.pathname.endsWith('/data/app-config.json')) {\n    event.respondWith(networkFirst(request));\n    return;\n  }\n\n  if (request.mode === 'navigate') {"
  );
}
fs.writeFileSync(SW_PATH, sw, 'utf8');

fs.writeFileSync('README-业务闭环配置.md', `# DREAMLAND 业务闭环配置

本阶段已完成：

- Web3Forms 正式提交结构
- 真实意向编号并同步到邮件主题与内容
- 成功提交后的本地摘要归档和当前意向单清理
- 商品封面与 MOQ 进入意向单
- 邮箱、联系人、数量、MOQ 与最大数量校验
- 中英韩隐私说明与强制同意
- hCaptcha 人机验证与重复提交冷却

## 上线前必须配置

打开 \`data/app-config.json\`，把：

\`\`\`json
"web3formsAccessKey": "REPLACE_WITH_WEB3FORMS_ACCESS_KEY"
\`\`\`

替换为你在 Web3Forms 获得的真实 Access Key。

然后在 Web3Forms 对应表单设置中启用 hCaptcha。当前代码使用 Web3Forms 免费方案提供的通用 hCaptcha Site Key。

## 当前占位 MOQ

- 进阶系列：50
- 匠作系列：50
- 节日系列：100
- 经典系列：100
- 定制意向：50

正式产品资料确认后，可直接修改：

- \`data/products.json\` 中每个产品的 \`moq\`
- \`data/series.json\` 中每个系列的 \`defaultMoq\`
- \`data/app-config.json\` 中的 \`customMoq\`

## 隐私说明

\`privacy.html\` 已提供中、英、韩三语版本。正式上线前请确认公司名称、联系邮箱和记录保存政策符合实际执行方式。
`, 'utf8');

const validatorPath = 'scripts/validate_business_closure.mjs';
fs.writeFileSync(validatorPath, `import fs from 'node:fs';
const required=['index.html','privacy.html','data/app-config.json','data/products.json','data/series.json','data/i18n.json','sw.js'];
const errors=[];
for(const path of required)if(!fs.existsSync(path))errors.push('Missing: '+path);
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const products=JSON.parse(fs.readFileSync('data/products.json','utf8')).products||[];
const series=JSON.parse(fs.readFileSync('data/series.json','utf8')).series||{};
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
if(!config.web3formsAccessKey)errors.push('Missing web3formsAccessKey field');
if(!products.length)errors.push('No products');
for(const product of products)if(!Number.isInteger(Number(product.moq))||Number(product.moq)<1)errors.push('Invalid MOQ: '+product.id);
for(const [key,value] of Object.entries(series))if(!Number.isInteger(Number(value.defaultMoq))||Number(value.defaultMoq)<1)errors.push('Invalid series MOQ: '+key);
for(const marker of ['generateInquiryId','privacyConsent','hcaptchaContainer','archiveSubmission','clearSubmittedInquiry','productMoq'])if(!html.includes(marker))errors.push('Missing marker in index.html: '+marker);
if(!sw.includes('dreamland-pwa-v4'))errors.push('Service worker cache version was not updated');
if(errors.length){console.error(errors.join('\\n'));process.exit(1)}
console.log('Business closure validation passed: '+products.length+' products checked.');
`, 'utf8');

if (fs.existsSync(WORKFLOW_PATH)) fs.rmSync(WORKFLOW_PATH);
if (fs.existsSync(SELF_PATH)) fs.rmSync(SELF_PATH);

console.log('Business closure refactor complete.');

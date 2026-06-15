import fs from 'node:fs';
import vm from 'node:vm';

const INDEX_PATH = 'index.html';
const SW_PATH = 'sw.js';
const WORKFLOW_PATH = '.github/workflows/apply-data-refactor.yml';
const SELF_PATH = 'scripts/apply-data-refactor.mjs';

const source = fs.readFileSync(INDEX_PATH, 'utf8');

function fail(message) {
  throw new Error(`[catalog-data-refactor] ${message}`);
}

function literalBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) fail(`Start marker not found: ${startMarker}`);
  const valueStart = start + startMarker.length;
  const end = text.indexOf(endMarker, valueStart);
  if (end < 0) fail(`End marker not found: ${endMarker}`);
  return text.slice(valueStart, end).trim();
}

function replaceBetween(text, startMarker, endMarker, replacement) {
  const start = text.indexOf(startMarker);
  if (start < 0) fail(`Replacement start marker not found: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`Replacement end marker not found: ${endMarker}`);
  return text.slice(0, start) + replacement + text.slice(end);
}

function evaluateLiteral(literal, label) {
  try {
    return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  } catch (error) {
    fail(`Could not evaluate ${label}: ${error.message}`);
  }
}

function writeJson(path, value) {
  fs.mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const currencyMap = evaluateLiteral(
  literalBetween(source, 'const currencyMap=', ';\nconst WEB3FORMS_ENDPOINT='),
  'currencyMap'
);
const seriesMeta = evaluateLiteral(
  literalBetween(source, 'const seriesMeta=', ';\nconst seriesTabLabels='),
  'seriesMeta'
);
const seriesTabLabels = evaluateLiteral(
  literalBetween(source, 'const seriesTabLabels=', ';\nfunction seriesTabLabel'),
  'seriesTabLabels'
);
const patternsBySize = evaluateLiteral(
  literalBetween(source, 'const patternsBySize=', ';\nconst sizeDims='),
  'patternsBySize'
);
const sizeDims = evaluateLiteral(
  literalBetween(source, 'const sizeDims=', ';\nconst seriesPrefix='),
  'sizeDims'
);
const seriesPrefix = evaluateLiteral(
  literalBetween(source, 'const seriesPrefix=', ';\nconst sizeCycle='),
  'seriesPrefix'
);

const cyclesMatch = source.match(/const sizeCycle=(\[[^\n]+?\]),colorCycle=(\[[^\n]+?\]);/);
if (!cyclesMatch) fail('sizeCycle/colorCycle definition not found');
const sizeCycle = evaluateLiteral(cyclesMatch[1], 'sizeCycle');
const colorCycle = evaluateLiteral(cyclesMatch[2], 'colorCycle');

const productNameBank = evaluateLiteral(
  literalBetween(source, 'const productNameBank=', ';\nfunction localCover'),
  'productNameBank'
);
const ui = evaluateLiteral(
  literalBetween(source, 'function ui(key){\n  const dict=', ';\n  return dict[currentLang]'),
  'ui dictionary'
);
const choices = evaluateLiteral(
  literalBetween(source, 'function choiceLabel(v){\n  const map=', ';\n  return map[currentLang]'),
  'choice dictionary'
);
const productNameBankI18n = evaluateLiteral(
  literalBetween(source, 'const productNameBankI18n=', ';\nfunction seriesLabel'),
  'productNameBankI18n'
);

const packagingBySeries = {
  advanced: {
    options: ['强护包装', '礼盒包装'],
    default: '强护包装',
    surchargesCny: { '礼盒包装': 40 }
  },
  masterpiece: {
    options: ['礼盒包装'],
    default: '礼盒包装',
    surchargesCny: {}
  },
  holiday: {
    options: ['防震包装', '强护包装', '礼盒包装'],
    default: '防震包装',
    surchargesCny: { '强护包装': 10, '礼盒包装': 50 }
  },
  classic: {
    options: ['防震包装', '强护包装', '礼盒包装'],
    default: '防震包装',
    surchargesCny: { '强护包装': 10, '礼盒包装': 50 }
  }
};

const seriesOrder = Object.keys(seriesMeta);
const seriesData = {
  schemaVersion: 1,
  defaultSeries: seriesOrder[0] || 'advanced',
  seriesOrder,
  sizes: sizeDims,
  patternsBySize,
  colorClasses: colorCycle,
  series: Object.fromEntries(
    seriesOrder.map((key) => [
      key,
      {
        id: key,
        prefix: seriesPrefix[key],
        count: seriesMeta[key].count,
        labels: {
          zh: seriesTabLabels.zh?.[key] || seriesMeta[key].name || key,
          en: seriesTabLabels.en?.[key] || key,
          ko: seriesTabLabels.ko?.[key] || key
        },
        prices: seriesMeta[key].price,
        scents: seriesMeta[key].scents,
        packaging: packagingBySeries[key] || {
          options: ['防震包装'],
          default: '防震包装',
          surchargesCny: {}
        }
      }
    ])
  )
};

function productName(series, index, lang) {
  const zhBank = productNameBank[series] || [seriesMeta[series]?.name || series];
  const translatedBank = productNameBankI18n[lang]?.[series];
  const bank = lang === 'zh' ? zhBank : (translatedBank || zhBank);
  const base = bank[(index - 1) % bank.length];
  const repeatNumber = index > bank.length ? ` ${index}` : '';
  if (lang === 'zh') return `${base}雕刻蜡烛${repeatNumber}`;
  if (lang === 'ko') return `${base} 조각 캔들${repeatNumber}`;
  return `${base} Carved Candle${repeatNumber}`;
}

function productDescription(series, index, lang) {
  const label = seriesData.series[series]?.labels?.[lang] || series;
  if (lang === 'ko') {
    return `${label} ${index}번 상품입니다. 현재는 데이터 구조 확인용 자리표시자이며, 정식 상품 정보로 교체할 수 있습니다.`;
  }
  if (lang === 'en') {
    return `Placeholder product No. ${index} in ${label}. Replace it later with the final product information.`;
  }
  return `${label}第 ${index} 款，目前为数据结构占位内容，后续可替换为正式商品信息。`;
}

const products = [];
for (const series of seriesOrder) {
  const meta = seriesData.series[series];
  const prefix = meta.prefix || 'PRO';
  for (let index = 1; index <= meta.count; index += 1) {
    const id = `${prefix}${String(index).padStart(3, '0')}`;
    const size = sizeCycle[(index - 1) % sizeCycle.length];
    products.push({
      id,
      series,
      name: productName(series, index, 'zh'),
      names: {
        zh: productName(series, index, 'zh'),
        en: productName(series, index, 'en'),
        ko: productName(series, index, 'ko')
      },
      desc: productDescription(series, index, 'zh'),
      descriptions: {
        zh: productDescription(series, index, 'zh'),
        en: productDescription(series, index, 'en'),
        ko: productDescription(series, index, 'ko')
      },
      size,
      color: colorCycle[(index - 1) % colorCycle.length],
      cover: `./images/products/${id}/cover.jpg`,
      images: [1, 2, 3, 4, 5].map((number) => `./images/products/${id}/detail-${number}.jpg`),
      status: 'placeholder'
    });
  }
}

const i18nData = {
  schemaVersion: 1,
  defaultLanguage: 'zh',
  languages: ['zh', 'en', 'ko'],
  currencyMap,
  ui,
  choices,
  languageNames: {
    zh: { label: '中文', short: 'CN' },
    en: { label: 'English', short: 'EN' },
    ko: { label: '한국어', short: 'KR' }
  }
};

writeJson('data/series.json', seriesData);
writeJson('data/products.json', { schemaVersion: 1, products });
writeJson('data/i18n.json', i18nData);

const dataBootstrap = `let currencyMap={};
let seriesMeta={};
let seriesTabLabels={};
let patternsBySize={};
let sizeDims={};
let products=[];
let uiDict={};
let choiceMaps={};
let languageNames={};
let defaultSeries='advanced';

function localCover(id){return\`./images/products/\${id}/cover.jpg\`}
function localDetails(id){return[1,2,3,4,5].map(n=>\`./images/products/\${id}/detail-\${n}.jpg\`)}

async function loadCatalogData(){
  const [seriesResponse,productsResponse,i18nResponse]=await Promise.all([
    fetch('./data/series.json',{cache:'no-cache'}),
    fetch('./data/products.json',{cache:'no-cache'}),
    fetch('./data/i18n.json',{cache:'no-cache'})
  ]);
  const responses=[seriesResponse,productsResponse,i18nResponse];
  if(responses.some(response=>!response.ok)){
    throw new Error('Catalog data request failed: '+responses.map(response=>response.status).join(','));
  }
  const [seriesData,productsData,i18nData]=await Promise.all(responses.map(response=>response.json()));
  defaultSeries=seriesData.defaultSeries||seriesData.seriesOrder?.[0]||'advanced';
  patternsBySize=seriesData.patternsBySize||{};
  sizeDims=seriesData.sizes||{};
  products=Array.isArray(productsData.products)?productsData.products:[];
  currencyMap=i18nData.currencyMap||{};
  uiDict=i18nData.ui||{};
  choiceMaps=i18nData.choices||{};
  languageNames=i18nData.languageNames||{};
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
      packaging:item.packaging||{options:['防震包装'],default:'防震包装',surchargesCny:{}}
    };
    ['zh','en','ko'].forEach(lang=>{
      seriesTabLabels[lang][key]=item.labels?.[lang]||item.labels?.zh||key;
    });
  });
}

function seriesTabLabel(key){
  return seriesTabLabels[currentLang]?.[key]||seriesTabLabels.zh?.[key]||seriesMeta[key]?.name||key;
}`;

let output = source;
output = replaceBetween(output, 'const currencyMap=', 'const WEB3FORMS_ENDPOINT=', `${dataBootstrap}\n`);

output = replaceBetween(output, 'const seriesMeta=', 'const CATALOG_BATCH_SIZE=5;', '');

output = output.replace(
  /let activeScreen='home',activeSeries='advanced',activeProduct=products\[0\],/,
  "let activeScreen='home',activeSeries='advanced',activeProduct=null,"
);

output = output.replace(
  "function packOptions(s){if(s==='advanced')return['强护包装','礼盒包装'];if(s==='masterpiece')return['礼盒包装'];return['防震包装','强护包装','礼盒包装']}\nfunction defaultPack(s){if(s==='advanced')return'强护包装';if(s==='masterpiece')return'礼盒包装';return'防震包装'}\nfunction packSurchargeCny(s,pack){if(s==='advanced'&&pack==='礼盒包装')return 40;if((s==='holiday'||s==='classic')&&pack==='强护包装')return 10;if((s==='holiday'||s==='classic')&&pack==='礼盒包装')return 50;return 0}",
  "function packOptions(s){return seriesMeta[s]?.packaging?.options||['防震包装']}\nfunction defaultPack(s){return seriesMeta[s]?.packaging?.default||packOptions(s)[0]||'防震包装'}\nfunction packSurchargeCny(s,pack){return Number(seriesMeta[s]?.packaging?.surchargesCny?.[pack]||0)}"
);

const localizedFunctions = `function ui(key){
  return uiDict[currentLang]?.[key]||uiDict.zh?.[key]||key;
}
function choiceLabel(value){
  return choiceMaps[currentLang]?.[value]||value;
}
function seriesLabel(key){return seriesTabLabel(key)}
function productDisplayName(product){
  if(!product)return '';
  return product.names?.[currentLang]||product.names?.zh||product.name||product.id||'';
}
function productDesc(product){
  if(!product)return '';
  return product.descriptions?.[currentLang]||product.descriptions?.zh||product.desc||'';
}
`;

output = replaceBetween(output, 'function ui(key){', 'function qtyUnit(){', localizedFunctions);

output = output.replace(
  "function renderLangOptions(){let box=document.getElementById('langMenu');if(!box)return;let names={zh:['中文','CN'],en:['English','EN'],ko:['한국어','KR']};box.innerHTML=langOrder.map(k=>`<button class=\"lang-option ${k===currentLang?'active':''}\" onclick=\"chooseLang('${k}')\"><span>${names[k][0]}</span><small>${names[k][1]}</small></button>`).join('')}",
  "function renderLangOptions(){let box=document.getElementById('langMenu');if(!box)return;box.innerHTML=langOrder.map(k=>{let item=languageNames[k]||{label:k,short:k.toUpperCase()};return`<button class=\"lang-option ${k===currentLang?'active':''}\" onclick=\"chooseLang('${k}')\"><span>${item.label}</span><small>${item.short}</small></button>`}).join('')}"
);

output = output.replace(
  "function quickAdd(id){let p=products.find(x=>x.id===id),m=seriesMeta[p.series],s=p.size;state.items.push({id:uid(),type:'product',productId:p.id,name:p.name,series:p.series,color:p.color,size:s,scent:m.scents[0],pattern:patternsBySize[s][0],pack:defaultPack(p.series),qty:QTY_MIN});save();toast(toastText('addedInquiry'))}",
  "function quickAdd(id){let p=products.find(x=>x.id===id);if(!p)return;let m=seriesMeta[p.series],s=p.size;state.items.push({id:uid(),type:'product',productId:p.id,name:p.name,names:p.names,series:p.series,color:p.color,cover:p.cover,size:s,scent:m.scents[0],pattern:patternsBySize[s][0],pack:defaultPack(p.series),qty:QTY_MIN});save();toast(toastText('addedInquiry'))}"
);

output = output.replace(
  "function addConfiguredProduct(){state.items.push({id:uid(),type:'product',productId:activeProduct.id,name:activeProduct.name,series:activeProduct.series,color:activeProduct.color,...config});save();toast(toastText('addedInquiry'));go('inquiry')}",
  "function addConfiguredProduct(){if(!activeProduct)return;state.items.push({id:uid(),type:'product',productId:activeProduct.id,name:activeProduct.name,names:activeProduct.names,series:activeProduct.series,color:activeProduct.color,cover:activeProduct.cover,...config});save();toast(toastText('addedInquiry'));go('inquiry')}"
);

const oldInit = "bindCtaReveal();bindCatalogLazyLoad();refreshBudgetOptions();updateLangButton();renderLangOptions();renderTabs();renderProducts();applyI18n();badge();initUnlock();";
const newInit = `async function bootstrap(){
  await loadCatalogData();
  activeSeries=seriesMeta[defaultSeries]?defaultSeries:(Object.keys(seriesMeta)[0]||'advanced');
  activeProduct=products[0]||null;
  bindCtaReveal();
  bindCatalogLazyLoad();
  refreshBudgetOptions();
  updateLangButton();
  renderLangOptions();
  renderTabs();
  renderProducts();
  applyI18n();
  badge();
  initUnlock();
}
bootstrap().catch(error=>{
  console.error('Catalog data initialization failed:',error);
  const title=document.querySelector('[data-screen="home"] .hero-copy h1');
  const copy=document.querySelector('[data-screen="home"] .hero-copy p');
  if(title)title.textContent='产品数据加载失败';
  if(copy)copy.textContent='请检查网络后刷新页面。';
});`;

if (!output.includes(oldInit)) fail('Application initialization line not found');
output = output.replace(oldInit, newInit);

fs.writeFileSync(INDEX_PATH, output, 'utf8');

let serviceWorker = fs.readFileSync(SW_PATH, 'utf8');
serviceWorker = serviceWorker.replace(
  /const CACHE_VERSION = 'dreamland-pwa-v\d+';/,
  "const CACHE_VERSION = 'dreamland-pwa-v3';"
);
if (!serviceWorker.includes("'./data/products.json'")) {
  serviceWorker = serviceWorker.replace(
    "  './offline.html',",
    "  './offline.html',\n  './data/products.json',\n  './data/series.json',\n  './data/i18n.json',"
  );
}
fs.writeFileSync(SW_PATH, serviceWorker, 'utf8');

fs.mkdirSync('images/products', { recursive: true });
fs.writeFileSync(
  'images/products/README.md',
  `# Product image folders

Each product in \`data/products.json\` uses its product ID as the directory name.

Example:

\`\`\`text
images/products/ADV001/
├── cover.jpg
├── detail-1.jpg
├── detail-2.jpg
├── detail-3.jpg
├── detail-4.jpg
└── detail-5.jpg
\`\`\`

The current JSON data is placeholder content. Missing files automatically fall back to the existing CSS placeholder visuals.
`,
  'utf8'
);

fs.mkdirSync('scripts', { recursive: true });
fs.writeFileSync(
  'scripts/validate_catalog_data.mjs',
  `import fs from 'node:fs';

const seriesData=JSON.parse(fs.readFileSync('data/series.json','utf8'));
const productData=JSON.parse(fs.readFileSync('data/products.json','utf8'));
const i18nData=JSON.parse(fs.readFileSync('data/i18n.json','utf8'));

const errors=[];
const ids=new Set();
const seriesKeys=new Set(seriesData.seriesOrder||Object.keys(seriesData.series||{}));

for(const product of productData.products||[]){
  if(!product.id)errors.push('Product without id');
  if(ids.has(product.id))errors.push(\`Duplicate product id: \${product.id}\`);
  ids.add(product.id);
  if(!seriesKeys.has(product.series))errors.push(\`Unknown series for \${product.id}: \${product.series}\`);
  for(const lang of i18nData.languages||[]){
    if(!product.names?.[lang])errors.push(\`Missing \${lang} name: \${product.id}\`);
    if(!product.descriptions?.[lang])errors.push(\`Missing \${lang} description: \${product.id}\`);
  }
  if(!product.cover)errors.push(\`Missing cover path: \${product.id}\`);
  if(!Array.isArray(product.images)||product.images.length===0)errors.push(\`Missing detail images: \${product.id}\`);
}

for(const key of seriesKeys){
  const expected=Number(seriesData.series?.[key]?.count||0);
  const actual=(productData.products||[]).filter(product=>product.series===key).length;
  if(expected!==actual)errors.push(\`Series count mismatch for \${key}: expected \${expected}, got \${actual}\`);
}

if(errors.length){
  console.error(errors.join('\\n'));
  process.exit(1);
}

console.log(\`Catalog data valid: \${ids.size} products across \${seriesKeys.size} series.\`);
`,
  'utf8'
);

if (process.env.CI === 'true') {
  if (fs.existsSync(WORKFLOW_PATH)) fs.rmSync(WORKFLOW_PATH);
  if (fs.existsSync(SELF_PATH)) fs.rmSync(SELF_PATH);
}

console.log(`Refactor complete: ${products.length} placeholder products generated.`);

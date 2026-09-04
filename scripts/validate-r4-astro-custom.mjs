#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'.r4-astro-dist');
const errors=[];
function fail(message){errors.push(message);}
function read(relative){return fs.readFileSync(path.join(ROOT,relative),'utf8');}
function json(relative){return JSON.parse(read(relative));}
function count(source,pattern){return [...source.matchAll(pattern)].length;}
function stateText(html){
  const match=html.match(/<script[^>]*id="customRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="customRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  return match?match[1]:'';
}

try{
  const file=path.join(OUT,'custom','index.html');
  if(!fs.existsSync(file)){
    fail('R4.6B Custom output is missing: custom/index.html');
  }else{
    const html=fs.readFileSync(file,'utf8');
    for(const marker of [
      'data-r4-astro-foundation="true"','data-r4-astro-custom="true"','data-r4-custom-static="true"','data-custom-runtime-presentation',
      'data-custom-section="basics"','data-custom-section="product"','data-custom-section="packaging"','data-custom-runtime-brief','data-custom-add-inquiry',
      'data-custom-quantity','data-custom-budget','data-custom-delivery','data-custom-color','data-custom-notes','data-custom-error="use"','data-custom-error="qty"','data-custom-error="scents"',
      'id="customRuntimeState"','src="/r4-custom-runtime.js"','href="/products/"','href="/inquiry/"','name="robots" content="index,follow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/custom/"','data-site-language-enabled="true"'
    ]) if(!html.includes(marker)) fail('R4.6B Custom output is missing: '+marker);

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE','runtime-desktop-experience.js','runtime-desktop-custom.js','runtime-risk.js','runtime-submission.js','runtime-pwa.js','custom-scent-multi.js','startup-loader.js'
    ]) if(html.includes(forbidden)) fail('R4.6B Custom output still contains Legacy/runtime marker: '+forbidden);

    const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];
    if(executable.length!==1) fail('R4.6B Custom must contain exactly one executable route runtime; found '+executable.length+'.');
    const scriptSources=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(match=>match[1]);
    if(scriptSources.length!==1||scriptSources[0]!=='/r4-custom-runtime.js') fail('R4.6B Custom executable graph must contain only /r4-custom-runtime.js.');
    if(/\bdisabled(?:=""|="disabled"|>|\s)/i.test(html)) fail('R4.6B Custom controls must be active; disabled controls remain.');

    const raw=stateText(html);
    let state=null;
    try{state=JSON.parse(raw);}catch(error){fail('R4.6B Custom runtime state JSON is invalid: '+error.message);}
    const app=json('data/app-config.json');
    if(state){
      if(state.version!=='R4.6B'||state.defaultLanguage!=='en'||state.storage?.languageKey!=='productManualLang'||state.storage?.inquiryKey!=='productManualV2State'||state.storage?.inquiryVersion!==2||state.limits?.customMoq!==app.customMoq||state.limits?.maxQuantity!==app.maxQuantity){
        fail('R4.6B Custom runtime-state ownership/storage/quantity contract changed.');
      }
      if(state.series?.order?.join(',')!=='classic,advanced,masterpiece'||!state.series?.default) fail('R4.6B Custom runtime-state fragrance-series contract changed.');
      for(const language of ['en','zh','ko']){
        const current=state.languages?.[language];
        if(!current||!current.content?.navigation||!current.content?.footer||!current.copy||!Array.isArray(current.useCases)||!Array.isArray(current.budgets)||!Array.isArray(current.sizes)||!Array.isArray(current.packages)||!Array.isArray(current.brandingOptions)||!Array.isArray(current.fragranceSeries)){
          fail('R4.6B Custom runtime state is missing localized '+language+' presentation data.');
        }
      }
      if(!Array.isArray(state.scents)||state.scents.length<3) fail('R4.6B Custom runtime state has no canonical scent dataset.');
    }

    const english=json('data/site-content.json').languages?.en?.customProject||{};
    for(const [label,expected,actual] of [
      ['use cases',english.useCases?.length||0,count(html,/data-custom-use-option=/g)],
      ['sizes',english.sizes?.length||0,count(html,/data-custom-size-option=/g)],
      ['packages',english.packages?.length||0,count(html,/data-custom-packaging-option=/g)],
      ['branding',english.brandingOptions?.length||0,count(html,/data-custom-branding-option=/g)]
    ]) if(!expected||actual!==expected) fail(`R4.6B Custom ${label} option count mismatch: expected ${expected}, found ${actual}.`);
    if(count(html,/data-custom-fragrance-series=/g)!==3) fail('R4.6B Custom must present three canonical fragrance collections.');
    if(count(html,/data-custom-scent-option=/g)<3) fail('R4.6B Custom scent presentation is unexpectedly empty.');
  }
}catch(error){fail('R4.6B output inspection crashed: '+error.message);}

try{
  delete globalThis.DreamlandProductDataContract;delete globalThis.DreamlandLocalizationPolicy;delete globalThis.DreamlandCustom;
  await import(pathToFileURL(path.join(ROOT,'src/data/product-data-contract.js')).href+'?r4-custom-data='+Date.now());
  await import(pathToFileURL(path.join(ROOT,'src/domain/localization/runtime-localization-policy.js')).href+'?r4-custom-localization='+Date.now());
  await import(pathToFileURL(path.join(ROOT,'src/features/custom/runtime-custom.js')).href+'?r4-custom-feature='+Date.now());
  const data=globalThis.DreamlandProductDataContract;
  const localization=globalThis.DreamlandLocalizationPolicy;
  const custom=globalThis.DreamlandCustom;
  if(!data||!localization||!custom||custom.version!=='B6-05'){
    fail('R4.6B canonical Custom build-time owners are unavailable.');
  }else{
    const rows=data.parseCsv(read('data/scents.csv'));
    const map=new Map();
    for(const row of rows){
      const series=String(row.series||'').trim();if(!map.has(series))map.set(series,[]);
      map.get(series).push({id:String(row.scent_id||'').trim(),status:String(row.status||'').trim().toLowerCase(),name:{zh:String(row.name_zh||'').trim(),en:String(row.name_en||'').trim(),ko:String(row.name_ko||'').trim()}});
    }
    const app=json('data/app-config.json');
    custom.configure({scentsBySeries:map,seriesOrder:['classic','advanced','masterpiece'],defaultSeries:'classic',customMoq:()=>app.customMoq,maximumQuantity:()=>app.maxQuantity});
    custom.reset();
    if(!custom.ready()||custom.availableSeries().join(',')!=='classic,advanced,masterpiece'||custom.snapshot().minimumQuantity!==app.customMoq||custom.snapshot().maximumQuantity!==app.maxQuantity){
      fail('R4.6B canonical DreamlandCustom configuration parity failed.');
    }
    const available=custom.availableScents(custom.selectedSeries());
    if(available.length)custom.toggleScent(available[0].id);
    const draft={use:'validator',qty:app.customMoq,budget:'',date:'',sizePref:'',color:'',pack:'',branding:'',note:''};
    const validation=custom.validateDraft(draft);
    const intent=custom.buildIntent(draft,{id:'r4-custom-validator'});
    if(!validation.valid||!intent||intent.type!=='custom'||intent.id!=='r4-custom-validator'||intent.moq!==app.customMoq||!Array.isArray(intent.scentIds)||intent.scentIds.length<1){
      fail('R4.6B canonical Custom validateDraft/buildIntent parity failed.');
    }
  }
}catch(error){fail('R4.6B canonical owner validation failed: '+error.message);}

try{
  const page=read('src/astro/pages/custom/index.astro');
  for(const pattern of [/buildCustomRuntimeState/,/languageEnabled=\{true\}/,/id="customRuntimeState"/,/src="\/r4-custom-runtime\.js"/,/robots="index,follow"/]) if(!pattern.test(page)) fail('R4.6B Custom source contract is incomplete: '+pattern);
  const viewModel=read('src/astro/lib/custom-view-model.mjs');
  for(const pattern of [/localizationPolicy\s*\.\s*localizedContent/,/customFeature\s*\.\s*snapshot/,/customFeature\s*\.\s*availableSeries/,/customFeature\s*\.\s*availableScents/,/buildCustomRuntimeState/]) if(!pattern.test(viewModel)) fail('R4.6B Custom ViewModel delegation is missing: '+pattern);
  for(const forbidden of ['document.','querySelector(','localStorage','sessionStorage','fetch(','DreamlandInquiry','DreamlandRisk','DreamlandSubmission']) if(viewModel.includes(forbidden)) fail('R4.6B Custom build-time ViewModel crossed a boundary: '+forbidden);
}catch(error){fail('R4.6B source inspection crashed: '+error.message);}

try{
  const pkg=json('package.json');
  const isolated=String(pkg.scripts?.['r4:astro:build']||'');
  const customStep='node scripts/r4-copy-astro-custom-assets.mjs';
  const pdpStep='node scripts/r4-copy-astro-pdp-assets.mjs';
  const pdpIndex=isolated.indexOf(pdpStep);
  const customIndex=isolated.indexOf(customStep);
  if(
    pdpIndex<0||
    customIndex<=pdpIndex
  ){
    fail('R4.6B isolated Astro build must include the route-scoped Custom runtime assembly step after PDP assets.');
  }
  if(pkg.scripts?.['r4:astro:custom']!=='node scripts/validate-r4-astro-custom.mjs') fail('package.json lost r4:astro:custom.');
  if(pkg.scripts?.['r4:astro:custom-runtime']!=='node scripts/validate-r4-astro-custom-runtime.mjs') fail('package.json is missing r4:astro:custom-runtime.');
  const validate=String(pkg.scripts?.validate||'');
  const a=validate.indexOf('npm run r4:astro:custom');const b=validate.indexOf('npm run r4:astro:custom-runtime');const c=validate.indexOf('npm run r4:production:home:contract');
  if(a<0||b<=a||c<=b) fail('R4.6B Custom Runtime gate must run after Custom Presentation and before Production Home contract.');
  if(pkg.scripts?.build!=='npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:pdp && npm run r4:production:custom && npm run r4:production:home:validate && npm run r4:production:catalog:validate && npm run r4:production:pdp:validate && npm run r4:production:custom:validate') fail('R4.6B must not change Production Custom ownership.');
}catch(error){fail('R4.6B package inspection crashed: '+error.message);}

if(errors.length){
  console.error('');console.error('DREAMLAND B7-00B.4J R4.6A/R4.6B Astro Custom Presentation: FAIL');for(const error of errors)console.error('- '+error);console.error('');process.exit(1);
}
console.log('');console.log('DREAMLAND B7-00B.4J R4.6A/R4.6B Astro Custom Presentation: PASS');console.log('Interactive isolated Custom / canonical validateDraft + buildIntent / multi-scent selection / EN-ZH-KO state / Live Brief / Inquiry persistence hooks / Production-ready isolated runtime contract verified.');console.log('');

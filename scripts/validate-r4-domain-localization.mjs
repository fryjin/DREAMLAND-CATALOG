#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];
function fail(m){errors.push(m);}
function read(p){return fs.readFileSync(path.join(ROOT,p),'utf8');}
function json(p){return JSON.parse(read(p));}
function functionSlice(source,name,nextName){
  const s=source.indexOf('function '+name+'(');
  const e=source.indexOf('function '+nextName+'(',s+1);
  return s>=0&&e>s?source.slice(s,e):'';
}

try{
  delete globalThis.DreamlandLocalizationPolicy;
  await import(pathToFileURL(path.join(ROOT,'src/domain/localization/runtime-localization-policy.js')).href+'?r4='+Date.now());
  const p=globalThis.DreamlandLocalizationPolicy;
  const i18n=json('data/i18n.json');
  const siteContent=json('data/site-content.json');
  if(!p||p.version!=='R4.2C')fail('DreamlandLocalizationPolicy R4.2C was not exposed.');
  else{
    for(const m of ['uiText','choiceLabel','seriesLabel','productName','productDescription','scentText','fromPrice','localeFor','formatDate','localizedContent']){
      if(typeof p[m]!=='function')fail('DreamlandLocalizationPolicy.'+m+' is missing.');
    }
    if(p.uiText('en','catalogTitle',i18n.ui)!==i18n.ui.en.catalogTitle)fail('UI text lookup parity failed.');
    if(p.uiText('missing','catalogTitle',i18n.ui)!==i18n.ui.zh.catalogTitle)fail('UI fallback parity failed.');
    if(p.choiceLabel('en','raw',{en:{raw:'English'}})!=='English'||p.choiceLabel('ko','raw',{en:{raw:'English'}})!=='raw')fail('Choice label parity failed.');
    if(p.seriesLabel('ko','advanced',{zh:{advanced:'高级系列'}},{advanced:{name:'Meta'}})!=='高级系列')fail('Series label fallback parity failed.');
    const product={id:'ADV001',name:'Legacy',desc:'Legacy desc',names:{zh:'中文',en:'English'},descriptions:{zh:'中文描述',en:'English description'}};
    if(p.productName('ko',product)!=='中文'||p.productDescription('ko',product)!=='中文描述')fail('Product localization fallback parity failed.');
    if(p.scentText('ko',{zh:'中文香型',en:'English Scent'})!=='English Scent')fail('Scent fallback parity failed.');
    if(p.fromPrice('en','From','USD 10.00')!=='From USD 10.00'||p.fromPrice('zh','起','¥ 72.00')!=='¥ 72.00 起')fail('From-price order parity failed.');
    if(p.localeFor('en',i18n.currencyMap)!==i18n.currencyMap.en.locale||p.localeFor('missing',i18n.currencyMap)!=='zh-CN')fail('Locale fallback parity failed.');
    const d=new Date(2026,8,2);
    if(p.formatDate(d,'en',i18n.currencyMap)!==d.toLocaleDateString(i18n.currencyMap.en.locale))fail('Date formatting parity failed.');
    if(p.localizedContent('en',siteContent)!==siteContent.languages.en)fail('Site-content language lookup parity failed.');
    if(
      p.localizedContent('__missing__',siteContent)!==
      (siteContent.languages.en||siteContent.languages.zh)
    )fail('Site-content fallback parity failed.');
  }
}catch(error){fail('Localization Domain execution failed: '+error.message);}

try{
  const source=read('src/domain/localization/runtime-localization-policy.js');
  for(const forbidden of ['document.','querySelector(','localStorage','sessionStorage','fetch(','XMLHttpRequest','DreamlandInquiry','DreamlandDetail','DreamlandSubmission','DreamlandRisk']){
    if(source.includes(forbidden))fail('Localization Domain crossed a boundary: '+forbidden);
  }
}catch(error){fail('Localization source inspection failed: '+error.message);}

try{
  const index=read('index.html');
  for(const marker of ['./src/domain/localization/runtime-localization-policy.js','const localizationPolicy=window.DreamlandLocalizationPolicy;','DreamlandLocalizationPolicy must load before localization policy initialization.']){
    if(!index.includes(marker))fail('index.html localization integration missing: '+marker);
  }
  for(const [name,nextName,method] of [
    ['seriesTabLabel','riskAssessmentEndpoint','seriesLabel'],
    ['fromPrice','currencyUnit','fromPrice'],
    ['ui','choiceLabel','uiText'],
    ['choiceLabel','seriesLabel','choiceLabel'],
    ['productDisplayName','productDesc','productName'],
    ['productDesc','moqForSeriesSize','productDescription'],
    ['scentDisplayText','scentSafeText','scentText']
  ]){
    const slice=functionSlice(index,name,nextName);
    if(!slice||!new RegExp('localizationPolicy\\s*\\.\\s*'+method).test(slice))fail('Legacy localization bridge is not delegated: '+name);
  }
  const success=functionSlice(index,'renderSuccess','inquiryBadgeCount');
  if(!/localizationPolicy\s*\.\s*formatDate/.test(success))fail('Success date formatting is not delegated.');
  const bootstrap=index.slice(index.indexOf('desktopExperience.configure({'),index.indexOf('desktopExperience.mount();'));
  if(!/localizationPolicy\s*\.\s*localeFor/.test(bootstrap))fail('Desktop locale adapter is not delegated.');
}catch(error){fail('Legacy localization bridge inspection failed: '+error.message);}

try{
  const legacy=await import(pathToFileURL(path.join(ROOT,'src/app/legacy-map.js')).href+'?r4='+Date.now());
  const item=legacy.LEGACY_FRONTEND_MAP.find(row=>row.id==='localization-domain');
  if(item?.targetLayer!=='domain'||item?.targetArea!=='localization'||item?.status!=='migrated'||item?.runtimeMigrated!==true||!item?.runtimeOwners?.includes('src/domain/localization/runtime-localization-policy.js'))fail('Legacy map does not mark localization as migrated to Domain.');
}catch(error){fail('Localization legacy-map validation failed: '+error.message);}

try{
  const sw=read('sw.js');
  const matches=sw.match(/'\.\/src\/domain\/localization\/runtime-localization-policy\.js'/g)||[];
  if(matches.length!==1)fail('PWA APP_SHELL must contain Localization runtime exactly once; found '+matches.length+'.');
}catch(error){fail('Localization PWA validation failed: '+error.message);}

try{
  const pkg=json('package.json');
  if(pkg.scripts?.['r4:domain:localization']!=='node scripts/validate-r4-domain-localization.mjs')fail('package.json missing r4:domain:localization.');
  const v=String(pkg.scripts?.validate||'');
  const d=v.indexOf('npm run desktop:catalog'),a=v.indexOf('npm run r4:domain:pricing'),b=v.indexOf('npm run r4:domain:submission-payload'),c=v.indexOf('npm run r4:domain:localization'),z=v.indexOf('npm run r4:astro:foundation');
  if(!(d>=0&&a>d&&b>a&&c>b&&z>c))fail('R4 gate order must be Desktop → Pricing → Submission Payload → Localization → Astro.');
}catch(error){fail('Localization package validation failed: '+error.message);}

if(errors.length){
  console.error('\nDREAMLAND B7-00B.4J R4.2C Localization Domain: FAIL\n');
  for(const e of errors)console.error('- '+e);
  console.error('');
  process.exit(1);
}
console.log('\nDREAMLAND B7-00B.4J R4.2C Localization Domain: PASS');
console.log('Shared UI/choice/series/product/scent/price-label/locale/date/site-content fallback policy extracted with parity verified.\n');

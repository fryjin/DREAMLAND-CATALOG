#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  SUPPORTED_LOCALES,
  HTML_LANG_BY_LOCALE,
  PUBLIC_DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  supportedLocale,
  normalizeLocale,
  htmlLangForLocale,
  localeFromPath,
  stripLocalePrefix,
  withLocale,
  isLocaleEligiblePath,
  localizedPublicPath,
  resolveLocale
} from '../src/astro/lib/locale-routing.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
const fail=message=>errors.push(message);
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\r\n?/g,'\n');
const json=relative=>JSON.parse(read(relative));
const same=(actual,expected,label)=>{
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    fail(`${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

try{
  same([...SUPPORTED_LOCALES],['en','zh','ko'],'Supported locale order changed');
  same(PUBLIC_DEFAULT_LOCALE,'en','Public default locale changed');
  same(LANGUAGE_STORAGE_KEY,'productManualLang','Language storage key changed');
  same(HTML_LANG_BY_LOCALE,{en:'en',zh:'zh-CN',ko:'ko-KR'},'HTML lang mapping changed');
  same(supportedLocale('ZH-cn'),'zh','BCP-47 zh normalization failed');
  same(supportedLocale('ko-KR'),'ko','BCP-47 ko normalization failed');
  same(supportedLocale('fr'),null,'Unsupported locale must not resolve');
  same(normalizeLocale('fr','ko'),'ko','Locale fallback failed');
  same(htmlLangForLocale('zh'),'zh-CN','Chinese HTML lang mapping failed');
  same(localeFromPath('/zh/products/ADV001/'),'zh','Localized PDP route parsing failed');
  same(localeFromPath('/products/ADV001/'),null,'Unprefixed PDP must not report a route locale');
  same(stripLocalePrefix('/ko/products/?series=masterpiece#catalog'),'/products/?series=masterpiece#catalog','Locale prefix stripping failed');
  same(withLocale('/products/?series=masterpiece#catalog','zh'),'/zh/products/?series=masterpiece#catalog','Locale prefix insertion failed');
  same(withLocale('/ko/products/ADV001/','zh'),'/zh/products/ADV001/','Locale replacement must not stack prefixes');
  same(withLocale('/','ko'),'/ko/','Localized root route failed');
  same(withLocale('https://example.com/products/','zh'),'https://example.com/products/','External URL must not be rewritten');

  for(const route of [
    '/',
    '/products/',
    '/products/ADV001/',
    '/custom/',
    '/inquiry/',
    '/inquiry/contact/',
    '/inquiry/review/',
    '/inquiry/success/',
    '/zh/products/',
    '/ko/inquiry/review/'
  ]){
    if(!isLocaleEligiblePath(route)) fail('Expected locale-eligible public route: '+route);
  }

  for(const route of [
    '/privacy/',
    '/offline.html',
    '/api/inquiry',
    '/images/shared/share.jpg',
    'mailto:hello@example.com'
  ]){
    if(isLocaleEligiblePath(route)) fail('Non-localized route was incorrectly classified as locale-eligible: '+route);
  }

  same(localizedPublicPath('/privacy/','zh'),'/privacy/','Non-localized public path must remain unchanged');
  same(resolveLocale({pathname:'/ko/inquiry/',storedLocale:'zh',fallback:'en'}),{locale:'ko',source:'route',localizedPath:true},'Route locale must outrank persisted locale');
  same(resolveLocale({pathname:'/inquiry/',storedLocale:'zh',fallback:'en'}),{locale:'zh',source:'storage',localizedPath:false},'Persisted locale must resolve unprefixed route');
  same(resolveLocale({pathname:'/inquiry/',storedLocale:'',fallback:'en'}),{locale:'en',source:'default',localizedPath:false},'Public default locale resolution failed');
}catch(error){
  fail('Locale Routing pure-function contract crashed: '+error.message);
}

try{
  const i18n=json('data/i18n.json');
  for(const locale of SUPPORTED_LOCALES){
    if(!i18n.languages?.includes(locale)) fail('data/i18n.json is missing supported locale: '+locale);
  }
  if(!SUPPORTED_LOCALES.includes(i18n.defaultLanguage)) fail('Content defaultLanguage must remain a supported locale.');
}catch(error){
  fail('Locale Routing i18n alignment inspection failed: '+error.message);
}

try{
  const source=read('src/astro/lib/locale-routing.mjs');
  for(const forbidden of [
    'localStorage','sessionStorage','document.','window.','globalThis',
    'DreamlandPricingPolicy','DreamlandInquiry','DreamlandContact','DreamlandSubmission'
  ]){
    if(source.includes(forbidden)) fail('Locale Routing owner must remain pure and presentation-only; forbidden dependency: '+forbidden);
  }
}catch(error){
  fail('Locale Routing owner purity inspection failed: '+error.message);
}

try{
  const packageJson=json('package.json');
  if(packageJson.scripts?.['r4:locale:routing-foundation']!=='node scripts/validate-f1-5a-locale-routing-foundation.mjs'){
    fail('package.json r4:locale:routing-foundation script is missing.');
  }
  const validate=String(packageJson.scripts?.validate||'');
  const expectedOrder='npm run r4:domain:localization && npm run r4:locale:routing-foundation && npm run r4:astro:foundation';
  if(!validate.includes(expectedOrder)){
    fail('Locale Routing Foundation gate must run after localization domain and before Astro foundation.');
  }
}catch(error){
  fail('Locale Routing package contract inspection failed: '+error.message);
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F1.5-A LOCALE ROUTING FOUNDATION: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND F1.5-A LOCALE ROUTING FOUNDATION: PASS');
console.log('Pure locale routing owner / EN-ZH-KO route mapping / route>storage>default precedence / query+hash preservation / public-route eligibility contract verified.');
console.log('');

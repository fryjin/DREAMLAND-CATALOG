#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_MODE=process.argv.includes('--source');
const DIST_MODE=process.argv.includes('--dist');
if(SOURCE_MODE===DIST_MODE){
  console.error('Usage: node scripts/validate-r4-production-inquiry-cutover.mjs --source | --dist');
  process.exit(1);
}

const errors=[];
const REQUIRED_BUILD_STEPS=Object.freeze([
  'npm run data:build',
  'npm run build:pages',
  'npm run r4:astro:build',
  'npm run r4:production:home',
  'npm run r4:production:catalog',
  'npm run r4:production:pdp',
  'npm run r4:production:custom',
  'npm run r4:production:inquiry',
  'npm run r4:production:home:validate',
  'npm run r4:production:catalog:validate',
  'npm run r4:production:pdp:validate',
  'npm run r4:production:custom:validate',
  'npm run r4:production:inquiry:validate'
]);

function fail(message){errors.push(message);}
function read(relative){return fs.readFileSync(path.join(ROOT,relative),'utf8');}
function json(relative){return JSON.parse(read(relative));}
function expectFile(root,relative){
  const file=path.join(root,relative);
  if(!fs.existsSync(file)){fail('Missing file: '+path.relative(ROOT,file));return '';}
  return fs.readFileSync(file,'utf8');
}
function orderedSteps(value,steps){
  const text=String(value||'');
  let cursor=-1;
  for(const step of steps){
    const index=text.indexOf(step);
    if(index<0||index<=cursor)return false;
    cursor=index;
  }
  return true;
}
function stateText(html){
  const match=html.match(/<script[^>]*id="inquiryRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="inquiryRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  return match?match[1]:'';
}
function validateInquiryDocument(root,label){
  const html=expectFile(root,'inquiry/index.html');
  if(!html)return;

  for(const marker of [
    'data-r4-astro-foundation="true"',
    'data-r4-astro-inquiry="true"',
    'data-r4-inquiry-static="true"',
    'data-inquiry-runtime-presentation',
    'name="robots" content="noindex,nofollow"',
    'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/"',
    'id="inquiryRuntimeState"',
    'src="/r4-inquiry-runtime.js"',
    'data-site-language-enabled="true"'
  ]) if(!html.includes(marker))fail(label+' is missing: '+marker);

  for(const legacy of [
    'DREAMLAND_MPA_ACTIVE',
    'runtime-desktop-experience.js',
    'runtime-desktop-inquiry.js',
    'runtime-contact.js',
    'runtime-risk.js',
    'runtime-submission.js',
    'runtime-pwa.js',
    'runtime-inquiry-submission-flow.js',
    'hcaptcha',
    'startup-loader.js',
    'DreamlandContact',
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandInquirySubmissionFlow'
  ]) if(html.includes(legacy))fail(label+' crossed a Legacy/downstream boundary: '+legacy);

  const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];
  if(executable.length!==1)fail(label+' must contain exactly one executable route runtime; found '+executable.length+'.');
  const scriptSources=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(match=>match[1]);
  if(scriptSources.length!==1||scriptSources[0]!=='/r4-inquiry-runtime.js')fail(label+' executable graph must contain only /r4-inquiry-runtime.js.');

  const raw=stateText(html);
  if(!raw){
    fail(label+' runtime state is missing.');
  }else{
    try{
      const state=JSON.parse(raw);
      if(
        state.version!=='R4.7B'||
        state.storage?.languageKey!=='productManualLang'||
        state.storage?.inquiryKey!=='productManualV2State'||
        state.storage?.inquiryVersion!==2||
        state.routes?.contact!=='/inquiry/contact/'||
        state.products?.length!==89
      ) fail(label+' runtime-state ownership/storage contract changed.');

      for(const product of state.products||[]){
        const cover=String(product?.cover||'').replace(/[?#].*$/,'').replace(/^\/+/,'');
        if(cover&&!fs.existsSync(path.join(root,cover)))fail(label+' runtime Product cover is missing: '+product.cover);
      }
    }catch(error){
      fail(label+' runtime state JSON is invalid: '+error.message);
    }
  }

  if(!fs.existsSync(path.join(root,'r4-inquiry-runtime.js')))fail(label+' shared route runtime is missing.');
  const stylePaths=[...new Set([
    ...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi),
    ...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="stylesheet"[^>]*>/gi)
  ].map(match=>match[1]))];
  if(stylePaths.length<1||stylePaths.length>3)fail(label+' should reference 1-3 Astro stylesheet assets; found '+stylePaths.length+'.');
  for(const href of stylePaths){
    const relative=href.replace(/[?#].*$/,'').replace(/^\/+/,'');
    if(!fs.existsSync(path.join(root,relative)))fail(label+' stylesheet is missing: '+href);
  }
}

try{
  const pkg=json('package.json');
  if(!orderedSteps(pkg.scripts?.build,REQUIRED_BUILD_STEPS))fail('Production build must preserve staged Home/Catalog/PDP/Custom owners, promote Inquiry selection next, then validate all five Astro-owned Production routes.');
  for(const [name,value] of [
    ['r4:production:inquiry','node scripts/r4-promote-astro-inquiry.mjs --write'],
    ['r4:production:inquiry:contract','node scripts/validate-r4-production-inquiry-cutover.mjs --source'],
    ['r4:production:inquiry:validate','node scripts/validate-r4-production-inquiry-cutover.mjs --dist && node scripts/validate-r4-production-inquiry-detachment.mjs --dist']
  ]) if(pkg.scripts?.[name]!==value)fail('package.json is missing '+name+'.');

  const validate=String(pkg.scripts?.validate||'');
  const runtime=validate.indexOf('npm run r4:astro:inquiry-runtime');
  const customDetachment=validate.indexOf('npm run r4:production:custom:detachment');
  const inquiryContract=validate.indexOf('npm run r4:production:inquiry:contract');
  if(runtime<0||customDetachment<0||inquiryContract<=runtime||inquiryContract<=customDetachment)fail('R4.7C Inquiry Production contract must run after Inquiry Runtime and the completed Custom detachment source gate.');
}catch(error){
  fail('R4.7C package inspection failed: '+error.message);
}

try{
  const source=read('scripts/r4-promote-astro-inquiry.mjs');
  for(const marker of [
    "'.r4-astro-dist'",
    "'dist'",
    "'inquiry'",
    "'r4-inquiry-runtime.js'",
    "inquiry:'astro-r4.7c'",
    'manifest.inquiryOwner=',
    'manifest.inquiryCutover=',
    'runtimeState(',
    'data-r4-production-home="true"',
    'data-r4-astro-catalog="true"',
    'data-r4-astro-product="true"',
    'data-r4-astro-custom="true"',
    "'inquiry/contact/index.html'",
    "'inquiry/review/index.html'",
    "'inquiry/success/index.html'",
    "'sw.js'"
  ]) if(!source.includes(marker))fail('Inquiry promotion contract is missing: '+marker);
  if(/fs\.cpSync\s*\(\s*SOURCE_ROOT\s*,\s*TARGET_ROOT/.test(source))fail('R4.7C Inquiry promotion must remain route-scoped and must not copy the whole Astro output.');
}catch(error){
  fail('R4.7C promotion source inspection failed: '+error.message);
}

try{
  const page=read('src/astro/pages/inquiry/index.astro');
  for(const marker of [
    'robots="noindex,nofollow"',
    'canonical="https://dreamland-catalog.pages.dev/inquiry/"',
    'id="inquiryRuntimeState"',
    'src="/r4-inquiry-runtime.js"'
  ]) if(!page.includes(marker))fail('Astro Inquiry Production source is missing: '+marker);
  if(page.includes('robots="index,follow"'))fail('Inquiry is public=false and must remain noindex,nofollow after Production cutover.');

  const routes=json('data/page-routes.json').routes||{};
  if(
    routes.inquiry?.path!=='/inquiry/'||routes.inquiry?.public!==false||
    routes.contact?.path!=='/inquiry/contact/'||
    routes.review?.path!=='/inquiry/review/'||
    routes.success?.path!=='/inquiry/success/'
  ) fail('R4.7C Inquiry/downstream conversion route contract changed.');
}catch(error){
  fail('R4.7C Astro/route source inspection failed: '+error.message);
}

try{
  const sw=read('sw.js');
  if(!sw.includes("const CACHE_VERSION = 'dreamland-pwa-v129';"))fail('R4.7C unexpectedly changed the PWA cache/release baseline.');
}catch(error){
  fail('R4.7C Service Worker boundary inspection failed: '+error.message);
}

try{
  if(!read('R4_ASTRO_FOUNDATION.md').includes('## R4.7C — Production Inquiry Cutover'))fail('R4_ASTRO_FOUNDATION.md is missing the R4.7C Production cutover contract.');
}catch(error){
  fail('R4.7C foundation documentation inspection failed: '+error.message);
}

if(SOURCE_MODE)validateInquiryDocument(path.join(ROOT,'.r4-astro-dist'),'Isolated Inquiry');

if(DIST_MODE){
  const root=path.join(ROOT,'dist');
  validateInquiryDocument(root,'Production Inquiry');

  const home=expectFile(root,'index.html');
  if(home&&(!home.includes('data-r4-production-home="true"')||!home.includes('src="/r4-home-runtime.js"')||home.includes('DREAMLAND_MPA_ACTIVE')))fail('Production Home ownership changed during R4.7C.');

  const catalog=expectFile(root,'products/index.html');
  if(catalog&&(!catalog.includes('data-r4-astro-catalog="true"')||!catalog.includes('src="/r4-catalog-runtime.js"')||catalog.includes('DREAMLAND_MPA_ACTIVE')))fail('Production Catalog ownership changed during R4.7C.');

  const products=json('data/products.json').products||[];
  const firstProduct=products.find(product=>product?.status==='active');
  const productId=String(firstProduct?.productId||firstProduct?.id||'').trim().toUpperCase();
  if(!productId){
    fail('No active Product exists for R4.7C Production sentinel validation.');
  }else{
    const pdp=expectFile(root,path.join('products',productId,'index.html'));
    if(pdp&&(!pdp.includes('data-r4-astro-product="true"')||!pdp.includes('src="/r4-pdp-runtime.js"')||pdp.includes('DREAMLAND_MPA_ACTIVE')))fail('Production PDP ownership changed during R4.7C.');
  }

  const custom=expectFile(root,'custom/index.html');
  if(custom&&(!custom.includes('data-r4-astro-custom="true"')||!custom.includes('src="/r4-custom-runtime.js"')||custom.includes('DREAMLAND_MPA_ACTIVE')))fail('Production Custom ownership changed during R4.7C.');

  for(const relative of ['inquiry/contact/index.html','inquiry/review/index.html','inquiry/success/index.html']){
    const html=expectFile(root,relative);
    if(html&&!html.includes('window.DREAMLAND_MPA_ACTIVE=true;'))fail('Downstream conversion route must remain Legacy MPA during R4.7C: '+relative);
  }

  const manifest=JSON.parse(expectFile(root,'multipage-build-manifest.json')||'{}');
  for(const [key,expected] of [
    ['homeOwner','astro'],['catalogOwner','astro'],['pdpOwner','astro'],['customOwner','astro'],['inquiryOwner','astro']
  ]) if(manifest[key]!==expected)fail('Production manifest owner mismatch: '+key);
  if(
    manifest.homeCutover!=='B7-00B.4J-R4.3C'||
    manifest.catalogCutover!=='B7-00B.4J-R4.4C'||
    manifest.pdpCutover!=='B7-00B.4J-R4.5C'||
    manifest.customCutover!=='B7-00B.4J-R4.6C'||
    manifest.inquiryCutover!=='B7-00B.4J-R4.7C'||
    manifest.presentationOverrides?.inquiry!=='astro-r4.7c'
  ) fail('Production manifest lost a staged route-ownership/cutover contract.');

  expectFile(root,'sw.js');
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND B7-00B.4J R4.7C Production Inquiry Cutover: FAIL');
  for(const error of errors)console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND B7-00B.4J R4.7C Production Inquiry Cutover: PASS');
console.log(SOURCE_MODE
  ? 'Production pipeline / noindex route contract / route-scoped promotion verified; final SW ownership is delegated to the R4.7D gate.'
  : 'dist/ owns Astro Home + Catalog + 89 PDPs + Custom + Inquiry selection while Contact/Review/Success remain Legacy.');
console.log('');

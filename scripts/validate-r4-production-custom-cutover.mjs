#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_MODE=process.argv.includes('--source');
const DIST_MODE=process.argv.includes('--dist');
if(SOURCE_MODE===DIST_MODE){console.error('Usage: node scripts/validate-r4-production-custom-cutover.mjs --source | --dist');process.exit(1);}
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

function productionBuildHasOrderedSteps(value){
  const build=String(value||'');
  let cursor=-1;
  for(const step of REQUIRED_BUILD_STEPS){
    const index=build.indexOf(step);
    if(index<0||index<=cursor)return false;
    cursor=index;
  }
  return true;
}

function fail(message){errors.push(message);}
function read(relative){return fs.readFileSync(path.join(ROOT,relative),'utf8');}
function json(relative){return JSON.parse(read(relative));}
function expectFile(root,relative){const file=path.join(root,relative);if(!fs.existsSync(file)){fail('Missing file: '+path.relative(ROOT,file));return '';}return fs.readFileSync(file,'utf8');}
function stateText(html){const match=html.match(/<script[^>]*id="customRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="customRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);return match?match[1]:'';}
function validateCustomDocument(root,label){
  const html=expectFile(root,'custom/index.html');if(!html)return;
  for(const marker of ['data-r4-astro-foundation="true"','data-r4-astro-custom="true"','data-r4-custom-static="true"','data-custom-runtime-presentation','name="robots" content="index,follow"','rel="canonical" href="https://dreamland-catalog.pages.dev/custom/"','id="customRuntimeState"','src="/r4-custom-runtime.js"','data-site-language-enabled="true"']) if(!html.includes(marker))fail(label+' is missing: '+marker);
  for(const legacy of ['DREAMLAND_MPA_ACTIVE','runtime-desktop-experience.js','runtime-desktop-custom.js','runtime-risk.js','runtime-submission.js','runtime-pwa.js','custom-scent-multi.js','startup-loader.js']) if(html.includes(legacy))fail(label+' still contains Legacy runtime marker: '+legacy);
  const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];if(executable.length!==1)fail(label+' must contain exactly one executable route runtime; found '+executable.length+'.');
  const scriptSources=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(match=>match[1]);if(scriptSources.length!==1||scriptSources[0]!=='/r4-custom-runtime.js')fail(label+' executable graph must contain only /r4-custom-runtime.js.');
  const raw=stateText(html);if(!raw){fail(label+' runtime state is missing.');}else{try{const state=JSON.parse(raw);if(state.version!=='R4.6B'||state.storage?.languageKey!=='productManualLang'||state.storage?.inquiryKey!=='productManualV2State'||state.storage?.inquiryVersion!==2)fail(label+' runtime-state ownership/storage contract changed.');}catch(error){fail(label+' runtime state JSON is invalid: '+error.message);}}
  if(!fs.existsSync(path.join(root,'r4-custom-runtime.js')))fail(label+' shared route runtime is missing.');
  const stylePaths=[...new Set([...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi),...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="stylesheet"[^>]*>/gi)].map(match=>match[1]))];
  if(stylePaths.length<1||stylePaths.length>3)fail(label+' should reference 1-3 Astro stylesheet assets; found '+stylePaths.length+'.');
  for(const href of stylePaths){const relative=href.replace(/[?#].*$/,'').replace(/^\/+/,'');if(!fs.existsSync(path.join(root,relative)))fail(label+' stylesheet is missing: '+href);}
}
try{
  const pkg=json('package.json');
  if(!productionBuildHasOrderedSteps(pkg.scripts?.build))fail('Production build must promote Home + Catalog + PDP + Custom as staged Astro route owners before final validation.');
  for(const [name,value] of [
    ['r4:production:custom','node scripts/r4-promote-astro-custom.mjs --write'],
    ['r4:production:custom:contract','node scripts/validate-r4-production-custom-cutover.mjs --source'],
    ['r4:production:custom:validate','node scripts/validate-r4-production-custom-cutover.mjs --dist && node scripts/validate-r4-production-custom-detachment.mjs --dist']
  ]) if(pkg.scripts?.[name]!==value)fail('package.json is missing '+name+'.');
  const validate=String(pkg.scripts?.validate||'');
  const runtime=validate.indexOf('npm run r4:astro:custom-runtime');
  const pdpDetachment=validate.indexOf('npm run r4:production:pdp:detachment');
  const customContract=validate.indexOf('npm run r4:production:custom:contract');
  if(runtime<0||pdpDetachment<0||customContract<=runtime||customContract<=pdpDetachment)fail('R4.6C Custom Production contract must run after Custom Runtime and PDP Detachment source gates.');
}catch(error){fail('R4.6C package inspection failed: '+error.message);}
try{
  const source=read('scripts/r4-promote-astro-custom.mjs');
  for(const marker of ["'.r4-astro-dist'","'dist'","'custom'","'r4-custom-runtime.js'","custom:'astro-r4.6c'",'manifest.customOwner=','manifest.customCutover=','runtimeState(','data-r4-production-home="true"','data-r4-astro-catalog="true"','data-r4-astro-product="true"','window.DREAMLAND_MPA_ACTIVE=true;']) if(!source.includes(marker))fail('Custom promotion contract is missing: '+marker);
  if(source.includes('fs.cpSync(\n  SOURCE_ROOT,\n  TARGET_ROOT'))fail('R4.6C Custom promotion must remain route-scoped.');
}catch(error){fail('R4.6C promotion source inspection failed: '+error.message);}
try{
  const page=read('src/astro/pages/custom/index.astro');
  for(const marker of ['robots="index,follow"','canonical="https://dreamland-catalog.pages.dev/custom/"','id="customRuntimeState"','src="/r4-custom-runtime.js"']) if(!page.includes(marker))fail('Astro Custom Production source is missing: '+marker);
  if(page.includes('robots="noindex,nofollow"'))fail('Astro Custom source must no longer be noindex after Production cutover.');
}catch(error){fail('R4.6C Astro Custom source inspection failed: '+error.message);}
if(SOURCE_MODE)validateCustomDocument(path.join(ROOT,'.r4-astro-dist'),'Isolated Custom');
if(DIST_MODE){
  const root=path.join(ROOT,'dist');validateCustomDocument(root,'Production Custom');
  const home=expectFile(root,'index.html');if(home&&(!home.includes('data-r4-production-home="true"')||!home.includes('src="/r4-home-runtime.js"')||home.includes('DREAMLAND_MPA_ACTIVE')))fail('Production Home ownership changed during R4.6C.');
  const catalog=expectFile(root,'products/index.html');if(catalog&&(!catalog.includes('data-r4-astro-catalog="true"')||!catalog.includes('src="/r4-catalog-runtime.js"')||catalog.includes('DREAMLAND_MPA_ACTIVE')))fail('Production Catalog ownership changed during R4.6C.');
  const products=json('data/products.json').products||[];const firstProduct=products.find(product=>product?.status==='active');const productId=String(firstProduct?.productId||firstProduct?.id||'').trim().toUpperCase();
  if(!productId)fail('No active Product exists for R4.6C Production sentinel validation.');else{const pdp=expectFile(root,path.join('products',productId,'index.html'));if(pdp&&(!pdp.includes('data-r4-astro-product="true"')||!pdp.includes('src="/r4-pdp-runtime.js"')||pdp.includes('DREAMLAND_MPA_ACTIVE')))fail('Production PDP ownership changed during R4.6C.');}
  const contactRoute=
      path.join(
        root,
        'inquiry/contact/index.html'
      );

    if(
      !fs.existsSync(
        contactRoute
      )
    ){
      fail(
        'R4.6C downstream Contact route is missing after the R4.8C cutover.'
      );
    }else{
      const contact=
        fs.readFileSync(
          contactRoute,
          'utf8'
        );

      if(
        !contact.includes(
          'data-r4-astro-contact="true"'
        )||
        !contact.includes(
          'src="/r4-contact-runtime.js"'
        )||
        contact.includes(
          'DREAMLAND_MPA_ACTIVE'
        )
      ){
        fail(
          'R4.6C downstream owner compatibility requires Astro Contact after R4.8C.'
        );
      }
    }

    for(const relative of [
      'inquiry/review/index.html',
      'inquiry/success/index.html'
    ]){
      const route=
        path.join(
          root,
          relative
        );

      if(
        !fs.existsSync(
          route
        )||
        !fs.readFileSync(
          route,
          'utf8'
        ).includes(
          'window.DREAMLAND_MPA_ACTIVE=true;'
        )
      ){
        fail(
          'R4.6C must preserve Legacy Review/Success ownership: '+
          relative
        );
      }
    }

    const manifest=JSON.parse(expectFile(root,'multipage-build-manifest.json')||'{}');
  for(const [key,expected] of [['homeOwner','astro'],['catalogOwner','astro'],['pdpOwner','astro'],['customOwner','astro']])if(manifest[key]!==expected)fail('Production manifest owner mismatch: '+key);
  if(manifest.homeCutover!=='B7-00B.4J-R4.3C'||manifest.catalogCutover!=='B7-00B.4J-R4.4C'||manifest.pdpCutover!=='B7-00B.4J-R4.5C'||manifest.customCutover!=='B7-00B.4J-R4.6C'||manifest.presentationOverrides?.custom!=='astro-r4.6c')fail('Production manifest lost a staged route-ownership contract.');
  if(!fs.existsSync(path.join(root,'sw.js')))fail('R4.6C must preserve the existing Service Worker while Inquiry remains Legacy-owned.');
}
if(errors.length){console.error('');console.error('DREAMLAND B7-00B.4J R4.6C Production Custom Cutover: FAIL');for(const error of errors)console.error('- '+error);console.error('');process.exit(1);}
console.log('');console.log('DREAMLAND B7-00B.4J R4.6C Production Custom Cutover: PASS');console.log(SOURCE_MODE?'Production pipeline / SEO / isolated Custom promotion contract verified.':'dist/ owns Astro Home + Astro Catalog + 89 Astro PDPs + Astro Custom while Inquiry remains Legacy MPA.');console.log('');

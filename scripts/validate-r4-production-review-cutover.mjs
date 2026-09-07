#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_MODE=process.argv.includes('--source');
const DIST_MODE=process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error('Usage: node scripts/validate-r4-production-review-cutover.mjs --source | --dist');
  process.exit(1);
}

const errors=[];
function fail(message){errors.push(message);}
function read(relative){return fs.readFileSync(path.join(ROOT,relative),'utf8');}
function json(relative){return JSON.parse(read(relative));}
function hashFile(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function expectFile(root,relative){
  const file=path.join(root,relative);
  if(!fs.existsSync(file)){fail('Missing file: '+path.relative(ROOT,file));return '';} 
  return fs.readFileSync(file,'utf8');
}
function ordered(value,steps){
  const text=String(value||'');
  let cursor=-1;
  for(const step of steps){
    const index=text.indexOf(step);
    if(index<0||index<=cursor)return false;
    cursor=index;
  }
  return true;
}
function runtimeStateText(html){
  const match=html.match(/<script[^>]*id="reviewRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="reviewRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  return match?match[1]:'';
}
function validateReviewDocument(root,label){
  const html=expectFile(root,'inquiry/review/index.html');
  if(!html)return null;

  for(const marker of [
    'data-r4-astro-foundation="true"',
    'data-r4-astro-review="true"',
    'data-r4-review-static="true"',
    'data-review-static-presentation',
    'data-review-runtime-presentation',
    'name="robots" content="noindex,nofollow"',
    'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/review/"',
    'id="reviewRuntimeState"',
    'src="/r4-review-runtime.js"',
    'data-review-privacy',
    'data-review-submit'
  ]) if(!html.includes(marker)) fail(label+' is missing: '+marker);

  for(const forbidden of [
    'DREAMLAND_MPA_ACTIVE',
    'runtime-desktop-experience.js',
    'runtime-desktop-review.js',
    'startup-loader.js'
  ]) if(html.includes(forbidden)) fail(label+' still contains Legacy shell marker: '+forbidden);

  const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];
  if(executable.length!==1) fail(label+' must contain exactly one executable route runtime; found '+executable.length+'.');
  const sources=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(match=>match[1]);
  if(sources.length!==1||sources[0]!=='/r4-review-runtime.js') fail(label+' executable graph must contain only /r4-review-runtime.js.');

  const raw=runtimeStateText(html);
  if(!raw){
    fail(label+' runtime state is missing.');
  }else{
    try{
      const state=JSON.parse(raw);
      if(
        state.version!=='R4.9C'||
        JSON.stringify(state.languages)!==JSON.stringify(['en','zh','ko'])||
        state.storage?.languageKey!=='productManualLang'||
        state.storage?.inquiryKey!=='productManualV2State'||
        state.storage?.inquiryVersion!==2||
        state.storage?.contactKey!=='dreamlandContactDraftV1'||
        state.storage?.contactTtlMs!==86400000||
        state.storage?.pendingInquiryKey!=='dreamlandPendingInquiryIdV1'||
        state.routes?.inquiry!=='/inquiry/'||
        state.routes?.contact!=='/inquiry/contact/'||
        state.guard!=='hasValidContact'||
        !state.privacyVersion||
        !state.submission?.inquiryEndpoint||
        !state.submission?.riskEndpoint
      ) fail(label+' R4.9C shared-state/guard/submission contract changed.');
    }catch(error){
      fail(label+' runtime state JSON is invalid: '+error.message);
    }
  }

  const runtimeFile=path.join(root,'r4-review-runtime.js');
  if(!fs.existsSync(runtimeFile)) fail(label+' route runtime is missing.');
  return {html,file:path.join(root,'inquiry/review/index.html'),runtimeFile};
}
function validateReviewRuntime(source,label){
  for(const marker of [
    'root.DreamlandPricingPolicy=',
    'root.DreamlandInquiry=',
    'root.DreamlandContact=',
    'root.DreamlandPageGuards=',
    'root.DreamlandSubmissionPayload=',
    'root.DreamlandRisk=',
    'root.DreamlandSubmission=',
    'root.DreamlandPwa=api;',
    'root.DreamlandInquirySubmissionFlow=',
    'root.DreamlandReviewRuntime=',
    'globalThis.DREAMLAND_PWA_AUTO_REGISTER=false;',
    'delete globalThis.DREAMLAND_PWA_AUTO_REGISTER;',
    "const VERSION='R4.9C';"
  ]){
    const count=source.split(marker).length-1;
    if(count!==1) fail(label+' owner/boundary marker count must equal 1 for '+marker+'; found '+count+'.');
  }

  for(const marker of [
    'submissionPayload.build(',
    'submissionPayload.validate(',
    'risk.assess(',
    'risk.renderCaptcha(',
    'risk.ensureCaptcha(',
    'submissionFlow.submit({',
    "root.location?.assign?.(\n          '/inquiry/success/'"
  ]) if(!source.includes(marker)) fail(label+' canonical submission boundary is missing: '+marker);
}

try{
  const pkg=json('package.json');
  for(const [name,value] of [
    ['r4:production:review','node scripts/r4-promote-astro-review.mjs --write'],
    ['r4:production:review:contract','node scripts/validate-r4-production-review-cutover.mjs --source'],
    ['r4:production:review:validate','node scripts/validate-r4-production-review-cutover.mjs --dist']
  ]) if(pkg.scripts?.[name]!==value) fail('package.json is missing canonical '+name+'.');

  if(!ordered(pkg.scripts?.build,[
    'npm run r4:astro:build',
    'npm run r4:production:contact',
    'npm run r4:production:review',
    'npm run r4:production:home:validate',
    'npm run r4:production:contact:validate',
    'npm run r4:production:review:validate'
  ])) fail('Production build must promote Review after Contact and validate Review after all existing Production route validators.');

  if(!ordered(pkg.scripts?.validate,[
    'npm run r4:astro:review-submission',
    'npm run r4:production:contact:detachment',
    'npm run r4:production:review:contract'
  ])) fail('R4.9D source contract must run after R4.9C and the completed Contact detachment source gate.');

  if(String(pkg.scripts?.build||'').includes('r4:production:success')||pkg.scripts?.['r4:production:success']){
    fail('R4.9D must not introduce Production Success migration.');
  }
}catch(error){fail('R4.9D package inspection failed: '+error.message);}

try{
  const source=read('scripts/r4-promote-astro-review.mjs');
  for(const marker of [
    "'.r4-astro-dist'",
    "'dist'",
    "'inquiry','review','index.html'",
    "'r4-review-runtime.js'",
    "review:'astro-r4.9d'",
    'manifest.reviewOwner=',
    'manifest.reviewCutover=',
    "'inquiry','success','index.html'",
    "'sw.js'",
    'data-r4-production-home="true"',
    'data-r4-astro-contact="true"',
    'data-r4-astro-product="true"'
  ]) if(!source.includes(marker)) fail('Review promotion contract is missing: '+marker);
  if(/fs\.cpSync\s*\(\s*SOURCE_ROOT\s*,\s*TARGET_ROOT/.test(source)) fail('R4.9D Review promotion must remain route-scoped.');
}catch(error){fail('R4.9D promotion source inspection failed: '+error.message);}

try{
  const page=read('src/astro/pages/inquiry/review/index.astro');
  for(const marker of [
    'robots="noindex,nofollow"',
    'canonical="https://dreamland-catalog.pages.dev/inquiry/review/"',
    'id="reviewRuntimeState"',
    'src="/r4-review-runtime.js"',
    'languageEnabled={true}'
  ]) if(!page.includes(marker)) fail('Astro Review Production source is missing: '+marker);

  const routes=json('data/page-routes.json').routes||{};
  if(
    routes.inquiry?.path!=='/inquiry/'||
    routes.contact?.path!=='/inquiry/contact/'||routes.contact?.guard!=='hasInquiry'||
    routes.review?.path!=='/inquiry/review/'||routes.review?.public!==false||routes.review?.guard!=='hasValidContact'||
    routes.success?.path!=='/inquiry/success/'||routes.success?.guard!=='hasLastSubmission'
  ) fail('R4.9D Inquiry/Contact/Review/Success route guard contract changed.');
}catch(error){fail('R4.9D route source inspection failed: '+error.message);}

try{
  if(!read('R4_ASTRO_FOUNDATION.md').includes('## R4.9D — Production Review Cutover')) fail('R4_ASTRO_FOUNDATION.md is missing the R4.9D cutover contract.');
  if(!read('sw.js').includes("const CACHE_VERSION = 'dreamland-pwa-v129';")) fail('R4.9D source sw.js baseline changed.');
}catch(error){fail('R4.9D protected-boundary inspection failed: '+error.message);}

if(SOURCE_MODE){
  const isolated=validateReviewDocument(path.join(ROOT,'.r4-astro-dist'),'Isolated Review');
  if(isolated&&fs.existsSync(isolated.runtimeFile)) validateReviewRuntime(fs.readFileSync(isolated.runtimeFile,'utf8'),'Isolated Review runtime');
}

if(DIST_MODE){
  const distRoot=path.join(ROOT,'dist');
  const isolatedRoot=path.join(ROOT,'.r4-astro-dist');
  const production=validateReviewDocument(distRoot,'Production Review');
  const isolated=validateReviewDocument(isolatedRoot,'Isolated Review');

  if(production&&isolated){
    if(hashFile(production.file)!==hashFile(isolated.file)) fail('Production Review HTML differs from the isolated Astro Review artifact.');
    if(fs.existsSync(production.runtimeFile)&&fs.existsSync(isolated.runtimeFile)&&hashFile(production.runtimeFile)!==hashFile(isolated.runtimeFile)) fail('Production Review runtime differs from the isolated R4.9C runtime artifact.');
    if(fs.existsSync(production.runtimeFile)) validateReviewRuntime(fs.readFileSync(production.runtimeFile,'utf8'),'Production Review runtime');
  }

  const success=expectFile(distRoot,'inquiry/success/index.html');
  if(success&&(
    !success.includes('window.DREAMLAND_MPA_ACTIVE=true;')||
    success.includes('data-r4-astro-success="true"')||
    success.includes('src="/r4-success-runtime.js"')
  )) fail('Production Success must remain Legacy MPA in R4.9D.');

  const sourceSw=path.join(ROOT,'sw.js');
  const distSw=path.join(distRoot,'sw.js');
  if(!fs.existsSync(distSw)) fail('Production sw.js is missing.');
  else if(hashFile(sourceSw)!==hashFile(distSw)) fail('Production sw.js must remain byte-identical to the protected source sw.js in R4.9D.');

  for(const [relative,marker] of [
    ['index.html','data-r4-production-home="true"'],
    ['products/index.html','data-r4-astro-catalog="true"'],
    ['custom/index.html','data-r4-astro-custom="true"'],
    ['inquiry/index.html','data-r4-astro-inquiry="true"'],
    ['inquiry/contact/index.html','data-r4-astro-contact="true"']
  ]){
    const html=expectFile(distRoot,relative);
    if(html&&!html.includes(marker)) fail('Previously migrated Production owner regressed: '+relative);
  }

  const products=json('data/products.json').products||[];
  const active=products.filter(product=>product?.status==='active');
  if(active.length!==89) fail('R4.9D expected 89 active PDPs; found '+active.length+'.');
  else for(const product of active){
    const id=String(product?.productId||product?.id||'').trim().toUpperCase();
    const html=expectFile(distRoot,path.join('products',id,'index.html'));
    if(html&&!html.includes('data-r4-astro-product="true"')) fail('Production PDP ownership regressed: '+id);
  }

  const manifest=JSON.parse(expectFile(distRoot,'multipage-build-manifest.json')||'{}');
  for(const [key,expected] of [
    ['homeOwner','astro'],['catalogOwner','astro'],['pdpOwner','astro'],['customOwner','astro'],['inquiryOwner','astro'],['contactOwner','astro'],['reviewOwner','astro']
  ]) if(manifest[key]!==expected) fail('Production manifest owner mismatch: '+key);
  if(
    manifest.reviewCutover!=='B7-00B.4J-R4.9D'||
    manifest.presentationOverrides?.review!=='astro-r4.9d'||
    manifest.contactCutover!=='B7-00B.4J-R4.8C'||
    manifest.presentationOverrides?.contact!=='astro-r4.8c'
  ) fail('Production manifest lost the staged Contact → Review cutover contract.');
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND B7-00B.4J R4.9D Production Review Cutover: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND B7-00B.4J R4.9D Production Review Cutover: PASS');
console.log(SOURCE_MODE
  ? 'Production pipeline / canonical R4.9C submission boundary / Review-only ownership authorization / Success+sw.js protection verified.'
  : 'dist/ owns Astro Review from the isolated artifact; Success remains Legacy and sw.js remains byte-identical.');
console.log('');

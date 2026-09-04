#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'.r4-astro-dist');
const errors=[];
function fail(m){errors.push(m);}
function read(r){return fs.readFileSync(path.join(ROOT,r),'utf8');}
function json(r){return JSON.parse(read(r));}
function stateText(html){
  const m=html.match(/<script[^>]*id="reviewRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||
    html.match(/<script[^>]*type="application\/json"[^>]*id="reviewRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  return m?m[1]:'';
}

try{
  const htmlFile=path.join(OUT,'inquiry/review/index.html');
  const bundleFile=path.join(OUT,'r4-review-runtime.js');
  if(!fs.existsSync(htmlFile)||!fs.existsSync(bundleFile)){
    fail('R4.9C isolated Review HTML/runtime output is missing.');
  }else{
    const html=fs.readFileSync(htmlFile,'utf8');
    const bundle=fs.readFileSync(bundleFile,'utf8');
    for(const marker of [
      'data-review-runtime-presentation','data-review-privacy','data-review-submit',
      'data-review-security','data-review-captcha','src="/r4-review-runtime.js"',
      'id="reviewRuntimeState"','name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/review/"'
    ]){
      if(!html.includes(marker)) fail('R4.9C Review output is missing: '+marker);
    }
    if(html.includes('href="/inquiry/success/"')){
      fail('R4.9C must navigate to Success only after canonical successful submission.');
    }
    const raw=stateText(html);
    if(!raw){
      fail('R4.9C reviewRuntimeState is missing.');
    }else{
      const state=JSON.parse(raw);
      if(
        state.version!=='R4.9C'||state.guard!=='hasValidContact'||
        state.privacyVersion!=='2026-07-30'||
        state.submission?.transport!=='web3forms-direct'||
        state.submission?.inquiryEndpoint!=='/api/inquiry'||
        state.submission?.clientConfigEndpoint!=='/api/inquiry?client_config=1'||
        state.submission?.riskEndpoint!=='/api/risk'||
        state.submission?.cooldownMs!==10000||
        state.submission?.hcaptcha?.enabled!==true
      ) fail('R4.9C Review submission configuration does not match app-config.json.');
    }
    for(const marker of [
      'root.DreamlandSubmissionPayload=','root.DreamlandRisk=',
      'root.DreamlandSubmission=','root.DreamlandPwa=api;',
      'root.DreamlandInquirySubmissionFlow=','root.DreamlandReviewRuntime=',
      'globalThis.DREAMLAND_PWA_AUTO_REGISTER=false;',
      'delete globalThis.DREAMLAND_PWA_AUTO_REGISTER;'
    ]){
      if(!bundle.includes(marker)) fail('R4.9C bundle is missing canonical owner/boundary marker: '+marker);
    }
    const adapter=read('src/astro/runtime/review-runtime.js');
    for(const marker of [
      'submissionPayload.build(','submissionPayload.validate(','risk.assess(',
      'risk.renderCaptcha(','risk.ensureCaptcha(','submissionFlow.submit({',
      "root.location?.assign?.(\n          '/inquiry/success/'"
    ]){
      if(!adapter.includes(marker)) fail('R4.9C Review adapter is missing: '+marker);
    }
    for(const forbidden of ['fetch(','XMLHttpRequest','navigator.serviceWorker.register','registerServiceWorker()']){
      if(adapter.includes(forbidden)) fail('R4.9C adapter duplicated canonical transport/PWA registration logic: '+forbidden);
    }
    if(
      !/root\.DREAMLAND_PWA_AUTO_REGISTER!\s*==\s*false/.test(
        bundle
      )
    ){
      fail('Canonical PWA owner is missing isolated Review auto-registration opt-out.');
    }
  }
}catch(e){fail('R4.9C output validation crashed: '+e.message);}

try{
  const pwa=read('src/services/pwa/runtime-pwa.js');
  if(
    !/root\.DREAMLAND_PWA_AUTO_REGISTER!\s*==\s*false/.test(
      pwa
    )||
    !pwa.includes(
      'registerServiceWorker();'
    )
  ){
    fail('PWA canonical auto-registration opt-out/default behavior contract is incomplete.');
  }
  const pkg=json('package.json');
  if(pkg.scripts?.['r4:astro:review-submission']!=='node scripts/validate-r4-astro-review-submission.mjs'){
    fail('package.json is missing r4:astro:review-submission.');
  }
  const validate=String(pkg.scripts?.validate||'');
  const a=validate.indexOf('npm run r4:astro:review-runtime');
  const b=validate.indexOf('npm run r4:astro:review-submission');
  const c=validate.indexOf('npm run r4:production:home:contract');
  if(a<0||b<=a||c<=b) fail('R4.9C submission gate ordering is incorrect.');
  if(String(pkg.scripts?.build||'').includes('r4:production:review')) fail('R4.9C must not cut over Production Review.');
}catch(e){fail('R4.9C source/package validation crashed: '+e.message);}

if(errors.length){
  console.error('');
  console.error('DREAMLAND B7-00B.4J R4.9C Review Submission Boundary Integration: FAIL');
  for(const e of errors) console.error('- '+e);
  console.error('');
  process.exit(1);
}
console.log('');
console.log('DREAMLAND B7-00B.4J R4.9C Review Submission Boundary Integration: PASS');
console.log('canonical SubmissionPayload / Risk+hCaptcha / Submission / PWA reachability / InquirySubmissionFlow / privacy-consent / Success-on-success boundary verified; Production Review remains Legacy.');
console.log('');

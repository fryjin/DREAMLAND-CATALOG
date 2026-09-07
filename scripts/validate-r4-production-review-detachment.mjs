#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_MODE=process.argv.includes('--source');
const DIST_MODE=process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error('Usage: node scripts/validate-r4-production-review-detachment.mjs --source | --dist');
  process.exit(1);
}

const errors=[];

/*
 * Baseline measured immediately after the committed R4.9D cutover:
 * HTML 91.4 KiB / state 82.0 KiB / runtime 147.8 KiB / styles 19.1 KiB /
 * code gzip proxy 61.6 KiB / critical raw 258.3 KiB.
 * Budgets leave deliberate growth headroom without reopening the Legacy bundle.
 */
const BUDGETS=Object.freeze({
  htmlRaw:160*1024,
  stateRaw:128*1024,
  runtimeRaw:192*1024,
  styleRaw:96*1024,
  codeGzip:96*1024,
  criticalRaw:384*1024
});

function fail(message){errors.push(message);}
function read(relative){return fs.readFileSync(path.join(ROOT,relative),'utf8');}
function json(relative){return JSON.parse(read(relative));}
function bytes(file){return fs.statSync(file).size;}
function gzipBytes(file){return zlib.gzipSync(fs.readFileSync(file),{level:9}).length;}
function hashFile(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function kib(value){return (Number(value)/1024).toFixed(1);}

function blockBetween(source,startMarker,endMarker){
  const start=source.indexOf(startMarker);
  if(start<0)return '';
  const end=source.indexOf(endMarker,start+startMarker.length);
  return end<0?source.slice(start):source.slice(start,end);
}

function navigationSlice(source){
  return blockBetween(
    source,
    "if(request.mode==='navigate'){",
    "if(\n    url.pathname.includes('/data/')"
  );
}

function stateText(html){
  const match=
    html.match(/<script[^>]*id="reviewRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||
    html.match(/<script[^>]*type="application\/json"[^>]*id="reviewRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  return match?match[1]:'';
}

function validateReviewSw(source,label){
  for(const marker of [
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    "'b7-00b4j-r3-v129';",
    'const REVIEW_NAVIGATION_PATHS=',
    'function isReviewNavigation(',
    'async function purgeLegacyReviewEntries(',
    'async function reviewNetworkOnly(',
    'purgeLegacyReviewEntries()'
  ]){
    if(!source.includes(marker)){
      fail(label+' Review detachment contract is missing: '+marker);
    }
  }

  const reviewPathsEndMarker=
    source.includes(
      'const SUCCESS_NAVIGATION_PATHS='
    )
      ? 'const SUCCESS_NAVIGATION_PATHS='
      : 'const RELEASE_ASSETS';

  const pathsBlock=blockBetween(
    source,
    'const REVIEW_NAVIGATION_PATHS=',
    reviewPathsEndMarker
  );

  const reviewPaths=[
    ...pathsBlock.matchAll(/['"](\/inquiry\/review[^'"]*)['"]/g)
  ].map(match=>match[1]);

  const expectedPaths=[
    '/inquiry/review',
    '/inquiry/review/',
    '/inquiry/review/index.html'
  ];

  if(JSON.stringify(reviewPaths)!==JSON.stringify(expectedPaths)){
    fail(
      label+' Review navigation ownership must be exact route membership: '+
      expectedPaths.join(', ')+'; found '+reviewPaths.join(', ')+'.'
    );
  }

  if(pathsBlock.includes('/inquiry/success')){
    fail(label+' Review matcher absorbed the Legacy Success route.');
  }

  const matcher=blockBetween(
    source,
    'function isReviewNavigation(',
    'async function purgeLegacyReviewEntries('
  );

  if(!/REVIEW_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/.test(matcher)){
    fail(label+' isReviewNavigation must use exact REVIEW_NAVIGATION_PATHS membership.');
  }

  for(const forbidden of ['startsWith(','includes(']){
    if(matcher.includes(forbidden)){
      fail(label+' Review matcher must not use a broad pathname predicate: '+forbidden);
    }
  }

  const purge=blockBetween(
    source,
    'async function purgeLegacyReviewEntries(',
    'async function reviewNetworkOnly('
  );

  for(const marker of ['APP_CACHE','RUNTIME_CACHE','isReviewNavigation(','cache.delete(']){
    if(!purge.includes(marker)){
      fail(label+' Review stale-document purge is incomplete: '+marker);
    }
  }

  const networkOnly=blockBetween(
    source,
    'async function reviewNetworkOnly(',
    "self.addEventListener('install'"
  );

  if(!/cache\s*:\s*['"]no-store['"]/.test(networkOnly)){
    fail(label+' Review network-only navigation must use cache:no-store.');
  }

  if(!networkOnly.includes("caches.match(\n        './offline.html'")){
    fail(label+' Review network-only navigation must retain offline.html as network-failure fallback.');
  }

  const purgeCalls=(source.match(/purgeLegacyReviewEntries\s*\(\s*\)/g)||[]).length;
  if(purgeCalls<3){
    fail(label+' Review cache purge must be defined and run during both install and activate.');
  }

  const appShell=blockBetween(source,'const APP_SHELL = [','];');
  for(const forbidden of [
    "'./inquiry/review'",
    "'./inquiry/review/'",
    "'./inquiry/review/index.html'"
  ]){
    if(appShell.includes(forbidden)){
      fail(label+' APP_SHELL must not precache the Astro Review document: '+forbidden);
    }
  }

  /*
   * Success is still Legacy. DesktopExperience mounts both the historical
   * Review and Success presentation modules as one conversion-family shell,
   * so R4.9E detaches only the Review document/cache ownership. Do not prune
   * these shared Legacy assets until Success itself migrates.
   */
  for(const required of [
    "'./offline.html'",
    "'./src/services/pwa/runtime-pwa.js'",
    "'./src/services/submission/runtime-submission.js'",
    "'./src/services/risk/runtime-risk.js'",
    "'./src/site/runtime/runtime-page-guards.js'",
    "'./src/features/inquiry/runtime-inquiry.js'",
    "'./src/features/contact/runtime-contact.js'",
    "'./src/app/runtime-inquiry-submission-flow.js'",
    "'./src/ui/desktop/runtime-desktop-experience.js'",
    "'./src/ui/desktop/review/runtime-desktop-review.js'",
    "'./src/ui/desktop/success/runtime-desktop-success.js'"
  ]){
    if(!appShell.includes(required)){
      fail(label+' remaining Legacy Success shell lost a required conversion asset: '+required);
    }
  }

  const navigation=navigationSlice(source);
  if(!navigation){
    fail(label+' navigation branch could not be isolated.');
    return;
  }

  const checks=[
    ['Home',/isHomeNavigation\s*\(\s*url\s*\)/],
    ['Catalog',/isCatalogNavigation\s*\(\s*url\s*\)/],
    ['PDP',/isPdpNavigation\s*\(\s*url\s*\)/],
    ['Custom',/isCustomNavigation\s*\(\s*url\s*\)/],
    ['Inquiry',/isInquiryNavigation\s*\(\s*url\s*\)/],
    ['Contact',/isContactNavigation\s*\(\s*url\s*\)/],
    ['Review',/isReviewNavigation\s*\(\s*url\s*\)/],
    ['remaining Legacy networkFirst',/networkFirst\s*\(/]
  ];

  const positions=[];
  for(const [name,pattern] of checks){
    const index=navigation.search(pattern);
    positions.push(index);
    if(index<0)fail(label+' navigation split is missing: '+name);
  }

  if(
    positions.some(value=>value<0)||
    positions.some((value,index)=>index>0&&value<=positions[index-1])
  ){
    fail(
      label+
      ' navigation ownership must resolve Home → Catalog → PDP → Custom → Inquiry → Contact → Review before any authorized Success successor/fallback.'
    );
  }
}

function validateReviewDocument(root,label){
  const file=path.join(root,'inquiry','review','index.html');
  if(!fs.existsSync(file)){
    fail(label+' Review document is missing.');
    return null;
  }

  const html=fs.readFileSync(file,'utf8');

  for(const marker of [
    'data-r4-astro-foundation="true"',
    'data-r4-astro-review="true"',
    'data-r4-review-static="true"',
    'data-review-runtime-presentation',
    'name="robots" content="noindex,nofollow"',
    'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/review/"',
    'id="reviewRuntimeState"',
    'src="/r4-review-runtime.js"',
    'data-review-privacy',
    'data-review-submit'
  ]){
    if(!html.includes(marker))fail(label+' Review is missing hardening marker: '+marker);
  }

  for(const forbidden of [
    'DREAMLAND_MPA_ACTIVE',
    'runtime-desktop-experience.js',
    'runtime-desktop-review.js',
    'startup-loader.js',
    'serviceWorker.register',
    'navigator.serviceWorker'
  ]){
    if(html.includes(forbidden)){
      fail(label+' Review contains a forbidden Legacy/PWA document bootstrap reference: '+forbidden);
    }
  }

  const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];
  if(executable.length!==1){
    fail(label+' Review must contain exactly one executable route runtime; found '+executable.length+'.');
  }

  const scriptSources=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(match=>match[1]);
  if(scriptSources.length!==1||scriptSources[0]!=='/r4-review-runtime.js'){
    fail(label+' Review executable graph must contain only /r4-review-runtime.js.');
  }

  const rawState=stateText(html);
  let state=null;
  if(!rawState){
    fail(label+' Review runtime state is missing.');
  }else{
    try{
      state=JSON.parse(rawState);
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
      ){
        fail(label+' Review runtime-state shared-state/guard/submission contract changed.');
      }
    }catch(error){
      fail(label+' Review runtime state JSON is invalid: '+error.message);
    }
  }

  return {file,html,rawState,state};
}

function validateRuntimeBundle(source,label){
  for(const marker of [
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
    if(count!==1){
      fail(label+' canonical owner/suppression marker count must equal 1 for '+marker+'; found '+count+'.');
    }
  }
}

try{
  const pkg=json('package.json');

  if(
    pkg.scripts?.['r4:production:review:detachment']!==
    'node scripts/validate-r4-production-review-detachment.mjs --source'
  ){
    fail('package.json is missing r4:production:review:detachment.');
  }

  if(
    pkg.scripts?.['r4:production:review:validate']!==
    'node scripts/validate-r4-production-review-cutover.mjs --dist && node scripts/validate-r4-production-review-detachment.mjs --dist'
  ){
    fail('Final Production Review validation must chain R4.9D cutover + R4.9E detachment hardening.');
  }

  const validate=String(pkg.scripts?.validate||'');
  const cutover=validate.indexOf('npm run r4:production:review:contract');
  const detachment=validate.indexOf('npm run r4:production:review:detachment');
  if(cutover<0||detachment<=cutover){
    fail('R4.9E Review detachment source gate must run after the R4.9D cutover contract.');
  }

  const CANONICAL_R410C_SUCCESS_PROMOTION=
    'node scripts/r4-promote-astro-success.mjs --write';

  const productionSuccessScript=
    pkg.scripts
      ?.['r4:production:success'];

  const productionSuccessInBuild=
    String(
      pkg.scripts
        ?.build||
      ''
    ).includes(
      'npm run r4:production:success'
    );

  if(
    productionSuccessScript!==undefined||
    productionSuccessInBuild
  ){
    if(
      productionSuccessScript!==
        CANONICAL_R410C_SUCCESS_PROMOTION||
      !productionSuccessInBuild||
      pkg.scripts
        ?.['r4:production:success:contract']!==
        'node scripts/validate-r4-production-success-cutover.mjs --source'||
      ![
        'node scripts/validate-r4-production-success-cutover.mjs --dist',
        'node scripts/validate-r4-production-success-cutover.mjs --dist && node scripts/validate-r4-production-success-detachment.mjs --dist'
      ].includes(
        pkg.scripts
          ?.['r4:production:success:validate']
      )
    ){
      fail(
        'R4.9E only permits the exact canonical R4.10C Production Success successor.'
      );
    }
  }
}catch(error){
  fail('R4.9E package inspection failed: '+error.message);
}

try{
  validateReviewSw(read('sw.js'),'Source Service Worker');
}catch(error){
  fail('R4.9E source Service Worker inspection failed: '+error.message);
}

try{
  const adapter=read('src/astro/runtime/review-runtime.js');
  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'navigator.serviceWorker.register',
    'registerServiceWorker()'
  ]){
    if(adapter.includes(forbidden)){
      fail('Astro Review adapter crossed a direct transport/Service Worker registration boundary: '+forbidden);
    }
  }
}catch(error){
  fail('R4.9E Review adapter inspection failed: '+error.message);
}

if(SOURCE_MODE){
  try{
    validateReviewDocument(path.join(ROOT,'.r4-astro-dist'),'Isolated');

    const page=read('src/astro/pages/inquiry/review/index.astro');
    for(const marker of [
      'robots="noindex,nofollow"',
      'canonical="https://dreamland-catalog.pages.dev/inquiry/review/"',
      'id="reviewRuntimeState"',
      'src="/r4-review-runtime.js"',
      'languageEnabled={true}'
    ]){
      if(!page.includes(marker))fail('R4.9E Production Review source is missing: '+marker);
    }

    const routes=json('data/page-routes.json').routes||{};
    if(
      routes.review?.path!=='/inquiry/review/'||
      routes.review?.public!==false||
      routes.review?.guard!=='hasValidContact'||
      routes.success?.path!=='/inquiry/success/'||
      routes.success?.public!==false||
      routes.success?.guard!=='hasLastSubmission'
    ){
      fail('R4.9E Review/Success route guard contract changed.');
    }

    if(!read('R4_ASTRO_FOUNDATION.md').includes('## R4.9E — Review Legacy/PWA Detachment / Production Payload Hardening')){
      fail('R4_ASTRO_FOUNDATION.md is missing the R4.9E detachment contract.');
    }
  }catch(error){
    fail('R4.9E source Review inspection failed: '+error.message);
  }
}

if(DIST_MODE){
  try{
    const root=path.join(ROOT,'dist');
    const result=validateReviewDocument(root,'Production');

    if(result){
      const runtimeFile=path.join(root,'r4-review-runtime.js');
      if(!fs.existsSync(runtimeFile)){
        fail('Production Review runtime output is missing.');
      }

      const htmlRaw=bytes(result.file);
      const stateRaw=Buffer.byteLength(result.rawState||'','utf8');
      const runtimeRaw=fs.existsSync(runtimeFile)?bytes(runtimeFile):0;

      if(htmlRaw>BUDGETS.htmlRaw){
        fail('Production Review HTML exceeds '+kib(BUDGETS.htmlRaw)+' KiB: '+kib(htmlRaw)+' KiB.');
      }
      if(stateRaw>BUDGETS.stateRaw){
        fail('Production Review runtime state exceeds '+kib(BUDGETS.stateRaw)+' KiB: '+kib(stateRaw)+' KiB.');
      }
      if(runtimeRaw>BUDGETS.runtimeRaw){
        fail('Production Review runtime exceeds '+kib(BUDGETS.runtimeRaw)+' KiB: '+kib(runtimeRaw)+' KiB.');
      }

      if(fs.existsSync(runtimeFile)){
        validateRuntimeBundle(fs.readFileSync(runtimeFile,'utf8'),'Production Review runtime');
      }

      const stylePaths=[...new Set([
        ...result.html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi),
        ...result.html.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="stylesheet"[^>]*>/gi)
      ].map(match=>match[1]))];

      if(stylePaths.length<1||stylePaths.length>3){
        fail('Production Review should reference 1-3 Astro stylesheet assets; found '+stylePaths.length+'.');
      }

      const styleFiles=[];
      for(const href of stylePaths){
        const relative=href.replace(/[?#].*$/,'').replace(/^\/+/,'');
        const file=path.join(root,relative);
        if(!fs.existsSync(file)){
          fail('Production Review stylesheet output is missing: '+href);
        }else{
          styleFiles.push(file);
        }
      }

      const styleRaw=styleFiles.reduce((total,file)=>total+bytes(file),0);
      if(styleRaw>BUDGETS.styleRaw){
        fail('Production Review styles exceed '+kib(BUDGETS.styleRaw)+' KiB: '+kib(styleRaw)+' KiB.');
      }

      const criticalRaw=htmlRaw+runtimeRaw+styleRaw;
      let codeGzip=0;
      if(fs.existsSync(runtimeFile)&&styleFiles.length===stylePaths.length){
        codeGzip=
          gzipBytes(result.file)+
          gzipBytes(runtimeFile)+
          styleFiles.reduce((total,file)=>total+gzipBytes(file),0);

        if(codeGzip>BUDGETS.codeGzip){
          fail('Production Review HTML+JS+CSS gzip proxy exceeds '+kib(BUDGETS.codeGzip)+' KiB: '+kib(codeGzip)+' KiB.');
        }
        if(criticalRaw>BUDGETS.criticalRaw){
          fail('Production Review critical raw payload exceeds '+kib(BUDGETS.criticalRaw)+' KiB: '+kib(criticalRaw)+' KiB.');
        }
      }

      if(!errors.length){
        console.log('');
        console.log('[R4.9E Review Payload]');
        console.log('- HTML:',kib(htmlRaw)+' KiB raw');
        console.log('- Runtime state:',kib(stateRaw)+' KiB raw');
        console.log('- Runtime:',kib(runtimeRaw)+' KiB raw');
        console.log('- Styles:',kib(styleRaw)+' KiB raw / '+styleFiles.length+' file(s)');
        console.log('- HTML+JS+CSS gzip proxy:',kib(codeGzip)+' KiB');
        console.log('- Critical raw:',kib(criticalRaw)+' KiB');
      }
    }

    const swFile=path.join(root,'sw.js');
    if(!fs.existsSync(swFile)){
      fail('Production Service Worker is missing while Success remains Legacy-owned.');
    }else{
      validateReviewSw(fs.readFileSync(swFile,'utf8'),'Production Service Worker');
      const sourceSw=path.join(ROOT,'sw.js');
      if(hashFile(sourceSw)!==hashFile(swFile)){
        fail('Production sw.js must remain byte-identical to the committed source Service Worker.');
      }
    }

    const successFile=path.join(root,'inquiry','success','index.html');
    if(!fs.existsSync(successFile)){
      fail('Production Success document is missing.');
    }else{
      const success=fs.readFileSync(successFile,'utf8');
      if(
        !success.includes('window.DREAMLAND_MPA_ACTIVE=true;')||
        success.includes('data-r4-astro-success="true"')||
        success.includes('src="/r4-success-runtime.js"')
      ){
        if(
        json('package.json').scripts?.['r4:production:success']!==
          'node scripts/r4-promote-astro-success.mjs --write'
      ){
        fail('R4.9E must preserve Legacy Success ownership before the authorized R4.10C successor.');
      }
      }
    }

    const manifestFile=path.join(root,'multipage-build-manifest.json');
    if(!fs.existsSync(manifestFile)){
      fail('Production ownership manifest is missing.');
    }else{
      const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
      for(const [key,expected] of [
        ['homeOwner','astro'],
        ['catalogOwner','astro'],
        ['pdpOwner','astro'],
        ['customOwner','astro'],
        ['inquiryOwner','astro'],
        ['contactOwner','astro'],
        ['reviewOwner','astro']
      ]){
        if(manifest[key]!==expected)fail('Production manifest owner mismatch: '+key);
      }
      if(
        manifest.reviewCutover!=='B7-00B.4J-R4.9D'||
        manifest.presentationOverrides?.review!=='astro-r4.9d'
      ){
        fail('Production manifest lost the R4.9D Review ownership contract.');
      }
    }
  }catch(error){
    fail('R4.9E dist-mode validation failed: '+error.message);
  }
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND B7-00B.4J R4.9E Review Legacy/PWA Detachment / Production Payload Hardening: FAIL');
  for(const error of errors)console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND B7-00B.4J R4.9E Review Legacy/PWA Detachment / Production Payload Hardening: PASS');
console.log(
  SOURCE_MODE
    ? 'Review exact-route Service Worker ownership / stale-cache purge / network-only no-store / Legacy Success shell boundary verified.'
    : 'Production Review cache isolation, Legacy Success boundary and Review payload budgets verified.'
);
console.log('');

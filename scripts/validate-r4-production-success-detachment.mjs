#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  '..'
);

const SOURCE_MODE=
  process.argv.includes('--source');

const DIST_MODE=
  process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error(
    'Usage: node scripts/validate-r4-production-success-detachment.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

/*
 * R4.10D is intentionally a document/cache ownership hardening stage.
 * The budgets are conservative guardrails for the already-approved R4.10B
 * presentation/runtime, not a redesign target.
 */
const BUDGETS=Object.freeze({
  htmlRaw:192*1024,
  stateRaw:128*1024,
  runtimeRaw:160*1024,
  styleRaw:128*1024,
  codeGzip:128*1024,
  criticalRaw:480*1024
});

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function bytes(file){
  return fs.statSync(file).size;
}

function gzipBytes(file){
  return zlib
    .gzipSync(
      fs.readFileSync(file),
      {level:9}
    )
    .length;
}

function hashFile(file){
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(file)
    )
    .digest('hex');
}

function kib(value){
  return (
    Number(value)/
    1024
  ).toFixed(1);
}

function blockBetween(
  source,
  startMarker,
  endMarker
){
  const start=
    source.indexOf(
      startMarker
    );

  if(start<0){
    return '';
  }

  const end=
    source.indexOf(
      endMarker,
      start+
      startMarker.length
    );

  return end<0
    ? source.slice(start)
    : source.slice(start,end);
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
    html.match(
      /<script[^>]*id="successRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="successRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

function styleFiles(root,html){
  const hrefs=[
    ...new Set(
      [
        ...html.matchAll(
          /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi
        ),
        ...html.matchAll(
          /<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="stylesheet"[^>]*>/gi
        )
      ].map(
        match=>match[1]
      )
    )
  ];

  return hrefs
    .map(
      href=>
        href
          .replace(/[?#].*$/,'')
          .replace(/^\/+/,'')
    )
    .map(
      relative=>
        path.join(
          root,
          relative
        )
    )
    .filter(
      file=>
        fs.existsSync(file)
    );
}

function validateSuccessSw(source,label){
  for(const marker of [
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    "'b7-00b4j-r3-v129';",
    'const REVIEW_NAVIGATION_PATHS=',
    'const SUCCESS_NAVIGATION_PATHS=',
    'function isSuccessNavigation(',
    'async function purgeLegacySuccessEntries(',
    'async function successNetworkOnly(',
    'purgeLegacySuccessEntries()'
  ]){
    if(!source.includes(marker)){
      fail(
        label+
        ' Success detachment contract is missing: '+
        marker
      );
    }
  }

  const pathsBlock=
    blockBetween(
      source,
      'const SUCCESS_NAVIGATION_PATHS=',
      'const RELEASE_ASSETS'
    );

  const successPaths=[
    ...pathsBlock.matchAll(
      /['"](\/inquiry\/success[^'"]*)['"]/g
    )
  ].map(
    match=>match[1]
  );

  const expectedPaths=[
    '/inquiry/success',
    '/inquiry/success/',
    '/inquiry/success/index.html'
  ];

  if(
    JSON.stringify(successPaths)!==
    JSON.stringify(expectedPaths)
  ){
    fail(
      label+
      ' Success navigation ownership must use exact route membership: '+
      expectedPaths.join(', ')+
      '; found '+
      successPaths.join(', ')+
      '.'
    );
  }

  const matcher=
    blockBetween(
      source,
      'function isSuccessNavigation(',
      'async function purgeLegacySuccessEntries('
    );

  if(
    !/SUCCESS_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/.test(
      matcher
    )
  ){
    fail(
      label+
      ' isSuccessNavigation must use exact SUCCESS_NAVIGATION_PATHS membership.'
    );
  }

  for(const forbidden of [
    'startsWith(',
    'includes('
  ]){
    if(matcher.includes(forbidden)){
      fail(
        label+
        ' Success matcher must not use a broad pathname predicate: '+
        forbidden
      );
    }
  }

  const purge=
    blockBetween(
      source,
      'async function purgeLegacySuccessEntries(',
      'async function successNetworkOnly('
    );

  for(const marker of [
    'APP_CACHE',
    'RUNTIME_CACHE',
    'isSuccessNavigation(',
    'cache.delete('
  ]){
    if(!purge.includes(marker)){
      fail(
        label+
        ' Success stale-document purge is incomplete: '+
        marker
      );
    }
  }

  const networkOnly=
    blockBetween(
      source,
      'async function successNetworkOnly(',
      "self.addEventListener('install'"
    );

  if(
    !/cache\s*:\s*['"]no-store['"]/.test(
      networkOnly
    )
  ){
    fail(
      label+
      ' Success network-only navigation must use cache:no-store.'
    );
  }

  if(
    !networkOnly.includes(
      "caches.match(\n        './offline.html'"
    )
  ){
    fail(
      label+
      ' Success network-only navigation must retain offline.html as network-failure fallback.'
    );
  }

  const purgeCalls=
    (
      source.match(
        /purgeLegacySuccessEntries\s*\(\s*\)/g
      )||
      []
    ).length;

  if(purgeCalls<3){
    fail(
      label+
      ' Success cache purge must be defined and run during both install and activate.'
    );
  }

  const appShell=
    blockBetween(
      source,
      'const APP_SHELL = [',
      '];'
    );

  for(const forbidden of [
    "'./inquiry/success'",
    "'./inquiry/success/'",
    "'./inquiry/success/index.html'"
  ]){
    if(appShell.includes(forbidden)){
      fail(
        label+
        ' APP_SHELL must not precache the Astro Success document: '+
        forbidden
      );
    }
  }

  /*
   * R4.10D is not the broad Legacy-file deletion stage. Keep the old Success
   * presentation source available while proving it can no longer own the
   * Production Success document/cache path.
   */
  if(
    !source.includes(
      "'./src/ui/desktop/success/runtime-desktop-success.js'"
    )
  ){
    fail(
      label+
      ' R4.10D unexpectedly pruned the Legacy Success source/cache compatibility asset.'
    );
  }

  const navigation=
    navigationSlice(
      source
    );

  if(!navigation){
    fail(
      label+
      ' navigation branch could not be isolated.'
    );
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
    ['Success',/isSuccessNavigation\s*\(\s*url\s*\)/],
    ['remaining navigation fallback',/networkFirst\s*\(/]
  ];

  const positions=[];

  for(const [name,pattern] of checks){
    const index=
      navigation.search(
        pattern
      );

    positions.push(index);

    if(index<0){
      fail(
        label+
        ' navigation split is missing: '+
        name
      );
    }
  }

  if(
    positions.some(
      value=>value<0
    )||
    positions.some(
      (
        value,
        index
      )=>
        index>0&&
        value<=positions[index-1]
    )
  ){
    fail(
      label+
      ' navigation ownership must resolve Home → Catalog → PDP → Custom → Inquiry → Contact → Review → Success → remaining fallback.'
    );
  }
}

function validateSuccessDocument(root,label){
  const file=
    path.join(
      root,
      'inquiry',
      'success',
      'index.html'
    );

  if(!fs.existsSync(file)){
    fail(
      label+
      ' Success document is missing.'
    );
    return null;
  }

  const html=
    fs.readFileSync(
      file,
      'utf8'
    );

  for(const marker of [
    'data-r4-astro-foundation="true"',
    'data-r4-astro-success="true"',
    'data-r4-success-static="true"',
    'data-success-static-presentation',
    'data-site-language-enabled="true"',
    'name="robots" content="noindex,nofollow"',
    'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/success/"',
    'id="successRuntimeState"',
    'src="/r4-success-runtime.js"',
    'data-success-guard-name="hasLastSubmission"',
    'data-success-guard-code="SUBMISSION_REQUIRED"',
    'data-success-guard-target="/inquiry/"'
  ]){
    if(!html.includes(marker)){
      fail(
        label+
        ' Success is missing hardening marker: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'DREAMLAND_MPA_ACTIVE',
    'runtime-desktop-experience.js',
    'runtime-desktop-success.js',
    'startup-loader.js',
    'runtime-submission.js',
    'runtime-risk.js',
    'runtime-pwa.js',
    'runtime-inquiry-submission-flow.js',
    'serviceWorker.register',
    'navigator.serviceWorker'
  ]){
    if(html.includes(forbidden)){
      fail(
        label+
        ' Success contains a forbidden Legacy/submission/PWA document bootstrap: '+
        forbidden
      );
    }
  }

  const rawState=
    stateText(
      html
    );

  if(!rawState){
    fail(
      label+
      ' Success runtime state is missing.'
    );
  }else{
    try{
      const state=
        JSON.parse(
          rawState
        );

      if(
        state.version!==
          'R4.10B'||
        state.storage
          ?.languageKey!==
          'productManualLang'||
        state.storage
          ?.lastSubmissionKey!==
          'dreamlandLastSubmissionV1'||
        state.routes
          ?.inquiry!==
          '/inquiry/'||
        state.routes
          ?.catalog!==
          '/products/'||
        state.routes
          ?.custom!==
          '/custom/'||
        state.guard!==
          'hasLastSubmission'
      ){
        fail(
          label+
          ' Success R4.10B runtime-state contract changed.'
        );
      }
    }catch(error){
      fail(
        label+
        ' Success runtime state JSON is invalid: '+
        error.message
      );
    }
  }

  const runtimeFile=
    path.join(
      root,
      'r4-success-runtime.js'
    );

  if(!fs.existsSync(runtimeFile)){
    fail(
      label+
      ' Success runtime is missing.'
    );
  }

  return {
    file,
    html,
    rawState,
    runtimeFile
  };
}

function validateRuntime(source,label){
  for(const [marker,name] of [
    [
      'root.DreamlandStorage=Object.freeze',
      'DreamlandStorage'
    ],
    [
      'root.DreamlandPageGuards=Object.freeze',
      'DreamlandPageGuards'
    ],
    [
      'root.DreamlandSuccessRuntime=',
      'DreamlandSuccessRuntime'
    ],
    [
      "const VERSION='R4.10B';",
      'R4.10B adapter'
    ]
  ]){
    const count=
      source.split(marker).length-1;

    if(count!==1){
      fail(
        label+
        ' marker count must equal 1 for '+
        name+
        '; found '+
        count+
        '.'
      );
    }
  }

  for(const forbidden of [
    'root.DreamlandSubmission=',
    'root.DreamlandRisk=',
    'root.DreamlandInquirySubmissionFlow=',
    'root.DreamlandPwa=',
    'runtime-desktop-success.js'
  ]){
    if(source.includes(forbidden)){
      fail(
        label+
        ' crossed a forbidden owner boundary: '+
        forbidden
      );
    }
  }
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:production:success:detachment']!==
      'node scripts/validate-r4-production-success-detachment.mjs --source'
  ){
    fail(
      'package.json is missing canonical r4:production:success:detachment.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:success:validate']!==
      'node scripts/validate-r4-production-success-cutover.mjs --dist && node scripts/validate-r4-production-success-detachment.mjs --dist'
  ){
    fail(
      'Final Production Success validation must chain R4.10C cutover + R4.10D detachment hardening.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const cutover=
    validate.indexOf(
      'npm run r4:production:success:contract'
    );

  const detachment=
    validate.indexOf(
      'npm run r4:production:success:detachment'
    );

  if(
    cutover<0||
    detachment<=cutover
  ){
    fail(
      'R4.10D Success detachment source gate must run after the R4.10C cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.10D package inspection failed: '+
    error.message
  );
}

try{
  validateSuccessSw(
    read('sw.js'),
    'Source Service Worker'
  );
}catch(error){
  fail(
    'R4.10D source Service Worker inspection failed: '+
    error.message
  );
}

try{
  if(
    !read(
      'src/ui/desktop/success/runtime-desktop-success.js'
    ).includes(
      'root.DreamlandDesktopSuccess=Object.freeze'
    )
  ){
    fail(
      'R4.10D must preserve the Legacy Success source module; this stage detaches ownership rather than deleting history.'
    );
  }

  const routes=
    json(
      'data/page-routes.json'
    )
      .routes||
    {};

  if(
    routes.success?.path!==
      '/inquiry/success/'||
    routes.success?.public!==
      false||
    routes.success?.guard!==
      'hasLastSubmission'
  ){
    fail(
      'R4.10D canonical Success route/guard contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.10D Success source boundary inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  try{
    const isolated=
      validateSuccessDocument(
        path.join(
          ROOT,
          '.r4-astro-dist'
        ),
        'Isolated'
      );

    if(
      isolated&&
      fs.existsSync(
        isolated.runtimeFile
      )
    ){
      validateRuntime(
        fs.readFileSync(
          isolated.runtimeFile,
          'utf8'
        ),
        'Isolated Success runtime'
      );
    }
  }catch(error){
    fail(
      'R4.10D isolated Success inspection failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  try{
    const distRoot=
      path.join(
        ROOT,
        'dist'
      );

    const isolatedRoot=
      path.join(
        ROOT,
        '.r4-astro-dist'
      );

    const production=
      validateSuccessDocument(
        distRoot,
        'Production'
      );

    const isolated=
      validateSuccessDocument(
        isolatedRoot,
        'Isolated'
      );

    if(
      production&&
      isolated
    ){
      if(
        hashFile(production.file)!==
        hashFile(isolated.file)
      ){
        fail(
          'Production Success HTML differs from the isolated Astro artifact.'
        );
      }

      if(
        fs.existsSync(production.runtimeFile)&&
        fs.existsSync(isolated.runtimeFile)&&
        hashFile(production.runtimeFile)!==
        hashFile(isolated.runtimeFile)
      ){
        fail(
          'Production Success runtime differs from the isolated R4.10B artifact.'
        );
      }

      if(fs.existsSync(production.runtimeFile)){
        validateRuntime(
          fs.readFileSync(
            production.runtimeFile,
            'utf8'
          ),
          'Production Success runtime'
        );
      }

      const styles=
        styleFiles(
          distRoot,
          production.html
        );

      const htmlRaw=
        bytes(
          production.file
        );

      const stateRaw=
        Buffer.byteLength(
          production.rawState||
          '',
          'utf8'
        );

      const runtimeRaw=
        bytes(
          production.runtimeFile
        );

      const styleRaw=
        styles.reduce(
          (
            total,
            file
          )=>
            total+
            bytes(file),
          0
        );

      const codeGzip=
        gzipBytes(
          production.file
        )+
        gzipBytes(
          production.runtimeFile
        )+
        styles.reduce(
          (
            total,
            file
          )=>
            total+
            gzipBytes(file),
          0
        );

      const criticalRaw=
        htmlRaw+
        runtimeRaw+
        styleRaw;

      console.log('');
      console.log('[R4.10D Success Payload]');
      console.log('- HTML: '+kib(htmlRaw)+' KiB raw');
      console.log('- Runtime state: '+kib(stateRaw)+' KiB raw');
      console.log('- Runtime: '+kib(runtimeRaw)+' KiB raw');
      console.log(
        '- Styles: '+
        kib(styleRaw)+
        ' KiB raw / '+
        styles.length+
        ' file(s)'
      );
      console.log(
        '- HTML+JS+CSS gzip proxy: '+
        kib(codeGzip)+
        ' KiB'
      );
      console.log(
        '- Critical raw: '+
        kib(criticalRaw)+
        ' KiB'
      );
      console.log('');

      for(const [
        key,
        actual
      ] of [
        ['htmlRaw',htmlRaw],
        ['stateRaw',stateRaw],
        ['runtimeRaw',runtimeRaw],
        ['styleRaw',styleRaw],
        ['codeGzip',codeGzip],
        ['criticalRaw',criticalRaw]
      ]){
        if(
          actual>
          BUDGETS[key]
        ){
          fail(
            'Success payload budget exceeded for '+
            key+
            ': '+
            kib(actual)+
            ' KiB > '+
            kib(BUDGETS[key])+
            ' KiB.'
          );
        }
      }
    }

    const sourceSw=
      path.join(
        ROOT,
        'sw.js'
      );

    const distSw=
      path.join(
        distRoot,
        'sw.js'
      );

    if(!fs.existsSync(distSw)){
      fail(
        'Production sw.js is missing.'
      );
    }else{
      if(
        hashFile(sourceSw)!==
        hashFile(distSw)
      ){
        fail(
          'Production sw.js must be byte-identical to the R4.10D source Service Worker.'
        );
      }

      validateSuccessSw(
        fs.readFileSync(
          distSw,
          'utf8'
        ),
        'Production Service Worker'
      );
    }

    const manifest=
      JSON.parse(
        fs.readFileSync(
          path.join(
            distRoot,
            'multipage-build-manifest.json'
          ),
          'utf8'
        )
      );

    if(
      manifest.successOwner!==
        'astro'||
      manifest.successCutover!==
        'B7-00B.4J-R4.10C'||
      manifest.presentationOverrides
        ?.success!==
        'astro-r4.10c'
    ){
      fail(
        'Production manifest lost the R4.10C Success ownership contract.'
      );
    }
  }catch(error){
    fail(
      'R4.10D Production inspection failed: '+
      error.message
    );
  }
}

try{
  const foundation=
    read(
      'R4_ASTRO_FOUNDATION.md'
    );

  for(const marker of [
    '## R4.10D — Success Legacy/PWA Detachment + Production Payload Hardening',
    'R4.10 architecture migration closes',
    'R4.11 — Visual Restoration / Develop Parity'
  ]){
    if(!foundation.includes(marker)){
      fail(
        'R4.10D foundation handoff documentation is incomplete: '+
        marker
      );
    }
  }

  const visualPlan=
    read(
      'R4_VISUAL_RESTORATION_PLAN.md'
    );

  if(
    !visualPlan.includes(
      'architecture freeze begins after R4.10D remote closure'
    )
  ){
    fail(
      'R4.11 visual restoration plan is not explicitly queued behind R4.10D remote closure.'
    );
  }
}catch(error){
  fail(
    'R4.10D roadmap documentation inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.10D Success Legacy/PWA Detachment / Production Payload Hardening: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+
      error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.10D Success Legacy/PWA Detachment / Production Payload Hardening: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Exact Success Service Worker ownership / stale-document purge / network-only navigation / R4.10C Success preservation / R4.11 architecture-freeze handoff verified.'
    : 'Production Success cache isolation, byte-identical Astro artifact/runtime, Service Worker detachment and payload budgets verified.'
);
console.log('');

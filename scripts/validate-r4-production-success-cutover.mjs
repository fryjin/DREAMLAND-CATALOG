#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
    'Usage: node scripts/validate-r4-production-success-cutover.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

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

function hashFile(file){
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(file)
    )
    .digest('hex');
}

function expectFile(root,relative){
  const file=
    path.join(
      root,
      relative
    );

  if(!fs.existsSync(file)){
    fail(
      'Missing file: '+
      path.relative(ROOT,file)
    );
    return '';
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}

function ordered(value,steps){
  const text=
    String(
      value||
      ''
    );

  let cursor=-1;

  for(const step of steps){
    const index=
      text.indexOf(step);

    if(
      index<0||
      index<=cursor
    ){
      return false;
    }

    cursor=index;
  }

  return true;
}

function runtimeStateText(html){
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
    'data-success-static-reference',
    'data-success-static-next',
    'data-success-static-details',
    'data-success-static-actions',
    'data-site-language-enabled="true"',
    'name="robots" content="noindex,nofollow"',
    'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/success/"',
    'id="successRuntimeState"',
    'src="/r4-success-runtime.js"',
    'data-success-guard-name="hasLastSubmission"',
    'data-success-guard-code="SUBMISSION_REQUIRED"',
    'data-success-guard-target="/inquiry/"',
    'data-success-static-action="explore"',
    'data-success-static-action="custom"'
  ]){
    if(!html.includes(marker)){
      fail(
        label+
        ' Success is missing cutover marker: '+
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
        ' Success contains a forbidden Legacy/submission/PWA bootstrap: '+
        forbidden
      );
    }
  }

  const executable=[
    ...html.matchAll(
      /<script\b(?![^>]*type="application\/json")[^>]*>/gi
    )
  ];

  if(executable.length!==1){
    fail(
      label+
      ' Success must contain exactly one executable route runtime; found '+
      executable.length+
      '.'
    );
  }

  const scriptSources=[
    ...html.matchAll(
      /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi
    )
  ].map(
    match=>match[1]
  );

  if(
    scriptSources.length!==1||
    scriptSources[0]!==
      '/r4-success-runtime.js'
  ){
    fail(
      label+
      ' Success executable graph must contain only /r4-success-runtime.js.'
    );
  }

  const rawState=
    runtimeStateText(html);

  let state=null;

  if(!rawState){
    fail(
      label+
      ' Success runtime state is missing.'
    );
  }else{
    try{
      state=
        JSON.parse(
          rawState
        );

      if(
        state.version!==
          'R4.10B'||
        JSON.stringify(
          state.languages
        )!==
          JSON.stringify([
            'en',
            'zh',
            'ko'
          ])||
        state.defaultLanguage!==
          'en'||
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
          ' Success R4.10B state/storage/guard contract changed.'
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
      ' Success route runtime is missing.'
    );
  }

  return {
    file,
    html,
    rawState,
    state,
    runtimeFile
  };
}

function validateSuccessRuntime(source,label){
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
        ' owner/boundary marker count must equal 1 for '+
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
        ' crossed a forbidden runtime owner boundary: '+
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

  for(const [name,value] of [
    [
      'r4:production:success',
      'node scripts/r4-promote-astro-success.mjs --write'
    ],
    [
      'r4:production:success:contract',
      'node scripts/validate-r4-production-success-cutover.mjs --source'
    ]
  ]){
    if(pkg.scripts?.[name]!==value){
      fail(
        'package.json is missing canonical '+
        name+
        '.'
      );
    }
  }

  const successValidate=
    String(
      pkg.scripts
        ?.['r4:production:success:validate']||
      ''
    );

  const accepted=[
    'node scripts/validate-r4-production-success-cutover.mjs --dist',
    'node scripts/validate-r4-production-success-cutover.mjs --dist && node scripts/validate-r4-production-success-detachment.mjs --dist'
  ];

  if(!accepted.includes(successValidate)){
    fail(
      'Production Success validation is neither the R4.10C cutover gate nor the reserved R4.10D hardened chain.'
    );
  }

  if(
    !ordered(
      pkg.scripts?.build,
      [
        'npm run r4:astro:build',
        'npm run r4:production:review',
        'npm run r4:production:success',
        'npm run r4:production:home:validate',
        'npm run r4:production:review:validate',
        'npm run r4:production:success:validate'
      ]
    )
  ){
    fail(
      'Production build must promote Success after Review and validate Success after all previously migrated route validators.'
    );
  }

  if(
    !ordered(
      pkg.scripts?.validate,
      [
        'npm run r4:astro:success-runtime',
        'npm run r4:production:review:detachment',
        'npm run r4:production:success:contract'
      ]
    )
  ){
    fail(
      'R4.10C source contract must run after the R4.10B runtime gate and completed Review detachment source gate.'
    );
  }

  const detachment=
    pkg.scripts
      ?.['r4:production:success:detachment'];

  if(
    detachment!==undefined&&
    detachment!==
      'node scripts/validate-r4-production-success-detachment.mjs --source'
  ){
    fail(
      'Only the reserved canonical R4.10D Success detachment source gate may extend R4.10C.'
    );
  }
}catch(error){
  fail(
    'R4.10C package inspection failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'scripts/r4-promote-astro-success.mjs'
    );

  for(const marker of [
    "'.r4-astro-dist'",
    "'dist'",
    'const sourceSuccess=',
    'const targetSuccess=',
    "'r4-success-runtime.js'",
    "success:",
    "'astro-r4.10c'",
    'manifest.successOwner=',
    'manifest.successCutover=',
    "'inquiry/review/index.html'",
    "'sw.js'",
    'data-r4-astro-review="true"',
    'data-r4-astro-product="true"',
    'root.DreamlandDesktopSuccess=Object.freeze'
  ]){
    if(!source.includes(marker)){
      fail(
        'Success promotion contract is missing: '+
        marker
      );
    }
  }

  const sourceSuccessPathIsRouteScoped=
    /const sourceSuccess=\s*path\.join\(\s*SOURCE_ROOT\s*,\s*['"]inquiry['"]\s*,\s*['"]success['"]\s*,\s*['"]index\.html['"]\s*\)/s.test(
      source
    );

  const targetSuccessPathIsRouteScoped=
    /const targetSuccess=\s*path\.join\(\s*TARGET_ROOT\s*,\s*['"]inquiry['"]\s*,\s*['"]success['"]\s*,\s*['"]index\.html['"]\s*\)/s.test(
      source
    );

  if(
    !sourceSuccessPathIsRouteScoped||
    !targetSuccessPathIsRouteScoped
  ){
    fail(
      'Success promotion contract must route-scope both isolated and Production documents to inquiry/success/index.html.'
    );
  }

  if(
    /fs\.cpSync\s*\(\s*SOURCE_ROOT\s*,\s*TARGET_ROOT/.test(
      source
    )
  ){
    fail(
      'R4.10C Success promotion must remain route-scoped.'
    );
  }
}catch(error){
  fail(
    'R4.10C promotion source inspection failed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/inquiry/success/index.astro'
    );

  for(const marker of [
    'robots="noindex,nofollow"',
    'canonical="https://dreamland-catalog.pages.dev/inquiry/success/"',
    'id="successRuntimeState"',
    'src="/r4-success-runtime.js"',
    'languageEnabled={true}'
  ]){
    if(!page.includes(marker)){
      fail(
        'Astro Success Production source is missing: '+
        marker
      );
    }
  }

  const runtime=
    read(
      'src/astro/runtime/success-runtime.js'
    );

  for(const marker of [
    "'dreamlandLastSubmissionV1'",
    "pageGuards.evaluate(\n        'success'",
    'record?.inquiryId||\n        record?.clientInquiryId',
    'record?.amountDisplay||\n          record?.estimatedTotalDisplay',
    'root.location\n        ?.replace?.(',
    'root.DreamlandSuccessRuntime='
  ]){
    if(!runtime.includes(marker)){
      fail(
        'Astro Success runtime lost R4.10B behavior: '+
        marker
      );
    }
  }

  const routes=
    json(
      'data/page-routes.json'
    )
      .routes||
    {};

  if(
    routes.review?.path!==
      '/inquiry/review/'||
    routes.review?.guard!==
      'hasValidContact'||
    routes.success?.path!==
      '/inquiry/success/'||
    routes.success?.public!==
      false||
    routes.success?.guard!==
      'hasLastSubmission'
  ){
    fail(
      'R4.10C Review/Success route guard contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.10C Success source inspection failed: '+
    error.message
  );
}

try{
  const pkg=
    json(
      'package.json'
    );

  const detachmentInstalled=
    pkg.scripts
      ?.['r4:production:success:detachment']===
      'node scripts/validate-r4-production-success-detachment.mjs --source';

  const sw=
    read(
      'sw.js'
    );

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v129';"
    )||
    !sw.includes(
      'const REVIEW_NAVIGATION_PATHS='
    )
  ){
    fail(
      'R4.10C source Service Worker lost the completed Review detachment baseline.'
    );
  }

  if(
    !detachmentInstalled&&
    (
      sw.includes(
        'SUCCESS_NAVIGATION_PATHS'
      )||
      sw.includes(
        'successNetworkOnly('
      )||
      sw.includes(
        'purgeLegacySuccessEntries('
      )
    )
  ){
    fail(
      'R4.10C must not detach Success from the Legacy Service Worker; that belongs to R4.10D.'
    );
  }

  if(
    !read(
      'src/ui/desktop/success/runtime-desktop-success.js'
    ).includes(
      'root.DreamlandDesktopSuccess=Object.freeze'
    )
  ){
    fail(
      'R4.10C must preserve the Legacy Success presentation module until R4.10D detachment.'
    );
  }
}catch(error){
  fail(
    'R4.10C protected Success/PWA boundary inspection failed: '+
    error.message
  );
}

try{
  const foundation=
    read(
      'R4_ASTRO_FOUNDATION.md'
    );

  for(const marker of [
    '## R4.10C — Production Success Cutover',
    'R4.10D',
    '## Post-architecture visual restoration queue',
    'R4.11 — Visual Restoration / Develop Parity',
    'a6039e52900d966b0f3110da8458a393434127d8'
  ]){
    if(!foundation.includes(marker)){
      fail(
        'R4.10C foundation/visual roadmap documentation is incomplete: '+
        marker
      );
    }
  }

  const visualPlan=
    read(
      'R4_VISUAL_RESTORATION_PLAN.md'
    );

  for(const marker of [
    '# DREAMLAND R4.11 — Visual Restoration / Develop Parity',
    'develop',
    'a6039e52900d966b0f3110da8458a393434127d8',
    'R4.11A',
    'R4.11B',
    'R4.11C',
    'R4.11D',
    'PC + Mobile'
  ]){
    if(!visualPlan.includes(marker)){
      fail(
        'Visual restoration plan is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.10C roadmap documentation inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
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
    validateSuccessRuntime(
      fs.readFileSync(
        isolated.runtimeFile,
        'utf8'
      ),
      'Isolated Success runtime'
    );
  }
}

if(DIST_MODE){
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
        'Production Success HTML differs from the isolated Astro Success artifact.'
      );
    }

    if(
      fs.existsSync(production.runtimeFile)&&
      fs.existsSync(isolated.runtimeFile)&&
      hashFile(production.runtimeFile)!==
      hashFile(isolated.runtimeFile)
    ){
      fail(
        'Production Success runtime differs from the isolated R4.10B runtime artifact.'
      );
    }

    if(
      fs.existsSync(
        production.runtimeFile
      )
    ){
      validateSuccessRuntime(
        fs.readFileSync(
          production.runtimeFile,
          'utf8'
        ),
        'Production Success runtime'
      );
    }
  }

  for(const [relative,marker] of [
    [
      'index.html',
      'data-r4-production-home="true"'
    ],
    [
      'products/index.html',
      'data-r4-astro-catalog="true"'
    ],
    [
      'custom/index.html',
      'data-r4-astro-custom="true"'
    ],
    [
      'inquiry/index.html',
      'data-r4-astro-inquiry="true"'
    ],
    [
      'inquiry/contact/index.html',
      'data-r4-astro-contact="true"'
    ],
    [
      'inquiry/review/index.html',
      'data-r4-astro-review="true"'
    ]
  ]){
    const html=
      expectFile(
        distRoot,
        relative
      );

    if(
      html&&
      !html.includes(marker)
    ){
      fail(
        'Previously migrated Production owner regressed: '+
        relative
      );
    }
  }

  const products=
    json(
      'data/products.json'
    )
      .products||
    [];

  const active=
    products.filter(
      product=>
        product?.status==='active'
    );

  if(active.length!==89){
    fail(
      'R4.10C expected 89 active PDPs; found '+
      active.length+
      '.'
    );
  }else{
    for(const product of active){
      const id=
        String(
          product?.productId||
          product?.id||
          ''
        )
          .trim()
          .toUpperCase();

      const html=
        expectFile(
          distRoot,
          path.join(
            'products',
            id,
            'index.html'
          )
        );

      if(
        html&&
        !html.includes(
          'data-r4-astro-product="true"'
        )
      ){
        fail(
          'Production PDP ownership regressed: '+
          id
        );
      }
    }
  }

  const manifest=
    JSON.parse(
      expectFile(
        distRoot,
        'multipage-build-manifest.json'
      )||
      '{}'
    );

  for(const [key,expected] of [
    ['homeOwner','astro'],
    ['catalogOwner','astro'],
    ['pdpOwner','astro'],
    ['customOwner','astro'],
    ['inquiryOwner','astro'],
    ['contactOwner','astro'],
    ['reviewOwner','astro'],
    ['successOwner','astro']
  ]){
    if(manifest[key]!==expected){
      fail(
        'Production manifest owner mismatch: '+
        key
      );
    }
  }

  if(
    manifest.reviewCutover!==
      'B7-00B.4J-R4.9D'||
    manifest.presentationOverrides?.review!==
      'astro-r4.9d'||
    manifest.successCutover!==
      'B7-00B.4J-R4.10C'||
    manifest.presentationOverrides?.success!==
      'astro-r4.10c'
  ){
    fail(
      'Production manifest lost the staged Review → Success cutover contract.'
    );
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
  }else if(
    hashFile(sourceSw)!==
    hashFile(distSw)
  ){
    fail(
      'Production sw.js must remain byte-identical to source during R4.10C.'
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.10C Production Success Cutover: FAIL'
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
  'DREAMLAND B7-00B.4J R4.10C Production Success Cutover: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Production pipeline / canonical R4.10B lastSubmission + hasLastSubmission runtime / Success-only ownership authorization / R4.10D detachment boundary verified.'
    : 'dist/ owns Astro Success from the isolated artifact; Review remains Astro and sw.js remains byte-identical.'
);
console.log('');

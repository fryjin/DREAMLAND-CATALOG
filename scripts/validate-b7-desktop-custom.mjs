#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function compact(value){
  return String(value||'')
    .replace(/\s+/g,'');
}

function countOf(source,marker){
  return source.split(marker).length-1;
}

/*
 * Gate 1 — Desktop Custom Presentation runtime is executable and does not own
 * canonical Custom/Inquiry business state.
 */
try{
  const runtimePath=
    path.join(
      ROOT,
      'src/ui/desktop/custom/runtime-desktop-custom.js'
    );

  delete globalThis.DreamlandDesktopCustom;

  await import(
    `${pathToFileURL(runtimePath).href}?b7-desktop-custom=${Date.now()}`
  );

  const custom=
    globalThis.DreamlandDesktopCustom;

  if(
    !custom||
    custom.version!==
      'B7-00B.3C'
  ){
    fail(
      'DreamlandDesktopCustom B7-00B.3C was not exposed.'
    );
  }else{
    for(const method of [
      'configure',
      'mount',
      'refresh',
      'syncInquiry',
      'snapshot'
    ]){
      if(
        typeof custom[method]!==
        'function'
      ){
        fail(
          `DreamlandDesktopCustom.${method} is missing.`
        );
      }
    }
  }
}catch(error){
  fail(
    `Desktop Custom executable runtime validation failed: ${error.message}`
  );
}

try{
  const runtime=
    read(
      'src/ui/desktop/custom/runtime-desktop-custom.js'
    );

  for(const forbidden of [
    'DreamlandCustom',
    'DreamlandInquiry',
    'localStorage',
    'sessionStorage',
    'productManualV2State',
    'function customMoq(',
    'function maximumQuantity(',
    'addCustom('
  ]){
    if(runtime.includes(forbidden)){
      fail(
        `Desktop Custom crossed its presentation boundary: ${forbidden}`
      );
    }
  }

  for(const required of [
    "const VERSION='B7-00B.3C';",
    'validateDraft?.(',
    'setSeries?.(',
    'toggleScent?.(',
    'availableSeries?.(',
    'availableScents?.(',
    'selectedScents?.(',
    'data-desktop-custom-pick=',
    'data-desktop-custom-series=',
    'data-desktop-custom-scent=',
    'data-desktop-custom-action="submit"',
    'data-desktop-custom-summary',
    'quotedAfterReview',
    'focusFirstError()'
  ]){
    if(!runtime.includes(required)){
      fail(
        `Desktop Custom runtime is missing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Custom runtime source validation failed: ${error.message}`
  );
}

/*
 * Gate 2 — Desktop Experience makes Custom a Desktop-owned screen and bridges
 * the canonical DreamlandCustom owner through configuration.
 */
try{
  const experience=
    read(
      'src/ui/desktop/runtime-desktop-experience.js'
    );

  for(const required of [
    "const VERSION='B7-00B.3D';",
    'id="desktopCustomRoot"',
    'DreamlandDesktopCustom',
    'customState:',
    "currentScreen==='custom'",
    'customManaged=',
    "'is-custom'",
    '#desktopCustomRoot',
    'customPresentation()',
    'feature:\n        config.customState',
    'customState:\n        options.customState',
    'addCustomIntent'
  ]){
    if(!experience.includes(required)){
      fail(
        `Desktop Experience is missing Custom integration: ${required}`
      );
    }
  }

  if(
    experience.includes(
      'root.DreamlandCustom'
    )||
    experience.includes(
      'root.DreamlandInquiry'
    )
  ){
    fail(
      'Desktop Experience must receive Custom/Inquiry ownership through injected configuration.'
    );
  }
}catch(error){
  fail(
    `Desktop Custom Experience integration validation failed: ${error.message}`
  );
}

/*
 * Gate 3 — index provides the canonical feature/action bridge and keeps the
 * Mobile Custom presentation intact.
 */
try{
  const index=
    read('index.html');

  for(const required of [
    "window.DREAMLAND_RELEASE='b7-00b4e-r1-v117';",
    './src/ui/desktop/styles/custom.css?release=b7-00b4e-r1-v117',
    './src/ui/desktop/custom/runtime-desktop-custom.js?release=b7-00b4e-r1-v117',
    'ensureCustomFeatureRuntime();',
    'customState:',
    'customFeature,',
    'addCustomIntent:',
    'addCustomIntentDesktop(',
    'customFeature.validateDraft(',
    'customFeature.buildIntent(',
    'inquiryFeature.addCustom('
  ]){
    if(!index.includes(required)){
      fail(
        `index.html is missing the Desktop Custom canonical bridge: ${required}`
      );
    }
  }

  if(
    countOf(
      index,
      './src/ui/desktop/styles/custom.css?release=b7-00b4e-r1-v117'
    )!==1
  ){
    fail(
      'Desktop Custom CSS must load exactly once.'
    );
  }

  if(
    countOf(
      index,
      './src/ui/desktop/custom/runtime-desktop-custom.js?release=b7-00b4e-r1-v117'
    )!==1
  ){
    fail(
      'Desktop Custom runtime must load exactly once.'
    );
  }

  for(const required of [
    '<section class="screen" data-screen="custom">',
    'id="customUse"',
    'id="customQty"',
    'id="customPack"',
    'onclick="addCustomIntent()"'
  ]){
    if(!index.includes(required)){
      fail(
        `Historical Mobile Custom presentation regressed: ${required}`
      );
    }
  }

  const owner=
    read(
      'src/features/custom/runtime-custom.js'
    );

  if(
    !owner.includes(
      "const VERSION='B6-05';"
    )||
    !owner.includes(
      'validateDraft'
    )||
    !owner.includes(
      'buildIntent'
    )
  ){
    fail(
      'Canonical DreamlandCustom B6-05 owner changed or is unavailable.'
    );
  }
}catch(error){
  fail(
    `Desktop Custom index/Mobile preservation validation failed: ${error.message}`
  );
}

/*
 * Gate 4 — Desktop visual contract.
 */
try{
  const css=
    read(
      'src/ui/desktop/styles/custom.css'
    );

  const flat=
    compact(css);

  if(
    !flat.includes(
      compact(
        'body.desktop-experience-ready[data-desktop-screen="custom"] > #app{display:none!important;}'
      )
    )
  ){
    fail(
      'Desktop Custom must hide the Mobile #app at >=1024px.'
    );
  }

  for(const required of [
    '.desktop-custom-layout{',
    '.desktop-custom-section{',
    '.desktop-custom-choice-grid--use{',
    '.desktop-custom-series{',
    '.desktop-custom-scents{',
    '.desktop-custom-summary-wrap{',
    'position:sticky;',
    '.desktop-custom-submit{'
  ]){
    if(!css.includes(required)){
      fail(
        `Desktop Custom CSS is missing: ${required}`
      );
    }
  }

  if(
    !flat.includes(
      compact(
        'body.desktop-experience-ready .desktop-experience.is-custom .desktop-site-main'
      )
    )||
    !flat.includes(
      compact(
        'body.desktop-experience-ready .desktop-experience.is-custom .desktop-site-footer'
      )
    )
  ){
    fail(
      'Desktop Custom must restore the Desktop site main/footer over the historical Mobile-fallback shell rule.'
    );
  }
}catch(error){
  fail(
    `Desktop Custom CSS validation failed: ${error.message}`
  );
}

/*
 * Gate 5 — EN / ZH / KO Custom Project website content contract.
 */
try{
  const site=
    JSON.parse(
      read(
        'data/site-content.json'
      )
    );

  for(const lang of [
    'en',
    'zh',
    'ko'
  ]){
    const custom=
      site?.languages
        ?.[lang]
        ?.customProject;

    for(const key of [
      'kicker',
      'title',
      'body',
      'useCase',
      'quantity',
      'budget',
      'delivery',
      'size',
      'fragranceCollection',
      'scents',
      'color',
      'packaging',
      'branding',
      'notes',
      'summaryTitle',
      'quotedAfterReview',
      'addInquiry',
      'addedTitle'
    ]){
      if(!custom?.[key]){
        fail(
          `Desktop Custom copy is incomplete for ${lang}.${key}`
        );
      }
    }

    for(const key of [
      'useCases',
      'budgets',
      'sizes',
      'packages',
      'brandingOptions'
    ]){
      if(
        !Array.isArray(
          custom?.[key]
        )||
        !custom[key].length
      ){
        fail(
          `Desktop Custom option copy is incomplete for ${lang}.${key}`
        );
      }
    }
  }
}catch(error){
  fail(
    `Desktop Custom content validation failed: ${error.message}`
  );
}

/*
 * Gate 6 — PWA v98 and release-versioned Custom assets.
 */
try{
  const sw=read('sw.js');
  const pwa=
    read(
      'src/services/pwa/runtime-pwa.js'
    );

  for(const required of [
    "const CACHE_VERSION = 'dreamland-pwa-v117';",
    "'b7-00b4e-r1-v117'",
    './src/ui/desktop/styles/custom.css?release=b7-00b4e-r1-v117',
    './src/ui/desktop/custom/runtime-desktop-custom.js?release=b7-00b4e-r1-v117',
    "'./src/ui/desktop/styles/custom.css'",
    "'./src/ui/desktop/custom/runtime-desktop-custom.js'"
  ]){
    if(!sw.includes(required)){
      fail(
        `sw.js is missing Desktop Custom/PWA v98 marker: ${required}`
      );
    }
  }

  if(
    !pwa.includes(
      "'b7-00b4e-r1-v117'"
    )
  ){
    fail(
      'PWA runtime release tag was not advanced to B7-00B.3C.'
    );
  }
}catch(error){
  fail(
    `Desktop Custom PWA validation failed: ${error.message}`
  );
}

/*
 * Gate 7 — validation order.
 */
try{
  const pkg=
    JSON.parse(
      read('package.json')
    );

  if(
    pkg?.scripts?.['desktop:custom']!==
    'node scripts/validate-b7-desktop-custom.mjs'
  ){
    fail(
      'package.json is missing desktop:custom.'
    );
  }

  const validate=
    String(
      pkg?.scripts?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run desktop:custom && npm run desktop:detail && npm run desktop:website && npm run desktop:catalog'
    )
  ){
    fail(
      'Desktop Custom gate must run before Detail, Website and final Catalog gates.'
    );
  }

  if(
    !validate.endsWith(
      'npm run desktop:catalog'
    )
  ){
    fail(
      'desktop:catalog must remain the final Desktop aggregate gate.'
    );
  }
}catch(error){
  fail(
    `Desktop Custom package validation failed: ${error.message}`
  );
}

/* Gate 4E-R1 — Editorial Brief Builder + persistent Live Project Brief. */
try{
  const runtime=read('src/ui/desktop/custom/runtime-desktop-custom.js');
  const css=read('src/ui/desktop/styles/custom.css');
  const site=JSON.parse(read('data/site-content.json'));

  for(const required of [
    "const PRESENTATION_VERSION='B7-00B.4E-R1';",
    'data-desktop-custom-presentation=',
    'desktop-custom-brief-builder',
    'desktop-custom-live-brief',
    'desktop-custom-fragrance-matrix',
    'function renderLiveBrief()',
    'function syncChoiceState(field)',
    'function syncValidationUi()',
    'function renderFragrancePanel()',
    'syncFieldError(field);',
    'renderLiveBrief();'
  ]){
    if(!runtime.includes(required)){
      fail(`Desktop Custom 4E R1 runtime is missing: ${required}`);
    }
  }

  for(const required of [
    'B7-00B.4E R1 — Custom Project Editorial Intake + Guided Brief Recomposition',
    '[data-desktop-custom-presentation="B7-00B.4E-R1"]',
    '.desktop-custom-live-brief__rows{',
    '.desktop-custom-fragrance-matrix',
    'grid-template-columns:minmax(0,1fr) minmax(380px,420px);',
    'border-radius:0;',
    'position:sticky;'
  ]){
    if(!css.includes(required)){
      fail(`Desktop Custom 4E R1 CSS is missing: ${required}`);
    }
  }

  if(/font-size:(?:8|9|10)px;/.test(css)){
    fail('Desktop Custom 4E R1 readability regression: custom.css contains visible 8/9/10px text.');
  }

  for(const lang of ['en','zh','ko']){
    const custom=site?.languages?.[lang]?.customProject;
    if(!custom?.collectionResetHint){
      fail(`Desktop Custom 4E R1 collection-reset microcopy is missing for ${lang}.`);
    }
  }

  const clickStart=runtime.indexOf('function onClick(event)');
  const clickEnd=runtime.indexOf('function onInput(event)',clickStart);
  const clickBody=
    clickStart>=0&&clickEnd>clickStart
      ? runtime.slice(clickStart,clickEnd)
      : '';

  if(clickBody.includes('render({')){
    fail('Desktop Custom 4E R1 interaction regression: choice clicks still trigger full page render().');
  }

  const submitStart=runtime.indexOf('function submit()');
  const submitEnd=runtime.indexOf('function onClick(event)',submitStart);
  const submitBody=
    submitStart>=0&&submitEnd>submitStart
      ? runtime.slice(submitStart,submitEnd)
      : '';

  if(submitBody.includes('render({')){
    fail('Desktop Custom 4E R1 submit regression: validation/success still rebuilds the whole page.');
  }
}catch(error){
  fail(`Desktop Custom 4E R1 successor validation failed: ${error.message}`);
}

if(errors.length){
  console.error(
    '\nB7-00B.3C Desktop Custom Request validation failed:\n'
  );

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  'B7-00B.3C Desktop Custom Request validation: PASS'
);

console.log(
  'Desktop-owned Custom Project / canonical DreamlandCustom validation + scent state / canonical Inquiry add / field-level validation / EN-ZH-KO / PWA v98 PASS.'
);

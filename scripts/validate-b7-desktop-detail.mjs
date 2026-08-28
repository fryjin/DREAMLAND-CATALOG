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
  return String(
    value||
    ''
  ).replace(
    /\s+/g,
    ''
  );
}

function countOf(
  source,
  marker
){
  return source
    .split(marker)
    .length-1;
}

function requirePattern(
  source,
  pattern,
  message
){
  if(!pattern.test(source)){
    fail(message);
  }
}

/*
 * Gate 1 — Desktop PDP runtime exposes the Presentation API without owning
 * canonical Detail/Inquiry state.
 */
try{
  const runtimePath=
    path.join(
      ROOT,
      'src/ui/desktop/detail/runtime-desktop-detail.js'
    );

  delete globalThis.DreamlandDesktopDetail;

  await import(
    `${pathToFileURL(runtimePath).href}?b7-desktop-detail=${Date.now()}`
  );

  const detail=
    globalThis.DreamlandDesktopDetail;

  if(
    !detail||
    detail.version!==
      'B7-00B.3B'
  ){
    fail(
      'DreamlandDesktopDetail B7-00B.3B was not exposed.'
    );
  }else{
    for(const method of [
      'configure',
      'mount',
      'refresh',
      'syncInquiry',
      'flashAdded',
      'snapshot'
    ]){
      if(
        typeof detail[method]!==
        'function'
      ){
        fail(
          `DreamlandDesktopDetail.${method} is missing.`
        );
      }
    }
  }
}catch(error){
  fail(
    `Desktop Detail executable runtime validation failed: ${error.message}`
  );
}

try{
  const runtime=
    read(
      'src/ui/desktop/detail/runtime-desktop-detail.js'
    );

  /*
   * R1.1:
   * - `packSurchargeCny:0` is a legitimate empty canonical ViewModel shape.
   * - We must reject Desktop-owned pricing implementation, not canonical
   *   field names flowing through an injected ViewModel.
   */
  for(const forbidden of [
    'DreamlandInquiry',
    'DreamlandDetail',
    'localStorage',
    'sessionStorage',
    'function tierUnitCny(',
    'function packSurchargeCny(',
    'function pricingSeriesFor(',
    'seriesMeta[',
    'productManual'
  ]){
    if(runtime.includes(forbidden)){
      fail(
        `Desktop Detail crossed a state/pricing boundary: ${forbidden}`
      );
    }
  }

  for(const required of [
    "const VERSION='B7-00B.3B';",
    'view.pricing?.unitPrice',
    'view.pricing?.moq',
    'view.options?.sizes',
    'view.options?.scents',
    'view.options?.patterns',
    'view.options?.packs',
    'data-desktop-detail-action="option"',
    'data-desktop-detail-action="scent"',
    'data-desktop-detail-action="quantity-delta"',
    'data-desktop-detail-action="add-inquiry"',
    'data-desktop-detail-action="custom-project"',
    'data-desktop-detail-source=',
    'loadResponsiveImage(',
    'desktop-detail-add-feedback'
  ]){
    if(!runtime.includes(required)){
      fail(
        `Desktop Detail runtime is missing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Detail source validation failed: ${error.message}`
  );
}

/*
 * Gate 2 — Desktop Experience owns Detail routing/presentation and keeps the
 * canonical Detail Feature behind an injected action bridge.
 */
try{
  const experience=
    read(
      'src/ui/desktop/runtime-desktop-experience.js'
    );

  for(const required of [
    "const VERSION='B7-00B.3D';",
    'id="desktopDetailRoot"',
    'DreamlandDesktopDetail',
    'detailState:',
    "currentScreen==='detail'",
    "const detail=",
    'detailManaged=',
    "'is-detail'",
    '#desktopDetailRoot',
    'detailPresentation()',
    'addConfiguredProduct'
  ]){
    if(!experience.includes(required)){
      fail(
        `Desktop Experience is missing PDP integration: ${required}`
      );
    }
  }

  /*
   * R1.1 accepts the intentional optional-chaining owner bridge:
   *
   *   config.detailState
   *     ?.setOption?.(...)
   *
   * Formatting and `?.` must not affect the semantic gate.
   */
  for(const [method,pattern] of [
    [
      'setOption',
      /\.\s*setOption\s*\?\.\s*\(/m
    ],
    [
      'setScent',
      /\.\s*setScent\s*\?\.\s*\(/m
    ],
    [
      'setQuantity',
      /\.\s*setQuantity\s*\?\.\s*\(/m
    ],
    [
      'adjustQuantity',
      /\.\s*adjustQuantity\s*\?\.\s*\(/m
    ]
  ]){
    requirePattern(
      experience,
      pattern,
      `Desktop Experience is missing PDP canonical Detail bridge: ${method}?.(`
    );
  }

  if(
    experience.includes(
      'root.DreamlandDetail'
    )
  ){
    fail(
      'Desktop Experience must receive Detail state through configuration rather than reaching into the global owner.'
    );
  }
}catch(error){
  fail(
    `Desktop Detail integration validation failed: ${error.message}`
  );
}

/*
 * Gate 3 — index bridge, dedicated CSS/runtime loading and Mobile preservation.
 */
try{
  const index=
    read('index.html');

  for(const required of [
    "window.DREAMLAND_RELEASE='b7-00b4b-r4.2.3-v108';",
    './src/ui/desktop/styles/detail.css?release=b7-00b4b-r4.2.3-v108',
    './src/ui/desktop/detail/runtime-desktop-detail.js?release=b7-00b4b-r4.2.3-v108',
    'detailState:',
    'detailFeature,',
    'productImages:',
    'productCarouselImages',
    'productDescription:',
    'productDesc(product)',
    'sizeDimensions:',
    'optionPreview:',
    'packSurcharge:',
    'addConfiguredProduct:',
    'detailBack:'
  ]){
    if(!index.includes(required)){
      fail(
        `index.html is missing the Desktop PDP bridge: ${required}`
      );
    }
  }

  if(
    countOf(
      index,
      './src/ui/desktop/styles/detail.css?release=b7-00b4b-r4.2.3-v108'
    )!==1
  ){
    fail(
      'Desktop Detail CSS must load exactly once.'
    );
  }

  if(
    countOf(
      index,
      './src/ui/desktop/detail/runtime-desktop-detail.js?release=b7-00b4b-r4.2.3-v108'
    )!==1
  ){
    fail(
      'Desktop Detail runtime must load exactly once.'
    );
  }

  const mobileDetail=
    read(
      'src/ui/detail/runtime-detail-renderer.js'
    );

  const detailState=
    read(
      'src/features/detail/runtime-detail.js'
    );

  if(
    !mobileDetail.includes(
      "const VERSION='B6-04';"
    )||
    !detailState.includes(
      "const VERSION='B6-03';"
    )
  ){
    fail(
      'Historical Mobile Detail / canonical Detail owner changed during Desktop PDP work.'
    );
  }
}catch(error){
  fail(
    `Desktop PDP bridge/Mobile preservation validation failed: ${error.message}`
  );
}

/*
 * Gate 4 — Desktop CSS hides the Mobile Detail fallback and keeps the site
 * shell visible for Desktop PDP.
 */
try{
  const css=
    read(
      'src/ui/desktop/styles/detail.css'
    );

  const flat=
    compact(css);

  if(
    !flat.includes(
      compact(
        'body.desktop-experience-ready[data-desktop-screen="detail"] > #app{display:none!important;}'
      )
    )
  ){
    fail(
      'Desktop Detail must hide the Mobile #app at >=1024px.'
    );
  }

  for(const required of [
    '.desktop-detail-layout{',
    'position:sticky;',
    '.desktop-detail-main-media{',
    '.desktop-detail-size-grid{',
    '.desktop-detail-visual-options{',
    '.desktop-detail-packaging-grid{',
    '.desktop-detail-summary{',
    '.desktop-detail-lower{'
  ]){
    if(!css.includes(required)){
      fail(
        `Desktop Detail CSS is missing: ${required}`
      );
    }
  }

  if(
    !flat.includes(
      compact(
        'body.desktop-experience-ready .desktop-experience.is-detail .desktop-site-main'
      )
    )||
    !flat.includes(
      compact(
        'body.desktop-experience-ready .desktop-experience.is-detail .desktop-site-footer'
      )
    )
  ){
    fail(
      'Desktop Detail must restore the Desktop site main/footer over the historical Mobile-fallback shell rule.'
    );
  }
}catch(error){
  fail(
    `Desktop Detail CSS validation failed: ${error.message}`
  );
}

/*
 * Gate 5 — EN / ZH / KO website copy contract.
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
    const detail=
      site?.languages
        ?.[lang]
        ?.detail;

    for(const key of [
      'back',
      'moq',
      'size',
      'scent',
      'pattern',
      'packaging',
      'quantity',
      'unitPrice',
      'estimatedTotal',
      'addInquiry',
      'customProject',
      'productDetails'
    ]){
      if(!detail?.[key]){
        fail(
          `Desktop Detail copy is incomplete for ${lang}.${key}`
        );
      }
    }
  }
}catch(error){
  fail(
    `Desktop Detail copy validation failed: ${error.message}`
  );
}

/*
 * Gate 6 — PWA v98 / APP_SHELL / release-versioned runtime.
 */
try{
  const sw=
    read('sw.js');

  const pwa=
    read(
      'src/services/pwa/runtime-pwa.js'
    );

  for(const required of [
    "const CACHE_VERSION = 'dreamland-pwa-v108';",
    "'b7-00b4b-r4.2.3-v108'",
    './src/ui/desktop/styles/detail.css?release=b7-00b4b-r4.2.3-v108',
    './src/ui/desktop/detail/runtime-desktop-detail.js?release=b7-00b4b-r4.2.3-v108',
    "'./src/ui/desktop/styles/detail.css'",
    "'./src/ui/desktop/detail/runtime-desktop-detail.js'"
  ]){
    if(!sw.includes(required)){
      fail(
        `sw.js is missing Desktop Detail/PWA v98 marker: ${required}`
      );
    }
  }

  if(
    !pwa.includes(
      "'b7-00b4b-r4.2.3-v108'"
    )
  ){
    fail(
      'PWA runtime release tag was not advanced to B7-00B.3B.'
    );
  }
}catch(error){
  fail(
    `Desktop Detail PWA validation failed: ${error.message}`
  );
}

/*
 * Gate 7 — validation order preserves the final Desktop Catalog aggregate gate.
 */
try{
  const pkg=
    JSON.parse(
      read('package.json')
    );

  if(
    pkg?.scripts?.['desktop:detail']!==
    'node scripts/validate-b7-desktop-detail.mjs'
  ){
    fail(
      'package.json is missing desktop:detail.'
    );
  }

  const validate=
    String(
      pkg?.scripts?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run desktop:detail && npm run desktop:website && npm run desktop:catalog'
    )
  ){
    fail(
      'Desktop Detail gate must run before website and final catalog gates.'
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
    `Desktop Detail package validation failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nB7-00B.3B Desktop Product Detail / PDP validation failed:\n'
  );

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  'B7-00B.3B Desktop Product Detail / PDP validation: PASS'
);

console.log(
  'Desktop-owned PDP / canonical Detail state bridge / Size + Scent + Pattern + Packaging + Quantity / Add to Inquiry / EN-ZH-KO / responsive product media / PWA v98 PASS.'
);

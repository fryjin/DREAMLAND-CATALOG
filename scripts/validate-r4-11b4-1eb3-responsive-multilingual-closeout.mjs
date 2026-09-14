#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];
const RUNTIME_BUDGET=36*1024;

function fail(message){
  errors.push(message);
}

function read(relative){
  const file=path.join(ROOT,relative);
  if(!fs.existsSync(file)){
    fail('Missing required file: '+relative);
    return '';
  }
  return fs.readFileSync(file,'utf8');
}

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const page=read(
  'src/astro/components/product/PdpPage.astro'
);
const runtime=read(
  'src/astro/runtime/pdp-runtime.js'
);
const css=read(
  'src/astro/styles/pdp.css'
);
const pkg=read('package.json');

/*
 * Architecture closeout:
 * E-B3 must not replace the E-B1/E-B2 canonical projection architecture.
 */
for(const marker of [
  'data-pdp-config-projections',
  'data-pdp-scent-series',
  'data-pdp-scent',
  'data-pdp-pattern',
  'data-pdp-pack',
  'data-pdp-quantity-field',
  'data-pdp-quantity',
  'data-pdp-qty-adjust',
  'data-pdp-scent-detail'
]){
  expect(
    page,
    marker,
    'E-B3 must preserve canonical PDP structure.'
  );
}

if(/<script\b/i.test(page)){
  fail(
    'E-B3 PdpPage.astro must not introduce a second executable runtime.'
  );
}

if(Buffer.byteLength(runtime,'utf8')>RUNTIME_BUDGET){
  fail(
    'E-B3 must remain within the canonical 36 KiB PDP adapter source budget.'
  );
}

/*
 * Dependent option closeout:
 * render canonical selects first, then rebuild the presentation projection.
 * This is what keeps Size→Pattern and Scent Series→Scent dependencies current.
 */
const renderStart=
  runtime.indexOf(
    'function render('
  );
const renderEnd=
  renderStart>=0
    ? runtime.indexOf(
        'function applyLanguage(',
        renderStart
      )
    : -1;

const renderLogic=
  renderStart>=0&&renderEnd>renderStart
    ? runtime.slice(
        renderStart,
        renderEnd
      )
    : '';

const renderOrder=[
  'applyLanguageBindings();',
  'renderSizes(view);',
  'renderScentSeries(view);',
  'renderScents(view);',
  'renderPatterns(view);',
  'renderPacks(view);',
  'renderConfigurationProjection(view);',
  'renderQuantity(view);'
];

let previous=-1;
for(const marker of renderOrder){
  const index=
    renderLogic.indexOf(marker);

  if(index<0){
    fail(
      'E-B3 render pipeline missing: '+
      marker
    );
    continue;
  }

  if(index<=previous){
    fail(
      'E-B3 canonical render order changed around: '+
      marker
    );
  }

  previous=index;
}

/* Language switch must rebuild the current ViewModel and projection. */
for(const marker of [
  'function applyLanguage(',
  'currentView=',
  'detail.buildViewModel();',
  'render(',
  'rootNode.dataset',
  '.pdpProjectionLanguage='
]){
  expect(
    runtime,
    marker,
    'E-B3 multilingual projection rebuild contract changed.'
  );
}

/* Projection stays Proxy, Don't Fork. */
for(const marker of [
  'function bindConfigurationProjection()',
  'select.value=',
  'select.dispatchEvent(',
  "new Event(",
  "'change'",
  'function restoreProjectionViewport(',
  'getBoundingClientRect()',
  'strip.scrollLeft',
  'strip.scrollWidth',
  'strip.clientWidth'
]){
  expect(
    runtime,
    marker,
    'E-B3 canonical projection/active-visibility contract changed.'
  );
}

/* Canonical domain writes stay in the existing native-control event owners. */
for(const marker of [
  "detail.setOption(\n                  'size'",
  "detail.setOption(\n                'scentSeries'",
  'detail.setScent(',
  "detail.setOption(\n                'pattern'",
  "detail.setOption(\n                'pack'",
  'detail.setQuantity(',
  'detail.adjustQuantity('
]){
  expect(
    runtime,
    marker,
    'E-B3 canonical control ownership changed.'
  );
}

/* B1/B2 stage markers remain. */
for(const marker of [
  'R4.11B4.1E-B1 — Canonical Touch Projection Foundation',
  'R4.11B4.1E-B1-FIX4 — Mobile Config Width Containment',
  'R4.11B4.1E-B1-FIX5 — Active Picker Visibility',
  'R4.11B4.1E-B2 — Scent Detail Utility',
  'R4.11B4.1E-B3 — Responsive / Multilingual Closeout'
]){
  expect(
    css,
    marker,
    'E-B3 stage dependency changed.'
  );
}

const stageStart=
  css.indexOf(
    'R4.11B4.1E-B3 — Responsive / Multilingual Closeout'
  );

const stageCss=
  stageStart>=0
    ? css.slice(stageStart)
    : '';

for(const marker of [
  '@media (max-width:720px)',
  '.pdp-config-projection__heading > * {',
  'min-width:0;',
  '.pdp-config-projection__label {',
  'overflow-wrap:anywhere;',
  '.pdp-config-projection__count {',
  'flex:0 0 auto;',
  '.pdp-config-projection__strip {',
  'align-items:flex-start;',
  '.pdp-config-projection__option {',
  'max-width:min(78vw,280px);',
  'white-space:normal;',
  '@media (max-width:374px)',
  'grid-template-columns:',
  '120px;',
  '@media (min-width:421px) and (max-width:720px)',
  'max-width:min(72vw,320px);',
  'html[lang="zh-CN"]',
  'letter-spacing:.06em;',
  'html[lang="ko-KR"]',
  'letter-spacing:.04em;',
  'word-break:keep-all;'
]){
  expect(
    stageCss,
    marker,
    'E-B3 responsive/multilingual styling changed.'
  );
}

/* Mobile options may wrap; the strip still owns horizontal overflow. */
if(
  !/\.pdp-config-projection__option\s*\{[\s\S]*?max-width\s*:\s*min\(78vw,280px\)\s*;[\s\S]*?white-space\s*:\s*normal\s*;[\s\S]*?overflow-wrap\s*:\s*anywhere\s*;/m
    .test(stageCss)
){
  fail(
    'E-B3 long option labels must wrap inside a bounded mobile option.'
  );
}

if(
  !/\.pdp-config-projection__strip\s*\{[\s\S]*?align-items\s*:\s*flex-start\s*;/m
    .test(stageCss)
){
  fail(
    'E-B3 projection strip must tolerate wrapped option heights.'
  );
}

/* 360-class Quantity must preserve a usable canonical stepper. */
if(
  !/@media\s*\(max-width:374px\)[\s\S]*?\[data-pdp-quantity-field\]\s*\{[\s\S]*?120px[\s\S]*?>\s*\.pdp-quantity\s*\{[\s\S]*?width\s*:\s*120px\s*;/m
    .test(stageCss)
){
  fail(
    'E-B3 360-class Quantity containment is missing.'
  );
}

/* This closeout is mobile-only. */
if(
  /@media\s*\(min-width:\s*721px\)[\s\S]*?R4\.11B4\.1E-B3/
    .test(css)
){
  fail(
    'E-B3 must not redesign Desktop PDP.'
  );
}

/* Package exposure and ordering. */
expect(
  pkg,
  '"r4:visual:pdp-responsive-closeout": "node scripts/validate-r4-11b4-1eb3-responsive-multilingual-closeout.mjs"',
  'package.json must expose the E-B3 validator.'
);

expect(
  pkg,
  'npm run r4:visual:pdp-scent-detail && npm run r4:visual:pdp-responsive-closeout',
  'Main validation chain must run E-B3 after E-B2.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1E-B3 RESPONSIVE / MULTILINGUAL CLOSEOUT: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1E-B3 RESPONSIVE / MULTILINGUAL CLOSEOUT: PASS'
);

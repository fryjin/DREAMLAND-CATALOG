#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];

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

/* Canonical controls remain the single business owner. */
for(const marker of [
  'data-pdp-size',
  'data-pdp-scent-series',
  'data-pdp-scent',
  'data-pdp-pattern',
  'data-pdp-pack',
  'data-pdp-quantity',
  'data-pdp-qty-adjust',
  'data-pdp-current-price',
  'data-pdp-current-moq',
  'data-pdp-add-inquiry'
]){
  expect(
    page,
    marker,
    'E-B1 must preserve canonical PDP controls.'
  );
}

/* Presentation root exists, but no executable component runtime is added. */
expect(
  page,
  'data-pdp-config-projections',
  'E-B1 projection root is missing.'
);

if(/<script\b/i.test(page)){
  fail(
    'E-B1 PdpPage.astro must not add a second executable runtime.'
  );
}

/* Semantic runtime contract. */
for(const pattern of [
  /function\s+renderConfigurationProjection\s*\(/,
  /function\s+bindConfigurationProjection\s*\(/,
  /data-pdp-proxy-field/,
  /dataset\s*\.\s*pdpProxyValue/,
  /select\.dispatchEvent\s*\(/,
  /new\s+Event\s*\(\s*['"]change['"]/,
  /renderConfigurationProjection\s*\(\s*view\s*\)/,
  /bindConfigurationProjection\s*\(\s*\)\s*;/
]){
  if(!pattern.test(runtime)){
    fail(
      'E-B1 canonical projection runtime contract changed: '+
      pattern
    );
  }
}

/*
 * Proxy binder must not write domain state directly.
 * It may only update canonical controls and dispatch native change.
 */
const bindStart=
  runtime.indexOf(
    'function bindConfigurationProjection()'
  );
const bindEnd=
  bindStart>=0
    ? runtime.indexOf(
        'function renderQuantity(',
        bindStart
      )
    : -1;

const bindLogic=
  bindStart>=0&&bindEnd>bindStart
    ? runtime.slice(bindStart,bindEnd)
    : '';

for(const forbidden of [
  'detail.setOption(',
  'detail.setScent(',
  'detail.setQuantity(',
  'detail.adjustQuantity(',
  'pricing.',
  'inquiry.',
  'localStorage',
  'sessionStorage'
]){
  if(bindLogic.includes(forbidden)){
    fail(
      'E-B1 projection must Proxy, Don\'t Fork. Forbidden in projection binder: '+
      forbidden
    );
  }
}

/* Projection must be reconstructed from canonical select options. */
for(const marker of [
  'Array.from(',
  'select.options',
  'select.value',
  'option.textContent',
  'replaceChildren('
]){
  expect(
    runtime,
    marker,
    'E-B1 projection must read canonical options/state.'
  );
}

/* Mobile-only editorial styling; desktop default remains hidden. */
expect(
  css,
  'R4.11B4.1E-B1 — Canonical Touch Projection Foundation',
  'E-B1 CSS stage marker is missing.'
);

for(const marker of [
  '.pdp-config-projections {',
  'display:none;',
  '@media (max-width:720px)',
  '.pdp-config-projection__strip',
  'overflow-x:auto',
  '.pdp-config-projection__option.is-selected',
  '.pdp-config > label.pdp-field',
  'clip:rect(0,0,0,0)'
]){
  expect(
    css,
    marker,
    'E-B1 mobile editorial configuration styling changed.'
  );
}

/* R4.11B4.1E-B1-FIX1 — Mobile Quantity Stepper Visibility */
expect(
  css,
  'R4.11B4.1E-B1-FIX1 — Mobile Quantity Stepper Visibility',
  'E-B1-FIX1 quantity visibility marker is missing.'
);

for(const marker of [
  '.pdp-config > div.pdp-field > .pdp-quantity',
  'flex:0 0 128px',
  'width:128px',
  'visibility:visible',
  'opacity:1'
]){
  expect(
    css,
    marker,
    'E-B1-FIX1 mobile quantity visibility contract changed.'
  );
}

if(
  /@media\s*\(min-width:\s*721px\)[\s\S]*?E-B1-FIX1/
    .test(css)
){
  fail(
    'E-B1-FIX1 must remain Mobile-only.'
  );
}

/* Desktop route composition is not redesigned by E-B1. */
if(
  /@media\s*\(min-width:\s*721px\)[\s\S]*?pdp-config-projection/
    .test(css)
){
  fail(
    'E-B1 must not introduce a Desktop editorial projection.'
  );
}

/* Validation chain. */
expect(
  pkg,
  '"r4:visual:pdp-editorial-config": "node scripts/validate-r4-11b4-1eb1-editorial-configuration.mjs"',
  'package.json must expose the E-B1 validator.'
);

expect(
  pkg,
  'npm run r4:visual:pdp-feature && npm run r4:visual:pdp-editorial-config',
  'Main validation chain must run E-B1 after E-A.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1E-B1 EDITORIAL CONFIGURATION: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1E-B1 EDITORIAL CONFIGURATION: PASS'
);

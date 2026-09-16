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
  return fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n');
}

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const viewModel=read('src/astro/lib/pdp-view-model.mjs');
const scents=read('data/scents.csv');
const i18n=JSON.parse(read('data/i18n.json'));
const runtime=read('src/astro/runtime/pdp-runtime.js');
const css=read('src/astro/styles/pdp.css');
const page=read('src/astro/components/product/PdpPage.astro');
const pkg=read('package.json');

for(const marker of [
  'top_zh',
  'top_en',
  'heart_zh',
  'heart_en',
  'base_zh',
  'base_en'
]){
  expect(
    scents,
    marker,
    'E-B2 canonical scent-note columns are missing.'
  );
}

for(const marker of [
  'notes:Object.freeze({',
  'top:Object.freeze({',
  'heart:Object.freeze({',
  'base:Object.freeze({',
  'row?.top_zh',
  'row?.heart_zh',
  'row?.base_zh',
  "'scentDetailTitle'",
  "'topNotes'",
  "'heartNotes'",
  "'baseNotes'"
]){
  expect(
    viewModel,
    marker,
    'E-B2 canonical scent detail ViewModel contract changed.'
  );
}

for(const language of ['en','zh','ko']){
  const ui=i18n?.ui?.[language]||{};
  for(const key of [
    'scentDetailTitle',
    'topNotes',
    'heartNotes',
    'baseNotes'
  ]){
    if(!String(ui[key]||'').trim()){
      fail(
        'E-B2 canonical i18n label is missing: '+
        language+'.'+key
      );
    }
  }
}

for(const marker of [
  '<details',
  'data-pdp-scent-detail',
  '<summary class="pdp-scent-detail__toggle">',
  'data-pdp-ui="scentDetailTitle"',
  'data-pdp-scent-note="top"',
  'data-pdp-scent-note="heart"',
  'data-pdp-scent-note="base"',
  'data-pdp-scent-note-value="top"',
  'data-pdp-scent-note-value="heart"',
  'data-pdp-scent-note-value="base"'
]){
  expect(
    page,
    marker,
    'E-B2 static native disclosure structure changed.'
  );
}

for(const marker of [
  'R4.11B4.1E-B2 — Scent Detail Utility',
  "rootNode.querySelector('[data-pdp-scent-detail]')",
  "scentMap.get(text(view?.config?.scentId))",
  "scent?.notes?.[node.dataset.pdpScentNoteValue]",
  "[data-pdp-scent-note-value]",
  'section.appendChild(scentDetail)'
]){
  expect(
    runtime,
    marker,
    'E-B2 compact read-only scent projection changed.'
  );
}

for(const forbidden of [
  'scentDetailOpen',
  'function scentDetailCopy()',
  'function selectedScentDetail(view)',
  'data-pdp-scent-detail-toggle',
  'pdpScentDetailToggle'
]){
  if(runtime.includes(forbidden)){
    fail(
      'E-B2 must use native disclosure and avoid extra JS detail state: '+
      forbidden
    );
  }
}

if(Buffer.byteLength(runtime,'utf8')>RUNTIME_BUDGET){
  fail(
    'E-B2 must remain within the canonical 36 KiB PDP adapter source budget.'
  );
}

for(const marker of [
  'function bindConfigurationProjection()',
  'select.dispatchEvent('
]){
  expect(
    runtime,
    marker,
    "E-B2 must preserve E-B1 Proxy, Don't Fork behavior."
  );
}

if(
  !/new\s+Event\s*\(\s*['"]change['"]/
    .test(runtime)
){
  fail(
    'E-B2 must preserve the canonical native change-event dispatch.'
  );
}

for(const marker of [
  'R4.11B4.1E-B2 — Scent Detail Utility',
  '@media (max-width:720px)',
  '.pdp-scent-detail__toggle {',
  '.pdp-scent-detail__toggle::after {',
  '.pdp-scent-detail[open]',
  '.pdp-scent-detail__list {',
  '.pdp-scent-detail__row {'
]){
  expect(
    css,
    marker,
    'E-B2 native scent detail styling changed.'
  );
}

if(/<script\b/i.test(page)){
  fail(
    'E-B2 PdpPage.astro must not add a second executable runtime.'
  );
}

expect(
  pkg,
  '"r4:visual:pdp-scent-detail": "node scripts/validate-r4-11b4-1eb2-scent-detail-utility.mjs"',
  'package.json must expose the E-B2 validator.'
);

expect(
  pkg,
  'npm run r4:visual:pdp-editorial-config && npm run r4:visual:pdp-scent-detail',
  'Main validation chain must run E-B2 after E-B1.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1E-B2 SCENT DETAIL UTILITY: FAIL\n'
  );
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1E-B2 SCENT DETAIL UTILITY: PASS'
);

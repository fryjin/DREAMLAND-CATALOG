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

  return fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n');
}

function expect(source,marker,message){
  if(!source.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const page=read('src/astro/components/product/PdpPage.astro');
const css=read('src/astro/styles/pdp.css');
const runtime=read('src/astro/runtime/pdp-runtime.js');
const pkg=JSON.parse(read('package.json'));

for(const marker of [
  'data-pdp-scent',
  'data-pdp-scent-detail-host',
  'data-pdp-scent-detail',
  'data-pdp-config-projections',
  'data-pdp-visual-field="pattern"'
]){
  expect(
    page,
    marker,
    'Desktop scent-detail structure changed.'
  );
}

const scentIndex=page.indexOf('data-pdp-scent>');
const hostIndex=page.indexOf('data-pdp-scent-detail-host');
const projectionIndex=page.indexOf('data-pdp-config-projections');
const patternIndex=page.indexOf('data-pdp-visual-field="pattern"');

if(
  scentIndex<0||
  hostIndex<0||
  projectionIndex<0||
  patternIndex<0||
  !(
    scentIndex<
    hostIndex&&
    hostIndex<
    projectionIndex&&
    projectionIndex<
    patternIndex
  )
){
  fail(
    'Expected Desktop order: Scent -> Scent Detail host -> Mobile projection root -> Pattern.'
  );
}

for(const marker of [
  "document.querySelector('[data-pdp-scent-detail]')",
  "document.querySelector('[data-pdp-scent-detail-host]')",
  "root.matchMedia?.('(max-width:720px)')?.matches",
  '.appendChild(scentDetail)'
]){
  expect(
    runtime,
    marker,
    'Scent Detail host routing changed.'
  );
}

if(
  Buffer.byteLength(runtime,'utf8')>
  36*1024
){
  fail(
    'Desktop scent restoration must remain inside the canonical 36 KiB PDP adapter budget.'
  );
}

for(const marker of [
  'PDP-OPTIONS-1B-FIX4B — Desktop Scent Detail Host',
  '@media (min-width:721px)',
  '.pdp-scent-detail-host {',
  '.pdp-scent-detail__toggle {',
  '.pdp-scent-detail__list,',
  'repeat(3,minmax(0,1fr));'
]){
  expect(
    css,
    marker,
    'Desktop scent-detail host styling changed.'
  );
}

if(
  /@media\s*\(min-width:\s*721px\)[\s\S]*?pdp-config-projection/
    .test(css)
){
  fail(
    'Desktop scent restoration must not expose or style the Mobile editorial projection layer.'
  );
}

if(
  pkg.scripts?.['r4:pdp:desktop-scent-detail']!==
  'node scripts/validate-pdp-options-1b-fix4-desktop-scent-detail.mjs'
){
  fail(
    'package.json lost r4:pdp:desktop-scent-detail.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'PDP-OPTIONS-1B-FIX4B DESKTOP SCENT DETAIL HOST: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'PDP-OPTIONS-1B-FIX4B DESKTOP SCENT DETAIL HOST: PASS'
);
console.log(
  'Desktop Top / Heart / Base notes use a dedicated host; Mobile editorial projections remain Mobile-only.'
);
console.log('');

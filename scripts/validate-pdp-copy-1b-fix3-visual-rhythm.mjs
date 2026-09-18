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

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const css=read('src/astro/styles/pdp.css');
const page=read('src/astro/components/product/PdpPage.astro');
const content=read('data/pdp-content.json');
const pkg=read('package.json');

const stageStart=css.indexOf(
  'PDP-COPY-1B-FIX3 — Price Typography & Responsive Copy Rhythm'
);

if(stageStart<0){
  fail('PDP-COPY-1B-FIX3 CSS stage marker is missing.');
}

const stage=stageStart>=0
  ? css.slice(stageStart)
  : '';

for(const marker of [
  '.pdp-commerce__price {',
  'grid-template-areas:',
  '"label label"',
  '"price unit"',
  '.pdp-commerce__price > strong {',
  'font-family:var(--home-sans);',
  '.pdp-commerce__price > small {',
  'white-space:nowrap;',
  '@media (min-width:721px)',
  '.pdp-description {',
  'font-size:16px;',
  '.pdp-field__helper,',
  '.pdp-quantity-helper {',
  'font-size:11px;',
  '@media (max-width:720px)',
  '.pdp-config-projection__helper {',
  'max-width:none;',
  'font-size:9px;',
  'white-space:nowrap;'
]){
  expect(
    stage,
    marker,
    'PDP-COPY-1B-FIX3 styling contract changed.'
  );
}

/*
 * Full approved Scent helper copy must remain data-owned.
 * This FIX may change presentation only, never shorten the copy.
 */
for(const marker of [
  '上海依克塞汀 品牌香精 · 底模添加约 5%',
  '法国 Robertet Group 进口香精 · 底模添加约 8%',
  '美国 CandleScience 专业香精 · 底模添加约 10%',
  'Shanghai Excitin branded fragrance · approx. 5% in base wax',
  'French Robertet Group imported fragrance · approx. 8% in base wax',
  'U.S. CandleScience professional fragrance · approx. 10% in base wax',
  'Shanghai Excitin 브랜드 향료 · 베이스 왁스 약 5%',
  '프랑스 Robertet Group 수입 향료 · 베이스 왁스 약 8%',
  '미국 CandleScience 전문 향료 · 베이스 왁스 약 10%'
]){
  expect(
    content,
    marker,
    'FIX3 must preserve the approved full Scent helper copy.'
  );
}

for(const marker of [
  'data-pdp-current-price',
  'data-pdp-currency-unit',
  'data-pdp-scent-helper',
  'data-pdp-quantity-helper'
]){
  expect(
    page,
    marker,
    'FIX3 must preserve canonical PDP copy/price hooks.'
  );
}

expect(
  pkg,
  '"r4:pdp:copy-visual-polish": "node scripts/validate-pdp-copy-1b-fix3-visual-rhythm.mjs"',
  'package.json must expose the FIX3 validator.'
);

const validate=String(JSON.parse(pkg).scripts?.validate||'');
const wiringIndex=validate.indexOf('npm run r4:pdp:copy-ui-wiring');
const polishIndex=validate.indexOf('npm run r4:pdp:copy-visual-polish');
const frontendIndex=validate.indexOf('npm run frontend:foundation');

if(
  wiringIndex<0||
  polishIndex<=wiringIndex||
  frontendIndex<=polishIndex
){
  fail(
    'FIX3 validation gate must run after PDP-COPY-1B UI Wiring and before frontend:foundation.'
  );
}

if(errors.length){
  console.error(
    '\nPDP-COPY-1B-FIX3 PRICE TYPOGRAPHY / COPY RHYTHM: FAIL\n'
  );
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log(
  'PDP-COPY-1B-FIX3 PRICE TYPOGRAPHY / COPY RHYTHM: PASS'
);
console.log(
  'Desktop type scale / price+unit lockup / full Scent helper single-line mobile presentation verified.'
);

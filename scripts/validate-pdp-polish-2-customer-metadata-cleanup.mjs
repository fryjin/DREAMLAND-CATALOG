#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];

function fail(message){ errors.push(message); }
function read(relative){
  const file=path.join(ROOT,relative);
  if(!fs.existsSync(file)){ fail('Missing required file: '+relative); return ''; }
  return fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n');
}
function expect(source,marker,message){
  if(!source.includes(marker)) fail(message+' Missing: '+marker);
}

const page=read('src/astro/components/product/PdpPage.astro');
const viewModel=read('src/astro/lib/pdp-view-model.mjs');
const route=read('src/astro/pages/products/[productId].astro');
const pkg=JSON.parse(read('package.json'));

for(const forbidden of [
  'class="pdp-feature-folio"',
  'data-pdp-feature-folio',
  'class="pdp-meta"',
  'class="pdp-config-intro"',
  'data-pdp-config-intro',
  'pdp-config-intro__index'
]){
  if(page.includes(forbidden)){
    fail('PDP-POLISH-2 public metadata cleanup regressed. Found: '+forbidden);
  }
}

for(const marker of [
  'class="pdp-gallery-index"',
  'data-pdp-gallery-index-current',
  'data-pdp-gallery-index-total',
  'class="pdp-summary__identity"',
  'data-pdp-series-label',
  'data-pdp-product-name',
  'data-pdp-product-description',
  'class="pdp-commerce"',
  'class="pdp-config"',
  'data-pdp-size-options',
  'data-pdp-scent',
  'data-pdp-pattern',
  'data-pdp-pack',
  'data-pdp-quantity',
  'data-pdp-add-inquiry'
]){
  expect(page,marker,'PDP-POLISH-2 customer-facing PDP structure changed.');
}

if(
  !/function\s+runtimeProduct\s*\(\s*product\s*\)[\s\S]*?id\s*:\s*productId\s*\(\s*product\s*\)[\s\S]*?productId\s*:\s*productId\s*\(\s*product\s*\)[\s\S]*?colorCode\s*:\s*text\s*\(\s*product\?\.colorCode\s*\)/m.test(viewModel)
){
  fail('PDP-POLISH-2 must preserve productId / colorCode in canonical runtime state.');
}

for(const marker of [
  'productId={productId}',
  'id="pdpRuntimeState"',
  'set:html={runtimeStateJson}'
]){
  expect(route,marker,'PDP-POLISH-2 must preserve route/runtime product identity.');
}

for(const forbiddenCopy of [
  'Product ID',
  '产品编号',
  '제품 번호',
  'Color</dt>',
  'COLOR</dt>'
]){
  if(page.includes(forbiddenCopy)){
    fail('PDP-POLISH-2 must not reintroduce customer-facing internal metadata copy: '+forbiddenCopy);
  }
}

if(
  !/class="pdp-commerce"[\s\S]*?class="pdp-config"[\s\S]*?data-pdp-size-options/m.test(page)
){
  fail('PDP-POLISH-2 must flow from Commercial Snapshot directly into canonical configuration fields.');
}

const galleryIndexCount=(page.match(/class="pdp-gallery-index"/g)||[]).length;
if(galleryIndexCount!==1){
  fail('PDP-POLISH-2 must keep exactly one Gallery image index.');
}

if(
  pkg.scripts?.['r4:visual:pdp-metadata-cleanup']!==
  'node scripts/validate-pdp-polish-2-customer-metadata-cleanup.mjs'
){
  fail('package.json lost r4:visual:pdp-metadata-cleanup.');
}

const validate=String(pkg.scripts?.validate||'');
if(
  !validate.endsWith(
    'npm run r4:visual:pdp-typography && npm run r4:visual:pdp-metadata-cleanup'
  )
){
  fail('PDP-POLISH-2 must close the visual validation chain after PDP-TYPO-1.');
}

if(errors.length){
  console.error('');
  console.error('PDP-POLISH-2 CUSTOMER-FACING METADATA CLEANUP: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('PDP-POLISH-2 CUSTOMER-FACING METADATA CLEANUP: PASS');
console.log('Editorial/internal PDP metadata is removed from presentation while canonical product identity and Gallery index remain intact.');
console.log('');

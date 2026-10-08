#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';

const ROOT=process.cwd();
const PAIRS={
  "MPC036": "ADV016",
  "MPC037": "ADV001",
  "MPC038": "ADV002",
  "MPC039": "ADV003",
  "MPC040": "ADV004",
  "MPC041": "ADV017",
  "MPC042": "ADV018",
  "MPC043": "ADV019",
  "MPC044": "ADV013",
  "MPC048": "ADV009",
  "MPC049": "ADV008",
  "MPC050": "ADV014"
};
const errors=[];
const fail=message=>errors.push(message);
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

await import('../src/data/product-data-contract.js');
const contract=globalThis.DreamlandProductDataContract;
if(!contract){fail('Shared Product Data Contract unavailable.');}

let rows=[];
try{
  rows=contract
    ? contract.parseCsvDocument(read('data/products.csv'),{strict:true}).records
    : [];
}catch(error){fail('Cannot parse products.csv: '+error.message);}
const byId=new Map(rows.map(row=>[row.product_id,row]));
const active=rows.filter(row=>row.status==='active');
if(rows.length!==115||active.length!==89){
  fail('Expected 115 authoring rows and 89 active SKUs.');
}
let fallback=[];
let pdp={};
let pkg={};
try{
  fallback=JSON.parse(read('data/products.json')).products;
  if(!Array.isArray(fallback)||fallback.length!==89){
    fail('products.json must contain 89 active SKU records.');
    fallback=[];
  }
}catch(error){fail('Cannot read products.json: '+error.message);}
try{pdp=JSON.parse(read('data/pdp-content.json'));}
catch(error){fail('Cannot parse pdp-content.json: '+error.message);}
try{pkg=JSON.parse(read('package.json'));}
catch(error){fail('Cannot parse package.json: '+error.message);}
const fallbackById=new Map(fallback.map(p=>[p.id,p]));
const colors=new Set();
for(const [mpcId,advId] of Object.entries(PAIRS)){
  const master=byId.get(mpcId);
  const advanced=byId.get(advId);
  const output=fallbackById.get(mpcId);
  if(!master||!advanced||!output){
    fail(mpcId+' or its mapped source/fallback is missing.');
    continue;
  }
  if(master.status!=='active'||master.series!=='masterpiece'){
    fail(mpcId+' is not active Masterpiece.');
  }
  if(advanced.status!=='active'||advanced.series!=='advanced'){
    fail(advId+' is not active Advanced.');
  }
  if(master.available_scent_series!=='masterpiece'||
     advanced.available_scent_series!=='advanced'){
    fail(mpcId+' / '+advId+' scent series ownership drift.');
  }
  if(pdp.colorStories?.[mpcId]?.sourceProductId!==advId){
    fail(mpcId+' Color Story sourceProductId mapping drift.');
  }
  if(advanced.pdf_series_label!=='进阶系列'||
     advanced.pdf_source_page!=='2'||
     !/^C\d{2}$/.test(advanced.color_code)){
    fail(advId+' does not have valid manual page-2 source metadata.');
  }
  if(master.color_code!==advanced.color_code||
     master.pdf_series_label!==advanced.pdf_series_label||
     master.pdf_source_page!==advanced.pdf_source_page){
    fail(mpcId+' shared palette metadata does not match '+advId+'.');
  }
  if(colors.has(master.color_code)){
    fail(mpcId+' shares a color code with another mapped Masterpiece SKU.');
  }
  colors.add(master.color_code);
  if(output.series!=='masterpiece'||
     !isDeepStrictEqual(output.availableScentSeries,['masterpiece'])){
    fail(mpcId+' generated fallback lost independent series/scent ownership.');
  }
  if(output.colorCode!==master.color_code||
     output.pdfSeriesLabel!==master.pdf_series_label||
     output.pdfSourcePage!==Number(master.pdf_source_page)){
    fail(mpcId+' generated fallback metadata does not match CSV.');
  }
}
if(Object.keys(PAIRS).length!==12||colors.size!==12){
  fail('Expected 12 unique shared-palette mappings.');
}
if(pkg.scripts?.['f4:shared-palette-metadata']!==
   'node scripts/validate-f4-b2-2-shared-palette-metadata.mjs'){
  fail('package.json is missing the F4-B2.2 gate script.');
}
if(!String(pkg.scripts?.validate||'').includes(
  'npm run f4:short-description-cleanup && npm run f4:shared-palette-metadata && npm run r4:pdp:copy-ui-wiring'
)){
  fail('Main validation chain must run F4-B2.2 after F4-B2.1 and before PDP UI wiring.');
}
if(errors.length){
  console.error('');
  console.error('F4-B2.2 SHARED PALETTE METADATA: FAIL');
  for(const error of errors)console.error('- '+error);
  process.exit(1);
}
console.log('');
console.log('F4-B2.2 SHARED PALETTE METADATA: PASS');
console.log('12/12 Masterpiece palettes mapped to Advanced Color Reference page 2.');
console.log('SKU, scent series, and sourceProductId ownership remain independent/consistent.');
console.log('products.csv and active-only products.json metadata are aligned.');
console.log('');

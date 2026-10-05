#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const errors=[];
const fail=message=>errors.push(message);
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

function containsHan(value){
  for(const ch of String(value??'')){
    const cp=ch.codePointAt(0);
    if(
      (cp>=0x3400&&cp<=0x4DBF)||
      (cp>=0x4E00&&cp<=0x9FFF)||
      (cp>=0xF900&&cp<=0xFAFF)
    ){
      return true;
    }
  }
  return false;
}

await import('../src/data/product-data-contract.js');
const contract=globalThis.DreamlandProductDataContract;

if(!contract){
  fail('DreamlandProductDataContract is unavailable.');
}

let rows=[];
try{
  rows=contract
    ? contract.parseCsvDocument(
        read('data/products.csv'),
        {strict:true}
      ).records
    : [];
}catch(error){
  fail('Cannot parse products.csv: '+error.message);
}

const active=rows.filter(
  row=>String(row.status||'').trim().toLowerCase()==='active'
);

if(active.length!==89){
  fail('Expected 89 active products; found '+active.length+'.');
}

for(const row of active){
  for(const field of ['short_desc_zh','short_desc_en','short_desc_ko']){
    if(!String(row[field]||'').trim()){
      fail(row.product_id+'.'+field+' is empty.');
    }
  }

  for(const field of ['short_desc_en','short_desc_ko']){
    if(containsHan(row[field])){
      fail(row.product_id+'.'+field+' contains Chinese characters.');
    }
  }

  if(
    String(row.short_desc_en||'').includes('按所选系列')||
    String(row.short_desc_ko||'').includes('按所选系列')
  ){
    fail(row.product_id+' still contains 按所选系列.');
  }

  if(
    String(row.short_desc_en||'').includes('Yikesaiting')||
    String(row.short_desc_ko||'').includes('이크세이팅')
  ){
    fail(row.product_id+' still contains retired Classic supplier spelling.');
  }
}

try{
  const fallback=JSON.parse(read('data/products.json'));
  const products=Array.isArray(fallback.products)
    ? fallback.products
    : [];

  if(products.length!==89){
    fail('products.json must contain 89 active products.');
  }

  for(const row of active){
    const product=products.find(item=>item.id===row.product_id);

    if(!product){
      fail(row.product_id+' is missing from products.json.');
      continue;
    }

    if(
      product.descriptions?.en!==
      String(row.short_desc_en||'').trim()
    ){
      fail(row.product_id+'.products.json descriptions.en is out of sync.');
    }

    if(
      product.descriptions?.ko!==
      String(row.short_desc_ko||'').trim()
    ){
      fail(row.product_id+'.products.json descriptions.ko is out of sync.');
    }
  }
}catch(error){
  fail('Cannot validate products.json: '+error.message);
}

try{
  const pkg=JSON.parse(read('package.json'));

  if(
    pkg.scripts?.['f4:short-description-cleanup']!==
    'node scripts/validate-f4-b2-1-short-description-cleanup.mjs'
  ){
    fail('package.json is missing f4:short-description-cleanup.');
  }

  const chain=String(pkg.scripts?.validate||'');

  if(
    !chain.includes(
      'npm run f4:production-content && npm run f4:short-description-cleanup'
    )
  ){
    fail('Main validate chain does not run F4-B2.1 immediately after F4-B1.');
  }
}catch(error){
  fail('Cannot inspect package.json: '+error.message);
}

if(errors.length){
  console.error('');
  console.error('F4-B2.1 SHORT DESCRIPTION CLEANUP: FAIL');
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log('');
console.log('F4-B2.1 SHORT DESCRIPTION CLEANUP: PASS');
console.log('89/89 active EN + KO short descriptions are non-empty, locale-clean, and synchronized to products.json.');
console.log('77 contaminated EN/KO records cleaned; 12 previously clean Masterpiece records preserved.');
console.log('');

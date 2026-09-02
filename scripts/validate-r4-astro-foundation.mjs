#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const OUT=path.join(ROOT,'.r4-astro-dist');
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(path.join(ROOT,relative),'utf8');
}

function loadJson(relative){
  return JSON.parse(read(relative));
}

function expectFile(relative){
  const file=path.join(OUT,relative);

  if(!fs.existsSync(file)){
    fail('Astro output is missing '+relative+'.');
    return '';
  }

  return fs.readFileSync(file,'utf8');
}

try{
  const packageJson=loadJson('package.json');

  if(packageJson.devDependencies?.astro!=='7.2.10'){
    fail('Astro dependency must stay pinned to 7.2.10 in R4.1.');
  }

  if(packageJson.scripts?.build!=='npm run data:build && npm run build:pages'){
    fail('R4.1 must not replace the Production build command.');
  }

  if(packageJson.scripts?.['r4:astro:build']!=='astro build --config astro.config.mjs'){
    fail('R4 Astro build script is missing.');
  }

  if(!String(packageJson.scripts?.validate||'').includes('npm run r4:astro:foundation')){
    fail('Main validation chain must include R4 Astro foundation.');
  }

  const config=read('astro.config.mjs');

  for(const marker of [
    "output:'static'",
    "srcDir:'./src/astro'",
    "outDir:'./.r4-astro-dist'"
  ]){
    if(!config.includes(marker)){
      fail('Astro config is missing '+marker+'.');
    }
  }

  const legacyBuild=read('scripts/build-pages.mjs');

  if(!legacyBuild.includes("path.join(ROOT,'dist')")){
    fail('Legacy Production builder changed unexpectedly in R4.1.');
  }

  const home=expectFile('index.html');
  const catalog=expectFile(path.join('products','index.html'));

  for(const [name,html] of [
    ['home',home],
    ['catalog',catalog]
  ]){
    if(!html.includes('data-r4-astro-foundation="true"')){
      fail(name+' Astro output lacks the foundation marker.');
    }

    for(const legacyMarker of [
      'id="app"',
      'runtime-desktop-experience.js',
      'catalog-data.js'
    ]){
      if(html.includes(legacyMarker)){
        fail(name+' Astro output unexpectedly contains legacy marker '+legacyMarker+'.');
      }
    }

    if(/<script/i.test(html)){
      fail(name+' foundation output must remain zero-client-JS.');
    }
  }

  const products=loadJson('data/products.json')
    .products
    .filter(product=>product?.status==='active');

  if(!products.length){
    fail('R4 Astro foundation found no active products.');
  }

  for(const product of products){
    const productId=String(product?.productId||product?.id||'')
      .trim()
      .toUpperCase();

    if(!productId){
      fail('Active product has no route id.');
      continue;
    }

    const html=expectFile(
      path.join('products',productId,'index.html')
    );

    if(html&&!html.includes(`data-product-id="${productId}"`)){
      fail('Product output marker mismatch for '+productId+'.');
    }

    if(html&&/<script/i.test(html)){
      fail('Product foundation output must remain zero-client-JS: '+productId+'.');
    }
  }

  const routes=loadJson('data/page-routes.json');

  if(
    routes.routes?.home?.path!=='/'||
    routes.routes?.catalog?.path!=='/products/'||
    routes.routes?.product?.path!=='/products/{productId}/'
  ){
    fail('Existing route contract changed during R4.1.');
  }

  for(const workflow of [
    '.github/workflows/quality-check.yml',
    '.github/workflows/sync-products-json.yml'
  ]){
    if(!read(workflow).includes('run: npm ci')){
      fail(workflow+' must install pinned project dependencies.');
    }
  }
}catch(error){
  fail('R4 Astro foundation validation crashed: '+error.message);
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND B7-00B.4J R4.1 Astro foundation: FAIL');

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND B7-00B.4J R4.1 Astro foundation: PASS');
console.log('Isolated static build, route contract, active-product SSG and zero-client-JS baseline verified.');
console.log('');

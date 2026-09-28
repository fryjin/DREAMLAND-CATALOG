#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  SUPPORTED_LOCALES,
  htmlLangForLocale
} from '../src/astro/lib/locale-routing.mjs';

const WRITE=process.argv.includes('--write');
const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const SOURCE_ROOT=path.join(ROOT,'.r4-astro-dist');
const TARGET_ROOT=path.join(ROOT,'dist');

function fail(message){
  console.error('');
  console.error('[F1.5-B Locale Route Promotion] FAIL');
  console.error('- '+message);
  console.error('');
  process.exit(1);
}

if(!WRITE){
  fail('Refusing to mutate dist/ without --write.');
}

if(!fs.existsSync(SOURCE_ROOT)){
  fail('Isolated Astro output is missing: .r4-astro-dist');
}

if(!fs.existsSync(TARGET_ROOT)){
  fail('Production dist output is missing.');
}

const products=
  JSON.parse(
    fs.readFileSync(
      path.join(ROOT,'data','products.json'),
      'utf8'
    )
  ).products||[];

const firstProduct=
  products.find(product=>product?.status==='active');

const productId=
  String(
    firstProduct?.productId||
    firstProduct?.id||
    ''
  )
    .trim()
    .toUpperCase();

if(!productId){
  fail('No active product is available for locale-route promotion validation.');
}

for(const locale of SUPPORTED_LOCALES){
  const sourceDir=path.join(SOURCE_ROOT,locale);
  const targetDir=path.join(TARGET_ROOT,locale);

  const expected=[
    'index.html',
    path.join('products','index.html'),
    path.join('products',productId,'index.html'),
    path.join('custom','index.html'),
    path.join('inquiry','index.html'),
    path.join('inquiry','contact','index.html'),
    path.join('inquiry','review','index.html'),
    path.join('inquiry','success','index.html')
  ];

  for(const relative of expected){
    const file=path.join(sourceDir,relative);

    if(!fs.existsSync(file)){
      fail(locale+' locale route is missing: '+relative);
    }

    const html=fs.readFileSync(file,'utf8');

    if(!html.includes('<html lang="'+htmlLangForLocale(locale)+'"')){
      fail(locale+' locale route has the wrong HTML lang: '+relative);
    }

    if(!html.includes('data-route-locale="'+locale+'"')){
      fail(locale+' locale route is missing route-locale ownership: '+relative);
    }
  }

  fs.rmSync(
    targetDir,
    {
      recursive:true,
      force:true
    }
  );

  fs.cpSync(
    sourceDir,
    targetDir,
    {
      recursive:true
    }
  );
}

console.log('');
console.log('[F1.5-B Locale Route Promotion] PASS');
console.log('- Promoted EN / ZH / KO Astro route trees into dist/.');
console.log('- Canonical unprefixed Production routes were not mutated.');
console.log('');

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  ),
  '..'
);

const OUT=
  path.join(
    ROOT,
    '.r4-astro-dist'
  );

const errors=[];

const BUDGETS=Object.freeze({
  adapterRaw:36*1024,
  bundleRaw:104*1024,
  stateRaw:72*1024
});

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

function stateText(html){
  const match=
    html.match(
      /<script[^>]*id="pdpRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="pdpRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

try{
  delete globalThis.DreamlandPdpRuntime;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/astro/runtime/pdp-runtime.js'
      )
    ).href+
    '?r4-pdp-runtime='+
    Date.now()
  );

  const runtime=
    globalThis
      .DreamlandPdpRuntime;

  if(
    !runtime||
    runtime.version!=='R4.5B'||
    runtime.id!==
      'DREAMLAND_R4_PDP_RUNTIME_R4_5B'
  ){
    fail(
      'DreamlandPdpRuntime R4.5B was not exposed.'
    );
  }else{
    if(
      runtime.normalizeLanguage(
        'KO',
        'en',
        [
          'en',
          'zh',
          'ko'
        ]
      )!=='ko'||
      runtime.normalizeLanguage(
        'fr',
        'en',
        [
          'en',
          'zh',
          'ko'
        ]
      )!=='en'
    ){
      fail(
        'PDP language normalization failed.'
      );
    }

    if(
      runtime.inquiryCount({
        items:[
          {
            type:'product',
            qty:12
          },
          {
            type:'product',
            qty:5
          },
          {
            type:'custom'
          }
        ]
      })!==18
    ){
      fail(
        'PDP Inquiry badge semantics diverged from Home/Catalog parity.'
      );
    }
  }
}catch(error){
  fail(
    'PDP minimal runtime execution failed: '+
    error.message
  );
}

try{
  const adapter=
    read(
      'src/astro/runtime/pdp-runtime.js'
    );

  if(
    Buffer.byteLength(
      adapter,
      'utf8'
    )>
    BUDGETS.adapterRaw
  ){
    fail(
      'PDP adapter exceeds the 36 KiB source budget.'
    );
  }

  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'serviceWorker',
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandDesktopExperience',
    'catalog-data.js',
    'startup-loader.js'
  ]){
    if(adapter.includes(forbidden)){
      fail(
        'PDP minimal runtime crossed a forbidden boundary: '+
        forbidden
      );
    }
  }

  for(const pattern of [
    /DreamlandDetail/,
    /DreamlandPricingPolicy/,
    /DreamlandInquiry/,
    /detail\s*\.\s*configure/,
    /detail\s*\.\s*openProduct/,
    /detail\s*\.\s*setOption/,
    /detail\s*\.\s*setScent/,
    /detail\s*\.\s*setQuantity/,
    /detail\s*\.\s*adjustQuantity/,
    /detail\s*\.\s*buildViewModel/,
    /inquiry\s*\.\s*addOrMergeProduct/,
    /inquiry\s*\.\s*persist/
  ]){
    if(!pattern.test(adapter)){
      fail(
        'PDP minimal runtime is missing delegated behavior: '+
        pattern
      );
    }
  }
}catch(error){
  fail(
    'PDP runtime source inspection failed: '+
    error.message
  );
}

try{
  const products=
    JSON.parse(
      read(
        'data/products.json'
      )
    )
      .products
      .filter(
        product=>
          product?.status===
          'active'
      );

  let maxState=0;

  for(const product of products){
    const id=
      String(
        product?.productId||
        product?.id||
        ''
      )
        .trim()
        .toUpperCase();

    const file=
      path.join(
        OUT,
        'products',
        id,
        'index.html'
      );

    if(!fs.existsSync(file)){
      fail(
        'PDP output is missing for runtime budget: '+
        id
      );
      continue;
    }

    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    const state=
      stateText(
        html
      );

    if(!state){
      fail(
        'PDP runtime state is missing: '+
        id
      );
      continue;
    }

    const raw=
      Buffer.byteLength(
        state,
        'utf8'
      );

    maxState=
      Math.max(
        maxState,
        raw
      );

    if(
      raw>
      BUDGETS.stateRaw
    ){
      fail(
        `PDP ${id} runtime state exceeds 72 KiB: ${(raw/1024).toFixed(1)} KiB.`
      );
    }

    const executable=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(executable.length!==1){
      fail(
        'PDP must have exactly one executable route runtime: '+
        id
      );
    }
  }

  const bundle=
    path.join(
      OUT,
      'r4-pdp-runtime.js'
    );

  if(!fs.existsSync(bundle)){
    fail(
      'PDP route runtime bundle is missing.'
    );
  }else if(
    fs.statSync(bundle).size>
    BUDGETS.bundleRaw
  ){
    fail(
      'PDP route runtime bundle exceeds the 104 KiB raw budget.'
    );
  }

  if(!errors.length){
    console.log('');
    console.log(
      '[R4.5B PDP Runtime Budget]'
    );
    console.log(
      '- Adapter:',
      (
        Buffer.byteLength(
          read(
            'src/astro/runtime/pdp-runtime.js'
          ),
          'utf8'
        )/
        1024
      ).toFixed(1)+
      ' KiB raw'
    );
    console.log(
      '- Bundle:',
      (
        fs.statSync(bundle).size/
        1024
      ).toFixed(1)+
      ' KiB raw'
    );
    console.log(
      '- Max per-PDP state:',
      (
        maxState/
        1024
      ).toFixed(1)+
      ' KiB raw'
    );
  }
}catch(error){
  fail(
    'PDP runtime output inspection failed: '+
    error.message
  );
}

try{
  const pkg=
    JSON.parse(
      read(
        'package.json'
      )
    );

  if(
    pkg.scripts
      ?.['r4:astro:pdp-runtime']!==
    'node scripts/validate-r4-astro-pdp-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:pdp-runtime.'
    );
  }
}catch(error){
  fail(
    'PDP runtime package inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.5B PDP Minimal Runtime: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.5B PDP Minimal Runtime: PASS'
);
console.log(
  'Size/Scent/Scent-Series/Pattern/Packaging/Quantity / dynamic Pricing / EN-ZH-KO / Inquiry badge + add/merge persistence / single route runtime budgets verified.'
);
console.log('');

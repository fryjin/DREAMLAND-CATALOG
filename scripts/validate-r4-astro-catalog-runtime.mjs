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
  adapterRaw:32*1024,
  bundleRaw:56*1024,
  stateRaw:128*1024
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

function output(relative){
  return path.join(
    OUT,
    relative
  );
}

function runtimeState(html){
  const match=
    html.match(
      /<script[^>]*id="catalogRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="catalogRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

try{
  delete globalThis
    .DreamlandDesktopCatalogView;

  delete globalThis
    .DreamlandCatalogRuntime;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/catalog/runtime-desktop-catalog-view.js'
      )
    ).href+
    '?r4-catalog-policy='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/astro/runtime/catalog-runtime.js'
      )
    ).href+
    '?r4-catalog-runtime='+
    Date.now()
  );

  const runtime=
    globalThis
      .DreamlandCatalogRuntime;

  if(
    !runtime||
    runtime.version!=='R4.4B'||
    runtime.id!==
      'DREAMLAND_R4_CATALOG_RUNTIME_R4_4B'
  ){
    fail(
      'DreamlandCatalogRuntime R4.4B was not exposed.'
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
        'Catalog language normalization failed.'
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
        'Catalog Inquiry badge semantics diverged from Home/Legacy parity.'
      );
    }
  }
}catch(error){
  fail(
    'Catalog minimal runtime execution failed: '+
    error.message
  );
}

try{
  const adapter=
    read(
      'src/astro/runtime/catalog-runtime.js'
    );

  if(
    Buffer.byteLength(
      adapter,
      'utf8'
    )>
    BUDGETS.adapterRaw
  ){
    fail(
      'Catalog adapter exceeds the 32 KiB source budget.'
    );
  }

  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'serviceWorker',
    'DreamlandInquiry',
    'DreamlandDetail',
    'DreamlandCustom',
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandDesktopExperience',
    'catalog-data.js',
    'startup-loader.js'
  ]){
    if(adapter.includes(forbidden)){
      fail(
        'Catalog minimal runtime crossed a forbidden boundary: '+
        forbidden
      );
    }
  }

  for(const pattern of [
    /DreamlandDesktopCatalogView/,
    /catalog\s*\.\s*configure/,
    /catalog\s*\.\s*setScope/,
    /catalog\s*\.\s*setQuery/,
    /catalog\s*\.\s*setSizes/,
    /catalog\s*\.\s*setSort/,
    /catalog\s*\.\s*loadMore/,
    /catalog\s*\.\s*buildViewModel/,
    /URLSearchParams/,
    /pushState/,
    /replaceState/,
    /popstate/
  ]){
    if(!pattern.test(adapter)){
      fail(
        'Catalog minimal runtime is missing delegated behavior: '+
        pattern
      );
    }
  }
}catch(error){
  fail(
    'Catalog runtime source inspection failed: '+
    error.message
  );
}

try{
  const file=
    output(
      path.join(
        'products',
        'index.html'
      )
    );

  if(!fs.existsSync(file)){
    fail(
      'Astro Catalog output is missing for runtime validation.'
    );
  }else{
    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    const stateText=
      runtimeState(
        html
      );

    if(!stateText){
      fail(
        'Catalog runtime state JSON is missing.'
      );
    }else{
      if(
        Buffer.byteLength(
          stateText,
          'utf8'
        )>
        BUDGETS.stateRaw
      ){
        fail(
          'Catalog runtime state exceeds the 128 KiB raw budget.'
        );
      }
    }

    const bundle=
      output(
        'r4-catalog-runtime.js'
      );

    if(!fs.existsSync(bundle)){
      fail(
        'Catalog route runtime bundle is missing.'
      );
    }else if(
      fs.statSync(bundle).size>
      BUDGETS.bundleRaw
    ){
      fail(
        'Catalog route runtime bundle exceeds the 56 KiB raw budget.'
      );
    }

    const executableScripts=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(executableScripts.length!==1){
      fail(
        'Catalog must have exactly one executable route runtime.'
      );
    }

    for(const marker of [
      'data-catalog-series=',
      'data-catalog-search',
      'data-catalog-size',
      'data-catalog-sort',
      'data-catalog-load-more',
      'data-home-language-select',
      'data-home-inquiry-count'
    ]){
      if(!html.includes(marker)){
        fail(
          'Catalog runtime owner is missing DOM hook: '+
          marker
        );
      }
    }
  }
}catch(error){
  fail(
    'Catalog runtime output inspection failed: '+
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
      ?.['r4:astro:catalog-runtime']!==
    'node scripts/validate-r4-astro-catalog-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:catalog-runtime.'
    );
  }
}catch(error){
  fail(
    'Catalog runtime package inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.4B Catalog Minimal Runtime: FAIL'
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
  'DREAMLAND B7-00B.4J R4.4B Catalog Minimal Runtime: PASS'
);
console.log(
  'Series/Search/Size/Sort/Load More URL state / EN-ZH-KO preference / Inquiry badge / canonical Catalog ViewState delegation / single route runtime budgets verified.'
);
console.log('');

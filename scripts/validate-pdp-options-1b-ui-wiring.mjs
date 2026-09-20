#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  '..'
);

const DIST=path.join(ROOT,'dist');
const mode=
  process.argv.includes('--dist')
    ? 'dist'
    : 'source';

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

  return fs.readFileSync(file,'utf8')
    .replace(/\r\n?/g,'\n');
}

function expect(
  source,
  marker,
  message
){
  if(!source.includes(marker)){
    fail(
      message+
      ' Missing: '+
      marker
    );
  }
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

const previewPaths=[
  ...['S','M','L','XL'].flatMap(
    size=>
      [1,2,3].map(
        index=>
          `/images/generated/shared/patterns/PAT${size==='XL'?'X':size}${String(index).padStart(2,'0')}/cover-960.webp`
      )
  ),
  '/images/generated/shared/packages/PKG001/cover-960.webp',
  '/images/generated/shared/packages/PKG002/cover-960.webp'
];

if(mode==='source'){
  const route=
    read(
      'src/astro/pages/products/[productId].astro'
    );

  const viewModel=
    read(
      'src/astro/lib/pdp-view-model.mjs'
    );

  const page=
    read(
      'src/astro/components/product/PdpPage.astro'
    );

  const runtime=
    read(
      'src/astro/runtime/pdp-visual-options-runtime.js'
    );

  const css=
    read(
      'src/astro/styles/pdp.css'
    );

  const copy=
    read(
      'scripts/r4-copy-astro-pdp-assets.mjs'
    );

  const promote=
    read(
      'scripts/r4-promote-astro-pdp.mjs'
    );

  const pkg=
    JSON.parse(
      read('package.json')
    );

  for(const marker of [
    "buildPdpVisualOptions",
    "'data/shared-assets.csv'",
    'visualOptions=',
    'visualOptions,'
  ]){
    expect(
      route,
      marker,
      'PDP-OPTIONS-1B route wiring changed.'
    );
  }

  for(const marker of [
    'visualOptions={},',
    'visualOptions:Object.freeze({',
    '...visualOptions'
  ]){
    expect(
      viewModel,
      marker,
      'PDP-OPTIONS-1B runtime-state projection changed.'
    );
  }

  for(const marker of [
    'pdp-field--visual-source',
    'data-pdp-visual-field="pattern"',
    'data-pdp-visual-options="pattern"',
    'data-pdp-visual-field="pack"',
    'data-pdp-visual-options="pack"'
  ]){
    expect(
      page,
      marker,
      'PDP-OPTIONS-1B visual field markup changed.'
    );
  }

  for(const marker of [
    "const VERSION='PDP-OPTIONS-1B';",
    'data-pdp-visual-option',
    "sourceFor(field)",
    "select.dispatchEvent(",
    "'dreamland:pdp-render'",
    'pdpVisualOptionsReady'
  ]){
    expect(
      runtime,
      marker,
      'PDP-OPTIONS-1B proxy runtime changed.'
    );
  }

  /*
   * PDP-OPTIONS-1B-FIX1 — semantic runtime ownership checks
   * Formatting is not part of the contract; state ownership is.
   */
  if(
    !/state\s*\?\.\s*visualOptions/.test(runtime)&&
    !/state\s*\.\s*visualOptions/.test(runtime)
  ){
    fail(
      'PDP-OPTIONS-1B proxy runtime must read visual options from route state.'
    );
  }

  if(
    !/visualOptions\s*\.\s*version\s*!==\s*1/.test(runtime)&&
    !/visualOptions\s*\?\.\s*version\s*!==\s*1/.test(runtime)
  ){
    fail(
      'PDP-OPTIONS-1B proxy runtime must guard visual option contract version 1.'
    );
  }

  for(const forbidden of [
    'DreamlandDetail',
    'DreamlandPricingPolicy',
    'DreamlandInquiry',
    'localStorage',
    'sessionStorage',
    'fetch('
  ]){
    if(runtime.includes(forbidden)){
      fail(
        'PDP-OPTIONS-1B visual runtime crossed a domain boundary: '+
        forbidden
      );
    }
  }

  if(
    Buffer.byteLength(
      runtime,
      'utf8'
    )>
    4*1024
  ){
    fail(
      'PDP-OPTIONS-1B visual proxy runtime exceeds 4 KiB.'
    );
  }

  for(const marker of [
    'PDP-OPTIONS-1B — Pattern / Packaging Visual Option UI',
    '.pdp-visual-field {',
    '.pdp-visual-option {',
    '.pdp-visual-option.is-selected {',
    '[data-pdp-projection-field="pattern"]',
    '[data-pdp-projection-field="pack"]',
    '@media (max-width:720px)',
    'overflow-x:auto;'
  ]){
    expect(
      css,
      marker,
      'PDP-OPTIONS-1B visual styling changed.'
    );
  }

  for(const marker of [
    "'pdp-visual-options-runtime.js'",
    'generated\\/shared\\/(?:patterns|packages)'
  ]){
    expect(
      copy,
      marker,
      'PDP-OPTIONS-1B isolated asset/runtime copy changed.'
    );
  }

  for(const marker of [
    'generated\\/shared\\/(?:patterns|packages)',
    'productMedia.add('
  ]){
    expect(
      promote,
      marker,
      'PDP-OPTIONS-1B Production visual-asset promotion changed.'
    );
  }

  if(
    pkg.scripts?.['r4:pdp:visual-options-ui-wiring']!==
    'node scripts/validate-pdp-options-1b-ui-wiring.mjs --source'||
    pkg.scripts?.['r4:pdp:visual-options-ui-wiring:dist']!==
    'node scripts/validate-pdp-options-1b-ui-wiring.mjs --dist'
  ){
    fail(
      'package.json lost PDP-OPTIONS-1B source/dist gates.'
    );
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const gallery=
    validate.indexOf(
      'npm run r4:pdp:gallery-interaction'
    );

  const visual=
    validate.indexOf(
      'npm run r4:pdp:visual-options-ui-wiring'
    );

  const frontend=
    validate.indexOf(
      'npm run frontend:foundation'
    );

  if(
    gallery<0||
    visual<=gallery||
    frontend<=visual
  ){
    fail(
      'PDP-OPTIONS-1B source gate must run after Gallery and before frontend foundation.'
    );
  }

  console.log(
    '[PDP-OPTIONS-1B Visual Runtime] '+
    Buffer.byteLength(runtime,'utf8')+
    ' / '+
    4*1024+
    ' bytes'
  );
}else{
  if(!fs.existsSync(DIST)){
    fail(
      'Production dist/ is missing.'
    );
  }

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

  let checked=0;

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
        DIST,
        'products',
        id,
        'index.html'
      );

    if(!fs.existsSync(file)){
      fail(
        'PDP-OPTIONS-1B Production PDP is missing: '+
        id
      );
      continue;
    }

    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    for(const marker of [
      'data-pdp-visual-field="pattern"',
      'data-pdp-visual-options="pattern"',
      'data-pdp-visual-field="pack"',
      'data-pdp-visual-options="pack"'
    ]){
      if(!html.includes(marker)){
        fail(
          `PDP-OPTIONS-1B Production ${id} missing ${marker}.`
        );
      }
    }

    const rawState=
      stateText(html);

    if(!rawState){
      fail(
        'PDP-OPTIONS-1B Production state missing: '+
        id
      );
      continue;
    }

    try{
      const state=
        JSON.parse(rawState);

      if(
        state
          ?.visualOptions
          ?.version!==1
      ){
        fail(
          'PDP-OPTIONS-1B Production visualOptions state missing/version mismatch: '+
          id
        );
      }
    }catch(error){
      fail(
        'PDP-OPTIONS-1B Production state JSON invalid for '+
        id+
        ': '+
        error.message
      );
    }

    checked++;
  }

  if(
    checked!==89
  ){
    fail(
      'PDP-OPTIONS-1B expected 89 Production PDPs; checked '+
      checked+
      '.'
    );
  }

  for(const pathname of previewPaths){
    const file=
      path.join(
        DIST,
        pathname.replace(
          /^\/+/,
          ''
        )
      );

    if(!fs.existsSync(file)){
      fail(
        'PDP-OPTIONS-1B Production preview asset missing: '+
        pathname
      );
    }
  }

  const bundle=
    path.join(
      DIST,
      'r4-pdp-runtime.js'
    );

  if(!fs.existsSync(bundle)){
    fail(
      'PDP-OPTIONS-1B Production PDP runtime bundle is missing.'
    );
  }else{
    const source=
      fs.readFileSync(
        bundle,
        'utf8'
      );

    for(const marker of [
      "PDP-OPTIONS-1B",
      'DreamlandPdpVisualOptions',
      'data-pdp-visual-option'
    ]){
      if(!source.includes(marker)){
        fail(
          'PDP-OPTIONS-1B Production bundle missing: '+
          marker
        );
      }
    }
  }
}

if(errors.length){
  console.error('');
  console.error(
    'PDP-OPTIONS-1B PATTERN / PACKAGING VISUAL UI WIRING: FAIL'
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
  'PDP-OPTIONS-1B PATTERN / PACKAGING VISUAL UI WIRING: PASS'
);
console.log(
  mode==='source'
    ? 'Canonical select ownership + image-card proxy runtime + responsive assets + PC/Mobile visual fields verified.'
    : '89 Production PDPs + 14 visual preview assets + bundled proxy runtime verified.'
);
console.log('');

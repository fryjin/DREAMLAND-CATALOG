#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const DIST=path.join(ROOT,'dist');
const mode=process.argv.includes('--dist')?'dist':'source';
const errors=[];

function fail(message){errors.push(message);}
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

if(mode==='source'){
  const page=read('src/astro/components/product/PdpPage.astro');
  const runtime=read('src/astro/runtime/pdp-visual-options-runtime.js');
  const css=read('src/astro/styles/pdp.css');
  const mainRuntime=read('src/astro/runtime/pdp-runtime.js');
  const pkg=JSON.parse(read('package.json'));

  for(const marker of [
    'pdp-field--scent',
    'pdp-field--scent-series',
    'data-pdp-scent-count',
    'data-pdp-scent-series-direct',
    'data-pdp-scent-series-direct-options',
    'data-pdp-scent-direct',
    'data-pdp-scent-direct-options',
    'data-pdp-scent'
  ]){
    expect(
      page,
      marker,
      'PDP-SCENT-1 Desktop direct-scent markup changed.'
    );
  }

  /*
   * FIX1A — sourceFor semantic contract
   *
   * The compact presentation adapter routes both Scent and Scent Series
   * through sourceFor(field). Validate the mappings + direct render calls,
   * not nonexistent formatting-specific literal invocations.
   */
  for(const marker of [
    'function sourceFor(f)',
    "f==='scentSeries'?'[data-pdp-scent-series]'",
    ":'[data-pdp-scent]'",
    "direct('scentSeries')",
    "direct('scent')",
    'data-pdp-scent-direct-option',
    'data-pdp-scent-series-direct-option',
    'pdpScentDirectReady',
    'pdpScentSeriesDirectReady',
    "select.dispatchEvent(new Event('change'",
    "'dreamland:pdp-render'"
  ]){
    expect(
      runtime,
      marker,
      'PDP-SCENT-1 direct selection proxy changed.'
    );
  }

  if(
    Buffer.byteLength(runtime,'utf8')>
    4*1024
  ){
    fail(
      'PDP-SCENT-1 must keep the shared visual proxy runtime within 4 KiB.'
    );
  }

  for(const forbidden of [
    'DreamlandDetail',
    'DreamlandPricingPolicy',
    'DreamlandInquiry',
    'detail.setScent(',
    'pricing.',
    'inquiry.',
    'localStorage',
    'sessionStorage',
    'fetch('
  ]){
    if(runtime.includes(forbidden)){
      fail(
        'PDP-SCENT-1 must Proxy, Don\'t Fork. Forbidden in presentation runtime: '+
        forbidden
      );
    }
  }

  for(const marker of [
    'PDP-SCENT-1 — Direct Scent Selection',
    '.pdp-field--scent {',
    '.pdp-scent-direct {',
    '.pdp-scent-direct__options {',
    '.pdp-scent-direct__option {',
    '.pdp-scent-direct__option.is-selected {',
    'color:#fff;',
    'html[data-pdp-scent-direct-ready="true"]',
    'html[data-pdp-scent-series-direct-ready="true"]',
    '.pdp-scent-series-direct__options {',
    '@media (max-width:720px)'
  ]){
    expect(
      css,
      marker,
      'PDP-SCENT-1 responsive styling changed.'
    );
  }

  if(
    !/@media\s*\(min-width:\s*721px\)[\s\S]*?\.pdp-scent-direct__options\s*\{[\s\S]*?grid-template-columns\s*:\s*repeat\(3,minmax\(0,1fr\)\)/m
      .test(css)
  ){
    fail(
      'PDP-SCENT-1 Desktop scent options must render as a three-column direct-selection grid.'
    );
  }

  if(
    !/@media\s*\(max-width:\s*720px\)[\s\S]*?\.pdp-scent-direct\s*\{[\s\S]*?display\s*:\s*none\s*!important/m
      .test(css)||
    !/@media\s*\(max-width:\s*720px\)[\s\S]*?\.pdp-scent-series-direct\s*\{[\s\S]*?display\s*:\s*none\s*!important/m
      .test(css)
  ){
    fail(
      'PDP-SCENT-1 must keep Desktop direct Scent / Scent Series selectors hidden on Mobile.'
    );
  }

  if(
    !/@media\s*\(min-width:\s*721px\)[\s\S]*?\.pdp-scent-series-direct__options\s*\{[\s\S]*?grid-template-columns\s*:\s*repeat\(3,minmax\(0,1fr\)\)/m
      .test(css)
  ){
    fail(
      'PDP-SCENT-1 Holiday Scent Series must render as a three-column direct-selection grid on Desktop.'
    );
  }

  for(const marker of [
    'function renderConfigurationProjection(view)',
    "field:'scent'",
    'function bindConfigurationProjection()',
    "scent:",
    "select.dispatchEvent("
  ]){
    expect(
      mainRuntime,
      marker,
      'PDP-SCENT-1 must preserve the existing Mobile Scent projection.'
    );
  }

  if(
    pkg.scripts?.['r4:pdp:scent-direct']!==
      'node scripts/validate-pdp-scent-1-direct-selection.mjs --source'||
    pkg.scripts?.['r4:pdp:scent-direct:dist']!==
      'node scripts/validate-pdp-scent-1-direct-selection.mjs --dist'
  ){
    fail(
      'package.json lost PDP-SCENT-1 source/dist gates.'
    );
  }

  const validate=String(pkg.scripts?.validate||'');
  const detail=validate.indexOf('npm run r4:pdp:desktop-scent-detail');
  const scent=validate.indexOf('npm run r4:pdp:scent-direct');
  const frontend=validate.indexOf('npm run frontend:foundation');

  if(
    detail<0||
    scent<=detail||
    frontend<=scent
  ){
    fail(
      'PDP-SCENT-1 source gate must run after Desktop Scent Detail and before frontend foundation.'
    );
  }

  console.log(
    '[PDP-SCENT-1 Shared Visual Runtime] '+
    Buffer.byteLength(runtime,'utf8')+
    ' / '+
    4*1024+
    ' bytes'
  );
}else{
  if(!fs.existsSync(DIST)){
    fail('Production dist/ is missing.');
  }

  const products=
    JSON.parse(read('data/products.json'))
      .products
      .filter(product=>product?.status==='active');

  let checked=0;

  for(const product of products){
    const id=String(product?.productId||product?.id||'')
      .trim()
      .toUpperCase();

    const file=path.join(
      DIST,
      'products',
      id,
      'index.html'
    );

    if(!fs.existsSync(file)){
      fail('PDP-SCENT-1 Production PDP is missing: '+id);
      continue;
    }

    const html=fs.readFileSync(file,'utf8');

    for(const marker of [
      'data-pdp-scent',
      'data-pdp-scent-count',
      'data-pdp-scent-direct',
      'data-pdp-scent-direct-options',
      'data-pdp-scent-detail'
    ]){
      if(!html.includes(marker)){
        fail(
          `PDP-SCENT-1 Production ${id} missing ${marker}.`
        );
      }
    }

    if(
      String(product?.series||'').trim().toLowerCase()==='holiday'
    ){
      for(const marker of [
        'data-pdp-scent-series',
        'data-pdp-scent-series-direct',
        'data-pdp-scent-series-direct-options'
      ]){
        if(!html.includes(marker)){
          fail(
            `PDP-SCENT-1 Production Holiday ${id} missing ${marker}.`
          );
        }
      }
    }

    checked++;
  }

  if(checked!==89){
    fail(
      'PDP-SCENT-1 expected 89 Production PDPs; checked '+
      checked+
      '.'
    );
  }

  const bundle=path.join(DIST,'r4-pdp-runtime.js');

  if(!fs.existsSync(bundle)){
    fail(
      'PDP-SCENT-1 Production PDP runtime bundle is missing.'
    );
  }else{
    const source=fs.readFileSync(bundle,'utf8');

    for(const marker of [
      'data-pdp-scent-direct-option',
      'data-pdp-scent-series-direct-option',
      'pdpScentDirectReady',
      'pdpScentSeriesDirectReady',
      'function sourceFor(f)',
      "[data-pdp-scent-series]",
      "[data-pdp-scent]",
      "direct('scentSeries')",
      "direct('scent')"
    ]){
      if(!source.includes(marker)){
        fail(
          'PDP-SCENT-1 Production bundle missing: '+
          marker
        );
      }
    }
  }
}

if(errors.length){
  console.error('');
  console.error(
    'PDP-SCENT-1 DIRECT SCENT SELECTION: FAIL'
  );
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'PDP-SCENT-1 DIRECT SCENT SELECTION: PASS'
);
console.log(
  mode==='source'
    ? 'Desktop one-click Scent + Holiday Scent Series cards + selected contrast + canonical ownership + Mobile projection preservation verified.'
    : '89 Production PDPs + bundled direct-scent proxy verified.'
);
console.log('');

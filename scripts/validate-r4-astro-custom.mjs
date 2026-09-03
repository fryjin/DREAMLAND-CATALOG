#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

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
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(read(relative));
}

function count(source,pattern){
  return [...source.matchAll(pattern)].length;
}

try{
  const file=
    path.join(OUT,'custom','index.html');

  if(!fs.existsSync(file)){
    fail('R4.6A Custom output is missing: custom/index.html');
  }else{
    const html=
      fs.readFileSync(file,'utf8');

    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-custom="true"',
      'data-r4-custom-static="true"',
      'data-custom-static-presentation',
      'data-custom-section="basics"',
      'data-custom-section="product"',
      'data-custom-section="packaging"',
      'data-custom-static-brief',
      'data-custom-static-add-inquiry',
      'data-custom-quantity',
      'data-custom-budget',
      'data-custom-delivery',
      'data-custom-color',
      'data-custom-notes',
      'href="/products/"',
      'href="/inquiry/"',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/custom/"',
      'data-site-language-enabled="false"'
    ]){
      if(!html.includes(marker)){
        fail('R4.6A Custom output is missing: '+marker);
      }
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-custom.js',
      'runtime-custom.js',
      'runtime-inquiry.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'runtime-pwa.js',
      'custom-scent-multi.js',
      'startup-loader.js'
    ]){
      if(html.includes(forbidden)){
        fail(
          'R4.6A Custom output still contains Legacy/runtime marker: '+
          forbidden
        );
      }
    }

    if(/<script\b/i.test(html)){
      fail('R4.6A Custom presentation must remain zero-client-JS.');
    }

    const app=json('data/app-config.json');

    if(
      !html.includes('min="'+String(app.customMoq)+'"')||
      !html.includes('max="'+String(app.maxQuantity)+'"')
    ){
      fail(
        'R4.6A Custom quantity presentation does not reflect app-config customMoq/maxQuantity.'
      );
    }

    const site=json('data/site-content.json');
    const english=
      site.languages?.en?.customProject||{};

    const expectedCounts=[
      [
        'use cases',
        english.useCases?.length||0,
        count(html,/data-custom-use-option=/g)
      ],
      [
        'sizes',
        english.sizes?.length||0,
        count(html,/data-custom-size-option=/g)
      ],
      [
        'packages',
        english.packages?.length||0,
        count(html,/data-custom-packaging-option=/g)
      ],
      [
        'branding',
        english.brandingOptions?.length||0,
        count(html,/data-custom-branding-option=/g)
      ]
    ];

    for(const [label,expected,actual] of expectedCounts){
      if(!expected||actual!==expected){
        fail(
          `R4.6A Custom ${label} option count mismatch: expected ${expected}, found ${actual}.`
        );
      }
    }

    const seriesCount=
      count(html,/data-custom-fragrance-series=/g);
    const scentCount=
      count(html,/data-custom-scent-option=/g);

    if(seriesCount!==3){
      fail(
        'R4.6A Custom must present the three canonical fragrance collections; found '+
        seriesCount+
        '.'
      );
    }

    if(scentCount<3){
      fail(
        'R4.6A Custom scent presentation is unexpectedly empty; found '+
        scentCount+
        ' scent choices.'
      );
    }

    const disabledControls=
      count(html,/\bdisabled(?:=""|="disabled"|>|\s)/gi);

    if(disabledControls<10){
      fail('R4.6A Custom controls must remain inert until R4.6B.');
    }
  }
}catch(error){
  fail('R4.6A output inspection crashed: '+error.message);
}

try{
  delete globalThis.DreamlandProductDataContract;
  delete globalThis.DreamlandLocalizationPolicy;
  delete globalThis.DreamlandCustom;

  await import(
    pathToFileURL(
      path.join(ROOT,'src/data/product-data-contract.js')
    ).href+
    '?r4-custom-data='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/localization/runtime-localization-policy.js'
      )
    ).href+
    '?r4-custom-localization='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(ROOT,'src/features/custom/runtime-custom.js')
    ).href+
    '?r4-custom-feature='+
    Date.now()
  );

  const data=globalThis.DreamlandProductDataContract;
  const localization=globalThis.DreamlandLocalizationPolicy;
  const custom=globalThis.DreamlandCustom;

  if(
    !data||
    !localization||
    !custom||
    custom.version!=='B6-05'
  ){
    fail('R4.6A canonical Custom build-time owners are unavailable.');
  }else{
    const rows=
      data.parseCsv(
        read('data/scents.csv')
      );

    const map=new Map();

    for(const row of rows){
      const series=String(row.series||'').trim();

      if(!map.has(series)){
        map.set(series,[]);
      }

      map.get(series).push({
        id:String(row.scent_id||'').trim(),
        status:String(row.status||'').trim().toLowerCase(),
        name:{
          zh:String(row.name_zh||'').trim(),
          en:String(row.name_en||'').trim(),
          ko:String(row.name_ko||'').trim()
        }
      });
    }

    const app=json('data/app-config.json');

    custom.configure({
      scentsBySeries:map,
      seriesOrder:[
        'classic',
        'advanced',
        'masterpiece'
      ],
      defaultSeries:'classic',
      customMoq:()=>app.customMoq,
      maximumQuantity:()=>app.maxQuantity
    });

    custom.reset();

    if(
      !custom.ready()||
      custom.availableSeries().join(',')!==
        'classic,advanced,masterpiece'||
      custom.snapshot().minimumQuantity!==app.customMoq||
      custom.snapshot().maximumQuantity!==app.maxQuantity
    ){
      fail(
        'R4.6A canonical DreamlandCustom build-time configuration parity failed.'
      );
    }
  }
}catch(error){
  fail('R4.6A canonical owner validation failed: '+error.message);
}

try{
  const page=read('src/astro/pages/custom/index.astro');

  for(const pattern of [
    /SiteLayout/,
    /SiteHeader/,
    /SiteFooter/,
    /CustomPage/,
    /buildCustomViewModel/,
    /mapCustomScents/,
    /groupCustomScents/,
    /product-data-contract\.js/,
    /runtime-localization-policy\.js/,
    /features\/custom\/runtime-custom\.js/,
    /customFeature\.configure/,
    /customFeature\.reset/,
    /robots="noindex,nofollow"/
  ]){
    if(!pattern.test(page)){
      fail('R4.6A Custom source contract is incomplete: '+pattern);
    }
  }

  const viewModel=
    read('src/astro/lib/custom-view-model.mjs');

  for(const pattern of [
    /localizationPolicy\s*\.\s*localizedContent/,
    /customFeature\s*\.\s*snapshot/,
    /customFeature\s*\.\s*availableSeries/,
    /customFeature\s*\.\s*availableScents/
  ]){
    if(!pattern.test(viewModel)){
      fail(
        'R4.6A Custom ViewModel delegation is missing: '+
        pattern
      );
    }
  }

  for(const forbidden of [
    'document.',
    'querySelector(',
    'localStorage',
    'sessionStorage',
    'fetch(',
    'DreamlandInquiry',
    'DreamlandRisk',
    'DreamlandSubmission'
  ]){
    if(viewModel.includes(forbidden)){
      fail(
        'R4.6A Custom ViewModel crossed a boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail('R4.6A source inspection crashed: '+error.message);
}

try{
  const pkg=json('package.json');

  if(
    pkg.scripts?.['r4:astro:custom']!==
    'node scripts/validate-r4-astro-custom.mjs'
  ){
    fail('package.json is missing r4:astro:custom.');
  }

  const validate=String(pkg.scripts?.validate||'');

  const pdpRuntime=
    validate.indexOf('npm run r4:astro:pdp-runtime');
  const custom=
    validate.indexOf('npm run r4:astro:custom');
  const productionHome=
    validate.indexOf('npm run r4:production:home:contract');

  if(
    pdpRuntime<0||
    custom<=pdpRuntime||
    productionHome<=custom
  ){
    fail(
      'R4.6A Custom gate must run after PDP Runtime and before Production Home contract.'
    );
  }

  if(
    pkg.scripts?.build!==
    'npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:pdp && npm run r4:production:home:validate && npm run r4:production:catalog:validate && npm run r4:production:pdp:validate'
  ){
    fail('R4.6A must not change Production Custom ownership.');
  }
}catch(error){
  fail('R4.6A package inspection crashed: '+error.message);
}

try{
  for(const relative of [
    'scripts/r4-promote-astro-home.mjs',
    'scripts/r4-promote-astro-catalog.mjs',
    'scripts/r4-promote-astro-pdp.mjs'
  ]){
    const source=read(relative);

    if(
      source.includes('SOURCE_CUSTOM')||
      source.includes('TARGET_CUSTOM')
    ){
      fail(
        'R4.6A must not promote Astro Custom into Production: '+
        relative
      );
    }
  }
}catch(error){
  fail('R4.6A Production ownership inspection crashed: '+error.message);
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.6A Astro Custom Static Presentation: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.6A Astro Custom Static Presentation: PASS'
);
console.log(
  'Canonical Custom + Localization build-time ownership / 3-section project brief / FX-localized budget presentation / fragrance collections + scents / inert controls / zero-client-JS verified.'
);
console.log('');

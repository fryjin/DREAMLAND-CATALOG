#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function runtimeState(html){
  const match=
    html.match(
      /<script[^>]*id="pdpRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="pdpRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  if(!match){
    fail(
      'R4.5B PDP runtime state is missing.'
    );
    return null;
  }

  try{
    return JSON.parse(
      match[1]
    );
  }catch(error){
    fail(
      'R4.5B PDP runtime state JSON is invalid: '+
      error.message
    );
    return null;
  }
}

try{
  const products=
    json(
      'data/products.json'
    )
      .products
      .filter(
        product=>
          product?.status===
          'active'
      );

  if(products.length!==89){
    fail(
      'R4.5B expected 89 active products; found '+
      products.length+
      '.'
    );
  }

  const seenImages=
    new Set();

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
        'R4.5B PDP output is missing: '+
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
      'data-r4-astro-foundation="true"',
      'data-r4-astro-product="true"',
      'data-r4-pdp-static="true"',
      `data-product-id="${id}"`,
      'data-pdp-runtime-presentation',
      'data-pdp-gallery',
      'data-pdp-primary-image="true"',
      'data-pdp-add-inquiry',
      'data-pdp-size=',
      'data-pdp-scent',
      'data-pdp-pattern',
      'data-pdp-pack',
      'data-pdp-quantity',
      'data-pdp-current-price',
      'data-pdp-current-moq',
      'data-pdp-section="details"',
      'data-pdp-section="inquiry-cta"',
      'id="pdpRuntimeState"',
      'src="/r4-pdp-runtime.js"',
      'href="/products/"',
      'href="/custom/"',
      'href="/inquiry/"',
      'name="robots" content="index,follow"'
    ]){
      if(!html.includes(marker)){
        fail(
          `R4.5B PDP ${id} is missing: ${marker}`
        );
      }
    }

    for(const forbidden of [
      'DREAMLAND R4 Foundation',
      'Static product-detail route proof of concept.',
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-detail.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'runtime-pwa.js',
      'catalog-data.js',
      'startup-loader.js'
    ]){
      if(html.includes(forbidden)){
        fail(
          `R4.5B PDP ${id} still contains Legacy/Foundation marker: ${forbidden}`
        );
      }
    }

    const executableScripts=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(executableScripts.length!==1){
      fail(
        `R4.5B PDP ${id} must contain exactly one executable route runtime; found ${executableScripts.length}.`
      );
    }

    if(/\bdisabled(?:=|>|\s)/i.test(html)){
      fail(
        'R4.5B PDP controls must be active; disabled controls remain: '+
        id
      );
    }

    const state=
      runtimeState(
        html
      );

    if(state){
      if(
        state.version!=='R4.5B'||
        state.product?.id!==id||
        state.defaultLanguage!=='en'||
        state.storage?.languageKey!==
          'productManualLang'||
        state.storage?.inquiryKey!==
          'productManualV2State'||
        state.storage?.inquiryVersion!==2
      ){
        fail(
          'R4.5B runtime state contract changed for '+
          id+
          '.'
        );
      }

      for(const language of [
        'en',
        'zh',
        'ko'
      ]){
        if(
          !state.languages?.[language]?.name||
          !state.languages?.[language]?.content?.navigation||
          !state.languages?.[language]?.content?.footer||
          !state.languages?.[language]?.ui
        ){
          fail(
            `R4.5B PDP ${id} is missing ${language} runtime localization.`
          );
        }
      }

      if(
        !Array.isArray(
          state.product?.availableSizes
        )||
        !state.product.availableSizes.length||
        !state.seriesMeta?.[state.product.series]||
        !state.patternsBySize
      ){
        fail(
          'R4.5B PDP configuration state is incomplete: '+
          id
        );
      }
    }

    const primary=[
      ...html.matchAll(
        /<img\b[^>]*data-pdp-primary-image="true"[^>]*>/gi
      )
    ];

    if(primary.length!==1){
      fail(
        `R4.5B PDP ${id} must have exactly one primary/eager image; found ${primary.length}.`
      );
    }else{
      const tag=
        primary[0][0];

      if(
        !/\bloading="eager"/i.test(tag)||
        !/\bfetchpriority="high"/i.test(tag)
      ){
        fail(
          'R4.5B PDP primary image must be eager/high-priority: '+
          id
        );
      }
    }

    const images=[
      ...html.matchAll(
        /src="(\/images\/products\/[^"]+\.(?:webp|png|jpe?g))"/gi
      )
    ].map(
      match=>match[1]
    );

    if(
      images.length<1||
      images.length>10
    ){
      fail(
        `R4.5B PDP ${id} must render 1-10 product images; found ${images.length}.`
      );
    }

    for(const pathname of images){
      seenImages.add(
        pathname
      );

      const output=
        path.join(
          OUT,
          pathname.replace(
            /^\/+/,
            ''
          )
        );

      if(!fs.existsSync(output)){
        fail(
          `R4.5B PDP image output is missing for ${id}: ${pathname}`
        );
      }
    }
  }

  if(seenImages.size<89){
    fail(
      'R4.5B expected at least one unique image per product; found '+
      seenImages.size+
      ' unique product images.'
    );
  }

  const runtimeFile=
    path.join(
      OUT,
      'r4-pdp-runtime.js'
    );

  if(!fs.existsSync(runtimeFile)){
    fail(
      'R4.5B route runtime bundle is missing.'
    );
  }else{
    const source=
      fs.readFileSync(
        runtimeFile,
        'utf8'
      );

    for(const marker of [
      'DreamlandDetail',
      'DreamlandPricingPolicy',
      'DreamlandInquiry',
      'DREAMLAND_R4_PDP_RUNTIME_R4_5B'
    ]){
      if(!source.includes(marker)){
        fail(
          'R4.5B runtime bundle is missing: '+
          marker
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.5B output inspection crashed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/products/[productId].astro'
    );

  for(const pattern of [
    /buildPdpViewModel/,
    /buildPdpRuntimeState/,
    /mapPdpScents/,
    /product-data-contract\.js/,
    /pdpRuntimeState/,
    /r4-pdp-runtime\.js/,
    /languageEnabled=\{true\}/,
    /robots="index,follow"/
  ]){
    if(!pattern.test(page)){
      fail(
        'R4.5B PDP source contract is incomplete: '+
        pattern
      );
    }
  }

  const viewModel=
    read(
      'src/astro/lib/pdp-view-model.mjs'
    );

  for(const pattern of [
    /pricingPolicy\s*\.\s*defaultProductSize/,
    /pricingPolicy\s*\.\s*moqForSeriesSize/,
    /pricingPolicy\s*\.\s*catalogUnit/,
    /pricingPolicy\s*\.\s*money/,
    /localizationPolicy\s*\.\s*localizedContent/,
    /localizationPolicy\s*\.\s*productName/,
    /localizationPolicy\s*\.\s*productDescription/,
    /localizationPolicy\s*\.\s*fromPrice/,
    /buildPdpRuntimeState/,
    /mapPdpScents/
  ]){
    if(!pattern.test(viewModel)){
      fail(
        'R4.5B PDP ViewModel delegation is missing: '+
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
    'DreamlandDetail',
    'DreamlandRisk',
    'DreamlandSubmission'
  ]){
    if(viewModel.includes(forbidden)){
      fail(
        'R4.5B PDP build-time ViewModel crossed a boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.5B source inspection crashed: '+
    error.message
  );
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:astro:pdp']!==
    'node scripts/validate-r4-astro-pdp.mjs'
  ){
    fail(
      'package.json lost r4:astro:pdp.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:astro:pdp-runtime']!==
    'node scripts/validate-r4-astro-pdp-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:pdp-runtime.'
    );
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const pdp=
    validate.indexOf(
      'npm run r4:astro:pdp'
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:pdp-runtime'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    pdp<0||
    runtime<=pdp||
    productionHome<=runtime
  ){
    fail(
      'R4.5B PDP Runtime gate must run after PDP Presentation and before Production Home contract.'
    );
  }

  if(
    pkg.scripts?.build!==
    'npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:pdp && npm run r4:production:home:validate && npm run r4:production:catalog:validate && npm run r4:production:pdp:validate'
  ){
    fail(
      'R4.5C Production build must append route-scoped PDP promotion without changing the isolated PDP contract.'
    );
  }
}catch(error){
  fail(
    'R4.5B package inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.5A/R4.5B Astro PDP Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.5A/R4.5B Astro PDP Presentation: PASS'
);
console.log(
  '89 interactive isolated PDPs / canonical Detail + Pricing + Inquiry runtime ownership / active configuration controls / EN-ZH-KO state / direct route links verified.'
);
console.log('');

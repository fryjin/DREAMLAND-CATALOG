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
      'R4.5A expected 89 active products; found '+
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
        'R4.5A PDP output is missing: '+
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
      'data-pdp-static-presentation',
      'data-pdp-gallery',
      'data-pdp-primary-image="true"',
      'data-pdp-static-add-inquiry',
      'data-pdp-section="details"',
      'data-pdp-section="inquiry-cta"',
      'href="/products/"',
      'href="/custom/"',
      'href="/inquiry/"',
      'name="robots" content="noindex,nofollow"'
    ]){
      if(!html.includes(marker)){
        fail(
          `R4.5A PDP ${id} is missing: ${marker}`
        );
      }
    }

    for(const forbidden of [
      'DREAMLAND R4 Foundation',
      'Static product-detail route proof of concept.',
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-detail.js',
      'runtime-detail.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'runtime-pwa.js',
      'catalog-data.js',
      'startup-loader.js'
    ]){
      if(html.includes(forbidden)){
        fail(
          `R4.5A PDP ${id} still contains Legacy/Foundation marker: ${forbidden}`
        );
      }
    }

    if(/<script\b/i.test(html)){
      fail(
        'R4.5A PDP must remain zero-client-JS: '+
        id
      );
    }

    const primary=[
      ...html.matchAll(
        /<img\b[^>]*data-pdp-primary-image="true"[^>]*>/gi
      )
    ];

    if(primary.length!==1){
      fail(
        `R4.5A PDP ${id} must have exactly one primary/eager image; found ${primary.length}.`
      );
    }else{
      const tag=
        primary[0][0];

      if(
        !/\bloading="eager"/i.test(tag)||
        !/\bfetchpriority="high"/i.test(tag)
      ){
        fail(
          'R4.5A PDP primary image must be eager/high-priority: '+
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
        `R4.5A PDP ${id} must render 1-10 product images; found ${images.length}.`
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
          `R4.5A PDP image output is missing for ${id}: ${pathname}`
        );
      }
    }
  }

  if(seenImages.size<89){
    fail(
      'R4.5A expected at least one unique image per product; found '+
      seenImages.size+
      ' unique product images.'
    );
  }
}catch(error){
  fail(
    'R4.5A output inspection crashed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/products/[productId].astro'
    );

  for(const pattern of [
    /SiteLayout/,
    /SiteHeader/,
    /SiteFooter/,
    /PdpPage/,
    /buildPdpViewModel/,
    /domain\/pricing\/runtime-pricing-policy\.js/,
    /domain\/localization\/runtime-localization-policy\.js/,
    /robots="noindex,nofollow"/
  ]){
    if(!pattern.test(page)){
      fail(
        'R4.5A PDP source contract is incomplete: '+
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
    /localizationPolicy\s*\.\s*fromPrice/
  ]){
    if(!pattern.test(viewModel)){
      fail(
        'R4.5A PDP ViewModel delegation is missing: '+
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
        'R4.5A PDP ViewModel crossed a boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.5A source inspection crashed: '+
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
      ?.['r4:astro:build']!==
    'astro build --config astro.config.mjs && node scripts/r4-copy-astro-home-assets.mjs && node scripts/r4-copy-astro-catalog-assets.mjs && node scripts/r4-copy-astro-pdp-assets.mjs'
  ){
    fail(
      'R4 Astro build must append the route-scoped PDP asset copy step.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:astro:pdp']!==
    'node scripts/validate-r4-astro-pdp.mjs'
  ){
    fail(
      'package.json is missing r4:astro:pdp.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const catalogRuntime=
    validate.indexOf(
      'npm run r4:astro:catalog-runtime'
    );

  const pdp=
    validate.indexOf(
      'npm run r4:astro:pdp'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    catalogRuntime<0||
    pdp<=catalogRuntime||
    productionHome<=pdp
  ){
    fail(
      'R4.5A PDP gate must run after Catalog Runtime and before Production Home contract.'
    );
  }

  if(
    pkg.scripts?.build!==
    'npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:home:validate && npm run r4:production:catalog:validate'
  ){
    fail(
      'R4.5A must not change Production PDP ownership.'
    );
  }
}catch(error){
  fail(
    'R4.5A package inspection crashed: '+
    error.message
  );
}

try{
  const catalogPromotion=
    read(
      'scripts/r4-promote-astro-catalog.mjs'
    );

  if(
    catalogPromotion.includes(
      'SOURCE_PDP'
    )||
    catalogPromotion.includes(
      'TARGET_PDP'
    )
  ){
    fail(
      'R4.5A must not promote Astro PDP documents into Production.'
    );
  }
}catch(error){
  fail(
    'R4.5A Production ownership inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.5A Astro PDP Static Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.5A Astro PDP Static Presentation: PASS'
);
console.log(
  '89 static PDP documents / localized product identity / canonical Pricing + Localization build-time ownership / product gallery / size + MOQ + from-price presentation / zero-client-JS verified.'
);
console.log('');

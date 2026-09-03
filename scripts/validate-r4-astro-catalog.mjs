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

function output(relative){
  return path.join(
    OUT,
    relative
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
      'R4.4A Astro Catalog output is missing.'
    );
  }else{
    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-catalog="true"',
      'data-r4-catalog-static="true"',
      'data-catalog-static-presentation',
      'data-catalog-section="intro"',
      'data-catalog-section="browse"',
      'data-catalog-section="products"',
      'data-catalog-section="inquiry-cta"',
      'data-catalog-product-grid',
      'data-catalog-static-search',
      'data-catalog-static-filter',
      'data-catalog-static-sort',
      'data-catalog-static-load-more',
      'href="/inquiry/"'
    ]){
      if(!html.includes(marker)){
        fail(
          'Astro Catalog is missing: '+
          marker
        );
      }
    }

    for(const legacy of [
      'id="app"',
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-catalog.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'runtime-pwa.js',
      'catalog-data.js',
      'startup-loader.js'
    ]){
      if(html.includes(legacy)){
        fail(
          'Astro Catalog still contains Legacy runtime marker: '+
          legacy
        );
      }
    }

    if(/<script\b/i.test(html)){
      fail(
        'R4.4A Catalog must remain zero-client-JS.'
      );
    }

    if(
      html.includes(
        'DREAMLAND R4 Catalog Foundation'
      )||
      html.includes(
        'Astro resolved 89 active products at build time.'
      )
    ){
      fail(
        'R4.1 Catalog proof copy still appears in R4.4A output.'
      );
    }

    const allCount=
      Number(
        html.match(
          /data-catalog-all-count="(\d+)"/
        )?.[1]||
        0
      );

    if(allCount!==89){
      fail(
        'R4.4A Catalog expected 89 active products; found '+
        allCount+
        '.'
      );
    }

    const productIds=[
      ...html.matchAll(
        /data-catalog-product="([A-Z0-9]+)"/g
      )
    ].map(
      match=>match[1]
    );

    if(
      productIds.length!==24||
      new Set(productIds).size!==24
    ){
      fail(
        'R4.4A Catalog expected 24 unique initial product cards; found '+
        productIds.length+
        '.'
      );
    }

    const scopes=[
      ...html.matchAll(
        /data-catalog-static-series="([^"]+)"/g
      )
    ].map(
      match=>match[1]
    );

    for(const scope of [
      'all',
      'advanced',
      'masterpiece',
      'holiday',
      'classic'
    ]){
      if(!scopes.includes(scope)){
        fail(
          'R4.4A Catalog scope is missing: '+
          scope
        );
      }
    }

    const coverPaths=[
      ...new Set(
        [
          ...html.matchAll(
            /src="(\/images\/products\/[^"]+\/cover\.webp)"/g
          )
        ].map(
          match=>match[1]
        )
      )
    ];

    if(coverPaths.length!==24){
      fail(
        'R4.4A Catalog expected 24 route-scoped cover images; found '+
        coverPaths.length+
        '.'
      );
    }

    for(const pathname of coverPaths){
      const file=
        output(
          pathname.replace(
            /^\/+/,
            ''
          )
        );

      if(!fs.existsSync(file)){
        fail(
          'R4.4A Catalog output cover is missing: '+
          pathname
        );
      }
    }

    for(const id of productIds){
      if(
        !html.includes(
          `href="/products/${id}/"`
        )
      ){
        fail(
          'Catalog product must use a direct MPA PDP link: '+
          id
        );
      }
    }

    const inertPatterns=[
      /<select\b(?=[^>]*data-site-language-enabled="false")(?=[^>]*\bdisabled\b)[^>]*>/i,
      /<input\b(?=[^>]*data-catalog-static-search)(?=[^>]*\bdisabled\b)[^>]*>/i,
      /<button\b(?=[^>]*data-catalog-static-filter)(?=[^>]*\bdisabled\b)[^>]*>/i,
      /<select\b(?=[^>]*data-catalog-static-sort)(?=[^>]*\bdisabled\b)[^>]*>/i,
      /<button\b(?=[^>]*data-catalog-static-load-more)(?=[^>]*\bdisabled\b)[^>]*>/i
    ];

    if(
      inertPatterns.some(
        pattern=>
          !pattern.test(html)
      )
    ){
      fail(
        'R4.4A interactive controls must remain explicitly inert.'
      );
    }
  }
}catch(error){
  fail(
    'R4.4A output inspection crashed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/astro/pages/products/index.astro'
    );

  for(const pattern of [
    /components\/catalog\/CatalogPage\.astro/,
    /lib\/catalog-view-model\.mjs/,
    /features\/catalog\/runtime-desktop-catalog-view\.js/,
    /domain\/pricing\/runtime-pricing-policy\.js/,
    /domain\/localization\/runtime-localization-policy\.js/,
    /buildCatalogViewModel/,
    /batchSize\s*:\s*24/
  ]){
    if(!pattern.test(source)){
      fail(
        'Astro Catalog source ownership contract is incomplete: '+
        pattern
      );
    }
  }

  const viewModel=
    read(
      'src/astro/lib/catalog-view-model.mjs'
    );

  for(const pattern of [
    /catalogPolicy\s*\.\s*configure/,
    /catalogPolicy\s*\.\s*buildViewModel/,
    /pricingPolicy\s*\.\s*catalogUnit/,
    /pricingPolicy\s*\.\s*productMoq/,
    /localizationPolicy\s*\.\s*localizedContent/,
    /localizationPolicy\s*\.\s*productName/
  ]){
    if(!pattern.test(viewModel)){
      fail(
        'Catalog ViewModel delegation is missing: '+
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
    'DreamlandSubmission'
  ]){
    if(viewModel.includes(forbidden)){
      fail(
        'R4.4A Catalog ViewModel crossed a boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.4A source inspection crashed: '+
    error.message
  );
}

try{
  const packageJson=
    json(
      'package.json'
    );

  if(
    packageJson.scripts
      ?.['r4:astro:build']!==
    'astro build --config astro.config.mjs && node scripts/r4-copy-astro-home-assets.mjs && node scripts/r4-copy-astro-catalog-assets.mjs'
  ){
    fail(
      'R4 Astro build must copy Home assets and route-scoped Catalog covers.'
    );
  }

  if(
    packageJson.scripts
      ?.['r4:astro:catalog']!==
    'node scripts/validate-r4-astro-catalog.mjs'
  ){
    fail(
      'package.json is missing r4:astro:catalog.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  const homeRuntime=
    validate.indexOf(
      'npm run r4:astro:home-runtime'
    );

  const catalog=
    validate.indexOf(
      'npm run r4:astro:catalog'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    homeRuntime<0||
    catalog<=homeRuntime||
    productionHome<=catalog
  ){
    fail(
      'R4.4A Catalog gate must run after Home Runtime and before Production Home contract.'
    );
  }

  if(
    packageJson.scripts?.build!==
    'npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:home:validate'
  ){
    fail(
      'R4.4A must not change Production route ownership.'
    );
  }
}catch(error){
  fail(
    'R4.4A package inspection crashed: '+
    error.message
  );
}

try{
  const promotion=
    read(
      'scripts/r4-promote-astro-home.mjs'
    );

  if(
    !promotion.includes(
      'copyFile(\n  SOURCE_HOME,\n  TARGET_HOME'
    )
  ){
    fail(
      'R4.4A expected the existing Home-only Production promotion contract.'
    );
  }

  if(
    promotion.includes(
      'SOURCE_CATALOG'
    )||
    promotion.includes(
      'TARGET_CATALOG'
    )
  ){
    fail(
      'R4.4A must not promote Astro Catalog into Production.'
    );
  }
}catch(error){
  fail(
    'R4.4A Production ownership inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.4A Astro Catalog Static Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.4A Astro Catalog Static Presentation: PASS'
);
console.log(
  '89-product catalog contract / 24-card initial grid / canonical Catalog ViewState + Pricing + Localization build-time ownership / route-scoped covers / direct PDP links / zero-client-JS verified.'
);
console.log('');

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

function stateFromHtml(html){
  const match=
    html.match(
      /<script[^>]*id="catalogRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="catalogRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  if(!match){
    fail(
      'R4.4B Catalog runtime state is missing.'
    );
    return null;
  }

  try{
    return JSON.parse(
      match[1]
    );
  }catch(error){
    fail(
      'R4.4B Catalog runtime state JSON is invalid: '+
      error.message
    );
    return null;
  }
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
      'R4.4B Astro Catalog output is missing.'
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
      'data-catalog-runtime-presentation',
      'data-catalog-section="intro"',
      'data-catalog-section="browse"',
      'data-catalog-section="products"',
      'data-catalog-section="inquiry-cta"',
      'data-catalog-product-grid',
      'data-catalog-search',
      'data-catalog-filter-panel',
      'data-catalog-sort',
      'data-catalog-load-more',
      'data-catalog-empty',
      'id="catalogRuntimeState"',
      'src="/r4-catalog-runtime.js"',
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

    const executableScripts=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(executableScripts.length!==1){
      fail(
        'R4.4B Catalog must contain exactly one executable route runtime; found '+
        executableScripts.length+
        '.'
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
        'R4.4B Catalog expected 89 active products; found '+
        allCount+
        '.'
      );
    }

    const initialIds=[
      ...html.matchAll(
        /data-catalog-product="([A-Z0-9]+)"/g
      )
    ].map(
      match=>match[1]
    );

    if(
      initialIds.length!==24||
      new Set(initialIds).size!==24
    ){
      fail(
        'R4.4B Catalog expected 24 unique static initial cards; found '+
        initialIds.length+
        '.'
      );
    }

    for(const id of initialIds){
      if(
        !html.includes(
          `href="/products/${id}/"`
        )
      ){
        fail(
          'Static Catalog card must preserve a direct MPA PDP link: '+
          id
        );
      }
    }

    if(/\bdisabled(?:=|>|\s)/i.test(html)){
      fail(
        'R4.4B Catalog controls must be active; disabled controls remain in output.'
      );
    }

    const state=
      stateFromHtml(
        html
      );

    if(state){
      if(
        state.version!=='R4.4B'||
        state.defaultLanguage!=='en'||
        state.batchSize!==24||
        state.storage?.languageKey!=='productManualLang'||
        state.storage?.inquiryKey!=='productManualV2State'
      ){
        fail(
          'R4.4B Catalog runtime state contract changed.'
        );
      }

      for(const language of [
        'en',
        'zh',
        'ko'
      ]){
        if(
          !state.languages?.[language]?.catalog||
          !state.languages?.[language]?.navigation||
          !state.languages?.[language]?.footer
        ){
          fail(
            'Catalog runtime state is missing compact language content: '+
            language
          );
        }
      }

      for(const [key,value] of Object.entries({
        series:'series',
        query:'query',
        sizes:'sizes',
        sort:'sort',
        page:'page'
      })){
        if(state.url?.[key]!==value){
          fail(
            'Catalog URL state contract is missing: '+
            key
          );
        }
      }

      if(
        state.products?.length!==89||
        new Set(
          state.products.map(
            product=>product.id
          )
        ).size!==89
      ){
        fail(
          'Catalog runtime state must contain 89 unique compact products.'
        );
      }

      if(
        !Array.isArray(
          state.sizeOptions
        )||
        !state.sizeOptions.length
      ){
        fail(
          'Catalog runtime state is missing size filter options.'
        );
      }

      for(const sort of [
        'featured',
        'name',
        'price-low',
        'price-high',
        'moq-low'
      ]){
        if(!state.sorts?.includes(sort)){
          fail(
            'Catalog runtime state is missing sort: '+
            sort
          );
        }
      }

      for(const product of state.products||[]){
        for(const language of [
          'en',
          'zh',
          'ko'
        ]){
          if(
            !product.names?.[language]||
            !product.seriesLabels?.[language]||
            !product.prices?.[language]
          ){
            fail(
              `Catalog runtime product ${product.id} is missing localized display data for ${language}.`
            );
            break;
          }
        }

        const cover=
          String(
            product.cover||
            ''
          )
            .replace(
              /^\/+/,
              ''
            );

        if(
          !cover||
          !fs.existsSync(
            output(cover)
          )
        ){
          fail(
            'Catalog runtime cover output is missing: '+
            product.id
          );
        }
      }
    }

    const bundle=
      output(
        'r4-catalog-runtime.js'
      );

    if(!fs.existsSync(bundle)){
      fail(
        'R4.4B Catalog runtime bundle output is missing.'
      );
    }else{
      const source=
        fs.readFileSync(
          bundle,
          'utf8'
        );

      for(const marker of [
        'DreamlandDesktopCatalogView',
        'DREAMLAND_R4_CATALOG_RUNTIME_R4_4B',
        "const VERSION='R4.4B';"
      ]){
        if(!source.includes(marker)){
          fail(
            'Catalog runtime bundle is missing: '+
            marker
          );
        }
      }
    }
  }
}catch(error){
  fail(
    'R4.4B output inspection crashed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/astro/pages/products/index.astro'
    );

  for(const pattern of [
    /buildCatalogViewModel/,
    /buildCatalogRuntimeState/,
    /catalogRuntimeState/,
    /r4-catalog-runtime\.js/,
    /languageEnabled=\{true\}/,
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
    /catalogPolicy\s*\.\s*loadMore/,
    /pricingPolicy\s*\.\s*catalogUnit/,
    /pricingPolicy\s*\.\s*productMoq/,
    /localizationPolicy\s*\.\s*localizedContent/,
    /localizationPolicy\s*\.\s*productName/,
    /buildCatalogRuntimeState/
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
        'Catalog build-time ViewModel crossed a boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.4B source inspection crashed: '+
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
      ?.['r4:astro:catalog']!==
    'node scripts/validate-r4-astro-catalog.mjs'
  ){
    fail(
      'package.json lost r4:astro:catalog.'
    );
  }

  if(
    packageJson.scripts
      ?.['r4:astro:catalog-runtime']!==
    'node scripts/validate-r4-astro-catalog-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:catalog-runtime.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  const catalog=
    validate.indexOf(
      'npm run r4:astro:catalog'
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:catalog-runtime'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    catalog<0||
    runtime<=catalog||
    productionHome<=runtime
  ){
    fail(
      'R4.4B Catalog Runtime gate must run after Catalog Presentation and before Production Home contract.'
    );
  }

  const productionBuildSteps=
    String(
      packageJson.scripts?.build||
      ''
    )
      .split(' && ')
      .map(step=>step.trim())
      .filter(Boolean);

  const historicalProductionSteps=[
    'npm run data:build',
    'npm run build:pages',
    'npm run r4:astro:build',
    'npm run r4:production:home',
    'npm run r4:production:catalog',
    'npm run r4:production:pdp',
    'npm run r4:production:custom'
  ];

  let previousProductionStep=-1;

  for(const step of historicalProductionSteps){
    const index=
      productionBuildSteps.indexOf(
        step
      );

    if(
      index<0||
      index<=previousProductionStep
    ){
      fail(
        'catalog must preserve the historical staged Production build order: '+
        step
      );
      break;
    }

    previousProductionStep=index;
  }
}catch(error){
  fail(
    'R4.4B package inspection crashed: '+
    error.message
  );
}

try{
  const promotion=
    read(
      'scripts/r4-promote-astro-home.mjs'
    );

  if(
    promotion.includes(
      'SOURCE_CATALOG'
    )||
    promotion.includes(
      'TARGET_CATALOG'
    )||
    promotion.includes(
      'r4-catalog-runtime.js'
    )
  ){
    fail(
      'R4.4B must not promote Astro Catalog into Production.'
    );
  }
}catch(error){
  fail(
    'R4.4B Production ownership inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.4A/R4.4B Astro Catalog Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.4A/R4.4B Astro Catalog Presentation: PASS'
);
console.log(
  '89-product compact runtime state / 24-card SSR baseline / direct PDP links / EN-ZH-KO build-time display data / canonical Catalog ViewState browser adapter / active controls verified.'
);
console.log('');

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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

function loadJson(relative){
  return JSON.parse(read(relative));
}

function expectFile(relative){
  const file=path.join(OUT,relative);

  if(!fs.existsSync(file)){
    fail('Astro output is missing '+relative+'.');
    return '';
  }

  return fs.readFileSync(file,'utf8');
}

try{
  const packageJson=loadJson('package.json');

  if(packageJson.devDependencies?.astro!=='7.2.10'){
    fail('Astro dependency must stay pinned to 7.2.10.');
  }

  if(
    packageJson.scripts?.build!==
    "npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:pdp && npm run r4:production:custom && npm run r4:production:home:validate && npm run r4:production:catalog:validate && npm run r4:production:pdp:validate && npm run r4:production:custom:validate"
  ){
    fail(
      'R4.6C Production build must promote Astro Home + Catalog + PDP + Custom as staged route owners after the Legacy route build.'
    );
  }

  if(
    packageJson.scripts?.['r4:astro:build']!==
    'astro build --config astro.config.mjs && node scripts/r4-copy-astro-home-assets.mjs && node scripts/r4-copy-astro-catalog-assets.mjs && node scripts/r4-copy-astro-pdp-assets.mjs && node scripts/r4-copy-astro-custom-assets.mjs'
  ){
    fail('R4 Astro build/copy contract is missing.');
  }

  const validate=
    String(
      packageJson.scripts?.validate||
      ''
    );

  if(
    !validate.includes('npm run r4:astro:foundation')||
    !validate.includes('npm run r4:astro:home')
  ){
    fail(
      'Main validation chain must include Astro foundation and Home gates.'
    );
  }

  const config=read('astro.config.mjs');

  for(const marker of [
    "output:'static'",
    "srcDir:'./src/astro'",
    "outDir:'./.r4-astro-dist'"
  ]){
    if(!config.includes(marker)){
      fail('Astro config is missing '+marker+'.');
    }
  }

  const legacyBuild=
    read('scripts/build-pages.mjs');

  if(!legacyBuild.includes("path.join(ROOT,'dist')")){
    fail(
      'Legacy Production builder changed unexpectedly during R4.3A.'
    );
  }

  const home=expectFile('index.html');

  if(
    !home.includes(
      'data-r4-astro-home="true"'
    )
  ){
    fail(
      'Astro Home output is missing the R4.3A migration marker.'
    );
  }

  const catalog=
    expectFile(
      path.join(
        'products',
        'index.html'
      )
    );

  if(
    !catalog.includes(
      'data-r4-astro-foundation="true"'
    )
  ){
    fail(
      'Catalog compatibility foundation marker was lost during R4.4A.'
    );
  }

  const catalogExecutableScripts=[
    ...catalog.matchAll(
      /<script\b(?![^>]*type="application\/json")[^>]*>/gi
    )
  ];

  if(
    catalogExecutableScripts.length!==1||
    !catalog.includes(
      'src="/r4-catalog-runtime.js"'
    )||
    !catalog.includes(
      'id="catalogRuntimeState"'
    )
  ){
    fail(
      'R4.4B Catalog foundation must expose exactly one dedicated route runtime plus non-executable state.'
    );
  }

  const products=
    loadJson('data/products.json')
      .products
      .filter(
        product=>
          product?.status==='active'
      );

  if(products.length!==89){
    fail(
      'R4 foundation expected 89 active products; found '+
      products.length+
      '.'
    );
  }

  for(const product of products){
    const productId=
      String(
        product?.productId||
        product?.id||
        ''
      )
        .trim()
        .toUpperCase();

    const html=
      expectFile(
        path.join(
          'products',
          productId,
          'index.html'
        )
      );

    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-product="true"',
      'data-r4-pdp-static="true"',
      `data-product-id="${productId}"`
    ]){
      if(
        html&&
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.5A Product output marker mismatch for '+
          productId+
          ': '+
          marker
        );
      }
    }

    if(html){
      const productExecutableScripts=[
        ...html.matchAll(
          /<script\b(?![^>]*type="application\/json")[^>]*>/gi
        )
      ];

      if(
        productExecutableScripts.length!==1||
        !html.includes(
          'src="/r4-pdp-runtime.js"'
        )||
        !html.includes(
          'id="pdpRuntimeState"'
        )
      ){
        fail(
          'R4.5B Product presentation must expose exactly one dedicated PDP runtime plus non-executable state: '+
          productId+
          '.'
        );
      }
    }
  }

  const custom=
    expectFile(
      path.join(
        'custom',
        'index.html'
      )
    );

  if(custom){
    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-custom="true"',
      'data-r4-custom-static="true"',
      'data-custom-runtime-presentation'
    ]){
      if(
        !custom.includes(
          marker
        )
      ){
        fail(
          'R4.6A Custom output marker mismatch: '+
          marker
        );
      }
    }

    const customExecutableScripts=[
      ...custom.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(
      customExecutableScripts.length!==1||
      !custom.includes(
        'src="/r4-custom-runtime.js"'
      )||
      !custom.includes(
        'id="customRuntimeState"'
      )
    ){
      fail(
        'R4.6B Custom presentation must expose exactly one dedicated route runtime plus non-executable state.'
      );
    }
  }

  const routes=loadJson('data/page-routes.json');

  if(
    routes.routes?.home?.path!=='/'||
    routes.routes?.catalog?.path!=='/products/'||
    routes.routes?.product?.path!==
      '/products/{productId}/'||
    routes.routes?.custom?.path!==
      '/custom/'
  ){
    fail(
      'Existing route contract changed during R4.3A.'
    );
  }

  for(const workflow of [
    '.github/workflows/quality-check.yml',
    '.github/workflows/sync-products-json.yml'
  ]){
    if(
      !read(workflow)
        .includes('run: npm ci')
    ){
      fail(
        workflow+
        ' must install pinned project dependencies.'
      );
    }
  }
}catch(error){
  fail(
    'R4 Astro foundation validation crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.1/R4.3A Astro foundation: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.1/R4.3A Astro foundation: PASS'
);
console.log(
  'Custom has graduated to the R4.6C Production Astro owner; Home, Catalog and PDP remain Production Astro owners.'
);
console.log('');

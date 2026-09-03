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
    "npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:home:validate"
  ){
    fail(
      'R4.3C Production build must promote only the Astro Home after the Legacy route build.'
    );
  }

  if(
    packageJson.scripts?.['r4:astro:build']!==
    'astro build --config astro.config.mjs && node scripts/r4-copy-astro-home-assets.mjs && node scripts/r4-copy-astro-catalog-assets.mjs'
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

  if(/<script\b/i.test(catalog)){
    fail(
      'R4.4A Catalog presentation must remain zero-client-JS.'
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

    if(
      html&&
      !html.includes(
        `data-product-id="${productId}"`
      )
    ){
      fail(
        'Product output marker mismatch for '+
        productId+
        '.'
      );
    }

    if(
      html&&
      /<script\b/i.test(html)
    ){
      fail(
        'Product foundation output must remain zero-client-JS: '+
        productId+
        '.'
      );
    }
  }

  const routes=loadJson('data/page-routes.json');

  if(
    routes.routes?.home?.path!=='/'||
    routes.routes?.catalog?.path!=='/products/'||
    routes.routes?.product?.path!==
      '/products/{productId}/'
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
  'PDP foundation remains static; Home is Production Astro and Catalog has graduated to the R4.4A static presentation.'
);
console.log('');

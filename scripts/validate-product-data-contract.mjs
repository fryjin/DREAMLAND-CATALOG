#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';

const ROOT=process.cwd();

await import(
  '../src/data/product-data-contract.js'
);

const contract=
  globalThis.DreamlandProductDataContract;

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relativePath){
  return fs.readFileSync(
    path.join(ROOT,relativePath),
    'utf8'
  );
}

if(!contract){
  fail(
    'src/data/product-data-contract.js did not expose DreamlandProductDataContract.'
  );
}

if(contract){
  const expectedFunctions=[
    'parseCsvDocument',
    'parseCsv',
    'validateProductSource',
    'applyProductOverrides',
    'mapCsvProduct',
    'mapProductRecords',
    'activeProducts',
    'buildProductFallbackDocument'
  ];

  for(const name of expectedFunctions){
    if(typeof contract[name]!=='function'){
      fail(
        `Shared contract export is missing: ${name}`
      );
    }
  }
}

try{
  const csvText=
    read('data/products.csv');

  const generated=
    contract
      .buildProductFallbackDocument(
        csvText
      );

  const existing=
    JSON.parse(
      read('data/products.json')
    );

  if(
    !isDeepStrictEqual(
      existing,
      generated
    )
  ){
    fail(
      'data/products.json does not match the shared product contract.'
    );
  }

  if(
    generated.products.some(
      product=>
        product.status!=='active'
    )
  ){
    fail(
      'Shared product contract emitted a non-active fallback product.'
    );
  }
}catch(error){
  fail(
    `Shared contract data check failed: ${error.message}`
  );
}

try{
  const catalogSource=
    read('catalog-data.js');

  if(
    !catalogSource.includes(
      'DreamlandProductDataContract'
    )
  ){
    fail(
      'catalog-data.js does not consume the shared product data contract.'
    );
  }

  const forbiddenDuplicates=[
    'const PRODUCT_NAME_OVERRIDES',
    'function mapCsvProduct(',
    'function parseCsv('
  ];

  for(const marker of forbiddenDuplicates){
    if(catalogSource.includes(marker)){
      fail(
        `catalog-data.js still duplicates shared product logic: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `catalog-data.js contract inspection failed: ${error.message}`
  );
}

try{
  const buildSource=
    read('scripts/build-data.mjs');

  if(
    !buildSource.includes(
      '../src/data/product-data-contract.js'
    )
  ){
    fail(
      'build-data.mjs does not load the shared product data contract.'
    );
  }

  const forbiddenDuplicates=[
    'const IMAGE_FIELDS',
    'const REQUIRED_COLUMNS',
    'const PRODUCT_NAME_OVERRIDES',
    'function mapCsvProduct(',
    'function parseCsv('
  ];

  for(const marker of forbiddenDuplicates){
    if(buildSource.includes(marker)){
      fail(
        `build-data.mjs still duplicates shared product logic: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `build-data.mjs contract inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read('index.html');

  const contractTag=
    '<script src="./src/data/product-data-contract.js"></script>';

  const catalogTag=
    '<script src="./catalog-data.js"></script>';

  const contractIndex=
    indexSource.indexOf(
      contractTag
    );

  const catalogIndex=
    indexSource.indexOf(
      catalogTag
    );

  if(contractIndex<0){
    fail(
      'index.html is missing the product data contract script tag.'
    );
  }

  if(catalogIndex<0){
    fail(
      'index.html is missing catalog-data.js.'
    );
  }

  if(
    contractIndex>=0&&
    catalogIndex>=0&&
    contractIndex>catalogIndex
  ){
    fail(
      'index.html loads the product data contract after catalog-data.js.'
    );
  }
}catch(error){
  fail(
    `index.html contract order inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read('sw.js');

  if(
    !swSource.includes(
      "'./src/data/product-data-contract.js'"
    )
  ){
    fail(
      'sw.js APP_SHELL does not include the shared product data contract.'
    );
  }
}catch(error){
  fail(
    `sw.js contract cache inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nProduct data contract validation failed:\n'
  );

  errors.forEach(error=>{
    console.error(
      `- ${error}`
    );
  });

  process.exit(1);
}

console.log(
  'Product data contract validation: PASS'
);

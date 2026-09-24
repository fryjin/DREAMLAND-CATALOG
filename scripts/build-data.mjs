#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';

await import(
  '../src/data/product-data-contract.js'
);

const contract=
  globalThis.DreamlandProductDataContract;

if(!contract){
  console.error(
    '[build-data] Shared product data contract failed to initialize.'
  );
  process.exit(1);
}

const ROOT=process.cwd();
const SOURCE_PATH=
  path.join(
    ROOT,
    'data',
    'products.csv'
  );
const OUTPUT_PATH=
  path.join(
    ROOT,
    'data',
    'products.json'
  );

function fail(message){
  console.error(
    `[build-data] ${message}`
  );
  process.exitCode=1;
}

function readExistingJson(){
  if(!fs.existsSync(OUTPUT_PATH)){
    return null;
  }

  try{
    return JSON.parse(
      fs.readFileSync(
        OUTPUT_PATH,
        'utf8'
      )
    );
  }catch(error){
    throw new Error(
      `Cannot parse data/products.json: ${error.message}`
    );
  }
}

function changedProductIds(
  existing,
  generated
){
  const before=new Map(
    (existing?.products||[])
      .map(
        product=>[
          product.id,
          product
        ]
      )
  );

  const after=new Map(
    (generated?.products||[])
      .map(
        product=>[
          product.id,
          product
        ]
      )
  );

  const ids=new Set([
    ...before.keys(),
    ...after.keys()
  ]);

  return [...ids]
    .filter(
      id=>
        !isDeepStrictEqual(
          before.get(id),
          after.get(id)
        )
    );
}

function usage(){
  console.log(`Usage:
  node scripts/build-data.mjs --check
  node scripts/build-data.mjs --write

--check  Verify data/products.json is exactly the active-only fallback
         derivable from data/products.csv through the shared product contract.
--write  Regenerate the active-only fallback when semantic content differs.`);
}

const args=
  new Set(
    process.argv.slice(2)
  );

if(
  args.has('--help')||
  args.has('-h')
){
  usage();
  process.exit(0);
}

const mode=
  args.has('--write')
    ? 'write'
    : 'check';

try{
  const csvText=
    fs.readFileSync(
      SOURCE_PATH,
      'utf8'
    );

  const generated=
    contract
      .buildProductFallbackDocument(
        csvText
      );

  const existing=
    readExistingJson();

  if(
    existing&&
    isDeepStrictEqual(
      existing,
      generated
    )
  ){
    console.log(
      `[build-data] OK: products.json is in sync with the shared `+
      `product contract (${generated.products.length} active fallback products).`
    );

    process.exit(0);
  }

  const changedIds=
    changedProductIds(
      existing,
      generated
    );

  const summary=
    changedIds.length
      ? (
          ` Changed products: `+
          `${changedIds.slice(0,20).join(', ')}`+
          (
            changedIds.length>20
              ? ` (+${changedIds.length-20} more)`
              : ''
          )+
          '.'
        )
      : '';

  if(mode==='check'){
    fail(
      `data/products.json is not the active-only fallback generated `+
      `from data/products.csv through the shared contract.${summary} `+
      `Run "npm run data:build" or use the GitHub sync workflow.`
    );
  }else{
    fs.writeFileSync(
      OUTPUT_PATH,
      `${JSON.stringify(generated,null,2)}\n`,
      'utf8'
    );

    console.log(
      `[build-data] Wrote active-only data/products.json through the `+
      `shared product contract (${generated.products.length} products).${summary}`
    );
  }
}catch(error){
  fail(
    error?.message||
    String(error)
  );
}

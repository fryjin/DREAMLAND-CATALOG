#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  '..'
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
  ).replace(
    /\r\n?/g,
    '\n'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

await import(
  '../src/data/product-data-contract.js'
);

const productContract=
  globalThis
    .DreamlandProductDataContract;

const {
  COPY_STATUSES,
  COLOR_STORY_KINDS,
  SUPPORTED_LOCALES,
  approvedLocalizedCopy,
  colorStoryEntry,
  colorStoryFor,
  scentStandardFor,
  quantityRule,
  validatePdpContentDocument
}=
  await import(
    '../src/data/pdp-content-contract.mjs'
  );

if(!productContract){
  fail(
    'DreamlandProductDataContract is unavailable.'
  );
}

let content=null;
let products=null;
let seriesDocument=null;
let scentRows=[];

try{
  content=
    json(
      'data/pdp-content.json'
    );

  products=
    json(
      'data/products.json'
    );

  seriesDocument=
    json(
      'data/series.json'
    );

  scentRows=
    productContract
      .parseCsvDocument(
        read(
          'data/scents.csv'
        ),
        {
          strict:true
        }
      )
      .records;
}catch(error){
  fail(
    'PDP-COPY-1A data read failed: '+
    error.message
  );
}

if(
  content&&
  products&&
  seriesDocument
){
  const active=
    Array.isArray(
      products.products
    )
      ? products.products.filter(
          product=>
            product?.status===
            'active'
        )
      : [];

  if(active.length!==89){
    fail(
      'PDP-COPY-1A expects 89 active products; found '+
      active.length+
      '.'
    );
  }

  const contractErrors=
    validatePdpContentDocument(
      content,
      {
        activeProductIds:
          active.map(
            product=>
              product.id
          ),
        scentRows,
        seriesDocument
      }
    );

  for(const error of contractErrors){
    fail(error);
  }

  if(
    JSON.stringify(
      COPY_STATUSES
    )!==
    JSON.stringify([
      'pending-review',
      'approved'
    ])
  ){
    fail(
      'Copy status contract changed.'
    );
  }

  if(
    JSON.stringify(
      COLOR_STORY_KINDS
    )!==
    JSON.stringify([
      'story',
      'placeholder'
    ])
  ){
    fail(
      'Color Story kind contract changed.'
    );
  }

  if(
    JSON.stringify(
      SUPPORTED_LOCALES
    )!==
    JSON.stringify([
      'zh',
      'en',
      'ko'
    ])
  ){
    fail(
      'PDP content locale contract changed.'
    );
  }

  const storyEntries=
    Object.entries(
      content.colorStories||
      {}
    );

  if(storyEntries.length!==89){
    fail(
      'colorStories must contain exactly 89 product entries.'
    );
  }

  let storyCount=0;
  let placeholderCount=0;

  for(const [
    productId,
    rawEntry
  ] of storyEntries){
    const entry=
      colorStoryEntry(
        content,
        productId
      );

    if(!entry){
      fail(
        productId+
        ' Color Story cannot be resolved.'
      );
      continue;
    }

    if(
      rawEntry?.status!==
        'approved'
    ){
      fail(
        productId+
        ' Color Story must be approved after PDP-COPY-1A.3.'
      );
    }

    if(
      [
        'zh',
        'en',
        'ko'
      ].some(
        locale=>
          !String(
            rawEntry?.copy
              ?.[locale]||
            ''
          ).trim()
      )
    ){
      fail(
        productId+
        ' approved Color Story must contain zh/en/ko.'
      );
    }

    if(
      !colorStoryFor(
        content,
        productId,
        'zh'
      )
    ){
      fail(
        productId+
        ' approved Color Story is unavailable through colorStoryFor().'
      );
    }

    if(
      entry.kind===
        'placeholder'
    ){
      placeholderCount++;
    }else{
      storyCount++;
    }
  }

  if(
    storyCount!==73||
    placeholderCount!==16
  ){
    fail(
      'Expected 73 approved stories + 16 approved placeholders; found '+
      storyCount+
      ' + '+
      placeholderCount+
      '.'
    );
  }

  for(const seriesId of [
    'classic',
    'advanced',
    'masterpiece'
  ]){
    const standard=
      scentStandardFor(
        content,
        seriesId
      );

    if(!standard){
      fail(
        'Missing scent standard: '+
        seriesId
      );
      continue;
    }

    if(
      standard.helperCopy.status!==
        'approved'
    ){
      fail(
        seriesId+
        ' Scent helper copy must be approved.'
      );
    }

    if(
      !approvedLocalizedCopy(
        standard.helperCopy,
        'zh'
      )
    ){
      fail(
        seriesId+
        ' approved Scent helper copy is unavailable.'
      );
    }
  }

  const rule=
    quantityRule(
      content
    );

  if(
    rule.helperCopy.status!==
      'approved'
  ){
    fail(
      'Quantity helper copy must be approved.'
    );
  }

  if(
    !approvedLocalizedCopy(
      rule.helperCopy,
      'zh'
    )
  ){
    fail(
      'Approved Quantity helper copy is unavailable.'
    );
  }

  const facts={
    classic:{
      supplierZh:
        '上海依克塞汀香薰香精',
      supplierEn:
        'Shanghai Excitin Fragrance',
      ratio:'5%'
    },
    advanced:{
      supplierZh:
        '法国 Robertet Group 进口香薰香精',
      supplierEn:
        'Robertet Group Imported Fragrance',
      ratio:'8%'
    },
    masterpiece:{
      supplierZh:
        '美国 CandleScience 进口香薰精油',
      supplierEn:
        'CandleScience Imported Fragrance Oil',
      ratio:'10%'
    }
  };

  for(const [
    seriesId,
    expected
  ] of Object.entries(
    facts
  )){
    const standard=
      scentStandardFor(
        content,
        seriesId
      );

    if(
      standard?.supplier?.zh!==
        expected.supplierZh||
      standard?.supplier?.en!==
        expected.supplierEn||
      standard?.fragranceRatio!==
        expected.ratio
    ){
      fail(
        seriesId+
        ' canonical Scent Standard facts changed.'
      );
    }
  }
}

/* PDP-COPY-1B: data gate remains authoritative after presentation wiring. */

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:pdp:copy-content-contract']!==
    'node scripts/validate-pdp-copy-1a-content-data-contract.mjs'
  ){
    fail(
      'package.json is missing r4:pdp:copy-content-contract.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const dataIndex=
    validate.indexOf(
      'npm run data:contract'
    );

  const contractIndex=
    validate.indexOf(
      'npm run r4:pdp:copy-content-contract'
    );

  const approvedIndex=
    validate.indexOf(
      'npm run r4:pdp:copy-approved-content'
    );

  const frontendIndex=
    validate.indexOf(
      'npm run frontend:foundation'
    );

  if(
    dataIndex<0||
    contractIndex<=dataIndex||
    approvedIndex<=contractIndex||
    frontendIndex<=approvedIndex
  ){
    fail(
      'PDP copy gates must run after data:contract and before frontend:foundation.'
    );
  }
}catch(error){
  fail(
    'PDP-COPY-1A package inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND PDP-COPY-1A CONTENT / DATA CONTRACT: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+
      error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND PDP-COPY-1A CONTENT / DATA CONTRACT: PASS'
);
console.log(
  '89 approved presentation entries / 3 approved Scent helpers / approved Quantity helper are structurally valid; UI wiring is validated separately by PDP-COPY-1B.'
);
console.log('');

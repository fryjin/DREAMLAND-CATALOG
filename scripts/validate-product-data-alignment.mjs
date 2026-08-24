#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message){
  console.error(`[B6-04.1] ${message}`);
  process.exitCode=1;
}

const contractPath=
  path.join(
    ROOT,
    'src',
    'data',
    'product-data-contract.js'
  );

await import(
  `${pathToFileURL(contractPath).href}?b6041=${Date.now()}`
);

const contract=
  globalThis.DreamlandProductDataContract;

if(!contract){
  throw new Error(
    '[B6-04.1] Shared product data contract failed to initialize.'
  );
}

const csvPath=
  path.join(
    ROOT,
    'data',
    'products.csv'
  );
const jsonPath=
  path.join(
    ROOT,
    'data',
    'products.json'
  );
const seriesPath=
  path.join(
    ROOT,
    'data',
    'series.json'
  );

const csvText=
  fs.readFileSync(
    csvPath,
    'utf8'
  );

const {
  headers,
  records
}=
  contract.parseCsvDocument(
    csvText,
    {strict:true}
  );

contract.validateProductSource(
  headers,
  records
);

const active=
  records.filter(
    row=>
      String(row.status||'')
        .trim()
        .toLowerCase()==='active'
  );

const activeIds=
  new Set(
    active.map(
      row=>row.product_id
    )
  );

const requiredMpcIds=[
  ...Array.from(
    {length:34},
    (_,index)=>
      `MPC${String(index+1).padStart(3,'0')}`
  ),
  'MPC036',
  'MPC037',
  'MPC038',
  'MPC039',
  'MPC040',
  'MPC041',
  'MPC042',
  'MPC043',
  'MPC044',
  'MPC048',
  'MPC049',
  'MPC050'
];

for(const id of requiredMpcIds){
  if(!activeIds.has(id)){
    fail(
      `${id} must be active after B6-04.1.`
    );
  }
}

const unresolvedMustRemainOffline=[
  'MPC035',
  'MPC045',
  'MPC046',
  'MPC047',
  'MPC051',
  'MPC052',
  'MPC053',
  'MPC054',
  'MPC055',
  'MPC056',
  'MPC057',
  'MPC058',
  'MPC059',
  'MPC060',
  'MPC061',
  'MPC062',
  'MPC063',
  'MPC064',
  'MPC065',
  'MPC066',
  'MPC067',
  'MPC068',
  'MPC069',
  'MPC070',
  'MPC071',
  'MPC072'
];

for(const id of unresolvedMustRemainOffline){
  if(activeIds.has(id)){
    fail(
      `${id} is unresolved and must remain non-active.`
    );
  }
}

const placeholderPattern=
  /(placeholder|占位|자리표시자)/i;

const generatedSuffixPattern=
  /\s+\d+\s*$/;

const imageFields=
  contract.IMAGE_FIELDS||[];

const normalizeAssetPath=value=>
  String(value||'')
    .trim()
    .replace(/^\.\//,'');

for(const row of active){
  for(
    const field of [
      'name_zh',
      'name_en',
      'name_ko'
    ]
  ){
    if(!String(row[field]||'').trim()){
      fail(
        `${row.product_id}.${field} is empty.`
      );
    }
  }

  const searchable=[
    row.name_zh,
    row.name_en,
    row.name_ko,
    row.short_desc_zh,
    row.short_desc_en,
    row.short_desc_ko
  ].join(' ');

  if(
    placeholderPattern.test(
      searchable
    )
  ){
    fail(
      `${row.product_id} still contains placeholder copy while active.`
    );
  }

  if(
    row.product_id.startsWith('MPC')&&
    (
      generatedSuffixPattern.test(
        String(row.name_zh||'')
      )||
      generatedSuffixPattern.test(
        String(row.name_en||'')
      )||
      generatedSuffixPattern.test(
        String(row.name_ko||'')
      )
    )
  ){
    fail(
      `${row.product_id} still contains a generated numeric name suffix.`
    );
  }

  if(
    !String(
      row.cover_image||''
    ).trim()
  ){
    fail(
      `${row.product_id} is active but cover_image is empty.`
    );
  }

  for(const field of imageFields){
    const raw=
      String(
        row[field]||''
      ).trim();

    if(!raw){
      continue;
    }

    const normalized=
      normalizeAssetPath(
        raw
      );
    const expectedPrefix=
      `images/products/${row.product_id}/`;

    if(
      !normalized.startsWith(
        expectedPrefix
      )
    ){
      fail(
        `${row.product_id}.${field} must point to its own product directory.`
      );
      continue;
    }

    if(
      !fs.existsSync(
        path.join(
          ROOT,
          normalized
        )
      )
    ){
      fail(
        `${row.product_id}.${field} points to a missing file: ${raw}`
      );
    }
  }
}

const seriesData=
  JSON.parse(
    fs.readFileSync(
      seriesPath,
      'utf8'
    )
  );

for(
  const [
    seriesId,
    meta
  ] of Object.entries(
    seriesData.series||{}
  )
){
  const actual=
    active.filter(
      row=>
        row.series===seriesId
    ).length;

  if(
    Number(meta.count)!==actual
  ){
    fail(
      `${seriesId} count=${meta.count}, active CSV rows=${actual}.`
    );
  }
}

const jsonData=
  JSON.parse(
    fs.readFileSync(
      jsonPath,
      'utf8'
    )
  );

if(
  !Array.isArray(
    jsonData.products
  )
){
  fail(
    'data/products.json must contain a products array.'
  );
}else{
  const jsonIds=
    jsonData.products.map(
      product=>product.id
    );
  const csvActiveIds=
    active.map(
      row=>row.product_id
    );

  if(
    JSON.stringify(jsonIds)!==
    JSON.stringify(csvActiveIds)
  ){
    fail(
      'data/products.json is not synchronized with active CSV rows. Run npm run data:build.'
    );
  }
}

const masterpieceCount=
  active.filter(
    row=>
      row.series==='masterpiece'
  ).length;

if(masterpieceCount!==46){
  fail(
    `Expected 46 active Masterpiece products, got ${masterpieceCount}.`
  );
}

if(active.length!==89){
  fail(
    `Expected 89 total active products, got ${active.length}.`
  );
}

if(!process.exitCode){
  console.log(
    '[B6-04.1] Product data alignment validation passed: 89 active / 46 Masterpiece.'
  );
}

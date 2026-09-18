#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  '..'
);

const EXPECTED_DIGEST='a71e3b4d8ecda866cd913d3028ccbc2382d627fa4eee64dd593d885ba8bd0aa9';

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

function stable(value){
  if(
    value===null||
    typeof value!=='object'
  ){
    return JSON.stringify(
      value
    );
  }

  if(Array.isArray(value)){
    return '['+
      value.map(stable).join(',')+
      ']';
  }

  return '{'+
    Object.keys(value)
      .sort()
      .map(
        key=>
          JSON.stringify(key)+
          ':'+
          stable(
            value[key]
          )
      )
      .join(',')+
    '}';
}

function digest(value){
  return crypto
    .createHash('sha256')
    .update(
      stable(value),
      'utf8'
    )
    .digest('hex');
}

const content=
  json(
    'data/pdp-content.json'
  );

if(
  content.revision!==
    'PDP-COPY-1A.3'
){
  fail(
    'Approved content revision must be PDP-COPY-1A.3.'
  );
}

if(
  content.approval?.state!==
    'approved-with-holiday-placeholders'||
  Number(
    content.approval?.storyCount
  )!==73||
  Number(
    content.approval?.placeholderCount
  )!==16
){
  fail(
    'Approved content summary must remain 73 stories + 16 Holiday placeholders.'
  );
}

const storyEntries=
  Object.entries(
    content.colorStories||
    {}
  );

const approvedStories=
  storyEntries.filter(
    ([,entry])=>
      entry?.kind==='story'&&
      entry?.status==='approved'
  );

const placeholders=
  storyEntries.filter(
    ([,entry])=>
      entry?.kind==='placeholder'&&
      entry?.status==='approved'
  );

if(
  storyEntries.length!==89||
  approvedStories.length!==73||
  placeholders.length!==16
){
  fail(
    'Approved Color Story status/kind counts changed.'
  );
}

const holidayIds=
  ["HOL001", "HOL002", "HOL003", "HOL004", "HOL005", "HOL006", "HOL007", "HOL008", "HOL009", "HOL010", "HOL011", "HOL012", "HOL013", "HOL014", "HOL015", "HOL016"];

const actualPlaceholderIds=
  placeholders
    .map(
      ([id])=>id
    )
    .sort();

if(
  JSON.stringify(
    actualPlaceholderIds
  )!==
  JSON.stringify(
    [...holidayIds].sort()
  )
){
  fail(
    'Only Holiday products may use placeholder Color Story copy.'
  );
}

const holidayCopy={
  zh:'色彩故事整理中。',
  en:'Color story coming soon.',
  ko:'컬러 스토리를 준비 중입니다.'
};

for(const id of holidayIds){
  const entry=
    content.colorStories?.[id];

  if(
    JSON.stringify(
      entry?.copy
    )!==
    JSON.stringify(
      holidayCopy
    )
  ){
    fail(
      id+
      ' Holiday placeholder copy changed.'
    );
  }
}

const reuseMap=
  {"MPC036": "ADV016", "MPC037": "ADV001", "MPC038": "ADV002", "MPC039": "ADV003", "MPC040": "ADV004", "MPC041": "ADV017", "MPC042": "ADV018", "MPC043": "ADV019", "MPC044": "ADV013", "MPC048": "ADV009", "MPC049": "ADV008", "MPC050": "ADV014"};

for(const [
  productId,
  sourceProductId
] of Object.entries(
  reuseMap
)){
  const entry=
    content.colorStories
      ?.[productId];

  const source=
    content.colorStories
      ?.[sourceProductId];

  if(
    entry?.sourceProductId!==
      sourceProductId||
    !source||
    JSON.stringify(
      entry.copy
    )!==
    JSON.stringify(
      source.copy
    )
  ){
    fail(
      productId+
      ' must reuse approved Color Story copy from '+
      sourceProductId+
      '.'
    );
  }
}

const expectedScent={
  classic:{
    zh:'上海依克塞汀 品牌香精 · 底模添加约 5%',
    en:'Shanghai Excitin branded fragrance · approx. 5% in base wax',
    ko:'Shanghai Excitin 브랜드 향료 · 베이스 왁스 약 5%'
  },
  advanced:{
    zh:'法国 Robertet Group 进口香精 · 底模添加约 8%',
    en:'French Robertet Group imported fragrance · approx. 8% in base wax',
    ko:'프랑스 Robertet Group 수입 향료 · 베이스 왁스 약 8%'
  },
  masterpiece:{
    zh:'美国 CandleScience 专业香精 · 底模添加约 10%',
    en:'U.S. CandleScience professional fragrance · approx. 10% in base wax',
    ko:'미국 CandleScience 전문 향료 · 베이스 왁스 약 10%'
  }
};

for(const [
  seriesId,
  expected
] of Object.entries(
  expectedScent
)){
  const helper=
    content.scentStandards
      ?.[seriesId]
      ?.helperCopy;

  if(
    helper?.status!==
      'approved'||
    JSON.stringify(
      helper?.copy
    )!==
    JSON.stringify(
      expected
    )
  ){
    fail(
      seriesId+
      ' approved Scent helper copy changed.'
    );
  }
}

const expectedQuantity={
  zh:'同系列 · 同尺寸可混款计起订量',
  en:'Mix styles within the same series and size to meet MOQ.',
  ko:'동일 시리즈·동일 사이즈 내 여러 스타일을 합산해 MOQ를 충족할 수 있습니다.'
};

if(
  content.quantityHelper
    ?.helperCopy
    ?.status!==
      'approved'||
  JSON.stringify(
    content.quantityHelper
      ?.helperCopy
      ?.copy
  )!==
  JSON.stringify(
    expectedQuantity
  )
){
  fail(
    'Approved Quantity helper copy changed.'
  );
}

const copyPayload={
  colorStories:
    content.colorStories,
  scentHelperCopy:
    Object.fromEntries(
      [
        'classic',
        'advanced',
        'masterpiece'
      ].map(
        seriesId=>[
          seriesId,
          content.scentStandards
            ?.[seriesId]
            ?.helperCopy
            ?.copy
        ]
      )
    ),
  quantityHelperCopy:
    content.quantityHelper
      ?.helperCopy
      ?.copy
};

const actualDigest=
  digest(
    copyPayload
  );

if(
  content.approval
    ?.copyDigest!==
    EXPECTED_DIGEST||
  actualDigest!==
    EXPECTED_DIGEST
){
  fail(
    'Approved PDP copy digest changed. Expected '+
    EXPECTED_DIGEST+
    '; found '+
    actualDigest+
    '.'
  );
}

/* PDP-COPY-1B: data gate remains authoritative after presentation wiring. */

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:pdp:copy-approved-content']!==
    'node scripts/validate-pdp-copy-1a3-approved-content-update.mjs'
  ){
    fail(
      'package.json is missing r4:pdp:copy-approved-content.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
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
    contractIndex<0||
    approvedIndex<=contractIndex||
    frontendIndex<=approvedIndex
  ){
    fail(
      'Approved Content gate must run after Content Contract and before frontend:foundation.'
    );
  }
}catch(error){
  fail(
    'PDP-COPY-1A.3 package inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND PDP-COPY-1A.3 APPROVED CONTENT UPDATE: FAIL'
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
  'DREAMLAND PDP-COPY-1A.3 APPROVED CONTENT UPDATE: PASS'
);
console.log(
  '73 finalized Color Stories + 16 Holiday placeholders + 3 Scent helpers + Quantity helper are approved and digest-locked; UI wiring is validated separately by PDP-COPY-1B.'
);
console.log('');

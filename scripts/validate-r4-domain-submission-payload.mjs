#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
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

function compact(value){
  return String(
    value||
    ''
  ).replace(
    /\s+/g,
    ''
  );
}

function functionSlice(
  source,
  name,
  nextName
){
  const start=
    source.indexOf(
      'function '+
      name+
      '('
    );

  const end=
    source.indexOf(
      'function '+
      nextName+
      '(',
      start+1
    );

  if(
    start<0||
    end<=start
  ){
    return '';
  }

  return source.slice(
    start,
    end
  );
}

try{
  delete globalThis
    .DreamlandSubmissionPayload;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/submission/runtime-submission-payload.js'
      )
    ).href+
    '?r4-domain-submission-payload='+
    Date.now()
  );

  const policy=
    globalThis
      .DreamlandSubmissionPayload;

  if(
    !policy||
    policy.version!=='R4.2B'
  ){
    fail(
      'DreamlandSubmissionPayload R4.2B was not exposed.'
    );
  }else{
    for(const method of [
      'emailValid',
      'validate',
      'build'
    ]){
      if(
        typeof policy[method]!==
        'function'
      ){
        fail(
          'DreamlandSubmissionPayload.'+
          method+
          ' is missing.'
        );
      }
    }

    const contact={
      name:'Ada Buyer',
      company:'Dreamland Buyer Co.',
      country:'SG',
      city:'Singapore',
      email:'ada@example.com',
      phone:'+65 12345678',
      buyerType:'品牌方',
      message:'Please quote.'
    };

    const projection={
      inquiryId:
        'DL-20260902-ABC123',
      submittedAt:
        '2026-09-02T07:00:00.000Z',
      privacyVersion:
        '2026-09',
      contact,
      language:'en',
      estimatedTotalDisplay:
        'USD 123.45',
      estimatedTotal:
        123.45,
      productCount:1,
      customCount:1,
      itemsSummary:
        'Product line\nCustom line',
      rawProductItems:[
        {
          id:'p1',
          qty:20
        }
      ],
      rawCustomItems:[
        {
          id:'c1',
          use:'品牌活动'
        }
      ]
    };

    const payload=
      policy.build(
        projection
      );

    const expectedKeys=[
      'subject',
      'from_name',
      'email',
      'inquiry_id',
      'submitted_at',
      'privacy_version',
      'privacy_accepted',
      'contact_name',
      'company',
      'country_or_region',
      'city',
      'email_address',
      'phone_or_wechat',
      'buyer_type',
      'message',
      'personal_info',
      'language',
      'estimated_amount',
      'estimated_amount_base_usd',
      'product_count',
      'custom_count',
      'items_summary',
      'product_items',
      'custom_items'
    ];

    if(
      Object.keys(payload)
        .join('|')!==
      expectedKeys
        .join('|')
    ){
      fail(
        'Submission delivery payload key contract changed.'
      );
    }

    if(
      payload.subject!==
        '[DL-20260902-ABC123] DREAMLAND 批发与定制询价 - Ada Buyer'||
      payload.from_name!==
        'Ada Buyer'||
      payload.email!==
        'ada@example.com'||
      payload.inquiry_id!==
        projection.inquiryId||
      payload.submitted_at!==
        projection.submittedAt||
      payload.privacy_version!==
        projection.privacyVersion||
      payload.privacy_accepted!==
        'yes'||
      payload.contact_name!==
        contact.name||
      payload.company!==
        contact.company||
      payload.country_or_region!==
        contact.country||
      payload.city!==
        contact.city||
      payload.email_address!==
        contact.email||
      payload.phone_or_wechat!==
        contact.phone||
      payload.buyer_type!==
        contact.buyerType||
      payload.message!==
        contact.message||
      payload.language!==
        'en'||
      payload.estimated_amount!==
        'USD 123.45'||
      payload.estimated_amount_base_usd!==
        '123.45'||
      payload.product_count!==1||
      payload.custom_count!==1||
      payload.items_summary!==
        projection.itemsSummary
    ){
      fail(
        'Submission delivery payload value parity failed.'
      );
    }

    if(
      payload.personal_info!==
        JSON.stringify(
          contact,
          null,
          2
        )||
      payload.product_items!==
        JSON.stringify(
          projection.rawProductItems,
          null,
          2
        )||
      payload.custom_items!==
        JSON.stringify(
          projection.rawCustomItems,
          null,
          2
        )
    ){
      fail(
        'Submission payload JSON formatting parity failed.'
      );
    }

    const fallback=
      policy.build({
        ...projection,
        contact:{
          ...contact,
          name:''
        }
      });

    if(
      fallback.subject!==
        '[DL-20260902-ABC123] DREAMLAND 批发与定制询价 - 未填写联系人'||
      fallback.from_name!==
        'DREAMLAND 官网访客'
    ){
      fail(
        'Submission subject/from-name fallback parity failed.'
      );
    }

    if(
      policy.emailValid(
        'buyer@example.com'
      )!==true||
      policy.emailValid(
        'buyer@example'
      )!==false||
      policy.emailValid(
        '@example.com'
      )!==false
    ){
      fail(
        'Submission email validation parity failed.'
      );
    }

    const valid={
      ...payload
    };

    const cases=[
      [
        {
          ...valid,
          inquiry_id:'bad'
        },
        'INVALID_INQUIRY_ID'
      ],
      [
        {
          ...valid,
          contact_name:'A'
        },
        'INVALID_CONTACT_NAME'
      ],
      [
        {
          ...valid,
          country_or_region:''
        },
        'INVALID_COUNTRY'
      ],
      [
        {
          ...valid,
          email_address:'bad'
        },
        'INVALID_EMAIL'
      ],
      [
        {
          ...valid,
          phone_or_wechat:'123'
        },
        'INVALID_CONTACT_METHOD'
      ],
      [
        {
          ...valid,
          product_count:0,
          custom_count:0
        },
        'EMPTY_INQUIRY'
      ],
      [
        {
          ...valid,
          items_summary:'x'
        },
        'EMPTY_SUMMARY'
      ]
    ];

    for(const [
      fixture,
      expectedCode
    ] of cases){
      const result=
        policy.validate(
          fixture
        );

      if(
        result.ok!==false||
        result.code!==
          expectedCode
      ){
        fail(
          'Submission validation code parity failed: '+
          expectedCode
        );
      }
    }

    const ok=
      policy.validate(
        valid
      );

    if(
      ok.ok!==true||
      ok.code!=='OK'
    ){
      fail(
        'Valid submission payload did not pass Domain validation.'
      );
    }
  }
}catch(error){
  fail(
    'Submission Payload Domain execution failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/domain/submission/runtime-submission-payload.js'
    );

  for(const forbidden of [
    'document.',
    'querySelector(',
    'localStorage',
    'sessionStorage',
    'fetch(',
    'XMLHttpRequest',
    'DreamlandInquiry',
    'DreamlandDetail',
    'DreamlandRisk',
    'DreamlandContact',
    'DreamlandInquirySubmissionFlow'
  ]){
    if(
      source.includes(
        forbidden
      )
    ){
      fail(
        'Submission Payload Domain crossed a boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'Submission Payload Domain source inspection failed: '+
    error.message
  );
}

try{
  const index=
    read('index.html');

  for(const marker of [
    './src/domain/submission/runtime-submission-payload.js',
    'const submissionPayloadPolicy=window.DreamlandSubmissionPayload;',
    'DreamlandSubmissionPayload must load before submission payload initialization.'
  ]){
    if(
      !index.includes(
        marker
      )
    ){
      fail(
        'index.html Submission Payload Domain integration is missing: '+
        marker
      );
    }
  }

  const emailSource=
    functionSlice(
      index,
      'submissionEmailValid',
      'validateSubmissionPayload'
    );

  const validateSource=
    functionSlice(
      index,
      'validateSubmissionPayload',
      'buildWeb3FormsPayload'
    );

  const buildSource=
    functionSlice(
      index,
      'buildWeb3FormsPayload',
      'submissionSnapshot'
    );

  if(
    !/submissionPayloadPolicy\s*\.\s*emailValid/.test(
      emailSource
    )
  ){
    fail(
      'Legacy submissionEmailValid() is not delegated to DreamlandSubmissionPayload.'
    );
  }

  if(
    !/submissionPayloadPolicy\s*\.\s*validate/.test(
      validateSource
    )
  ){
    fail(
      'Legacy validateSubmissionPayload() is not delegated to DreamlandSubmissionPayload.'
    );
  }

  for(const marker of [
    'inquiryFeature',
    '.buildProjection(',
    'submissionPayloadPolicy',
    '.build('
  ]){
    if(
      !compact(
        buildSource
      ).includes(
        compact(
          marker
        )
      )
    ){
      fail(
        'Legacy buildWeb3FormsPayload() bridge is missing: '+
        marker
      );
    }
  }

  for(const providerField of [
    'contact_name:',
    'country_or_region:',
    'email_address:',
    'phone_or_wechat:',
    'personal_info:',
    'product_items:',
    'custom_items:'
  ]){
    if(
      buildSource.includes(
        providerField
      )
    ){
      fail(
        'Legacy buildWeb3FormsPayload() still owns provider field mapping: '+
        providerField
      );
    }
  }
}catch(error){
  fail(
    'Legacy Submission Payload bridge inspection failed: '+
    error.message
  );
}

try{
  const legacy=
    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/app/legacy-map.js'
        )
      ).href+
      '?r4-domain-submission-legacy='+
      Date.now()
    );

  const item=
    legacy
      .LEGACY_FRONTEND_MAP
      .find(
        row=>
          row.id===
            'submission-payload-domain'
      );

  if(
    item?.targetLayer!==
      'domain'||
    item?.targetArea!==
      'submission'||
    item?.status!==
      'migrated'||
    item?.runtimeMigrated!==
      true||
    !item?.runtimeOwners
      ?.includes(
        'src/domain/submission/runtime-submission-payload.js'
      )
  ){
    fail(
      'Legacy map does not mark submission payload mapping as migrated to Domain.'
    );
  }
}catch(error){
  fail(
    'Submission payload legacy-map validation failed: '+
    error.message
  );
}

try{
  const sw=
    read('sw.js');

  const matches=
    sw.match(
      /'\.\/src\/domain\/submission\/runtime-submission-payload\.js'/g
    )||
    [];

  if(
    matches.length!==1
  ){
    fail(
      'PWA APP_SHELL must contain the Submission Payload Domain runtime exactly once; found '+
      matches.length+
      '.'
    );
  }
}catch(error){
  fail(
    'Submission Payload PWA asset validation failed: '+
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
      ?.['r4:domain:submission-payload']!==
    'node scripts/validate-r4-domain-submission-payload.mjs'
  ){
    fail(
      'package.json is missing r4:domain:submission-payload.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const desktop=
    validate.indexOf(
      'npm run desktop:catalog'
    );

  const pricing=
    validate.indexOf(
      'npm run r4:domain:pricing'
    );

  const payload=
    validate.indexOf(
      'npm run r4:domain:submission-payload'
    );

  const astro=
    validate.indexOf(
      'npm run r4:astro:foundation'
    );

  if(
    !(
      desktop>=0&&
      pricing>desktop&&
      payload>pricing&&
      astro>payload
    )
  ){
    fail(
      'R4 Domain gate ordering must be Desktop → Pricing → Submission Payload → Astro.'
    );
  }
}catch(error){
  fail(
    'Submission Payload package validation failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.2B Submission Payload Domain: FAIL'
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
  'DREAMLAND B7-00B.4J R4.2B Submission Payload Domain: PASS'
);
console.log(
  'Provider delivery payload mapping / validation moved out of Legacy shell with exact field and validation-code parity.'
);
console.log('');

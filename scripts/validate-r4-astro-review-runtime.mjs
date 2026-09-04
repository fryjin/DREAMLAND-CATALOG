#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
  pathToFileURL
} from 'node:url';

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

const CONTACT_FIELDS=Object.freeze([
  'name',
  'company',
  'buyerType',
  'country',
  'city',
  'email',
  'phone',
  'message'
]);

function fail(message){
  errors.push(
    message
  );
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
    read(
      relative
    )
  );
}

function stateText(html){
  const match=
    html.match(
      /<script[^>]*id="reviewRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="reviewRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

try{
  const htmlFile=
    path.join(
      OUT,
      'inquiry',
      'review',
      'index.html'
    );

  const bundleFile=
    path.join(
      OUT,
      'r4-review-runtime.js'
    );

  if(
    !fs.existsSync(
      htmlFile
    )
  ){
    fail(
      'R4.9B Review output is missing.'
    );
  }

  if(
    !fs.existsSync(
      bundleFile
    )
  ){
    fail(
      'R4.9B Review runtime bundle is missing.'
    );
  }

  if(
    fs.existsSync(
      htmlFile
    )
  ){
    const html=
      fs.readFileSync(
        htmlFile,
        'utf8'
      );

    for(const marker of [
      'data-review-runtime-presentation',
      'id="reviewRuntimeState"',
      'src="/r4-review-runtime.js"',
      'data-site-language-enabled="true"',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/review/"',
      'href="/inquiry/"',
      'href="/inquiry/contact/"'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.9B Review output is missing: '+
          marker
        );
      }
    }

    const executable=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(
      executable.length!==1
    ){
      fail(
        'R4.9B Review must expose exactly one executable route runtime; found '+
        executable.length+
        '.'
      );
    }

    const raw=
      stateText(
        html
      );

    if(!raw){
      fail(
        'R4.9B Review runtime state is missing.'
      );
    }else{
      try{
        const state=
          JSON.parse(
            raw
          );

        if(
          ![
            'R4.9B',
            'R4.9C'
          ].includes(
            state.version
          )||
          JSON.stringify(
            state.languages
          )!==
            JSON.stringify([
              'en',
              'zh',
              'ko'
            ])||
          state.storage
            ?.languageKey!==
            'productManualLang'||
          state.storage
            ?.inquiryKey!==
            'productManualV2State'||
          state.storage
            ?.inquiryVersion!==
            2||
          state.storage
            ?.contactKey!==
            'dreamlandContactDraftV1'||
          state.storage
            ?.contactTtlMs!==
            86400000||
          state.storage
            ?.pendingInquiryKey!==
            'dreamlandPendingInquiryIdV1'||
          JSON.stringify(
            state.storage
              ?.contactFieldIds
          )!==
            JSON.stringify(
              CONTACT_FIELDS
            )||
          state.routes
            ?.inquiry!==
            '/inquiry/'||
          state.routes
            ?.contact!==
            '/inquiry/contact/'||
          state.guard!==
            'hasValidContact'
        ){
          fail(
            'R4.9B runtime-state storage/guard/route contract changed.'
          );
        }

        if(
          !Array.isArray(
            state.products
          )||
          state.products.length!==89||
          !Array.isArray(
            state.scents
          )||
          !state.seriesMeta||
          !state.currencyMap
            ?.en||
          !state.currencyMap
            ?.zh||
          !state.currencyMap
            ?.ko
        ){
          fail(
            'R4.9B Review projection runtime data is incomplete.'
          );
        }

        for(const language of [
          'en',
          'zh',
          'ko'
        ]){
          const locale=
            state.locales
              ?.[language];

          if(
            !locale||
            !locale.copy||
            !locale.ui||
            !locale.choices||
            !locale.content
              ?.navigation||
            !locale.content
              ?.footer||
            !Array.isArray(
              locale.copy
                .countryRegions
            )||
            !Array.isArray(
              locale.copy
                .buyerTypes
            )
          ){
            fail(
              'R4.9B Review locale is incomplete: '+
              language
            );
          }
        }

        const stateRaw=
          Buffer.byteLength(
            raw,
            'utf8'
          );

        if(
          stateRaw>
          256*1024
        ){
          fail(
            'R4.9B Review runtime state exceeds 256 KiB raw: '+
            (
              stateRaw/
              1024
            ).toFixed(
              1
            )+
            ' KiB.'
          );
        }
      }catch(error){
        fail(
          'R4.9B Review runtime state JSON is invalid: '+
          error.message
        );
      }
    }

    const submit=
      (
        html.match(
          /<button[^>]*data-review-static-submit[^>]*>/i
        )||
        []
      )[0]||
      '';

    const consent=
      (
        html.match(
          /<input[^>]*type="checkbox"[^>]*>/i
        )||
        []
      )[0]||
      '';

    /*
     * Privacy/Submit activation is delegated to the later Review submission
     * boundary stage. R4.9B only requires the controls to remain present.
     */
    if(
      !submit||
      !consent
    ){
      fail(
        'R4.9B/later Review privacy and Submit controls are missing.'
      );
    }

    if(
      html.includes(
        'href="/inquiry/success/"'
      )
    ){
      fail(
        'R4.9B must not navigate directly to Success.'
      );
    }
  }

  if(
    fs.existsSync(
      bundleFile
    )
  ){
    const bundle=
      fs.readFileSync(
        bundleFile,
        'utf8'
      );

    for(const marker of [
      'root.DreamlandPricingPolicy=',
      'root.DreamlandInquiry=',
      'root.DreamlandContact=',
      'root.DreamlandPageGuards=',
      'root.DreamlandReviewRuntime='
    ]){
      const count=
        bundle.split(
          marker
        ).length-1;

      if(count!==1){
        fail(
          'R4.9B Review bundle owner count mismatch: '+
          marker+
          ' → '+
          count
        );
      }
    }

    /*
     * Later Review stages may append canonical Risk / Submission / PWA
     * reachability owners. R4.9B does not freeze successor bundle composition.
     */

    for(const pattern of [
      /pageGuards\s*\.\s*evaluate\s*\(\s*['"]review['"]/,
      /contact\s*\.\s*loadDraft\s*\(\s*\)/,
      /inquiry\s*\.\s*buildProjection\s*\(/,
      /inquiry\s*\.\s*buildViewModel\s*\(/,
      /storage\s*\??\.\s*setItem\s*\(\s*key\s*,\s*value\s*\)/
    ]){
      if(
        !pattern.test(
          bundle
        )
      ){
        fail(
          'R4.9B Review runtime behavior contract is missing: '+
          pattern
        );
      }
    }

    const raw=
      fs.statSync(
        bundleFile
      ).size;

    if(
      raw>
      190*1024
    ){
      fail(
        'R4.9B Review runtime bundle exceeds 190 KiB raw: '+
        (
          raw/
          1024
        ).toFixed(
          1
        )+
        ' KiB.'
      );
    }
  }
}catch(error){
  fail(
    'R4.9B isolated output validation crashed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/review-runtime.js'
    );

  if(
    !runtime.includes(
      "const VERSION='R4.9B';"
    )&&
    !runtime.includes(
      "const VERSION='R4.9C';"
    )
  ){
    fail(
      'R4.9B/later Review adapter version marker is missing.'
    );
  }

  for(const marker of [
    'guardResult(',
    'configureContact(',
    'configureInquiry(',
    'ensureInquiryId(',
    'renderProjection(',
    'buildProjection({'
  ]){
    if(
      !runtime.includes(
        marker
      )
    ){
      fail(
        'R4.9B Review adapter source is missing: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'navigator.serviceWorker.register',
    'registerServiceWorker()'
  ]){
    if(
      runtime.includes(
        forbidden
      )
    ){
      fail(
        'R4.9B/later Review adapter crossed a direct transport or Service Worker registration boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.9B Review adapter inspection crashed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandInquiry;

  delete globalThis
    .DreamlandContact;

  delete globalThis
    .DreamlandPageGuards;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/inquiry/runtime-inquiry.js'
      )
    ).href+
    '?r49b-inquiry='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/contact/runtime-contact.js'
      )
    ).href+
    '?r49b-contact='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/site/runtime/runtime-page-guards.js'
      )
    ).href+
    '?r49b-guard='+
    Date.now()
  );

  const inquiry=
    globalThis
      .DreamlandInquiry;

  const contact=
    globalThis
      .DreamlandContact;

  const guards=
    globalThis
      .DreamlandPageGuards;

  class Storage{
    constructor(){
      this.map=
        new Map();
    }

    getItem(key){
      return this.map.has(
        key
      )
        ? this.map.get(
            key
          )
        : null;
    }

    setItem(key,value){
      this.map.set(
        key,
        String(
          value
        )
      );
    }

    removeItem(key){
      this.map.delete(
        key
      );
    }
  }

  const storage=
    new Storage();

  inquiry.configure({
    storage,
    storageKey:
      'productManualV2State',
    version:2
  });

  contact.configure({
    storage,
    storageKey:
      'dreamlandContactDraftV1',
    ttlMs:
      86400000,
    fieldIds:
      CONTACT_FIELDS
  });

  let result=
    guards.evaluate(
      'review',
      {
        inquiry,
        contact
      }
    );

  if(
    result.allowed!==
      false||
    result.code!==
      'INQUIRY_REQUIRED'||
    result.target!==
      '/inquiry/'
  ){
    fail(
      'R4.9B canonical Review guard lost the empty-Inquiry redirect.'
    );
  }

  storage.setItem(
    'productManualV2State',
    JSON.stringify({
      version:2,
      items:[
        {
          id:'p1',
          type:'product',
          productId:'CLA001',
          series:'classic',
          size:'M',
          qty:50
        }
      ],
      contact:{}
    })
  );

  inquiry.configure({
    storage,
    storageKey:
      'productManualV2State',
    version:2
  });

  result=
    guards.evaluate(
      'review',
      {
        inquiry,
        contact
      }
    );

  if(
    result.allowed!==
      false||
    result.code!==
      'CONTACT_REQUIRED'||
    result.target!==
      '/inquiry/contact/'
  ){
    fail(
      'R4.9B canonical Review guard lost the invalid-Contact redirect.'
    );
  }

  contact.replace({
    name:'Ada Buyer',
    country:'SG',
    email:'buyer@example.com',
    phone:'+65 12345678'
  });

  result=
    guards.evaluate(
      'review',
      {
        inquiry,
        contact
      }
    );

  if(
    result.allowed!==
      true||
    result.code!==
      ''
  ){
    fail(
      'R4.9B canonical Review guard rejected a valid Inquiry + Contact state.'
    );
  }
}catch(error){
  fail(
    'R4.9B canonical Review guard execution test crashed: '+
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
      ?.['r4:astro:review-runtime']!==
    'node scripts/validate-r4-astro-review-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:review-runtime.'
    );
  }

  if(
    !String(
      pkg.scripts
        ?.['r4:astro:build']||
      ''
    ).endsWith(
      'node scripts/r4-copy-astro-review-assets.mjs'
    )
  ){
    fail(
      'R4.9B Review runtime copier must be the final isolated Astro build step.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const presentation=
    validate.indexOf(
      'npm run r4:astro:review'
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:review-runtime'
    );

  const production=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    presentation<0||
    runtime<=presentation||
    production<=runtime
  ){
    fail(
      'R4.9B Review runtime gate must run after Review presentation and before Production source contracts.'
    );
  }

  if(
    String(
      pkg.scripts
        ?.build||
      ''
    ).includes(
      'r4:production:review'
    )
  ){
    fail(
      'R4.9B must not cut over Production Review.'
    );
  }
}catch(error){
  fail(
    'R4.9B package inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.9B Review Minimal Runtime: FAIL'
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
  'DREAMLAND B7-00B.4J R4.9B Review Minimal Runtime: PASS'
);
console.log(
  'shared Inquiry + Contact hydration / canonical hasValidContact guard / canonical Inquiry projection / pending Inquiry ID / EN-ZH-KO presentation verified; privacy, Risk/hCaptcha, Submission and Success remain downstream.'
);
console.log('');

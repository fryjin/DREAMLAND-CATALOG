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

const BUDGETS=
  Object.freeze({
    adapterRaw:48*1024,
    bundleRaw:112*1024,
    stateRaw:128*1024
  });

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

function text(value){
  return String(
    value??
    ''
  ).trim();
}

function kib(value){
  return (
    Number(value)/
    1024
  ).toFixed(1);
}

function stateText(html){
  const match=
    html.match(
      /<script[^>]*id="inquiryRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="inquiryRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

try{
  const adapter=
    read(
      'src/astro/runtime/inquiry-runtime.js'
    );

  for(const marker of [
    "const VERSION='R4.7B'",
    "const ID='DREAMLAND_R4_INQUIRY_RUNTIME_R4_7B'",
    'DreamlandInquiryRuntime',
    'DreamlandInquiry',
    'DreamlandPricingPolicy',
    'productManualLang',
    'productManualV2State',
    'buildViewModel',
    'setProductQuantity',
    'removeItem',
    'clearItems',
    'persist',
    'firstUnmetProductMoqGroup',
    'location.assign',
    "'/r4-inquiry-runtime.js'"
  ]){
    if(
      marker===
      "'/r4-inquiry-runtime.js'"
    ){
      continue;
    }

    if(
      !adapter.includes(
        marker
      )
    ){
      fail(
        'R4.7B Inquiry adapter is missing canonical/runtime marker: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'serviceWorker',
    'navigator.serviceWorker',
    'runtime-pwa.js',
    'DreamlandPwa',
    'DreamlandContact',
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandInquirySubmissionFlow',
    'runtime-contact.js',
    'runtime-risk.js',
    'runtime-submission.js',
    'runtime-inquiry-submission-flow.js',
    'hcaptcha',
    'startup-loader.js'
  ]){
    if(
      adapter.includes(
        forbidden
      )
    ){
      fail(
        'R4.7B Inquiry adapter crossed a forbidden boundary: '+
        forbidden
      );
    }
  }

  const adapterRaw=
    Buffer.byteLength(
      adapter,
      'utf8'
    );

  if(
    adapterRaw>
    BUDGETS.adapterRaw
  ){
    fail(
      'R4.7B Inquiry adapter exceeds '+
      kib(BUDGETS.adapterRaw)+
      ' KiB: '+
      kib(adapterRaw)+
      ' KiB.'
    );
  }
}catch(error){
  fail(
    'R4.7B Inquiry adapter inspection failed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandInquiryRuntime;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/astro/runtime/inquiry-runtime.js'
      )
    ).href+
    '?r47b-adapter='+
    Date.now()
  );

  const adapter=
    globalThis
      .DreamlandInquiryRuntime;

  if(
    !adapter||
    adapter.version!==
      'R4.7B'||
    adapter.id!==
      'DREAMLAND_R4_INQUIRY_RUNTIME_R4_7B'||
    adapter.mount()!==
      null
  ){
    fail(
      'R4.7B Inquiry adapter must remain Node-safe and expose the expected version/id.'
    );
  }else{
    const count=
      adapter.inquiryCount({
        summary:{
          productQuantity:75,
          customCount:2
        }
      });

    if(count!==77){
      fail(
        'R4.7B Inquiry badge semantics must be product quantity + custom project count.'
      );
    }
  }
}catch(error){
  fail(
    'R4.7B Inquiry adapter Node-safe execution failed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandPricingPolicy;

  delete globalThis
    .DreamlandInquiry;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/pricing/runtime-pricing-policy.js'
      )
    ).href+
    '?r47b-pricing='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/inquiry/runtime-inquiry.js'
      )
    ).href+
    '?r47b-inquiry='+
    Date.now()
  );

  const pricing=
    globalThis
      .DreamlandPricingPolicy;

  const inquiry=
    globalThis
      .DreamlandInquiry;

  if(
    !pricing||
    !inquiry
  ){
    fail(
      'R4.7B canonical Pricing/Inquiry owners are unavailable.'
    );
  }else{
    for(const method of [
      'productMoqGroups',
      'firstUnmetProductMoqGroup'
    ]){
      if(
        typeof inquiry[method]!==
        'function'
      ){
        fail(
          'DreamlandInquiry.'+
          method+
          ' is missing.'
        );
      }
    }

    const memory=
      new Map();

    const storage={
      getItem(key){
        return memory.has(key)
          ? memory.get(key)
          : null;
      },
      setItem(key,value){
        memory.set(
          key,
          String(value)
        );
      }
    };

    memory.set(
      'productManualV2State',
      JSON.stringify({
        version:2,
        items:[
          {
            id:'a1',
            type:'product',
            productId:'ADV001',
            series:'advanced',
            size:'M',
            qty:10
          },
          {
            id:'a2',
            type:'product',
            productId:'ADV002',
            series:'advanced',
            size:'M',
            qty:10
          },
          {
            id:'c1',
            type:'custom',
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
      version:2,
      normalizeQuantity:
        (
          value,
          min
        )=>
          pricing.normalizeQuantity(
            value,
            min,
            1000000
          )
    });

    const itemMoq=
      item=>
        item?.series===
          'advanced'&&
        item?.size===
          'M'
          ? 24
          : 1;

    const groups=
      inquiry
        .productMoqGroups(
          itemMoq
        );

    const unmet=
      inquiry
        .firstUnmetProductMoqGroup(
          itemMoq
        );

    if(
      groups.length!==1||
      groups[0].series!==
        'advanced'||
      groups[0].size!==
        'M'||
      groups[0].qty!==20||
      groups[0].moq!==24||
      unmet?.qty!==20
    ){
      fail(
        'R4.7B canonical product MOQ grouping parity failed.'
      );
    }

    inquiry.setProductQuantity(
      'a1',
      14,
      1
    );

    inquiry.persist();

    if(
      inquiry
        .firstUnmetProductMoqGroup(
          itemMoq
        )!==
      null
    ){
      fail(
        'R4.7B canonical MOQ group did not become valid after reaching the combined MOQ.'
      );
    }

    const persisted=
      JSON.parse(
        memory.get(
          'productManualV2State'
        )
      );

    if(
      persisted.items
        ?.find(
          item=>
            item.id===
            'a1'
        )
        ?.qty!==
      14||
      Object.keys(
        persisted.contact||
        {}
      ).length!==0
    ){
      fail(
        'R4.7B quantity mutation/persist contract drifted.'
      );
    }
  }
}catch(error){
  fail(
    'R4.7B canonical runtime execution failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/features/inquiry/runtime-inquiry.js'
    );

  for(const marker of [
    'function productMoqGroups(',
    'function firstUnmetProductMoqGroup(',
    'productMoqGroups,',
    'firstUnmetProductMoqGroup,'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        'R4.7B canonical Inquiry MOQ ownership is incomplete: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'document.',
    'querySelector(',
    'localStorage',
    'DreamlandRisk',
    'DreamlandSubmission'
  ]){
    if(
      source.includes(
        forbidden
      )
    ){
      fail(
        'DreamlandInquiry crossed its DOM/downstream Feature boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.7B canonical Inquiry source inspection failed: '+
    error.message
  );
}

try{
  const htmlFile=
    path.join(
      OUT,
      'inquiry',
      'index.html'
    );

  const bundleFile=
    path.join(
      OUT,
      'r4-inquiry-runtime.js'
    );

  if(
    !fs.existsSync(
      htmlFile
    )||
    !fs.existsSync(
      bundleFile
    )
  ){
    fail(
      'R4.7B isolated Inquiry HTML/runtime bundle is missing.'
    );
  }else{
    const html=
      fs.readFileSync(
        htmlFile,
        'utf8'
      );

    const stateRaw=
      stateText(
        html
      );

    const state=
      JSON.parse(
        stateRaw||
        '{}'
      );

    const bundle=
      fs.readFileSync(
        bundleFile,
        'utf8'
      );

    for(const marker of [
      "const VERSION='R4.2A'",
      "version:'B5-05'",
      'DREAMLAND_R4_INQUIRY_RUNTIME_R4_7B'
    ]){
      if(
        !bundle.includes(
          marker
        )
      ){
        fail(
          'R4.7B runtime bundle is missing an owner marker: '+
          marker
        );
      }
    }

    for(const forbidden of [
      'DreamlandContact',
      'DreamlandRisk',
      'DreamlandSubmission',
      'DreamlandInquirySubmissionFlow',
      'navigator.serviceWorker',
      'runtime-pwa.js',
      'hcaptcha',
      'startup-loader.js'
    ]){
      if(
        bundle.includes(
          forbidden
        )
      ){
        fail(
          'R4.7B runtime bundle crossed a downstream/PWA boundary: '+
          forbidden
        );
      }
    }

    const bundleRaw=
      Buffer.byteLength(
        bundle,
        'utf8'
      );

    const stateBytes=
      Buffer.byteLength(
        stateRaw,
        'utf8'
      );

    if(
      bundleRaw>
      BUDGETS.bundleRaw
    ){
      fail(
        'R4.7B Inquiry runtime bundle exceeds '+
        kib(BUDGETS.bundleRaw)+
        ' KiB: '+
        kib(bundleRaw)+
        ' KiB.'
      );
    }

    if(
      stateBytes>
      BUDGETS.stateRaw
    ){
      fail(
        'R4.7B Inquiry runtime state exceeds '+
        kib(BUDGETS.stateRaw)+
        ' KiB: '+
        kib(stateBytes)+
        ' KiB.'
      );
    }

    if(
      state.products?.length!==89
    ){
      fail(
        'R4.7B runtime product lookup must contain 89 active products.'
      );
    }

    for(const product of state.products||[]){
      const cover=
        text(
          product?.cover
        )
          .replace(
            /[?#].*$/,
            ''
          )
          .replace(
            /^\/+/,
            ''
          );

      if(
        cover&&
        !fs.existsSync(
          path.join(
            OUT,
            cover
          )
        )
      ){
        fail(
          'R4.7B Inquiry product cover was not copied: '+
          product.cover
        );
      }
    }

    if(!errors.length){
      console.log('');
      console.log(
        '[R4.7B Inquiry Runtime Budget]'
      );
      console.log(
        '- Adapter:',
        kib(
          Buffer.byteLength(
            read(
              'src/astro/runtime/inquiry-runtime.js'
            ),
            'utf8'
          )
        )+
        ' KiB raw'
      );
      console.log(
        '- Bundle:',
        kib(bundleRaw)+
        ' KiB raw'
      );
      console.log(
        '- Runtime state:',
        kib(stateBytes)+
        ' KiB raw'
      );
      console.log(
        '- Runtime products:',
        state.products.length
      );
    }
  }
}catch(error){
  fail(
    'R4.7B isolated runtime budget/output validation failed: '+
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
      ?.['r4:astro:inquiry-runtime']!==
    'node scripts/validate-r4-astro-inquiry-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:inquiry-runtime.'
    );
  }

  if(
    !String(
      pkg.scripts
        ?.['r4:astro:build']||
      ''
    )
      .endsWith(
        'node scripts/r4-copy-astro-inquiry-assets.mjs'
      )
  ){
    fail(
      'R4.7B Astro build does not finish with the Inquiry asset copier.'
    );
  }
}catch(error){
  fail(
    'R4.7B runtime package inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.7B Inquiry Minimal Runtime: FAIL'
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
  'DREAMLAND B7-00B.4J R4.7B Inquiry Minimal Runtime: PASS'
);
console.log(
  'Shared state hydration / canonical pricing / canonical series+size MOQ grouping / quantity mutation / remove-clear / EN-ZH-KO / Inquiry badge / Legacy Contact navigation boundary verified.'
);
console.log('');

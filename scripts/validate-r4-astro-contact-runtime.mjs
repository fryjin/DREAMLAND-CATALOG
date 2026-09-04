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

const FIELD_IDS=Object.freeze([
  'name',
  'company',
  'country',
  'city',
  'email',
  'phone',
  'buyerType',
  'message'
]);

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

function expectOutput(relative){
  const file=
    path.join(
      OUT,
      relative
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'R4.8B output is missing: '+
      relative
    );

    return '';
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}

function stateText(html){
  const match=
    html.match(
      /<script[^>]*id="contactRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="contactRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

try{
  const html=
    expectOutput(
      'inquiry/contact/index.html'
    );

  const bundle=
    expectOutput(
      'r4-contact-runtime.js'
    );

  if(html){
    for(const marker of [
      'data-contact-runtime-presentation',
      'id="contactRuntimeState"',
      'src="/r4-contact-runtime.js"',
      'data-site-language-enabled="true"',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/contact/"'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.8B Contact output is missing: '+
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
        'R4.8B Contact must expose exactly one executable route runtime; found '+
        executable.length+
        '.'
      );
    }

    const scriptSources=[
      ...html.matchAll(
        /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi
      )
    ].map(
      match=>match[1]
    );

    if(
      scriptSources.length!==1||
      scriptSources[0]!==
      '/r4-contact-runtime.js'
    ){
      fail(
        'R4.8B Contact executable graph must contain only /r4-contact-runtime.js.'
      );
    }

    const rawState=
      stateText(
        html
      );

    if(!rawState){
      fail(
        'R4.8B contactRuntimeState is missing.'
      );
    }else{
      try{
        const state=
          JSON.parse(
            rawState
          );

        if(
          state.version!==
            'R4.8B'||
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
          JSON.stringify(
            state.storage
              ?.contactFieldIds
          )!==
            JSON.stringify(
              FIELD_IDS
            )||
          state.routes
            ?.inquiry!==
            '/inquiry/'||
          state.routes
            ?.review!==
            '/inquiry/review/'||
          state.guard!==
            'hasInquiry'
        ){
          fail(
            'R4.8B Contact runtime state storage/route/guard contract changed.'
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
            !Array.isArray(
              locale.copy
                .countryRegions
            )||
            !Array.isArray(
              locale.copy
                .buyerTypes
            )||
            !locale.content
              ?.navigation||
            !locale.content
              ?.footer
          ){
            fail(
              'R4.8B Contact locale is incomplete: '+
              language
            );
          }
        }

        if(
          !state.seriesMeta||
          !Object.keys(
            state.seriesMeta
          ).length||
          !state.currencyMap
            ?.en||
          !state.currencyMap
            ?.zh||
          !state.currencyMap
            ?.ko
        ){
          fail(
            'R4.8B real Inquiry snapshot pricing/currency state is incomplete.'
          );
        }
      }catch(error){
        fail(
          'R4.8B Contact runtime state JSON is invalid: '+
          error.message
        );
      }
    }
  }

  if(bundle){
    for(const [
      marker,
      expected
    ] of [
      [
        'root.DreamlandPricingPolicy=',
        1
      ],
      [
        'root.DreamlandInquiry=',
        1
      ],
      [
        'root.DreamlandContact=',
        1
      ],
      [
        'root.DreamlandContactRuntime=',
        1
      ]
    ]){
      const count=
        bundle.split(
          marker
        ).length-1;

      if(count!==expected){
        fail(
          'R4.8B Contact bundle owner count mismatch for '+
          marker+
          ': '+
          count
        );
      }
    }

    for(const marker of [
      'contact.patch({',
      'contact.scheduleDraft(',
      'contact.flushDraft(',
      'contact.validate(',
      '.replace?.(',
      '.assign?.(',
      "'storage'",
      "'pageshow'",
      "'pagehide'",
      "'visibilitychange'",
      'productManualV2State',
      'dreamlandContactDraftV1'
    ]){
      if(
        !bundle.includes(
          marker
        )
      ){
        fail(
          'R4.8B Contact runtime behavior is missing: '+
          marker
        );
      }
    }

    if(
      !/contact\s*\.\s*loadDraft\s*\(\s*\)/.test(
        bundle
      )
    ){
      fail(
        'R4.8B Contact runtime behavior is missing: contact.loadDraft()'
      );
    }

    for(const forbidden of [
      'DreamlandRisk',
      'DreamlandSubmission',
      'DreamlandInquirySubmissionFlow',
      'hcaptcha',
      'runtime-pwa.js',
      'navigator.serviceWorker',
      'serviceWorker.register',
      'XMLHttpRequest',
      'fetch(',
      'startup-loader.js'
    ]){
      if(
        bundle.includes(
          forbidden
        )
      ){
        fail(
          'R4.8B Contact runtime crossed a downstream/PWA/data-fetch boundary: '+
          forbidden
        );
      }
    }

    const adapterFile=
      path.join(
        ROOT,
        'src/astro/runtime/contact-runtime.js'
      );

    const bundleFile=
      path.join(
        OUT,
        'r4-contact-runtime.js'
      );

    const stateRaw=
      html
        ? Buffer.byteLength(
            stateText(
              html
            ),
            'utf8'
          )
        : 0;

    const adapterRaw=
      fs.existsSync(
        adapterFile
      )
        ? fs.statSync(
            adapterFile
          ).size
        : 0;

    const bundleRaw=
      fs.existsSync(
        bundleFile
      )
        ? fs.statSync(
            bundleFile
          ).size
        : 0;

    if(
      adapterRaw>
      56*1024
    ){
      fail(
        'R4.8B Contact adapter exceeds 56 KiB raw: '+
        (
          adapterRaw/
          1024
        ).toFixed(
          1
        )+
        ' KiB.'
      );
    }

    if(
      bundleRaw>
      160*1024
    ){
      fail(
        'R4.8B Contact runtime bundle exceeds 160 KiB raw: '+
        (
          bundleRaw/
          1024
        ).toFixed(
          1
        )+
        ' KiB.'
      );
    }

    if(
      stateRaw>
      192*1024
    ){
      fail(
        'R4.8B Contact runtime state exceeds 192 KiB raw: '+
        (
          stateRaw/
          1024
        ).toFixed(
          1
        )+
        ' KiB.'
      );
    }

    if(!errors.length){
      console.log('');
      console.log(
        '[R4.8B Contact Runtime Budget]'
      );
      console.log(
        '- Adapter:',
        (
          adapterRaw/
          1024
        ).toFixed(
          1
        )+
        ' KiB raw'
      );
      console.log(
        '- Bundle:',
        (
          bundleRaw/
          1024
        ).toFixed(
          1
        )+
        ' KiB raw'
      );
      console.log(
        '- Runtime state:',
        (
          stateRaw/
          1024
        ).toFixed(
          1
        )+
        ' KiB raw'
      );
    }
  }
}catch(error){
  fail(
    'R4.8B isolated output inspection crashed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/astro/runtime/contact-runtime.js'
    );

  for(const marker of [
    "const VERSION='R4.8B';",
    'guardSatisfied(',
    'configureContact(',
    'renderSummary(',
    'renderValidation(',
    'continueToReview()',
    'contact.scheduleDraft(',
    'contact.flushDraft(',
    'contact.validate('
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        'R4.8B Contact adapter source is missing: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandInquirySubmissionFlow',
    'hcaptcha',
    'runtime-pwa.js',
    'navigator.serviceWorker',
    'XMLHttpRequest',
    'fetch(',
    'startup-loader.js'
  ]){
    if(
      source.includes(
        forbidden
      )
    ){
      fail(
        'R4.8B Contact adapter source crossed a forbidden boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.8B Contact adapter inspection crashed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandContact;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/contact/runtime-contact.js'
      )
    ).href+
    '?r48b-contact-owner='+
    Date.now()
  );

  const contact=
    globalThis
      .DreamlandContact;

  if(
    !contact||
    contact.version!==
      'B5-06'
  ){
    fail(
      'R4.8B canonical DreamlandContact owner is unavailable.'
    );
  }else{
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

      setItem(
        key,
        value
      ){
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

    let now=
      1000000;

    contact.configure({
      storage,
      storageKey:
        'dreamlandContactDraftV1',
      ttlMs:
        86400000,
      fieldIds:
        FIELD_IDS,
      now:
        ()=>now
    });

    contact.replace({
      name:'Buyer Name',
      company:'DREAM',
      country:'SG',
      city:'Singapore',
      email:'buyer@example.com',
      phone:'+65 12345678',
      buyerType:'品牌方',
      message:'Hello'
    });

    const valid=
      contact.validate();

    if(!valid.valid){
      fail(
        'R4.8B canonical Contact validation rejected a valid synthetic contact.'
      );
    }

    contact.flushDraft();

    contact.clear();

    const restored=
      contact.loadDraft();

    if(
      restored.name!==
        'Buyer Name'||
      restored.country!==
        'SG'||
      restored.email!==
        'buyer@example.com'
    ){
      fail(
        'R4.8B canonical Contact draft did not restore from the shared 24-hour envelope.'
      );
    }

    now+=
      86400001;

    const expired=
      contact.loadDraft();

    if(
      FIELD_IDS.some(
        key=>
          String(
            expired
              ?.[key]||
            ''
          )
      )
    ){
      fail(
        'R4.8B canonical Contact draft did not expire after 24 hours.'
      );
    }

    const invalid=
      contact.validate({
        name:'A',
        country:'',
        email:'bad',
        phone:'1'
      });

    const codes=
      (
        invalid.errors||
        []
      ).map(
        row=>
          row.code
      );

    for(const code of [
      'invalidName',
      'countryRequired',
      'invalidEmail',
      'invalidPhone'
    ]){
      if(
        !codes.includes(
          code
        )
      ){
        fail(
          'R4.8B canonical Contact validation rule is missing: '+
          code
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.8B canonical Contact draft/validation test crashed: '+
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
      ?.['r4:astro:contact-runtime']!==
    'node scripts/validate-r4-astro-contact-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:contact-runtime.'
    );
  }

  /*
   * R4.8B owns the Contact copier's existence and ordering, not perpetual
   * final-position ownership. Later isolated route stages may append their own
   * route copier after Contact.
   */
  const isolatedBuildSteps=
    String(
      pkg.scripts
        ?.['r4:astro:build']||
      ''
    )
      .split(' && ')
      .map(
        step=>step.trim()
      )
      .filter(Boolean);

  const inquiryCopy=
    'node scripts/r4-copy-astro-inquiry-assets.mjs';

  const contactCopy=
    'node scripts/r4-copy-astro-contact-assets.mjs';

  const reviewCopy=
    'node scripts/r4-copy-astro-review-assets.mjs';

  const inquiryIndex=
    isolatedBuildSteps.indexOf(
      inquiryCopy
    );

  const contactIndex=
    isolatedBuildSteps.indexOf(
      contactCopy
    );

  const contactCount=
    isolatedBuildSteps.filter(
      step=>
        step===
        contactCopy
    ).length;

  if(
    inquiryIndex<0||
    contactIndex<=inquiryIndex||
    contactCount!==1
  ){
    fail(
      'R4.8B Contact runtime copier must remain exactly once after the Inquiry copier.'
    );
  }

  const reviewIndex=
    isolatedBuildSteps.indexOf(
      reviewCopy
    );

  if(
    reviewIndex>=0&&
    reviewIndex<=contactIndex
  ){
    fail(
      'A later Review copier must follow the Contact copier without changing R4.8B ownership.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const contactPresentation=
    validate.indexOf(
      'npm run r4:astro:contact'
    );

  const contactRuntime=
    validate.indexOf(
      'npm run r4:astro:contact-runtime'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    contactPresentation<0||
    contactRuntime<=
      contactPresentation||
    productionHome<=
      contactRuntime
  ){
    fail(
      'R4.8B Contact Runtime gate must run after Contact presentation and before Production source contracts.'
    );
  }

}catch(error){
  fail(
    'R4.8B package inspection crashed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  /*
   * R4.8B owns the isolated Contact runtime only. Production Service Worker
   * ownership is delegated to the current Production detachment stage.
   */
  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v129';"
    )
  ){
    fail(
      'R4.8B unexpectedly changed the PWA cache/release baseline.'
    );
  }
}catch(error){
  fail(
    'R4.8B Service Worker baseline inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.8B Contact Minimal Runtime: FAIL'
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
  'DREAMLAND B7-00B.4J R4.8B Contact Minimal Runtime: PASS'
);
console.log(
  'hasInquiry guard / shared 24h Contact draft / canonical Contact validation / real Inquiry snapshot / EN-ZH-KO presentation / Review navigation verified; Risk/hCaptcha/Submission remain downstream.'
);
console.log('');

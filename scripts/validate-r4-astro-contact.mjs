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

const EXPECTED_FIELDS=Object.freeze([
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

function stateFieldTags(html){
  return [
    ...html.matchAll(
      /<(?:input|select|textarea)\b[^>]*data-contact-static-field="([^"]+)"[^>]*>/gi
    )
  ];
}

try{
  const file=
    path.join(
      OUT,
      'inquiry',
      'contact',
      'index.html'
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'R4.8A Contact output is missing: inquiry/contact/index.html'
    );
  }else{
    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-contact="true"',
      'data-r4-contact-static="true"',
      'data-contact-static-presentation',
      'data-contact-static-progress',
      'data-contact-static-form',
      'data-contact-static-summary',
      'data-contact-static-back',
      'data-contact-static-continue',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/contact/"',
      'data-site-language-enabled="false"',
      'href="/inquiry/"'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.8A Contact output is missing: '+
          marker
        );
      }
    }

    for(const [step,expectedClass] of [
      ['selection','is-complete'],
      ['contact','is-active'],
      ['review','']
    ]){
      const pattern=
        new RegExp(
          '<li[^>]*'+
          (
            expectedClass
              ? 'class="'+expectedClass+'"[^>]*'
              : ''
          )+
          'data-contact-static-step="'+
          step+
          '"',
          'i'
        );

      if(
        !pattern.test(
          html
        )
      ){
        fail(
          'R4.8A Contact progress state is incorrect: '+
          step
        );
      }
    }

    const executable=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(executable.length!==0){
      fail(
        'R4.8A Contact must remain zero-client-JS; found '+
        executable.length+
        ' executable script(s).'
      );
    }

    const fieldTags=
      stateFieldTags(
        html
      );

    const fieldIds=
      fieldTags.map(
        match=>match[1]
      );

    const canonicalFieldIds=[
      ...fieldIds
    ].sort();

    const expectedFieldIds=[
      ...EXPECTED_FIELDS
    ].sort();

    if(
      fieldTags.length!==
      EXPECTED_FIELDS.length||
      JSON.stringify(
        canonicalFieldIds
      )!==
      JSON.stringify(
        expectedFieldIds
      )
    ){
      fail(
        'R4.8A Contact field contract changed. Expected '+
        EXPECTED_FIELDS.join(', ')+
        '; found '+
        fieldIds.join(', ')+
        '.'
      );
    }

    for(const match of fieldTags){
      if(
        !/\bdisabled(?:=|>|\s)/i
          .test(
            match[0]
          )
      ){
        fail(
          'R4.8A Contact static field must remain disabled before R4.8B: '+
          match[1]
        );
      }
    }

    const continueTag=
      html.match(
        /<button\b[^>]*data-contact-static-continue[^>]*>/i
      )?.[0]||
      '';

    if(
      !continueTag||
      !/\bdisabled(?:=|>|\s)/i
        .test(
          continueTag
        )
    ){
      fail(
        'R4.8A Review Inquiry control must remain disabled before the Contact runtime stage.'
      );
    }

    if(
      html.includes(
        'href="/inquiry/review/"'
      )
    ){
      fail(
        'R4.8A Contact must not activate Review navigation.'
      );
    }

    const content=
      json(
        'data/site-content.json'
      )
        .languages
        ?.en
        ?.inquiryFlow||
      {};

    const countryCount=
      (
        html.match(
          /data-contact-static-country-option/g
        )||
        []
      ).length;

    const buyerCount=
      (
        html.match(
          /data-contact-static-buyer-option/g
        )||
        []
      ).length;

    if(
      countryCount!==
      (
        content.countryRegions
          ?.length||
        0
      )
    ){
      fail(
        'R4.8A Contact country/region option count mismatch: expected '+
        (
          content.countryRegions
            ?.length||
          0
        )+
        ', found '+
        countryCount+
        '.'
      );
    }

    if(
      buyerCount!==
      (
        content.buyerTypes
          ?.length||
        0
      )
    ){
      fail(
        'R4.8A Contact buyer-type option count mismatch: expected '+
        (
          content.buyerTypes
            ?.length||
          0
        )+
        ', found '+
        buyerCount+
        '.'
      );
    }

    for(const [key,expected] of [
      ['items','0'],
      ['quantity','0'],
      ['estimate','—']
    ]){
      const pattern=
        new RegExp(
          'data-contact-static-summary-value="'+
          key+
          '"[^>]*>\\s*'+
          (
            key==='quantity'
              ? '0\\b'
              : expected
          ),
          'i'
        );

      if(
        !pattern.test(
          html
        )
      ){
        fail(
          'R4.8A Contact honest static summary is incorrect: '+
          key
        );
      }
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-contact.js',
      'runtime-desktop-review.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'runtime-pwa.js',
      'runtime-inquiry-submission-flow.js',
      'hcaptcha',
      'startup-loader.js',
      'serviceWorker.register',
      'navigator.serviceWorker',
      'DreamlandRisk',
      'DreamlandSubmission',
      'DreamlandInquirySubmissionFlow'
    ]){
      if(
        html.includes(
          forbidden
        )
      ){
        fail(
          'R4.8A Contact output crossed a Legacy/downstream/PWA boundary: '+
          forbidden
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.8A Contact output inspection crashed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandLocalizationPolicy;

  delete globalThis
    .DreamlandInquiry;

  delete globalThis
    .DreamlandContact;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/localization/runtime-localization-policy.js'
      )
    ).href+
    '?r48a-localization='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/inquiry/runtime-inquiry.js'
      )
    ).href+
    '?r48a-inquiry='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/contact/runtime-contact.js'
      )
    ).href+
    '?r48a-contact='+
    Date.now()
  );

  const module=
    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/astro/lib/contact-view-model.mjs'
        )
      ).href+
      '?r48a-view='+
      Date.now()
    );

  const localization=
    globalThis
      .DreamlandLocalizationPolicy;

  const inquiry=
    globalThis
      .DreamlandInquiry;

  const contact=
    globalThis
      .DreamlandContact;

  if(
    !localization||
    !inquiry||
    !contact||
    contact.version!==
      'B5-06'
  ){
    fail(
      'R4.8A canonical Localization/Inquiry/Contact build-time owners are unavailable.'
    );
  }else{
    const view=
      module
        .buildContactStaticView({
          language:'en',
          siteContent:
            json(
              'data/site-content.json'
            ),
          i18n:
            json(
              'data/i18n.json'
            ),
          localizationPolicy:
            localization,
          contactFeature:
            contact,
          inquiryFeature:
            inquiry
        });

    if(
      view.guard?.name!==
        'hasInquiry'||
      view.guard?.satisfied!==
        false||
      view.summary?.itemCount!==
        0||
      view.summary?.productQuantity!==
        0||
      EXPECTED_FIELDS.some(
        field=>
          String(
            view.contact
              ?.[field]||
            ''
          ).trim()
      )
    ){
      fail(
        'R4.8A canonical empty Contact/Inquiry build-time fallback changed.'
      );
    }
  }
}catch(error){
  fail(
    'R4.8A canonical owner validation failed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/inquiry/contact/index.astro'
    );

  for(const pattern of [
    /buildContactStaticView/,
    /runtime-localization-policy\.js/,
    /features\/inquiry\/runtime-inquiry\.js/,
    /features\/contact\/runtime-contact\.js/,
    /languageEnabled=\{false\}/,
    /robots="noindex,nofollow"/,
    /canonical="https:\/\/dreamland-catalog\.pages\.dev\/inquiry\/contact\/"/
  ]){
    if(
      !pattern.test(
        page
      )
    ){
      fail(
        'R4.8A Contact source contract is incomplete: '+
        pattern
      );
    }
  }

  if(
    /<script\b/i
      .test(
        page
      )
  ){
    fail(
      'R4.8A Contact page source must remain zero-client-JS.'
    );
  }

  const viewModel=
    read(
      'src/astro/lib/contact-view-model.mjs'
    );

  for(const marker of [
    'dreamlandContactDraftV1',
    'productManualV2State',
    'buildContactStaticView',
    'contactFeature.configure',
    'inquiryFeature.configure',
    'inquiryFeature',
    'contactFeature'
  ]){
    if(
      !viewModel.includes(
        marker
      )
    ){
      fail(
        'R4.8A Contact ViewModel is missing canonical ownership marker: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'document.',
    'querySelector(',
    'localStorage',
    'sessionStorage',
    'fetch(',
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandInquirySubmissionFlow',
    'hcaptcha'
  ]){
    if(
      viewModel.includes(
        forbidden
      )
    ){
      fail(
        'R4.8A Contact build-time ViewModel crossed a browser/downstream boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.8A Contact source inspection crashed: '+
    error.message
  );
}

try{
  const routes=
    json(
      'data/page-routes.json'
    )
      .routes||
    {};

  if(
    routes.inquiry?.path!==
      '/inquiry/'||
    routes.inquiry?.public!==
      false||
    routes.contact?.path!==
      '/inquiry/contact/'||
    routes.contact?.public!==
      false||
    routes.contact?.guard!==
      'hasInquiry'||
    routes.review?.path!==
      '/inquiry/review/'||
    routes.review?.guard!==
      'hasValidContact'||
    routes.success?.path!==
      '/inquiry/success/'
  ){
    fail(
      'R4.8A Inquiry/Contact/Review/Success route contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.8A route inspection crashed: '+
    error.message
  );
}

try{
  const layout=
    read(
      'src/astro/layouts/SiteLayout.astro'
    );

  for(const marker of [
    "const isContact=",
    "page==='contact'",
    "'astro-contact-static'",
    'data-r4-astro-contact',
    'data-r4-contact-static'
  ]){
    if(
      !layout.includes(
        marker
      )
    ){
      fail(
        'R4.8A SiteLayout Contact ownership marker is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.8A SiteLayout inspection crashed: '+
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
      ?.['r4:astro:contact']!==
    'node scripts/validate-r4-astro-contact.mjs'
  ){
    fail(
      'package.json is missing r4:astro:contact.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const inquiryRuntime=
    validate.indexOf(
      'npm run r4:astro:inquiry-runtime'
    );

  const contact=
    validate.indexOf(
      'npm run r4:astro:contact'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    inquiryRuntime<0||
    contact<=inquiryRuntime||
    productionHome<=contact
  ){
    fail(
      'R4.8A Contact gate must run after Inquiry Runtime and before Production source contracts.'
    );
  }

  const productionBuild=
    String(
      pkg.scripts
        ?.build||
      ''
    );

  if(
    productionBuild.includes(
      'r4:production:contact'
    )
  ){
    fail(
      'R4.8A must not cut over Production Contact.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:astro:build']!==
    'astro build --config astro.config.mjs && node scripts/r4-copy-astro-home-assets.mjs && node scripts/r4-copy-astro-catalog-assets.mjs && node scripts/r4-copy-astro-pdp-assets.mjs && node scripts/r4-copy-astro-custom-assets.mjs && node scripts/r4-copy-astro-inquiry-assets.mjs'
  ){
    fail(
      'R4.8A must not add a fake Contact asset copier; Astro owns the static Contact document/styles directly.'
    );
  }
}catch(error){
  fail(
    'R4.8A package inspection crashed: '+
    error.message
  );
}

try{
  const foundation=
    read(
      'R4_ASTRO_FOUNDATION.md'
    );

  if(
    !foundation.includes(
      '## R4.8A — Astro Contact Static Presentation'
    )
  ){
    fail(
      'R4_ASTRO_FOUNDATION.md is missing the R4.8A Contact migration contract.'
    );
  }
}catch(error){
  fail(
    'R4.8A foundation documentation inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.8A Astro Contact Static Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.8A Astro Contact Static Presentation: PASS'
);
console.log(
  'Canonical empty Contact draft / honest empty Inquiry snapshot / 8-field business-contact presentation / exact Inquiry→Contact→Review route boundary / zero client JS verified.'
);
console.log('');

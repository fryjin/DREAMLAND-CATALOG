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

try{
  const file=
    path.join(
      OUT,
      'inquiry',
      'review',
      'index.html'
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'R4.9A Review output is missing: inquiry/review/index.html'
    );
  }else{
    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-review="true"',
      'data-r4-review-static="true"',
      'data-review-static-presentation',
      'data-review-static-progress',
      'data-review-static-contact',
      'data-review-static-products',
      'data-review-static-notice',
      'data-review-static-summary',
      'data-review-static-consent',
      'data-review-static-submit',
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
          'R4.9A Review output is missing: '+
          marker
        );
      }
    }

    const runtimeActive=
      html.includes(
        'src="/r4-review-runtime.js"'
      );

    const languageMarker=
      runtimeActive
        ? 'data-site-language-enabled="true"'
        : 'data-site-language-enabled="false"';

    if(
      !html.includes(
        languageMarker
      )
    ){
      fail(
        'R4.9A/R4.9B Review language-control state is incorrect: '+
        languageMarker
      );
    }

    for(const [
      step,
      expectedClass
    ] of [
      [
        'selection',
        'is-complete'
      ],
      [
        'contact',
        'is-complete'
      ],
      [
        'review',
        'is-active'
      ]
    ]){
      const tag=
        (
          html.match(
            new RegExp(
              '<li[^>]*data-review-static-step="'+
              step+
              '"[^>]*>',
              'i'
            )
          )||
          []
        )[0]||
        '';

      if(
        !tag||
        !tag.includes(
          expectedClass
        )
      ){
        fail(
          'R4.9A Review progress state is incorrect: '+
          step
        );
      }
    }

    const fields=[
      ...html.matchAll(
        /data-review-static-contact-field="([^"]+)"/gi
      )
    ].map(
      match=>match[1]
    );

    if(
      fields.length!==
        CONTACT_FIELDS.length||
      JSON.stringify(
        [
          ...fields
        ].sort()
      )!==
      JSON.stringify(
        [
          ...CONTACT_FIELDS
        ].sort()
      )
    ){
      fail(
        'R4.9A Review must render the canonical eight-field Contact snapshot exactly once.'
      );
    }

    const submitTag=
      (
        html.match(
          /<button[^>]*data-review-static-submit[^>]*>/i
        )||
        []
      )[0]||
      '';

    if(
      !submitTag||
      !/\bdisabled(?:=|>|\s)/i
        .test(
          submitTag
        )
    ){
      fail(
        'R4.9A Review Submit Inquiry control must remain disabled.'
      );
    }

    const consentTag=
      (
        html.match(
          /<input[^>]*type="checkbox"[^>]*>/i
        )||
        []
      )[0]||
      '';

    if(
      !consentTag||
      !/\bdisabled(?:=|>|\s)/i
        .test(
          consentTag
        )
    ){
      fail(
        'R4.9A Review privacy consent must remain inert.'
      );
    }

    const executable=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(
      executable.length>1
    ){
      fail(
        'R4.9A/R4.9B Review presentation may expose at most one dedicated route runtime; found '+
        executable.length+
        '.'
      );
    }

    if(
      executable.length===1&&
      !html.includes(
        'src="/r4-review-runtime.js"'
      )
    ){
      fail(
        'R4.9B forward-compatible Review presentation may execute only /r4-review-runtime.js.'
      );
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-review.js',
      'runtime-desktop-success.js',
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
          'R4.9A Review output crossed a Legacy/Risk/Submission/PWA boundary: '+
          forbidden
        );
      }
    }

    if(
      html.includes(
        'href="/inquiry/success/"'
      )
    ){
      fail(
        'R4.9A Review must not bypass submission with a direct Success navigation.'
      );
    }
  }
}catch(error){
  fail(
    'R4.9A Review output inspection crashed: '+
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

  delete globalThis
    .DreamlandPageGuards;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/localization/runtime-localization-policy.js'
      )
    ).href+
    '?r49a-localization='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/inquiry/runtime-inquiry.js'
      )
    ).href+
    '?r49a-inquiry='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/contact/runtime-contact.js'
      )
    ).href+
    '?r49a-contact='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/site/runtime/runtime-page-guards.js'
      )
    ).href+
    '?r49a-guards='+
    Date.now()
  );

  const module=
    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/astro/lib/review-view-model.mjs'
        )
      ).href+
      '?r49a-view='+
      Date.now()
    );

  const view=
    module
      .buildReviewStaticView({
        language:'en',
        siteContent:
          json(
            'data/site-content.json'
          ),
        localizationPolicy:
          globalThis
            .DreamlandLocalizationPolicy,
        inquiryFeature:
          globalThis
            .DreamlandInquiry,
        contactFeature:
          globalThis
            .DreamlandContact,
        pageGuards:
          globalThis
            .DreamlandPageGuards
      });

  if(
    view.guard?.name!==
      'hasValidContact'||
    view.guard?.allowed!==
      false||
    view.guard?.code!==
      'INQUIRY_REQUIRED'||
    view.guard?.target!==
      '/inquiry/'||
    view.summary?.itemCount!==
      0||
    view.summary?.productQuantity!==
      0||
    view.products?.length!==
      0||
    view.customs?.length!==
      0||
    CONTACT_FIELDS.some(
      field=>
        String(
          view.contact
            ?.[field]||
          ''
        ).trim()
    )
  ){
    fail(
      'R4.9A canonical empty Inquiry/Contact build-time Review fallback changed.'
    );
  }
}catch(error){
  fail(
    'R4.9A canonical owner validation failed: '+
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
    routes.contact?.path!==
      '/inquiry/contact/'||
    routes.contact?.guard!==
      'hasInquiry'||
    routes.review?.path!==
      '/inquiry/review/'||
    routes.review?.public!==
      false||
    routes.review?.guard!==
      'hasValidContact'||
    routes.success?.path!==
      '/inquiry/success/'||
    routes.success?.guard!==
      'hasLastSubmission'
  ){
    fail(
      'R4.9A Inquiry/Contact/Review/Success route contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.9A route inspection crashed: '+
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
      ?.['r4:astro:review']!==
    'node scripts/validate-r4-astro-review.mjs'
  ){
    fail(
      'package.json is missing r4:astro:review.'
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
      'R4.9A must not cut over Production Review.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const contactRuntime=
    validate.indexOf(
      'npm run r4:astro:contact-runtime'
    );

  const review=
    validate.indexOf(
      'npm run r4:astro:review'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    contactRuntime<0||
    review<=contactRuntime||
    productionHome<=review
  ){
    fail(
      'R4.9A Review presentation gate must run after Contact runtime and before Production source contracts.'
    );
  }
}catch(error){
  fail(
    'R4.9A package inspection crashed: '+
    error.message
  );
}

try{
  const layout=
    read(
      'src/astro/layouts/SiteLayout.astro'
    );

  for(const marker of [
    "const isReview=",
    "page==='review'",
    "'astro-review-static'",
    'data-r4-astro-review={isReview',
    'data-r4-review-static={isReview'
  ]){
    if(
      !layout.includes(
        marker
      )
    ){
      fail(
        'R4.9A SiteLayout Review marker is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.9A SiteLayout inspection crashed: '+
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
      '## R4.9A — Astro Review Static Presentation'
    )||
    !foundation.includes(
      'R4.9B will activate only the Review-route browser responsibilities'
    )
  ){
    fail(
      'R4.9A foundation handoff documentation is incomplete.'
    );
  }
}catch(error){
  fail(
    'R4.9A foundation documentation inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.9A Astro Review Static Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.9A Astro Review Static Presentation: PASS'
);
console.log(
  'Canonical honest-empty Inquiry + Contact projection / hasValidContact metadata / three-step Review presentation / inert privacy + submit / exact Review route boundary verified.'
);
console.log('');

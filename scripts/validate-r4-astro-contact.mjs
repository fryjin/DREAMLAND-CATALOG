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
        'is-active'
      ],
      [
        'review',
        ''
      ]
    ]){
      const stepTag=
        (
          html.match(
            new RegExp(
              '<li[^>]*data-contact-static-step="'+
              step+
              '"[^>]*>',
              'i'
            )
          )||
          []
        )[0]||
        '';

      if(
        !stepTag||
        (
          expectedClass&&
          !stepTag.includes(
            expectedClass
          )
        )
      ){
        fail(
          'R4.8A Contact progress state is incorrect: '+
          step
        );
      }
    }

    const fieldIds=[
      ...html.matchAll(
        /data-contact-static-field="([^"]+)"/gi
      )
    ].map(
      match=>match[1]
    );

    const expected=[
      ...EXPECTED_FIELDS
    ].sort();

    const actual=[
      ...fieldIds
    ].sort();

    if(
      fieldIds.length!==
      EXPECTED_FIELDS.length||
      JSON.stringify(
        expected
      )!==
      JSON.stringify(
        actual
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

    const executable=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(
      executable.length>1
    ){
      fail(
        'R4.8A/R4.8B Contact presentation may expose at most one dedicated route runtime; found '+
        executable.length+
        '.'
      );
    }

    if(
      executable.length===1&&
      !html.includes(
        'src="/r4-contact-runtime.js"'
      )
    ){
      fail(
        'R4.8B forward-compatible Contact presentation may execute only /r4-contact-runtime.js.'
      );
    }

    if(
      html.includes(
        'href="/inquiry/review/"'
      )
    ){
      fail(
        'Contact presentation must not bypass canonical runtime validation with a direct Review anchor.'
      );
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
          globalThis
            .DreamlandLocalizationPolicy,
        contactFeature:
          globalThis
            .DreamlandContact,
        inquiryFeature:
          globalThis
            .DreamlandInquiry
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
}catch(error){
  fail(
    'R4.8A canonical owner validation failed: '+
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

  if(
    String(
      pkg.scripts
        ?.build||
      ''
    ).includes(
      'r4:production:contact'
    )
  ){
    fail(
      'R4.8A/R4.8B must not cut over Production Contact.'
    );
  }
}catch(error){
  fail(
    'R4.8A package inspection crashed: '+
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
  'Canonical empty Contact draft / honest empty Inquiry snapshot / 8-field business-contact presentation / exact Inquiry→Contact→Review route boundary verified; R4.8B runtime activation is forward-compatible.'
);
console.log('');

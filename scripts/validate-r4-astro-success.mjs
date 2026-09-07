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

function stripTags(value){
  return String(
    value||
    ''
  )
    .replace(
      /<[^>]*>/g,
      ''
    )
    .replace(
      /&mdash;/g,
      '—'
    )
    .trim();
}

function staticValue(
  html,
  key
){
  const match=
    html.match(
      new RegExp(
        '<(?:dd|strong|span)[^>]*data-success-static-value="'+
        key+
        '"[^>]*>([\\s\\S]*?)<\\/(?:dd|strong|span)>',
        'i'
      )
    );

  return match
    ? stripTags(
        match[1]
      )
    : '';
}

try{
  const file=
    path.join(
      OUT,
      'inquiry',
      'success',
      'index.html'
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'R4.10A Success output is missing: inquiry/success/index.html'
    );
  }else{
    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-success="true"',
      'data-r4-success-static="true"',
      'data-success-static-presentation',
      'data-success-static-reference',
      'data-success-static-next',
      'data-success-static-details',
      'data-success-static-actions',
      'data-success-static-action="explore"',
      'data-success-static-action="custom"',
      'data-site-language-enabled="false"',
      'data-success-guard-name="hasLastSubmission"',
      'data-success-guard-allowed="false"',
      'data-success-guard-code="SUBMISSION_REQUIRED"',
      'data-success-guard-target="/inquiry/"',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/success/"',
      'href="/products/"',
      'href="/custom/"'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.10A Success output is missing: '+
          marker
        );
      }
    }

    for(const key of [
      'inquiryId',
      'submittedAt',
      'amountDisplay'
    ]){
      const value=
        staticValue(
          html,
          key
        );

      if(
        value!=='—'
      ){
        fail(
          'R4.10A Success must preserve an honest empty build-time placeholder for '+
          key+
          '; found "'+
          value+
          '".'
        );
      }
    }

    const executable=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(
      executable.length!==0
    ){
      fail(
        'R4.10A Success static presentation must execute zero route runtimes; found '+
        executable.length+
        '.'
      );
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'successRuntimeState',
      '/r4-success-runtime.js',
      'runtime-desktop-experience.js',
      'runtime-desktop-success.js',
      'startup-loader.js',
      'serviceWorker.register',
      'navigator.serviceWorker',
      'localStorage',
      'sessionStorage',
      'DreamlandSubmission',
      'DreamlandRisk',
      'DreamlandInquirySubmissionFlow'
    ]){
      if(
        html.includes(
          forbidden
        )
      ){
        fail(
          'R4.10A Success output crossed a Legacy/runtime/storage/submission boundary: '+
          forbidden
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.10A Success output inspection crashed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandLocalizationPolicy;

  delete globalThis
    .DreamlandPageGuards;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/localization/runtime-localization-policy.js'
      )
    ).href+
    '?r410a-localization='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/site/runtime/runtime-page-guards.js'
      )
    ).href+
    '?r410a-guards='+
    Date.now()
  );

  const module=
    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/astro/lib/success-view-model.mjs'
        )
      ).href+
      '?r410a-view='+
      Date.now()
    );

  const view=
    module
      .buildSuccessStaticView({
        language:'en',
        siteContent:
          json(
            'data/site-content.json'
          ),
        localizationPolicy:
          globalThis
            .DreamlandLocalizationPolicy,
        pageGuards:
          globalThis
            .DreamlandPageGuards
      });

  if(
    view.version!==
      'R4.10A'||
    view.guard?.name!==
      'hasLastSubmission'||
    view.guard?.allowed!==
      false||
    view.guard?.code!==
      'SUBMISSION_REQUIRED'||
    view.guard?.target!==
      '/inquiry/'||
    view.submission?.inquiryId!==
      ''||
    view.submission?.submittedAt!==
      ''||
    view.submission?.amountDisplay!==
      ''||
    view.routes?.catalog!==
      '/products/'||
    view.routes?.custom!==
      '/custom/'||
    view.copy?.whatNextSteps
      ?.length!==
      3||
    !view.copy?.successTitle||
    !view.copy?.successBody
  ){
    fail(
      'R4.10A canonical Success static view / honest-empty lastSubmission / guard metadata changed.'
    );
  }
}catch(error){
  fail(
    'R4.10A canonical owner validation failed: '+
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
    routes.review?.path!==
      '/inquiry/review/'||
    routes.review?.public!==
      false||
    routes.review?.guard!==
      'hasValidContact'||
    routes.success?.path!==
      '/inquiry/success/'||
    routes.success?.public!==
      false||
    routes.success?.guard!==
      'hasLastSubmission'
  ){
    fail(
      'R4.10A Review/Success route guard contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.10A route inspection crashed: '+
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
      ?.['r4:astro:success']!==
    'node scripts/validate-r4-astro-success.mjs'
  ){
    fail(
      'package.json is missing canonical r4:astro:success.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const reviewSubmission=
    validate.indexOf(
      'npm run r4:astro:review-submission'
    );

  const success=
    validate.indexOf(
      'npm run r4:astro:success'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    reviewSubmission<0||
    success<=reviewSubmission||
    productionHome<=success
  ){
    fail(
      'R4.10A Success presentation gate must run after Review submission and before Production source contracts.'
    );
  }

  if(
    String(
      pkg.scripts
        ?.build||
      ''
    ).includes(
      'r4:production:success'
    )||
    pkg.scripts
      ?.['r4:production:success']
  ){
    fail(
      'R4.10A must not introduce Production Success cutover.'
    );
  }

  const astroBuild=
    String(
      pkg.scripts
        ?.['r4:astro:build']||
      ''
    );

  for(const forbidden of [
    'r4-copy-astro-success',
    'r4-success-runtime'
  ]){
    if(
      astroBuild.includes(
        forbidden
      )
    ){
      fail(
        'R4.10A static Success must not add a copier/runtime build step: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.10A package inspection crashed: '+
    error.message
  );
}

try{
  const layout=
    read(
      'src/astro/layouts/SiteLayout.astro'
    );

  for(const marker of [
    'const isSuccess=',
    "page==='success'",
    "'astro-success-static'",
    'data-r4-astro-success={isSuccess',
    'data-r4-success-static={isSuccess'
  ]){
    if(
      !layout.includes(
        marker
      )
    ){
      fail(
        'R4.10A SiteLayout Success marker is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.10A SiteLayout inspection crashed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/inquiry/success/index.astro'
    );

  for(const marker of [
    'robots="noindex,nofollow"',
    'canonical="https://dreamland-catalog.pages.dev/inquiry/success/"',
    'page="success"',
    'languageEnabled={false}',
    '<SuccessPage view={view} />'
  ]){
    if(
      !page.includes(
        marker
      )
    ){
      fail(
        'R4.10A Success source is missing: '+
        marker
      );
    }
  }

  if(
    /<script\b/i.test(
      page
    )
  ){
    fail(
      'R4.10A Success page source must not add executable or serialized runtime scripts.'
    );
  }
}catch(error){
  fail(
    'R4.10A Success page source inspection crashed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  for(const marker of [
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    'const REVIEW_NAVIGATION_PATHS=',
    "'./src/ui/desktop/success/runtime-desktop-success.js'"
  ]){
    if(
      !sw.includes(
        marker
      )
    ){
      fail(
        'R4.10A protected Legacy Success/PWA boundary is missing: '+
        marker
      );
    }
  }

  if(
    sw.includes(
      'SUCCESS_NAVIGATION_PATHS'
    )||
    sw.includes(
      'successNetworkOnly('
    )||
    sw.includes(
      'purgeLegacySuccessEntries('
    )
  ){
    fail(
      'R4.10A must not detach Production Success from the Legacy Service Worker.'
    );
  }

  const legacySuccess=
    read(
      'src/ui/desktop/success/runtime-desktop-success.js'
    );

  if(
    !legacySuccess.includes(
      'root.DreamlandDesktopSuccess=Object.freeze'
    )
  ){
    fail(
      'R4.10A must preserve the Legacy Success presentation owner for Production.'
    );
  }
}catch(error){
  fail(
    'R4.10A protected Production Success boundary inspection crashed: '+
    error.message
  );
}

try{
  const foundation=
    read(
      'R4_ASTRO_FOUNDATION.md'
    );

  for(const marker of [
    '## R4.10A — Astro Success Static Presentation',
    'Production `/inquiry/success/` remains Legacy MPA-owned',
    'R4.10B'
  ]){
    if(
      !foundation.includes(
        marker
      )
    ){
      fail(
        'R4.10A foundation handoff documentation is incomplete: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.10A foundation documentation inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.10A Astro Success Static Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.10A Astro Success Static Presentation: PASS'
);
console.log(
  'Honest-empty Success projection / canonical hasLastSubmission metadata / inert localized confirmation presentation / zero route runtime / Production Legacy Success protection verified.'
);
console.log('');

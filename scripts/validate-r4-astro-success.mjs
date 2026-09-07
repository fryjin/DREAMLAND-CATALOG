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

    const runtimeActive=
      html.includes(
        'src="/r4-success-runtime.js"'
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
        'R4.10A/R4.10B Success language-control state is incorrect: '+
        languageMarker
      );
    }

    if(runtimeActive){
      if(
        !html.includes(
          'id="successRuntimeState"'
        )
      ){
        fail(
          'R4.10B forward-compatible Success output is missing successRuntimeState.'
        );
      }
    }else if(
      html.includes(
        'id="successRuntimeState"'
      )
    ){
      fail(
        'R4.10A static Success must not serialize runtime state before the runtime exists.'
      );
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
          'R4.10A static contract must preserve the honest build-time placeholder for '+
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
      executable.length>1
    ){
      fail(
        'R4.10A/R4.10B Success may expose at most one dedicated route runtime; found '+
        executable.length+
        '.'
      );
    }

    if(
      executable.length===1&&
      !runtimeActive
    ){
      fail(
        'R4.10B forward-compatible Success may execute only /r4-success-runtime.js.'
      );
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-success.js',
      'startup-loader.js',
      'serviceWorker.register',
      'navigator.serviceWorker',
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
          'R4.10A Success output crossed a Legacy/submission/PWA boundary: '+
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

  const runtimeScript=
    pkg.scripts
      ?.['r4:astro:success-runtime'];

  if(
    runtimeScript!==undefined&&
    runtimeScript!==
      'node scripts/validate-r4-astro-success-runtime.mjs'
  ){
    fail(
      'R4.10A only permits the canonical R4.10B Success runtime validator.'
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

  const successRuntime=
    validate.indexOf(
      'npm run r4:astro:success-runtime'
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
    runtimeScript&&
    (
      successRuntime<=success||
      productionHome<=successRuntime
    )
  ){
    fail(
      'R4.10B Success runtime gate must run after the R4.10A static gate and before Production source contracts.'
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
      'R4.10A/R4.10B must not introduce Production Success cutover.'
    );
  }

  const astroBuild=
    String(
      pkg.scripts
        ?.['r4:astro:build']||
      ''
    );

  const copier=
    'node scripts/r4-copy-astro-success-assets.mjs';

  const copierCount=
    astroBuild
      .split(
        copier
      ).length-1;

  if(
    copierCount>1
  ){
    fail(
      'R4.10B Success runtime copier must appear at most once.'
    );
  }

  if(
    runtimeScript&&
    copierCount!==1
  ){
    fail(
      'R4.10B Success runtime validator requires the canonical isolated Success copier.'
    );
  }
}catch(error){
  fail(
    'R4.10A package inspection crashed: '+
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

  const runtimeActive=
    page.includes(
      'src="/r4-success-runtime.js"'
    );

  if(runtimeActive){
    for(const marker of [
      'languageEnabled={true}',
      'id="successRuntimeState"',
      'type="application/json"',
      'set:html={runtimeStateJson}'
    ]){
      if(
        !page.includes(
          marker
        )
      ){
        fail(
          'R4.10B forward-compatible Success source is missing: '+
          marker
        );
      }
    }
  }else{
    if(
      !page.includes(
        'languageEnabled={false}'
      )||
      /<script\b/i.test(
        page
      )
    ){
      fail(
        'R4.10A pre-runtime Success source must remain inert.'
      );
    }
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
      'R4.10A/R4.10B must not detach Production Success from the Legacy Service Worker.'
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
      'R4.10A/R4.10B must preserve the Legacy Success presentation owner for Production.'
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

  if(
    !foundation.includes(
      '## R4.10A — Astro Success Static Presentation'
    )
  ){
    fail(
      'R4.10A foundation handoff documentation is incomplete.'
    );
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
  'Honest-empty Success projection / canonical hasLastSubmission metadata / localized confirmation presentation / Production Legacy Success protection verified with R4.10B forward compatibility.'
);
console.log('');

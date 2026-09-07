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

function runtimeStateText(html){
  const match=
    html.match(
      /<script[^>]*id="successRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="successRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
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
      'R4.10B isolated Success output is missing.'
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
      'data-site-language-enabled="true"',
      'id="successRuntimeState"',
      'src="/r4-success-runtime.js"',
      'data-success-guard-name="hasLastSubmission"',
      'data-success-guard-code="SUBMISSION_REQUIRED"',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/success/"'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.10B Success output is missing: '+
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
        'R4.10B Success must contain exactly one executable route runtime; found '+
        executable.length+
        '.'
      );
    }

    const sources=[
      ...html.matchAll(
        /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi
      )
    ].map(
      match=>match[1]
    );

    if(
      sources.length!==1||
      sources[0]!==
        '/r4-success-runtime.js'
    ){
      fail(
        'R4.10B Success executable graph must contain only /r4-success-runtime.js.'
      );
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-success.js',
      'runtime-submission.js',
      'runtime-risk.js',
      'runtime-pwa.js',
      'runtime-inquiry-submission-flow.js',
      'serviceWorker.register',
      'navigator.serviceWorker'
    ]){
      if(
        html.includes(
          forbidden
        )
      ){
        fail(
          'R4.10B Success HTML crossed a Legacy/submission/PWA boundary: '+
          forbidden
        );
      }
    }

    const raw=
      runtimeStateText(
        html
      );

    if(!raw){
      fail(
        'R4.10B successRuntimeState is missing.'
      );
    }else{
      try{
        const state=
          JSON.parse(
            raw
          );

        if(
          state.version!==
            'R4.10B'||
          JSON.stringify(
            state.languages
          )!==
            JSON.stringify([
              'en',
              'zh',
              'ko'
            ])||
          state.defaultLanguage!==
            'en'||
          state.storage
            ?.languageKey!==
            'productManualLang'||
          state.storage
            ?.lastSubmissionKey!==
            'dreamlandLastSubmissionV1'||
          state.routes
            ?.inquiry!==
            '/inquiry/'||
          state.routes
            ?.catalog!==
            '/products/'||
          state.routes
            ?.custom!==
            '/custom/'||
          state.guard!==
            'hasLastSubmission'
        ){
          fail(
            'R4.10B Success runtime-state storage/route/guard contract changed.'
          );
        }

        for(const lang of [
          'en',
          'zh',
          'ko'
        ]){
          const locale=
            state.locales
              ?.[lang];

          if(
            !locale||
            !locale.navigation||
            !locale.footer||
            !locale.copy?.successTitle||
            !locale.copy?.successBody||
            locale.copy
              ?.whatNextSteps
              ?.length!==
              3
          ){
            fail(
              'R4.10B localized Success runtime state is incomplete for '+
              lang+
              '.'
            );
          }
        }
      }catch(error){
        fail(
          'R4.10B successRuntimeState JSON is invalid: '+
          error.message
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.10B output inspection crashed: '+
    error.message
  );
}

try{
  const bundleFile=
    path.join(
      OUT,
      'r4-success-runtime.js'
    );

  if(
    !fs.existsSync(
      bundleFile
    )
  ){
    fail(
      'R4.10B isolated Success runtime bundle is missing.'
    );
  }else{
    const bundle=
      fs.readFileSync(
        bundleFile,
        'utf8'
      );

    for(const [
      marker,
      label
    ] of [
      [
        'root.DreamlandStorage=Object.freeze',
        'DreamlandStorage'
      ],
      [
        'root.DreamlandPageGuards=Object.freeze',
        'DreamlandPageGuards'
      ],
      [
        'root.DreamlandSuccessRuntime=',
        'DreamlandSuccessRuntime'
      ]
    ]){
      const count=
        bundle.split(
          marker
        ).length-1;

      if(count!==1){
        fail(
          'R4.10B runtime owner count must equal 1 for '+
          label+
          '; found '+
          count+
          '.'
        );
      }
    }

    for(const forbidden of [
      'root.DreamlandSubmission=',
      'root.DreamlandRisk=',
      'root.DreamlandInquirySubmissionFlow=',
      'root.DreamlandPwa=',
      'runtime-desktop-success.js'
    ]){
      if(
        bundle.includes(
          forbidden
        )
      ){
        fail(
          'R4.10B Success runtime bundle crossed a forbidden owner boundary: '+
          forbidden
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.10B bundle inspection crashed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/success-runtime.js'
    );

  for(const marker of [
    "const VERSION='R4.10B';",
    "'dreamlandLastSubmissionV1'",
    "pageGuards.evaluate(\n        'success'",
    'record?.inquiryId||\n        record?.clientInquiryId',
    'record?.amountDisplay||\n          record?.estimatedTotalDisplay',
    'new Date(',
    'toLocaleDateString(',
    'root.location\n        ?.replace?.(',
    '[data-home-language-select]',
    'root.DreamlandSuccessRuntime='
  ]){
    if(
      !runtime.includes(
        marker
      )
    ){
      fail(
        'R4.10B Success runtime source is missing: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'localStorage',
    'sessionStorage',
    'fetch(',
    'XMLHttpRequest',
    'DreamlandSubmission',
    'DreamlandRisk',
    'DreamlandInquirySubmissionFlow',
    'DreamlandPwa',
    'navigator.serviceWorker',
    'serviceWorker.register'
  ]){
    if(
      runtime.includes(
        forbidden
      )
    ){
      fail(
        'R4.10B minimal Success adapter crossed a forbidden boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.10B Success runtime source inspection crashed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandLocalizationPolicy;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/localization/runtime-localization-policy.js'
      )
    ).href+
    '?r410b-localization='+
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
      '?r410b-view='+
      Date.now()
    );

  const state=
    module
      .buildSuccessRuntimeState({
        languages:[
          'en',
          'zh',
          'ko'
        ],
        defaultLanguage:'en',
        siteContent:
          json(
            'data/site-content.json'
          ),
        localizationPolicy:
          globalThis
            .DreamlandLocalizationPolicy
      });

  if(
    state.version!==
      'R4.10B'||
    state.storage
      ?.lastSubmissionKey!==
      'dreamlandLastSubmissionV1'||
    state.guard!==
      'hasLastSubmission'||
    !state.locales
      ?.en
      ?.copy
      ?.successTitle||
    !state.locales
      ?.zh
      ?.copy
      ?.successTitle||
    !state.locales
      ?.ko
      ?.copy
      ?.successTitle
  ){
    fail(
      'R4.10B Success runtime-state builder changed.'
    );
  }
}catch(error){
  fail(
    'R4.10B runtime-state builder validation failed: '+
    error.message
  );
}

try{
  const submissionFlow=
    read(
      'src/app/runtime-inquiry-submission-flow.js'
    );

  for(const marker of [
    "lastSubmissionKey:\n      'dreamlandLastSubmissionV1'",
    'storage.setItem(\n      config.lastSubmissionKey',
    'archive(\n        record',
    'clearSubmittedState();'
  ]){
    if(
      !submissionFlow.includes(
        marker
      )
    ){
      fail(
        'Canonical submission flow no longer preserves the lastSubmission handoff: '+
        marker
      );
    }
  }

  const pageGuards=
    read(
      'src/site/runtime/runtime-page-guards.js'
    );

  for(const marker of [
    'function hasLastSubmission(',
    "name==='success'&&",
    "'SUBMISSION_REQUIRED'"
  ]){
    if(
      !pageGuards.includes(
        marker
      )
    ){
      fail(
        'Canonical hasLastSubmission guard changed: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.10B canonical handoff inspection failed: '+
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
      'node scripts/validate-r4-astro-success.mjs'||
    pkg.scripts
      ?.['r4:astro:success-runtime']!==
      'node scripts/validate-r4-astro-success-runtime.mjs'
  ){
    fail(
      'package.json is missing the canonical R4.10A/B Success gates.'
    );
  }

  const astroBuild=
    String(
      pkg.scripts
        ?.['r4:astro:build']||
      ''
    );

  if(
    !astroBuild.endsWith(
      'node scripts/r4-copy-astro-success-assets.mjs'
    )
  ){
    fail(
      'R4.10B Success runtime copier must be the final isolated Astro asset step.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const success=
    validate.indexOf(
      'npm run r4:astro:success'
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:success-runtime'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    success<0||
    runtime<=success||
    productionHome<=runtime
  ){
    fail(
      'R4.10B Success runtime gate must run after R4.10A and before Production source contracts.'
    );
  }

  const CANONICAL_R410C_SUCCESS_PROMOTION=
    'node scripts/r4-promote-astro-success.mjs --write';

  const productionSuccessScript=
    pkg.scripts
      ?.['r4:production:success'];

  const productionSuccessInBuild=
    String(
      pkg.scripts
        ?.build||
      ''
    ).includes(
      'npm run r4:production:success'
    );

  if(
    productionSuccessScript!==undefined||
    productionSuccessInBuild
  ){
    if(
      productionSuccessScript!==
        CANONICAL_R410C_SUCCESS_PROMOTION||
      !productionSuccessInBuild||
      pkg.scripts
        ?.['r4:production:success:contract']!==
        'node scripts/validate-r4-production-success-cutover.mjs --source'||
      ![
        'node scripts/validate-r4-production-success-cutover.mjs --dist',
        'node scripts/validate-r4-production-success-cutover.mjs --dist && node scripts/validate-r4-production-success-detachment.mjs --dist'
      ].includes(
        pkg.scripts
          ?.['r4:production:success:validate']
      )
    ){
      fail(
        'R4.10B only permits the exact canonical R4.10C Production Success cutover.'
      );
    }
  }
}catch(error){
  fail(
    'R4.10B package inspection crashed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

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
      'R4.10B must not detach Production Success from the Legacy Service Worker.'
    );
  }

  if(
    !read(
      'src/ui/desktop/success/runtime-desktop-success.js'
    ).includes(
      'root.DreamlandDesktopSuccess=Object.freeze'
    )
  ){
    fail(
      'R4.10B must preserve the Legacy Success presentation owner for Production.'
    );
  }
}catch(error){
  fail(
    'R4.10B Production protection inspection crashed: '+
    error.message
  );
}

try{
  const foundation=
    read(
      'R4_ASTRO_FOUNDATION.md'
    );

  for(const marker of [
    '## R4.10B — Success Runtime / hasLastSubmission Guard',
    'dreamlandLastSubmissionV1',
    'Production `/inquiry/success/` remains Legacy MPA-owned'
  ]){
    if(
      !foundation.includes(
        marker
      )
    ){
      fail(
        'R4.10B foundation handoff documentation is incomplete: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.10B foundation documentation inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.10B Success Runtime / hasLastSubmission Guard: FAIL'
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
  'DREAMLAND B7-00B.4J R4.10B Success Runtime / hasLastSubmission Guard: PASS'
);
console.log(
  'Canonical safe storage + dreamlandLastSubmissionV1 handoff / hasLastSubmission redirect / localized live confirmation projection / active Success actions / Production Legacy Success protection verified.'
);
console.log('');

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

const REQUIRED_ASTRO_BUILD_STEPS=Object.freeze([
  'astro build --config astro.config.mjs',
  'node scripts/r4-copy-astro-home-assets.mjs',
  'node scripts/r4-copy-astro-catalog-assets.mjs',
  'node scripts/r4-copy-astro-pdp-assets.mjs',
  'node scripts/r4-copy-astro-custom-assets.mjs',
  'node scripts/r4-copy-astro-inquiry-assets.mjs'
]);

function astroBuildHasOrderedSteps(value){
  const build=String(value||'');
  let cursor=-1;
  for(const step of REQUIRED_ASTRO_BUILD_STEPS){
    const index=build.indexOf(step);
    if(index<0||index<=cursor)return false;
    cursor=index;
  }
  return true;
}

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
  const file=
    path.join(
      OUT,
      'inquiry',
      'index.html'
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'R4.7B Inquiry output is missing: inquiry/index.html'
    );
  }else{
    const html=
      fs.readFileSync(
        file,
        'utf8'
      );

    for(const marker of [
      'data-r4-astro-foundation="true"',
      'data-r4-astro-inquiry="true"',
      'data-r4-inquiry-static="true"',
      'data-inquiry-static-presentation',
      'data-inquiry-runtime-presentation',
      'data-inquiry-static-progress',
      'data-inquiry-static-empty',
      'data-inquiry-items',
      'data-inquiry-clear',
      'data-inquiry-static-summary',
      'data-inquiry-static-continue',
      'data-inquiry-continue',
      'id="inquiryRuntimeState"',
      'src="/r4-inquiry-runtime.js"',
      'href="/products/"',
      'href="/custom/"',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/"',
      'data-site-language-enabled="true"'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.7B Inquiry output is missing: '+
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
        'R4.7B Inquiry must expose exactly one executable route runtime; found '+
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
        '/r4-inquiry-runtime.js'
    ){
      fail(
        'R4.7B Inquiry executable graph must contain only /r4-inquiry-runtime.js.'
      );
    }

    const raw=
      stateText(
        html
      );

    if(!raw){
      fail(
        'R4.7B inquiryRuntimeState is missing.'
      );
    }else{
      try{
        const state=
          JSON.parse(
            raw
          );

        if(
          state.version!=='R4.7B'||
          state.storage?.languageKey!==
            'productManualLang'||
          state.storage?.inquiryKey!==
            'productManualV2State'||
          state.storage?.inquiryVersion!==2||
          state.routes?.contact!==
            '/inquiry/contact/'||
          state.products?.length!==89
        ){
          fail(
            'R4.7B Inquiry runtime-state contract is incorrect.'
          );
        }

        for(const language of [
          'en',
          'zh',
          'ko'
        ]){
          const view=
            state.languages
              ?.[language];

          if(
            !view?.content
              ?.navigation||
            !view?.content
              ?.footer||
            !view?.copy
              ?.title||
            !view?.copy
              ?.continueContact
          ){
            fail(
              'R4.7B Inquiry localized runtime state is incomplete: '+
              language
            );
          }

          for(const downstream of [
            'contactTitle',
            'reviewTitle',
            'confirmSubmit',
            'captchaLabel'
          ]){
            if(
              Object.prototype
                .hasOwnProperty
                .call(
                  view?.copy||
                  {},
                  downstream
                )
            ){
              fail(
                'R4.7B Inquiry state leaked downstream Contact/Review/Submission copy: '+
                downstream
              );
            }
          }
        }
      }catch(error){
        fail(
          'R4.7B inquiryRuntimeState JSON is invalid: '+
          error.message
        );
      }
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-inquiry.js',
      'runtime-contact.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'runtime-pwa.js',
      'runtime-inquiry-submission-flow.js',
      'hcaptcha',
      'startup-loader.js',
      'DreamlandContact',
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
          'R4.7B Inquiry output crossed a Legacy/downstream boundary: '+
          forbidden
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.7B Inquiry output inspection crashed: '+
    error.message
  );
}

try{
  delete globalThis
    .DreamlandLocalizationPolicy;

  delete globalThis
    .DreamlandInquiry;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/localization/runtime-localization-policy.js'
      )
    ).href+
    '?r47b-localization='+
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

  const localization=
    globalThis
      .DreamlandLocalizationPolicy;

  const inquiry=
    globalThis
      .DreamlandInquiry;

  if(
    !localization||
    !inquiry||
    inquiry.version!==
      'B5-05'
  ){
    fail(
      'R4.7B canonical Localization/Inquiry build-time owners are unavailable.'
    );
  }else{
    inquiry.configure({
      storage:null,
      storageKey:
        'productManualV2State',
      version:2
    });

    const view=
      inquiry
        .buildViewModel();

    if(
      !view?.empty||
      view.summary?.itemCount!==0
    ){
      fail(
        'R4.7B static fallback must preserve canonical empty-state parity.'
      );
    }

    for(const method of [
      'productMoqGroups',
      'firstUnmetProductMoqGroup'
    ]){
      if(
        typeof inquiry[method]!==
        'function'
      ){
        fail(
          'R4.7B canonical DreamlandInquiry MOQ group owner is missing: '+
          method
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.7B canonical owner validation failed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/inquiry/index.astro'
    );

  for(const pattern of [
    /buildInquiryRuntimeState/,
    /mapInquiryScents/,
    /product-data-contract\.js/,
    /runtime-localization-policy\.js/,
    /features\/inquiry\/runtime-inquiry\.js/,
    /languageEnabled=\{true\}/,
    /id="inquiryRuntimeState"/,
    /src="\/r4-inquiry-runtime\.js"/,
    /robots="noindex,nofollow"/
  ]){
    if(
      !pattern.test(
        page
      )
    ){
      fail(
        'R4.7B Inquiry source contract is incomplete: '+
        pattern
      );
    }
  }

  for(const forbidden of [
    'runtime-contact',
    'runtime-risk',
    'runtime-submission',
    'hcaptcha',
    'InquirySubmissionFlow'
  ]){
    if(
      page.includes(
        forbidden
      )
    ){
      fail(
        'R4.7B Inquiry source crossed a downstream conversion boundary: '+
        forbidden
      );
    }
  }

  const viewModel=
    read(
      'src/astro/lib/inquiry-view-model.mjs'
    );

  for(const marker of [
    "version:'R4.7B'",
    "languageKey:",
    "'productManualLang'",
    "inquiryKey:",
    "'productManualV2State'",
    'buildInquiryRuntimeState',
    'mapInquiryScents',
    'compactInquiryCopy'
  ]){
    if(
      !viewModel.includes(
        marker
      )
    ){
      fail(
        'R4.7B Inquiry ViewModel/runtime-state source is missing: '+
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
    'DreamlandContact',
    'DreamlandRisk',
    'DreamlandSubmission'
  ]){
    if(
      viewModel.includes(
        forbidden
      )
    ){
      fail(
        'R4.7B Inquiry build-time ViewModel crossed a browser/downstream boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.7B source inspection crashed: '+
    error.message
  );
}

try{
  const routes=
    json(
      'data/page-routes.json'
    );

  if(
    routes.routes?.inquiry?.path!==
      '/inquiry/'||
    routes.routes?.inquiry?.public!==
      false||
    routes.routes?.contact?.path!==
      '/inquiry/contact/'||
    routes.routes?.contact?.guard!==
      'hasInquiry'||
    routes.routes?.review?.path!==
      '/inquiry/review/'||
    routes.routes?.success?.path!==
      '/inquiry/success/'
  ){
    fail(
      'R4.7B Inquiry/Contact/Review/Success route contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.7B route inspection crashed: '+
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
      ?.['r4:astro:inquiry']!==
    'node scripts/validate-r4-astro-inquiry.mjs'||
    pkg.scripts
      ?.['r4:astro:inquiry-runtime']!==
    'node scripts/validate-r4-astro-inquiry-runtime.mjs'
  ){
    fail(
      'package.json is missing R4.7B Inquiry presentation/runtime gates.'
    );
  }

  if(
    !astroBuildHasOrderedSteps(pkg.scripts?.['r4:astro:build'])
  ){
    fail(
      'R4.7B isolated Astro build must append the Inquiry runtime asset copier.'
    );
  }
const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const inquiry=
    validate.indexOf(
      'npm run r4:astro:inquiry'
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:inquiry-runtime'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    inquiry<0||
    runtime<=inquiry||
    productionHome<=runtime
  ){
    fail(
      'R4.7B Inquiry Runtime gate must run after Inquiry presentation and before Production source contracts.'
    );
  }
}catch(error){
  fail(
    'R4.7B package inspection crashed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  /*
   * R4.7B owns the isolated Inquiry presentation/runtime contract only.
   * Production Service Worker ownership is intentionally delegated to the
   * current Production detachment stage (R4.7D and later).
   */
  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v129';"
    )
  ){
    fail(
      'R4.7B unexpectedly changed the PWA cache/release baseline.'
    );
  }
}catch(error){
  fail(
    'R4.7B Service Worker baseline inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.7B Inquiry Minimal Runtime Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.7B Inquiry Minimal Runtime Presentation: PASS'
);
console.log(
  'Isolated Inquiry owns one route runtime + non-executable state, real shared Inquiry hydration, localized presentation contract and Legacy downstream conversion boundary.'
);
console.log('');

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

function count(
  source,
  pattern
){
  return [
    ...source.matchAll(
      pattern
    )
  ].length;
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
      'R4.7A Inquiry output is missing: inquiry/index.html'
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
      'data-inquiry-static-progress',
      'data-inquiry-static-empty',
      'data-inquiry-static-summary',
      'data-inquiry-static-continue',
      'data-inquiry-static-explore',
      'data-inquiry-static-custom',
      'href="/products/"',
      'href="/custom/"',
      'name="robots" content="noindex,nofollow"',
      'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/"',
      'data-site-language-enabled="false"'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'R4.7A Inquiry output is missing: '+
          marker
        );
      }
    }

    for(const [key,expected] of [
      [
        'items',
        '0'
      ],
      [
        'quantity',
        '0'
      ],
      [
        'custom',
        '0'
      ],
      [
        'estimate',
        '—'
      ]
    ]){
      const pattern=
        new RegExp(
          'data-inquiry-static-summary-value="'+
          key+
          '"[^>]*>\\s*'+
          expected
            .replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            )+
          '\\s*<',
          'i'
        );

      if(
        !pattern.test(
          html
        )
      ){
        fail(
          'R4.7A Inquiry static summary must remain an honest empty shell: '+
          key+
          '='+
          expected
        );
      }
    }

    const continueTag=
      (
        html.match(
          /<button\b[^>]*data-inquiry-static-continue[^>]*>/i
        )||
        []
      )[0]||
      '';

    if(
      !continueTag||
      !/\bdisabled(?:=""|="disabled"|\s|>)/i
        .test(
          continueTag
        )
    ){
      fail(
        'R4.7A Continue-to-Contact control must remain disabled until R4.7B.'
      );
    }

    for(const forbidden of [
      'DREAMLAND_MPA_ACTIVE',
      'runtime-desktop-experience.js',
      'runtime-desktop-inquiry.js',
      'runtime-inquiry.js',
      'runtime-contact.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'runtime-pwa.js',
      'runtime-inquiry-submission-flow.js',
      'hcaptcha',
      'startup-loader.js',
      'localStorage',
      'sessionStorage',
      'DreamlandRisk',
      'DreamlandSubmission',
      'DreamlandContact'
    ]){
      if(
        html.includes(
          forbidden
        )
      ){
        fail(
          'R4.7A Inquiry output crossed a Legacy/submission/runtime boundary: '+
          forbidden
        );
      }
    }

    if(
      /<script\b/i.test(
        html
      )
    ){
      fail(
        'R4.7A Inquiry presentation must remain zero-client-JS.'
      );
    }

    if(
      count(
        html,
        /<li\b[^>]*class="is-active"[^>]*>/gi
      )!==1
    ){
      fail(
        'R4.7A Inquiry progress must expose exactly one active step.'
      );
    }
  }
}catch(error){
  fail(
    'R4.7A output inspection crashed: '+
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
    '?r47a-localization='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/inquiry/runtime-inquiry.js'
      )
    ).href+
    '?r47a-inquiry='+
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
      'R4.7A canonical Localization/Inquiry build-time owners are unavailable.'
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
      view.summary?.itemCount!==0||
      view.summary?.productCount!==0||
      view.summary?.customCount!==0||
      view.summary?.productQuantity!==0
    ){
      fail(
        'R4.7A canonical DreamlandInquiry empty-state parity failed.'
      );
    }

    const localized=
      localization
        .localizedContent(
          'en',
          json(
            'data/site-content.json'
          )
        );

    if(
      !localized
        ?.inquiryFlow
        ?.title||
      !localized
        ?.inquiryFlow
        ?.emptyTitle||
      !localized
        ?.inquiryFlow
        ?.continueContact
    ){
      fail(
        'R4.7A localized Inquiry presentation copy is unavailable.'
      );
    }
  }
}catch(error){
  fail(
    'R4.7A canonical owner validation failed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/inquiry/index.astro'
    );

  for(const pattern of [
    /SiteLayout/,
    /SiteHeader/,
    /SiteFooter/,
    /InquiryPage/,
    /buildInquiryStaticView/,
    /runtime-localization-policy\.js/,
    /features\/inquiry\/runtime-inquiry\.js/,
    /page="inquiry"/,
    /languageEnabled=\{false\}/,
    /robots="noindex,nofollow"/
  ]){
    if(
      !pattern.test(
        page
      )
    ){
      fail(
        'R4.7A Inquiry source contract is incomplete: '+
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
        'R4.7A Inquiry source crossed a downstream conversion boundary: '+
        forbidden
      );
    }
  }

  const viewModel=
    read(
      'src/astro/lib/inquiry-view-model.mjs'
    );

  for(const pattern of [
    /localizationPolicy\s*\.\s*localizedContent/,
    /inquiryFeature\s*\.\s*configure/,
    /inquiryFeature\s*\.\s*buildViewModel/,
    /storage\s*:\s*null/,
    /productManualV2State/
  ]){
    if(
      !pattern.test(
        viewModel
      )
    ){
      fail(
        'R4.7A Inquiry ViewModel delegation is missing: '+
        pattern
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
        'R4.7A Inquiry ViewModel crossed a browser/submission boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.7A source inspection crashed: '+
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
    routes.routes?.review?.path!==
      '/inquiry/review/'||
    routes.routes?.success?.path!==
      '/inquiry/success/'
  ){
    fail(
      'R4.7A Inquiry/Contact/Review/Success route contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.7A route inspection crashed: '+
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
    'node scripts/validate-r4-astro-inquiry.mjs'
  ){
    fail(
      'package.json is missing r4:astro:inquiry.'
    );
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const customRuntime=
    validate.indexOf(
      'npm run r4:astro:custom-runtime'
    );

  const inquiry=
    validate.indexOf(
      'npm run r4:astro:inquiry'
    );

  const productionHome=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    customRuntime<0||
    inquiry<=customRuntime||
    productionHome<=inquiry
  ){
    fail(
      'R4.7A Inquiry gate must run after Custom Runtime and before Production source contracts.'
    );
  }

  if(
    pkg.scripts?.build!==
    'npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:pdp && npm run r4:production:custom && npm run r4:production:home:validate && npm run r4:production:catalog:validate && npm run r4:production:pdp:validate && npm run r4:production:custom:validate'
  ){
    fail(
      'R4.7A must not change Production Inquiry ownership.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:inquiry']||
    pkg.scripts
      ?.['r4:production:inquiry:validate']
  ){
    fail(
      'R4.7A must not add a Production Inquiry promotion script.'
    );
  }
}catch(error){
  fail(
    'R4.7A package inspection crashed: '+
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
      'INQUIRY_NAVIGATION_PATHS'
    )||
    sw.includes(
      'isInquiryNavigation('
    )
  ){
    fail(
      'R4.7A must not change Service Worker Inquiry ownership.'
    );
  }

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v129';"
    )
  ){
    fail(
      'R4.7A unexpectedly changed the PWA cache/release baseline.'
    );
  }
}catch(error){
  fail(
    'R4.7A Service Worker ownership inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.7A Astro Inquiry Static Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.7A Astro Inquiry Static Presentation: PASS'
);
console.log(
  'Canonical zero-item Inquiry ViewModel / localized Inquiry copy / selection-flow shell / honest empty summary / inert Contact continuation / zero-client-JS / no Production cutover verified.'
);
console.log('');

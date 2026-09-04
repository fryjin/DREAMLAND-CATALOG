#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  ),
  '..'
);

const SOURCE_MODE=
  process.argv.includes(
    '--source'
  );

const DIST_MODE=
  process.argv.includes(
    '--dist'
  );

if(
  SOURCE_MODE===
  DIST_MODE
){
  console.error(
    'Usage: node scripts/validate-r4-production-contact-cutover.mjs --source | --dist'
  );
  process.exit(1);
}

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

const REQUIRED_BUILD_STEPS=Object.freeze([
  'npm run data:build',
  'npm run build:pages',
  'npm run r4:astro:build',
  'npm run r4:production:home',
  'npm run r4:production:catalog',
  'npm run r4:production:pdp',
  'npm run r4:production:custom',
  'npm run r4:production:inquiry',
  'npm run r4:production:contact',
  'npm run r4:production:home:validate',
  'npm run r4:production:catalog:validate',
  'npm run r4:production:pdp:validate',
  'npm run r4:production:custom:validate',
  'npm run r4:production:inquiry:validate',
  'npm run r4:production:contact:validate'
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

function expectFile(
  root,
  relative
){
  const file=
    path.join(
      root,
      relative
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'Missing file: '+
      path.relative(
        ROOT,
        file
      )
    );

    return '';
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}

function orderedSteps(
  value,
  steps
){
  const actual=
    String(
      value||
      ''
    )
      .split(
        ' && '
      )
      .map(
        step=>
          step.trim()
      )
      .filter(
        Boolean
      );

  let previous=-1;

  for(const step of steps){
    const index=
      actual.indexOf(
        step
      );

    if(
      index<0||
      index<=previous
    ){
      return false;
    }

    previous=index;
  }

  return true;
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

function validateContactDocument(
  root,
  label
){
  const html=
    expectFile(
      root,
      'inquiry/contact/index.html'
    );

  if(!html){
    return;
  }

  for(const marker of [
    'data-r4-astro-foundation="true"',
    'data-r4-astro-contact="true"',
    'data-r4-contact-static="true"',
    'data-contact-runtime-presentation',
    'name="robots" content="noindex,nofollow"',
    'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/contact/"',
    'id="contactRuntimeState"',
    'src="/r4-contact-runtime.js"',
    'data-site-language-enabled="true"',
    'href="/inquiry/"'
  ]){
    if(
      !html.includes(
        marker
      )
    ){
      fail(
        label+
        ' is missing: '+
        marker
      );
    }
  }

  for(const legacy of [
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
        legacy
      )
    ){
      fail(
        label+
        ' crossed a Legacy/downstream/PWA boundary: '+
        legacy
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
      label+
      ' must contain exactly one executable route runtime; found '+
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
      label+
      ' executable graph must contain only /r4-contact-runtime.js.'
    );
  }

  const raw=
    stateText(
      html
    );

  if(!raw){
    fail(
      label+
      ' runtime state is missing.'
    );
  }else{
    try{
      const state=
        JSON.parse(
          raw
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
          label+
          ' runtime-state ownership/storage/route contract changed.'
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
          !locale.content
            ?.navigation||
          !locale.content
            ?.footer||
          !Array.isArray(
            locale.copy
              .countryRegions
          )||
          !Array.isArray(
            locale.copy
              .buyerTypes
          )
        ){
          fail(
            label+
            ' runtime locale is incomplete: '+
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
          label+
          ' runtime pricing/currency state is incomplete.'
        );
      }
    }catch(error){
      fail(
        label+
        ' runtime state JSON is invalid: '+
        error.message
      );
    }
  }

  if(
    !fs.existsSync(
      path.join(
        root,
        'r4-contact-runtime.js'
      )
    )
  ){
    fail(
      label+
      ' shared Contact runtime is missing.'
    );
  }

  const stylePaths=[
    ...new Set(
      [
        ...html.matchAll(
          /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi
        ),
        ...html.matchAll(
          /<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="stylesheet"[^>]*>/gi
        )
      ].map(
        match=>match[1]
      )
    )
  ];

  if(
    stylePaths.length<1||
    stylePaths.length>3
  ){
    fail(
      label+
      ' should reference 1-3 Astro stylesheet assets; found '+
      stylePaths.length+
      '.'
    );
  }

  for(const href of stylePaths){
    const relative=
      href
        .replace(
          /[?#].*$/,
          ''
        )
        .replace(
          /^\/+/,
          ''
        );

    if(
      !fs.existsSync(
        path.join(
          root,
          relative
        )
      )
    ){
      fail(
        label+
        ' stylesheet is missing: '+
        href
      );
    }
  }
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    !orderedSteps(
      pkg.scripts
        ?.build,
      REQUIRED_BUILD_STEPS
    )
  ){
    fail(
      'Production build must promote Contact after Inquiry and validate Contact after the previously CLOSED Production route gates.'
    );
  }

  for(const [
    name,
    value
  ] of [
    [
      'r4:production:contact',
      'node scripts/r4-promote-astro-contact.mjs --write'
    ],
    [
      'r4:production:contact:contract',
      'node scripts/validate-r4-production-contact-cutover.mjs --source'
    ],
    [
      'r4:production:contact:validate',
      'node scripts/validate-r4-production-contact-cutover.mjs --dist'
    ]
  ]){
    if(
      pkg.scripts
        ?.[name]!==
      value
    ){
      fail(
        'package.json is missing '+
        name+
        '.'
      );
    }
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:contact-runtime'
    );

  const inquiryDetachment=
    validate.indexOf(
      'npm run r4:production:inquiry:detachment'
    );

  const contactContract=
    validate.indexOf(
      'npm run r4:production:contact:contract'
    );

  if(
    runtime<0||
    inquiryDetachment<0||
    contactContract<=runtime||
    contactContract<=inquiryDetachment
  ){
    fail(
      'R4.8C Contact Production contract must run after Contact Runtime and the completed Inquiry detachment source gate.'
    );
  }
}catch(error){
  fail(
    'R4.8C package inspection failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'scripts/r4-promote-astro-contact.mjs'
    );

  for(const marker of [
    "'.r4-astro-dist'",
    "'dist'",
    "'contact'",
    "'r4-contact-runtime.js'",
    "contact:",
    "'astro-r4.8c'",
    'manifest.contactOwner=',
    'manifest.contactCutover=',
    'runtimeState(',
    'data-r4-production-home="true"',
    'data-r4-astro-catalog="true"',
    'data-r4-astro-product="true"',
    'data-r4-astro-custom="true"',
    'data-r4-astro-inquiry="true"',
    "'inquiry/review/index.html'",
    "'inquiry/success/index.html'",
    "'sw.js'"
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        'Contact promotion contract is missing: '+
        marker
      );
    }
  }

  if(
    /fs\.cpSync\s*\(\s*SOURCE_ROOT\s*,\s*TARGET_ROOT/
      .test(
        source
      )
  ){
    fail(
      'R4.8C Contact promotion must remain route-scoped and must not copy the whole Astro output.'
    );
  }
}catch(error){
  fail(
    'R4.8C promotion source inspection failed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/inquiry/contact/index.astro'
    );

  for(const marker of [
    'robots="noindex,nofollow"',
    'canonical="https://dreamland-catalog.pages.dev/inquiry/contact/"',
    'id="contactRuntimeState"',
    'src="/r4-contact-runtime.js"',
    'languageEnabled={true}'
  ]){
    if(
      !page.includes(
        marker
      )
    ){
      fail(
        'Astro Contact Production source is missing: '+
        marker
      );
    }
  }

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
      'R4.8C Inquiry/Contact/Review/Success route contract changed.'
    );
  }
}catch(error){
  fail(
    'R4.8C Astro/route source inspection failed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v129';"
    )
  ){
    fail(
      'R4.8C unexpectedly changed the PWA cache/release baseline.'
    );
  }

  if(
    sw.includes(
      'CONTACT_NAVIGATION_PATHS'
    )||
    sw.includes(
      'isContactNavigation('
    )
  ){
    fail(
      'R4.8C must not detach Contact from Service Worker ownership; that belongs to R4.8D.'
    );
  }
}catch(error){
  fail(
    'R4.8C Service Worker boundary inspection failed: '+
    error.message
  );
}

try{
  if(
    !read(
      'R4_ASTRO_FOUNDATION.md'
    ).includes(
      '## R4.8C — Production Contact Cutover'
    )
  ){
    fail(
      'R4_ASTRO_FOUNDATION.md is missing the R4.8C Production Contact cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.8C foundation documentation inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  validateContactDocument(
    path.join(
      ROOT,
      '.r4-astro-dist'
    ),
    'Isolated Contact'
  );
}

if(DIST_MODE){
  const root=
    path.join(
      ROOT,
      'dist'
    );

  validateContactDocument(
    root,
    'Production Contact'
  );

  const home=
    expectFile(
      root,
      'index.html'
    );

  if(
    home&&
    (
      !home.includes(
        'data-r4-production-home="true"'
      )||
      !home.includes(
        'src="/r4-home-runtime.js"'
      )||
      home.includes(
        'DREAMLAND_MPA_ACTIVE'
      )
    )
  ){
    fail(
      'Production Home ownership changed during R4.8C.'
    );
  }

  const catalog=
    expectFile(
      root,
      'products/index.html'
    );

  if(
    catalog&&
    (
      !catalog.includes(
        'data-r4-astro-catalog="true"'
      )||
      !catalog.includes(
        'src="/r4-catalog-runtime.js"'
      )||
      catalog.includes(
        'DREAMLAND_MPA_ACTIVE'
      )
    )
  ){
    fail(
      'Production Catalog ownership changed during R4.8C.'
    );
  }

  const products=
    json(
      'data/products.json'
    )
      .products||
    [];

  const active=
    products.filter(
      product=>
        product?.status===
        'active'
    );

  if(
    active.length!==89
  ){
    fail(
      'R4.8C expected 89 active Products for Production PDP ownership; found '+
      active.length+
      '.'
    );
  }else{
    for(const product of active){
      const productId=
        String(
          product?.productId||
          product?.id||
          ''
        )
          .trim()
          .toUpperCase();

      const pdp=
        expectFile(
          root,
          path.join(
            'products',
            productId,
            'index.html'
          )
        );

      if(
        pdp&&
        (
          !pdp.includes(
            'data-r4-astro-product="true"'
          )||
          !pdp.includes(
            'src="/r4-pdp-runtime.js"'
          )||
          pdp.includes(
            'DREAMLAND_MPA_ACTIVE'
          )
        )
      ){
        fail(
          'Production PDP ownership changed during R4.8C: '+
          productId
        );
      }
    }
  }

  const custom=
    expectFile(
      root,
      'custom/index.html'
    );

  if(
    custom&&
    (
      !custom.includes(
        'data-r4-astro-custom="true"'
      )||
      !custom.includes(
        'src="/r4-custom-runtime.js"'
      )||
      custom.includes(
        'DREAMLAND_MPA_ACTIVE'
      )
    )
  ){
    fail(
      'Production Custom ownership changed during R4.8C.'
    );
  }

  const inquiry=
    expectFile(
      root,
      'inquiry/index.html'
    );

  if(
    inquiry&&
    (
      !inquiry.includes(
        'data-r4-astro-inquiry="true"'
      )||
      !inquiry.includes(
        'src="/r4-inquiry-runtime.js"'
      )||
      inquiry.includes(
        'DREAMLAND_MPA_ACTIVE'
      )
    )
  ){
    fail(
      'Production Inquiry ownership changed during R4.8C.'
    );
  }

  for(const relative of [
    'inquiry/review/index.html',
    'inquiry/success/index.html'
  ]){
    const html=
      expectFile(
        root,
        relative
      );

    if(
      html&&
      !html.includes(
        'window.DREAMLAND_MPA_ACTIVE=true;'
      )
    ){
      fail(
        'Downstream conversion route must remain Legacy MPA during R4.8C: '+
        relative
      );
    }
  }

  const manifest=
    JSON.parse(
      expectFile(
        root,
        'multipage-build-manifest.json'
      )||
      '{}'
    );

  for(const [
    key,
    expected
  ] of [
    [
      'homeOwner',
      'astro'
    ],
    [
      'catalogOwner',
      'astro'
    ],
    [
      'pdpOwner',
      'astro'
    ],
    [
      'customOwner',
      'astro'
    ],
    [
      'inquiryOwner',
      'astro'
    ],
    [
      'contactOwner',
      'astro'
    ]
  ]){
    if(
      manifest[key]!==
      expected
    ){
      fail(
        'Production manifest owner mismatch: '+
        key
      );
    }
  }

  if(
    manifest.homeCutover!==
      'B7-00B.4J-R4.3C'||
    manifest.catalogCutover!==
      'B7-00B.4J-R4.4C'||
    manifest.pdpCutover!==
      'B7-00B.4J-R4.5C'||
    manifest.customCutover!==
      'B7-00B.4J-R4.6C'||
    manifest.inquiryCutover!==
      'B7-00B.4J-R4.7C'||
    manifest.contactCutover!==
      'B7-00B.4J-R4.8C'||    
    manifest.presentationOverrides
      ?.contact!==
      'astro-r4.8c'
  ){
    fail(
      'Production manifest lost a staged route-ownership/cutover contract.'
    );
  }

  const sw=
    expectFile(
      root,
      'sw.js'
    );

  if(
    sw&&
    (
      !sw.includes(
        "const CACHE_VERSION = 'dreamland-pwa-v129';"
      )||
      sw.includes(
        'CONTACT_NAVIGATION_PATHS'
      )||
      sw.includes(
        'isContactNavigation('
      )
    )
  ){
    fail(
      'R4.8C dist/ must retain the pre-R4.8D Service Worker Contact ownership boundary.'
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.8C Production Contact Cutover: FAIL'
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
  'DREAMLAND B7-00B.4J R4.8C Production Contact Cutover: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Production pipeline / noindex Contact route contract / route-scoped promotion / pre-R4.8D SW boundary verified.'
    : 'dist/ owns Astro Home + Catalog + 89 PDPs + Custom + Inquiry + Contact while Review/Success remain Legacy.'
);
console.log('');

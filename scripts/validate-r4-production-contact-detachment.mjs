#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
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
    'Usage: node scripts/validate-r4-production-contact-detachment.mjs --source | --dist'
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

const BUDGETS=Object.freeze({
  htmlRaw:
    256*1024,
  stateRaw:
    192*1024,
  runtimeRaw:
    160*1024,
  styleRaw:
    160*1024,
  codeGzip:
    144*1024,
  criticalRaw:
    640*1024
});

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

function bytes(file){
  return fs.statSync(
    file
  ).size;
}

function gzipBytes(file){
  return zlib
    .gzipSync(
      fs.readFileSync(
        file
      ),
      {
        level:9
      }
    )
    .length;
}

function kib(value){
  return (
    Number(
      value
    )/
    1024
  ).toFixed(
    1
  );
}

function blockBetween(
  source,
  startMarker,
  endMarker
){
  const start=
    source.indexOf(
      startMarker
    );

  if(start<0){
    return '';
  }

  const end=
    source.indexOf(
      endMarker,
      start+
      startMarker.length
    );

  return (
    end<0
      ? source.slice(
          start
        )
      : source.slice(
          start,
          end
        )
  );
}

function navigationSlice(source){
  return blockBetween(
    source,
    "if(request.mode==='navigate'){",
    "if(\n    url.pathname.includes('/data/')"
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

function validateContactSw(
  source,
  label
){
  for(const marker of [
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    "'b7-00b4j-r3-v129';",
    'const CONTACT_NAVIGATION_PATHS=',
    'function isContactNavigation(',
    'async function purgeLegacyContactEntries(',
    'async function contactNetworkOnly(',
    'purgeLegacyContactEntries()'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        label+
        ' Contact detachment contract is missing: '+
        marker
      );
    }
  }

  const pathsBlock=
    blockBetween(
      source,
      'const CONTACT_NAVIGATION_PATHS=',
      'const RELEASE_ASSETS'
    );

  const contactPaths=[
    ...pathsBlock.matchAll(
      /['"](\/inquiry\/contact[^'"]*)['"]/g
    )
  ].map(
    match=>match[1]
  );

  const expectedPaths=[
    '/inquiry/contact',
    '/inquiry/contact/',
    '/inquiry/contact/index.html'
  ];

  if(
    JSON.stringify(
      contactPaths
    )!==
    JSON.stringify(
      expectedPaths
    )
  ){
    fail(
      label+
      ' Contact navigation ownership must be exact route membership: '+
      expectedPaths.join(
        ', '
      )+
      '; found '+
      contactPaths.join(
        ', '
      )+
      '.'
    );
  }

  for(const forbidden of [
    '/inquiry/review',
    '/inquiry/success'
  ]){
    if(
      pathsBlock.includes(
        forbidden
      )
    ){
      fail(
        label+
        ' Contact matcher absorbed a downstream Legacy route: '+
        forbidden
      );
    }
  }

  const matcher=
    blockBetween(
      source,
      'function isContactNavigation(',
      'async function purgeLegacyContactEntries('
    );

  if(
    !/CONTACT_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/
      .test(
        matcher
      )
  ){
    fail(
      label+
      ' isContactNavigation must use exact CONTACT_NAVIGATION_PATHS membership.'
    );
  }

  for(const forbidden of [
    'startsWith(',
    'includes('
  ]){
    if(
      matcher.includes(
        forbidden
      )
    ){
      fail(
        label+
        ' Contact matcher must not use a broad pathname predicate: '+
        forbidden
      );
    }
  }

  const purge=
    blockBetween(
      source,
      'async function purgeLegacyContactEntries(',
      'async function contactNetworkOnly('
    );

  for(const marker of [
    'APP_CACHE',
    'RUNTIME_CACHE',
    'isContactNavigation(',
    'cache.delete('
  ]){
    if(
      !purge.includes(
        marker
      )
    ){
      fail(
        label+
        ' Contact cache purge is incomplete: '+
        marker
      );
    }
  }

  const networkOnly=
    blockBetween(
      source,
      'async function contactNetworkOnly(',
      "self.addEventListener('install'"
    );

  if(
    !/cache\s*:\s*['"]no-store['"]/
      .test(
        networkOnly
      )
  ){
    fail(
      label+
      ' Contact network-only navigation must use cache:no-store.'
    );
  }

  if(
    !networkOnly.includes(
      "caches.match(\n        './offline.html'"
    )
  ){
    fail(
      label+
      ' Contact network-only navigation must retain offline.html as the network-failure fallback.'
    );
  }

  const purgeCalls=
    (
      source.match(
        /purgeLegacyContactEntries\s*\(\s*\)/g
      )||
      []
    ).length;

  if(
    purgeCalls<3
  ){
    fail(
      label+
      ' Contact cache purge must be defined and run during both install and activate.'
    );
  }

  const appShell=
    blockBetween(
      source,
      'const APP_SHELL = [',
      '];'
    );

  for(const forbidden of [
    "'./inquiry/contact'",
    "'./inquiry/contact/'",
    "'./inquiry/contact/index.html'"
  ]){
    if(
      appShell.includes(
        forbidden
      )
    ){
      fail(
        label+
        ' APP_SHELL must not precache the Astro Contact document: '+
        forbidden
      );
    }
  }

  /*
   * Review/Success remain Legacy and DesktopExperience still requires the
   * Contact presentation module to configure the conversion family. Therefore
   * R4.8D detaches the Contact document, not these shared downstream assets.
   */
  for(const required of [
    "'./offline.html'",
    "'./src/services/pwa/runtime-pwa.js'",
    "'./src/services/submission/runtime-submission.js'",
    "'./src/services/risk/runtime-risk.js'",
    "'./src/site/runtime/runtime-page-guards.js'",
    "'./src/features/contact/runtime-contact.js'",
    "'./src/app/runtime-inquiry-submission-flow.js'",
    "'./src/ui/desktop/runtime-desktop-experience.js'",
    "'./src/ui/desktop/contact/runtime-desktop-contact.js'",
    "'./src/ui/desktop/review/runtime-desktop-review.js'",
    "'./src/ui/desktop/success/runtime-desktop-success.js'"
  ]){
    if(
      !appShell.includes(
        required
      )
    ){
      fail(
        label+
        ' remaining Legacy Review/Success shell lost a required conversion asset: '+
        required
      );
    }
  }

  const navigation=
    navigationSlice(
      source
    );

  if(!navigation){
    fail(
      label+
      ' navigation branch could not be isolated.'
    );
    return;
  }

  const checks=[
    [
      'Home',
      /isHomeNavigation\s*\(\s*url\s*\)/
    ],
    [
      'Catalog',
      /isCatalogNavigation\s*\(\s*url\s*\)/
    ],
    [
      'PDP',
      /isPdpNavigation\s*\(\s*url\s*\)/
    ],
    [
      'Custom',
      /isCustomNavigation\s*\(\s*url\s*\)/
    ],
    [
      'Inquiry',
      /isInquiryNavigation\s*\(\s*url\s*\)/
    ],
    [
      'Contact',
      /isContactNavigation\s*\(\s*url\s*\)/
    ],
    [
      'remaining Legacy networkFirst',
      /networkFirst\s*\(/
    ]
  ];

  const positions=[];

  for(const [
    name,
    pattern
  ] of checks){
    const index=
      navigation.search(
        pattern
      );

    positions.push(
      index
    );

    if(index<0){
      fail(
        label+
        ' navigation split is missing: '+
        name
      );
    }
  }

  if(
    positions.some(
      value=>value<0
    )||
    positions.some(
      (
        value,
        index
      )=>
        index>0&&
        value<=
        positions[index-1]
    )
  ){
    fail(
      label+
      ' navigation ownership must resolve Home → Catalog → PDP → Custom → Inquiry → Contact → remaining Legacy Review/Success.'
    );
  }
}

function validateContactDocument(
  root,
  label
){
  const file=
    path.join(
      root,
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
      label+
      ' Contact document is missing.'
    );
    return null;
  }

  const html=
    fs.readFileSync(
      file,
      'utf8'
    );

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
        ' Contact is missing hardening marker: '+
        marker
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
        label+
        ' Contact still contains a Legacy/downstream/PWA bootstrap reference: '+
        forbidden
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
      ' Contact must contain exactly one executable route runtime; found '+
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
      ' Contact executable graph must contain only /r4-contact-runtime.js.'
    );
  }

  const rawState=
    stateText(
      html
    );

  let state=null;

  if(!rawState){
    fail(
      label+
      ' Contact runtime state is missing.'
    );
  }else{
    try{
      state=
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
          label+
          ' Contact runtime-state ownership/storage/route contract changed.'
        );
      }
    }catch(error){
      fail(
        label+
        ' Contact runtime state JSON is invalid: '+
        error.message
      );
    }
  }

  return {
    file,
    html,
    rawState,
    state
  };
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:production:contact:detachment']!==
    'node scripts/validate-r4-production-contact-detachment.mjs --source'
  ){
    fail(
      'package.json is missing r4:production:contact:detachment.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:contact:validate']!==
    'node scripts/validate-r4-production-contact-cutover.mjs --dist && node scripts/validate-r4-production-contact-detachment.mjs --dist'
  ){
    fail(
      'Final Production Contact validation must chain cutover + detachment hardening.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const cutover=
    validate.indexOf(
      'npm run r4:production:contact:contract'
    );

  const detachment=
    validate.indexOf(
      'npm run r4:production:contact:detachment'
    );

  if(
    cutover<0||
    detachment<=cutover
  ){
    fail(
      'R4.8D Contact detachment source gate must run after the R4.8C cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.8D package inspection failed: '+
    error.message
  );
}

try{
  validateContactSw(
    read(
      'sw.js'
    ),
    'Source Service Worker'
  );
}catch(error){
  fail(
    'R4.8D source Service Worker inspection failed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/contact-runtime.js'
    );

  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'serviceWorker',
    'navigator.serviceWorker',
    'registerServiceWorker',
    'runtime-pwa.js',
    'DreamlandPwa',
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandInquirySubmissionFlow',
    'hcaptcha',
    'startup-loader.js'
  ]){
    if(
      runtime.includes(
        forbidden
      )
    ){
      fail(
        'Astro Contact runtime must remain detached from downstream/PWA bootstrap: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.8D Contact runtime source inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  try{
    validateContactDocument(
      path.join(
        ROOT,
        '.r4-astro-dist'
      ),
      'Isolated'
    );

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
          'R4.8D Production Contact source is missing: '+
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
        'R4.8D Inquiry/Contact/Review/Success route contract changed.'
      );
    }
  }catch(error){
    fail(
      'R4.8D source Contact inspection failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  try{
    const root=
      path.join(
        ROOT,
        'dist'
      );

    const result=
      validateContactDocument(
        root,
        'Production'
      );

    if(result){
      const runtimeFile=
        path.join(
          root,
          'r4-contact-runtime.js'
        );

      if(
        !fs.existsSync(
          runtimeFile
        )
      ){
        fail(
          'Production Contact runtime output is missing.'
        );
      }

      const htmlRaw=
        bytes(
          result.file
        );

      const stateRaw=
        Buffer.byteLength(
          result.rawState||
          '',
          'utf8'
        );

      const runtimeRaw=
        fs.existsSync(
          runtimeFile
        )
          ? bytes(
              runtimeFile
            )
          : 0;

      if(
        htmlRaw>
        BUDGETS.htmlRaw
      ){
        fail(
          'Production Contact HTML exceeds '+
          kib(
            BUDGETS.htmlRaw
          )+
          ' KiB: '+
          kib(
            htmlRaw
          )+
          ' KiB.'
        );
      }

      if(
        stateRaw>
        BUDGETS.stateRaw
      ){
        fail(
          'Production Contact runtime state exceeds '+
          kib(
            BUDGETS.stateRaw
          )+
          ' KiB: '+
          kib(
            stateRaw
          )+
          ' KiB.'
        );
      }

      if(
        runtimeRaw>
        BUDGETS.runtimeRaw
      ){
        fail(
          'Production Contact runtime exceeds '+
          kib(
            BUDGETS.runtimeRaw
          )+
          ' KiB: '+
          kib(
            runtimeRaw
          )+
          ' KiB.'
        );
      }

      if(
        fs.existsSync(
          runtimeFile
        )
      ){
        const runtime=
          fs.readFileSync(
            runtimeFile,
            'utf8'
          );

        for(const forbidden of [
          'fetch(',
          'XMLHttpRequest',
          'navigator.serviceWorker',
          'runtime-pwa.js',
          'DreamlandPwa',
          'DreamlandRisk',
          'DreamlandSubmission',
          'DreamlandInquirySubmissionFlow',
          'hcaptcha',
          'startup-loader.js'
        ]){
          if(
            runtime.includes(
              forbidden
            )
          ){
            fail(
              'Production Contact runtime bundle crossed a forbidden boundary: '+
              forbidden
            );
          }
        }
      }

      const stylePaths=[
        ...new Set(
          [
            ...result.html.matchAll(
              /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi
            ),
            ...result.html.matchAll(
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
          'Production Contact should reference 1-3 Astro stylesheet assets; found '+
          stylePaths.length+
          '.'
        );
      }

      const styleFiles=[];

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
            'Production Contact stylesheet output is missing: '+
            href
          );
        }else{
          styleFiles.push(
            file
          );
        }
      }

      const styleRaw=
        styleFiles.reduce(
          (
            total,
            file
          )=>
            total+
            bytes(
              file
            ),
          0
        );

      if(
        styleRaw>
        BUDGETS.styleRaw
      ){
        fail(
          'Production Contact styles exceed '+
          kib(
            BUDGETS.styleRaw
          )+
          ' KiB: '+
          kib(
            styleRaw
          )+
          ' KiB.'
        );
      }

      const criticalRaw=
        htmlRaw+
        runtimeRaw+
        styleRaw;

      let codeGzip=0;

      if(
        fs.existsSync(
          runtimeFile
        )&&
        styleFiles.length===
          stylePaths.length
      ){
        codeGzip=
          gzipBytes(
            result.file
          )+
          gzipBytes(
            runtimeFile
          )+
          styleFiles.reduce(
            (
              total,
              file
            )=>
              total+
              gzipBytes(
                file
              ),
            0
          );

        if(
          codeGzip>
          BUDGETS.codeGzip
        ){
          fail(
            'Production Contact HTML+JS+CSS gzip proxy exceeds '+
            kib(
              BUDGETS.codeGzip
            )+
            ' KiB: '+
            kib(
              codeGzip
            )+
            ' KiB.'
          );
        }

        if(
          criticalRaw>
          BUDGETS.criticalRaw
        ){
          fail(
            'Production Contact critical raw payload exceeds '+
            kib(
              BUDGETS.criticalRaw
            )+
            ' KiB: '+
            kib(
              criticalRaw
            )+
            ' KiB.'
          );
        }
      }

      if(!errors.length){
        console.log('');
        console.log(
          '[R4.8D Contact Payload]'
        );
        console.log(
          '- HTML:',
          kib(
            htmlRaw
          )+
          ' KiB raw'
        );
        console.log(
          '- Runtime state:',
          kib(
            stateRaw
          )+
          ' KiB raw'
        );
        console.log(
          '- Runtime:',
          kib(
            runtimeRaw
          )+
          ' KiB raw'
        );
        console.log(
          '- Styles:',
          kib(
            styleRaw
          )+
          ' KiB raw / '+
          styleFiles.length+
          ' file(s)'
        );
        console.log(
          '- HTML+JS+CSS gzip proxy:',
          kib(
            codeGzip
          )+
          ' KiB'
        );
        console.log(
          '- Critical raw:',
          kib(
            criticalRaw
          )+
          ' KiB'
        );
      }
    }

    const swFile=
      path.join(
        root,
        'sw.js'
      );

    if(
      !fs.existsSync(
        swFile
      )
    ){
      fail(
        'Production Service Worker is missing while Review/Success remain Legacy-owned.'
      );
    }else{
      validateContactSw(
        fs.readFileSync(
          swFile,
          'utf8'
        ),
        'Production Service Worker'
      );
    }

    for(const relative of [
      'inquiry/review/index.html',
      'inquiry/success/index.html'
    ]){
      const file=
        path.join(
          root,
          relative
        );

      if(
        !fs.existsSync(
          file
        )||
        !fs.readFileSync(
          file,
          'utf8'
        ).includes(
          'window.DREAMLAND_MPA_ACTIVE=true;'
        )
      ){
        fail(
          'R4.8D must preserve Legacy downstream conversion ownership: '+
          relative
        );
      }
    }

    const manifestFile=
      path.join(
        root,
        'multipage-build-manifest.json'
      );

    if(
      !fs.existsSync(
        manifestFile
      )
    ){
      fail(
        'Production ownership manifest is missing.'
      );
    }else{
      const manifest=
        JSON.parse(
          fs.readFileSync(
            manifestFile,
            'utf8'
          )
        );

      if(
        manifest.homeOwner!==
          'astro'||
        manifest.catalogOwner!==
          'astro'||
        manifest.pdpOwner!==
          'astro'||
        manifest.customOwner!==
          'astro'||
        manifest.inquiryOwner!==
          'astro'||
        manifest.contactOwner!==
          'astro'||
        manifest.contactCutover!==
          'B7-00B.4J-R4.8C'||
        manifest.presentationOverrides
          ?.contact!==
          'astro-r4.8c'
      ){
        fail(
          'Production ownership manifest lost the staged Astro Contact ownership contract.'
        );
      }
    }
  }catch(error){
    fail(
      'R4.8D dist-mode validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.8D Contact Legacy Detachment / Production Payload Hardening: FAIL'
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
  'DREAMLAND B7-00B.4J R4.8D Contact Legacy Detachment / Production Payload Hardening: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Contact Service Worker cache isolation / exact route ownership / network-only navigation / Review-Success Legacy boundary verified.'
    : 'Production Contact cache isolation, Review/Success Legacy boundary and payload budgets verified.'
);
console.log('');

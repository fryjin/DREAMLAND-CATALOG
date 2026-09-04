#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

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
    'Usage: node scripts/validate-r4-production-inquiry-detachment.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

const BUDGETS=Object.freeze({
  htmlRaw:256*1024,
  stateRaw:128*1024,
  runtimeRaw:112*1024,
  styleRaw:128*1024,
  codeGzip:128*1024,
  criticalRaw:512*1024
});

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

function bytes(file){
  return fs.statSync(file).size;
}

function gzipBytes(file){
  return zlib
    .gzipSync(
      fs.readFileSync(file),
      {
        level:9
      }
    )
    .length;
}

function kib(value){
  return (
    Number(value)/
    1024
  ).toFixed(1);
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

  return end<0
    ? source.slice(start)
    : source.slice(
        start,
        end
      );
}

function navigationSlice(source){
  return blockBetween(
    source,
    "if(request.mode==='navigate'){",
    "if(\n    url.pathname.includes('/data/')"
  );
}

function validateInquirySw(
  source,
  label
){
  for(const marker of [
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    "'b7-00b4j-r3-v129';",
    'const INQUIRY_NAVIGATION_PATHS=',
    'function isInquiryNavigation(',
    'async function purgeLegacyInquiryEntries(',
    'async function inquiryNetworkOnly(',
    'purgeLegacyInquiryEntries()'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        label+
        ' Inquiry detachment contract is missing: '+
        marker
      );
    }
  }

  const pathsBlock=
    blockBetween(
      source,
      'const INQUIRY_NAVIGATION_PATHS=',
      'const RELEASE_ASSETS'
    );

  const inquiryPaths=[
    ...pathsBlock.matchAll(
      /['"](\/inquiry[^'"]*)['"]/g
    )
  ].map(
    match=>match[1]
  );

  const expectedPaths=[
    '/inquiry',
    '/inquiry/',
    '/inquiry/index.html'
  ];

  if(
    JSON.stringify(
      inquiryPaths
    )!==
    JSON.stringify(
      expectedPaths
    )
  ){
    fail(
      label+
      ' Inquiry navigation ownership must be exact selection-route membership: '+
      expectedPaths.join(', ')+
      '; found '+
      inquiryPaths.join(', ')+
      '.'
    );
  }

  for(const forbidden of [
    '/inquiry/contact',
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
        ' Inquiry selection matcher absorbed a downstream Legacy route: '+
        forbidden
      );
    }
  }

  const matcher=
    blockBetween(
      source,
      'function isInquiryNavigation(',
      'async function purgeLegacyInquiryEntries('
    );

  if(
    !/INQUIRY_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/
      .test(
        matcher
      )
  ){
    fail(
      label+
      ' isInquiryNavigation must use exact INQUIRY_NAVIGATION_PATHS membership.'
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
        ' Inquiry matcher must not use a broad pathname predicate: '+
        forbidden
      );
    }
  }

  const purge=
    blockBetween(
      source,
      'async function purgeLegacyInquiryEntries(',
      'async function inquiryNetworkOnly('
    );

  for(const marker of [
    'APP_CACHE',
    'RUNTIME_CACHE',
    'isInquiryNavigation(',
    'cache.delete('
  ]){
    if(
      !purge.includes(
        marker
      )
    ){
      fail(
        label+
        ' Inquiry cache purge is incomplete: '+
        marker
      );
    }
  }

  const networkOnly=
    blockBetween(
      source,
      'async function inquiryNetworkOnly(',
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
      ' Inquiry network-only navigation must use cache:no-store.'
    );
  }

  if(
    !networkOnly.includes(
      "caches.match(\n        './offline.html'"
    )
  ){
    fail(
      label+
      ' Inquiry network-only navigation must retain offline.html as the network-failure fallback.'
    );
  }

  const purgeCalls=
    (
      source.match(
        /purgeLegacyInquiryEntries\s*\(\s*\)/g
      )||
      []
    ).length;

  if(purgeCalls<3){
    fail(
      label+
      ' Inquiry cache purge must be defined and run during both install and activate.'
    );
  }

  const appShell=
    blockBetween(
      source,
      'const APP_SHELL = [',
      '];'
    );

  for(const forbidden of [
    "'./inquiry'",
    "'./inquiry/'",
    "'./inquiry/index.html'"
  ]){
    if(
      appShell.includes(
        forbidden
      )
    ){
      fail(
        label+
        ' APP_SHELL must not precache the Astro Inquiry selection document: '+
        forbidden
      );
    }
  }

  for(const required of [
    "'./offline.html'",
    "'./src/services/pwa/runtime-pwa.js'",
    "'./src/services/submission/runtime-submission.js'",
    "'./src/services/risk/runtime-risk.js'",
    "'./src/features/inquiry/runtime-inquiry.js'",
    "'./src/features/contact/runtime-contact.js'",
    "'./src/app/runtime-inquiry-submission-flow.js'",
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
        ' remaining Legacy Contact/Review/Success PWA shell lost a required asset: '+
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

  for(const [name,pattern] of [
    [
      'isHomeNavigation(url)',
      /isHomeNavigation\s*\(\s*url\s*\)/
    ],
    [
      'isCatalogNavigation(url)',
      /isCatalogNavigation\s*\(\s*url\s*\)/
    ],
    [
      'isPdpNavigation(url)',
      /isPdpNavigation\s*\(\s*url\s*\)/
    ],
    [
      'isCustomNavigation(url)',
      /isCustomNavigation\s*\(\s*url\s*\)/
    ],
    [
      'isInquiryNavigation(url)',
      /isInquiryNavigation\s*\(\s*url\s*\)/
    ],
    [
      'inquiryNetworkOnly(request)',
      /inquiryNetworkOnly\s*\(\s*request\s*\)/
    ],
    [
      'remaining Legacy networkFirst',
      /networkFirst\s*\(/
    ]
  ]){
    if(
      !pattern.test(
        navigation
      )
    ){
      fail(
        label+
        ' navigation split is missing: '+
        name
      );
    }
  }

  const positions=[
    navigation.search(
      /isHomeNavigation\s*\(\s*url\s*\)/
    ),
    navigation.search(
      /isCatalogNavigation\s*\(\s*url\s*\)/
    ),
    navigation.search(
      /isPdpNavigation\s*\(\s*url\s*\)/
    ),
    navigation.search(
      /isCustomNavigation\s*\(\s*url\s*\)/
    ),
    navigation.search(
      /isInquiryNavigation\s*\(\s*url\s*\)/
    ),
    navigation.search(
      /networkFirst\s*\(/
    )
  ];

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
      ' navigation ownership must resolve Home → Catalog → PDP → Custom → Inquiry selection → remaining Legacy conversion routes.'
    );
  }
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:production:inquiry:detachment']!==
    'node scripts/validate-r4-production-inquiry-detachment.mjs --source'
  ){
    fail(
      'package.json is missing r4:production:inquiry:detachment.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:inquiry:validate']!==
    'node scripts/validate-r4-production-inquiry-cutover.mjs --dist && node scripts/validate-r4-production-inquiry-detachment.mjs --dist'
  ){
    fail(
      'Final Production Inquiry validation must chain cutover + detachment hardening.'
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
      'npm run r4:production:inquiry:contract'
    );

  const detachment=
    validate.indexOf(
      'npm run r4:production:inquiry:detachment'
    );

  if(
    cutover<0||
    detachment<=cutover
  ){
    fail(
      'R4.7D Inquiry detachment source gate must run after the R4.7C cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.7D package inspection failed: '+
    error.message
  );
}

try{
  validateInquirySw(
    read(
      'sw.js'
    ),
    'Source Service Worker'
  );
}catch(error){
  fail(
    'R4.7D source Service Worker inspection failed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/inquiry-runtime.js'
    );

  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'serviceWorker',
    'navigator.serviceWorker',
    'registerServiceWorker',
    'runtime-pwa.js',
    'DreamlandPwa',
    'DreamlandContact',
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
        'Astro Inquiry runtime must remain detached from downstream/PWA bootstrap: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.7D Inquiry runtime source inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  try{
    const page=
      read(
        'src/astro/pages/inquiry/index.astro'
      );

    for(const marker of [
      'robots="noindex,nofollow"',
      'canonical="https://dreamland-catalog.pages.dev/inquiry/"',
      'id="inquiryRuntimeState"',
      'src="/r4-inquiry-runtime.js"'
    ]){
      if(
        !page.includes(
          marker
        )
      ){
        fail(
          'R4.7D Production Inquiry source is missing: '+
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
      routes.review?.path!==
        '/inquiry/review/'||
      routes.success?.path!==
        '/inquiry/success/'
    ){
      fail(
        'R4.7D Inquiry/downstream conversion route contract changed.'
      );
    }
  }catch(error){
    fail(
      'R4.7D source Inquiry inspection failed: '+
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

    const inquiryFile=
      path.join(
        root,
        'inquiry',
        'index.html'
      );

    if(
      !fs.existsSync(
        inquiryFile
      )
    ){
      fail(
        'Production Inquiry selection output is missing.'
      );
    }else{
      const html=
        fs.readFileSync(
          inquiryFile,
          'utf8'
        );

      for(const marker of [
        'data-r4-astro-foundation="true"',
        'data-r4-astro-inquiry="true"',
        'data-inquiry-runtime-presentation',
        'name="robots" content="noindex,nofollow"',
        'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/"',
        'id="inquiryRuntimeState"',
        'src="/r4-inquiry-runtime.js"',
        'data-site-language-enabled="true"'
      ]){
        if(
          !html.includes(
            marker
          )
        ){
          fail(
            'Production Inquiry is missing hardening marker: '+
            marker
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
        'serviceWorker.register',
        'navigator.serviceWorker',
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
            'Production Inquiry still contains a Legacy/downstream/PWA bootstrap reference: '+
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
          'Production Inquiry must contain exactly one executable route runtime; found '+
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
          'Production Inquiry executable graph must contain only /r4-inquiry-runtime.js.'
        );
      }

      const rawState=
        stateText(
          html
        );

      let state=null;

      if(!rawState){
        fail(
          'Production Inquiry runtime state is missing.'
        );
      }else{
        try{
          state=
            JSON.parse(
              rawState
            );

          if(
            state.version!==
              'R4.7B'||
            state.storage
              ?.languageKey!==
              'productManualLang'||
            state.storage
              ?.inquiryKey!==
              'productManualV2State'||
            state.storage
              ?.inquiryVersion!==
              2||
            state.routes
              ?.contact!==
              '/inquiry/contact/'||
            state.products
              ?.length!==
              89
          ){
            fail(
              'Production Inquiry runtime-state ownership/storage/downstream-route contract changed.'
            );
          }
        }catch(error){
          fail(
            'Production Inquiry runtime state JSON is invalid: '+
            error.message
          );
        }
      }

      if(state){
        for(const product of state.products||[]){
          const cover=
            String(
              product?.cover||
              ''
            )
              .replace(
                /[?#].*$/,
                ''
              )
              .replace(
                /^\/+/,
                ''
              );

          if(
            !cover||
            !fs.existsSync(
              path.join(
                root,
                cover
              )
            )
          ){
            fail(
              'Production Inquiry runtime Product cover is missing: '+
              (
                product?.id||
                product?.productId||
                product?.cover||
                '(unknown)'
              )
            );
          }
        }
      }

      const runtimeFile=
        path.join(
          root,
          'r4-inquiry-runtime.js'
        );

      if(
        !fs.existsSync(
          runtimeFile
        )
      ){
        fail(
          'Production Inquiry runtime output is missing.'
        );
      }

      const htmlRaw=
        bytes(
          inquiryFile
        );

      const stateRaw=
        Buffer.byteLength(
          rawState||
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
          'Production Inquiry HTML exceeds '+
          kib(BUDGETS.htmlRaw)+
          ' KiB: '+
          kib(htmlRaw)+
          ' KiB.'
        );
      }

      if(
        stateRaw>
        BUDGETS.stateRaw
      ){
        fail(
          'Production Inquiry runtime state exceeds '+
          kib(BUDGETS.stateRaw)+
          ' KiB: '+
          kib(stateRaw)+
          ' KiB.'
        );
      }

      if(
        runtimeRaw>
        BUDGETS.runtimeRaw
      ){
        fail(
          'Production Inquiry runtime exceeds '+
          kib(BUDGETS.runtimeRaw)+
          ' KiB: '+
          kib(runtimeRaw)+
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
          'DreamlandContact',
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
              'Production Inquiry runtime bundle crossed a forbidden boundary: '+
              forbidden
            );
          }
        }
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
          'Production Inquiry should reference 1-3 Astro stylesheet assets; found '+
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
            'Production Inquiry stylesheet output is missing: '+
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
          'Production Inquiry styles exceed '+
          kib(BUDGETS.styleRaw)+
          ' KiB: '+
          kib(styleRaw)+
          ' KiB.'
        );
      }

      let codeGzip=0;
      const criticalRaw=
        htmlRaw+
        runtimeRaw+
        styleRaw;

      if(
        fs.existsSync(
          runtimeFile
        )&&
        styleFiles.length===
          stylePaths.length
      ){
        codeGzip=
          gzipBytes(
            inquiryFile
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
            'Production Inquiry HTML+JS+CSS gzip proxy exceeds '+
            kib(BUDGETS.codeGzip)+
            ' KiB: '+
            kib(codeGzip)+
            ' KiB.'
          );
        }

        if(
          criticalRaw>
          BUDGETS.criticalRaw
        ){
          fail(
            'Production Inquiry critical raw payload exceeds '+
            kib(BUDGETS.criticalRaw)+
            ' KiB: '+
            kib(criticalRaw)+
            ' KiB.'
          );
        }
      }

      if(!errors.length){
        console.log('');
        console.log(
          '[R4.7D Inquiry Payload]'
        );
        console.log(
          '- HTML:',
          kib(htmlRaw)+
          ' KiB raw'
        );
        console.log(
          '- Runtime state:',
          kib(stateRaw)+
          ' KiB raw'
        );
        console.log(
          '- Runtime:',
          kib(runtimeRaw)+
          ' KiB raw'
        );
        console.log(
          '- Styles:',
          kib(styleRaw)+
          ' KiB raw / '+
          styleFiles.length+
          ' file(s)'
        );
        console.log(
          '- HTML+JS+CSS gzip proxy:',
          kib(codeGzip)+
          ' KiB'
        );
        console.log(
          '- Critical raw:',
          kib(criticalRaw)+
          ' KiB'
        );
        console.log(
          '- Runtime Product covers:',
          state?.products?.length||
          0
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
        'Production Service Worker is missing while Contact/Review/Success remain Legacy-owned.'
      );
    }else{
      validateInquirySw(
        fs.readFileSync(
          swFile,
          'utf8'
        ),
        'Production Service Worker'
      );
    }

    for(const relative of [
      'inquiry/contact/index.html',
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
          'R4.7D must preserve Legacy downstream conversion ownership: '+
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
        manifest.inquiryCutover!==
          'B7-00B.4J-R4.7C'||
        manifest.presentationOverrides
          ?.inquiry!==
          'astro-r4.7c'
      ){
        fail(
          'Production ownership manifest lost the staged Astro Inquiry ownership contract.'
        );
      }
    }
  }catch(error){
    fail(
      'R4.7D dist-mode validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.7D Inquiry Legacy Detachment / Payload Hardening: FAIL'
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
  'DREAMLAND B7-00B.4J R4.7D Inquiry Legacy Detachment / Payload Hardening: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Inquiry selection Service Worker cache isolation / exact route ownership / network-only navigation / downstream Legacy boundary verified.'
    : 'Production Inquiry selection cache isolation, Contact/Review/Success Legacy boundary and payload budgets verified.'
);
console.log('');

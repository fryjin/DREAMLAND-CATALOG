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
    'Usage: node scripts/validate-r4-production-custom-detachment.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

const BUDGETS=
  Object.freeze({
    htmlRaw:256*1024,
    stateRaw:72*1024,
    runtimeRaw:104*1024,
    styleRaw:128*1024,
    codeGzip:128*1024,
    criticalRaw:384*1024
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
      /<script[^>]*id="customRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="customRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

function functionSlice(
  source,
  name,
  nextName
){
  const start=
    source.search(
      new RegExp(
        '(?:async\\s+)?function\\s+'+
        name+
        '\\s*\\('
      )
    );

  if(start<0){
    return '';
  }

  if(!nextName){
    return source.slice(start);
  }

  const tail=
    source.slice(
      start+1
    );

  const relativeEnd=
    tail.search(
      new RegExp(
        '(?:async\\s+)?function\\s+'+
        nextName+
        '\\s*\\('
      )
    );

  return relativeEnd<0
    ? source.slice(start)
    : source.slice(
        start,
        start+1+relativeEnd
      );
}

function navigationSlice(source){
  const start=
    source.indexOf(
      "if(request.mode==='navigate'){"
    );

  const end=
    source.indexOf(
      "if(\n    url.pathname.includes('/data/')",
      start
    );

  if(
    start<0||
    end<=start
  ){
    return '';
  }

  return source.slice(
    start,
    end
  );
}

function validateCustomSw(
  source,
  label
){
  const exactSet=
    /const\s+CUSTOM_NAVIGATION_PATHS\s*=\s*new\s+Set\s*\(\s*\[\s*['"]\/custom['"]\s*,\s*['"]\/custom\/['"]\s*,\s*['"]\/custom\/index\.html['"]\s*\]\s*\)/m;

  if(
    !exactSet.test(
      source
    )
  ){
    fail(
      label+
      ' Custom navigation ownership must use exact Set membership for /custom, /custom/ and /custom/index.html.'
    );
  }

  for(const marker of [
    'function isCustomNavigation(',
    'function purgeLegacyCustomEntries(',
    'function customNetworkOnly(',
    'CUSTOM_NAVIGATION_PATHS',
    'purgeLegacyCustomEntries()'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        label+
        ' Custom detachment contract is missing: '+
        marker
      );
    }
  }

  const matcher=
    functionSlice(
      source,
      'isCustomNavigation',
      'purgeLegacyCustomEntries'
    );

  if(
    !/CUSTOM_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/
      .test(
        matcher
      )
  ){
    fail(
      label+
      ' isCustomNavigation must use exact CUSTOM_NAVIGATION_PATHS membership.'
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
        ' Custom matcher must not use a broad pathname predicate: '+
        forbidden
      );
    }
  }

  const purge=
    functionSlice(
      source,
      'purgeLegacyCustomEntries',
      'customNetworkOnly'
    );

  for(const marker of [
    'APP_CACHE',
    'RUNTIME_CACHE',
    'isCustomNavigation(',
    'cache.delete('
  ]){
    if(
      !purge.includes(
        marker
      )
    ){
      fail(
        label+
        ' Custom cache purge is incomplete: '+
        marker
      );
    }
  }

  const networkOnly=
    functionSlice(
      source,
      'customNetworkOnly',
      null
    );

  if(
    !/cache\s*:\s*['"]no-store['"]/
      .test(
        networkOnly
      )
  ){
    fail(
      label+
      ' Custom network-only fetch must use cache:no-store.'
    );
  }

  if(
    !networkOnly.includes(
      "caches.match(\n        './offline.html'"
    )
  ){
    fail(
      label+
      ' Custom network-only navigation must retain offline.html as the network-failure fallback.'
    );
  }

  const purgeCalls=
    (
      source.match(
        /purgeLegacyCustomEntries\s*\(\s*\)/g
      )||
      []
    ).length;

  if(purgeCalls<3){
    fail(
      label+
      ' Custom cache purge must be defined and run during both install and activate.'
    );
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
      'customNetworkOnly(request)',
      /customNetworkOnly\s*\(\s*request\s*\)/
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

  const homeIndex=
    navigation.search(
      /isHomeNavigation\s*\(\s*url\s*\)/
    );

  const catalogIndex=
    navigation.search(
      /isCatalogNavigation\s*\(\s*url\s*\)/
    );

  const pdpIndex=
    navigation.search(
      /isPdpNavigation\s*\(\s*url\s*\)/
    );

  const customIndex=
    navigation.search(
      /isCustomNavigation\s*\(\s*url\s*\)/
    );

  const genericIndex=
    navigation.search(
      /networkFirst\s*\(/
    );

  if(
    homeIndex<0||
    catalogIndex<0||
    pdpIndex<0||
    customIndex<0||
    genericIndex<0||
    !(
      homeIndex<
      catalogIndex&&
      catalogIndex<
      pdpIndex&&
      pdpIndex<
      customIndex&&
      customIndex<
      genericIndex
    )
  ){
    fail(
      label+
      ' navigation ownership must resolve Home → Catalog → PDP → Custom → remaining Legacy Inquiry routes.'
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
      ?.['r4:production:custom:detachment']!==
    'node scripts/validate-r4-production-custom-detachment.mjs --source'
  ){
    fail(
      'package.json is missing r4:production:custom:detachment.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:custom:validate']!==
    'node scripts/validate-r4-production-custom-cutover.mjs --dist && node scripts/validate-r4-production-custom-detachment.mjs --dist'
  ){
    fail(
      'Final Production Custom validation must chain cutover + detachment hardening.'
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
      'npm run r4:production:custom:contract'
    );

  const detachment=
    validate.indexOf(
      'npm run r4:production:custom:detachment'
    );

  if(
    cutover<0||
    detachment<=cutover
  ){
    fail(
      'R4.6D Custom detachment source gate must run after the R4.6C Custom cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.6D package inspection failed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  validateCustomSw(
    sw,
    'Source Service Worker'
  );

  const appStart=
    sw.indexOf(
      'const APP_SHELL = ['
    );

  const appEnd=
    sw.indexOf(
      '];',
      appStart
    );

  if(
    appStart<0||
    appEnd<=appStart
  ){
    fail(
      'R4.6D could not isolate APP_SHELL.'
    );
  }else{
    const appShell=
      sw.slice(
        appStart,
        appEnd+2
      );

    for(const required of [
      "'./offline.html'",
      "'./src/services/pwa/runtime-pwa.js'",
      "'./src/services/submission/runtime-submission.js'",
      "'./src/services/risk/runtime-risk.js'",
      "'./src/features/inquiry/runtime-inquiry.js'",
      "'./src/features/contact/runtime-contact.js'",
      "'./src/app/runtime-inquiry-submission-flow.js'"
    ]){
      if(
        !appShell.includes(
          required
        )
      ){
        fail(
          'Remaining Legacy Inquiry PWA shell lost a required asset: '+
          required
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.6D source Service Worker inspection failed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/custom-runtime.js'
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
    'DreamlandDesktopExperience',
    'catalog-data.js',
    'startup-loader.js'
  ]){
    if(
      runtime.includes(
        forbidden
      )
    ){
      fail(
        'Astro Custom runtime must remain detached from PWA/Risk/Submission/Desktop bootstrap: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.6D Custom runtime source inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  try{
    const page=
      read(
        'src/astro/pages/custom/index.astro'
      );

    for(const marker of [
      'robots="index,follow"',
      'canonical="https://dreamland-catalog.pages.dev/custom/"',
      'id="customRuntimeState"',
      'src="/r4-custom-runtime.js"'
    ]){
      if(
        !page.includes(
          marker
        )
      ){
        fail(
          'R4.6D Production Custom source is missing: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'R4.6D source Custom inspection failed: '+
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

    const customFile=
      path.join(
        root,
        'custom',
        'index.html'
      );

    if(
      !fs.existsSync(
        customFile
      )
    ){
      fail(
        'Production Custom output is missing.'
      );
    }else{
      const html=
        fs.readFileSync(
          customFile,
          'utf8'
        );

      for(const marker of [
        'data-r4-astro-foundation="true"',
        'data-r4-astro-custom="true"',
        'data-custom-runtime-presentation',
        'name="robots" content="index,follow"',
        'rel="canonical" href="https://dreamland-catalog.pages.dev/custom/"',
        'id="customRuntimeState"',
        'src="/r4-custom-runtime.js"',
        'data-site-language-enabled="true"'
      ]){
        if(
          !html.includes(
            marker
          )
        ){
          fail(
            'Production Custom is missing hardening marker: '+
            marker
          );
        }
      }

      for(const forbidden of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-desktop-custom.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'runtime-pwa.js',
        'custom-scent-multi.js',
        'startup-loader.js',
        'navigator.serviceWorker',
        'serviceWorker.register'
      ]){
        if(
          html.includes(
            forbidden
          )
        ){
          fail(
            'Production Custom still contains Legacy/PWA bootstrap reference: '+
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
          'Production Custom must contain exactly one executable route runtime; found '+
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
          '/r4-custom-runtime.js'
      ){
        fail(
          'Production Custom executable graph must contain only /r4-custom-runtime.js.'
        );
      }

      const rawState=
        stateText(
          html
        );

      if(!rawState){
        fail(
          'Production Custom runtime state is missing.'
        );
      }else{
        try{
          const state=
            JSON.parse(
              rawState
            );

          if(
            state.version!=='R4.6B'||
            state.storage?.languageKey!==
              'productManualLang'||
            state.storage?.inquiryKey!==
              'productManualV2State'||
            state.storage?.inquiryVersion!==2
          ){
            fail(
              'Production Custom runtime-state ownership/storage contract changed.'
            );
          }
        }catch(error){
          fail(
            'Production Custom runtime state JSON is invalid: '+
            error.message
          );
        }
      }

      const htmlRaw=
        bytes(
          customFile
        );

      const stateRaw=
        Buffer.byteLength(
          rawState||
          '',
          'utf8'
        );

      const runtimeFile=
        path.join(
          root,
          'r4-custom-runtime.js'
        );

      if(
        !fs.existsSync(
          runtimeFile
        )
      ){
        fail(
          'Production Custom runtime output is missing.'
        );
      }

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
          'Production Custom HTML exceeds '+
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
          'Production Custom runtime state exceeds '+
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
          'Production Custom runtime exceeds '+
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
          'navigator.serviceWorker',
          'runtime-pwa.js',
          'DreamlandRisk',
          'DreamlandSubmission',
          'DreamlandDesktopExperience'
        ]){
          if(
            runtime.includes(
              forbidden
            )
          ){
            fail(
              'Production Custom runtime bundle crossed a forbidden boundary: '+
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
          'Production Custom should reference 1-3 Astro stylesheet assets; found '+
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
            'Production Custom stylesheet output is missing: '+
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
            bytes(file),
          0
        );

      if(
        styleRaw>
        BUDGETS.styleRaw
      ){
        fail(
          'Production Custom styles exceed '+
          kib(BUDGETS.styleRaw)+
          ' KiB: '+
          kib(styleRaw)+
          ' KiB.'
        );
      }

      let codeGzip=0;
      let criticalRaw=
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
            customFile
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
            'Production Custom HTML+JS+CSS gzip proxy exceeds '+
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
            'Production Custom critical raw payload exceeds '+
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
          '[R4.6D Custom Payload]'
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
        'Production Service Worker is missing while Inquiry remains Legacy-owned.'
      );
    }else{
      validateCustomSw(
        fs.readFileSync(
          swFile,
          'utf8'
        ),
        'Production Service Worker'
      );
    }

    const inquirySelection=
      path.join(
        root,
        'inquiry/index.html'
      );

    if(
      !fs.existsSync(
        inquirySelection
      )
    ){
      fail(
        'R4.6D downstream Inquiry selection route is missing after the R4.7C cutover.'
      );
    }else{
      const inquiry=
        fs.readFileSync(
          inquirySelection,
          'utf8'
        );

      if(
        !inquiry.includes(
          'data-r4-astro-inquiry="true"'
        )||
        !inquiry.includes(
          'src="/r4-inquiry-runtime.js"'
        )||
        inquiry.includes(
          'DREAMLAND_MPA_ACTIVE'
        )
      ){
        fail(
          'R4.6D downstream owner compatibility requires Astro Inquiry selection after R4.7C.'
        );
      }
    }

    const contactRoute=
      path.join(
        root,
        'inquiry/contact/index.html'
      );

    if(
      !fs.existsSync(
        contactRoute
      )
    ){
      fail(
        'R4.6D downstream Contact route is missing after the R4.8C cutover.'
      );
    }else{
      const contact=
        fs.readFileSync(
          contactRoute,
          'utf8'
        );

      if(
        !contact.includes(
          'data-r4-astro-contact="true"'
        )||
        !contact.includes(
          'src="/r4-contact-runtime.js"'
        )||
        contact.includes(
          'DREAMLAND_MPA_ACTIVE'
        )
      ){
        fail(
          'R4.6D downstream owner compatibility requires Astro Contact after R4.8C.'
        );
      }
    }

    for(const relative of [
      'inquiry/review/index.html',
      'inquiry/success/index.html'
    ]){
      const route=
        path.join(
          root,
          relative
        );

      if(
        !fs.existsSync(
          route
        )||
        !fs.readFileSync(
          route,
          'utf8'
        ).includes(
          'window.DREAMLAND_MPA_ACTIVE=true;'
        )
      ){
        fail(
          'R4.6D must preserve Legacy Review/Success ownership: '+
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
        manifest.homeOwner!=='astro'||
        manifest.catalogOwner!=='astro'||
        manifest.pdpOwner!=='astro'||
        manifest.customOwner!=='astro'||
        manifest.customCutover!==
          'B7-00B.4J-R4.6C'||
        manifest.presentationOverrides
          ?.custom!==
          'astro-r4.6c'
      ){
        fail(
          'Production ownership manifest lost Home/Catalog/PDP/Custom Astro ownership.'
        );
      }
    }
  }catch(error){
    fail(
      'R4.6D dist-mode validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.6D Custom Legacy Detachment / Payload Hardening: FAIL'
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
  'DREAMLAND B7-00B.4J R4.6D Custom Legacy Detachment / Payload Hardening: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Custom Service Worker cache isolation / exact route ownership / network-only navigation / runtime boundary verified.'
    : 'Production Custom cache isolation, remaining Legacy Inquiry boundary and payload budgets verified.'
);
console.log('');

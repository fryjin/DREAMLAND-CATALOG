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
    'Usage: node scripts/validate-r4-production-catalog-detachment.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

const BUDGETS=
  Object.freeze({
    htmlRaw:256*1024,
    stateRaw:128*1024,
    runtimeRaw:56*1024,
    styleRaw:96*1024,
    codeGzip:96*1024,
    eagerCoversRaw:4*1024*1024,
    singleEagerCoverRaw:1536*1024
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

function runtimeStateText(html){
  const match=
    html.match(
      /<script[^>]*id="catalogRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="catalogRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

function runtimeState(html){
  const source=
    runtimeStateText(
      html
    );

  if(!source){
    fail(
      'Catalog runtime state JSON is missing.'
    );
    return null;
  }

  try{
    return JSON.parse(
      source
    );
  }catch(error){
    fail(
      'Catalog runtime state JSON is invalid: '+
      error.message
    );
    return null;
  }
}

function setEntries(
  source,
  name
){
  const start=
    source.search(
      new RegExp(
        'const\\s+'+
        name+
        '\\s*=\\s*new\\s+Set\\s*\\(\\s*\\['
      )
    );

  if(start<0){
    return [];
  }

  const end=
    source.indexOf(
      ']);',
      start
    );

  if(end<=start){
    return [];
  }

  return [
    ...source
      .slice(
        start,
        end
      )
      .matchAll(
        /['"]([^'"]+)['"]/g
      )
  ].map(
    match=>match[1]
  );
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
    return source.slice(
      start
    );
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

function attribute(
  tag,
  name
){
  const doubleQuoted=
    tag.match(
      new RegExp(
        '\\b'+
        name+
        '="([^"]+)"',
        'i'
      )
    );

  if(doubleQuoted){
    return doubleQuoted[1];
  }

  const singleQuoted=
    tag.match(
      new RegExp(
        "\\b"+
        name+
        "='([^']+)'",
        'i'
      )
    );

  return singleQuoted
    ? singleQuoted[1]
    : '';
}

function validateCatalogSw(
  source,
  label
){
  const entries=
    setEntries(
      source,
      'CATALOG_NAVIGATION_PATHS'
    );

  if(
    entries.length!==2||
    entries[0]!=='/products/'||
    entries[1]!=='/products/index.html'
  ){
    fail(
      label+
      ' Catalog navigation ownership must contain exactly /products/ and /products/index.html; found: '+
      JSON.stringify(entries)
    );
  }

  const catalogMatcher=
    functionSlice(
      source,
      'isCatalogNavigation',
      'purgeLegacyCatalogEntries'
    );

  if(
    !/CATALOG_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/
      .test(
        catalogMatcher
      )
  ){
    fail(
      label+
      ' isCatalogNavigation must use exact Set membership on url.pathname.'
    );
  }

  for(const broadMatcher of [
    'startsWith(',
    'includes(',
    '/products/**'
  ]){
    if(
      catalogMatcher.includes(
        broadMatcher
      )
    ){
      fail(
        label+
        ' Catalog navigation matcher is broader than the Catalog index document: '+
        broadMatcher
      );
    }
  }

  for(const marker of [
    'function isCatalogNavigation(',
    'function purgeLegacyCatalogEntries(',
    'function catalogNetworkOnly(',
    'CATALOG_NAVIGATION_PATHS',
    'purgeLegacyCatalogEntries()'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        label+
        ' Catalog detachment contract is missing: '+
        marker
      );
    }
  }

  const networkOnly=
    functionSlice(
      source,
      'catalogNetworkOnly',
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
      ' Catalog network-only fetch must use cache:no-store.'
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
      'isCatalogNavigation(url)',
      /isCatalogNavigation\s*\(\s*url\s*\)/
    ],
    [
      'catalogNetworkOnly(request)',
      /catalogNetworkOnly\s*\(\s*request\s*\)/
    ],
    [
      "['./offline.html']",
      /\[\s*['"]\.\/offline\.html['"]\s*\]/
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

  const catalogIndex=
    navigation.search(
      /isCatalogNavigation\s*\(\s*url\s*\)/
    );

  const genericIndex=
    navigation.search(
      /networkFirst\s*\(/
    );

  if(
    catalogIndex<0||
    genericIndex<0||
    catalogIndex>=genericIndex
  ){
    fail(
      label+
      ' Catalog navigation must be intercepted before the Legacy networkFirst branch.'
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
      ?.['r4:production:catalog:detachment']!==
    'node scripts/validate-r4-production-catalog-detachment.mjs --source'
  ){
    fail(
      'package.json is missing r4:production:catalog:detachment.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:catalog:validate']!==
    'node scripts/validate-r4-production-catalog-cutover.mjs --dist && node scripts/validate-r4-production-catalog-detachment.mjs --dist'
  ){
    fail(
      'Final Production Catalog validation must chain cutover + detachment hardening.'
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
      'npm run r4:production:catalog:contract'
    );

  const detachment=
    validate.indexOf(
      'npm run r4:production:catalog:detachment'
    );

  if(
    cutover<0||
    detachment<=cutover
  ){
    fail(
      'R4.4D Catalog detachment source gate must run after the R4.4C cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.4D package inspection failed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  validateCatalogSw(
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
      'R4.4D could not isolate APP_SHELL.'
    );
  }else{
    const appShell=
      sw.slice(
        appStart,
        appEnd+2
      );

    for(const forbidden of [
      "'./products/',",
      "'./products/index.html'"
    ]){
      if(
        appShell.includes(
          forbidden
        )
      ){
        fail(
          'Astro Catalog document must not be precached by Legacy APP_SHELL: '+
          forbidden
        );
      }
    }

    for(const required of [
      "'./offline.html'",
      "'./src/services/pwa/runtime-pwa.js'",
      "'./src/features/detail/runtime-detail.js'",
      "'./src/features/inquiry/runtime-inquiry.js'",
      "'./src/features/custom/runtime-custom.js'"
    ]){
      if(
        !appShell.includes(
          required
        )
      ){
        fail(
          'Legacy PDP/Custom/Inquiry PWA shell lost a required asset: '+
          required
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.4D source Service Worker inspection failed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/catalog-runtime.js'
    );

  for(const forbidden of [
    'serviceWorker',
    'navigator.serviceWorker',
    'registerServiceWorker',
    'runtime-pwa.js',
    'DreamlandPwa'
  ]){
    if(
      runtime.includes(
        forbidden
      )
    ){
      fail(
        'Astro Catalog runtime must remain detached from Service Worker bootstrap: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.4D Catalog runtime source inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  try{
    const page=
      read(
        'src/astro/pages/products/index.astro'
      );

    for(const marker of [
      'robots="index,follow"',
      'canonical="https://dreamland-catalog.pages.dev/products/"',
      'id="catalogRuntimeState"',
      'src="/r4-catalog-runtime.js"'
    ]){
      if(
        !page.includes(
          marker
        )
      ){
        fail(
          'R4.4D Production Catalog source is missing: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'R4.4D source Catalog inspection failed: '+
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

    const catalogFile=
      path.join(
        root,
        'products',
        'index.html'
      );

    if(
      !fs.existsSync(
        catalogFile
      )
    ){
      fail(
        'Production Catalog output is missing: dist/products/index.html'
      );
    }else{
      const catalog=
        fs.readFileSync(
          catalogFile,
          'utf8'
        );

      for(const marker of [
        'data-r4-astro-catalog="true"',
        'data-catalog-runtime-presentation',
        'name="robots" content="index,follow"',
        'rel="canonical" href="https://dreamland-catalog.pages.dev/products/"',
        'id="catalogRuntimeState"',
        'src="/r4-catalog-runtime.js"'
      ]){
        if(
          !catalog.includes(
            marker
          )
        ){
          fail(
            'Production Catalog hardening marker is missing: '+
            marker
          );
        }
      }

      for(const forbidden of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-desktop-catalog.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'runtime-pwa.js',
        'catalog-data.js',
        'startup-loader.js',
        'serviceWorker.register',
        'navigator.serviceWorker'
      ]){
        if(
          catalog.includes(
            forbidden
          )
        ){
          fail(
            'Production Catalog still contains a Legacy/PWA bootstrap reference: '+
            forbidden
          );
        }
      }

      const executableScripts=[
        ...catalog.matchAll(
          /<script\b(?![^>]*type="application\/json")[^>]*>/gi
        )
      ];

      if(
        executableScripts.length!==1
      ){
        fail(
          'Production Catalog must keep exactly one executable script; found '+
          executableScripts.length+
          '.'
        );
      }

      const scriptSources=[
        ...catalog.matchAll(
          /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi
        )
      ].map(
        match=>match[1]
      );

      if(
        scriptSources.length!==1||
        scriptSources[0]!==
          '/r4-catalog-runtime.js'
      ){
        fail(
          'Production Catalog executable graph must contain only /r4-catalog-runtime.js.'
        );
      }

      const stateText=
        runtimeStateText(
          catalog
        );

      const state=
        runtimeState(
          catalog
        );

      const runtimeFile=
        path.join(
          root,
          'r4-catalog-runtime.js'
        );

      if(
        !fs.existsSync(
          runtimeFile
        )
      ){
        fail(
          'Production Catalog runtime output is missing.'
        );
      }

      const stylePaths=[
        ...new Set(
          [
            ...catalog.matchAll(
              /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi
            ),
            ...catalog.matchAll(
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
          'Production Catalog should reference 1-3 Astro stylesheet assets; found '+
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
            'Production Catalog stylesheet output is missing: '+
            href
          );
          continue;
        }

        styleFiles.push(
          file
        );
      }

      const productIds=[
        ...catalog.matchAll(
          /data-catalog-product="([A-Z0-9]+)"/g
        )
      ].map(
        match=>match[1]
      );

      if(
        productIds.length!==24||
        new Set(productIds).size!==24
      ){
        fail(
          'Production Catalog must keep exactly 24 unique SSR cards; found '+
          productIds.length+
          '.'
        );
      }

      const coverTags=[
        ...catalog.matchAll(
          /<img\b[^>]*\bsrc="\/images\/products\/[^"]+\/cover\.webp"[^>]*>/gi
        )
      ].map(
        match=>match[0]
      );

      if(
        coverTags.length!==24
      ){
        fail(
          'Production Catalog must expose exactly 24 initial SSR cover images; found '+
          coverTags.length+
          '.'
        );
      }

      const eagerTags=
        coverTags.filter(
          tag=>
            /\bloading="eager"/i
              .test(tag)
        );

      const lazyTags=
        coverTags.filter(
          tag=>
            /\bloading="lazy"/i
              .test(tag)
        );

      if(eagerTags.length!==4){
        fail(
          'Production Catalog must keep exactly 4 eager cover images; found '+
          eagerTags.length+
          '.'
        );
      }

      if(lazyTags.length!==20){
        fail(
          'Production Catalog must keep exactly 20 lazy initial cover images; found '+
          lazyTags.length+
          '.'
        );
      }

      for(const tag of eagerTags){
        if(
          !/\bfetchpriority="high"/i
            .test(tag)
        ){
          fail(
            'Every eager Catalog cover must use fetchpriority=high.'
          );
        }
      }

      let initialCoverRaw=0;
      let eagerCoverRaw=0;
      let maxEagerCoverRaw=0;

      const eagerSources=
        new Set(
          eagerTags.map(
            tag=>
              attribute(
                tag,
                'src'
              )
          )
        );

      for(const tag of coverTags){
        const src=
          attribute(
            tag,
            'src'
          );

        const relative=
          src.replace(
            /^\/+/,
            ''
          );

        const file=
          path.join(
            root,
            relative
          );

        if(
          !src||
          !fs.existsSync(
            file
          )
        ){
          fail(
            'Initial Catalog cover output is missing: '+
            (
              src||
              '(missing src)'
            )
          );
          continue;
        }

        const raw=
          bytes(file);

        initialCoverRaw+=
          raw;

        if(
          eagerSources.has(
            src
          )
        ){
          eagerCoverRaw+=
            raw;

          maxEagerCoverRaw=
            Math.max(
              maxEagerCoverRaw,
              raw
            );
        }
      }

      if(
        eagerCoverRaw>
        BUDGETS.eagerCoversRaw
      ){
        fail(
          'Production Catalog eager-cover payload exceeds '+
          kib(BUDGETS.eagerCoversRaw)+
          ' KiB: '+
          kib(eagerCoverRaw)+
          ' KiB.'
        );
      }

      if(
        maxEagerCoverRaw>
        BUDGETS.singleEagerCoverRaw
      ){
        fail(
          'A Production Catalog eager cover exceeds '+
          kib(BUDGETS.singleEagerCoverRaw)+
          ' KiB: '+
          kib(maxEagerCoverRaw)+
          ' KiB.'
        );
      }

      if(state){
        if(
          state.version!=='R4.4B'||
          state.products?.length!==89
        ){
          fail(
            'Production Catalog runtime state must keep the 89-product R4.4B contract.'
          );
        }

        for(const product of state.products||[]){
          const cover=
            String(
              product?.cover||
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
              'Production Catalog runtime cover is missing: '+
              (
                product?.id||
                '(unknown)'
              )
            );
          }
        }
      }

      if(
        stateText&&
        Buffer.byteLength(
          stateText,
          'utf8'
        )>
        BUDGETS.stateRaw
      ){
        fail(
          'Production Catalog runtime state exceeds '+
          kib(BUDGETS.stateRaw)+
          ' KiB: '+
          kib(
            Buffer.byteLength(
              stateText,
              'utf8'
            )
          )+
          ' KiB.'
        );
      }

      if(
        bytes(
          catalogFile
        )>
        BUDGETS.htmlRaw
      ){
        fail(
          'Production Catalog HTML exceeds '+
          kib(BUDGETS.htmlRaw)+
          ' KiB: '+
          kib(
            bytes(
              catalogFile
            )
          )+
          ' KiB.'
        );
      }

      if(
        fs.existsSync(
          runtimeFile
        )&&
        bytes(runtimeFile)>
        BUDGETS.runtimeRaw
      ){
        fail(
          'Production Catalog runtime exceeds '+
          kib(BUDGETS.runtimeRaw)+
          ' KiB: '+
          kib(
            bytes(runtimeFile)
          )+
          ' KiB.'
        );
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
          'Production Catalog styles exceed '+
          kib(BUDGETS.styleRaw)+
          ' KiB: '+
          kib(styleRaw)+
          ' KiB.'
        );
      }

      if(
        fs.existsSync(
          runtimeFile
        )&&
        styleFiles.length===
          stylePaths.length
      ){
        const codeGzip=
          gzipBytes(
            catalogFile
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
              gzipBytes(file),
            0
          );

        if(
          codeGzip>
          BUDGETS.codeGzip
        ){
          fail(
            'Production Catalog HTML+JS+CSS gzip proxy exceeds '+
            kib(BUDGETS.codeGzip)+
            ' KiB: '+
            kib(codeGzip)+
            ' KiB.'
          );
        }

        console.log('');
        console.log(
          '[R4.4D Catalog Payload]'
        );
        console.log(
          '- HTML:',
          kib(
            bytes(
              catalogFile
            )
          )+
          ' KiB raw'
        );
        console.log(
          '- Runtime state:',
          kib(
            Buffer.byteLength(
              stateText||
              '',
              'utf8'
            )
          )+
          ' KiB raw'
        );
        console.log(
          '- Runtime:',
          kib(
            bytes(
              runtimeFile
            )
          )+
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
          '- SSR cards:',
          productIds.length
        );
        console.log(
          '- Initial covers:',
          coverTags.length+
          ' / '+
          kib(initialCoverRaw)+
          ' KiB raw'
        );
        console.log(
          '- Eager covers:',
          eagerTags.length+
          ' / '+
          kib(eagerCoverRaw)+
          ' KiB raw'
        );
      }
    }

    const runtimeFile=
      path.join(
        root,
        'r4-catalog-runtime.js'
      );

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
        'serviceWorker',
        'navigator.serviceWorker',
        'runtime-pwa.js',
        'DreamlandPwa'
      ]){
        if(
          runtime.includes(
            forbidden
          )
        ){
          fail(
            'Production Catalog runtime bundle must remain detached from PWA bootstrap: '+
            forbidden
          );
        }
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
        'Production Service Worker is missing while PDP/Custom/Inquiry remain Legacy-owned.'
      );
    }else{
      validateCatalogSw(
        fs.readFileSync(
          swFile,
          'utf8'
        ),
        'Production Service Worker'
      );
    }

    const products=
      json(
        'data/products.json'
      )
        .products||
      [];

    const firstProduct=
      products.find(
        product=>
          product?.status===
          'active'
      );

    const firstProductId=
      String(
        firstProduct
          ?.productId||
        firstProduct?.id||
        ''
      )
        .trim()
        .toUpperCase();

    if(firstProductId){
      const pdp=
        path.join(
          root,
          'products',
          firstProductId,
          'index.html'
        );

      if(
        !fs.existsSync(
          pdp
        )||
        !fs.readFileSync(
          pdp,
          'utf8'
        ).includes(
          'data-r4-astro-product="true"'
        )
      ){
        fail(
          'R4.4D Catalog hardening must coexist with the Astro PDP owner after R4.5C.'
        );
      }
    }
  }catch(error){
    fail(
      'R4.4D dist-mode validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.4D Catalog Legacy Detachment / Payload Hardening: FAIL'
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
  'DREAMLAND B7-00B.4J R4.4D Catalog Legacy Detachment / Payload Hardening: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Catalog Service Worker document isolation / exact-path purge / network-only ownership / runtime boundary verified.'
    : 'Production Catalog cache isolation, Legacy PDP boundary and payload budgets verified.'
);
console.log('');

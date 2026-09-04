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
    'Usage: node scripts/validate-r4-production-pdp-detachment.mjs --source | --dist'
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
    primaryImageRaw:2560*1024,
    criticalRaw:3072*1024
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

function text(value){
  return String(
    value??
    ''
  ).trim();
}

function runtimeStateText(html){
  const match=
    html.match(
      /<script[^>]*id="pdpRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="pdpRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

function runtimeState(
  html,
  productId
){
  const source=
    runtimeStateText(
      html
    );

  if(!source){
    fail(
      'PDP runtime state JSON is missing: '+
      productId
    );
    return null;
  }

  try{
    return JSON.parse(
      source
    );
  }catch(error){
    fail(
      'PDP runtime state JSON is invalid for '+
      productId+
      ': '+
      error.message
    );
    return null;
  }
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

function validatePdpSw(
  source,
  label
){
  const expectedPattern=
    /const\s+PDP_NAVIGATION_PATTERN\s*=\s*\/\^\\\/products\\\/\[A-Z\]\{3\}\\d\{3\}\(\?:\\\/\(\?:index\\\.html\)\?\)\?\$\/i\s*;/m;

  if(
    !expectedPattern.test(
      source
    )
  ){
    fail(
      label+
      ' PDP navigation ownership must cover only /products/{AAA000}, /products/{AAA000}/ and /products/{AAA000}/index.html.'
    );
  }

  for(const marker of [
    'function isPdpNavigation(',
    'function purgeLegacyPdpEntries(',
    'function pdpNetworkOnly(',
    'PDP_NAVIGATION_PATTERN',
    'purgeLegacyPdpEntries()'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        label+
        ' PDP detachment contract is missing: '+
        marker
      );
    }
  }

  const matcher=
    functionSlice(
      source,
      'isPdpNavigation',
      'purgeLegacyPdpEntries'
    );

  if(
    !/PDP_NAVIGATION_PATTERN\s*\.\s*test\s*\(\s*url\.pathname\s*\)/
      .test(
        matcher
      )
  ){
    fail(
      label+
      ' isPdpNavigation must apply PDP_NAVIGATION_PATTERN to url.pathname.'
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
        ' PDP matcher must not use a broad pathname predicate: '+
        forbidden
      );
    }
  }

  const networkOnly=
    functionSlice(
      source,
      'pdpNetworkOnly',
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
      ' PDP network-only fetch must use cache:no-store.'
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
      'isPdpNavigation(url)',
      /isPdpNavigation\s*\(\s*url\s*\)/
    ],
    [
      'pdpNetworkOnly(request)',
      /pdpNetworkOnly\s*\(\s*request\s*\)/
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

  const genericIndex=
    navigation.search(
      /networkFirst\s*\(/
    );

  if(
    homeIndex<0||
    catalogIndex<0||
    pdpIndex<0||
    genericIndex<0||
    !(
      homeIndex<
      catalogIndex&&
      catalogIndex<
      pdpIndex&&
      pdpIndex<
      genericIndex
    )
  ){
    fail(
      label+
      ' navigation ownership must resolve Home → Catalog → PDP → remaining Legacy routes.'
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
      ?.['r4:production:pdp:detachment']!==
    'node scripts/validate-r4-production-pdp-detachment.mjs --source'
  ){
    fail(
      'package.json is missing r4:production:pdp:detachment.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:pdp:validate']!==
    'node scripts/validate-r4-production-pdp-cutover.mjs --dist && node scripts/validate-r4-production-pdp-detachment.mjs --dist'
  ){
    fail(
      'Final Production PDP validation must chain cutover + detachment hardening.'
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
      'npm run r4:production:pdp:contract'
    );

  const detachment=
    validate.indexOf(
      'npm run r4:production:pdp:detachment'
    );

  if(
    cutover<0||
    detachment<=cutover
  ){
    fail(
      'R4.5D PDP detachment source gate must run after the R4.5C cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.5D package inspection failed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  validatePdpSw(
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
      'R4.5D could not isolate APP_SHELL.'
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
      "'./src/features/custom/runtime-custom.js'",
      "'./src/features/inquiry/runtime-inquiry.js'",
      "'./src/features/contact/runtime-contact.js'"
    ]){
      if(
        !appShell.includes(
          required
        )
      ){
        fail(
          'Legacy Custom/Inquiry PWA shell lost a required asset: '+
          required
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.5D source Service Worker inspection failed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/pdp-runtime.js'
    );

  for(const forbidden of [
    'serviceWorker',
    'navigator.serviceWorker',
    'registerServiceWorker',
    'runtime-pwa.js',
    'DreamlandPwa',
    'DreamlandRisk',
    'DreamlandSubmission'
  ]){
    if(
      runtime.includes(
        forbidden
      )
    ){
      fail(
        'Astro PDP runtime must remain detached from PWA/Risk/Submission bootstrap: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.5D PDP runtime source inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  try{
    const page=
      read(
        'src/astro/pages/products/[productId].astro'
      );

    for(const marker of [
      'robots="index,follow"',
      'id="pdpRuntimeState"',
      'src="/r4-pdp-runtime.js"'
    ]){
      if(
        !page.includes(
          marker
        )
      ){
        fail(
          'R4.5D Production PDP source is missing: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'R4.5D source PDP inspection failed: '+
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

    const products=
      json(
        'data/products.json'
      )
        .products
        .filter(
          product=>
            product?.status===
            'active'
        );

    if(products.length!==89){
      fail(
        'R4.5D expected 89 active Production PDPs; found '+
        products.length+
        '.'
      );
    }

    const runtimeFile=
      path.join(
        root,
        'r4-pdp-runtime.js'
      );

    if(
      !fs.existsSync(
        runtimeFile
      )
    ){
      fail(
        'Production PDP runtime output is missing.'
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
      runtimeRaw>
      BUDGETS.runtimeRaw
    ){
      fail(
        'Production PDP runtime exceeds '+
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
        'serviceWorker',
        'navigator.serviceWorker',
        'runtime-pwa.js',
        'DreamlandPwa',
        'DreamlandRisk',
        'DreamlandSubmission'
      ]){
        if(
          runtime.includes(
            forbidden
          )
        ){
          fail(
            'Production PDP runtime bundle crossed a forbidden boundary: '+
            forbidden
          );
        }
      }
    }

    let maxHtml={
      bytes:0,
      id:''
    };

    let maxState={
      bytes:0,
      id:''
    };

    let maxStyles={
      bytes:0,
      id:''
    };

    let maxCodeGzip={
      bytes:0,
      id:''
    };

    let maxPrimary={
      bytes:0,
      id:'',
      src:''
    };

    let maxCritical={
      bytes:0,
      id:''
    };

    let maxMediaCount={
      count:0,
      id:''
    };

    for(const product of products){
      const id=
        text(
          product?.productId||
          product?.id
        )
          .toUpperCase();

      const file=
        path.join(
          root,
          'products',
          id,
          'index.html'
        );

      if(
        !fs.existsSync(
          file
        )
      ){
        fail(
          'Production PDP output is missing: '+
          id
        );
        continue;
      }

      const html=
        fs.readFileSync(
          file,
          'utf8'
        );

      for(const marker of [
        'data-r4-astro-product="true"',
        'data-pdp-runtime-presentation',
        'data-product-id="'+
          id+
          '"',
        'name="robots" content="index,follow"',
        'id="pdpRuntimeState"',
        'src="/r4-pdp-runtime.js"'
      ]){
        if(
          !html.includes(
            marker
          )
        ){
          fail(
            'Production PDP '+id+
            ' is missing hardening marker: '+
            marker
          );
        }
      }

      for(const forbidden of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-desktop-detail.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'runtime-pwa.js',
        'catalog-data.js',
        'startup-loader.js',
        'serviceWorker.register',
        'navigator.serviceWorker'
      ]){
        if(
          html.includes(
            forbidden
          )
        ){
          fail(
            'Production PDP '+id+
            ' still contains Legacy/PWA bootstrap reference: '+
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
          'Production PDP '+id+
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
          '/r4-pdp-runtime.js'
      ){
        fail(
          'Production PDP '+id+
          ' executable graph must contain only /r4-pdp-runtime.js.'
        );
      }

      const stateText=
        runtimeStateText(
          html
        );

      const state=
        runtimeState(
          html,
          id
        );

      if(
        state&&
        (
          state.version!=='R4.5B'||
          state.product?.id!==id
        )
      ){
        fail(
          'Production PDP runtime state ownership changed for '+
          id+
          '.'
        );
      }

      const stateRaw=
        Buffer.byteLength(
          stateText||
          '',
          'utf8'
        );

      if(
        stateRaw>
        maxState.bytes
      ){
        maxState={
          bytes:stateRaw,
          id
        };
      }

      if(
        stateRaw>
        BUDGETS.stateRaw
      ){
        fail(
          'Production PDP '+id+
          ' runtime state exceeds '+
          kib(BUDGETS.stateRaw)+
          ' KiB: '+
          kib(stateRaw)+
          ' KiB.'
        );
      }

      const htmlRaw=
        bytes(
          file
        );

      if(
        htmlRaw>
        maxHtml.bytes
      ){
        maxHtml={
          bytes:htmlRaw,
          id
        };
      }

      if(
        htmlRaw>
        BUDGETS.htmlRaw
      ){
        fail(
          'Production PDP '+id+
          ' HTML exceeds '+
          kib(BUDGETS.htmlRaw)+
          ' KiB: '+
          kib(htmlRaw)+
          ' KiB.'
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
          'Production PDP '+id+
          ' should reference 1-3 Astro stylesheet assets; found '+
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

        const styleFile=
          path.join(
            root,
            relative
          );

        if(
          !fs.existsSync(
            styleFile
          )
        ){
          fail(
            'Production PDP '+id+
            ' stylesheet output is missing: '+
            href
          );
          continue;
        }

        styleFiles.push(
          styleFile
        );
      }

      const styleRaw=
        styleFiles.reduce(
          (
            total,
            styleFile
          )=>
            total+
            bytes(
              styleFile
            ),
          0
        );

      if(
        styleRaw>
        maxStyles.bytes
      ){
        maxStyles={
          bytes:styleRaw,
          id
        };
      }

      if(
        styleRaw>
        BUDGETS.styleRaw
      ){
        fail(
          'Production PDP '+id+
          ' styles exceed '+
          kib(BUDGETS.styleRaw)+
          ' KiB: '+
          kib(styleRaw)+
          ' KiB.'
        );
      }

      const mediaTags=[
        ...html.matchAll(
          /<img\b[^>]*\bsrc="\/images\/products\/[^"]+\.(?:webp|png|jpe?g)"[^>]*>/gi
        )
      ].map(
        match=>match[0]
      );

      if(
        mediaTags.length<1||
        mediaTags.length>10
      ){
        fail(
          'Production PDP '+id+
          ' must render 1-10 Product images; found '+
          mediaTags.length+
          '.'
        );
      }

      if(
        mediaTags.length>
        maxMediaCount.count
      ){
        maxMediaCount={
          count:mediaTags.length,
          id
        };
      }

      const eager=
        mediaTags.filter(
          tag=>
            /\bloading="eager"/i
              .test(
                tag
              )
        );

      const lazy=
        mediaTags.filter(
          tag=>
            /\bloading="lazy"/i
              .test(
                tag
              )
        );

      if(
        eager.length!==1
      ){
        fail(
          'Production PDP '+id+
          ' must keep exactly one eager Product image; found '+
          eager.length+
          '.'
        );
      }

      if(
        lazy.length!==
        Math.max(
          0,
          mediaTags.length-1
        )
      ){
        fail(
          'Production PDP '+id+
          ' non-primary Product images must remain lazy; found '+
          lazy.length+
          ' lazy of '+
          mediaTags.length+
          '.'
        );
      }

      let primaryRaw=0;
      let primarySrc='';

      if(eager.length===1){
        const tag=
          eager[0];

        if(
          !/\bfetchpriority="high"/i
            .test(
              tag
            )
        ){
          fail(
            'Production PDP '+id+
            ' eager Product image must use fetchpriority=high.'
          );
        }

        primarySrc=
          attribute(
            tag,
            'src'
          );

        const primaryFile=
          path.join(
            root,
            primarySrc.replace(
              /^\/+/,
              ''
            )
          );

        if(
          !primarySrc||
          !fs.existsSync(
            primaryFile
          )
        ){
          fail(
            'Production PDP '+id+
            ' primary Product image is missing: '+
            (
              primarySrc||
              '(missing src)'
            )
          );
        }else{
          primaryRaw=
            bytes(
              primaryFile
            );

          if(
            primaryRaw>
            maxPrimary.bytes
          ){
            maxPrimary={
              bytes:primaryRaw,
              id,
              src:primarySrc
            };
          }

          if(
            primaryRaw>
            BUDGETS.primaryImageRaw
          ){
            fail(
              'Production PDP '+id+
              ' primary Product image exceeds '+
              kib(BUDGETS.primaryImageRaw)+
              ' KiB: '+
              kib(primaryRaw)+
              ' KiB.'
            );
          }
        }
      }

      for(const tag of mediaTags){
        const src=
          attribute(
            tag,
            'src'
          );

        const mediaFile=
          path.join(
            root,
            src.replace(
              /^\/+/,
              ''
            )
          );

        if(
          !src||
          !fs.existsSync(
            mediaFile
          )
        ){
          fail(
            'Production PDP '+id+
            ' referenced Product image is missing: '+
            (
              src||
              '(missing src)'
            )
          );
        }
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
            file
          )+
          gzipBytes(
            runtimeFile
          )+
          styleFiles.reduce(
            (
              total,
              styleFile
            )=>
              total+
              gzipBytes(
                styleFile
              ),
            0
          );

        if(
          codeGzip>
          maxCodeGzip.bytes
        ){
          maxCodeGzip={
            bytes:codeGzip,
            id
          };
        }

        if(
          codeGzip>
          BUDGETS.codeGzip
        ){
          fail(
            'Production PDP '+id+
            ' HTML+JS+CSS gzip proxy exceeds '+
            kib(BUDGETS.codeGzip)+
            ' KiB: '+
            kib(codeGzip)+
            ' KiB.'
          );
        }

        const criticalRaw=
          htmlRaw+
          runtimeRaw+
          styleRaw+
          primaryRaw;

        if(
          criticalRaw>
          maxCritical.bytes
        ){
          maxCritical={
            bytes:criticalRaw,
            id
          };
        }

        if(
          criticalRaw>
          BUDGETS.criticalRaw
        ){
          fail(
            'Production PDP '+id+
            ' critical raw payload exceeds '+
            kib(BUDGETS.criticalRaw)+
            ' KiB: '+
            kib(criticalRaw)+
            ' KiB.'
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
        'Production Service Worker is missing while Custom/Inquiry remain Legacy-owned.'
      );
    }else{
      validatePdpSw(
        fs.readFileSync(
          swFile,
          'utf8'
        ),
        'Production Service Worker'
      );
    }

    const manifest=
      JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            'multipage-build-manifest.json'
          ),
          'utf8'
        )
      );

    if(
      manifest.homeOwner!=='astro'||
      manifest.catalogOwner!=='astro'||
      manifest.pdpOwner!=='astro'||
      manifest.pdpCutover!==
        'B7-00B.4J-R4.5C'
    ){
      fail(
        'Production ownership manifest lost Home/Catalog/PDP Astro ownership.'
      );
    }

    const customRoute=
      path.join(
        root,
        'custom/index.html'
      );

    if(
      !fs.existsSync(
        customRoute
      )
    ){
      fail(
        'R4.5D downstream Custom route is missing after the R4.6C cutover.'
      );
    }else{
      const custom=
        fs.readFileSync(
          customRoute,
          'utf8'
        );

      if(
        !custom.includes(
          'data-r4-astro-custom="true"'
        )||
        !custom.includes(
          'src="/r4-custom-runtime.js"'
        )||
        custom.includes(
          'DREAMLAND_MPA_ACTIVE'
        )
      ){
        fail(
          'R4.5D downstream owner compatibility requires Astro Custom after R4.6C.'
        );
      }
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
        'R4.5D downstream Inquiry selection route is missing after the R4.7C cutover.'
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
          'R4.5D downstream owner compatibility requires Astro Inquiry selection after R4.7C.'
        );
      }
    }

    for(const relative of [
      'inquiry/contact/index.html',
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
          'R4.5D must preserve Legacy downstream Inquiry ownership: '+
          relative
        );
      }
    }

    if(!errors.length){
      console.log('');
      console.log(
        '[R4.5D PDP Payload]'
      );
      console.log(
        '- PDPs:',
        products.length
      );
      console.log(
        '- Shared runtime:',
        kib(runtimeRaw)+
        ' KiB raw'
      );
      console.log(
        '- Max HTML:',
        kib(maxHtml.bytes)+
        ' KiB / '+
        maxHtml.id
      );
      console.log(
        '- Max runtime state:',
        kib(maxState.bytes)+
        ' KiB / '+
        maxState.id
      );
      console.log(
        '- Max styles:',
        kib(maxStyles.bytes)+
        ' KiB / '+
        maxStyles.id
      );
      console.log(
        '- Max HTML+JS+CSS gzip proxy:',
        kib(maxCodeGzip.bytes)+
        ' KiB / '+
        maxCodeGzip.id
      );
      console.log(
        '- Largest primary image:',
        kib(maxPrimary.bytes)+
        ' KiB / '+
        maxPrimary.id
      );
      console.log(
        '- Max critical raw:',
        kib(maxCritical.bytes)+
        ' KiB / '+
        maxCritical.id
      );
      console.log(
        '- Max rendered Product images:',
        maxMediaCount.count+
        ' / '+
        maxMediaCount.id
      );
    }
  }catch(error){
    fail(
      'R4.5D dist-mode validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.5D PDP Legacy Detachment / Payload Hardening: FAIL'
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
  'DREAMLAND B7-00B.4J R4.5D PDP Legacy Detachment / Payload Hardening: PASS'
);
console.log(
  SOURCE_MODE
    ? 'PDP Service Worker cache isolation / exact route-pattern ownership / network-only navigation / runtime boundary verified.'
    : '89 Production PDP cache isolation, remaining Legacy Custom/Inquiry boundary and payload budgets verified.'
);
console.log('');

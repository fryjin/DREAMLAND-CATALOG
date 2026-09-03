#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
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
    'Usage: node scripts/validate-r4-production-catalog-cutover.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

const EXPECTED_BUILD=
  'npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:home:validate && npm run r4:production:catalog:validate';

function fail(message){
  errors.push(message);
}

function text(value){
  return String(
    value??
    ''
  ).trim();
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
    !fs.existsSync(file)
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

function runtimeState(html){
  const match=
    html.match(
      /<script[^>]*id="catalogRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="catalogRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  if(!match){
    fail(
      'Catalog runtime state is missing.'
    );
    return null;
  }

  try{
    return JSON.parse(
      match[1]
    );
  }catch(error){
    fail(
      'Catalog runtime state JSON is invalid: '+
      error.message
    );
    return null;
  }
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts?.build!==
    EXPECTED_BUILD
  ){
    fail(
      'Production build must promote Home and Catalog as separate route-scoped Astro owners before final validation.'
    );
  }

  for(const [name,value] of [
    [
      'r4:production:catalog',
      'node scripts/r4-promote-astro-catalog.mjs --write'
    ],
    [
      'r4:production:catalog:contract',
      'node scripts/validate-r4-production-catalog-cutover.mjs --source'
    ],
    [
      'r4:production:catalog:validate',
      'node scripts/validate-r4-production-catalog-cutover.mjs --dist && node scripts/validate-r4-production-catalog-detachment.mjs --dist'
    ]
  ]){
    if(
      pkg.scripts?.[name]!==
      value
    ){
      fail(
        'package.json is missing '+name+'.'
      );
    }
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:catalog-runtime'
    );

  const catalogContract=
    validate.indexOf(
      'npm run r4:production:catalog:contract'
    );

  if(
    runtime<0||
    catalogContract<=runtime
  ){
    fail(
      'R4.4C Production Catalog contract gate must run after the Catalog Minimal Runtime gate.'
    );
  }
}catch(error){
  fail(
    'R4.4C package inspection failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'scripts/r4-promote-astro-catalog.mjs'
    );

  for(const marker of [
    "'.r4-astro-dist'",
    "'dist'",
    "'products'",
    "'r4-catalog-runtime.js'",
    "catalog:'astro-r4.4c'",
    'manifest.catalogOwner=',
    'manifest.catalogCutover=',
    'runtimeState(',
    'covers.length!==89',
    'data-r4-production-home="true"',
    'window.DREAMLAND_MPA_ACTIVE=true;'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        'Catalog promotion contract is missing: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'fs.cpSync(\n  SOURCE_ROOT,\n  TARGET_ROOT',
    'copyFile(\n  SOURCE_ROOT,\n  TARGET_ROOT'
  ]){
    if(
      source.includes(
        forbidden
      )
    ){
      fail(
        'Catalog promotion is broader than the /products/ route boundary.'
      );
    }
  }
}catch(error){
  fail(
    'R4.4C promotion source inspection failed: '+
    error.message
  );
}

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
        'Astro Catalog Production source is missing: '+
        marker
      );
    }
  }

  if(
    page.includes(
      'robots="noindex,nofollow"'
    )
  ){
    fail(
      'Astro Catalog source must no longer be noindex after Production cutover.'
    );
  }
}catch(error){
  fail(
    'R4.4C Astro Catalog source inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  try{
    const root=
      path.join(
        ROOT,
        '.r4-astro-dist'
      );

    const catalog=
      expectFile(
        root,
        'products/index.html'
      );

    if(catalog){
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
            'Isolated Catalog is not Production-cutover ready: '+
            marker
          );
        }
      }

      for(const legacy of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-desktop-catalog.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'runtime-pwa.js',
        'catalog-data.js',
        'startup-loader.js'
      ]){
        if(
          catalog.includes(
            legacy
          )
        ){
          fail(
            'Isolated Production-ready Catalog still contains Legacy runtime: '+
            legacy
          );
        }
      }
    }
  }catch(error){
    fail(
      'R4.4C source-mode output inspection failed: '+
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

    const catalog=
      expectFile(
        root,
        'products/index.html'
      );

    if(catalog){
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
            'Production Catalog is missing: '+
            marker
          );
        }
      }

      for(const legacy of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-desktop-catalog.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'runtime-pwa.js',
        'catalog-data.js',
        'startup-loader.js'
      ]){
        if(
          catalog.includes(
            legacy
          )
        ){
          fail(
            'Production Catalog still contains Legacy runtime: '+
            legacy
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
          'Production Catalog must contain exactly one executable route runtime; found '+
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
            'Production Catalog stylesheet is missing: '+
            href
          );
        }
      }

      const state=
        runtimeState(
          catalog
        );

      if(state){
        if(
          state.version!=='R4.4B'||
          state.products?.length!==89
        ){
          fail(
            'Production Catalog runtime state contract changed.'
          );
        }

        for(const product of state.products||[]){
          const cover=
            text(
              product?.cover
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
              'Production Catalog cover is missing: '+
              (
                product?.id||
                '(unknown)'
              )
            );
          }
        }
      }
    }

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
        'Production Home ownership changed during R4.4C.'
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

    const productId=
      text(
        firstProduct
          ?.productId||
        firstProduct?.id
      )
        .toUpperCase();

    if(!productId){
      fail(
        'No active product exists for R4.4C Production sentinel validation.'
      );
    }else{
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
            'window.DREAMLAND_MPA_ACTIVE=true;'
          )||
          !pdp.includes(
            'data-dreamland-page="product"'
          )
        )
      ){
        fail(
          'Production PDP must remain Legacy MPA during R4.4C.'
        );
      }
    }

    for(const relative of [
      'custom/index.html',
      'inquiry/index.html',
      'inquiry/contact/index.html',
      'inquiry/review/index.html'
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
          'Production non-Catalog route must remain Legacy MPA: '+
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

    if(
      manifest.homeOwner!=='astro'||
      manifest.homeCutover!=='B7-00B.4J-R4.3C'||
      manifest.presentationOverrides?.home!=='astro-r4.3c'
    ){
      fail(
        'Production manifest lost the Astro Home ownership contract.'
      );
    }

    if(
      manifest.catalogOwner!=='astro'||
      manifest.catalogCutover!=='B7-00B.4J-R4.4C'||
      manifest.presentationOverrides?.catalog!=='astro-r4.4c'
    ){
      fail(
        'Production manifest is missing the Astro Catalog ownership override.'
      );
    }

    if(
      !fs.existsSync(
        path.join(
          root,
          'sw.js'
        )
      )
    ){
      fail(
        'R4.4C must preserve the existing Service Worker asset until Catalog detachment.'
      );
    }
  }catch(error){
    fail(
      'R4.4C dist-mode validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.4C Production Catalog Cutover: FAIL'
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
  'DREAMLAND B7-00B.4J R4.4C Production Catalog Cutover: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Production pipeline / SEO / isolated Catalog promotion contract verified.'
    : 'dist/ owns Astro Home + Astro Catalog while PDP/Custom/Inquiry remain Legacy MPA.'
);
console.log('');

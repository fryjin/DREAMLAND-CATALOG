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
    'Usage: node scripts/validate-r4-production-home-cutover.mjs --source | --dist'
  );
  process.exit(1);
}

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

const REQUIRED_BUILD_STEPS=Object.freeze([
  'npm run data:build',
  'npm run build:pages',
  'npm run r4:astro:build',
  'npm run r4:production:home',
  'npm run r4:production:catalog',
  'npm run r4:production:pdp',
  'npm run r4:production:custom',
  'npm run r4:production:inquiry',
  'npm run r4:production:home:validate',
  'npm run r4:production:catalog:validate',
  'npm run r4:production:pdp:validate',
  'npm run r4:production:custom:validate',
  'npm run r4:production:inquiry:validate'
]);

function productionBuildHasOrderedSteps(value){
  const build=String(value||'');
  let cursor=-1;
  for(const step of REQUIRED_BUILD_STEPS){
    const index=build.indexOf(step);
    if(index<0||index<=cursor)return false;
    cursor=index;
  }
  return true;
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    !productionBuildHasOrderedSteps(pkg.scripts?.build)
  ){
    fail(
      'Production build must preserve Home/Catalog/PDP promotion and append the route-scoped Custom promotion before final validation.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:home']!==
    'node scripts/r4-promote-astro-home.mjs --write'
  ){
    fail(
      'package.json is missing r4:production:home.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:home:contract']!==
    'node scripts/validate-r4-production-home-cutover.mjs --source'
  ){
    fail(
      'package.json is missing r4:production:home:contract.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:home:validate']!==
    'node scripts/validate-r4-production-home-cutover.mjs --dist && node scripts/validate-r4-production-home-detachment.mjs --dist'
  ){
    fail(
      'package.json final Production Home validation must preserve the R4.3C cutover gate and append the R4.3D detachment gate.'
    );
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:home-runtime'
    );

  const cutover=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  if(
    runtime<0||
    cutover<=runtime
  ){
    fail(
      'R4.3C Production Home contract gate must run after the Home Minimal Runtime gate.'
    );
  }
}catch(error){
  fail(
    'R4.3C package inspection failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'scripts/r4-promote-astro-home.mjs'
    );

  for(const marker of [
    "'.r4-astro-dist'",
    "'dist'",
    "'products/index.html'",
    "'custom/index.html'",
    "'inquiry/index.html'",
    "home:'astro-r4.3c'",
    "manifest.homeOwner=",
    "manifest.homeCutover=",
    "window.DREAMLAND_MPA_ACTIVE=true;"
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        'Home promotion contract is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.3C promotion source inspection failed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/index.astro'
    );

  for(const marker of [
    'robots="index,follow"',
    'canonical="https://dreamland-catalog.pages.dev/"',
    'ogImage="https://dreamland-catalog.pages.dev/images/shared/share/SHARE001/cover-social.jpg"'
  ]){
    if(
      !page.includes(
        marker
      )
    ){
      fail(
        'Astro Home Production SEO source is missing: '+
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
      'Astro Home source must no longer be noindex after Production cutover.'
    );
  }

  const layout=
    read(
      'src/astro/layouts/SiteLayout.astro'
    );

  for(const marker of [
    '<link rel="canonical" href={canonical} />',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:image"',
    'name="twitter:card"',
    'data-r4-production-home='
  ]){
    if(
      !layout.includes(
        marker
      )
    ){
      fail(
        'SiteLayout Production SEO/cutover marker is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.3C Astro source inspection failed: '+
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

    const html=
      expectFile(
        root,
        'index.html'
      );

    if(html){
      for(const marker of [
        'data-r4-astro-home="true"',
        'data-r4-production-home="true"',
        'name="robots" content="index,follow"',
        'rel="canonical" href="https://dreamland-catalog.pages.dev/"',
        'src="/r4-home-runtime.js"'
      ]){
        if(
          !html.includes(
            marker
          )
        ){
          fail(
            'Isolated Home is not Production-cutover ready: '+
            marker
          );
        }
      }

      for(const legacy of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'catalog-data.js',
        'startup-loader.js'
      ]){
        if(
          html.includes(
            legacy
          )
        ){
          fail(
            'Isolated Production-ready Home still contains Legacy runtime: '+
            legacy
          );
        }
      }
    }

    if(
      !read(
        'index.html'
      ).includes(
        'window.DREAMLAND_MPA_ACTIVE=false;'
      )
    ){
      fail(
        'Legacy source Home shell must remain available during staged route migration.'
      );
    }
  }catch(error){
    fail(
      'R4.3C source-mode output inspection failed: '+
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

    const home=
      expectFile(
        root,
        'index.html'
      );

    if(home){
      for(const marker of [
        'data-r4-astro-home="true"',
        'data-r4-production-home="true"',
        'name="robots" content="index,follow"',
        'rel="canonical" href="https://dreamland-catalog.pages.dev/"',
        'property="og:title"',
        'property="og:image"',
        'src="/r4-home-runtime.js"'
      ]){
        if(
          !home.includes(
            marker
          )
        ){
          fail(
            'Production Home is missing: '+
            marker
          );
        }
      }

      for(const legacy of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-desktop-home.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'catalog-data.js',
        'startup-loader.js'
      ]){
        if(
          home.includes(
            legacy
          )
        ){
          fail(
            'Production Home still contains Legacy runtime: '+
            legacy
          );
        }
      }

      const executableScripts=[
        ...home.matchAll(
          /<script\b(?![^>]*type="application\/json")[^>]*>/gi
        )
      ];

      if(
        executableScripts.length!==
        1
      ){
        fail(
          'Production Home must contain exactly one executable client script; found '+
          executableScripts.length+
          '.'
        );
      }

      const rootAssets=[
        ...new Set(
          [
            ...home.matchAll(
              /(?:src|href)="(\/(?:_astro\/|r4-home-runtime\.js|images\/desktop\/home\/)[^"?#]*)(?:[?#][^"]*)?"/g
            )
          ].map(
            match=>match[1]
          )
        )
      ];

      for(const pathname of rootAssets){
        const relative=
          pathname.replace(
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
            'Production Home referenced asset is missing: '+
            pathname
          );
        }
      }
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
          'window.DREAMLAND_MPA_ACTIVE=true;'
        )||
        catalog.includes(
          'data-r4-astro-home="true"'
        )
      )
    ){
      fail(
        'Production Catalog must be Astro-owned after the R4.4C cutover.'
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
      String(
        firstProduct
          ?.productId||
        firstProduct?.id||
        ''
      )
        .trim()
        .toUpperCase();

    if(!productId){
      fail(
        'No active product exists for R4.3C Production sentinel validation.'
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
            'data-r4-astro-product="true"'
          )||
          !pdp.includes(
            'src="/r4-pdp-runtime.js"'
          )
        )
      ){
        fail(
          'Production PDP must be Astro-owned after the R4.5C cutover.'
        );
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
        'Production Custom must be Astro-owned after the R4.6C cutover.'
      );
    }

    for(const relative of ['inquiry/contact/index.html','inquiry/review/index.html','inquiry/success/index.html']){
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
          'Production non-Home route must remain Legacy MPA: '+
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
      manifest.homeOwner!==
        'astro'||
      manifest.homeCutover!==
        'B7-00B.4J-R4.3C'||
      manifest
        .presentationOverrides
        ?.home!==
        'astro-r4.3c'
    ){
      fail(
        'Production build manifest is missing the Astro Home ownership override.'
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
        'R4.3C must preserve the existing Production Service Worker asset while other routes remain Legacy.'
      );
    }
  }catch(error){
    fail(
      'R4.3C dist-mode validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.3C Production Home Cutover: FAIL'
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
  'DREAMLAND B7-00B.4J R4.3C Production Home Cutover: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Production pipeline / SEO / isolated Home promotion contract verified.'
    : 'dist/ owns Astro Home + Astro Catalog + Astro PDPs while Custom is Astro-owned and Inquiry remains Legacy MPA.'
);
console.log('');

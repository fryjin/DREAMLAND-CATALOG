#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function exists(relative){
  return fs.existsSync(
    path.join(ROOT,relative)
  );
}

try{
  const contract=
    json(
      'data/desktop-home-assets.json'
    );

  if(
    contract.schemaVersion!==1||
    contract.stage!=='B7-00B.2'
  ){
    fail(
      'desktop-home-assets.json has an invalid contract.'
    );
  }

  const required=[
    contract.hero?.image,
    contract.collections?.masterpiece?.image,
    contract.collections?.advanced?.image,
    contract.collections?.holiday?.image,
    contract.collections?.classic?.image,
    ...(contract.featured||[])
      .map(item=>item?.image),
    contract.craft?.image,
    contract.custom?.image,
    contract.wholesale?.image
  ];

  if(required.length!==12){
    fail(
      `Desktop Home asset contract must expose 12 image roles; found ${required.length}.`
    );
  }

  for(const value of required){
    if(
      typeof value!=='string'||
      !value.startsWith(
        './images/desktop/home/'
      )
    ){
      fail(
        `Invalid Desktop Home asset path: ${String(value)}`
      );
      continue;
    }

    const relative=
      value.replace(
        /^\.\//,
        ''
      );

    if(!exists(relative)){
      fail(
        `Missing Desktop Home asset file: ${relative}`
      );
    }
  }

  if(
    !exists(
      'images/desktop/home/README.md'
    )
  ){
    fail(
      'Desktop Home asset README is missing.'
    );
  }
}catch(error){
  fail(
    `Asset-contract validation failed: ${error.message}`
  );
}

try{
  const runtime=
    read(
      'src/ui/desktop/home/runtime-desktop-home.js'
    );

  for(const forbidden of [
    'productAngle',
    'activateAngle',
    'deactivateAngle',
    'pointerover',
    'pointerout',
    'data-desktop-angle-source',
    'is-angle-active',
    'HOME001/cover.webp'
  ]){
    if(runtime.includes(forbidden)){
      fail(
        `Desktop Home still contains retired hover/image coupling: ${forbidden}`
      );
    }
  }

  /*
   * B7-00B.3A R6 keeps the B7-00B.2 Home Asset System contract but advances
   * the Desktop Home runtime implementation version because Home media now has
   * a dedicated website-marketing fast path.
   *
   * Validate that the runtime is either the original B7-00B.2 owner or the
   * explicit R6 successor; do not freeze the historical asset gate to one
   * implementation-version string.
   */
  const versionMatch=
    runtime.match(
      /const VERSION='([^']+)';/
    );

  const allowedVersions=
    new Set([
      'B7-00B.2',
      'B7-00B.3A-R6',
      'B7-00B.4B-R1',
      'B7-00B.4B-R2',
      'B7-00B.4B-R3'
    ]);

  if(
    !versionMatch||
    !allowedVersions.has(
      versionMatch[1]
    )
  ){
    fail(
      `Desktop Home runtime version is incompatible with the B7-00B.2 asset contract: ${versionMatch?.[1]||'missing'}`
    );
  }

  for(const required of [
    "./data/desktop-home-assets.json",
    'desktop-product-overlay',
    'desktop-product-overlay__label',
    'desktop-collection-hover',
    'resolveFeaturedProduct(',
    'desktop-wholesale-media'
  ]){
    if(!runtime.includes(required)){
      fail(
        `Desktop Home runtime is missing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Home runtime validation failed: ${error.message}`
  );
}

try{
  const css=
    read(
      'src/ui/desktop/styles/home.css'
    );

  for(const required of [
    '.desktop-product-overlay{',
    '.desktop-product-overlay__label{',
    '.desktop-product-link:hover',
    '.desktop-product-link:focus-visible',
    'transform:scale(var(--dw-media-zoom));',
    '.desktop-collection-hover{',
    'B7-00B.4B R1 — Home Editorial Composition',
    'B7-00B.4B R2 — Home Art Direction Realignment',
    'B7-00B.4B R3 — Home Editorial Structure Realignment',
    '.desktop-home-story{',
    '.desktop-home-collections',
    '.desktop-wholesale-media{',
    'aspect-ratio:4/5;'
  ]){
    if(!css.includes(required)){
      fail(
        `Desktop Home hover CSS is missing: ${required}`
      );
    }
  }

  for(const forbidden of [
    '.desktop-product-media__angle',
    '.is-angle-active'
  ]){
    if(css.includes(forbidden)){
      fail(
        `Desktop Home CSS still contains retired angle-image behavior: ${forbidden}`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Home CSS validation failed: ${error.message}`
  );
}

try{
  const packageJson=
    json('package.json');

  if(
    packageJson.scripts
      ?.['desktop:home-assets']!==
      'node scripts/validate-b7-desktop-home-assets.mjs'
  ){
    fail(
      'package.json is missing desktop:home-assets.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run desktop:home'
    )||
    !validate.includes(
      'npm run desktop:home-assets'
    )
  ){
    fail(
      'npm run validate must preserve desktop:home and desktop:home-assets.'
    );
  }

  const sw=
    read('sw.js');

  const cacheVersion=
    sw.match(
      /const CACHE_VERSION = 'dreamland-pwa-v(\d+)';/
    );

  if(
    !cacheVersion||
    Number(cacheVersion[1])<90
  ){
    fail(
      'B7-00B.2 requires dreamland-pwa-v90 or later.'
    );
  }

  if(
    !sw.includes(
      "'./data/desktop-home-assets.json'"
    )
  ){
    fail(
      'APP_SHELL must cache desktop-home-assets.json.'
    );
  }

  for(const imagePath of [
    './images/desktop/home/hero/hero-main.webp',
    './images/desktop/home/featured/featured-01.webp'
  ]){
    if(sw.includes(`'${imagePath}'`)){
      fail(
        `Marketing image must not be pinned into APP_SHELL: ${imagePath}`
      );
    }
  }
}catch(error){
  fail(
    `Release-gate validation failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nB7-00B.2 Desktop Home Asset System validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'B7-00B.2 Desktop Home Asset System validation: PASS'
);

console.log(
  'Dedicated marketing assets / stable guided hover / 4:5 Featured grid / PWA v90 PASS.'
);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
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
    path.join(ROOT,relative),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(read(relative));
}

function count(source,pattern){
  return (
    source.match(pattern)||
    []
  ).length;
}

function output(relative){
  return path.join(
    OUT,
    relative
  );
}

try{
  const homeFile=
    output('index.html');

  if(!fs.existsSync(homeFile)){
    fail(
      'R4.3B Astro Home output is missing.'
    );
  }else{
    const html=
      fs.readFileSync(
        homeFile,
        'utf8'
      );

    for(const marker of [
      'data-r4-astro-home="true"',
      'data-r4-home-static="true"',
      'data-home-static-presentation',
      'data-home-section="hero"',
      'data-home-section="story"',
      'data-home-section="collections"',
      'data-home-section="featured"',
      'data-home-section="craft"',
      'data-home-section="custom"',
      'data-home-section="wholesale"',
      'data-home-section="cta"',
      'href="/products/"',
      'href="/custom/"',
      'href="/inquiry/"'
    ]){
      if(!html.includes(marker)){
        fail(
          'Astro Home is missing: '+
          marker
        );
      }
    }

    for(const legacyMarker of [
      'id="app"',
      'runtime-desktop-experience.js',
      'runtime-desktop-home.js',
      'catalog-data.js',
      'runtime-risk.js',
      'runtime-submission.js',
      'startup-loader.js',
      'DREAMLAND_MPA_ACTIVE'
    ]){
      if(html.includes(legacyMarker)){
        fail(
          'Astro Home still contains Legacy runtime marker: '+
          legacyMarker
        );
      }
    }

    if(
      !html.includes(
        'id="homeRuntimeState"'
      )||
      !html.includes(
        'src="/r4-home-runtime.js"'
      )
    ){
      fail(
        'R4.3B Home must expose the dedicated minimal runtime/state contract.'
      );
    }

    const executableScripts=[
      ...html.matchAll(
        /<script\b(?![^>]*type="application\/json")[^>]*>/gi
      )
    ];

    if(executableScripts.length!==1){
      fail(
        'R4.3B Home must contain exactly one executable client script; found '+
        executableScripts.length+
        '.'
      );
    }

    if(
      html.includes(
        'Astro build foundation'
      )||
      html.includes(
        'DREAMLAND R4 Astro Foundation'
      )
    ){
      fail(
        'R4.1 Home proof copy still appears in R4.3A output.'
      );
    }

    const collectionCount=
      count(
        html,
        /data-home-collection=/g
      );

    if(collectionCount!==4){
      fail(
        'R4.3B Home expected 4 collection cards; found '+
        collectionCount+
        '.'
      );
    }

    const featuredCount=
      count(
        html,
        /data-home-featured-product=/g
      );

    if(featuredCount!==5){
      fail(
        'R4.3B Home expected 5 Current Picks; found '+
        featuredCount+
        '.'
      );
    }

    for(const series of [
      'masterpiece',
      'advanced',
      'holiday',
      'classic'
    ]){
      if(
        !html.includes(
          '/products/?series='+
          series
        )
      ){
        fail(
          'R4.3B Home is missing collection deep link: '+
          series
        );
      }
    }

    const imagePaths=[
      ...html.matchAll(
        /src="(\/images\/desktop\/home\/[^"]+)"/g
      )
    ].map(
      match=>match[1]
    );

    if(imagePaths.length<12){
      fail(
        'R4.3B Home expected at least 12 Home marketing image references; found '+
        imagePaths.length+
        '.'
      );
    }

    for(const src of imagePaths){
      const file=
        output(
          src.replace(/^\/+/,'')
        );

      if(!fs.existsSync(file)){
        fail(
          'R4.3B Home output asset is missing: '+
          src
        );
      }
    }
  }
}catch(error){
  fail(
    'R4.3A output inspection crashed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/astro/pages/index.astro'
    );

  for(const marker of [
    "import SiteLayout from '../layouts/SiteLayout.astro';",
    "import HomePage from '../components/home/HomePage.astro';",
    "from '../lib/home-view-model.mjs';",
    "import '../../domain/pricing/runtime-pricing-policy.js';",
    "import '../../domain/localization/runtime-localization-policy.js';",
    "const language='en';",
    "buildHomeRuntimeState",
    "homeRuntimeState",
    "r4-home-runtime.js"
  ]){
    if(!source.includes(marker)){
      fail(
        'Astro Home source ownership marker is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'R4.3A source inspection crashed: '+
    error.message
  );
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts?.build!==
    'npm run data:build && npm run build:pages'
  ){
    fail(
      'R4.3B must not change Production build ownership.'
    );
  }

  if(
    pkg.scripts?.['r4:astro:home']!==
    'node scripts/validate-r4-astro-home.mjs'
  ){
    fail(
      'package.json is missing r4:astro:home.'
    );
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const foundation=
    validate.indexOf(
      'npm run r4:astro:foundation'
    );

  const home=
    validate.indexOf(
      'npm run r4:astro:home'
    );

  if(
    foundation<0||
    home<=foundation
  ){
    fail(
      'R4.3A/R4.3B Home gate must run after the Astro foundation gate.'
    );
  }
}catch(error){
  fail(
    'R4.3A package inspection crashed: '+
    error.message
  );
}

try{
  const assets=
    json(
      'data/desktop-home-assets.json'
    );

  const expected=[
    assets?.hero?.image,
    ...Object.values(
      assets?.collections||
      {}
    ).map(
      value=>value?.image
    ),
    ...(assets?.featured||[])
      .map(
        value=>value?.image
      ),
    assets?.craft?.image,
    assets?.custom?.image,
    assets?.wholesale?.image,
    './images/desktop/home/r4-1/brand-story-main.jpg'
  ]
    .filter(Boolean)
    .map(
      value=>
        String(value)
          .replace(/^\.\//,'')
    );

  for(const relative of expected){
    if(
      !fs.existsSync(
        output(relative)
      )
    ){
      fail(
        'Expected Home asset was not copied into isolated Astro output: '+
        relative
      );
    }
  }
}catch(error){
  fail(
    'R4.3A asset-contract inspection crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.3A/R4.3B Astro Home Presentation: FAIL'
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
  'DREAMLAND B7-00B.4J R4.3A/R4.3B Astro Home Presentation: PASS'
);
console.log(
  'Real Home content / 4 collections / 5 Current Picks / marketing assets / canonical Domain build-time adapters / responsive static presentation / one dedicated minimal Home runtime verified.'
);
console.log('');

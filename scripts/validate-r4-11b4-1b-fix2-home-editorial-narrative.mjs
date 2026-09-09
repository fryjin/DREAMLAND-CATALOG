#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  const file=path.join(ROOT,relative);

  if(!fs.existsSync(file)){
    fail('Missing required file: '+relative);
    return '';
  }

  return fs.readFileSync(file,'utf8');
}

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const page=read(
  'src/astro/components/home/HomePage.astro'
);
const css=read(
  'src/astro/styles/home.css'
);
const viewModel=read(
  'src/astro/lib/home-view-model.mjs'
);
const pkg=read('package.json');

const order=[
  'hero',
  'collections',
  'story',
  'featured',
  'craft',
  'custom',
  'wholesale',
  'cta'
];

let previous=-1;

for(const section of order){
  const marker=
    'data-home-section="'+section+'"';
  const index=
    page.indexOf(marker);

  if(index<0){
    fail(
      'B4.1B-FIX2 Home narrative lost section: '+
      section
    );
    continue;
  }

  if(index<=previous){
    fail(
      'B4.1B-FIX2 Home narrative order is wrong at: '+
      section
    );
  }

  previous=index;
}

for(const marker of [
  'data-home-collections-role="title-rail"',
  'home-collections__rail-index',
  'home-collections__rail-track',
  'home-collections__rail-inner',
  'HAND-CARVED CANDLE ART',
  'home-collections__rail-meta',
  'COLLECTION / 01—04',
  'home-collections__body',
  'home-collections__intro',
  'data-home-bind="collections.kicker"',
  'data-home-bind="collections.title"',
  'home-editorial home-container dl-editorial-spread',
  'home-custom dl-editorial-spread dl-editorial-spread--reverse',
  'home-wholesale dl-editorial-spread',
  'home-wholesale__media dl-editorial-spread__media',
  'src={view.wholesale.image}',
  'home-wholesale__copy dl-editorial-spread__copy',
  'home-wholesale__index'
]){
  expect(
    page,
    marker,
    'B4.1B-FIX2 semantic Home narrative contract changed.'
  );
}

const collectionStart=
  page.indexOf(
    'data-home-section="collections"'
  );
const collectionEnd=
  page.indexOf(
    'data-home-section="story"',
    collectionStart
  );
const collectionSlice=
  (
    collectionStart>=0&&
    collectionEnd>collectionStart
  )
    ? page.slice(
        collectionStart,
        collectionEnd
      )
    : '';

const railStart=
  collectionSlice.indexOf(
    'home-collections__rail'
  );
const railEnd=
  collectionSlice.indexOf(
    'home-collections__body',
    railStart
  );
const railSlice=
  (
    railStart>=0&&
    railEnd>railStart
  )
    ? collectionSlice.slice(
        railStart,
        railEnd
      )
    : '';

if(
  railSlice.includes(
    'id="homeCollectionsTitle"'
  )||
  railSlice.includes(
    'data-home-bind="collections.title"'
  )
){
  fail(
    'Collections H2 must live in the right editorial body, not inside the rotated rail.'
  );
}

const desktopBreak=
  css.indexOf(
    '@media (max-width:900px)'
  );

if(desktopBreak<0){
  fail(
    'home.css lost the Mobile boundary.'
  );
}

const desktopCss=
  desktopBreak>=0
    ? css.slice(0,desktopBreak)
    : css;

for(const marker of [
  '.home-collections__body',
  '.home-collections__intro',
  '.home-collections__rail-track',
  'transform:translate(-50%,-50%) rotate(-90deg);',
  'grid-template-columns:repeat(4,minmax(0,1fr));',
  '.home-editorial__media',
  'grid-column:1 / span 7;',
  '.home-editorial__copy',
  'grid-column:9 / -1;',
  '.home-custom {',
  'background:transparent;',
  '.home-wholesale {',
  '.home-wholesale__media',
  '.home-wholesale__copy',
  '.home-wholesale__index'
]){
  expect(
    desktopCss,
    marker,
    'B4.1B-FIX2 Desktop editorial narrative CSS changed.'
  );
}

for(const forbidden of [
  'writing-mode:',
  '.home-collection-card:nth-child',
  '.home-product-card:nth-child'
]){
  if(desktopCss.includes(forbidden)){
    fail(
      'B4.1B-FIX2 Desktop Home contains forbidden index-driven composition: '+
      forbidden
    );
  }
}

/*
 * translateY() remains valid for local interaction/reveal effects.
 * Only reject it when it directly owns Collection/Product card geometry.
 */
for(const [label,pattern] of [
  [
    'Collection card layout offset',
    /\.home-collection-card\s*\{[^}]*transform\s*:\s*translateY\(/s
  ],
  [
    'Product card layout offset',
    /\.home-product-card\s*\{[^}]*transform\s*:\s*translateY\(/s
  ]
]){
  if(pattern.test(desktopCss)){
    fail(
      'B4.1B-FIX2 forbids paint-time card geometry: '+label
    );
  }
}

for(const marker of [
  'homeAssets?.craft?.image',
  'homeAssets?.custom?.image',
  'homeAssets?.wholesale?.image'
]){
  expect(
    viewModel,
    marker,
    'B4.1B-FIX2 must keep existing marketing media ownership.'
  );
}

expect(
  pkg,
  '"r4:visual:home-narrative": "node scripts/validate-r4-11b4-1b-fix2-home-editorial-narrative.mjs"',
  'package.json must expose the B4.1B-FIX2 validator.'
);

expect(
  pkg,
  'npm run r4:visual:home-composition && npm run r4:visual:home-narrative',
  'Main validation chain must run B4.1B-FIX2 after B4.1B.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1B-FIX2 HOME EDITORIAL NARRATIVE: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1B-FIX2 HOME EDITORIAL NARRATIVE: PASS'
);

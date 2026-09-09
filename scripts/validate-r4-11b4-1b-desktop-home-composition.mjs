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

function json(relative){
  try{
    return JSON.parse(read(relative));
  }catch(error){
    fail('Invalid JSON: '+relative+' — '+error.message);
    return {};
  }
}

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const assets=json(
  'data/desktop-home-assets.json'
);
const viewModel=read(
  'src/astro/lib/home-view-model.mjs'
);
const page=read(
  'src/astro/components/home/HomePage.astro'
);
const css=read(
  'src/astro/styles/home.css'
);
const rollout=read(
  'src/astro/styles/system/rollout.css'
);
const b4Validator=read(
  'scripts/validate-r4-11b4-system-smoke-rollout.mjs'
);
const composition=read(
  'src/astro/styles/system/composition.css'
);
const pkg=read('package.json');

const heroStart=
  assets?.hero?.visualLeft;
const heroEnd=
  assets?.hero?.visualRight;

for(const [label,value] of [
  ['visualLeft',heroStart],
  ['visualRight',heroEnd]
]){
  if(
    typeof value!=='string'||
    !value.startsWith(
      './images/desktop/home/'
    )
  ){
    fail(
      'B4.1B Hero '+label+
      ' must be an explicit Desktop Home marketing asset.'
    );
    continue;
  }

  const relative=
    value.replace(/^\.\/+/,'');

  if(
    !fs.existsSync(
      path.join(ROOT,relative)
    )
  ){
    fail(
      'B4.1B Hero asset is missing: '+
      relative
    );
  }
}

const featured=
  Array.isArray(assets?.featured)
    ? assets.featured
    : [];

if(featured.length!==5){
  fail(
    'B4.1B Current Picks requires exactly 5 marketing slots.'
  );
}else{
  const roles=
    featured.map(
      item=>String(item?.layout||'')
    );

  if(
    roles.slice(0,3).some(
      role=>role!=='narrow'
    )||
    roles.slice(3).some(
      role=>role!=='wide'
    )
  ){
    fail(
      'B4.1B Current Picks asset contract must remain 3 narrow + 2 wide.'
    );
  }
}

for(const marker of [
  'visualLeft:',
  'visualRight:',
  'homeAssets?.hero?.visualLeft',
  'homeAssets?.hero?.visualRight',
  "const featuredPlan=[",
  "['masterpiece',3]",
  "['advanced',2]"
]){
  expect(
    viewModel,
    marker,
    'B4.1B Home ViewModel composition contract changed.'
  );
}

for(const marker of [
  'home-hero home-container dl-cover-stage',
  'home-hero__visual--start',
  'dl-cover-stage__visual--start',
  'data-home-hero-role="visual-start"',
  'home-hero__media dl-cover-stage__media',
  'data-home-hero-role="main-media"',
  'home-hero__visual--end',
  'dl-cover-stage__visual--end',
  'data-home-hero-role="visual-end"',
  'home-collection-shelf dl-collection-shelf',
  'home-collections__type dl-collection-shelf__type',
  'home-collections__rail',
  'home-collections__rail-track',
  'home-collections__rail-inner',
  'home-collections__rail-meta',
  'data-home-collections-role="title-rail"',
  'home-collections__body',
  'home-collections__intro',
  'home-collections dl-collection-shelf__items',
  'home-featured-grid dl-featured-3plus2',
  'dl-featured-3plus2__item--wide',
  'dl-featured-3plus2__item--narrow',
  'data-home-featured-layout={product.layout}'
]){
  expect(
    page,
    marker,
    'B4.1B Home semantic composition markup changed.'
  );
}

for(const marker of [
  '.dl-cover-stage',
  '.dl-collection-shelf',
  '.dl-featured-3plus2',
  '.dl-featured-3plus2__item--narrow',
  '.dl-featured-3plus2__item--wide'
]){
  expect(
    composition,
    marker,
    'B4.1B must consume the B4.1A Composition System.'
  );
}

const mobileMarker=
  '@media (max-width:900px)';
const mobileIndex=
  css.indexOf(mobileMarker);

if(mobileIndex<0){
  fail(
    'home.css lost the established Mobile convergence breakpoint.'
  );
}

const desktopCss=
  mobileIndex>=0
    ? css.slice(0,mobileIndex)
    : css;

for(const marker of [
  '.home-hero__visual',
  '.home-hero__media',
  '.home-collection-shelf',
  '.home-collections__type',
  '.home-collections__rail',
  '.home-collections__rail-track',
  '.home-collections__rail-inner',
  '.home-collections__body',
  '.home-collections__intro',
  '.home-collections {',
  'grid-template-columns:repeat(4,minmax(0,1fr));',
  'transform:translate(-50%,-50%) rotate(-90deg);',
  'transform-origin:center;',
  '.home-featured-grid {',
  '.home-product-card.dl-featured-3plus2__item--narrow',
  '.home-product-card.dl-featured-3plus2__item--wide'
]){
  expect(
    desktopCss,
    marker,
    'B4.1B Desktop Home composition CSS changed.'
  );
}

if(desktopCss.includes('writing-mode:')){
  fail(
    'B4.1B Collections title rail must rotate a horizontal text block; writing-mode is forbidden.'
  );
}

for(const forbidden of [
  '.home-collection-card:nth-child',
  '.home-product-card:nth-child',
  'margin-top:104px',
  'margin-top:46px'
]){
  if(desktopCss.includes(forbidden)){
    fail(
      'B4.1B Desktop Home still contains index-driven/random stagger geometry: '+
      forbidden
    );
  }
}

if(
  rollout.includes(
    'data-dreamland-page="home"'
  )
){
  fail(
    'B4 Home must graduate out of rollout.css after B4.1B.'
  );
}

expect(
  b4Validator,
  '\'data-dreamland-page="home"\'',
  'B4 validator must explicitly protect the graduated Home boundary.'
);

expect(
  pkg,
  '"r4:visual:home-composition": "node scripts/validate-r4-11b4-1b-desktop-home-composition.mjs"',
  'package.json must expose the B4.1B validator.'
);

expect(
  pkg,
  'npm run r4:visual:composition && npm run r4:visual:home-composition',
  'Main validation chain must run B4.1B after B4.1A.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1B DESKTOP HOME COMPOSITION: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1B DESKTOP HOME COMPOSITION: PASS'
);

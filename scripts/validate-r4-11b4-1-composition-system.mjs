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

const tokens=read(
  'src/astro/styles/system/tokens.css'
);
const composition=read(
  'src/astro/styles/system/composition.css'
);
const asymmetry=read(
  'src/astro/styles/system/asymmetry.css'
);
const layout=read(
  'src/astro/layouts/SiteLayout.astro'
);
const rollout=read(
  'src/astro/styles/system/rollout.css'
);
const pkg=read('package.json');

for(const marker of [
  '--dl-container-wide:1600px;',
  '--dl-container-reading:760px;',
  '--dl-container-form:980px;',
  '--dl-composition-gap:',
  '--dl-composition-gap-wide:',
  '--dl-composition-row-gap:',
  '--dl-mobile-chapter-space:',
  '--dl-mobile-river-gap:',
  '--dl-media-ratio-product:4/5;',
  '--dl-media-ratio-wide:16/10;'
]){
  expect(
    tokens,
    marker,
    'B4.1A composition token contract changed.'
  );
}

for(const marker of [
  '.dl-composition-grid',
  '.dl-cover-stage',
  '.dl-cover-stage__visual--start',
  '.dl-cover-stage__media',
  '.dl-cover-stage__visual--end',
  '.dl-editorial-spread',
  '.dl-type-rail',
  '.dl-collection-shelf',
  '.dl-featured-3plus2',
  '.dl-featured-3plus2__item--narrow',
  '.dl-featured-3plus2__item--wide',
  '.dl-editorial-river',
  '.dl-editorial-river__flow--start',
  '.dl-reading-chapter',
  '.dl-workflow-chapter',
  '.dl-reset-section',
  '.dl-media--product',
  '.dl-media--wide'
]){
  expect(
    composition,
    marker,
    'B4.1A semantic composition primitive changed.'
  );
}

for(const forbidden of [
  'data-dreamland-page',
  '.home-',
  '.catalog-',
  '.pdp-',
  '.contact-',
  '.custom-',
  '.inquiry-',
  '.review-',
  '.success-',
  ':nth-child',
  'translateY(',
  'position:fixed',
  'display:none',
  'visibility:hidden',
  'pointer-events:none',
  '!important'
]){
  if(composition.includes(forbidden)){
    fail(
      'B4.1A composition layer contains route-specific or unsafe behavior: '+
      forbidden
    );
  }
}

expect(
  asymmetry,
  'Low-level layout utilities',
  'B3 asymmetry must be explicitly demoted to a low-level utility layer.'
);

expect(
  rollout,
  'DREAMLAND R4.11B4',
  'B4 rollout layer must remain present during B4.1A.'
);

const asymmetryImport=
  "import '../styles/system/asymmetry.css';";
const compositionImport=
  "import '../styles/system/composition.css';";
const rolloutImport=
  "import '../styles/system/rollout.css';";

expect(
  layout,
  compositionImport,
  'SiteLayout must import the B4.1A composition layer.'
);

const asymmetryIndex=
  layout.indexOf(asymmetryImport);
const compositionIndex=
  layout.indexOf(compositionImport);
const rolloutIndex=
  layout.indexOf(rolloutImport);

if(
  asymmetryIndex<0||
  compositionIndex<0||
  rolloutIndex<0||
  !(
    asymmetryIndex<
    compositionIndex&&
    compositionIndex<
    rolloutIndex
  )
){
  fail(
    'Composition import order must be asymmetry -> composition -> rollout.'
  );
}

expect(
  pkg,
  '"r4:visual:composition": "node scripts/validate-r4-11b4-1-composition-system.mjs"',
  'package.json must expose the B4.1A composition validator.'
);

expect(
  pkg,
  'npm run r4:visual:rollout && npm run r4:visual:composition',
  'Main validation chain must run B4.1A after the existing B4 smoke gate.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1A COMPOSITION FOUNDATION: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1A COMPOSITION FOUNDATION: PASS'
);

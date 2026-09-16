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

const css=read(
  'src/astro/styles/home.css'
);
const page=read(
  'src/astro/components/home/HomePage.astro'
);
const pkg=read('package.json');

const mobileIndex=
  css.indexOf(
    '@media (max-width:900px)'
  );

if(mobileIndex<0){
  fail(
    'home.css lost the Mobile boundary.'
  );
}

const desktopCss=
  mobileIndex>=0
    ? css.slice(0,mobileIndex)
    : css;

for(const marker of [
  '--home-editorial-accent:#a74337;',
  '.home-collection-shelf {',
  'grid-template-columns:',
  'clamp(154px,10vw,184px)',
  'minmax(0,1160px)',
  'column-gap:clamp(24px,2vw,34px);',
  '.home-collections__rail-index',
  'color:var(--home-editorial-accent);',
  '.home-collections__rail-inner',
  '.home-collections__rail-meta',
  '.home-collections__body',
  'max-width:1160px;',
  '.home-collection-shelf + .home-story',
  'padding-top:0;',
  '.home-editorial-band',
  'margin-top:0;',
  '.home-section[data-home-section="custom"]',
  '.home-wholesale'
]){
  expect(
    desktopCss,
    marker,
    'B4.1B-FIX3 Desktop rhythm / rail contract changed.'
  );
}

if(
  desktopCss.includes(
    '.home-collections__body {\n    grid-column:4 / -1;'
  )
){
  fail(
    'Collections body must no longer skip a full 12-column lane after the rail.'
  );
}

if(
  desktopCss.includes(
    'margin-top:clamp(108px,9vw,144px);'
  )||
  desktopCss.includes(
    'padding-block:clamp(72px,7vw,108px);'
  )
){
  fail(
    'Featured -> Craft still has the old double-spacing owner.'
  );
}

const collectionSpacing=
  /\.home-collection-shelf\s*\{[^}]*padding-bottom:\s*clamp\(84px,6vw,104px\);/s;

if(!collectionSpacing.test(desktopCss)){
  fail(
    'Collections must own the single outgoing spacing into Story.'
  );
}

const craftSpacing=
  /\.home-editorial-band\s*\{[^}]*margin-top:\s*0;[^}]*padding:\s*clamp\(88px,7vw,112px\)\s+0\s+0;/s;

if(!craftSpacing.test(desktopCss)){
  fail(
    'Craft must own one incoming transition without bottom-spacing duplication.'
  );
}

const customSpacing=
  /\.home-section\[data-home-section="custom"\]\s*\{[^}]*padding-top:\s*clamp\(92px,7vw,120px\);/s;

if(!customSpacing.test(desktopCss)){
  fail(
    'Custom transition rhythm contract changed.'
  );
}

const wholesaleSpacing=
  /\.home-wholesale\s*\{[^}]*padding-top:\s*clamp\(92px,7vw,120px\);/s;

if(!wholesaleSpacing.test(desktopCss)){
  fail(
    'Wholesale transition rhythm contract changed.'
  );
}

/* Freeze the structural wins from FIX2. */
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
  const index=
    page.indexOf(
      'data-home-section="'+section+'"'
    );

  if(index<0){
    fail(
      'FIX3 lost Home section: '+section
    );
    continue;
  }

  if(index<=previous){
    fail(
      'FIX3 must not change the accepted Home narrative order at: '+
      section
    );
  }

  previous=index;
}

for(const marker of [
  'home-hero home-container dl-cover-stage',
  'home-featured-grid dl-featured-3plus2',
  'home-editorial home-container dl-editorial-spread',
  'home-custom dl-editorial-spread dl-editorial-spread--reverse',
  'home-wholesale dl-editorial-spread'
]){
  expect(
    page,
    marker,
    'FIX3 must not restructure accepted Desktop Home composition.'
  );
}

expect(
  pkg,
  '"r4:visual:home-rhythm": "node scripts/validate-r4-11b4-1b-fix3-home-rhythm-rail.mjs"',
  'package.json must expose the B4.1B-FIX3 validator.'
);

expect(
  pkg,
  'npm run r4:visual:home-narrative && npm run r4:visual:home-rhythm',
  'Main validation chain must run FIX3 after FIX2.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1B-FIX3 HOME RHYTHM + RAIL: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1B-FIX3 HOME RHYTHM + RAIL: PASS'
);

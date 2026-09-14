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

function expect(
  content,
  marker,
  message
){
  if(!content.includes(marker)){
    fail(
      message+
      ' Missing: '+
      marker
    );
  }
}

const page=read(
  'src/astro/components/catalog/CatalogPage.astro'
);
const runtime=read(
  'src/astro/runtime/catalog-runtime.js'
);
const css=read(
  'src/astro/styles/catalog.css'
);
const pkg=read('package.json');

const flatPage=
  page.replace(/\s+/g,' ');
const flatRuntime=
  runtime.replace(/\s+/g,' ');
const flatCss=
  css.replace(/\s+/g,' ');

/* Server and runtime must share the same deterministic split. */
for(const marker of [
  'function laneSplitCount(',
  "phase==='b'",
  '? .6',
  ': .4',
  'data-editorial-count={group.products.length}',
  'class="catalog-spread__lane"',
  'data-editorial-lane={lane.side}',
  'data-editorial-lane-count={lane.products.length}'
]){
  expect(
    flatPage,
    marker.replace(/\s+/g,' '),
    'D-E server mirrored-lane contract changed.'
  );
}

for(const marker of [
  'function laneSplitCount(',
  'function laneHtml(',
  "phase==='b'",
  '? .6',
  ': .4',
  'data-editorial-count="',
  'class="catalog-spread__lane"',
  'data-editorial-lane="',
  'data-editorial-lane-count="',
  'products.slice( 0, split )',
  'products.slice( split )'
]){
  expect(
    flatRuntime,
    marker.replace(/\s+/g,' '),
    'D-E runtime mirrored-lane contract changed.'
  );
}

/* Full group math: A => 2/3 and B => 3/2. */
function split(phase,count){
  if(count<=1){
    return count;
  }

  return Math.max(
    1,
    Math.min(
      count-1,
      Math.round(
        count*
        (
          phase==='b'
            ? .6
            : .4
        )
      )
    )
  );
}

if(
  split('a',5)!==2||
  split('b',5)!==3
){
  fail(
    'D-E five-card split must remain A=2/3 and B=3/2.'
  );
}

for(const count of [2,3,4]){
  const a=split('a',count);
  const b=split('b',count);

  if(
    a<1||
    a>=count||
    b<1||
    b>=count
  ){
    fail(
      'D-E partial groups must keep both lanes non-empty for count '+count+'.'
    );
  }
}

/* Existing Catalog behavior remains canonical. */
for(const marker of [
  "const VERSION='R4.4B';",
  'function urlState(',
  'function syncUrl(',
  'catalog.setQuery(',
  'catalog.setSizes(',
  'catalog.setSort(',
  'catalog.loadMore();',
  'Math.ceil( view.products.length/ 5 )'
]){
  expect(
    flatRuntime,
    marker.replace(/\s+/g,' '),
    'D-E must preserve canonical Catalog behavior.'
  );
}

if(
  Buffer.byteLength(
    runtime,
    'utf8'
  )>
  32*1024
){
  fail(
    'D-E Catalog runtime exceeds the existing 32 KiB adapter budget.'
  );
}

/* Desktop wrappers are transparent. Mobile owns the ratio composition. */
expect(
  flatCss,
  '.catalog-spread__lane { display:contents;',
  'D-E Desktop lane wrappers must remain transparent.'
);

const stageStart=
  css.indexOf(
    '/* ============================================================\n * R4.11B4.1D-E — Mobile 3:2 ↔ 2:3 Mirrored Ratio Rhythm'
  );

if(stageStart<0){
  fail(
    'D-E CSS stage marker is missing.'
  );
}

const stageCss=
  stageStart>=0
    ? css.slice(stageStart)
    : '';

const flatStage=
  stageCss.replace(/\s+/g,' ');

for(const marker of [
  '@media (max-width:720px)',
  '.catalog-spread { display:grid; grid-template-columns: minmax(0,7fr) minmax(0,5fr);',
  '.catalog-spread[data-editorial-phase="b"] { grid-template-columns: minmax(0,5fr) minmax(0,7fr);',
  '.catalog-spread[data-editorial-count="1"] { grid-template-columns: minmax(0,1fr);',
  '.catalog-spread__lane {',
  'display:flex;',
  'flex-direction:column;',
  'justify-content:flex-start;',
  'align-self:start;',
  'R4.11B4.1D-E-FIX3 — Optical Ratio + Ordered Lane Rhythm',
  'R4.11B4.1D-E-FIX4 — Balanced Editorial Spread',
  '.catalog-card__media',
  'data-editorial-count="5"',
  'data-editorial-lane-count="2"',
  'aspect-ratio:2/3;',
  'data-editorial-lane-count="3"',
  'aspect-ratio:4/5;',
  '@media (max-width:374px)',
  '@media (min-width:421px) and (max-width:720px)'
]){
  expect(
    flatStage,
    marker.replace(/\s+/g,' '),
    'D-E Mobile mirrored-ratio styling changed.'
  );
}

/*
 * FIX4: a complete five-card spread must balance vertical media mass
 * structurally: two-card lane 2:3, three-card lane 4:5.
 */
if(
  !/\.catalog-spread\[data-editorial-count="5"\][\s\S]*?\.catalog-spread__lane\[data-editorial-lane-count="2"\][\s\S]*?aspect-ratio\s*:\s*2\/3\s*;/m
    .test(stageCss)
){
  fail(
    'D-E-FIX4 two-card primary lane must use 2:3 media in complete five-card spreads.'
  );
}

if(
  !/\.catalog-spread\[data-editorial-count="5"\][\s\S]*?\.catalog-spread__lane\[data-editorial-lane-count="3"\][\s\S]*?aspect-ratio\s*:\s*4\/5\s*;/m
    .test(stageCss)
){
  fail(
    'D-E-FIX4 three-card secondary lane must keep 4:5 media in complete five-card spreads.'
  );
}

if(
  /\.catalog-spread__lane\s*\{[\s\S]*?justify-content\s*:\s*space-between\s*;/m
    .test(stageCss)
){
  fail(
    'D-E-FIX3 lane rhythm must not redistribute residual height between cards.'
  );
}

if(
  /\.catalog-spread\[data-editorial-phase="a"\][\s\S]*?--catalog-ratio-title/m
    .test(stageCss)
){
  fail(
    'D-E-FIX3 must not visually amplify the wide lane with a second title/radius scale.'
  );
}

if(
  stageCss.includes(
    'nth-child('
  )||
  /\.catalog-card(?!__)[^{]*\{[^}]*transform\s*:\s*translateY\(/s
    .test(stageCss)
){
  fail(
    'D-E must use structural mirrored lanes, not synthetic staggering.'
  );
}

for(const forbidden of [
  'data-catalog-col="left"',
  'data-catalog-col="right"',
  'DreamlandCatalogRenderer'
]){
  if(
    page.includes(forbidden)||
    runtime.includes(forbidden)
  ){
    fail(
      'D-E reintroduced forbidden legacy Catalog architecture: '+
      forbidden
    );
  }
}

expect(
  pkg,
  '"r4:visual:mobile-catalog-ratio-rhythm": "node scripts/validate-r4-11b4-1d-e-mobile-ratio-rhythm.mjs"',
  'package.json must expose the D-E validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-catalog-utility-cleanup && npm run r4:visual:mobile-catalog-ratio-rhythm && npm run r4:visual:pdp-feature',
  'Main validation chain must run D-E after Catalog utility cleanup and before PDP stages.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1D-E MOBILE MIRRORED RATIO RHYTHM: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1D-E BALANCED EDITORIAL SPREAD: PASS'
);

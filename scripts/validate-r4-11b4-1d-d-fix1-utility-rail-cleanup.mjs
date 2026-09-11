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
  'src/astro/styles/catalog.css'
);

const runtime=read(
  'src/astro/runtime/catalog-runtime.js'
);

const pkg=read('package.json');

const flatCss=
  css.replace(/\s+/g,' ');

/*
 * ------------------------------------------------------------
 * 1. FIX1 marker
 * ------------------------------------------------------------
 */

expect(
  css,
  '/* R4.11B4.1D-D-FIX1 — Utility Rail Visual Cleanup */',
  'D-D-FIX1 stage marker changed.'
);

/*
 * ------------------------------------------------------------
 * 2. Filter symbol ownership
 * ------------------------------------------------------------
 */

expect(
  flatCss,
  'body[data-dreamland-page="catalog"] .catalog-filter > summary::after, body[data-dreamland-page="catalog"] .catalog-filter[open] > summary::after { content:none; }',
  'D-D-FIX1 must neutralize both legacy Filter pseudo-symbol states.'
);

expect(
  flatCss,
  '.catalog-filter__symbol::before { content:"+"; }',
  'D-D-FIX1 must preserve the explicit closed Filter symbol.'
);

expect(
  flatCss,
  '.catalog-filter[open] .catalog-filter__symbol::before { content:"−"; }',
  'D-D-FIX1 must preserve the explicit open Filter symbol.'
);

/*
 * ------------------------------------------------------------
 * 3. Search active-state ownership
 * ------------------------------------------------------------
 */

expect(
  flatCss,
  'body[data-dreamland-page="catalog"] .catalog-reader[data-utility-active="search"] .catalog-filter, body[data-dreamland-page="catalog"] .catalog-reader[data-utility-active="search"] .catalog-sort { display:none; }',
  'D-D-FIX1 Search active state must be owned by .catalog-reader.'
);

for(const forbidden of [
  'body[data-dreamland-page="catalog"][data-utility-active="search"] .catalog-filter',
  'body[data-dreamland-page="catalog"][data-utility-active="search"] .catalog-sort'
]){
  if(css.includes(forbidden)){
    fail(
      'D-D-FIX1 must remove the dead body-owned Search utility selector: '+
      forbidden
    );
  }
}

/*
 * ------------------------------------------------------------
 * 4. Runtime ownership / Search debounce fix remain frozen
 * ------------------------------------------------------------
 */

for(const [pattern,message] of [
  [
    /reader\.dataset\.utilityActive\s*=\s*active\s*;/,
    'utility active state assignment on reader'
  ],
  [
    /const\s+value\s*=\s*event\.currentTarget\s*\?\.\s*value\s*\|\|\s*['"]{2}\s*;/s,
    'Search debounce must capture the input value synchronously'
  ],
  [
    /catalog\.setQuery\s*\(\s*value\s*\)/,
    'Search debounce must commit the captured value'
  ],
  [
    /closeCatalogUtilities\s*\(\s*willOpen\s*\?\s*['"]search['"]\s*:\s*['"]{2}\s*\)/,
    'Search open/close orchestration'
  ]
]){
  if(!pattern.test(runtime)){
    fail(
      'D-D-FIX1 runtime regression. Missing semantic contract: '+
      message
    );
  }
}

/*
 * ------------------------------------------------------------
 * 5. Validation chain
 * ------------------------------------------------------------
 */

expect(
  pkg,
  '"r4:visual:mobile-catalog-utility-cleanup": "node scripts/validate-r4-11b4-1d-d-fix1-utility-rail-cleanup.mjs"',
  'package.json must expose the D-D-FIX1 validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-catalog-utility && npm run r4:visual:mobile-catalog-utility-cleanup',
  'Main validation chain must run D-D-FIX1 after D-D.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1D-D-FIX1 UTILITY RAIL VISUAL CLEANUP: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1D-D-FIX1 UTILITY RAIL VISUAL CLEANUP: PASS'
);

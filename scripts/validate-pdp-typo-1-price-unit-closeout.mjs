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

  return fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n');
}

function expect(source,marker,message){
  if(!source.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const page=read(
  'src/astro/components/product/PdpPage.astro'
);

const css=read(
  'src/astro/styles/pdp.css'
);

const runtime=read(
  'src/astro/runtime/pdp-runtime.js'
);

const pkg=
  JSON.parse(
    read('package.json')
  );

/* Canonical markup ownership stays unchanged. */
for(const marker of [
  'class="pdp-commerce__price"',
  'data-pdp-current-price',
  'data-pdp-currency-unit',
  'class="pdp-commerce__moq"',
  'data-pdp-current-moq',
  'data-pdp-ui="pieces"'
]){
  expect(
    page,
    marker,
    'PDP-TYPO-1 canonical price/MOQ markup changed.'
  );
}

/* Typography stage. */
const stageMarker=
  'PDP-TYPO-1 — Price / Unit Typography Closeout';

const stageStart=
  css.indexOf(stageMarker);

if(stageStart<0){
  fail(
    'PDP-TYPO-1 CSS stage marker is missing.'
  );
}

const stage=
  stageStart>=0
    ? css.slice(stageStart)
    : '';

for(const marker of [
  '.pdp-commerce__price > small {',
  '.pdp-commerce__moq > strong {',
  '.pdp-commerce__moq > strong > small {',
  'font-size:13px;',
  'font-weight:650;',
  'align-items:baseline;',
  'white-space:nowrap;',
  'word-break:keep-all;'
]){
  expect(
    stage,
    marker,
    'PDP-TYPO-1 unit typography contract changed.'
  );
}

if(
  !/\.pdp-commerce__price\s*>\s*small\s*\{[^}]*font-size\s*:\s*13px\s*;[^}]*font-weight\s*:\s*650\s*;[^}]*white-space\s*:\s*nowrap\s*;/m
    .test(stage)
){
  fail(
    'PDP-TYPO-1 price unit must remain a readable 13px non-breaking token.'
  );
}

if(
  !/\.pdp-commerce__moq\s*>\s*strong\s*\{[^}]*display\s*:\s*inline-flex\s*;[^}]*align-items\s*:\s*baseline\s*;[^}]*white-space\s*:\s*nowrap\s*;/m
    .test(stage)
){
  fail(
    'PDP-TYPO-1 MOQ number/unit must remain one baseline token.'
  );
}

if(
  !/\.pdp-commerce__moq\s*>\s*strong\s*>\s*small\s*\{[^}]*font-size\s*:\s*13px\s*;[^}]*font-weight\s*:\s*650\s*;/m
    .test(stage)
){
  fail(
    'PDP-TYPO-1 MOQ unit must remain readable at 13px.'
  );
}

/*
 * Historical 360px rule once reduced the price unit to 10px. The final
 * stage must come after it and therefore own the effective 13px value.
 */
const oldCompactRule=
  css.indexOf(
    '@media (max-width:374px)'
  );

if(
  oldCompactRule>=0&&
  stageStart<=oldCompactRule
){
  fail(
    'PDP-TYPO-1 must remain after historical compact-device typography overrides.'
  );
}

/* Presentation-only: canonical runtime ownership/budget remains untouched. */
for(const marker of [
  "const VERSION='R4.5B';",
  'DreamlandDetail',
  'DreamlandPricingPolicy',
  'DreamlandInquiry',
  'function bindEvents()'
]){
  expect(
    runtime,
    marker,
    'PDP-TYPO-1 must not change canonical PDP runtime ownership.'
  );
}

if(
  Buffer.byteLength(runtime,'utf8')>
  36*1024
){
  fail(
    'PDP-TYPO-1 must preserve the protected 36 KiB PDP runtime budget.'
  );
}

/* Pipeline ownership. */
if(
  pkg.scripts?.['r4:visual:pdp-typography']!==
  'node scripts/validate-pdp-typo-1-price-unit-closeout.mjs'
){
  fail(
    'package.json lost r4:visual:pdp-typography.'
  );
}

const validate=
  String(
    pkg.scripts?.validate||
    ''
  );

/*
 * PDP-POLISH-2 — validation-chain ownership
 * PDP-TYPO-1 owns adjacency to GLOBAL-POLISH-1A. Newer presentation
 * closeouts may append after it.
 */
if(
  !validate.includes(
    'npm run r4:visual:global-folio-polish && npm run r4:visual:pdp-typography'
  )
){
  fail(
    'PDP-TYPO-1 must remain immediately after GLOBAL-POLISH-1A.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'PDP-TYPO-1 PRICE / UNIT TYPOGRAPHY CLOSEOUT: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'PDP-TYPO-1 PRICE / UNIT TYPOGRAPHY CLOSEOUT: PASS'
);
console.log(
  'Reference price /pc-/件 units + MOQ pcs/件 units + baseline/nowrap hierarchy verified.'
);
console.log('');

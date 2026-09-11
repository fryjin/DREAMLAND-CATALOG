#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

function blobSha(content){
  const body=Buffer.from(content,'utf8');
  const header=Buffer.from(
    'blob '+body.length+'\0',
    'utf8'
  );

  return crypto
    .createHash('sha1')
    .update(header)
    .update(body)
    .digest('hex');
}

const page=read(
  'src/astro/components/product/PdpPage.astro'
);

const css=read(
  'src/astro/styles/pdp.css'
);

const rollout=read(
  'src/astro/styles/system/rollout.css'
);

const smokeValidator=read(
  'scripts/validate-r4-11b4-system-smoke-rollout.mjs'
);

const runtime=read(
  'src/astro/runtime/pdp-runtime.js'
);

const route=read(
  'src/astro/pages/products/[productId].astro'
);

const pkg=read('package.json');

const flatPage=
  page.replace(/\s+/g,' ');

const flatCss=
  css.replace(/\s+/g,' ');

/*
 * ------------------------------------------------------------
 * 1. Editorial feature markup
 * ------------------------------------------------------------
 */

for(const marker of [
  'class="pdp-feature-folio"',
  'data-pdp-feature-folio',
  'class="pdp-gallery-index"',
  'data-pdp-gallery-index-current',
  'data-pdp-gallery-index-total',
  'class="pdp-config-intro"',
  'data-pdp-config-intro'
]){
  expect(
    flatPage,
    marker,
    'E-A Product Feature markup contract changed.'
  );
}

/*
 * E-A must preserve the single executable PDP runtime boundary.
 * Presentation behavior belongs inside the canonical pdp-runtime.js.
 */
if(
  /<script\b/i.test(page)
){
  fail(
    'E-A PdpPage.astro must not add an executable component script; PDP owns exactly one canonical route runtime.'
  );
}

/*
 * Canonical R4 controls must remain available.
 */
for(const marker of [
  'data-pdp-gallery',
  'data-pdp-gallery-item',
  'data-pdp-gallery-select',
  'data-pdp-size',
  'data-pdp-scent-series',
  'data-pdp-scent',
  'data-pdp-pattern',
  'data-pdp-pack',
  'data-pdp-quantity',
  'data-pdp-qty-adjust',
  'data-pdp-current-price',
  'data-pdp-current-moq',
  'data-pdp-moq-note',
  'data-pdp-add-inquiry',
  'data-pdp-runtime-status'
]){
  expect(
    page,
    marker,
    'E-A must preserve canonical PDP hooks.'
  );
}

/*
 * ------------------------------------------------------------
 * 2. Gallery index lives inside the ONE canonical runtime
 * ------------------------------------------------------------
 */

for(const [pattern,message] of [
  [
    /function\s+bindGalleryIndex\s*\(\s*\)/,
    'gallery-index binder'
  ],
  [
    /gallery\.addEventListener\s*\(\s*['"]scroll['"]/,
    'gallery scroll observer'
  ],
  [
    /root\.addEventListener\s*\(\s*['"]resize['"]/,
    'gallery resize observer'
  ],
  [
    /root\.requestAnimationFrame\s*\(/,
    'requestAnimationFrame scheduling'
  ],
  [
    /data-pdp-gallery-index-current/,
    'gallery current-index projection'
  ],
  [
    /bindGalleryIndex\s*\(\s*\)\s*;/,
    'gallery-index mount call'
  ]
]){
  if(!pattern.test(runtime)){
    fail(
      'E-A Gallery Index canonical-runtime contract changed. Missing semantic contract: '+
      message
    );
  }
}

const galleryStart=
  runtime.indexOf(
    'function bindGalleryIndex()'
  );

const galleryEnd=
  galleryStart>=0
    ? runtime.indexOf(
        'function bindEvents()',
        galleryStart
      )
    : -1;

const galleryLogic=
  galleryStart>=0&&galleryEnd>galleryStart
    ? runtime.slice(
        galleryStart,
        galleryEnd
      )
    : '';

for(const forbidden of [
  'preventDefault(',
  'localStorage',
  'pricing.',
  'inquiry.',
  'detail.',
  'setOption(',
  'setScent(',
  'setQuantity(',
  'adjustQuantity(',
  'addOrMergeProduct(',
  'persist('
]){
  if(galleryLogic.includes(forbidden)){
    fail(
      'E-A Gallery Index must remain presentation-only: '+
      forbidden
    );
  }
}

/*
 * ------------------------------------------------------------
 * 3. Route-owned Mobile PDP composition
 * ------------------------------------------------------------
 */

expect(
  css,
  'R4.11B4.1E-A — Mobile PDP Feature Foundation',
  'E-A CSS stage marker changed.'
);

const eaStart=
  css.indexOf(
    'R4.11B4.1E-A — Mobile PDP Feature Foundation'
  );

const eaCss=
  eaStart>=0
    ? css.slice(eaStart)
    : '';

const flatEaCss=
  eaCss.replace(/\s+/g,' ');

for(const marker of [
  '@media (max-width:720px)',
  '.pdp-feature-folio',
  '.pdp-gallery-index',
  '.pdp-config-intro',
  '.pdp-summary',
  '.pdp-commerce',
  'scroll-snap-type:x mandatory',
  'background:transparent',
  'box-shadow:none'
]){
  expect(
    flatEaCss,
    marker,
    'E-A Mobile PDP composition contract changed.'
  );
}

if(
  /\.pdp-gallery__item:nth-child\(even\)/.test(
    eaCss
  )
){
  fail(
    'E-A PDP gallery must not use synthetic even-item width staggering.'
  );
}

if(
  !/\.pdp-commerce\s*\{[\s\S]*?border-top\s*:[^;]+;[\s\S]*?border-bottom\s*:[^;]+;[\s\S]*?border-radius\s*:\s*0\s*;[\s\S]*?background\s*:\s*transparent\s*;/m
    .test(eaCss)
){
  fail(
    'E-A Commercial Snapshot must be a flat editorial information band.'
  );
}

if(
  !/\.pdp-summary\s*\{[\s\S]*?border-radius\s*:\s*0\s*;[\s\S]*?background\s*:\s*transparent\s*;[\s\S]*?box-shadow\s*:\s*none\s*;/m
    .test(eaCss)
){
  fail(
    'E-A Mobile Summary must no longer be a rounded surface card.'
  );
}

/*
 * ------------------------------------------------------------
 * 4. B4 smoke ownership graduation
 * ------------------------------------------------------------
 */

expect(
  rollout,
  'Mobile PDP graduated to R4.11B4.1E-A Mobile PDP Feature Foundation.',
  'rollout.css must record Mobile PDP graduation.'
);

if(
  rollout.includes(
    'Layered surface + variable media rhythm.'
  )
){
  fail(
    'rollout.css still owns the old B4 Mobile PDP smoke layer.'
  );
}

for(const marker of [
  "const pdpCss=read(",
  'R4.11B4.1E-A — Mobile PDP Feature Foundation',
  'Mobile PDP has graduated to E-A'
]){
  expect(
    smokeValidator,
    marker,
    'B4 smoke validator must understand PDP graduation.'
  );
}

/*
 * ------------------------------------------------------------
 * 5. Canonical Route + Runtime ownership
 * ------------------------------------------------------------
 */

const EXPECTED_ROUTE_BLOB=
  'e429698d68f5fac338af6e64d83deb9cbadb0147';

if(
  route&&
  blobSha(route)!==
    EXPECTED_ROUTE_BLOB
){
  fail(
    'E-A must not modify the canonical Astro PDP route.'
  );
}

for(const marker of [
  "const VERSION='R4.5B';",
  "const RUNTIME_ID=",
  'DREAMLAND_R4_PDP_RUNTIME_R4_5B',
  'DreamlandDetail',
  'DreamlandPricingPolicy',
  'DreamlandInquiry',
  'function bindEvents()',
  'configureDetail();',
  'configureInquiry();'
]){
  expect(
    runtime,
    marker,
    'Canonical PDP runtime ownership changed.'
  );
}

for(const marker of [
  'src="/r4-pdp-runtime.js"',
  'id="pdpRuntimeState"',
  'buildPdpViewModel',
  'buildPdpRuntimeState'
]){
  expect(
    route,
    marker,
    'Canonical PDP route/runtime ownership changed.'
  );
}

/*
 * ------------------------------------------------------------
 * 6. Validation chain
 * ------------------------------------------------------------
 */

expect(
  pkg,
  '"r4:visual:pdp-feature": "node scripts/validate-r4-11b4-1ea-mobile-pdp-feature.mjs"',
  'package.json must expose the E-A validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-catalog-utility-cleanup && npm run r4:visual:pdp-feature',
  'Main validation chain must run E-A after Mobile Catalog closeout.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1E-A MOBILE PDP FEATURE FOUNDATION: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1E-A MOBILE PDP FEATURE FOUNDATION: PASS'
);

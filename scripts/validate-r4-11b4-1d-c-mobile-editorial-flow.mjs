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

const css=read(
  'src/astro/styles/catalog.css'
);

const rollout=read(
  'src/astro/styles/system/rollout.css'
);

const runtime=read(
  'src/astro/runtime/catalog-runtime.js'
);

const pkg=read(
  'package.json'
);

const flatPage=
  page.replace(/\s+/g,' ');

const flatCss=
  css.replace(/\s+/g,' ');

const flatRuntime=
  runtime.replace(/\s+/g,' ');

/*
 * ------------------------------------------------------------
 * 1. One shared Server + Runtime editorial contract
 * ------------------------------------------------------------
 */

for(const marker of [
  'class="catalog-spread"',
  'data-editorial-group={groupIndex+1}',
  'data-editorial-slot={product.editorialSlot}',
  'data-editorial-phase={product.editorialPhase}',
  'data-editorial-role={product.editorialRole}',
  'class="catalog-search__prompt"',
  'class="catalog-sort__visual"'
]){
  expect(
    flatPage,
    marker,
    'D-C static Catalog editorial contract changed.'
  );
}

for(const marker of [
  'const EDITORIAL_ROLES=',
  'function editorialMeta(index)',
  'function spreadHtml(',
  'data-editorial-slot="',
  'data-editorial-phase="',
  'data-editorial-role="',
  'Math.ceil( view.products.length/ 5 )',
  'index<4'
]){
  expect(
    flatRuntime,
    marker,
    'D-C runtime editorial contract changed.'
  );
}

/*
 * ------------------------------------------------------------
 * 2. Compact Chapter + Reader Rail
 * ------------------------------------------------------------
 */

const flowStart=
  css.indexOf(
    '/* R4.11B4.1D-C — Mobile Editorial Flow System'
  );

if(flowStart<0){
  fail(
    'D-C Mobile Editorial Flow CSS marker is missing.'
  );
}

const flowCss=
  flowStart>=0
    ? css.slice(flowStart)
    : '';

const flatFlowCss=
  flowCss.replace(/\s+/g,' ');

for(const marker of [
  '.catalog-chapter { width:calc(100% - 28px); padding-top:22px; padding-bottom:18px;',
  '.catalog-reader__index { flex-wrap:nowrap;',
  'overflow-x:auto;',
  '.catalog-result-count { position:absolute; width:1px;',
  '.catalog-search__prompt',
  '.catalog-search:focus-within input',
  ':has(input:not(:placeholder-shown))',
  '.catalog-filter > summary::after',
  '.catalog-sort__visual',
  '.catalog-sort select { position:absolute;',
  '.catalog-products.home-container { width:calc(100% - 28px); padding-top:18px;'
]){
  expect(
    flatFlowCss,
    marker,
    'D-C Compact Chapter / Reader Rail contract changed.'
  );
}

/*
 * ------------------------------------------------------------
 * 3. Five-product structural rhythm
 * ------------------------------------------------------------
 */

for(const marker of [
  '.catalog-spread { display:grid;',
  'grid-template-columns:repeat(12,minmax(0,1fr));',
  '.catalog-spread[data-editorial-phase="a"] .catalog-card[data-editorial-slot="1"]',
  '.catalog-spread[data-editorial-phase="a"] .catalog-card[data-editorial-slot="5"]',
  '.catalog-spread[data-editorial-phase="b"] .catalog-card[data-editorial-slot="1"]',
  '.catalog-spread[data-editorial-phase="b"] .catalog-card[data-editorial-slot="5"]',
  '.catalog-card { min-width:0; overflow:visible; border-radius:0; background:transparent; box-shadow:none; transform:none;',
  '.catalog-card[data-editorial-role="lead"] .catalog-card__media',
  '.catalog-card[data-editorial-role="support"] .catalog-card__media',
  '.catalog-card[data-editorial-role="narrow"] .catalog-card__media',
  '.catalog-card[data-editorial-role="support-wide"] .catalog-card__media',
  '.catalog-card[data-editorial-role="breather"] .catalog-card__media',
  'aspect-ratio:5/4;',
  '@media (max-width:374px)',
  '@media (min-width:421px) and (max-width:720px)'
]){
  expect(
    flatFlowCss,
    marker,
    'D-C five-product editorial rhythm changed.'
  );
}

for(const forbidden of [
  'nth-child(',
  'translateY('
]){
  if(flowCss.includes(forbidden)){
    fail(
      'D-C must use structural slot/phase layout, not synthetic staggering: '+
      forbidden
    );
  }
}

/*
 * ------------------------------------------------------------
 * 4. Product Field must graduate out of rollout.css
 * ------------------------------------------------------------
 */

for(const forbidden of [
  'data-dreamland-page="catalog"',
  '.catalog-card:nth-child(even)',
  '.catalog-card:nth-child(4n + 2)',
  '.catalog-card:nth-child(4n + 3)',
  'var(--dl-asym-stagger-offset)'
]){
  if(rollout.includes(forbidden)){
    fail(
      'D-C Catalog ownership still leaks through rollout.css: '+
      forbidden
    );
  }
}

/*
 * ------------------------------------------------------------
 * 5. Canonical R4 capability / architecture locks
 * ------------------------------------------------------------
 */

for(const marker of [
  "const VERSION='R4.4B';",
  'const SEARCH_DELAY=180;',
  'function urlState(',
  'function syncUrl(',
  'function applyUrlState(',
  'catalog.setQuery(',
  'catalog.setSizes(',
  'catalog.setSort(',
  'catalog.loadMore();',
  'data-catalog-series',
  'data-catalog-search',
  'data-catalog-size',
  'data-catalog-sort',
  'data-catalog-load-more'
]){
  expect(
    page+'\n'+runtime,
    marker,
    'D-C must preserve canonical Catalog behavior.'
  );
}

for(const forbidden of [
  'DreamlandCatalogRenderer',
  'data-catalog-col="left"',
  'data-catalog-col="right"',
  'series-count-card',
  'batchSize:5'
]){
  if(
    page.includes(forbidden)||
    runtime.includes(forbidden)
  ){
    fail(
      'D-C reintroduced a forbidden Develop/B6 architecture marker: '+
      forbidden
    );
  }
}

/*
 * ------------------------------------------------------------
 * 6. Package chain
 * ------------------------------------------------------------
 */

expect(
  pkg,
  '"r4:visual:mobile-catalog-flow": "node scripts/validate-r4-11b4-1d-c-mobile-editorial-flow.mjs"',
  'package.json must expose the D-C validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-catalog-chapter && npm run r4:visual:mobile-catalog-flow',
  'Main validation chain must run D-C after D-B.'
);

/*
 * ------------------------------------------------------------
 * Result
 * ------------------------------------------------------------
 */

if(errors.length){
  console.error(
    '\nR4.11B4.1D-C MOBILE EDITORIAL FLOW SYSTEM: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1D-C MOBILE EDITORIAL FLOW SYSTEM: PASS'
);

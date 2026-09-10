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

const flatRollout=
  rollout.replace(/\s+/g,' ');

/*
 * ------------------------------------------------------------
 * 1. Chapter / Reader markup
 * ------------------------------------------------------------
 */

for(const marker of [
  'class="catalog-intro home-container catalog-chapter"',
  'data-catalog-chapter-opener',
  'class="catalog-chapter__folio"',
  'class="catalog-chapter__number">02</span>',
  'class="catalog-browse catalog-reader"',
  'data-catalog-reader',
  'class="home-container catalog-reader__inner"',
  'class="catalog-series catalog-reader__index"',
  'class="catalog-tools catalog-reader__tools"',
  'data-catalog-series-list',
  'data-catalog-search',
  'data-catalog-filter-panel',
  'data-catalog-sort',
  'data-catalog-product-grid'
]){
  expect(
    flatPage,
    marker,
    'D-B Mobile Catalog chapter markup contract changed.'
  );
}

/*
 * ------------------------------------------------------------
 * 2. Route-owned Mobile Chapter CSS
 * ------------------------------------------------------------
 */

const chapterStart=
  css.indexOf(
    '/* R4.11B4.1D-B — Mobile Catalog Chapter Foundation'
  );

if(chapterStart<0){
  fail(
    'D-B Catalog CSS marker is missing.'
  );
}

const chapterCss=
  chapterStart>=0
    ? css.slice(chapterStart)
    : '';

const flatChapterCss=
  chapterCss.replace(/\s+/g,' ');

for(const marker of [
  'body[data-dreamland-page="catalog"] .catalog-main',
  'body[data-dreamland-page="catalog"] .catalog-chapter',
  '.catalog-chapter__folio',
  '.catalog-chapter__number',
  '.catalog-intro__layout',
  '.catalog-reader',
  '.catalog-reader__inner',
  '.catalog-reader__index',
  '.catalog-series__item.is-active',
  '.catalog-reader__tools',
  '.catalog-search input',
  '.catalog-filter > summary',
  '.catalog-sort select',
  'position:relative;',
  'top:auto;',
  '@media (max-width:374px)',
  '@media (min-width:421px) and (max-width:720px)'
]){
  expect(
    flatChapterCss,
    marker,
    'D-B Mobile Catalog Chapter Foundation CSS changed.'
  );
}

/*
 * D-B itself never introduced nth-child / translateY product rules.
 * Later D-C route ownership is allowed to follow this block.
 */
const dbOnlyCss=
  chapterCss.includes(
    '/* R4.11B4.1D-C — Mobile Editorial Flow System'
  )
    ? chapterCss.split(
        '/* R4.11B4.1D-C — Mobile Editorial Flow System'
      )[0]
    : chapterCss;

for(const forbidden of [
  'translateY(',
  'nth-child(',
  'position:fixed',
  '!important'
]){
  if(dbOnlyCss.includes(forbidden)){
    fail(
      'D-B Chapter layer contains forbidden product/fixed behavior: '+
      forbidden
    );
  }
}

/*
 * ------------------------------------------------------------
 * 3. Intro / Browse must remain graduated out of rollout.css
 * ------------------------------------------------------------
 */

for(const marker of [
  'body[data-dreamland-page="catalog"] .catalog-main {',
  'body[data-dreamland-page="catalog"] .catalog-intro {',
  'body[data-dreamland-page="catalog"] .catalog-intro__layout {',
  'body[data-dreamland-page="catalog"] .catalog-intro__count {',
  'body[data-dreamland-page="catalog"] .catalog-intro__count strong {',
  'body[data-dreamland-page="catalog"] .catalog-browse {'
]){
  if(flatRollout.includes(marker)){
    fail(
      'D-B Intro / Reader ownership still lives in rollout.css: '+
      marker
    );
  }
}

/*
 * ------------------------------------------------------------
 * 4. Product Field smoke is transitional and may graduate to D-C
 * ------------------------------------------------------------
 */

const flowGraduated=
  css.includes(
    'R4.11B4.1D-C — Mobile Editorial Flow System'
  );

const smokeMarkers=[
  'body[data-dreamland-page="catalog"] .catalog-products.home-container',
  '.catalog-card:nth-child(even)',
  '.catalog-card:nth-child(4n + 2)',
  '.catalog-card:nth-child(4n + 3)',
  'var(--dl-asym-stagger-offset)'
];

if(flowGraduated){
  for(const marker of smokeMarkers){
    if(flatRollout.includes(marker)){
      fail(
        'D-C has graduated Product Field ownership but rollout smoke remains: '+
        marker
      );
    }
  }
}else{
  for(const marker of smokeMarkers){
    expect(
      flatRollout,
      marker,
      'D-B must preserve existing Product Field smoke until D-C.'
    );
  }
}

/*
 * ------------------------------------------------------------
 * 5. Canonical Catalog runtime capabilities remain intact
 * ------------------------------------------------------------
 */

for(const marker of [
  "const VERSION='R4.4B';",
  'const SEARCH_DELAY=180;',
  'function urlState(',
  'function syncUrl(',
  'function applyUrlState(',
  'data-catalog-product-grid',
  'index<4',
  "? 'eager'",
  ": 'lazy'"
]){
  expect(
    runtime,
    marker,
    'D-B/D-C must preserve canonical Catalog runtime capability.'
  );
}

/*
 * Develop/B6 dual-column renderer must NOT return.
 */

for(const forbidden of [
  'DreamlandCatalogRenderer',
  'data-catalog-col="left"',
  'data-catalog-col="right"',
  'series-count-card'
]){
  if(
    page.includes(forbidden)||
    runtime.includes(forbidden)
  ){
    fail(
      'D-B must not reintroduce Develop/B6 renderer architecture: '+
      forbidden
    );
  }
}

/*
 * ------------------------------------------------------------
 * 6. Existing interaction hooks stay alive
 * ------------------------------------------------------------
 */

for(const marker of [
  'data-catalog-series',
  'data-catalog-search',
  'data-catalog-size',
  'data-catalog-sort',
  'data-catalog-load-more'
]){
  expect(
    page,
    marker,
    'D-B must preserve Catalog interaction hooks.'
  );
}

/*
 * ------------------------------------------------------------
 * 7. Package validation chain
 * ------------------------------------------------------------
 */

expect(
  pkg,
  '"r4:visual:mobile-catalog-chapter": "node scripts/validate-r4-11b4-1d-b-mobile-catalog-chapter.mjs"',
  'package.json must expose the D-B validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-cover-fix2 && npm run r4:visual:mobile-catalog-chapter',
  'Main validation chain must run D-B after Mobile Home closeout.'
);

/*
 * ------------------------------------------------------------
 * Result
 * ------------------------------------------------------------
 */

if(errors.length){
  console.error(
    '\nR4.11B4.1D-B MOBILE CATALOG CHAPTER FOUNDATION: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1D-B MOBILE CATALOG CHAPTER FOUNDATION: PASS'
);

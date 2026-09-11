#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relative) {
  const file = path.join(ROOT, relative);

  if (!fs.existsSync(file)) {
    fail('Missing required file: ' + relative);
    return '';
  }

  return fs.readFileSync(file, 'utf8');
}

function expect(content, marker, message) {
  if (!content.includes(marker)) {
    fail(
      message +
      ' Missing: ' +
      marker
    );
  }
}

const page = read(
  'src/astro/components/catalog/CatalogPage.astro'
);

const css = read(
  'src/astro/styles/catalog.css'
);

const runtime = read(
  'src/astro/runtime/catalog-runtime.js'
);

const pkg = read(
  'package.json'
);

const flatPage =
  page.replace(/\s+/g, ' ');

const flatRuntime =
  runtime.replace(/\s+/g, ' ');

/*
 * ------------------------------------------------------------
 * 1. Utility markup
 * ------------------------------------------------------------
 */

for (const marker of [
  'data-catalog-search-control',
  'data-catalog-search-trigger',
  'aria-controls="catalogSearchField"',
  'id="catalogSearchField"',
  'data-catalog-filter-symbol',
  'data-catalog-sort-control',
  'data-catalog-sort-panel',
  'data-catalog-sort-action="featured"',
  'data-catalog-sort-action="name"',
  'data-catalog-sort-action="price-low"',
  'data-catalog-sort-action="price-high"',
  'data-catalog-sort-action="moq-low"',
  'class="catalog-sort__native"',
  'class="catalog-sort__visual"',
  'data-catalog-sort'
]) {
  expect(
    flatPage,
    marker,
    'D-D Catalog utility markup contract changed.'
  );
}

/*
 * ------------------------------------------------------------
 * 2. Utility visual layer
 * ------------------------------------------------------------
 */

const ddStart = css.indexOf(
  '/* R4.11B4.1D-D — Editorial Utility Interaction'
);

if (ddStart < 0) {
  fail(
    'D-D utility CSS marker is missing.'
  );
}

const ddCss =
  ddStart >= 0
    ? css.slice(ddStart)
    : '';

const flatDdCss =
  ddCss.replace(/\s+/g, ' ');

for (const marker of [
  '.catalog-search__trigger',
  '.catalog-sort__menu',
  '.catalog-search.is-open',
  '[data-utility-active="search"] .catalog-filter',
  '.catalog-filter__symbol::before',
  '.catalog-filter[open] .catalog-filter__symbol::before',
  '.catalog-sort__native',
  '.catalog-sort__panel',
  '.catalog-sort__panel button.is-selected',
  ':focus-visible',
  '@keyframes dlCatalogUtilityIn',
  '@media (prefers-reduced-motion:reduce)'
]) {
  expect(
    flatDdCss,
    marker,
    'D-D utility visual contract changed.'
  );
}

/*
 * D-D may use translateY() for lightweight utility motion.
 * Product staggering remains governed by the D-C validator.
 */

/*
 * ------------------------------------------------------------
 * 3. Utility orchestration runtime
 * ------------------------------------------------------------
 */

for (const marker of [
  'function catalogUtilityNodes()',
  'function syncCatalogUtilityActive()',
  'function closeCatalogUtilities(',
  'function syncCatalogSortActions(',
  'function bindCatalogUtilityInteractions()',
  "event.key!=='Escape'",
  "'pointerdown'",
  'bindCatalogUtilityInteractions();',
  'syncCatalogSortActions( view.sort );'
]) {
  expect(
    flatRuntime,
    marker,
    'D-D utility runtime contract changed.'
  );
}

/*
 * ------------------------------------------------------------
 * 4. Canonical Catalog behavior stays frozen
 * ------------------------------------------------------------
 */


for (const [pattern, message] of [
  [
    /reader\.dataset\.utilityActive\s*=\s*active\s*;/,
    'utility active state assignment'
  ],
  [
    /closeCatalogUtilities\s*\(\s*['"]filter['"]\s*\)/,
    'Filter mutual-exclusion call'
  ],
  [
    /closeCatalogUtilities\s*\(\s*['"]sort['"]\s*\)/,
    'Sort mutual-exclusion call'
  ],
  [
    /new\s+Event\s*\(\s*['"]change['"]\s*,\s*\{\s*bubbles\s*:\s*true\s*\}\s*\)/,
    'native Sort change bridge'
  ]
]) {
  if (!pattern.test(runtime)) {
    fail(
      'D-D utility runtime contract changed. Missing semantic contract: ' +
      message
    );
  }
}

/*
 * ------------------------------------------------------------
 * 4. Canonical Catalog behavior stays frozen
 * ------------------------------------------------------------
 */

for (const marker of [
  "const VERSION='R4.4B';",
  'const SEARCH_DELAY=180;',
  'const EDITORIAL_ROLES=',
  'function editorialMeta(index)',
  'function spreadHtml(',
  'catalog.setQuery(',
  'catalog.setSizes(',
  'catalog.setSort(',
  'catalog.loadMore();'
]) {
  expect(
    flatRuntime,
    marker,
    'D-D must preserve canonical Catalog behavior.'
  );
}

for (const forbidden of [
  'batchSize:5',
  'DreamlandCatalogRenderer',
  'data-catalog-col="left"',
  'data-catalog-col="right"'
]) {
  if (
    page.includes(forbidden) ||
    runtime.includes(forbidden)
  ) {
    fail(
      'D-D reintroduced forbidden legacy Catalog architecture: ' +
      forbidden
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
  '"r4:visual:mobile-catalog-utility": "node scripts/validate-r4-11b4-1d-d-editorial-utility-interaction.mjs"',
  'package.json must expose the D-D validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-catalog-search-projection && npm run r4:visual:mobile-catalog-utility',
  'Main validation chain must run D-D after FIX1A.'
);

/*
 * ------------------------------------------------------------
 * Result
 * ------------------------------------------------------------
 */

if (errors.length) {
  console.error(
    '\nR4.11B4.1D-D EDITORIAL UTILITY INTERACTION: FAIL\n'
  );

  for (const error of errors) {
    console.error('- ' + error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1D-D EDITORIAL UTILITY INTERACTION: PASS'
);

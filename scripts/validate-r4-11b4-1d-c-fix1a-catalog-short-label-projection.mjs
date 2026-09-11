#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];
const fail=message=>errors.push(message);

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

function parseJson(relative){
  try{
    return JSON.parse(read(relative));
  }catch(error){
    fail(
      'Invalid JSON: '+
      relative+
      ' — '+
      error.message
    );
    return {};
  }
}

const data=parseJson(
  'data/site-content.json'
);

const viewModel=read(
  'src/astro/lib/catalog-view-model.mjs'
);

const page=read(
  'src/astro/components/catalog/CatalogPage.astro'
);

const runtime=read(
  'src/astro/runtime/catalog-runtime.js'
);

const pkg=read(
  'package.json'
);

const flatViewModel=
  viewModel.replace(/\s+/g,' ');

const flatPage=
  page.replace(/\s+/g,' ');

const flatRuntime=
  runtime.replace(/\s+/g,' ');

/*
 * ------------------------------------------------------------
 * 1. Source copy exists for all supported languages
 * ------------------------------------------------------------
 */

const expected={
  en:'Search',
  zh:'搜索',
  ko:'검색'
};

for(const [language,value] of Object.entries(expected)){
  const catalog=
    data?.languages?.[language]?.catalog;

  if(catalog?.searchShort!==value){
    fail(
      'FIX1A catalog.searchShort source changed for '+
      language+
      '.'
    );
  }

  if(!catalog?.searchPlaceholder){
    fail(
      'FIX1A full searchPlaceholder must remain for '+
      language+
      '.'
    );
  }
}

/*
 * ------------------------------------------------------------
 * 2. normalizeCatalogContent must project searchShort
 * ------------------------------------------------------------
 */

expect(
  flatViewModel,
  "searchPlaceholder: catalog.searchPlaceholder|| 'Search designs or product ID', searchShort: catalog.searchShort|| 'Search', filters:",
  'FIX1A normalizeCatalogContent must project searchShort.'
);

/*
 * Static Catalog uses normalizeCatalogContent(localizedContent).
 */
expect(
  flatViewModel,
  'const catalogContent= normalizeCatalogContent( localizedContent );',
  'FIX1A static Catalog projection path changed.'
);

/*
 * Runtime language views also pass through normalizeCatalogContent().
 */
expect(
  flatViewModel,
  'catalog: normalizeCatalogContent( localized )',
  'FIX1A runtime localized Catalog projection path changed.'
);

/*
 * ------------------------------------------------------------
 * 3. UI keeps short visible label + full semantic placeholder
 * ------------------------------------------------------------
 */

for(const marker of [
  'data-catalog-bind="catalog.searchShort"',
  '{copy.searchShort||copy.searchPlaceholder}',
  'data-catalog-bind="catalog.searchPlaceholder"',
  'placeholder={copy.searchPlaceholder}',
  'data-catalog-search'
]){
  expect(
    flatPage,
    marker,
    'FIX1A Catalog search UI contract changed.'
  );
}

/*
 * ------------------------------------------------------------
 * 4. No new runtime behavior is required
 * ------------------------------------------------------------
 */

for(const marker of [
  "const VERSION='R4.4B';",
  'const SEARCH_DELAY=180;',
  'catalog.setQuery(',
  'catalog.setSizes(',
  'catalog.setSort(',
  'catalog.loadMore();'
]){
  expect(
    flatRuntime,
    marker,
    'FIX1A must preserve canonical Catalog runtime behavior.'
  );
}

if(runtime.includes('searchShort')){
  fail(
    'FIX1A must remain a ViewModel projection fix; catalog-runtime.js should not need searchShort-specific logic.'
  );
}

/*
 * ------------------------------------------------------------
 * 5. Package chain
 * ------------------------------------------------------------
 */

expect(
  pkg,
  '"r4:visual:mobile-catalog-search-projection": "node scripts/validate-r4-11b4-1d-c-fix1a-catalog-short-label-projection.mjs"',
  'package.json must expose the FIX1A validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-catalog-polish && npm run r4:visual:mobile-catalog-search-projection',
  'Main validation chain must run FIX1A after FIX1.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1D-C-FIX1A CATALOG SHORT LABEL PROJECTION: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1D-C-FIX1A CATALOG SHORT LABEL PROJECTION: PASS'
);

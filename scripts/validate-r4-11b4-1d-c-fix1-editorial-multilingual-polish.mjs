#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
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
    fail('Invalid JSON: '+relative+' — '+error.message);
    return {};
  }
}

const contentJson=parseJson('data/site-content.json');
const page=read('src/astro/components/catalog/CatalogPage.astro');
const css=read('src/astro/styles/catalog.css');
const runtime=read('src/astro/runtime/catalog-runtime.js');
const pkg=read('package.json');
const flatPage=page.replace(/\s+/g,' ');
const flatRuntime=runtime.replace(/\s+/g,' ');

const polishStart=css.indexOf(
  '/* R4.11B4.1D-C-FIX1 — Editorial Order + Multilingual Rhythm Polish'
);

if(polishStart<0){
  fail('D-C-FIX1 Catalog polish CSS marker is missing.');
}

const polishCss=polishStart>=0?css.slice(polishStart):'';
const flatPolishCss=polishCss.replace(/\s+/g,' ');

const expectedSearchShort={
  en:'Search',
  zh:'搜索',
  ko:'검색'
};

for(const [language,value] of Object.entries(expectedSearchShort)){
  const catalog=contentJson?.languages?.[language]?.catalog;
  if(catalog?.searchShort!==value){
    fail(
      'D-C-FIX1 catalog.searchShort changed for '+
      language+
      '.'
    );
  }
  if(!catalog?.searchPlaceholder){
    fail(
      'D-C-FIX1 must preserve full searchPlaceholder for '+
      language+
      '.'
    );
  }
}

for(const marker of [
  'class="catalog-search__prompt"',
  'data-catalog-bind="catalog.searchShort"',
  '{copy.searchShort||copy.searchPlaceholder}',
  'data-catalog-bind="catalog.searchPlaceholder"',
  'placeholder={copy.searchPlaceholder}',
  'data-catalog-search'
]){
  expect(
    flatPage,
    marker,
    'D-C-FIX1 Search label / input semantic split changed.'
  );
}

for(const marker of [
  'html[lang="zh-CN"] body[data-dreamland-page="catalog"] .catalog-intro h1',
  'body[data-dreamland-page="catalog"][data-catalog-language="zh"] .catalog-intro h1',
  'html[lang="ko-KR"] body[data-dreamland-page="catalog"] .catalog-intro h1',
  'body[data-dreamland-page="catalog"][data-catalog-language="ko"] .catalog-intro h1',
  '.catalog-reader__index { column-gap:clamp(16px,5vw,22px); padding-right:28px;',
  '.catalog-series__item:last-child { margin-right:28px;',
  '.catalog-reader__tools { grid-template-columns:minmax(82px,1fr) auto auto;',
  '.catalog-search__prompt { gap:7px; font-size:9px;',
  '.catalog-card__copy > div:first-child { min-width:0;',
  '.catalog-card__copy h2 { max-width:100%; overflow-wrap:anywhere; text-wrap:balance;',
  '.catalog-card[data-editorial-role="support"] .catalog-card__commercial',
  '.catalog-card[data-editorial-role="narrow"] .catalog-card__commercial',
  'grid-template-columns:minmax(0,1fr) auto;',
  '.catalog-card[data-editorial-role="lead"] .catalog-card__media { border-radius:20px;',
  '.catalog-card[data-editorial-role="support"] .catalog-card__media { border-radius:15px;',
  '.catalog-card[data-editorial-role="narrow"] .catalog-card__media { border-radius:13px;',
  '@media (max-width:374px)',
  '@media (min-width:421px) and (max-width:720px)'
]){
  expect(
    flatPolishCss,
    marker,
    'D-C-FIX1 Editorial / multilingual CSS contract changed.'
  );
}

for(const forbidden of [
  'nth-child(',
  'translateY(',
  'position:fixed',
  '!important'
]){
  if(polishCss.includes(forbidden)){
    fail(
      'D-C-FIX1 must not change structural flow with synthetic/fixed behavior: '+
      forbidden
    );
  }
}

for(const marker of [
  "const VERSION='R4.4B';",
  'const SEARCH_DELAY=180;',
  'const EDITORIAL_ROLES=',
  'function editorialMeta(index)',
  'function spreadHtml(',
  'Math.ceil( view.products.length/ 5 )',
  'catalog.setQuery(',
  'catalog.setSizes(',
  'catalog.setSort(',
  'catalog.loadMore();',
  'index<4'
]){
  expect(
    flatRuntime,
    marker,
    'D-C-FIX1 must preserve D-C runtime / catalog behavior.'
  );
}

for(const forbidden of [
  'D-C-FIX1',
  'searchShort'
]){
  if(runtime.includes(forbidden)){
    fail(
      'D-C-FIX1 should not require new Catalog runtime logic: '+
      forbidden
    );
  }
}

expect(
  pkg,
  '"r4:visual:mobile-catalog-polish": "node scripts/validate-r4-11b4-1d-c-fix1-editorial-multilingual-polish.mjs"',
  'package.json must expose the D-C-FIX1 validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-catalog-flow && npm run r4:visual:mobile-catalog-polish',
  'Main validation chain must run D-C-FIX1 after D-C.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1D-C-FIX1 EDITORIAL ORDER + MULTILINGUAL RHYTHM: FAIL\n'
  );
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1D-C-FIX1 EDITORIAL ORDER + MULTILINGUAL RHYTHM: PASS'
);

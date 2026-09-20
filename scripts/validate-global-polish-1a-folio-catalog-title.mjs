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

const catalogCss=read('src/astro/styles/catalog.css');
const homeCss=read('src/astro/styles/home.css');
const mobileHomeCss=read('src/astro/styles/mobile-home.css');
const pkg=JSON.parse(read('package.json'));

for(const marker of [
  'GLOBAL-POLISH-1A — Editorial Folio Cleanup + Catalog Hero Consistency',
  '.catalog-chapter__number,',
  '.catalog-chapter__slash {',
  'display:none;',
  'html[lang="zh-CN"]',
  'html[lang="ko-KR"]',
  '--catalog-hero-title-size:',
  'clamp(38px,4.2vw,62px)',
  'clamp(24px,6.8vw,30px)',
  'width:calc(100% - 40px);'
]){
  expect(
    catalogCss,
    marker,
    'GLOBAL-POLISH-1A Catalog visual contract changed.'
  );
}

if(
  !/\.catalog-chapter__number\s*,\s*\n?\.catalog-chapter__slash\s*\{[^}]*display\s*:\s*none\s*;/m
    .test(catalogCss)
){
  fail(
    'Catalog chapter folio number/slash must be visually removed.'
  );
}

for(const language of ['zh-CN','ko-KR']){
  const escaped=language.replace('-','\\-');

  const desktop=
    new RegExp(
      `html\\[lang="${escaped}"\\][\\s\\S]*?\\.catalog-intro h1\\s*\\{[^}]*font-size\\s*:\\s*var\\(--catalog-hero-title-size\\)\\s*;`,
      'm'
    );

  if(!desktop.test(catalogCss)){
    fail(
      `Catalog ${language} title must use the shared title-size token.`
    );
  }
}

if(
  !/@media\s*\(max-width:720px\)[\s\S]*?body\[data-dreamland-page="catalog"\]\s+\.catalog-chapter\s*\{[^}]*width\s*:\s*calc\(100%\s*-\s*40px\)\s*;/m
    .test(catalogCss)
){
  fail(
    'Mobile Catalog Hero must preserve 20px horizontal safe spacing.'
  );
}

for(const marker of [
  'GLOBAL-POLISH-1A — Remove Decorative Collection Folio',
  '.home-collections__rail-index {',
  'display:none;'
]){
  expect(
    homeCss,
    marker,
    'GLOBAL-POLISH-1A Home collection folio cleanup changed.'
  );
}

for(const marker of [
  'GLOBAL-POLISH-1A — Remove Decorative Mobile Folios',
  '.home-mobile-cover__headline {',
  '.dl-mobile-startup__index {',
  'display:none;',
  '.dl-mobile-startup__wordmark {',
  'margin-top:0;'
]){
  expect(
    mobileHomeCss,
    marker,
    'GLOBAL-POLISH-1A Mobile folio cleanup changed.'
  );
}

if(
  pkg.scripts?.['r4:visual:global-folio-polish']!==
  'node scripts/validate-global-polish-1a-folio-catalog-title.mjs'
){
  fail(
    'package.json lost r4:visual:global-folio-polish.'
  );
}

const validate=String(pkg.scripts?.validate||'');

if(
  !validate.endsWith(
    'npm run r4:visual:catalog-polish && npm run r4:visual:global-folio-polish'
  )
){
  fail(
    'GLOBAL-POLISH-1A must close the visual validation chain after Catalog polish.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'GLOBAL-POLISH-1A FOLIO / CATALOG HERO CONSISTENCY: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'GLOBAL-POLISH-1A FOLIO / CATALOG HERO CONSISTENCY: PASS'
);
console.log(
  'Decorative 01/02 folios are hidden; Catalog EN/ZH/KO title sizing and Mobile safe spacing are unified.'
);
console.log('');

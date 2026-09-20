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

  return fs.readFileSync(file,'utf8')
    .replace(/\r\n?/g,'\n');
}

function expect(source,marker,message){
  if(!source.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const page=
  read('src/astro/components/catalog/CatalogPage.astro');

const viewModel=
  read('src/astro/lib/catalog-view-model.mjs');

const css=
  read('src/astro/styles/catalog.css');

const runtime=
  read('src/astro/runtime/catalog-runtime.js');

const site=
  JSON.parse(
    read('data/site-content.json')
  );

const pkg=
  JSON.parse(
    read('package.json')
  );

const expected={
  en:{
    title:'DREAMLAND Collection',
    body:'For wholesale, retail and custom projects.',
    ctaKicker:'PROJECT SELECTION',
    ctaEmptyTitle:'Build a selection for your project.',
    ctaEmptyBody:'Add the products you are interested in to your inquiry. Final pricing is confirmed based on quantity, configuration and customization.',
    reviewInquiry:'Review inquiry'
  },
  zh:{
    title:'DREAMLAND 产品系列',
    body:'适合批发、零售与定制项目。',
    ctaKicker:'项目询价',
    ctaEmptyTitle:'为你的项目挑选产品',
    ctaEmptyBody:'将感兴趣的款式加入询价单，我们会根据数量、规格和定制需求确认最终报价。',
    reviewInquiry:'查看询价单'
  },
  ko:{
    title:'DREAMLAND 컬렉션',
    body:'도매·리테일·맞춤 프로젝트용 제품입니다.',
    ctaKicker:'프로젝트 문의',
    ctaEmptyTitle:'프로젝트에 맞는 제품을 골라보세요.',
    ctaEmptyBody:'관심 있는 제품을 문의 목록에 추가하세요. 수량, 사양 및 맞춤 요구사항을 바탕으로 최종 견적을 확인해 드립니다.',
    reviewInquiry:'문의 목록 보기'
  }
};

for(const language of ['en','zh','ko']){
  const catalog=
    site?.languages?.[language]?.catalog||
    {};

  for(const [key,value] of Object.entries(expected[language])){
    if(catalog[key]!==value){
      fail(
        `CATALOG-VISUAL-1 ${language}.${key} mismatch. Expected "${value}".`
      );
    }
  }
}

for(const marker of [
  "title:\n      catalog.title||\n      'DREAMLAND Collection'",
  "body:\n      catalog.body||\n      'For wholesale, retail and custom projects.'",
  "ctaKicker:\n      catalog.ctaKicker||\n      'PROJECT SELECTION'",
  "ctaEmptyTitle:\n      catalog.ctaEmptyTitle||\n      'Build a selection for your project.'",
  "reviewInquiry:\n      catalog.reviewInquiry||\n      'Review inquiry'"
]){
  expect(
    viewModel,
    marker,
    'CATALOG-VISUAL-1 fallback copy changed.'
  );
}

for(const marker of [
  'class="catalog-intro__count"',
  'data-catalog-all-count-value',
  'data-catalog-bind="catalog.activeDesigns"',
  'data-catalog-section="inquiry-cta"',
  'data-catalog-bind="catalog.ctaEmptyTitle"',
  'data-catalog-bind="catalog.ctaEmptyBody"',
  'data-catalog-bind="catalog.reviewInquiry"'
]){
  expect(
    page,
    marker,
    'CATALOG-VISUAL-1 Catalog markup changed.'
  );
}

const ctaStart=
  page.indexOf(
    'class="catalog-cta"'
  );

if(ctaStart<0){
  fail(
    'CATALOG-VISUAL-1 inquiry CTA section is missing.'
  );
}else{
  const cta=
    page.slice(
      ctaStart,
      page.indexOf('</section>',ctaStart)+10
    );

  if(
    cta.includes(
      'data-home-bind="navigation.inquiry"'
    )
  ){
    fail(
      'CATALOG-VISUAL-1 CTA must use catalog.reviewInquiry, not the generic navigation label.'
    );
  }
}

const stageMarker=
  'CATALOG-VISUAL-1 — Catalog Hierarchy & Conversion Polish';

const stageStart=
  css.indexOf(stageMarker);

if(stageStart<0){
  fail(
    'CATALOG-VISUAL-1 CSS stage marker is missing.'
  );
}

const stage=
  stageStart>=0
    ? css.slice(stageStart)
    : '';

for(const marker of [
  '.catalog-intro h1 {',
  'white-space:nowrap;',
  '.catalog-intro__count {',
  'flex-direction:row;',
  '.catalog-intro__count strong {',
  'font-size:28px;',
  '.catalog-cta__inner {',
  '.catalog-cta h2 {',
  '@media (max-width:720px)',
  'display:block;',
  'font-size:clamp(24px,6.8vw,30px);',
  'font-size:14px;'
]){
  expect(
    stage,
    marker,
    'CATALOG-VISUAL-1 hierarchy styling changed.'
  );
}

/*
 * CATALOG-VISUAL-1-FIX2 — multiline selector semantics
 *
 * Selector formatting is not contractual. Scope + declarations are.
 */
if(
  !/body\[data-dreamland-page="catalog"\]\s+\.catalog-intro__layout\s*\{[^}]*display\s*:\s*block\s*;/m
    .test(stage)
){
  fail(
    'CATALOG-VISUAL-1 Mobile Catalog intro must collapse to a single-column block.'
  );
}

if(
  !/body\[data-dreamland-page="catalog"\]\s+\.catalog-intro\s+h1\s*\{[^}]*font-size\s*:\s*clamp\(24px,6\.8vw,30px\)\s*;[^}]*white-space\s*:\s*nowrap\s*;/m
    .test(stage)
){
  fail(
    'CATALOG-VISUAL-1 Mobile Hero title typography contract changed.'
  );
}

if(
  !/body\[data-dreamland-page="catalog"\]\s+\.catalog-intro__count\s+strong\s*\{[^}]*font-size\s*:\s*14px\s*;/m
    .test(stage)
){
  fail(
    'CATALOG-VISUAL-1 Mobile product-count hierarchy contract changed.'
  );
}

if(
  !/@media\s*\(max-width:720px\)[\s\S]*?\.catalog-cta__inner\s*\{[\s\S]*?padding-top\s*:\s*36px\s*;[\s\S]*?padding-bottom\s*:\s*36px\s*;/m
    .test(stage)
){
  fail(
    'CATALOG-VISUAL-1 Mobile CTA must keep the compact 36px vertical rhythm.'
  );
}

for(const marker of [
  "const VERSION='R4.4B';",
  'function applyGenericBindings(',
  '[data-home-bind],[data-catalog-bind]',
  'function render(',
  'catalog.setQuery(',
  'catalog.setSizes(',
  'catalog.setSort(',
  'catalog.loadMore();'
]){
  expect(
    runtime,
    marker,
    'CATALOG-VISUAL-1 must not change canonical Catalog behavior.'
  );
}

if(
  pkg.scripts
    ?.['r4:visual:catalog-polish']!==
  'node scripts/validate-catalog-visual-1-hierarchy-conversion.mjs'
){
  fail(
    'package.json is missing r4:visual:catalog-polish.'
  );
}

const validate=
  String(
    pkg.scripts?.validate||
    ''
  );

if(
  !validate.endsWith(
    'npm run r4:visual:pdp-responsive-closeout && npm run r4:visual:catalog-polish'
  )
){
  fail(
    'CATALOG-VISUAL-1 gate must close the visual validation chain after the existing PDP responsive closeout.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'CATALOG-VISUAL-1 HIERARCHY / CONVERSION POLISH: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'CATALOG-VISUAL-1 HIERARCHY / CONVERSION POLISH: PASS'
);
console.log(
  'Desktop/Mobile hero hierarchy + compact product count + EN/ZH/KO project CTA contract verified.'
);
console.log('');

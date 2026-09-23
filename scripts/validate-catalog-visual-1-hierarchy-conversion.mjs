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

/*
 * SITE-COPY-1B — Canonical customer-copy contract.
 * Catalog visual structure remains owned by CATALOG-VISUAL-1; customer
 * language now follows the SITE-COPY-1B voice system.
 */
const expected={
  en:{
    title:'Find the one that catches your eye.',
    body:'Four collections, from quieter color stories to pieces made to stand out.',
    ctaKicker:'INQUIRY',
    ctaEmptyTitle:'See something you like? Add it to your inquiry.',
    ctaEmptyBody:'You can adjust quantities and options later. We’ll confirm pricing once your selection is ready.',
    reviewInquiry:'Review inquiry'
  },
  zh:{
    title:'搜寻属于你的光影廓形',
    body:'凝练色彩与精雕廓形，全方位适配空间美学展示与品牌高定礼赠需求。',
    ctaKicker:'询价清单',
    ctaEmptyTitle:'有喜欢的，先放进询价清单。',
    ctaEmptyBody:'数量和选项可以之后继续调整，我们会根据最终选择为你确认报价。',
    reviewInquiry:'查看询价清单'
  },
  ko:{
    title:'마음이 가는 캔들을 찾아보세요.',
    body:'차분한 컬러부터 시선을 끄는 디자인까지, 네 가지 시리즈를 천천히 둘러보세요.',
    ctaKicker:'문의',
    ctaEmptyTitle:'마음에 드는 제품은 문의 목록에 담아두세요.',
    ctaEmptyBody:'수량과 옵션은 나중에 조정할 수 있습니다. 최종 선택을 바탕으로 견적을 안내드립니다.',
    reviewInquiry:'문의 보기'
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
  "title:\n      catalog.title||\n      'Find the one that catches your eye.'",
  "body:\n      catalog.body||\n      'Four collections, from quieter color stories to pieces made to stand out.'",
  "ctaKicker:\n      catalog.ctaKicker||\n      'INQUIRY'",
  "ctaEmptyTitle:\n      catalog.ctaEmptyTitle||\n      'See something you like? Add it to your inquiry.'",
  "ctaEmptyBody:\n      catalog.ctaEmptyBody||\n      'You can adjust quantities and options later. We’ll confirm pricing once your selection is ready.'",
  "ctaReadyTitle:\n      catalog.ctaReadyTitle||\n      'You’ve started a selection.'",
  "ctaReadyBody:\n      catalog.ctaReadyBody||\n      '{count} products are in your inquiry.'",
  "reviewInquiry:\n      catalog.reviewInquiry||\n      'Review inquiry'"
]){
  expect(
    viewModel,
    marker,
    'CATALOG-VISUAL-1 / SITE-COPY-1B fallback copy changed.'
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

/*
 * GLOBAL-POLISH-1A-FIX1 — gate adjacency semantics
 *
 * CATALOG-VISUAL-1 owns the adjacency to the PDP responsive closeout.
 * Later visual closeout gates may legitimately append after Catalog, so
 * Catalog must not require itself to remain the final command forever.
 */
if(
  !validate.includes(
    'npm run r4:visual:pdp-responsive-closeout && npm run r4:visual:catalog-polish'
  )
){
  fail(
    'CATALOG-VISUAL-1 gate must remain immediately after the existing PDP responsive closeout.'
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
  'Desktop/Mobile hero hierarchy + compact product count + SITE-COPY-1B EN/ZH/KO customer CTA contract verified.'
);
console.log('');

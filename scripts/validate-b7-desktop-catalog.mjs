#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function compact(value){
  return String(
    value||
    ''
  ).replace(
    /\s+/g,
    ''
  );
}

function countOf(
  source,
  marker
){
  return source
    .split(marker)
    .length-1;
}

/*
 * Gate 1 — executable pure Desktop Catalog ViewState.
 */
try{
  const runtimePath=
    path.join(
      ROOT,
      'src/features/catalog/runtime-desktop-catalog-view.js'
    );

  delete globalThis.DreamlandDesktopCatalogView;

  await import(
    `${pathToFileURL(runtimePath).href}?b7-desktop-catalog=${Date.now()}`
  );

  const catalog=
    globalThis.DreamlandDesktopCatalogView;

  if(
    !catalog||
    catalog.version!==
      'B7-00B.3A'
  ){
    fail(
      'DreamlandDesktopCatalogView B7-00B.3A was not exposed.'
    );
  }else{
    for(const method of [
      'configure',
      'ready',
      'reset',
      'setScope',
      'setQuery',
      'setSizes',
      'setSort',
      'loadMore',
      'setScrollY',
      'buildViewModel',
      'snapshot'
    ]){
      if(
        typeof catalog[method]!==
        'function'
      ){
        fail(
          `DreamlandDesktopCatalogView.${method} is missing.`
        );
      }
    }

    const products=[];

    for(let index=0;index<30;index+=1){
      products.push({
        id:`ADV${String(index+1).padStart(3,'0')}`,
        productId:`ADV${String(index+1).padStart(3,'0')}`,
        status:'active',
        series:'advanced',
        listSort:100-index,
        names:{
          en:
            index===0
              ? 'Noir Rainbow'
              : `Advanced ${index+1}`,
          zh:
            index===0
              ? '暗黑彩虹'
              : `进阶 ${index+1}`,
          ko:
            index===0
              ? '누아르 레인보우'
              : `어드밴스 ${index+1}`
        },
        tags:{
          en:
            index===0
              ? ['rainbow']
              : [],
          zh:[],
          ko:[]
        },
        availableSizes:
          index%2===0
            ? ['S','M']
            : ['L','XL'],
        defaultSize:'S',
        price:index+10,
        moq:
          index%2===0
            ? 36
            : 18
      });
    }

    products.push({
      id:'MPC001',
      status:'active',
      series:'masterpiece',
      listSort:200,
      names:{
        en:'Heartbeat',
        zh:'心动',
        ko:'하트비트'
      },
      availableSizes:['S'],
      defaultSize:'S',
      price:50,
      moq:36
    });

    catalog.configure({
      products,
      seriesMeta:{
        advanced:{},
        masterpiece:{}
      },
      batchSize:24,
      productName:
        product=>
          product.names?.en||
          product.id,
      productPriceValue:
        product=>
          product.price,
      productMoq:
        product=>
          product.moq
    });

    const all=
      catalog.buildViewModel();

    if(
      !catalog.ready()||
      all.scope!=='all'||
      all.allCount!==31||
      all.totalCount!==31||
      all.renderedCount!==24||
      all.hasMore!==true||
      all.seriesCounts.advanced!==30||
      all.seriesCounts.masterpiece!==1
    ){
      fail(
        'Desktop Catalog All/count/24-item initial page regression failed.'
      );
    }

    catalog.loadMore();

    const loaded=
      catalog.buildViewModel();

    if(
      loaded.renderedCount!==31||
      loaded.hasMore!==false
    ){
      fail(
        'Desktop Catalog Load More regression failed.'
      );
    }

    catalog.reset({
      scope:'masterpiece'
    });

    const masterpiece=
      catalog.buildViewModel();

    if(
      masterpiece.scope!==
        'masterpiece'||
      masterpiece.totalCount!==1||
      masterpiece.products[0]?.id!==
        'MPC001'
    ){
      fail(
        'Desktop Catalog Series scope regression failed.'
      );
    }

    catalog.reset({
      scope:'all'
    });

    catalog.setQuery(
      '누아르'
    );

    const search=
      catalog.buildViewModel();

    if(
      search.totalCount!==1||
      search.products[0]?.id!==
        'ADV001'
    ){
      fail(
        'Desktop Catalog multilingual Search regression failed.'
      );
    }

    catalog.setQuery('');
    catalog.setSizes(['XL']);

    const sizeFiltered=
      catalog.buildViewModel();

    if(
      sizeFiltered.totalCount!==15||
      sizeFiltered.products
        .some(
          product=>
            !product.availableSizes
              ?.includes('XL')
        )
    ){
      fail(
        'Desktop Catalog Size filter regression failed.'
      );
    }

    catalog.setSizes([]);
    catalog.setSort(
      'price-high'
    );

    const high=
      catalog.buildViewModel();

    if(
      high.products[0]
        ?.desktopCatalogPriceValue!==
        50
    ){
      fail(
        'Desktop Catalog numeric price sorting regression failed.'
      );
    }

    catalog.setSort(
      'moq-low'
    );

    const lowMoq=
      catalog.buildViewModel();

    if(
      lowMoq.products[0]
        ?.desktopCatalogMoq!==
        18
    ){
      fail(
        'Desktop Catalog MOQ sorting regression failed.'
      );
    }

    catalog.setScrollY(
      1234
    );

    if(
      catalog.snapshot()
        .scrollY!==1234
    ){
      fail(
        'Desktop Catalog scroll restoration state regression failed.'
      );
    }
  }
}catch(error){
  fail(
    `Desktop Catalog executable ViewState regression failed: ${error.message}`
  );
}

/*
 * Gate 2 — ViewState stays presentation-only / DOM-free.
 */
try{
  const source=
    read(
      'src/features/catalog/runtime-desktop-catalog-view.js'
    );

  for(const forbidden of [
    'document.',
    'querySelector(',
    'innerHTML',
    'localStorage',
    'sessionStorage',
    'DreamlandInquiry',
    'DreamlandDetail',
    'DreamlandContact',
    'DreamlandSubmission'
  ]){
    if(source.includes(forbidden)){
      fail(
        `Desktop Catalog ViewState crossed its boundary: ${forbidden}`
      );
    }
  }

  for(const required of [
    "const VERSION='B7-00B.3A';",
    "const ALL_SCOPE='all';",
    'setQuery(',
    'setSizes(',
    'setSort(',
    'loadMore(',
    'setScrollY(',
    'availableScopes:',
    'seriesCounts:',
    'desktopCatalogPriceValue',
    'desktopCatalogMoq'
  ]){
    if(!source.includes(required)){
      fail(
        `Desktop Catalog ViewState is missing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Catalog ViewState source validation failed: ${error.message}`
  );
}

/*
 * Gate 3 — Desktop renderer owns only desktop DOM/presentation.
 */
try{
  const renderer=
    read(
      'src/ui/desktop/catalog/runtime-desktop-catalog.js'
    );

  for(const forbidden of [
    'DreamlandCatalog',
    'DreamlandInquiry',
    'DreamlandDetail',
    'DreamlandContact',
    'localStorage',
    'sessionStorage',
    'angle_image',
    'quick-add',
    'data-catalog-action="quick-add"'
  ]){
    if(renderer.includes(forbidden)){
      fail(
        `Desktop Catalog renderer crossed/retained a forbidden behavior: ${forbidden}`
      );
    }
  }

  for(const required of [
    "const VERSION='B7-00B.3A';",
    'data-desktop-catalog-search',
    'data-desktop-catalog-size',
    'data-desktop-catalog-sort',
    'data-desktop-catalog-product',
    'View details',
    'data-image-manager-catalog="1"',
    'data-responsive-source=',
    'load-more',
    'review-inquiry'
  ]){
    if(!renderer.includes(required)){
      fail(
        `Desktop Catalog renderer is missing: ${required}`
      );
    }
  }

  const css=
    read(
      'src/ui/desktop/styles/catalog.css'
    );

  for(const required of [
    '.desktop-catalog-grid{',
    'grid-template-columns:repeat(4,minmax(0,1fr));',
    'grid-template-columns:repeat(3,minmax(0,1fr));',
    'aspect-ratio:4/5;',
    'transform:scale(1.025);',
    '.desktop-catalog-sticky{',
    '.desktop-catalog-filter__popover{'
  ]){
    if(!css.includes(required)){
      fail(
        `Desktop Catalog CSS is missing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Catalog presentation validation failed: ${error.message}`
  );
}

/*
 * Gate 4 — Desktop Experience manages Home + Catalog and keeps later screens
 * on the temporary Mobile fallback.
 */
try{
  const experience=
    read(
      'src/ui/desktop/runtime-desktop-experience.js'
    );

  for(const required of [
    'id="desktopHomeRoot"',
    'id="desktopCatalogRoot"',
    'DreamlandDesktopCatalogView',
    'DreamlandDesktopCatalog',
    "currentScreen==='catalog'",
    'desktopManaged=',
    'home||',
    'catalog;',
    'setCatalogScope'
  ]){
    if(!experience.includes(required)){
      fail(
        `Desktop Experience is missing Catalog integration: ${required}`
      );
    }
  }

  const tokens=
    read(
      'src/ui/desktop/styles/tokens.css'
    );

  const compactTokens=
    compact(tokens);

  if(
    !compactTokens.includes(
      compact(
        'body.desktop-experience-ready[data-desktop-screen="catalog"] > #app{display:none;}'
      )
    )
  ){
    fail(
      'Desktop Catalog must hide the Mobile #app at >=1024px.'
    );
  }

  if(
    !compactTokens.includes(
      compact(
        'body.desktop-experience-ready:not([data-desktop-screen="home"]):not([data-desktop-screen="catalog"]) > #app'
      )
    )
  ){
    fail(
      'Desktop fallback must exclude Home and Catalog while preserving later Mobile screens.'
    );
  }
}catch(error){
  fail(
    `Desktop Experience integration validation failed: ${error.message}`
  );
}

/*
 * Gate 5 — Mobile Catalog remains intact.
 */
try{
  const mobile=
    read(
      'src/ui/catalog/runtime-catalog-renderer.js'
    );

  const mobileGate=
    read(
      'scripts/validate-catalog-ui-renderer-boundary.mjs'
    );

  for(const required of [
    "const VERSION='B6-02';",
    'data-catalog-action="quick-add"',
    'data-catalog-action="open-detail"',
    'maybeLoadMore',
    'ensureScrollable'
  ]){
    if(!mobile.includes(required)){
      fail(
        `Mobile Catalog regression: ${required}`
      );
    }
  }

  if(
    !mobileGate.includes(
      'Catalog UI Renderer boundary validation'
    )
  ){
    fail(
      'Historical Mobile Catalog UI gate is missing.'
    );
  }
}catch(error){
  fail(
    `Mobile Catalog preservation validation failed: ${error.message}`
  );
}

/*
 * Gate 6 — real product counts / data contract.
 */
try{
  const productsDoc=
    json(
      'data/products.json'
    );

  const products=
    Array.isArray(
      productsDoc.products
    )
      ? productsDoc.products
      : [];

  const active=
    products.filter(
      product=>
        !product.status||
        product.status==='active'
    );

  const expected={
    advanced:19,
    masterpiece:46,
    holiday:16,
    classic:8
  };

  if(active.length!==89){
    fail(
      `Desktop Catalog baseline must contain 89 active products; found ${active.length}.`
    );
  }

  for(
    const [
      series,
      count
    ] of Object.entries(
      expected
    )
  ){
    const actual=
      active.filter(
        product=>
          product.series===
          series
      ).length;

    if(actual!==count){
      fail(
        `Desktop Catalog ${series} count must be ${count}; found ${actual}.`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Catalog real-data validation failed: ${error.message}`
  );
}

/*
 * Gate 7 — EN / ZH / KO content contract.
 */
try{
  const site=
    json(
      'data/site-content.json'
    );

  for(const lang of [
    'en',
    'zh',
    'ko'
  ]){
    const catalog=
      site.languages
        ?.[lang]
        ?.catalog;

    if(!catalog){
      fail(
        `site-content.json ${lang} is missing Desktop Catalog copy.`
      );
      continue;
    }

    for(const key of [
      'kicker',
      'title',
      'body',
      'all',
      'activeDesigns',
      'designs',
      'searchPlaceholder',
      'filters',
      'size',
      'sort',
      'sortFeatured',
      'sortName',
      'sortPriceLow',
      'sortPriceHigh',
      'sortMoq',
      'viewDetails',
      'showing',
      'of',
      'loadMore',
      'emptyTitle',
      'emptyBody',
      'clearFilters',
      'moq'
    ]){
      if(
        typeof catalog[key]!==
          'string'||
        !catalog[key].trim()
      ){
        fail(
          `site-content.json ${lang}.catalog.${key} is missing.`
        );
      }
    }
  }
}catch(error){
  fail(
    `Desktop Catalog content validation failed: ${error.message}`
  );
}

/*
 * Gate 8 — index bridge, PWA v91, validation chain.
 */
try{
  const index=
    read(
      'index.html'
    );

  for(const required of [
    './src/ui/desktop/styles/catalog.css',
    './src/features/catalog/runtime-desktop-catalog-view.js',
    './src/ui/desktop/catalog/runtime-desktop-catalog.js',
    'productPriceValue:',
    'catalogAfterRender:',
    'selectCatalogSeries:'
  ]){
    if(!index.includes(required)){
      fail(
        `index.html is missing Desktop Catalog integration: ${required}`
      );
    }
  }

  const packageJson=
    json(
      'package.json'
    );

  if(
    packageJson.scripts
      ?.['desktop:catalog']!==
      'node scripts/validate-b7-desktop-catalog.mjs'
  ){
    fail(
      'package.json is missing desktop:catalog.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run desktop:home-assets'
    )||
    !validate.trim()
      .endsWith(
        'npm run desktop:catalog'
      )
  ){
    fail(
      'npm run validate must preserve Desktop Home gates and finish with desktop:catalog.'
    );
  }

  const sw=
    read('sw.js');

  const cacheVersion=
    sw.match(
      /const CACHE_VERSION = 'dreamland-pwa-v(\d+)';/
    );

  if(
    !cacheVersion||
    Number(cacheVersion[1])!==91
  ){
    fail(
      'B7-00B.3A requires dreamland-pwa-v91.'
    );
  }

  for(const entry of [
    './src/features/catalog/runtime-desktop-catalog-view.js',
    './src/ui/desktop/catalog/runtime-desktop-catalog.js',
    './src/ui/desktop/styles/catalog.css'
  ]){
    if(
      countOf(
        sw,
        `'${entry}'`
      )!==1
    ){
      fail(
        `APP_SHELL must include ${entry} exactly once.`
      );
    }
  }
}catch(error){
  fail(
    `Desktop Catalog release-gate validation failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nB7-00B.3A Desktop Catalog validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'B7-00B.3A Desktop Catalog validation: PASS'
);

console.log(
  'All 89 / 19 Advanced / 46 Masterpiece / 16 Holiday / 8 Classic / Search / Size / Sort / 24-item Load More / Desktop no-phone fallback / PWA v91 PASS.'
);

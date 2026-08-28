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
    'review-inquiry',
    'onDocumentPointerDown',
    "'pointerdown'"
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
    'setCatalogScope',
    'desktopReadySignaled',
    'dreamland:desktop-ready'
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


  const shell=
    read(
      'src/ui/desktop/styles/shell.css'
    );

  const compactShell=
    compact(shell);

  if(
    !compactShell.includes(
      compact(
        '.desktop-experience:not(.is-home):not(.is-catalog) .desktop-site-main, .desktop-experience:not(.is-home):not(.is-catalog) .desktop-site-footer{display:none;}'
      )
    )
  ){
    fail(
      'Desktop Shell must keep site main/footer visible for Catalog and hide them only on later Mobile-fallback screens.'
    );
  }

  if(
    compactShell.includes(
      compact(
        '.desktop-experience:not(.is-home) .desktop-site-main, .desktop-experience:not(.is-home) .desktop-site-footer{display:none;}'
      )
    )
  ){
    fail(
      'Desktop Shell still contains the old Home-only visibility rule that blanks the Desktop Catalog.'
    );
  }

  if(
    !compactShell.includes(
      compact(
        '#desktopHeaderRoot{position:sticky;top:0;z-index:320;height:var(--dw-header);}'
      )
    )
  ){
    fail(
      'Desktop Header wrapper must remain sticky across Home/Catalog scrolling.'
    );
  }

  const responsive=
    read(
      'image-variants.js'
    );

  for(const required of [
    '.product-cover[data-responsive-source]',
    '.desktop-catalog-card__image[data-responsive-source]',
    'desktopCatalogObserver',
    "createCatalogObserver(\n          null,",
    'getCatalogObserver(\n              img'
  ]){
    if(!responsive.includes(required)){
      fail(
        `Desktop responsive media pipeline is missing: ${required}`
      );
    }
  }

  const startup=
    read(
      'startup-loader.js'
    );

  for(const required of [
    "const desktopViewport=",
    "let desktopReady=",
    "'dreamland:desktop-ready'",
    'desktopReady\n    );',
    'desktopViewport,',
    'desktopReady,'
  ]){
    if(!startup.includes(required)){
      fail(
        `Desktop startup readiness gate is missing: ${required}`
      );
    }
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
 * Gate 8 — index bridge, PWA v92, validation chain.
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

  /*
   * B7-00B.4B successor:
   * R5 established the minimum safe Desktop boot cache generation. Later
   * releases must be allowed to advance beyond v99 instead of being frozen to
   * the exact historical cache number.
   */
  if(
    !cacheVersion||
    Number(cacheVersion[1])<99
  ){
    fail(
      'B7-00B.3A Desktop Boot Experience Cleanup R5 requires dreamland-pwa-v99 or later.'
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


/*
 * Gate 9 — R4 release convergence.
 *
 * A normal returning browser must not mix old cached Mobile-era runtime with
 * current Desktop HTML. Critical assets therefore carry one release tag,
 * dynamic media infrastructure inherits it, and the waiting worker can be
 * activated safely without reloading an already-current document.
 */
try{
  const release=
    'b7-00b4c-r1-v112';

  const index=
    read(
      'index.html'
    );

  const requiredIndex=[
    `window.DREAMLAND_RELEASE='${release}';`,
    'dreamland-desktop-boot',
    `./startup-loader.js?release=${release}`,
    `./catalog-data.js?release=${release}`,
    `./src/services/pwa/runtime-pwa.js?release=${release}`,
    `./src/ui/desktop/styles/catalog.css?release=${release}`,
    `./src/ui/desktop/runtime-desktop-experience.js?release=${release}`
  ];

  for(const marker of requiredIndex){
    if(!index.includes(marker)){
      fail(
        `R4 index release handshake is missing: ${marker}`
      );
    }
  }

  const catalogData=
    read(
      'catalog-data.js'
    );

  for(const marker of [
    'function releaseScriptUrl(src)',
    'window.DREAMLAND_RELEASE',
    "'release='+",
    'releaseScriptUrl('
  ]){
    if(!catalogData.includes(marker)){
      fail(
        `R4 dynamic runtime versioning is missing: ${marker}`
      );
    }
  }

  const pwa=
    read(
      'src/services/pwa/runtime-pwa.js'
    );

  for(const marker of [
    `const RELEASE_TAG=\n    '${release}';`,
    'function serviceWorkerUrl()',
    'function handleWaitingUpdate(',
    'function safeForImmediateWorkerActivation()',
    "screen==='home'||",
    "screen==='catalog'",
    "type:'SKIP_WAITING'",
    'currentRelease()===\n              RELEASE_TAG'
  ]){
    if(!pwa.includes(marker)){
      fail(
        `R4 PWA convergence runtime is missing: ${marker}`
      );
    }
  }

  const sw=
    read(
      'sw.js'
    );

  for(const marker of [
    `const RELEASE_TAG =\n  '${release}';`,
    'const RELEASE_ASSETS = [',
    `./startup-loader.js?release=${release}`,
    `./image-variants.js?release=${release}`,
    "url.searchParams.get(\n      'release'\n    )===RELEASE_TAG",
    'cache.addAll(\n              RELEASE_ASSETS'
  ]){
    if(!sw.includes(marker)){
      fail(
        `R4 Service Worker release convergence is missing: ${marker}`
      );
    }
  }

  const experience=
    read(
      'src/ui/desktop/runtime-desktop-experience.js'
    );

  if(
    !experience.includes(
      "'dreamland-desktop-boot'"
    )||
    !experience.includes(
      "'data-dreamland-release'"
    )
  ){
    fail(
      'Desktop Experience must remove the independent R4 Desktop boot guard when ready.'
    );
  }
}catch(error){
  fail(
    `R4 release convergence validation failed: ${error.message}`
  );
}

/*
 * Gate 10 — R5 Desktop Boot Experience Cleanup.
 *
 * Desktop must never render the legacy Mobile startup overlay. It stays on a
 * quiet warm canvas until Desktop Experience has mounted, while Mobile keeps
 * the existing loader and product-preload behavior.
 */
try{
  const index=
    read(
      'index.html'
    );

  const startup=
    read(
      'startup-loader.js'
    );

  for(const marker of [
    '<!-- DREAMLAND v63 startup loader — Mobile only -->',
    'media="(max-width: 1023.98px)"',
    'html.dreamland-desktop-boot body > #app{',
    'display:none!important;',
    'html.dreamland-desktop-boot body > #desktopExperience{',
    'dreamlandDesktopBootWordmark',
    'animation:',
    '.8s forwards'
  ]){
    if(!index.includes(marker)){
      fail(
        `R5 Desktop boot presentation is missing: ${marker}`
      );
    }
  }

  if(
    !index.includes(
      'href="./images/shared/home/HOME001/cover.webp"'
    )||
    !/href="\.\/images\/shared\/home\/HOME001\/cover\.webp"[\s\S]{0,160}media="\(max-width: 1023\.98px\)"/m
      .test(
        index
      )
  ){
    fail(
      'R5 Mobile Home hero preload must be restricted to the Mobile viewport.'
    );
  }

  for(const marker of [
    'if(desktopViewport){',
    "mode:'desktop-bypass'",
    'desktopBypass:true',
    'hasPreloaded(){',
    'return false;'
  ]){
    if(!startup.includes(marker)){
      fail(
        `R5 Desktop startup bypass is missing: ${marker}`
      );
    }
  }

  const bypassIndex=
    startup.indexOf(
      'if(desktopViewport){'
    );

  const legacyLoaderIndex=
    startup.indexOf(
      'function createLoader(){'
    );

  if(
    bypassIndex<0||
    legacyLoaderIndex<0||
    bypassIndex>legacyLoaderIndex
  ){
    fail(
      'Desktop startup bypass must occur before legacy Mobile loader creation logic.'
    );
  }

  if(
    !index.includes(
      `window.DREAMLAND_RELEASE='b7-00b4c-r1-v112';`
    )
  ){
    fail(
      'R5 release handshake is not active in index.html.'
    );
  }

  const sw=
    read(
      'sw.js'
    );

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v112';"
    )
  ){
    fail(
      'R5 requires dreamland-pwa-v112.'
    );
  }
}catch(error){
  fail(
    `R5 Desktop boot cleanup validation failed: ${error.message}`
  );
}


/* Gate 4C-R1 — editorial presentation successor. */
try{
  const renderer=read('src/ui/desktop/catalog/runtime-desktop-catalog.js');
  const css=read('src/ui/desktop/styles/catalog.css');
  for(const required of [
    "const PRESENTATION_VERSION='B7-00B.4C-R1';",
    'desktop-catalog-cover',
    'desktop-catalog-series__index',
    'desktop-catalog-series-section',
    'desktop-container--wide',
    'desktop-catalog-card__identity'
  ]){
    if(!renderer.includes(required)) fail('Desktop Catalog 4C R1 renderer is missing: '+required);
  }
  for(const required of [
    'B7-00B.4C R1 — Catalog Editorial Foundation + Product Grid Recomposition',
    '.desktop-catalog-series-section{',
    '.desktop-catalog-series-index{',
    'transform:scale(1.018)!important;',
    '-webkit-line-clamp:2;',
    'border-radius:6px!important;',
    '.desktop-catalog-cta > div{'
  ]){
    if(!css.includes(required)) fail('Desktop Catalog 4C R1 CSS is missing: '+required);
  }
}catch(error){
  fail('Desktop Catalog 4C R1 successor validation failed: '+error.message);
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
  'All 89 / 19 Advanced / 46 Masterpiece / 16 Holiday / 8 Classic / Search / Size / Sort / 24-item Load More / Desktop media / startup handoff / release convergence / Desktop boot cleanup / PWA v98 PASS.'
);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relativePath){
  return fs.readFileSync(
    path.join(
      ROOT,
      relativePath
    ),
    'utf8'
  );
}

function compact(source){
  return String(
    source||
    ''
  ).replace(
    /\s+/g,
    ''
  );
}

const rendererPath=
  path.join(
    ROOT,
    'src/ui/catalog/runtime-catalog-renderer.js'
  );

if(!fs.existsSync(rendererPath)){
  fail(
    'Catalog UI Renderer runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandCatalogRenderer;

    await import(
      `${pathToFileURL(rendererPath).href}?b602-catalog-ui=${Date.now()}`
    );

    const renderer=
      globalThis.DreamlandCatalogRenderer;

    if(
      !renderer||
      renderer.version!==
        'B6-02'
    ){
      fail(
        'DreamlandCatalogRenderer B6-02 runtime was not exposed.'
      );
    }else{
      for(const method of [
        'configure',
        'snapshot',
        'ready',
        'renderTabs',
        'render',
        'cancel',
        'maybeLoadMore',
        'ensureScrollable'
      ]){
        if(
          typeof renderer[method]!==
          'function'
        ){
          fail(
            `DreamlandCatalogRenderer.${method} is missing.`
          );
        }
      }

      function eventElement(){
        const listeners=
          new Map();

        return {
          innerHTML:'',
          className:'',
          scrollTop:0,
          scrollHeight:100,
          clientHeight:100,
          addEventListener(
            name,
            handler
          ){
            listeners.set(
              name,
              handler
            );
          },
          removeEventListener(
            name,
            handler
          ){
            if(
              listeners.get(name)===
              handler
            ){
              listeners.delete(
                name
              );
            }
          },
          listener(name){
            return listeners.get(
              name
            );
          },
          contains(){
            return true;
          }
        };
      }

      const tabs=
        eventElement();

      const seriesCount=
        eventElement();

      const left={
        html:'',
        insertAdjacentHTML(
          _position,
          html
        ){
          this.html+=html;
        }
      };

      const right={
        html:'',
        insertAdjacentHTML(
          _position,
          html
        ){
          this.html+=html;
        }
      };

      const grid={
        ...eventElement(),
        querySelector(selector){
          if(
            selector.includes(
              'left'
            )
          ){
            return left;
          }

          if(
            selector.includes(
              'right'
            )
          ){
            return right;
          }

          return null;
        }
      };

      const content=
        eventElement();

      const calls={
        series:[],
        detail:[],
        quick:[],
        batches:[]
      };

      renderer.configure({
        tabs,
        seriesCount,
        grid,
        content,
        batchSize:5,
        text:
          key=>({
            total:'Total',
            models:'models',
            discover:'Discover',
            dreams:'dreams'
          }[key]||key),
        language:
          ()=>'en',
        seriesLabel:
          key=>`Series:${key}`,
        seriesTabLabel:
          key=>`Tab:${key}`,
        productDisplayName:
          product=>product.name,
        productCover:
          product=>product.cover,
        fromPrice:
          value=>`USD ${value}`,
        catalogUnit:
          product=>product.price,
        htmlAttr:
          value=>String(value),
        afterAppendBatch:
          payload=>
            calls.batches
              .push(payload),
        actions:{
          selectSeries:
            series=>
              calls.series
                .push(series),
          openDetail:
            id=>
              calls.detail
                .push(id),
          quickAdd:
            id=>
              calls.quick
                .push(id)
        }
      });

      if(
        !renderer.ready()
      ){
        fail(
          'Configured Catalog UI Renderer must be ready.'
        );
      }

      const view={
        activeSeries:'advanced',
        availableSeries:[
          'advanced',
          'classic'
        ],
        displayCount:3,
        products:[
          {
            id:'P1',
            name:'One',
            cover:'./one.webp',
            color:'color-1',
            price:1
          },
          {
            id:'P2',
            name:'Two',
            cover:'./two.webp',
            color:'color-2',
            price:2
          },
          {
            id:'P3',
            name:'Three',
            cover:'./three.webp',
            color:'color-3',
            price:3
          }
        ]
      };

      renderer.renderTabs(
        view
      );

      if(
        !tabs.innerHTML.includes(
          'data-catalog-series="advanced"'
        )||
        !tabs.innerHTML.includes(
          'Tab:classic'
        )||
        tabs.className!==
          'tabs lang-en'
      ){
        fail(
          'Catalog tab rendering parity failed.'
        );
      }

      const renderResult=
        renderer.render(
          view
        );

      const renderedHtml=
        left.html+
        right.html;

      if(
        renderResult.displayCount!==3||
        !renderedHtml.includes(
          'data-catalog-action="open-detail"'
        )||
        !renderedHtml.includes(
          'data-catalog-action="quick-add"'
        )||
        !renderedHtml.includes(
          'data-responsive-source="./one.webp"'
        )||
        !renderedHtml.includes(
          'data-responsive-priority="high"'
        )||
        !renderedHtml.includes(
          'USD 1'
        )||
        calls.batches.length!==1
      ){
        fail(
          'Catalog card/batch rendering parity failed.'
        );
      }

      const tabClick=
        tabs.listener(
          'click'
        );

      tabClick?.({
        target:{
          closest(){
            return {
              dataset:{
                catalogSeries:
                  'classic'
              }
            };
          }
        }
      });

      const gridClick=
        grid.listener(
          'click'
        );

      gridClick?.({
        target:{
          closest(){
            return {
              dataset:{
                catalogAction:
                  'quick-add',
                productId:'P1'
              }
            };
          }
        }
      });

      gridClick?.({
        target:{
          closest(){
            return {
              dataset:{
                catalogAction:
                  'open-detail',
                productId:'P2'
              }
            };
          }
        }
      });

      if(
        calls.series.join(',')!==
          'classic'||
        calls.quick.join(',')!==
          'P1'||
        calls.detail.join(',')!==
          'P2'
      ){
        fail(
          'Catalog Renderer delegated action parity failed.'
        );
      }

      renderer.cancel();

      if(
        renderer.snapshot()
          .listCount!==0
      ){
        fail(
          'Catalog Renderer cancel/reset parity failed.'
        );
      }
    }
  }catch(error){
    fail(
      `Catalog UI Renderer execution failed: ${error.message}`
    );
  }
}

try{
  const rendererSource=
    read(
      'src/ui/catalog/runtime-catalog-renderer.js'
    );

  for(const forbidden of [
    'DreamlandInquiry',
    'DreamlandContact',
    'DreamlandSubmission',
    'DreamlandRisk',
    'DreamlandStorage',
    'DreamlandRuntimeHooks',
    'document.',
    'products.filter(',
    'seriesMeta['
  ]){
    if(
      rendererSource.includes(
        forbidden
      )
    ){
      fail(
        `Catalog UI Renderer crossed its B6-02 boundary: ${forbidden}`
      );
    }
  }

  if(
    /\bDreamlandCatalog\b/.test(
      rendererSource
    )
  ){
    fail(
      'Catalog UI Renderer must not depend on the DreamlandCatalog Feature runtime.'
    );
  }

  for(const required of [
    'data-catalog-series=',
    'data-catalog-action="open-detail"',
    'data-catalog-action="quick-add"',
    'data-responsive-source=',
    'data-responsive-priority=',
    'afterAppendBatch('
  ]){
    if(
      !rendererSource.includes(
        required
      )
    ){
      fail(
        `Catalog UI Renderer is missing required rendering behavior: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Catalog UI Renderer source inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read(
      'index.html'
    );

  const compactIndex=
    compact(
      indexSource
    );

  for(const marker of [
    '<script src="./src/ui/catalog/runtime-catalog-renderer.js"></script>',
    'const catalogRenderer=window.DreamlandCatalogRenderer',
    'catalogRenderer.configure(',
    'catalogRenderer.renderTabs(',
    'catalogRenderer.render(',
    'catalogRenderer.cancel(',
    "window.DreamlandRuntimeHooks?.emit('catalog.afterAppendBatch'"
  ]){
    if(
      !compactIndex.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `index.html is missing B6-02 Catalog Renderer integration: ${marker}`
      );
    }
  }

  for(const legacy of [
    'function renderProductCard(',
    'function appendCatalogBatch(',
    'function ensureCatalogHasScroll(',
    'function scheduleCatalogBatch(',
    'function maybeLoadMoreCatalog(',
    'function catalogContentEl(',
    'catalogRenderToken',
    'catalogBatchTimer',
    'catalogCursor',
    'catalogLoading',
    'CATALOG_BATCH_SIZE',
    "'catalog.renderProductCard'"
  ]){
    if(
      compactIndex.includes(
        compact(
          legacy
        )
      )
    ){
      fail(
        `index.html still directly owns B6-02 Catalog rendering: ${legacy}`
      );
    }
  }

  for(const preserved of [
    'function renderTabs(',
    'function renderProducts(',
    'function cancelCatalogRender(',
    'function openDetail(',
    'function quickAdd(',
    'catalogFeature.buildViewModel('
  ]){
    if(
      !compactIndex.includes(
        compact(
          preserved
        )
      )
    ){
      fail(
        `B6-02 must preserve the App/Catalog integration bridge: ${preserved}`
      );
    }
  }
}catch(error){
  fail(
    `index.html B6-02 Catalog Renderer inspection failed: ${error.message}`
  );
}

try{
  const variantsSource=
    read(
      'image-variants.js'
    );

  if(
    variantsSource.includes(
      "'catalog.renderProductCard'"
    )||
    variantsSource.includes(
      'function enhancedProductCard('
    )
  ){
    fail(
      'image-variants.js still owns the superseded Catalog card renderer.'
    );
  }

  for(const required of [
    'function mountResponsiveCatalog(',
    "'catalog.afterAppendBatch'",
    'function transformSharedAssetCandidates(',
    "'sharedAssets.transformCandidates'"
  ]){
    if(
      !variantsSource.includes(
        required
      )
    ){
      fail(
        `image-variants.js lost required media/shared-asset behavior: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `image-variants.js B6-02 inspection failed: ${error.message}`
  );
}

try{
  const uiContracts=
    (
      await import(
        pathToFileURL(
          path.join(
            ROOT,
            'src/ui/contracts.js'
          )
        ).href+
        `?b602-ui=${Date.now()}`
      )
    ).UI_CONTRACTS;

  const enabled=
    uiContracts
      .filter(
        item=>
          item.runtimeEnabled===true
      );

  const enabledIds=
    enabled
      .map(
        item=>item.id
      )
      .sort()
      .join(',');

  const catalog=
    enabled.find(
      item=>
        item.id===
        'catalog-renderer'
    );

  if(
    enabledIds!==
      'catalog-renderer,inquiry-renderer'||
    catalog?.migrationStatus!==
      'migrated'||
    catalog?.runtimeOwner!==
      'src/ui/catalog/runtime-catalog-renderer.js'
  ){
    fail(
      'B6-02 must runtime-enable the migrated Catalog UI Renderer alongside Inquiry UI Renderer.'
    );
  }
}catch(error){
  fail(
    `UI contract B6-02 inspection failed: ${error.message}`
  );
}

try{
  const foundation=
    (
      await import(
        pathToFileURL(
          path.join(
            ROOT,
            'src/app/foundation.js'
          )
        ).href+
        `?b602-foundation=${Date.now()}`
      )
    ).FRONTEND_FOUNDATION;

  if(
    foundation?.phase!==
      'B6-02'||
    foundation?.runtimeIntegrated!==
      true||
    foundation?.runtimeIntegration!==
      'partial'
  ){
    fail(
      'Frontend foundation must declare B6-02 partial runtime integration.'
    );
  }

  const catalogMigration=
    foundation?.legacyMap
      ?.find(
        item=>
          item.id==='catalog'
      );

  if(
    catalogMigration?.status!==
      'partial'||
    catalogMigration?.runtimeMigrated!==
      false||
    !catalogMigration
      ?.runtimeOwners
      ?.includes(
        'src/features/catalog/runtime-catalog.js'
      )||
    !catalogMigration
      ?.runtimeOwners
      ?.includes(
        'src/ui/catalog/runtime-catalog-renderer.js'
      )||
    !catalogMigration
      ?.runtimeOwners
      ?.includes(
        'index.html'
      )||
    !catalogMigration
      ?.runtimeOwners
      ?.includes(
        'catalog-data.js'
      )
  ){
    fail(
      'Legacy map does not describe the B6-02 Catalog Feature/UI ownership.'
    );
  }
}catch(error){
  fail(
    `Frontend foundation/legacy map B6-02 inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read(
      'sw.js'
    );

  if(
    !swSource.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v79';"
    )
  ){
    fail(
      'sw.js cache version must be dreamland-pwa-v79 for B6-02.'
    );
  }

  const rendererMatches=
    swSource.match(
      /'\.\/src\/ui\/catalog\/runtime-catalog-renderer\.js'/g
    )||[];

  if(
    rendererMatches.length!==1
  ){
    fail(
      `sw.js APP_SHELL must include runtime-catalog-renderer.js exactly once; found ${rendererMatches.length}.`
    );
  }
}catch(error){
  fail(
    `SW B6-02 inspection failed: ${error.message}`
  );
}

try{
  const packageJson=
    JSON.parse(
      read(
        'package.json'
      )
    );

  if(
    packageJson.scripts
      ?.['catalog-ui:boundary']!==
      'node scripts/validate-catalog-ui-renderer-boundary.mjs'
  ){
    fail(
      'package.json is missing catalog-ui:boundary.'
    );
  }

  if(
    !String(
      packageJson.scripts
        ?.validate||
      ''
    ).includes(
      'npm run catalog-ui:boundary'
    )
  ){
    fail(
      'npm run validate must include the B6-02 Catalog UI validator.'
    );
  }
}catch(error){
  fail(
    `package.json B6-02 inspection failed: ${error.message}`
  );
}

try{
  const b601=
    read(
      'scripts/validate-catalog-state-view-model-boundary.mjs'
    );

  for(const released of [
    "foundation?.phase!=='B6-01'",
    "dreamland-pwa-v78",
    'function renderProductCard(',
    'function appendCatalogBatch(',
    'function scheduleCatalogBatch(',
    'function ensureCatalogHasScroll(',
    'catalogRenderToken',
    'catalogBatchTimer',
    'catalogCursor',
    'catalogLoading',
    'catalogFeature.activeSeries(',
    'catalogFeature.availableSeries('
  ]){
    if(
      compact(
        b601
      ).includes(
        compact(
          released
        )
      )
    ){
      fail(
        `Historical B6-01 validator still locks B6-02 ownership: ${released}`
      );
    }
  }

  const b301=
    read(
      'scripts/validate-media-hook-cleanup.mjs'
    );

  if(
    b301.includes(
      "hooks.register(\n      'catalog.renderProductCard'"
    )||
    !b301.includes(
      'image-variants.js must not reclaim the migrated Catalog card renderer.'
    )
  ){
    fail(
      'Historical B3-01 validator has not released the superseded Catalog card-renderer hook contract.'
    );
  }
}catch(error){
  fail(
    `Historical-validator B6-02 inspection failed: ${error.message}`
  );
}

const b504=
  read(
    'scripts/validate-inquiry-ui-renderer-boundary.mjs'
  );

if(
  b504.includes(
    'enabled.length!==1'
  )||
  b504.includes(
    'only runtime-enabled UI contract'
  )
){
  fail(
    'Historical B5-04 Inquiry UI validator still locks the UI layer to a single runtime-enabled contract.'
  );
}

if(errors.length){
  console.error(
    '\nCatalog UI Renderer boundary validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Catalog UI Renderer boundary validation: PASS'
);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(
  message
){
  errors.push(
    message
  );
}

function read(
  relative
){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

function compact(
  value
){
  return String(
    value||''
  ).replace(
    /\s+/g,
    ''
  );
}

const runtimePath=
  path.join(
    ROOT,
    'src/features/custom/runtime-custom.js'
  );

if(
  !fs.existsSync(
    runtimePath
  )
){
  fail(
    'Custom Feature runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandCustom;

    await import(
      `${pathToFileURL(runtimePath).href}?b605=${Date.now()}`
    );

    const custom=
      globalThis.DreamlandCustom;

    if(
      !custom||
      custom.version!=='B6-05'
    ){
      fail(
        'DreamlandCustom B6-05 runtime was not exposed.'
      );
    }else{
      for(
        const method of [
          'configure',
          'snapshot',
          'ready',
          'reset',
          'availableSeries',
          'availableScents',
          'selectedSeries',
          'selectedScents',
          'selection',
          'setSeries',
          'toggleScent',
          'validateDraft',
          'buildIntent'
        ]
      ){
        if(
          typeof custom[method]!==
            'function'
        ){
          fail(
            `DreamlandCustom.${method} is missing.`
          );
        }
      }

      const scentsBySeries=
        new Map([
          [
            'classic',
            [
              {
                id:'C0',
                status:'active',
                name:{
                  zh:'无香',
                  en:'Unscented'
                }
              },
              {
                id:'C1',
                status:'active',
                name:{
                  zh:'白茶',
                  en:'White Tea'
                }
              },
              {
                id:'CH',
                status:'hidden',
                name:{
                  zh:'隐藏香型',
                  en:'Hidden'
                }
              }
            ]
          ],
          [
            'advanced',
            [
              {
                id:'A1',
                status:'active',
                name:{
                  zh:'海盐',
                  en:'Sea Salt'
                }
              }
            ]
          ],
          [
            'masterpiece',
            []
          ]
        ]);

      custom.configure({
        scentsBySeries,
        seriesOrder:[
          'classic',
          'advanced',
          'masterpiece'
        ],
        defaultSeries:'classic',
        customMoq:()=>50,
        maximumQuantity:()=>1000
      });

      if(
        !custom.ready()||
        custom.selectedSeries()!==
          'classic'||
        custom.availableScents(
          'classic'
        )
          .map(
            scent=>scent.id
          )
          .join(',')!==
          'C1'||
        custom.availableSeries()
          .join(',')!==
          'classic,advanced'
      ){
        fail(
          'Custom series/scent availability parity failed.'
        );
      }

      if(
        custom.toggleScent(
          'C0'
        )!==false||
        custom.toggleScent(
          'C1'
        )!==true||
        custom.selection()
          .scentIds
          .join(',')!==
          'C1'
      ){
        fail(
          'Custom scent-selection parity failed.'
        );
      }

      const valid=
        custom.validateDraft({
          use:'品牌活动',
          qty:120,
          budget:'待确认',
          date:'30天',
          sizePref:'待推荐',
          color:'绿色',
          pack:'精品包装',
          branding:'需要 Logo',
          note:'note'
        });

      if(
        valid.valid!==true||
        valid.minimumQuantity!==50||
        valid.maximumQuantity!==1000||
        valid.quantity!==120
      ){
        fail(
          'Custom draft validation parity failed.'
        );
      }

      const built=
        custom.buildIntent(
          {
            use:'品牌活动',
            qty:120,
            budget:'待确认',
            date:'30天',
            sizePref:'待推荐',
            color:'绿色',
            pack:'精品包装',
            branding:'需要 Logo',
            note:'note'
          },
          {
            id:'CUSTOM-1'
          }
        );

      if(
        built?.type!=='custom'||
        built?.id!=='CUSTOM-1'||
        built?.scentSeries!==
          'classic'||
        built?.scentIds
          ?.join(',')!==
          'C1'||
        built?.scents
          ?.join(',')!==
          '白茶'||
        built?.scent!=='白茶'||
        built?.moq!==50
      ){
        fail(
          'Custom intent construction parity failed.'
        );
      }

      custom.setSeries(
        'advanced'
      );

      if(
        custom.selectedScents()
          .length!==0||
        custom.toggleScent(
          'A1'
        )!==true
      ){
        fail(
          'Custom series change must clear the prior scent selection.'
        );
      }

      const missingUse=
        custom.validateDraft({
          use:'',
          qty:100
        });

      if(
        !missingUse.errors.includes(
          'use'
        )
      ){
        fail(
          'Custom use-required validation is missing.'
        );
      }

      custom.reset();

      const missingScents=
        custom.validateDraft({
          use:'其他用途',
          qty:100
        });

      if(
        !missingScents.errors.includes(
          'scents'
        )
      ){
        fail(
          'Custom scent-required validation is missing.'
        );
      }

      custom.toggleScent(
        'C1'
      );

      const below=
        custom.validateDraft({
          use:'其他用途',
          qty:49
        });

      const above=
        custom.validateDraft({
          use:'其他用途',
          qty:1001
        });

      if(
        !below.errors.includes(
          'quantity-min'
        )||
        !above.errors.includes(
          'quantity-max'
        )
      ){
        fail(
          'Custom quantity-boundary validation is incomplete.'
        );
      }
    }
  }catch(error){
    fail(
      `Custom Feature runtime execution failed: ${error.message}`
    );
  }
}

try{
  const source=
    read(
      'src/features/custom/runtime-custom.js'
    );

  for(
    const forbidden of [
      'document.',
      'querySelector(',
      'innerHTML',
      'DreamlandInquiry',
      'DreamlandSubmission',
      'DreamlandRisk',
      'DreamlandStorage',
      'localStorage',
      'sessionStorage'
    ]
  ){
    if(
      source.includes(
        forbidden
      )
    ){
      fail(
        `Custom Feature crossed its business boundary: ${forbidden}`
      );
    }
  }
}catch(error){
  fail(
    `Custom Feature source inspection failed: ${error.message}`
  );
}

try{
  const adapter=
    read(
      'custom-scent-multi.js'
    );

  for(
    const forbidden of [
      'state.items',
      'state.contact',
      'selectedScentIds=new Set',
      'let selectedSeries=',
      'function installHooks(',
      'addCustomIntent=function',
      'renderPreview=function',
      'renderItem=function',
      'itemText=function',
      'applyI18n=function',
      'go=function',
      'itemScentLabel=function',
      'clearSubmittedInquiry=function'
    ]
  ){
    if(
      compact(adapter).includes(
        compact(forbidden)
      )
    ){
      fail(
        `custom-scent-multi.js still owns legacy business/orchestration behavior: ${forbidden}`
      );
    }
  }

  for(
    const required of [
      'options.feature',
      'feature.availableSeries(',
      'feature.availableScents(',
      'feature.selectedSeries(',
      'feature.selectedScents(',
      'feature.setSeries(',
      'feature.toggleScent(',
      'customScentLabel'
    ]
  ){
    if(
      !compact(adapter).includes(
        compact(required)
      )
    ){
      fail(
        `Custom scent UI adapter is missing Feature routing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Custom scent adapter inspection failed: ${error.message}`
  );
}

try{
  const index=
    read(
      'index.html'
    );
  const source=
    compact(index);

  for(
    const required of [
      '<script src="./src/features/custom/runtime-custom.js"></script>',
      '<script src="./custom-scent-multi.js"></script>',
      'const customFeature=window.DreamlandCustom',
      'const customScentUi=window.DreamlandCustomScent',
      'function ensureCustomRequestRuntime(',
      'customFeature.configure(',
      'customScentUi.configure(',
      'function customDraftFromFields(',
      'customFeature.validateDraft(',
      'customFeature.buildIntent(',
      'inquiryFeature.addCustom(',
      'customScentUi.customScentLabel(',
      "if(n==='custom')",
      'customScentUi.render('
    ]
  ){
    if(
      !source.includes(
        compact(required)
      )
    ){
      fail(
        `index.html is missing B6-05 Custom integration: ${required}`
      );
    }
  }

  if(
    source.includes(
      compact(
        'state.items.push('
      )
    )
  ){
    fail(
      'index.html must not directly mutate Inquiry item state.'
    );
  }

  for(
    const lifecycleMarker of [
      "if(activeScreen==='custom')",
      'ensureCustomRequestRuntime()',
      'customScentUi.render()'
    ]
  ){
    const rerenderStart=
      index.indexOf(
        'function rerenderCurrent('
      );

    const rerenderEnd=
      index.indexOf(
        'function ui(',
        rerenderStart
      );

    const rerenderSlice=
      rerenderStart>=0&&
      rerenderEnd>rerenderStart
        ? compact(
            index.slice(
              rerenderStart,
              rerenderEnd
            )
          )
        : '';

    if(
      !rerenderSlice.includes(
        compact(
          lifecycleMarker
        )
      )
    ){
      fail(
        `Custom language rerender lifecycle is missing: ${lifecycleMarker}`
      );
    }
  }

  const customRuntimeCount=
    (
      index.match(
        /<script src="\.\/src\/features\/custom\/runtime-custom\.js"><\/script>/g
      )||[]
    ).length;

  const adapterCount=
    (
      index.match(
        /<script src="\.\/custom-scent-multi\.js"><\/script>/g
      )||[]
    ).length;

  if(
    customRuntimeCount!==1||
    adapterCount!==1
  ){
    fail(
      `index.html must load Custom runtime/adapter exactly once; runtime=${customRuntimeCount}, adapter=${adapterCount}.`
    );
  }
}catch(error){
  fail(
    `index.html B6-05 inspection failed: ${error.message}`
  );
}

try{
  const renderer=
    read(
      'src/ui/inquiry/runtime-inquiry-renderer.js'
    );

  const start=
    renderer.indexOf(
      'function renderCustomItem('
    );
  const end=
    renderer.indexOf(
      'function renderProductItem(',
      start
    );
  const customSlice=
    start>=0&&end>start
      ? renderer.slice(
          start,
          end
        )
      : '';

  if(
    !customSlice.includes(
      'itemScentLabel(item)'
    )||
    customSlice.includes(
      'choiceLabel(item.scent)'
    )
  ){
    fail(
      'Inquiry Renderer custom rows must consume the injected itemScentLabel adapter.'
    );
  }
}catch(error){
  fail(
    `Inquiry Renderer custom presentation inspection failed: ${error.message}`
  );
}

try{
  const manifest=
    (
      await import(
        pathToFileURL(
          path.join(
            ROOT,
            'src/features/manifest.js'
          )
        ).href+
        `?b605-manifest=${Date.now()}`
      )
    ).FEATURE_MANIFEST;

  const custom=
    manifest.find(
      item=>
        item.id==='custom'
    );

  const enabledIds=
    manifest
      .filter(
        item=>
          item.runtimeEnabled===true
      )
      .map(
        item=>item.id
      )
      .sort()
      .join(',');

  if(
    enabledIds!==
      'catalog,contact,custom,detail,inquiry'||
    custom?.status!=='partial'||
    custom?.runtimeEnabled!==true||
    custom?.runtimeOwner!==
      'src/features/custom/runtime-custom.js'
  ){
    fail(
      'Feature manifest does not declare the B6-05 Custom runtime boundary.'
    );
  }
}catch(error){
  fail(
    `Feature manifest B6-05 inspection failed: ${error.message}`
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
        `?b605-foundation=${Date.now()}`
      )
    ).FRONTEND_FOUNDATION;

  const customMigration=
    foundation?.legacyMap
      ?.find(
        item=>
          item.id===
            'custom-request'
      );

  if(
    foundation?.phase!==
      'B6-05'||
    foundation?.runtimeIntegrated!==
      true||
    foundation?.runtimeIntegration!==
      'partial'||
    customMigration?.status!==
      'partial'||
    customMigration?.runtimeMigrated!==
      false||
    !customMigration
      ?.runtimeOwners
      ?.includes(
        'src/features/custom/runtime-custom.js'
      )||
    !customMigration
      ?.runtimeOwners
      ?.includes(
        'index.html'
      )||
    !customMigration
      ?.runtimeOwners
      ?.includes(
        'custom-scent-multi.js'
      )
  ){
    fail(
      'Foundation/Legacy Map does not describe the B6-05 Custom boundary.'
    );
  }
}catch(error){
  fail(
    `Foundation/Legacy Map B6-05 inspection failed: ${error.message}`
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v83';"
    )
  ){
    fail(
      'sw.js cache version must be dreamland-pwa-v83 for B6-05.'
    );
  }

  const runtimeMatches=
    sw.match(
      /'\.\/src\/features\/custom\/runtime-custom\.js'/g
    )||[];

  const adapterMatches=
    sw.match(
      /'\.\/custom-scent-multi\.js'/g
    )||[];

  if(
    runtimeMatches.length!==1||
    adapterMatches.length!==1
  ){
    fail(
      `SW APP_SHELL must include Custom runtime/adapter exactly once; runtime=${runtimeMatches.length}, adapter=${adapterMatches.length}.`
    );
  }
}catch(error){
  fail(
    `SW B6-05 inspection failed: ${error.message}`
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
      ?.['custom-request:boundary']!==
      'node scripts/validate-custom-request-feature-boundary.mjs'||
    !String(
      packageJson.scripts
        ?.validate||
      ''
    ).includes(
      'npm run custom-request:boundary'
    )
  ){
    fail(
      'package.json is missing the B6-05 Custom boundary validator.'
    );
  }
}catch(error){
  fail(
    `package.json B6-05 inspection failed: ${error.message}`
  );
}

try{
  const detailStateValidator=
    compact(
      read(
        'scripts/validate-detail-state-configuration-boundary.mjs'
      )
    );

  if(
    detailStateValidator.includes(
      compact(
        "enabledIds!=='catalog,contact,detail,inquiry'"
      )
    )
  ){
    fail(
      'Historical B6-03 validator still locks the pre-Custom Feature set.'
    );
  }

  const detailValidator=
    compact(
      read(
        'scripts/validate-detail-ui-renderer-boundary.mjs'
      )
    );

  if(
    detailValidator.includes(
      compact(
        "foundation?.phase!=='B6-04'"
      )
    )
  ){
    fail(
      'Historical B6-04 validator still locks the frontend foundation phase.'
    );
  }

  const productValidator=
    read(
      'scripts/validate-product-data-alignment.mjs'
    );

  if(
    productValidator.includes(
      'dreamland-pwa-v82'
    )
  ){
    fail(
      'Historical B6-04.1 validator still owns the fixed v82 SW cache version.'
    );
  }
}catch(error){
  fail(
    `Historical-validator B6-05 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nCustom Request Feature boundary validation failed:\n'
  );

  for(
    const error of errors
  ){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Custom Request Feature boundary validation: PASS'
);

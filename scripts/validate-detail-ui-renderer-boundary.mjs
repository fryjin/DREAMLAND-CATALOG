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
    'src/ui/detail/runtime-detail-renderer.js'
  );

if(!fs.existsSync(rendererPath)){
  fail(
    'Detail UI Renderer runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandDetailRenderer;

    await import(
      `${pathToFileURL(rendererPath).href}?b604-detail-ui=${Date.now()}`
    );

    const renderer=
      globalThis.DreamlandDetailRenderer;

    if(
      !renderer||
      renderer.version!==
        'B6-04'
    ){
      fail(
        'DreamlandDetailRenderer B6-04 runtime was not exposed.'
      );
    }else{
      for(const method of [
        'configure',
        'snapshot',
        'ready',
        'render',
        'captureScrollState'
      ]){
        if(
          typeof renderer[method]!==
            'function'
        ){
          fail(
            `DreamlandDetailRenderer.${method} is missing.`
          );
        }
      }

      const listeners=
        new Map();

      const card={
        innerHTML:'',
        addEventListener(
          type,
          callback
        ){
          listeners.set(
            type,
            callback
          );
        },
        removeEventListener(){},
        querySelectorAll(){
          return [];
        },
        querySelector(){
          return null;
        },
        contains(){
          return true;
        }
      };

      const calls=[];

      renderer.configure({
        configCard:card,
        text:key=>key,
        language:()=>'zh',
        choiceLabel:value=>value,
        seriesLabel:value=>value,
        scentDisplayText:
          value=>
            value?.en||
            '',
        sizeDimensions:
          size=>
            `${size}-dims`,
        previewData:
          (
            key,
            view
          )=>(
            key==='pattern'
              ? {
                  category:'pattern',
                  lookupKey:
                    view.config.pattern,
                  size:
                    view.config.size,
                  fallback:'fallback.jpg',
                  label:'Pattern'
                }
              : null
          ),
        currentPackNotice:
          view=>
            `pack:${view.config.pack}`,
        money:
          value=>
            `$${value}`,
        qtyUnit:()=>'pcs',
        htmlAttr:
          value=>
            String(
              value??
              ''
            ),
        afterRender:
          payload=>{
            calls.push(
              payload
            );
          },
        actions:{
          selectOption(){},
          selectScent(){},
          setQuantity(){},
          adjustQuantity(){},
          openTier(){},
          openScentNotes(){},
          openPreview(){}
        }
      });

      if(!renderer.ready()){
        fail(
          'Configured Detail Renderer must report ready.'
        );
      }

      renderer.render({
        empty:false,
        product:{
          id:'P1'
        },
        config:{
          size:'M',
          scentSeries:'classic',
          scentId:'S1',
          scent:'Rose',
          pattern:'P2',
          pack:'批发包装',
          qty:12
        },
        options:{
          sizes:[
            'S',
            'M',
            'L',
            'XL'
          ],
          scentSeries:[
            'classic',
            'premium'
          ],
          scents:[
            {
              id:'S1',
              name:{
                en:'Rose'
              }
            },
            {
              id:'S2',
              name:{
                en:'Wood'
              }
            }
          ],
          patterns:[
            'P1',
            'P2'
          ],
          packs:[
            '批发包装',
            '精品包装'
          ]
        },
        pricing:{
          moq:10,
          unitPrice:12.5
        },
        limits:{
          qtyMin:1,
          qtyStep:1,
          qtyMax:100
        }
      });

      for(const marker of [
        'data-detail-action="select-option"',
        'data-detail-action="select-scent"',
        'data-detail-action="adjust-quantity"',
        'data-detail-action="open-tier"',
        'data-detail-action="open-scent-notes"',
        'data-detail-action="open-preview"',
        'data-detail-quantity="1"',
        'data-config-key="size"',
        'data-config-key="scent"',
        'data-config-key="pattern"',
        'data-config-key="pack"'
      ]){
        if(
          !card.innerHTML.includes(
            marker
          )
        ){
          fail(
            `Detail Renderer output is missing: ${marker}`
          );
        }
      }

      if(
        renderer.captureScrollState()
          .length!==0
      ){
        fail(
          'Synthetic Detail Renderer scroll snapshot must be empty.'
        );
      }

      if(
        !listeners.has('click')||
        !listeners.has('change')||
        !listeners.has('wheel')
      ){
        fail(
          'Detail Renderer did not bind delegated Detail UI events.'
        );
      }
    }
  }catch(error){
    fail(
      `Detail Renderer runtime execution failed: ${error.message}`
    );
  }
}

try{
  const source=
    read(
      'src/ui/detail/runtime-detail-renderer.js'
    );

  for(const forbidden of [
    'document.',
    'DreamlandCatalog',
    'DreamlandInquiry',
    'DreamlandContact',
    'DreamlandSubmission',
    'DreamlandRisk',
    'DreamlandMedia',
    'DreamlandRuntimeHooks',
    'localStorage',
    'sessionStorage'
  ]){
    if(
      source.includes(
        forbidden
      )
    ){
      fail(
        `Detail Renderer crossed its UI boundary: ${forbidden}`
      );
    }
  }

  if(
    /\bDreamlandDetail\b/.test(
      source
    )
  ){
    fail(
      'Detail Renderer must consume an injected ViewModel/actions instead of DreamlandDetail directly.'
    );
  }

  for(const required of [
    'data-detail-action',
    'data-detail-quantity',
    'captureScrollState',
    'restoreScrollState',
    'centerSelectedOption',
    'scrollActiveOptionsIntoView'
  ]){
    if(
      !source.includes(
        required
      )
    ){
      fail(
        `Detail Renderer is missing UI ownership marker: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Detail Renderer source inspection failed: ${error.message}`
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
    '<script src="./src/ui/detail/runtime-detail-renderer.js"></script>',
    'const detailRenderer=window.DreamlandDetailRenderer',
    'detailRenderer.configure(',
    'detailRenderer.render(',
    'detailRenderer.captureScrollState(',
    'function renderDetail(',
    'function setCfg(',
    'function setScent(',
    'function setDetailQty(',
    'function changeDetailQty('
  ]){
    if(
      !compactIndex.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `index.html is missing B6-04 Detail Renderer integration: ${marker}`
      );
    }
  }

  for(const legacy of [
    'function block(',
    'function scentBlock(',
    'function bindHorizontalOptions(',
    'function restoreDetailOptionScrollState(',
    'function scrollActiveOptionsIntoView(',
    'function centerSelectedOption(',
    'function optionPreview(',
    'function scentInfo(',
    'function scentTipText('
  ]){
    if(
      compactIndex.includes(
        compact(
          legacy
        )
      )
    ){
      fail(
        `index.html still owns migrated Detail configuration rendering: ${legacy}`
      );
    }
  }

  for(const preserved of [
    'function renderDetailMedia(',
    'function setDetailSlide(',
    'function startDetailCarousel(',
    'function bindDetailSwipe(',
    "'detail.renderMedia'",
    "'detail.startCarousel'",
    "'detail.afterSlideUpdate'",
    'function openScentNotes(',
    'function openSharedPreviewFromButton('
  ]){
    if(
      !compactIndex.includes(
        compact(
          preserved
        )
      )
    ){
      fail(
        `B6-04 must preserve Detail media/modal ownership: ${preserved}`
      );
    }
  }
}catch(error){
  fail(
    `index.html B6-04 inspection failed: ${error.message}`
  );
}

try{
  const previewSource=
    read(
      'pattern-preview-swipe.js'
    );

  for(const forbidden of [
    'config.pack=normalizePackagingValue(',
    'config[state.configKey]=item.value'
  ]){
    if(
      compact(
        previewSource
      ).includes(
        compact(
          forbidden
        )
      )
    ){
      fail(
        `pattern-preview-swipe.js still mutates the frozen Detail compatibility snapshot: ${forbidden}`
      );
    }
  }

  for(const required of [
    'window.DreamlandDetail',
    '.setOption(',
    '.getConfig',
    '.product'
  ]){
    if(
      !previewSource.includes(
        required
      )
    ){
      fail(
        `pattern-preview-swipe.js is missing Detail Feature compatibility routing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `pattern-preview-swipe.js B6-04 inspection failed: ${error.message}`
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
        `?b604-ui=${Date.now()}`
      )
    ).UI_CONTRACTS;

  const enabledIds=
    uiContracts
      .filter(
        item=>
          item.runtimeEnabled===true
      )
      .map(
        item=>item.id
      )
      .sort()
      .join(',');

  const detail=
    uiContracts.find(
      item=>
        item.id===
          'detail-renderer'
    );

  if(
    enabledIds!==
      'catalog-renderer,detail-renderer,inquiry-renderer'||
    detail?.migrationStatus!==
      'migrated'||
    detail?.runtimeOwner!==
      'src/ui/detail/runtime-detail-renderer.js'
  ){
    fail(
      'B6-04 must runtime-enable the migrated Detail Renderer alongside Catalog and Inquiry Renderers.'
    );
  }
}catch(error){
  fail(
    `UI contracts B6-04 inspection failed: ${error.message}`
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
        `?b604-foundation=${Date.now()}`
      )
    ).FRONTEND_FOUNDATION;

  if(
    foundation?.runtimeIntegrated!==
      true||
    foundation?.runtimeIntegration!==
      'partial'
  ){
    fail(
      'Frontend foundation must declare B6-04 partial runtime integration.'
    );
  }

  const detailMigration=
    foundation?.legacyMap
      ?.find(
        item=>
          item.id===
            'detail'
      );

  if(
    detailMigration?.status!==
      'partial'||
    !detailMigration
      ?.runtimeOwners
      ?.includes(
        'src/features/detail/runtime-detail.js'
      )||
    !detailMigration
      ?.runtimeOwners
      ?.includes(
        'src/ui/detail/runtime-detail-renderer.js'
      )||
    !detailMigration
      ?.runtimeOwners
      ?.includes(
        'index.html'
      )||
    !detailMigration
      ?.runtimeOwners
      ?.includes(
        'detail-progressive.js'
      )||
    !detailMigration
      ?.runtimeOwners
      ?.includes(
        'pattern-preview-swipe.js'
      )
  ){
    fail(
      'Legacy map does not describe B6-04 Detail Feature/UI/media ownership.'
    );
  }
}catch(error){
  fail(
    `Foundation/Legacy Map B6-04 inspection failed: ${error.message}`
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  const matches=
    sw.match(
      /'\.\/src\/ui\/detail\/runtime-detail-renderer\.js'/g
    )||[];

  if(
    matches.length!==1
  ){
    fail(
      `sw.js APP_SHELL must include runtime-detail-renderer.js exactly once; found ${matches.length}.`
    );
  }
}catch(error){
  fail(
    `SW B6-04 inspection failed: ${error.message}`
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
      ?.['detail-ui:boundary']!==
      'node scripts/validate-detail-ui-renderer-boundary.mjs'
  ){
    fail(
      'package.json is missing detail-ui:boundary.'
    );
  }

  if(
    !String(
      packageJson.scripts
        ?.validate||
      ''
    ).includes(
      'npm run detail-ui:boundary'
    )
  ){
    fail(
      'npm run validate must include the B6-04 Detail UI validator.'
    );
  }
}catch(error){
  fail(
    `package.json B6-04 inspection failed: ${error.message}`
  );
}

try{
  const b603=
    read(
      'scripts/validate-detail-state-configuration-boundary.mjs'
    );

  for(const released of [
    "foundation?.phase!=='B6-03'",
    'dreamland-pwa-v80',
    'function block(',
    'function scentBlock('
  ]){
    if(
      compact(
        b603
      ).includes(
        compact(
          released
        )
      )
    ){
      fail(
        `Historical B6-03 validator still locks B6-04 ownership: ${released}`
      );
    }
  }

  const b602=
    read(
      'scripts/validate-catalog-ui-renderer-boundary.mjs'
    );

  if(
    compact(
      b602
    ).includes(
      compact(
        "enabledIds!=='catalog-renderer,inquiry-renderer'"
      )
    )
  ){
    fail(
      'Historical B6-02 validator still locks the UI runtime set before Detail Renderer.'
    );
  }
}catch(error){
  fail(
    `Historical-validator B6-04 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nDetail UI Renderer boundary validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Detail UI Renderer boundary validation: PASS'
);

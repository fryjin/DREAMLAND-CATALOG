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
  return String(source||'')
    .replace(
      /\s+/g,
      ''
    );
}

function sliceBetween(
  source,
  startMarker,
  endMarker
){
  const start=
    source.indexOf(
      startMarker
    );

  if(start<0){
    return '';
  }

  const end=
    source.indexOf(
      endMarker,
      start+
        startMarker.length
    );

  return end<0
    ? source.slice(start)
    : source.slice(
        start,
        end
      );
}

const rendererPath=
  path.join(
    ROOT,
    'src/ui/inquiry/runtime-inquiry-renderer.js'
  );

if(!fs.existsSync(rendererPath)){
  fail(
    'Inquiry UI Renderer runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandInquiryRenderer;

    await import(
      `${pathToFileURL(rendererPath).href}?ui-renderer-validation=${Date.now()}`
    );

    const renderer=
      globalThis.DreamlandInquiryRenderer;

    if(!renderer){
      fail(
        'runtime-inquiry-renderer.js did not expose DreamlandInquiryRenderer.'
      );
    }else{
      if(
        renderer.version!==
        'B5-04'
      ){
        fail(
          `Unexpected Inquiry UI Renderer version: ${renderer.version}`
        );
      }

      for(const method of [
        'configure',
        'snapshot',
        'ready',
        'render',
        'update'
      ]){
        if(
          typeof renderer[method]!==
          'function'
        ){
          fail(
            `DreamlandInquiryRenderer.${method} is missing.`
          );
        }
      }

      class FakeElement{
        constructor(){
          this.innerHTML='';
          this.listeners=
            new Map();
          this.queryMap=
            new Map();
          this.queryAllMap=
            new Map();
          this.dataset={};
          this.textContent='';
          this.value='';
        }

        addEventListener(
          type,
          handler
        ){
          this.listeners.set(
            type,
            handler
          );
        }

        removeEventListener(
          type,
          handler
        ){
          if(
            this.listeners.get(type)===
            handler
          ){
            this.listeners.delete(
              type
            );
          }
        }

        contains(){
          return true;
        }

        querySelector(
          selector
        ){
          return (
            this.queryMap.get(
              selector
            )||
            null
          );
        }

        querySelectorAll(
          selector
        ){
          return (
            this.queryAllMap.get(
              selector
            )||
            []
          );
        }
      }

      const list=
        new FakeElement();

      const summary=
        new FakeElement();

      const actionCalls=[];

      renderer.configure({
        list,
        summary,
        text:
          key=>`t:${key}`,
        seriesLabel:
          key=>`series:${key}`,
        choiceLabel:
          value=>`choice:${value}`,
        qtyUnit:
          ()=>'pcs',
        htmlAttr:
          value=>
            String(value??'')
              .replace(/&/g,'&amp;')
              .replace(/"/g,'&quot;'),
        money:
          value=>
            `USD ${Number(value).toFixed(2)}`,
        currencyUnit:
          ()=>'/pc',
        itemScentLabel:
          item=>`scent:${item.scent||''}`,
        productDisplayName:
          item=>`product:${item.id}`,
        maximumQuantity:
          ()=>999,
        quantityMin:1,
        quantityStep:1,
        actions:{
          go:
            screen=>
              actionCalls.push(
                ['go',screen]
              ),
          removeItem:
            id=>
              actionCalls.push(
                ['delete',id]
              ),
          adjustQuantity:
            (
              id,
              delta
            )=>
              actionCalls.push(
                [
                  'adjust',
                  id,
                  delta
                ]
              ),
          setQuantity:
            (
              id,
              value
            )=>
              actionCalls.push(
                [
                  'set',
                  id,
                  value
                ]
              ),
          editItem:
            id=>
              actionCalls.push(
                ['edit',id]
              ),
          openTier:
            id=>
              actionCalls.push(
                ['tier',id]
              )
        }
      });

      if(
        renderer.ready()!==true||
        renderer.snapshot().bound!==
        true
      ){
        fail(
          'Configured Inquiry UI Renderer must be ready and event-bound.'
        );
      }

      for(const eventName of [
        'click',
        'change',
        'keydown'
      ]){
        if(
          typeof list.listeners.get(
            eventName
          )!==
          'function'
        ){
          fail(
            `Inquiry UI Renderer event delegation is missing ${eventName}.`
          );
        }
      }

      const product={
        id:'p1',
        type:'product',
        series:'classic',
        size:'M',
        scent:'rose',
        pattern:'P1',
        pack:'批发包装',
        qty:20,
        normalizedQty:20,
        unitPrice:5,
        subtotal:100,
        cover:'./cover.webp',
        color:'color-1'
      };

      const custom={
        id:'c1',
        type:'custom',
        use:'品牌活动',
        qty:80,
        sizePref:'待推荐',
        scent:'花香调',
        color:'红色',
        pack:'待推荐',
        budget:'待确认',
        unitPrice:0,
        subtotal:0
      };

      const viewModel={
        empty:false,
        items:[
          product,
          custom
        ],
        groups:[
          {
            key:'classic',
            type:'product',
            itemCount:1,
            quantity:20,
            items:[
              product
            ]
          },
          {
            key:'custom',
            type:'custom',
            itemCount:1,
            quantity:0,
            items:[
              custom
            ]
          }
        ],
        summary:{
          itemCount:2,
          productCount:1,
          customCount:1,
          productQuantity:20,
          estimatedTotal:100
        }
      };

      const result=
        renderer.render(
          viewModel
        );

      if(
        result.empty!==false||
        result.itemCount!==2
      ){
        fail(
          'Inquiry UI Renderer render() result contract is incorrect.'
        );
      }

      for(const marker of [
        'class="group-title"',
        'class="swipe-shell"',
        'class="price-unit"',
        'class="price-total"',
        'data-inquiry-action="delete"',
        'data-inquiry-action="adjust-quantity"',
        'data-inquiry-qty-input',
        'data-inquiry-action="edit-item"',
        'data-inquiry-action="open-tier"'
      ]){
        if(
          !list.innerHTML.includes(
            marker
          )
        ){
          fail(
            `Inquiry UI Renderer output is missing: ${marker}`
          );
        }
      }

      if(
        list.innerHTML.includes(
          'onclick="del('
        )||
        list.innerHTML.includes(
          'onclick="openEditProductItem('
        )||
        list.innerHTML.includes(
          'onclick="openItemTierSheet('
        )||
        list.innerHTML.includes(
          'onchange="setItemQty('
        )
      ){
        fail(
          'Inquiry item actions must be delegated by the UI Renderer, not inline legacy handlers.'
        );
      }

      if(
        !summary.innerHTML.includes(
          'id="inquiryItemCount"'
        )||
        !summary.innerHTML.includes(
          'id="inquiryEstimateTotal"'
        )
      ){
        fail(
          'Inquiry summary DOM contract is incomplete.'
        );
      }

      const emptyResult=
        renderer.render({
          empty:true,
          items:[],
          groups:[],
          summary:{
            itemCount:0,
            productCount:0,
            customCount:0,
            productQuantity:0,
            estimatedTotal:0
          }
        });

      if(
        emptyResult.empty!==true||
        !list.innerHTML.includes(
          'data-screen="catalog"'
        )||
        !list.innerHTML.includes(
          'data-screen="custom"'
        )||
        summary.innerHTML!==''
      ){
        fail(
          'Inquiry UI Renderer empty-state parity failed.'
        );
      }

      function actionNode(
        action,
        {
          itemId='',
          screen='',
          delta=''
        }={}
      ){
        return {
          dataset:{
            inquiryAction:action,
            itemId,
            screen,
            delta
          },
          closest(){
            return this;
          }
        };
      }

      list.listeners
        .get('click')({
          target:
            actionNode(
              'delete',
              {itemId:'p1'}
            )
        });

      list.listeners
        .get('click')({
          target:
            actionNode(
              'adjust-quantity',
              {
                itemId:'p1',
                delta:'-1'
              }
            )
        });

      list.listeners
        .get('click')({
          target:
            actionNode(
              'edit-item',
              {itemId:'p1'}
            )
        });

      list.listeners
        .get('click')({
          target:
            actionNode(
              'open-tier',
              {itemId:'p1'}
            )
        });

      list.listeners
        .get('click')({
          target:
            actionNode(
              'go',
              {screen:'catalog'}
            )
        });

      const qtyTarget={
        dataset:{
          itemId:'p1'
        },
        value:'42',
        matches(){
          return true;
        },
        blurred:false,
        blur(){
          this.blurred=true;
        }
      };

      list.listeners
        .get('change')({
          target:
            qtyTarget
        });

      list.listeners
        .get('keydown')({
          key:'Enter',
          target:
            qtyTarget
        });

      const expectedCalls=
        JSON.stringify([
          ['delete','p1'],
          ['adjust','p1',-1],
          ['edit','p1'],
          ['tier','p1'],
          ['go','catalog'],
          ['set','p1','42']
        ]);

      if(
        JSON.stringify(
          actionCalls
        )!==
        expectedCalls||
        qtyTarget.blurred!==
        true
      ){
        fail(
          'Inquiry UI Renderer delegated-action parity failed.'
        );
      }

      const qtyInput={
        value:''
      };

      const unitPrice={
        textContent:''
      };

      const subtotal={
        textContent:''
      };

      const shell=
        new FakeElement();

      shell.dataset.id='p1';
      shell.queryMap.set(
        '.qty-edit',
        qtyInput
      );
      shell.queryMap.set(
        '.price-unit',
        unitPrice
      );
      shell.queryMap.set(
        '.price-total',
        subtotal
      );

      list.queryAllMap.set(
        '.swipe-shell[data-id]',
        [
          shell
        ]
      );

      const groupTotal={
        textContent:''
      };

      const groupElement=
        new FakeElement();

      groupElement.dataset
        .groupKey=
        'classic';

      groupElement.queryMap.set(
        '[data-group-total]',
        groupTotal
      );

      list.queryAllMap.set(
        '.group-title[data-group-key]',
        [
          groupElement
        ]
      );

      const itemCount={
        textContent:''
      };

      const estimateTotal={
        textContent:''
      };

      summary.queryMap.set(
        '#inquiryItemCount',
        itemCount
      );

      summary.queryMap.set(
        '#inquiryEstimateTotal',
        estimateTotal
      );

      renderer.update({
        ...viewModel,
        items:[
          {
            ...product,
            normalizedQty:35,
            unitPrice:4,
            subtotal:140
          },
          custom
        ],
        groups:[
          {
            ...viewModel.groups[0],
            quantity:35
          },
          viewModel.groups[1]
        ],
        summary:{
          ...viewModel.summary,
          productQuantity:35,
          estimatedTotal:140
        }
      });

      if(
        qtyInput.value!==35||
        unitPrice.textContent!==
          'USD 4.00/pc'||
        subtotal.textContent!==
          'USD 140.00'||
        groupTotal.textContent!==
          '35 pcs'||
        itemCount.textContent!==
          '2 t:items'||
        estimateTotal.textContent!==
          'USD 140.00'
      ){
        fail(
          'Inquiry UI Renderer incremental update parity failed.'
        );
      }
    }
  }catch(error){
    fail(
      `Inquiry UI Renderer execution failed: ${error.message}`
    );
  }
}

try{
  const rendererSource=
    read(
      'src/ui/inquiry/runtime-inquiry-renderer.js'
    );

  if(
    /(?:window|globalThis|root)\.DreamlandInquiry(?!Renderer)/.test(
      rendererSource
    )
  ){
    fail(
      'Inquiry UI Renderer crossed its UI-layer boundary: DreamlandInquiry'
    );
  }

  for(const forbidden of [
    'DreamlandSubmission',
    'DreamlandRisk',
    'DreamlandStorage',
    'DreamlandRuntimeHooks',
    'state.items',
    'seriesMeta',
    'currencyMap',
    'appConfig',
    'localStorage',
    'sessionStorage',
    'document.'
  ]){
    if(
      rendererSource.includes(
        forbidden
      )
    ){
      fail(
        `Inquiry UI Renderer crossed its UI-layer boundary: ${forbidden}`
      );
    }
  }

  for(const required of [
    'data-inquiry-action="delete"',
    'data-inquiry-action="adjust-quantity"',
    'data-inquiry-qty-input',
    'data-inquiry-action="edit-item"',
    'data-inquiry-action="open-tier"',
    'function renderItem(',
    'function renderEmpty(',
    'function renderGroups(',
    'function renderSummary('
  ]){
    if(
      !rendererSource.includes(
        required
      )
    ){
      fail(
        `Inquiry UI Renderer source is missing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Inquiry UI Renderer source inspection failed: ${error.message}`
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
    '<scriptsrc="./src/ui/inquiry/runtime-inquiry-renderer.js"></script>',
    'constinquiryRenderer=window.DreamlandInquiryRenderer;',
    'inquiryRenderer.configure({',
    'list:inquiryListElement',
    'summary:inquirySummaryElement',
    'text:ui',
    'seriesLabel:seriesLabel',
    'choiceLabel:choiceLabel',
    'qtyUnit:qtyUnit',
    'htmlAttr:htmlAttr',
    'money:money',
    'currencyUnit:currencyUnit',
    'itemScentLabel:itemScentLabel',
    'productDisplayName:productDisplayName',
    'maximumQuantity:maximumQuantity',
    'quantityMin:QTY_MIN',
    'quantityStep:QTY_STEP',
    'go:go',
    'removeItem:del',
    'adjustQuantity:qty',
    'setQuantity:setItemQty',
    'editItem:openEditProductItem',
    'openTier:openItemTierSheet'
  ]){
    if(
      !compactIndex.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `index.html is missing Inquiry UI Renderer integration: ${marker}`
      );
    }
  }

  if(
    compactIndex.includes(
      'functionrenderItem('
    )
  ){
    fail(
      'index.html must no longer own renderItem() in B5-04.'
    );
  }

  const renderSource=
    sliceBetween(
      indexSource,
      'function renderInquiry(){',
      'function updateInquiryDynamicUi(){'
    );

  const dynamicSource=
    sliceBetween(
      indexSource,
      'function updateInquiryDynamicUi(){',
      'function swipes()'
    );

  const compactRender=
    compact(
      renderSource
    );

  const compactDynamic=
    compact(
      dynamicSource
    );

  for(const marker of [
    'inquiry.beforeRender',
    'inquiry.afterRender',
    'mergeDuplicateProductItems();',
    'save();',
    'inquiryFeature.buildViewModel();',
    'inquiryRenderer.render(viewModel);'
  ]){
    if(
      !compactRender.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `renderInquiry() is missing App/Renderer orchestration: ${marker}`
      );
    }
  }

  for(const forbidden of [
    'innerHTML',
    'querySelector(',
    'querySelectorAll(',
    'viewModel.groups.map(',
    'money(',
    "ui('",
    'seriesLabel(',
    'choiceLabel(',
    'productDisplayName('
  ]){
    if(
      compactRender.includes(
        compact(
          forbidden
        )
      )
    ){
      fail(
        `renderInquiry() still owns DOM/presentation logic: ${forbidden}`
      );
    }
  }

  for(const marker of [
    'inquiryFeature.buildViewModel();',
    'inquiryRenderer.update(viewModel);',
    'badge();'
  ]){
    if(
      !compactDynamic.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `updateInquiryDynamicUi() is missing App/Renderer orchestration: ${marker}`
      );
    }
  }

  for(const forbidden of [
    'innerHTML',
    'querySelector(',
    'querySelectorAll(',
    'textContent',
    'viewModel.items.forEach(',
    'viewModel.groups.map(',
    'money(',
    "ui('"
  ]){
    if(
      compactDynamic.includes(
        compact(
          forbidden
        )
      )
    ){
      fail(
        `updateInquiryDynamicUi() still owns DOM/presentation logic: ${forbidden}`
      );
    }
  }

  for(const legacyInline of [
    'onclick="del(',
    'onclick="openEditProductItem(',
    'onclick="openItemTierSheet(',
    'onchange="setItemQty('
  ]){
    if(
      indexSource.includes(
        legacyInline
      )
    ){
      fail(
        `Legacy Inquiry item inline handler remains in index.html: ${legacyInline}`
      );
    }
  }
}catch(error){
  fail(
    `index.html Inquiry UI Renderer inspection failed: ${error.message}`
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
        `?inquiry-ui-contract=${Date.now()}`
      )
    ).UI_CONTRACTS;

  const enabled=
    uiContracts.filter(
      item=>
        item.runtimeEnabled===true
    );

  const inquiryRenderer=
    uiContracts.find(
      item=>
        item.id===
        'inquiry-renderer'
    );

  if(
    enabled.length!==1||
    enabled[0]?.id!==
      'inquiry-renderer'||
    inquiryRenderer?.migrationStatus!==
      'migrated'||
    inquiryRenderer?.runtimeOwner!==
      'src/ui/inquiry/runtime-inquiry-renderer.js'
  ){
    fail(
      'B5-04 must expose Inquiry Renderer as the only runtime-enabled UI contract.'
    );
  }
}catch(error){
  fail(
    `UI contract B5-04 inspection failed: ${error.message}`
  );
}

try{
  const legacyMapSource=
    read(
      'src/app/legacy-map.js'
    );

  for(const marker of [
    'DreamlandInquiryRenderer',
    'src/ui/inquiry/runtime-inquiry-renderer.js',
    'DOM rendering',
    'item-level event delegation'
  ]){
    if(
      !legacyMapSource.includes(
        marker
      )
    ){
      fail(
        `Legacy map does not describe B5-04 Inquiry UI ownership: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `Legacy map B5-04 inspection failed: ${error.message}`
  );
}

try{
  const stateValidator=
  read(
    'scripts/validate-inquiry-feature-state-boundary.mjs'
  );

if(
  stateValidator.includes(
    "'function renderItem('"
  )
){
  fail(
    'Historical B5-01 validator still owns B5-04 Renderer placement: function renderItem('
  );
}
  
  const historicalValidator=
    read(
      'scripts/validate-inquiry-view-model-boundary.mjs'
    );

  for(const staleOwnership of [
    'dreamland-pwa-v74',
    "feature.version!=='B5-03'",
    'renderInquiry() is missing the B5-03 Renderer contract',
    'updateInquiryDynamicUi() is missing the B5-03 View Model contract',
    'renderItem() is missing the B5-03 item View Model contract',
    'Legacy map does not describe the B5-03 View Model / Renderer boundary.'
  ]){
    if(
      historicalValidator.includes(
        staleOwnership
      )
    ){
      fail(
        `Historical B5-03 validator still owns B5-04 Renderer placement/version: ${staleOwnership}`
      );
    }
  }

  for(const preservedCoverage of [
    'buildViewModel',
    'Inquiry View Model top-level shape is incorrect.',
    'Inquiry View Model summary parity failed.',
    'Previous View Model snapshot must remain stable after state mutation.',
    'Empty Inquiry View Model parity failed.'
  ]){
    if(
      !historicalValidator.includes(
        preservedCoverage
      )
    ){
      fail(
        `Historical B5-03 View Model coverage was removed: ${preservedCoverage}`
      );
    }
  }

  const swSource=
    read(
      'sw.js'
    );

  if(
    !swSource.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v75';"
    )
  ){
    fail(
      'sw.js cache version must be dreamland-pwa-v75 for B5-04.'
    );
  }

  const featureMatches=
    swSource.match(
      /'\.\/src\/features\/inquiry\/runtime-inquiry\.js'/g
    )||[];

  if(
    featureMatches.length!==1
  ){
    fail(
      `sw.js must retain runtime-inquiry.js exactly once; found ${featureMatches.length}.`
    );
  }

  const rendererMatches=
    swSource.match(
      /'\.\/src\/ui\/inquiry\/runtime-inquiry-renderer\.js'/g
    )||[];

  if(
    rendererMatches.length!==1
  ){
    fail(
      `sw.js must cache runtime-inquiry-renderer.js exactly once; found ${rendererMatches.length}.`
    );
  }
}catch(error){
  fail(
    `Historical-validator/SW B5-04 inspection failed: ${error.message}`
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
      ?.['inquiry-ui:boundary']!==
      'node scripts/validate-inquiry-ui-renderer-boundary.mjs'
  ){
    fail(
      'package.json is missing inquiry-ui:boundary.'
    );
  }

  if(
    !String(
      packageJson.scripts
        ?.validate||
      ''
    ).includes(
      'npm run inquiry-view-model:boundary && npm run inquiry-ui:boundary'
    )
  ){
    fail(
      'B5-04 validator must run after the B5-03 View Model validator.'
    );
  }
}catch(error){
  fail(
    `package.json B5-04 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nInquiry UI Renderer boundary validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Inquiry UI Renderer boundary validation: PASS'
);

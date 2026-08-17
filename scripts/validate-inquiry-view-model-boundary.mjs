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
    path.join(ROOT,relativePath),
    'utf8'
  );
}

function sliceBetween(source,startMarker,endMarker){
  const start=source.indexOf(startMarker);

  if(start<0){
    return '';
  }

  const end=source.indexOf(
    endMarker,
    start+startMarker.length
  );

  return end<0
    ? source.slice(start)
    : source.slice(start,end);
}

const runtimePath=
  path.join(
    ROOT,
    'src/features/inquiry/runtime-inquiry.js'
  );

if(!fs.existsSync(runtimePath)){
  fail('Inquiry runtime feature is missing.');
}else{
  try{
    delete globalThis.DreamlandInquiry;

    await import(
      `${pathToFileURL(runtimePath).href}?view-model-validation=${Date.now()}`
    );

    const feature=globalThis.DreamlandInquiry;

    if(!feature){
      fail('runtime-inquiry.js did not expose DreamlandInquiry.');
    }else{
      if(feature.version!=='B5-03'){
        fail(`Unexpected Inquiry runtime version: ${feature.version}`);
      }

      for(const method of [
        'configure',
        'getState',
        'items',
        'persist',
        'findItem',
        'setProductQuantity',
        'seriesQuantity',
        'pricingGroupQuantity',
        'itemUnit',
        'itemSubtotal',
        'total',
        'derivedSummary',
        'buildViewModel'
      ]){
        if(typeof feature[method]!=='function'){
          fail(`DreamlandInquiry.${method} is missing.`);
        }
      }

      const memory=new Map();
      const storage={
        getItem(key){
          return memory.has(key)?memory.get(key):null;
        },
        setItem(key,value){
          memory.set(key,String(value));
        }
      };

      memory.set(
        'productManualV2State',
        JSON.stringify({
          version:2,
          items:[
            {id:'c1',type:'product',productId:'CLA001',series:'classic',size:'M',scentId:'SC1',pack:'批发包装',qty:30,names:{zh:'A'}},
            {id:'c2',type:'product',productId:'CLA002',series:'classic',size:'M',scentId:'SC2',pack:'精品包装',qty:20,names:{zh:'B'}},
            {id:'h1',type:'product',productId:'HOL001',series:'holiday',scentSeries:'classic',size:'S',pack:'批发包装',qty:10},
            {id:'h2',type:'product',productId:'HOL002',series:'holiday',scentSeries:'advanced',size:'S',pack:'批发包装',qty:15},
            {id:'custom-1',type:'custom',use:'品牌活动',qty:80,budget:'待确认'}
          ],
          contact:{}
        })
      );

      const pricingSeriesFor=item=>
        item?.series==='holiday'
          ? (item?.scentSeries||'classic')
          : (item?.series||'');

      const tierUnitCny=(series,size,quantity)=>{
        const sizeDelta=size==='M'?2:0;
        const tierBase=quantity>=50?8:10;
        const seriesDelta=series==='advanced'?3:0;
        return tierBase+sizeDelta+seriesDelta;
      };

      const packSurchargeCny=(_series,pack)=>
        pack==='精品包装'?2:0;

      const convertCnyToBase=value=>
        Number(value)/2;

      const state=feature.configure({
        storage,
        storageKey:'productManualV2State',
        version:2,
        normalizeQuantity(value,min){
          const parsed=Math.trunc(Number(value));

          return Math.max(
            min,
            Number.isFinite(parsed)
              ? parsed
              : min
          );
        },
        pricingSeriesFor,
        tierUnitCny,
        packSurchargeCny,
        convertCnyToBase
      });

      const view=feature.buildViewModel();

      if(
        view.empty!==false||
        view.items.length!==5||
        view.groups.length!==3
      ){
        fail('Inquiry View Model top-level shape is incorrect.');
      }

      if(view.items[0]===state.items[0]){
        fail('Inquiry View Model items must be presentation snapshots, not state item references.');
      }

      if(
        view.items.map(item=>item.id).join(',')!==
        'c1,c2,h1,h2,custom-1'
      ){
        fail('Inquiry View Model must preserve state item order.');
      }

      const [classic,holiday,custom]=view.groups;

      if(
        classic.key!=='classic'||
        classic.type!=='product'||
        classic.itemCount!==2||
        classic.quantity!==50
      ){
        fail('Classic Inquiry View Model group parity failed.');
      }

      if(
        holiday.key!=='holiday'||
        holiday.type!=='product'||
        holiday.itemCount!==2||
        holiday.quantity!==25
      ){
        fail('Holiday Inquiry View Model group parity failed.');
      }

      if(
        custom.key!=='custom'||
        custom.type!=='custom'||
        custom.itemCount!==1||
        custom.quantity!==0
      ){
        fail('Custom Inquiry View Model group parity failed.');
      }

      if(
        classic.items[0].normalizedQty!==30||
        classic.items[0].unitPrice!==5||
        classic.items[0].subtotal!==150||
        classic.items[1].unitPrice!==6||
        classic.items[1].subtotal!==120
      ){
        fail('Product View Model pricing snapshot parity failed.');
      }

      if(
        custom.items[0].unitPrice!==0||
        custom.items[0].subtotal!==0
      ){
        fail('Custom View Model must stay quote-pending and outside product estimate.');
      }

      const expectedTotal=150+120+50+97.5;

      if(
        view.summary.itemCount!==5||
        view.summary.productCount!==4||
        view.summary.customCount!==1||
        view.summary.productQuantity!==75||
        view.summary.estimatedTotal!==expectedTotal
      ){
        fail('Inquiry View Model summary parity failed.');
      }

      if(
        !Object.isFrozen(view)||
        !Object.isFrozen(view.items)||
        !Object.isFrozen(view.groups)||
        !Object.isFrozen(classic)||
        !Object.isFrozen(classic.items)||
        !Object.isFrozen(classic.items[0])
      ){
        fail('Inquiry View Model snapshots must be frozen.');
      }

      const oldClassicSecondUnit=
        classic.items[1].unitPrice;

      feature.setProductQuantity('c1',5,1);

      const nextView=feature.buildViewModel();
      const nextClassic=nextView.groups[0];

      if(
        oldClassicSecondUnit!==6||
        nextClassic.quantity!==25||
        nextClassic.items[1].unitPrice!==7
      ){
        fail('Fresh View Model did not re-derive shared-group pricing after mutation.');
      }

      if(
        classic.quantity!==50||
        classic.items[1].unitPrice!==6
      ){
        fail('Previous View Model snapshot must remain stable after state mutation.');
      }

      feature.clearItems();

      const emptyView=feature.buildViewModel();

      if(
        emptyView.empty!==true||
        emptyView.items.length!==0||
        emptyView.groups.length!==0||
        emptyView.summary.itemCount!==0||
        emptyView.summary.estimatedTotal!==0
      ){
        fail('Empty Inquiry View Model parity failed.');
      }
    }
  }catch(error){
    fail(`Inquiry View Model runtime execution failed: ${error.message}`);
  }
}

try{
  const runtimeSource=read('src/features/inquiry/runtime-inquiry.js');

  for(const forbidden of [
    'document.',
    'querySelector(',
    'innerHTML',
    'currencyMap',
    'seriesMeta',
    'DreamlandSubmission',
    'DreamlandRisk',
    'ui(',
    'money(',
    'seriesLabel(',
    'choiceLabel(',
    'productDisplayName('
  ]){
    if(runtimeSource.includes(forbidden)){
      fail(`Inquiry View Model crossed the Feature/Renderer boundary: ${forbidden}`);
    }
  }
}catch(error){
  fail(`Inquiry View Model source inspection failed: ${error.message}`);
}

try{
  const indexSource=read('index.html');

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
      'function renderItem(i){'
    );

  const itemSource=
    sliceBetween(
      indexSource,
      'function renderItem(i){',
      'function swipes()'
    );

 if(!renderSource||!dynamicSource||!itemSource){
  fail(
    'Inquiry renderer functions could not be isolated.'
  );
}else{
  const compactRenderSource=
    renderSource.replace(
      /\s+/g,
      ''
    );

  const compactDynamicSource=
    dynamicSource.replace(
      /\s+/g,
      ''
    );

  const compactItemSource=
    itemSource.replace(
      /\s+/g,
      ''
    );

  for(const marker of [
    'inquiry.beforeRender',
    'inquiry.afterRender',
    'mergeDuplicateProductItems();',
    'save();',
    'inquiryFeature.buildViewModel(',
    'viewModel.empty',
    'viewModel.groups',
    'viewModel.summary.itemCount',
    'viewModel.summary.estimatedTotal',
    'inquiryList.innerHTML',
    'summaryBox.innerHTML'
  ]){
    if(
      !compactRenderSource.includes(
        marker.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `renderInquiry() is missing the B5-03 Renderer contract: ${marker}`
      );
    }
  }

  for(const forbidden of [
    'state.items',
    'seriesQty(',
    'itemUnit(',
    'itemSubtotal(',
    'total()'
  ]){
    if(
      compactRenderSource.includes(
        forbidden.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `renderInquiry() still re-derives Inquiry screen state: ${forbidden}`
      );
    }
  }

  for(const marker of [
    'inquiryFeature.buildViewModel(',
    'viewModel.items',
    'viewModel.groups',
    'viewModel.summary.itemCount',
    'viewModel.summary.estimatedTotal',
    'querySelector(',
    'textContent'
  ]){
    if(
      !compactDynamicSource.includes(
        marker.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `updateInquiryDynamicUi() is missing the B5-03 View Model contract: ${marker}`
      );
    }
  }

  for(const forbidden of [
    'state.items',
    'seriesQty(',
    'itemUnit(',
    'itemSubtotal(',
    'total()'
  ]){
    if(
      compactDynamicSource.includes(
        forbidden.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `updateInquiryDynamicUi() still re-derives Inquiry screen state: ${forbidden}`
      );
    }
  }

  for(const marker of [
    'i.unitPrice',
    'i.subtotal',
    'onclick="del(',
    'onclick="openEditProductItem(',
    'onclick="openItemTierSheet('
  ]){
    if(
      !compactItemSource.includes(
        marker.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `renderItem() is missing the B5-03 item View Model contract: ${marker}`
      );
    }
  }

  for(const forbidden of [
    'itemUnit(',
    'itemSubtotal('
  ]){
    if(
      compactItemSource.includes(
        forbidden.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `renderItem() still calculates pricing directly: ${forbidden}`
      );
    }
  }
}

  for(const preserved of [
    'function seriesQty(series){return inquiryFeature.seriesQuantity(series);}',
    'function pricingGroupQty(item){return inquiryFeature.pricingGroupQuantity(item);}',
    'function itemUnit(item){return inquiryFeature.itemUnit(item);}',
    'function itemSubtotal(item){return inquiryFeature.itemSubtotal(item);}',
    'function total(){return inquiryFeature.total();}',
    'function renderPreview(',
    'function itemText(',
    'function buildWeb3FormsPayload(',
    'async function submitInquiry('
  ]){
    if(!compact.includes(preserved.replace(/\s+/g,''))){
      fail(`B5-03 must preserve legacy Preview/Submission compatibility: ${preserved}`);
    }
  }
}catch(error){
  fail(`index.html Inquiry View Model boundary inspection failed: ${error.message}`);
}

try{
  const imageManager=read('image-manager.js');

  for(const marker of [
    "'inquiry.beforeRender'",
    "'inquiry.afterRender'",
    'syncActiveInquiryCovers',
    'mountInquiry'
  ]){
    if(!imageManager.includes(marker)){
      fail(`Inquiry media lifecycle must remain hook-based in B5-03: ${marker}`);
    }
  }
}catch(error){
  fail(`Inquiry media lifecycle inspection failed: ${error.message}`);
}

try{
  const manifest=(
    await import(
      pathToFileURL(
        path.join(ROOT,'src/features/manifest.js')
      ).href+`?view-model-manifest=${Date.now()}`
    )
  ).FEATURE_MANIFEST;

  const enabled=
    manifest.filter(item=>item.runtimeEnabled===true);

  const inquiry=
    manifest.find(item=>item.id==='inquiry');

  if(
    enabled.length!==1||
    enabled[0]?.id!=='inquiry'||
    inquiry?.status!=='partial'||
    inquiry?.runtimeOwner!==
      'src/features/inquiry/runtime-inquiry.js'
  ){
    fail('B5-03 must preserve Inquiry as the only partial runtime Feature.');
  }
}catch(error){
  fail(`Feature manifest B5-03 inspection failed: ${error.message}`);
}

try{
  const legacyMapSource=read('src/app/legacy-map.js');

  if(
    !legacyMapSource.includes('Inquiry screen View Model')||
    !legacyMapSource.includes('The DOM renderer')
  ){
    fail('Legacy map does not describe the B5-03 View Model / Renderer boundary.');
  }
}catch(error){
  fail(`Legacy map B5-03 inspection failed: ${error.message}`);
}

try{
  const previousValidator=
    read('scripts/validate-inquiry-pricing-boundary.mjs');

  for(const historical of [
  'dreamland-pwa-v73',
  "feature.version!=='B5-02'",
  'item-derived unit/subtotal/total pricing'
]){
    if(previousValidator.includes(historical)){
      fail(`Historical B5-02 validator still owns B5-03 runtime/cache version: ${historical}`);
    }
  }

 if(
  !previousValidator.includes(
    "feature.version!=='B5-01'"
  )
){
  fail(
    'B5-02 validator must retain protection against the historical B5-01 runtime version lock.'
  );
} 
  
  const swSource=read('sw.js');

  if(
    !swSource.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v74';"
    )
  ){
    fail('sw.js cache version must be dreamland-pwa-v74 for B5-03.');
  }

  const matches=
    swSource.match(
      /'\.\/src\/features\/inquiry\/runtime-inquiry\.js'/g
    )||[];

  if(matches.length!==1){
    fail(`sw.js APP_SHELL must retain runtime-inquiry.js exactly once; found ${matches.length}.`);
  }
}catch(error){
  fail(`Historical-validator/SW B5-03 inspection failed: ${error.message}`);
}

if(errors.length){
  console.error('\nInquiry View Model / Renderer boundary validation failed:\n');

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log('Inquiry View Model / Renderer boundary validation: PASS');

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
      `${pathToFileURL(runtimePath).href}?pricing-validation=${Date.now()}`
    );

    const feature=globalThis.DreamlandInquiry;

    if(!feature){
      fail('runtime-inquiry.js did not expose DreamlandInquiry.');
    }else{
      if(feature.version!=='B5-02'){
        fail(`Unexpected Inquiry runtime version: ${feature.version}`);
      }

      for(const method of [
        'configure',
        'getState',
        'items',
        'persist',
        'findItem',
        'addOrMergeProduct',
        'setProductQuantity',
        'pricingReady',
        'seriesQuantity',
        'pricingGroupQuantity',
        'itemUnit',
        'itemSubtotal',
        'total',
        'derivedSummary'
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
            {id:'c1',type:'product',series:'classic',size:'M',pack:'批发包装',qty:30},
            {id:'c2',type:'product',series:'classic',size:'M',pack:'精品包装',qty:20},
            {id:'h1',type:'product',series:'holiday',scentSeries:'classic',size:'S',pack:'批发包装',qty:10},
            {id:'h2',type:'product',series:'holiday',scentSeries:'advanced',size:'S',pack:'批发包装',qty:15},
            {id:'custom-1',type:'custom',qty:80}
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
        pricingSeriesFor,
        tierUnitCny,
        packSurchargeCny,
        convertCnyToBase
      });

      if(feature.pricingReady()!==true){
        fail('Configured Inquiry pricing runtime must report pricingReady().');
      }

      if(
        feature.seriesQuantity('classic')!==50||
        feature.seriesQuantity('holiday')!==25
      ){
        fail('Inquiry series quantity aggregation parity failed.');
      }

      if(
        feature.pricingGroupQuantity(state.items[2])!==10||
        feature.pricingGroupQuantity(state.items[3])!==15
      ){
        fail('Holiday scent-series pricing groups must remain separate.');
      }

      // classic group qty = 50; M unit CNY = 8 + 2 = 10.
      if(
        feature.itemUnit(state.items[0])!==5||
        feature.itemUnit(state.items[1])!==6
      ){
        fail('Inquiry item unit pricing parity failed.');
      }

      if(
        feature.itemSubtotal(state.items[0])!==150||
        feature.itemSubtotal(state.items[1])!==120
      ){
        fail('Inquiry item subtotal parity failed.');
      }

      // h1: classic qty 10 => 10 CNY / 2 = 5, subtotal 50.
      // h2: advanced qty 15 => 13 CNY / 2 = 6.5, subtotal 97.5.
      const expectedTotal=150+120+50+97.5;

      if(feature.total()!==expectedTotal){
        fail(`Inquiry total parity failed: ${feature.total()} !== ${expectedTotal}`);
      }

      const summary=feature.derivedSummary();

      if(
        summary.itemCount!==5||
        summary.productCount!==4||
        summary.customCount!==1||
        summary.productQuantity!==75||
        summary.estimatedTotal!==expectedTotal
      ){
        fail('Inquiry derived summary parity failed.');
      }

      feature.setProductQuantity('c1',45,1);

      if(
        feature.pricingGroupQuantity(state.items[0])!==65||
        feature.itemUnit(state.items[1])!==6
      ){
        fail('Inquiry pricing did not re-derive from current shared group quantity.');
      }

      if(
        feature.itemUnit(state.items[4])!==0||
        feature.itemSubtotal(state.items[4])!==0
      ){
        fail('Custom records must stay excluded from product estimate.');
      }
    }
  }catch(error){
    fail(`Inquiry pricing runtime execution failed: ${error.message}`);
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
    'DreamlandRisk'
  ]){
    if(runtimeSource.includes(forbidden)){
      fail(`Inquiry pricing runtime crossed its Feature boundary: ${forbidden}`);
    }
  }
}catch(error){
  fail(`Inquiry pricing runtime source inspection failed: ${error.message}`);
}

try{
  const indexSource=read('index.html');
  const compact=indexSource.replace(/\s+/g,'');

  for(const marker of [
    'pricingSeriesFor:pricingSeriesFor',
    'tierUnitCny:tierUnitCny',
    'packSurchargeCny:packSurchargeCny',
    'convertCnyToBase:cnyToBase',
    'function seriesQty(series){return inquiryFeature.seriesQuantity(series);}',
    'function pricingGroupQty(item){return inquiryFeature.pricingGroupQuantity(item);}',
    'function itemUnit(item){return inquiryFeature.itemUnit(item);}',
    'function itemSubtotal(item){return inquiryFeature.itemSubtotal(item);}',
    'function total(){return inquiryFeature.total();}'
  ]){
    if(!compact.includes(marker.replace(/\s+/g,''))){
      fail(`index.html is missing Inquiry pricing integration: ${marker}`);
    }
  }

  for(const legacy of [
    'function pricingGroupKey(',
    'function seriesQty(series){return state.items',
    'function pricingGroupQty(item){const key=pricingGroupKey(item)',
    "function itemUnit(item){if(item?.type!=='product')",
    "function itemSubtotal(item){return item?.type==='product'",
    'function total(){return state.items.reduce'
  ]){
    if(compact.includes(legacy.replace(/\s+/g,''))){
      fail(`index.html still directly owns Inquiry derived pricing: ${legacy}`);
    }
  }

  for(const preserved of [
    'function pricingSeriesFor(',
    'function tierFor(',
    'function currentTierIndex(',
    'function nextTierFor(',
    'function tierUnitCny(',
    'function packSurchargeCny(',
    'function cnyToBase(',
    'function configUnit(',
    'function catalogUnit(',
    'function tierTableHtml(',
    'function openTierSheet(',
    'function openItemTierSheet(',
    'function renderInquiry(',
    'function updateInquiryDynamicUi(',
    'function renderItem(',
    'async function submitInquiry('
  ]){
    if(!compact.includes(preserved.replace(/\s+/g,''))){
      fail(`B5-02 must preserve shared pricing/UI ownership: ${preserved}`);
    }
  }
}catch(error){
  fail(`index.html Inquiry pricing boundary inspection failed: ${error.message}`);
}

try{
  const manifest=(
    await import(
      pathToFileURL(
        path.join(ROOT,'src/features/manifest.js')
      ).href+`?pricing-manifest=${Date.now()}`
    )
  ).FEATURE_MANIFEST;

  const enabled=manifest.filter(item=>item.runtimeEnabled===true);
  const inquiry=manifest.find(item=>item.id==='inquiry');

  if(
    enabled.length!==1||
    enabled[0]?.id!=='inquiry'||
    inquiry?.status!=='partial'||
    inquiry?.runtimeOwner!=='src/features/inquiry/runtime-inquiry.js'
  ){
    fail('B5-02 must preserve Inquiry as the only partial runtime Feature.');
  }
}catch(error){
  fail(`Feature manifest B5-02 inspection failed: ${error.message}`);
}

try{
  const legacyMapSource=read('src/app/legacy-map.js');

  if(
    !legacyMapSource.includes("'src/features/inquiry/runtime-inquiry.js'")||
    !legacyMapSource.includes('item-derived unit/subtotal/total pricing')
  ){
    fail('Legacy map does not describe B5-02 Inquiry pricing ownership.');
  }
}catch(error){
  fail(`Legacy map B5-02 inspection failed: ${error.message}`);
}

try{
  const previousValidator=
    read('scripts/validate-inquiry-feature-state-boundary.mjs');

  for(const historical of [
  'dreamland-pwa-v72',
  "feature.version!=='B5-01'",
  "'function itemUnit('",
  "'function itemSubtotal('",
  "'function total('"
]){
    if(previousValidator.includes(historical)){
      fail(`Historical B5-01 validator still owns B5-02 pricing/cache placement: ${historical}`);
    }
  }

  const swSource=read('sw.js');

  if(
    !swSource.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v73';"
    )
  ){
    fail('sw.js cache version must be dreamland-pwa-v73 for B5-02.');
  }

  const matches=
    swSource.match(
      /'\.\/src\/features\/inquiry\/runtime-inquiry\.js'/g
    )||[];

  if(matches.length!==1){
    fail(`sw.js APP_SHELL must retain runtime-inquiry.js exactly once; found ${matches.length}.`);
  }
}catch(error){
  fail(`Historical-validator/SW B5-02 inspection failed: ${error.message}`);
}

if(errors.length){
  console.error('\nInquiry pricing / derived state boundary validation failed:\n');
  for(const error of errors){
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Inquiry pricing / derived state boundary validation: PASS');

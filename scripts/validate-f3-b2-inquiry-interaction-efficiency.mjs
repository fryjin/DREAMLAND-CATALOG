#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_MODE=process.argv.includes('--source');
const DIST_MODE=process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error('Usage: node scripts/validate-f3-b2-inquiry-interaction-efficiency.mjs --source|--dist');
  process.exit(1);
}

const errors=[];
function fail(message){errors.push(message);}
function read(relative){
  return fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\r\n?/g,'\n');
}
function json(relative){return JSON.parse(read(relative));}

if(SOURCE_MODE){
  try{
    const page=read('src/astro/components/inquiry/InquiryPage.astro');

    for(const marker of [
      'data-inquiry-conversion-composition="true"',
      'data-inquiry-interaction-efficiency="true"',
      'class="inquiry-validation"',
      'data-inquiry-validation'
    ]){
      if(!page.includes(marker)){
        fail('Inquiry interaction shell is missing: '+marker);
      }
    }

    if(!/<div\s+class="inquiry-validation"[\s\S]*?data-inquiry-validation/m.test(page)){
      fail('Structured MOQ blocker output requires data-inquiry-validation to be a div container.');
    }
  }catch(error){
    fail('Inquiry interaction shell validation failed: '+error.message);
  }

  try{
    const viewModel=read('src/astro/lib/inquiry-view-model.mjs');

    if(!/compactUi[\s\S]*?'moreToMoq'/m.test(viewModel)){
      fail('Inquiry runtime-state projection must expose localized ui.moreToMoq.');
    }
  }catch(error){
    fail('Inquiry localization projection validation failed: '+error.message);
  }

  try{
    const runtime=read('src/astro/runtime/inquiry-runtime.js');

    for(const marker of [
      'F3-B2 — Quantity & MOQ Interaction Efficiency',
      '.productMoqGroups(',
      'function unmetGroups(',
      'inquiryMoqState',
      'inquiryMoqGroup',
      'inquiry-item__moq-feedback',
      'inquiry-validation__row',
      'minus.disabled=',
      'plus.disabled=',
      'preserveMediaOnNextRender=true;',
      'nextMedia.replaceWith(',
      '.setProductQuantity('
    ]){
      if(!runtime.includes(marker)){
        fail('Inquiry interaction runtime contract is missing: '+marker);
      }
    }

    const bytes=Buffer.byteLength(runtime,'utf8');
    if(bytes>48*1024){
      fail('Inquiry adapter exceeded protected 48 KiB budget: '+bytes+' bytes.');
    }
  }catch(error){
    fail('Inquiry interaction runtime validation failed: '+error.message);
  }

  try{
    const css=read('src/astro/styles/inquiry.css');

    for(const marker of [
      'F3-B2 — Quantity & MOQ Interaction Efficiency',
      '.inquiry-item__moq-feedback',
      '.inquiry-validation__title',
      '.inquiry-validation__row',
      '.inquiry-item__qty button:disabled'
    ]){
      if(!css.includes(marker)){
        fail('Inquiry interaction CSS contract is missing: '+marker);
      }
    }
  }catch(error){
    fail('Inquiry interaction CSS validation failed: '+error.message);
  }

  /*
   * Canonical contract proof:
   * MOQ grouping remains series+size.
   * Pricing grouping remains series, with Holiday isolated by delegated pricing series.
   * F3-B2 may consume these owners but must not merge them.
   */
  try{
    delete globalThis.DreamlandInquiry;

    await import(
      pathToFileURL(
        path.join(ROOT,'src/features/inquiry/runtime-inquiry.js')
      ).href+
      '?f3b2='+
      Date.now()
    );

    const inquiry=globalThis.DreamlandInquiry;
    const memory=new Map();

    memory.set(
      'productManualV2State',
      JSON.stringify({
        version:2,
        contact:{},
        items:[
          {id:'adv-s-1',type:'product',productId:'ADV001',series:'advanced',size:'S',qty:60,pack:''},
          {id:'adv-s-2',type:'product',productId:'ADV002',series:'advanced',size:'S',qty:20,pack:''},
          {id:'adv-m',type:'product',productId:'ADV003',series:'advanced',size:'M',qty:5,pack:''},
          {id:'holiday-a',type:'product',productId:'HOL001',series:'holiday',scentSeries:'advanced',size:'S',qty:10,pack:''}
        ]
      })
    );

    const storage={
      getItem(key){return memory.has(key)?memory.get(key):null;},
      setItem(key,value){memory.set(key,String(value));}
    };

    inquiry.configure({
      storage,
      storageKey:'productManualV2State',
      version:2,
      normalizeQuantity:(value,min)=>Math.max(min,Math.trunc(Number(value)||min)),
      pricingSeriesFor:item=>item?.series==='holiday' ? item?.scentSeries : item?.series,
      tierUnitCny:()=>0,
      packSurchargeCny:()=>0,
      convertCnyToBase:value=>value
    });

    const moqGroups=inquiry.productMoqGroups(
      item=>item?.series==='holiday' ? 36 : item?.size==='S' ? 100 : 50
    );

    const advS=moqGroups.find(group=>group.key==='advanced|S');
    const advM=moqGroups.find(group=>group.key==='advanced|M');
    const holidayS=moqGroups.find(group=>group.key==='holiday|S');

    if(
      moqGroups.length!==3||
      advS?.qty!==80||
      advS?.moq!==100||
      advM?.qty!==5||
      advM?.moq!==50||
      holidayS?.qty!==10||
      holidayS?.moq!==36
    ){
      fail('Canonical MOQ grouping drifted from series+size ownership.');
    }

    const advItem=inquiry.findItem('adv-s-1');
    const holidayItem=inquiry.findItem('holiday-a');

    if(
      inquiry.pricingGroupQuantity(advItem)!==85||
      inquiry.pricingGroupQuantity(holidayItem)!==10
    ){
      fail('Pricing grouping drifted or was incorrectly merged with MOQ grouping.');
    }
  }catch(error){
    fail('MOQ/Pricing owner separation proof failed: '+error.message);
  }

  try{
    const promotion=read('scripts/r4-promote-astro-inquiry.mjs');

    for(const marker of [
      'data-inquiry-interaction-efficiency="true"',
      "'.productMoqGroups('",
      "'inquiryMoqState'"
    ]){
      if(!promotion.includes(marker)){
        fail('Production Inquiry promotion does not protect F3-B2: '+marker);
      }
    }
  }catch(error){
    fail('F3-B2 Production promotion contract validation failed: '+error.message);
  }

  try{
    const pkg=json('package.json');

    if(
      pkg.scripts?.['r4:conversion:inquiry-interaction']!==
      'node scripts/validate-f3-b2-inquiry-interaction-efficiency.mjs --source'
    ){
      fail('package.json is missing r4:conversion:inquiry-interaction.');
    }

    if(
      pkg.scripts?.['r4:conversion:inquiry-interaction:dist']!==
      'node scripts/validate-f3-b2-inquiry-interaction-efficiency.mjs --dist'
    ){
      fail('package.json is missing r4:conversion:inquiry-interaction:dist.');
    }

    const validate=String(pkg.scripts?.validate||'');
    const composition=validate.indexOf('npm run r4:conversion:inquiry-composition');
    const interaction=validate.indexOf('npm run r4:conversion:inquiry-interaction');
    const contact=validate.indexOf('npm run r4:astro:contact');

    if(
      composition<0||
      interaction<=composition||
      contact<=interaction
    ){
      fail('F3-B2 source gate must run after F3-A2 composition and before Contact.');
    }

    const build=String(pkg.scripts?.build||'');
    const compositionDist=build.indexOf('npm run r4:conversion:inquiry-composition:dist');
    const interactionDist=build.indexOf('npm run r4:conversion:inquiry-interaction:dist');

    if(
      compositionDist<0||
      interactionDist<=compositionDist
    ){
      fail('F3-B2 Production gate must run after F3-A2 Production composition.');
    }
  }catch(error){
    fail('F3-B2 package topology validation failed: '+error.message);
  }
}

if(DIST_MODE){
  try{
    for(const relative of [
      '.r4-astro-dist/inquiry/index.html',
      'dist/inquiry/index.html'
    ]){
      const html=read(relative);

      for(const marker of [
        'data-inquiry-conversion-composition="true"',
        'data-inquiry-interaction-efficiency="true"',
        'data-inquiry-validation'
      ]){
        if(!html.includes(marker)){
          fail(relative+' is missing F3-B2 interaction marker: '+marker);
        }
      }
    }

    for(const relative of [
      '.r4-astro-dist/r4-inquiry-runtime.js',
      'dist/r4-inquiry-runtime.js'
    ]){
      const runtime=read(relative);

      for(const marker of [
        '.productMoqGroups(',
        'inquiryMoqState',
        'inquiry-item__moq-feedback',
        'inquiry-validation__row'
      ]){
        if(!runtime.includes(marker)){
          fail(relative+' is missing F3-B2 runtime behavior: '+marker);
        }
      }
    }
  }catch(error){
    fail('F3-B2 Production artifact validation failed: '+error.message);
  }
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F3-B2 INQUIRY INTERACTION EFFICIENCY: FAIL');
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND F3-B2 INQUIRY INTERACTION EFFICIENCY: PASS');
console.log(
  SOURCE_MODE
    ? 'All MOQ blockers / per-card MOQ feedback / quantity boundaries / MOQ-vs-pricing ownership / media stability verified.'
    : 'Isolated Astro + Production Inquiry preserve the F3-B2 interaction contract.'
);
console.log('');

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'.r4-astro-dist');
const mode=process.argv.includes('--dist')?'dist':'source';
const errors=[];
const RUNTIME_BUDGET=36*1024;

function fail(message){errors.push(message);}
function read(relative){return fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\r\n?/g,'\n');}
function json(relative){return JSON.parse(read(relative));}
function expect(source,marker,message){if(!source.includes(marker))fail(message+' Missing: '+marker);}
function stateText(html){
  const match=html.match(/<script[^>]*id="pdpRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="pdpRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  return match?match[1]:'';
}

const content=json('data/pdp-content.json');
const products=json('data/products.json').products.filter(product=>product?.status==='active');
const quantity=content.quantityHelper?.helperCopy?.copy||{};
const scentHelpers=Object.fromEntries(['classic','advanced','masterpiece'].map(seriesId=>[seriesId,content.scentStandards?.[seriesId]?.helperCopy?.copy||{}]));

if(mode==='source'){
  const route=read('src/astro/pages/products/[productId].astro');
  const viewModel=read('src/astro/lib/pdp-view-model.mjs');
  const page=read('src/astro/components/product/PdpPage.astro');
  const runtime=read('src/astro/runtime/pdp-runtime.js');
  const css=read('src/astro/styles/pdp.css');
  const contractValidator=read('scripts/validate-pdp-copy-1a-content-data-contract.mjs');
  const approvedValidator=read('scripts/validate-pdp-copy-1a3-approved-content-update.mjs');
  const pkg=json('package.json');

  for(const marker of [
    "import pdpContentDocument from '../../../../data/pdp-content.json';",
    'pdpContentDocument,'
  ]) expect(route,marker,'PDP route must load the approved content document and pass it into both builders.');

  if((route.match(/pdpContentDocument,/g)||[]).length<2){
    fail('PDP route must pass pdpContentDocument to both buildPdpViewModel and buildPdpRuntimeState.');
  }

  for(const marker of [
    "from '../../data/pdp-content-contract.mjs'",
    'colorStoryFor(',
    'scentStandardFor(',
    'quantityRule(',
    'pdpContentDocument={}',
    'pdpCopyProjection(',
    'tags:Object.freeze([])',
    'pdpCopy:Object.freeze({'
  ]) expect(viewModel,marker,'PDP ViewModel content wiring contract changed.');

  for(const marker of [
    'data-pdp-color-story-kind',
    'data-pdp-scent-helper',
    'data-pdp-quantity-helper',
    'initialScentHelper',
    'initialQuantityHelper'
  ]) expect(page,marker,'PDP presentation is missing approved-copy projection markup.');

  for(const marker of [
    "content().pdpCopy",
    'data-pdp-scent-helper',
    'data-pdp-quantity-helper',
    'pdp-config-projection__helper',
    "definition.field==='scent'"
  ]) expect(runtime,marker,'PDP runtime is missing multilingual/dynamic helper projection.');

  if(Buffer.byteLength(runtime,'utf8')>RUNTIME_BUDGET){
    fail('PDP runtime exceeds the canonical 36 KiB source budget after copy wiring.');
  }

  for(const marker of [
    'PDP-COPY-1B — Approved Content UI Wiring',
    '.pdp-field__helper',
    '.pdp-quantity-helper',
    '.pdp-config-projection__helper',
    'grid-template-areas:'
  ]) expect(css,marker,'PDP-COPY-1B responsive helper styling is incomplete.');

  if(contractValidator.includes('already wires PDP editorial content into presentation/runtime')){
    fail('PDP-COPY-1A contract validator still forbids the now-approved 1B wiring phase.');
  }

  if(approvedValidator.includes('already wires Approved Content into UI/runtime')){
    fail('PDP-COPY-1A.3 validator still forbids the now-approved 1B wiring phase.');
  }

  if(pkg.scripts?.['r4:pdp:copy-ui-wiring']!=='node scripts/validate-pdp-copy-1b-ui-wiring.mjs --source'){
    fail('package.json is missing r4:pdp:copy-ui-wiring.');
  }
  if(pkg.scripts?.['r4:pdp:copy-ui-wiring:dist']!=='node scripts/validate-pdp-copy-1b-ui-wiring.mjs --dist'){
    fail('package.json is missing r4:pdp:copy-ui-wiring:dist.');
  }

  const validate=String(pkg.scripts?.validate||'');
  const approvedIndex=validate.indexOf('npm run r4:pdp:copy-approved-content');
  const wiringIndex=validate.indexOf('npm run r4:pdp:copy-ui-wiring');
  const frontendIndex=validate.indexOf('npm run frontend:foundation');
  if(approvedIndex<0||wiringIndex<=approvedIndex||frontendIndex<=wiringIndex){
    fail('PDP-COPY-1B source gate must run after Approved Content and before frontend:foundation.');
  }

  const build=String(pkg.scripts?.build||'');
  const prodPdp=build.indexOf('npm run r4:production:pdp:validate');
  const distGate=build.indexOf('npm run r4:pdp:copy-ui-wiring:dist');
  const prodCustom=build.indexOf('npm run r4:production:custom:validate');
  if(prodPdp<0||distGate<=prodPdp||prodCustom<=distGate){
    fail('PDP-COPY-1B dist gate must run after Production PDP validation and before Production Custom validation.');
  }
}else{
  if(!fs.existsSync(OUT)){
    fail('.r4-astro-dist is missing. Run the Astro/Production build before the dist gate.');
  }else{
    const contractPath=path.join(ROOT,'src/data/pdp-content-contract.mjs');
    const contract=await import(pathToFileURL(contractPath).href+'?pdp-copy-1b='+Date.now());

    for(const product of products){
      const id=String(product?.productId||product?.id||'').trim().toUpperCase();
      const file=path.join(OUT,'products',id,'index.html');
      if(!fs.existsSync(file)){
        fail('Missing built PDP for '+id+'.');
        continue;
      }
      const html=fs.readFileSync(file,'utf8');
      const rawState=stateText(html);
      if(!rawState){
        fail(id+' is missing pdpRuntimeState.');
        continue;
      }
      let state;
      try{state=JSON.parse(rawState);}catch(error){fail(id+' runtime state JSON is invalid: '+error.message);continue;}

      const expectedKind=content.colorStories?.[id]?.kind||'story';
      if(!html.includes('data-pdp-color-story-kind="'+expectedKind+'"')){
        fail(id+' static Color Story kind is not projected.');
      }
      if(!html.includes('data-pdp-scent-helper')||!html.includes('data-pdp-quantity-helper')){
        fail(id+' static helper anchors are missing.');
      }
      if(html.includes('class="pdp-tags"')){
        fail(id+' still renders legacy parameter tags.');
      }

      for(const locale of ['en','zh','ko']){
        const expectedStory=contract.colorStoryFor(content,id,locale);
        if(state.languages?.[locale]?.description!==expectedStory){
          fail(id+' '+locale+' runtime description is not the approved Color Story.');
        }
        if(state.languages?.[locale]?.pdpCopy?.quantityHelper!==quantity[locale]){
          fail(id+' '+locale+' Quantity helper is not the approved copy.');
        }
        for(const seriesId of ['classic','advanced','masterpiece']){
          if(state.languages?.[locale]?.pdpCopy?.scentHelpers?.[seriesId]!==scentHelpers[seriesId][locale]){
            fail(id+' '+locale+' '+seriesId+' Scent helper is not the approved copy.');
          }
        }
      }
    }
  }
}

if(errors.length){
  console.error('\nDREAMLAND PDP-COPY-1B UI WIRING: FAIL\n');
  for(const error of errors)console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND PDP-COPY-1B UI WIRING: PASS');
console.log(mode==='source'
  ? 'Approved Color Story / Scent helper / Quantity helper wiring + legacy tag suppression + responsive multilingual ownership verified.'
  : '89 built PDPs project approved ZH/EN/KO Color Stories and helper contracts; Holiday placeholders remain explicit.');
console.log('');

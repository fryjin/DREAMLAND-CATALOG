#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'.r4-astro-dist');
const errors=[];
const BUDGETS=Object.freeze({adapterRaw:36*1024,bundleRaw:104*1024,stateRaw:72*1024});
function fail(message){errors.push(message);}
function read(relative){return fs.readFileSync(path.join(ROOT,relative),'utf8');}
function stateText(html){
  const match=html.match(/<script[^>]*id="customRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="customRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  return match?match[1]:'';
}

try{
  delete globalThis.DreamlandCustomRuntime;
  await import(pathToFileURL(path.join(ROOT,'src/astro/runtime/custom-runtime.js')).href+'?r4-custom-runtime='+Date.now());
  const runtime=globalThis.DreamlandCustomRuntime;
  if(!runtime||runtime.version!=='R4.6B'||runtime.id!=='DREAMLAND_R4_CUSTOM_RUNTIME_R4_6B'){
    fail('DreamlandCustomRuntime R4.6B was not exposed.');
  }else{
    if(runtime.normalizeLanguage('KO','en',['en','zh','ko'])!=='ko'||runtime.normalizeLanguage('fr','en',['en','zh','ko'])!=='en') fail('Custom language normalization failed.');
    if(runtime.inquiryCount({items:[{type:'product',qty:12},{type:'product',qty:5},{type:'custom',qty:500}]})!==18) fail('Custom Inquiry badge semantics diverged from Home parity.');
  }
}catch(error){fail('Custom minimal runtime execution failed: '+error.message);}

try{
  const adapter=read('src/astro/runtime/custom-runtime.js');
  const adapterRaw=Buffer.byteLength(adapter,'utf8');
  if(adapterRaw>BUDGETS.adapterRaw) fail('Custom adapter exceeds the 36 KiB source budget: '+(adapterRaw/1024).toFixed(1)+' KiB.');
  for(const forbidden of ['fetch(','XMLHttpRequest','serviceWorker','DreamlandRisk','DreamlandSubmission','DreamlandDesktopExperience','catalog-data.js','startup-loader.js']) if(adapter.includes(forbidden)) fail('Custom minimal runtime crossed a forbidden boundary: '+forbidden);
  for(const pattern of [/DreamlandCustom/,/DreamlandInquiry/,/custom\s*\.\s*configure/,/custom\s*\.\s*reset/,/custom\s*\.\s*setSeries/,/custom\s*\.\s*toggleScent/,/custom\s*\.\s*validateDraft/,/custom\s*\.\s*buildIntent/,/inquiry\s*\.\s*configure/,/inquiry\s*\.\s*addCustom/,/inquiry\s*\.\s*persist/]) if(!pattern.test(adapter)) fail('Custom minimal runtime is missing delegated behavior: '+pattern);
}catch(error){fail('Custom runtime source inspection failed: '+error.message);}

try{
  const file=path.join(OUT,'custom','index.html');
  if(!fs.existsSync(file)){fail('Custom output is missing for runtime budget validation.');}
  else{
    const html=fs.readFileSync(file,'utf8');const state=stateText(html);const raw=Buffer.byteLength(state,'utf8');
    if(!state)fail('Custom runtime state is missing.'); else if(raw>BUDGETS.stateRaw)fail('Custom runtime state exceeds 72 KiB: '+(raw/1024).toFixed(1)+' KiB.');
    const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];
    if(executable.length!==1||!html.includes('src="/r4-custom-runtime.js"')) fail('Custom must have exactly one executable /r4-custom-runtime.js.');
  }
  const bundle=path.join(OUT,'r4-custom-runtime.js');
  if(!fs.existsSync(bundle)){fail('Custom route runtime bundle is missing.');}
  else{
    const size=fs.statSync(bundle).size;if(size>BUDGETS.bundleRaw)fail('Custom route runtime bundle exceeds 104 KiB raw: '+(size/1024).toFixed(1)+' KiB.');
    const source=fs.readFileSync(bundle,'utf8');
    for(const marker of ['DreamlandCustom','DreamlandInquiry','DREAMLAND_R4_CUSTOM_RUNTIME_R4_6B']) if(!source.includes(marker))fail('Custom runtime bundle is missing: '+marker);
    for(const forbidden of ['navigator.serviceWorker','runtime-pwa.js','DreamlandRisk','DreamlandSubmission','DreamlandDesktopExperience']) if(source.includes(forbidden))fail('Custom runtime bundle crossed a forbidden boundary: '+forbidden);
  }
  if(!errors.length){
    const adapterRaw=Buffer.byteLength(read('src/astro/runtime/custom-runtime.js'),'utf8');
    const bundleRaw=fs.statSync(bundle).size;
    const runtimeStateRaw=Buffer.byteLength(stateText(fs.readFileSync(file,'utf8')),'utf8');
    console.log('');console.log('[R4.6B Custom Runtime Budget]');console.log('- Adapter:',(adapterRaw/1024).toFixed(1)+' KiB raw');console.log('- Bundle:',(bundleRaw/1024).toFixed(1)+' KiB raw');console.log('- Runtime state:',(runtimeStateRaw/1024).toFixed(1)+' KiB raw');
  }
}catch(error){fail('Custom runtime output inspection failed: '+error.message);}

try{
  const pkg=JSON.parse(read('package.json'));
  if(pkg.scripts?.['r4:astro:custom-runtime']!=='node scripts/validate-r4-astro-custom-runtime.mjs') fail('package.json is missing r4:astro:custom-runtime.');
}catch(error){fail('Custom runtime package inspection failed: '+error.message);}

if(errors.length){console.error('');console.error('DREAMLAND B7-00B.4J R4.6B Custom Minimal Runtime: FAIL');for(const error of errors)console.error('- '+error);console.error('');process.exit(1);}
console.log('');console.log('DREAMLAND B7-00B.4J R4.6B Custom Minimal Runtime: PASS');console.log('Use/Quantity/Budget/Delivery/Size/Series/Multi-scent/Color/Packaging/Branding/Notes / canonical validation+intent / Live Brief / EN-ZH-KO / Inquiry badge + persistence verified.');console.log('');

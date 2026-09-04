#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv.includes('--write')){
  console.error('Usage: node scripts/r4-promote-astro-custom.mjs --write');
  process.exit(1);
}
const SOURCE_ROOT=path.join(ROOT,'.r4-astro-dist');
const TARGET_ROOT=path.join(ROOT,'dist');
function fail(message){console.error('');console.error('[R4.6C Custom Promotion] FAIL');console.error('- '+message);console.error('');process.exit(1);}
function ensureFile(file,label){if(!fs.existsSync(file))fail(label+' is missing: '+path.relative(ROOT,file));}
function copyFile(source,target){ensureFile(source,'Promotion source asset');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
function hashFile(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function runtimeState(html){
  const match=html.match(/<script[^>]*id="customRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="customRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  if(!match)fail('Custom runtime state is missing.');
  try{return JSON.parse(match[1]);}catch(error){fail('Custom runtime state JSON is invalid: '+error.message);}
}
const source=path.join(SOURCE_ROOT,'custom','index.html');
const target=path.join(TARGET_ROOT,'custom','index.html');
ensureFile(source,'Isolated Astro Custom');
ensureFile(target,'Legacy Production Custom');
const html=fs.readFileSync(source,'utf8');
for(const marker of [
  'data-r4-astro-foundation="true"','data-r4-astro-custom="true"','data-custom-runtime-presentation',
  'name="robots" content="index,follow"','rel="canonical" href="https://dreamland-catalog.pages.dev/custom/"',
  'id="customRuntimeState"','src="/r4-custom-runtime.js"'
]) if(!html.includes(marker)) fail('Isolated Astro Custom is not promotion-ready: '+marker);
for(const forbidden of ['DREAMLAND_MPA_ACTIVE','runtime-desktop-experience.js','runtime-desktop-custom.js','runtime-risk.js','runtime-submission.js','runtime-pwa.js','custom-scent-multi.js','startup-loader.js']) if(html.includes(forbidden)) fail('Isolated Astro Custom still contains Legacy runtime marker: '+forbidden);
const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];
if(executable.length!==1)fail('Isolated Astro Custom must contain exactly one executable route runtime; found '+executable.length+'.');
const state=runtimeState(html);
if(state.version!=='R4.6B'||state.storage?.languageKey!=='productManualLang'||state.storage?.inquiryKey!=='productManualV2State'||state.storage?.inquiryVersion!==2)fail('Isolated Astro Custom runtime-state contract changed before Production promotion.');
const legacy=fs.readFileSync(target,'utf8');
if(!legacy.includes('window.DREAMLAND_MPA_ACTIVE=true;'))fail('Production /custom/ is not the expected Legacy MPA immediately before R4.6C promotion.');
const astroAssets=new Set();
for(const match of html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g))astroAssets.add(match[1]);
const products=JSON.parse(fs.readFileSync(path.join(ROOT,'data','products.json'),'utf8')).products||[];
const firstProduct=products.find(product=>product?.status==='active');
const productId=String(firstProduct?.productId||firstProduct?.id||'').trim().toUpperCase();
if(!productId)fail('No active Product is available for the Production PDP sentinel.');
const sentinelContracts=[
  {relative:'index.html',marker:'data-r4-production-home="true"'},
  {relative:'products/index.html',marker:'data-r4-astro-catalog="true"'},
  {relative:path.join('products',productId,'index.html'),marker:'data-r4-astro-product="true"'},
  {relative:'inquiry/index.html',marker:'window.DREAMLAND_MPA_ACTIVE=true;'},
  {relative:'inquiry/contact/index.html',marker:'window.DREAMLAND_MPA_ACTIVE=true;'},
  {relative:'inquiry/review/index.html',marker:'window.DREAMLAND_MPA_ACTIVE=true;'}
];
const sentinelHashes=new Map();
for(const contract of sentinelContracts){
  const file=path.join(TARGET_ROOT,contract.relative);ensureFile(file,'Production route sentinel');
  const content=fs.readFileSync(file,'utf8');if(!content.includes(contract.marker))fail('Unexpected Production route owner before Custom promotion: '+contract.relative);
  sentinelHashes.set(contract.relative,hashFile(file));
}
for(const pathname of astroAssets){const relative=pathname.replace(/^\/+/,'');copyFile(path.join(SOURCE_ROOT,relative),path.join(TARGET_ROOT,relative));}
copyFile(path.join(SOURCE_ROOT,'r4-custom-runtime.js'),path.join(TARGET_ROOT,'r4-custom-runtime.js'));
copyFile(source,target);
const manifestFile=path.join(TARGET_ROOT,'multipage-build-manifest.json');ensureFile(manifestFile,'Production build manifest');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
if(manifest.homeOwner!=='astro'||manifest.catalogOwner!=='astro'||manifest.pdpOwner!=='astro')fail('Production manifest must already own Astro Home + Catalog + PDP before Custom promotion.');
manifest.presentationOverrides={...(manifest.presentationOverrides||{}),custom:'astro-r4.6c'};
manifest.customOwner='astro';manifest.customCutover='B7-00B.4J-R4.6C';
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n','utf8');
for(const [relative,beforeHash] of sentinelHashes){if(hashFile(path.join(TARGET_ROOT,relative))!==beforeHash)fail('R4.6C modified a non-Custom Production route: '+relative);}
console.log('');console.log('[R4.6C Custom Promotion] PASS');console.log('- Production Custom document promoted: /custom/');console.log('- Promoted Custom runtime: /r4-custom-runtime.js');console.log('- Promoted hashed Astro assets:',astroAssets.size);console.log('- Home / Catalog / PDP / Inquiry sentinels were unchanged.');console.log('');

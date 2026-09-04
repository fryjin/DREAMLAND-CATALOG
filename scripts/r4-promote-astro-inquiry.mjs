#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv.includes('--write')){
  console.error('Usage: node scripts/r4-promote-astro-inquiry.mjs --write');
  process.exit(1);
}

const SOURCE_ROOT=path.join(ROOT,'.r4-astro-dist');
const TARGET_ROOT=path.join(ROOT,'dist');

function fail(message){console.error('');console.error('[R4.7C Inquiry Promotion] FAIL');console.error('- '+message);console.error('');process.exit(1);}
function ensureFile(file,label){if(!fs.existsSync(file))fail(label+' is missing: '+path.relative(ROOT,file));}
function copyFile(source,target){ensureFile(source,'Promotion source asset');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
function hashFile(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function runtimeState(html){
  const match=html.match(/<script[^>]*id="inquiryRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)||html.match(/<script[^>]*type="application\/json"[^>]*id="inquiryRuntimeState"[^>]*>([\s\S]*?)<\/script>/i);
  if(!match)fail('Inquiry runtime state is missing.');
  try{return JSON.parse(match[1]);}catch(error){fail('Inquiry runtime state JSON is invalid: '+error.message);}
}

const source=path.join(SOURCE_ROOT,'inquiry','index.html');
const target=path.join(TARGET_ROOT,'inquiry','index.html');
ensureFile(source,'Isolated Astro Inquiry');
ensureFile(target,'Legacy Production Inquiry');

const html=fs.readFileSync(source,'utf8');
for(const marker of [
  'data-r4-astro-foundation="true"',
  'data-r4-astro-inquiry="true"',
  'data-r4-inquiry-static="true"',
  'data-inquiry-runtime-presentation',
  'name="robots" content="noindex,nofollow"',
  'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/"',
  'id="inquiryRuntimeState"',
  'src="/r4-inquiry-runtime.js"'
]) if(!html.includes(marker))fail('Isolated Astro Inquiry is not promotion-ready: '+marker);

for(const forbidden of [
  'DREAMLAND_MPA_ACTIVE',
  'runtime-desktop-experience.js',
  'runtime-desktop-inquiry.js',
  'runtime-contact.js',
  'runtime-risk.js',
  'runtime-submission.js',
  'runtime-pwa.js',
  'runtime-inquiry-submission-flow.js',
  'hcaptcha',
  'startup-loader.js',
  'DreamlandContact',
  'DreamlandRisk',
  'DreamlandSubmission',
  'DreamlandInquirySubmissionFlow'
]) if(html.includes(forbidden))fail('Isolated Astro Inquiry crossed a Legacy/downstream boundary: '+forbidden);

const executable=[...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>/gi)];
if(executable.length!==1)fail('Isolated Astro Inquiry must contain exactly one executable route runtime; found '+executable.length+'.');

const state=runtimeState(html);
if(
  state.version!=='R4.7B'||
  state.storage?.languageKey!=='productManualLang'||
  state.storage?.inquiryKey!=='productManualV2State'||
  state.storage?.inquiryVersion!==2||
  state.routes?.contact!=='/inquiry/contact/'||
  state.products?.length!==89
) fail('Isolated Astro Inquiry runtime-state contract changed before Production promotion.');

const legacy=fs.readFileSync(target,'utf8');
if(!legacy.includes('window.DREAMLAND_MPA_ACTIVE=true;'))fail('Production /inquiry/ is not the expected Legacy MPA immediately before R4.7C promotion.');

const products=JSON.parse(fs.readFileSync(path.join(ROOT,'data','products.json'),'utf8')).products||[];
const activeProducts=products.filter(product=>product?.status==='active');
if(activeProducts.length!==89)fail('Expected 89 active Products for Production PDP sentinels; found '+activeProducts.length+'.');

const sentinelContracts=[
  {relative:'index.html',marker:'data-r4-production-home="true"'},
  {relative:'products/index.html',marker:'data-r4-astro-catalog="true"'},
  {relative:'custom/index.html',marker:'data-r4-astro-custom="true"'},
  {relative:'inquiry/contact/index.html',marker:'window.DREAMLAND_MPA_ACTIVE=true;'},
  {relative:'inquiry/review/index.html',marker:'window.DREAMLAND_MPA_ACTIVE=true;'},
  {relative:'inquiry/success/index.html',marker:'window.DREAMLAND_MPA_ACTIVE=true;'},
  {relative:'sw.js',marker:"const CACHE_VERSION = 'dreamland-pwa-v129';"}
];

for(const product of activeProducts){
  const productId=String(product?.productId||product?.id||'').trim().toUpperCase();
  if(!productId)fail('Active Product is missing an ID.');
  sentinelContracts.push({relative:path.join('products',productId,'index.html'),marker:'data-r4-astro-product="true"'});
}

const sentinelHashes=new Map();
for(const contract of sentinelContracts){
  const file=path.join(TARGET_ROOT,contract.relative);
  ensureFile(file,'Production route sentinel');
  const content=fs.readFileSync(file,'utf8');
  if(!content.includes(contract.marker))fail('Unexpected Production route owner before Inquiry promotion: '+contract.relative);
  sentinelHashes.set(contract.relative,hashFile(file));
}

const astroAssets=new Set();
for(const match of html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g))astroAssets.add(match[1]);
for(const pathname of astroAssets){
  const relative=pathname.replace(/^\/+/,'');
  copyFile(path.join(SOURCE_ROOT,relative),path.join(TARGET_ROOT,relative));
}

copyFile(path.join(SOURCE_ROOT,'r4-inquiry-runtime.js'),path.join(TARGET_ROOT,'r4-inquiry-runtime.js'));

let coverCount=0;
for(const product of state.products||[]){
  const cover=String(product?.cover||'').replace(/[?#].*$/,'');
  if(!cover)continue;
  const relative=cover.replace(/^\/+/,'');
  copyFile(path.join(SOURCE_ROOT,relative),path.join(TARGET_ROOT,relative));
  coverCount+=1;
}

copyFile(source,target);

const manifestFile=path.join(TARGET_ROOT,'multipage-build-manifest.json');
ensureFile(manifestFile,'Production build manifest');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
for(const [key,expected] of [['homeOwner','astro'],['catalogOwner','astro'],['pdpOwner','astro'],['customOwner','astro']]){
  if(manifest[key]!==expected)fail('Production manifest must already own Astro Home + Catalog + PDP + Custom before Inquiry promotion: '+key);
}
manifest.presentationOverrides={...(manifest.presentationOverrides||{}),inquiry:'astro-r4.7c'};
manifest.inquiryOwner='astro';
manifest.inquiryCutover='B7-00B.4J-R4.7C';
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n','utf8');

for(const [relative,beforeHash] of sentinelHashes){
  if(hashFile(path.join(TARGET_ROOT,relative))!==beforeHash)fail('R4.7C modified a non-Inquiry-selection Production route/asset: '+relative);
}

console.log('');
console.log('[R4.7C Inquiry Promotion] PASS');
console.log('- Production Inquiry selection promoted: /inquiry/');
console.log('- Promoted Inquiry runtime: /r4-inquiry-runtime.js');
console.log('- Promoted hashed Astro assets:',astroAssets.size);
console.log('- Guaranteed runtime Product covers:',coverCount);
console.log('- Home / Catalog / 89 PDPs / Custom / Contact / Review / Success / sw.js were unchanged.');
console.log('');

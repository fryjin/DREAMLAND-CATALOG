#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_ROOT=path.join(ROOT,'.r4-astro-dist');
const TARGET_ROOT=path.join(ROOT,'dist');
const WRITE=process.argv.includes('--write');

function fail(message){
  console.error('');
  console.error('DREAMLAND B7-00B.4J R4.9D Production Review Promotion: FAIL');
  console.error('- '+message);
  console.error('');
  process.exit(1);
}

function ensureDirectory(directory,label){
  if(!fs.existsSync(directory)||!fs.statSync(directory).isDirectory()||fs.lstatSync(directory).isSymbolicLink()){
    fail(label+' is missing, not a directory, or unsafe: '+path.relative(ROOT,directory));
  }
}

function ensureFile(file,label){
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()){
    fail(label+' is missing, not a regular file, or unsafe: '+path.relative(ROOT,file));
  }
}

function hashFile(file){
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function read(file){
  ensureFile(file,'Required file');
  return fs.readFileSync(file,'utf8');
}

function copyExact(source,target){
  ensureFile(source,'Astro Review asset');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(fs.existsSync(target)){
    if(fs.lstatSync(target).isSymbolicLink()||!fs.statSync(target).isFile()){
      fail('Production asset target is unsafe: '+path.relative(ROOT,target));
    }
    if(hashFile(source)!==hashFile(target)){
      fail('Production Astro asset collision has different bytes: '+path.relative(ROOT,target));
    }
    return;
  }
  fs.copyFileSync(source,target);
}

function referencedAstroAssets(html){
  return [...new Set([
    ...html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g)
  ].map(match=>match[1]))];
}

if(!WRITE){
  fail('Refusing to mutate dist/ without --write.');
}

ensureDirectory(SOURCE_ROOT,'Isolated Astro output');
ensureDirectory(TARGET_ROOT,'Production dist output');

const sourceReview=path.join(SOURCE_ROOT,'inquiry','review','index.html');
const targetReview=path.join(TARGET_ROOT,'inquiry','review','index.html');
const sourceRuntime=path.join(SOURCE_ROOT,'r4-review-runtime.js');
const targetRuntime=path.join(TARGET_ROOT,'r4-review-runtime.js');
const successFile=path.join(TARGET_ROOT,'inquiry','success','index.html');
const swFile=path.join(TARGET_ROOT,'sw.js');
const manifestFile=path.join(TARGET_ROOT,'multipage-build-manifest.json');

for(const [file,label] of [
  [sourceReview,'Isolated Astro Review HTML'],
  [sourceRuntime,'Isolated Astro Review runtime'],
  [targetReview,'Legacy Production Review HTML'],
  [successFile,'Legacy Production Success HTML'],
  [swFile,'Production Service Worker'],
  [manifestFile,'Production ownership manifest']
]) ensureFile(file,label);

const sourceHtml=read(sourceReview);
for(const marker of [
  'data-r4-astro-foundation="true"',
  'data-r4-astro-review="true"',
  'data-r4-review-static="true"',
  'data-review-runtime-presentation',
  'name="robots" content="noindex,nofollow"',
  'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/review/"',
  'id="reviewRuntimeState"',
  'src="/r4-review-runtime.js"'
]) if(!sourceHtml.includes(marker)) fail('Isolated Astro Review is missing cutover marker: '+marker);

for(const forbidden of [
  'DREAMLAND_MPA_ACTIVE',
  'runtime-desktop-experience.js',
  'runtime-desktop-review.js',
  'startup-loader.js'
]) if(sourceHtml.includes(forbidden)) fail('Isolated Astro Review still contains Legacy shell marker: '+forbidden);

if(!read(targetReview).includes('window.DREAMLAND_MPA_ACTIVE=true;')){
  fail('Production Review must still be Legacy immediately before R4.9D promotion.');
}
if(!read(successFile).includes('window.DREAMLAND_MPA_ACTIVE=true;')){
  fail('Production Success must remain Legacy before and after R4.9D.');
}

const runtime=read(sourceRuntime);
for(const marker of [
  '/* R4.9C owner: SubmissionPayload | src/domain/submission/runtime-submission-payload.js */',
  '/* R4.9C owner: Risk | src/services/risk/runtime-risk.js */',
  '/* R4.9C owner: Submission | src/services/submission/runtime-submission.js */',
  '/* R4.9C owner: Pwa | src/services/pwa/runtime-pwa.js */',
  '/* R4.9C owner: InquirySubmissionFlow | src/app/runtime-inquiry-submission-flow.js */',
  '/* R4.9C owner: Astro Review adapter | src/astro/runtime/review-runtime.js */',
  'globalThis.DREAMLAND_PWA_AUTO_REGISTER=false;',
  'delete globalThis.DREAMLAND_PWA_AUTO_REGISTER;',
  "const VERSION='R4.9C';"
]) if(!runtime.includes(marker)) fail('Isolated Review runtime lost R4.9C canonical boundary marker: '+marker);

const swBefore=hashFile(swFile);
const successBefore=hashFile(successFile);

const products=JSON.parse(fs.readFileSync(path.join(ROOT,'data','products.json'),'utf8')).products||[];
const activeProducts=products.filter(product=>product?.status==='active');
if(activeProducts.length!==89) fail('Expected 89 active Products for Production sentinels; found '+activeProducts.length+'.');

const sentinelContracts=[
  {relative:'index.html',marker:'data-r4-production-home="true"'},
  {relative:'products/index.html',marker:'data-r4-astro-catalog="true"'},
  {relative:'custom/index.html',marker:'data-r4-astro-custom="true"'},
  {relative:'inquiry/index.html',marker:'data-r4-astro-inquiry="true"'},
  {relative:'inquiry/contact/index.html',marker:'data-r4-astro-contact="true"'},
  {relative:'inquiry/success/index.html',marker:'window.DREAMLAND_MPA_ACTIVE=true;'},
  {relative:'sw.js',marker:"const CACHE_VERSION = 'dreamland-pwa-v129';"},
  {relative:'r4-home-runtime.js'},
  {relative:'r4-catalog-runtime.js'},
  {relative:'r4-pdp-runtime.js'},
  {relative:'r4-custom-runtime.js'},
  {relative:'r4-inquiry-runtime.js'},
  {relative:'r4-contact-runtime.js'}
];

for(const product of activeProducts){
  const productId=String(product?.productId||product?.id||'').trim().toUpperCase();
  if(!productId) fail('Active Product is missing an ID.');
  sentinelContracts.push({
    relative:path.join('products',productId,'index.html'),
    marker:'data-r4-astro-product="true"'
  });
}

const sentinelHashes=new Map();
for(const contract of sentinelContracts){
  const file=path.join(TARGET_ROOT,contract.relative);
  ensureFile(file,'Production route sentinel');
  if(contract.marker&&!fs.readFileSync(file,'utf8').includes(contract.marker)){
    fail('Unexpected Production route owner before Review promotion: '+contract.relative);
  }
  sentinelHashes.set(contract.relative,hashFile(file));
}

let manifest;
try{
  manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
}catch(error){
  fail('Production ownership manifest is invalid JSON: '+error.message);
}

for(const [key,expected] of [
  ['homeOwner','astro'],
  ['catalogOwner','astro'],
  ['pdpOwner','astro'],
  ['customOwner','astro'],
  ['inquiryOwner','astro'],
  ['contactOwner','astro']
]) if(manifest[key]!==expected) fail('Production ownership manifest prerequisite mismatch: '+key+'='+String(manifest[key]));

if(
  manifest.inquiryCutover!=='B7-00B.4J-R4.7C'||
  manifest.contactCutover!=='B7-00B.4J-R4.8C'||
  manifest.presentationOverrides?.inquiry!=='astro-r4.7c'||
  manifest.presentationOverrides?.contact!=='astro-r4.8c'
) fail('Production ownership manifest lost Inquiry/Contact cutover prerequisites.');

if(manifest.reviewOwner||manifest.reviewCutover||manifest.presentationOverrides?.review){
  fail('Production ownership manifest already contains Review cutover ownership.');
}

for(const href of referencedAstroAssets(sourceHtml)){
  const relative=href.replace(/^\/+/, '');
  copyExact(path.join(SOURCE_ROOT,relative),path.join(TARGET_ROOT,relative));
}

fs.copyFileSync(sourceRuntime,targetRuntime);
fs.mkdirSync(path.dirname(targetReview),{recursive:true});
fs.copyFileSync(sourceReview,targetReview);

manifest.presentationOverrides={...(manifest.presentationOverrides||{}),review:'astro-r4.9d'};
manifest.reviewOwner='astro';
manifest.reviewCutover='B7-00B.4J-R4.9D';
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n','utf8');

const promotedHtml=read(targetReview);
for(const marker of [
  'data-r4-astro-review="true"',
  'data-review-runtime-presentation',
  'id="reviewRuntimeState"',
  'src="/r4-review-runtime.js"'
]) if(!promotedHtml.includes(marker)) fail('Promoted Production Review is missing: '+marker);

if(promotedHtml.includes('DREAMLAND_MPA_ACTIVE')) fail('Promoted Production Review still contains the Legacy MPA marker.');
if(hashFile(sourceReview)!==hashFile(targetReview)) fail('Production Review HTML is not byte-identical to isolated Astro Review artifact.');
if(hashFile(sourceRuntime)!==hashFile(targetRuntime)) fail('Production Review runtime is not byte-identical to isolated R4.9C runtime artifact.');
if(hashFile(successFile)!==successBefore) fail('R4.9D unexpectedly changed Production Success.');
if(hashFile(swFile)!==swBefore) fail('R4.9D unexpectedly changed Production sw.js.');

for(const [relative,beforeHash] of sentinelHashes){
  if(hashFile(path.join(TARGET_ROOT,relative))!==beforeHash){
    fail('R4.9D changed a protected Production sentinel: '+relative);
  }
}

console.log('');
console.log('DREAMLAND B7-00B.4J R4.9D Production Review Promotion: PASS');
console.log('- /inquiry/review/ promoted from isolated Astro R4.9C artifact.');
console.log('- /inquiry/success/ remains Legacy MPA.');
console.log('- Home / Catalog / 89 PDPs / Custom / Inquiry / Contact / sw.js remained byte-identical.');
console.log('');

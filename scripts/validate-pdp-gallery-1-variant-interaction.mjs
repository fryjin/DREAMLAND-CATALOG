#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DIST=path.join(ROOT,'.r4-astro-dist');
const mode=process.argv.includes('--dist')?'dist':'source';
const errors=[];
const RUNTIME_BUDGET=36*1024;

function fail(message){errors.push(message);}
function read(relative){
  const file=path.join(ROOT,relative);
  if(!fs.existsSync(file)){fail('Missing required file: '+relative);return '';}
  return fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n');
}
function expect(content,marker,message){if(!content.includes(marker))fail(message+' Missing: '+marker);}

if(mode==='source'){
  const page=read('src/astro/components/product/PdpPage.astro');
  const runtime=read('src/astro/runtime/pdp-runtime.js');
  const css=read('src/astro/styles/pdp.css');
  const pkg=JSON.parse(read('package.json'));

  for(const marker of [
    'class="pdp-gallery__stage"','data-pdp-primary-image="true"','data-pdp-gallery-stage-image',
    'class="pdp-gallery__track"','data-pdp-gallery-track',
    'class="pdp-gallery__thumbs"','data-pdp-gallery-thumb',
    'data-pdp-gallery-src','defaultSizeDimension','data-pdp-size-summary'
  ]) expect(page,marker,'PDP-GALLERY-1 presentation contract changed.');

  for(const marker of [
    'function gallerySelect(','function galleryForSize(',
    'state.product.sizeImages?.[view.config.size]',
    "'[data-pdp-gallery-stage-image]'","'[data-pdp-gallery-thumb]'",
    "'[data-pdp-gallery-track]'",'track.scrollTo(',
    'button.dataset.pdpGalleryThumb',"dimension?' · '+dimension:''",'galleryForSize('
  ]) expect(runtime,marker,'PDP-GALLERY-1 runtime contract changed.');

  if(runtime.includes('function updatePrimaryForSize('))
    fail('PDP-GALLERY-1 must not mutate the canonical first gallery image for size changes.');

  if(Buffer.byteLength(runtime,'utf8')>RUNTIME_BUDGET)
    fail('PDP-GALLERY-1 runtime exceeds the canonical 36 KiB source budget.');

  const galleryStart=runtime.indexOf('function gallerySelect(');
  const galleryEnd=galleryStart>=0?runtime.indexOf('function render(',galleryStart):-1;
  const galleryLogic=galleryStart>=0&&galleryEnd>galleryStart?runtime.slice(galleryStart,galleryEnd):'';
  for(const forbidden of [
    'detail.setOption(','detail.setScent(','detail.setQuantity(',
    'pricing.','inquiry.','localStorage','sessionStorage'
  ]) if(galleryLogic.includes(forbidden)) fail('Gallery presentation must not own domain state: '+forbidden);

  for(const marker of [
    'PDP-GALLERY-1 — Gallery / Variant Interaction','@media (min-width:721px)',
    '.pdp-gallery__stage {','.pdp-gallery__track {','display:none;',
    '.pdp-gallery__thumbs {','overflow-x:auto;','.pdp-gallery__thumb.is-selected {',
    '@media (max-width:720px)','.pdp-gallery__stage,','.pdp-gallery__thumbs {',
    'scroll-snap-type:x mandatory;'
  ]) expect(css,marker,'PDP-GALLERY-1 responsive gallery styling changed.');

  if(pkg.scripts?.['r4:pdp:gallery-interaction']!=='node scripts/validate-pdp-gallery-1-variant-interaction.mjs --source'||
     pkg.scripts?.['r4:pdp:gallery-interaction:dist']!=='node scripts/validate-pdp-gallery-1-variant-interaction.mjs --dist')
    fail('package.json lost PDP-GALLERY-1 source/dist gates.');

  const validate=String(pkg.scripts?.validate||'');
  const polish=validate.indexOf('npm run r4:pdp:copy-visual-polish');
  const gallery=validate.indexOf('npm run r4:pdp:gallery-interaction');
  const frontend=validate.indexOf('npm run frontend:foundation');
  if(polish<0||gallery<=polish||frontend<=gallery)
    fail('PDP-GALLERY-1 source gate must run after PDP visual polish and before frontend foundation.');

  console.log('[PDP-GALLERY-1 Source Runtime Budget] '+Buffer.byteLength(runtime,'utf8')+' / '+RUNTIME_BUDGET+' bytes');
}else{
  const products=JSON.parse(read('data/products.json')).products.filter(p=>p?.status==='active');
  let checked=0;
  for(const product of products){
    const id=String(product?.productId||product?.id||'').trim().toUpperCase();
    const file=path.join(DIST,'products',id,'index.html');
    if(!fs.existsSync(file)){fail('PDP-GALLERY-1 dist is missing product: '+id);continue;}
    const html=fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n');
    for(const marker of [
      'data-pdp-primary-image="true"','data-pdp-gallery-stage-image','data-pdp-gallery-track','data-pdp-gallery-thumb',
      'data-pdp-gallery-src','data-pdp-size-summary'
    ]) if(!html.includes(marker)) fail(`PDP-GALLERY-1 dist ${id} missing ${marker}.`);
    checked++;
  }

  const bundle=path.join(DIST,'r4-pdp-runtime.js');
  if(!fs.existsSync(bundle)) fail('PDP-GALLERY-1 dist runtime bundle is missing.');
  else{
    const runtime=fs.readFileSync(bundle,'utf8').replace(/\r\n?/g,'\n');
    for(const marker of [
      'function gallerySelect(','function galleryForSize(',
      '[data-pdp-gallery-stage-image]','[data-pdp-gallery-track]','[data-pdp-gallery-thumb]'
    ]) if(!runtime.includes(marker)) fail('PDP-GALLERY-1 dist runtime missing: '+marker);
  }

  if(checked!==products.length||checked!==89)
    fail(`PDP-GALLERY-1 expected 89 active PDPs, checked ${checked}.`);
}

if(errors.length){
  console.error('\nPDP-GALLERY-1 GALLERY / VARIANT INTERACTION: FAIL\n');
  for(const error of errors) console.error('- '+error);
  console.error('');process.exit(1);
}
console.log('PDP-GALLERY-1 GALLERY / VARIANT INTERACTION: PASS');
console.log(mode==='source'
  ? 'Desktop frame + thumbnail rail / size→gallery projection / mobile size slide handoff / size dimensions verified.'
  : '89 built PDP gallery contracts + runtime bundle verified.');

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.argv.includes('--source');
const dist=process.argv.includes('--dist');
if(source===dist){
  console.error('Usage: node scripts/validate-f3-a2-inquiry-conversion-composition.mjs --source|--dist');
  process.exit(1);
}
const errors=[];
function fail(message){errors.push(message);}
function read(relative){
  return fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\\r\\n?/g,'\\n');
}
function json(relative){return JSON.parse(read(relative));}

if(source){
  try{
    const page=read('src/astro/components/inquiry/InquiryPage.astro');
    for(const marker of [
      'data-inquiry-conversion-composition="true"',
      'class="inquiry-summary__amount"',
      'data-inquiry-estimate-block',
      'data-inquiry-summary-value="estimate"'
    ]) if(!page.includes(marker)) fail('Inquiry composition shell is missing: '+marker);

    const rows=page.indexOf('class="inquiry-summary__rows"');
    const commercial=page.indexOf('class="inquiry-commercial-summary"');
    const amount=page.indexOf('class="inquiry-summary__amount"');
    const note=page.indexOf('class="inquiry-summary__note"');
    const cta=page.indexOf('class="inquiry-continue"');
    if(rows<0||commercial<=rows||amount<=commercial||note<=amount||cta<=note){
      fail('Hierarchy must remain Stats → Commercial Overview → Estimated Amount → Note → Continue.');
    }
    if(page.slice(rows,commercial).includes('data-inquiry-summary-value="estimate"')){
      fail('Estimated Amount returned to generic summary rows.');
    }
    if((page.match(/data-inquiry-bind="selectedProducts"/g)||[]).length!==1){
      fail('Duplicate Inquiry Items heading copy returned.');
    }
  }catch(error){fail('Inquiry shell validation failed: '+error.message);}

  try{
    const css=read('src/astro/styles/inquiry.css');
    for(const marker of [
      'F3-A2 — Inquiry Conversion Composition',
      '.inquiry-summary__amount {',
      'grid-template-columns:repeat(3,minmax(0,1fr));',
      '.inquiry-item__pricing > span:nth-child(3)',
      'aspect-ratio:4/5;',
      'font-size:16px;'
    ]) if(!css.includes(marker)) fail('Inquiry composition CSS is missing: '+marker);
  }catch(error){fail('Inquiry CSS validation failed: '+error.message);}

  try{
    const runtime=read('src/astro/runtime/inquiry-runtime.js');
    for(const marker of [
      "const VERSION='R4.7B'",
      "'productManualV2State'",
      '.setProductQuantity(',
      'let preserveMediaOnNextRender=false;',
      'preserveMediaOnNextRender=true;',
      'nextMedia.replaceWith('
    ]) if(!runtime.includes(marker)) fail('Canonical Inquiry behavior changed: '+marker);
    const bytes=Buffer.byteLength(runtime,'utf8');
    if(bytes>48*1024) fail('Inquiry runtime exceeds protected 48 KiB budget: '+bytes+' bytes.');
  }catch(error){fail('Inquiry runtime regression check failed: '+error.message);}

  try{
    const commercial=read('src/astro/runtime/inquiry-commercial-runtime.js');
    for(const marker of [
      "const VERSION='R4.11B4.1E-C3'",
      '.commercialSnapshot({',
      '.pricingGroupQuantity(',
      "'dreamland:inquiry-render'"
    ]) if(!commercial.includes(marker)) fail('Commercial ownership changed: '+marker);
  }catch(error){fail('Commercial regression check failed: '+error.message);}

  try{
    const promotion=read('scripts/r4-promote-astro-inquiry.mjs');
    if(!promotion.includes('data-inquiry-conversion-composition="true"')){
      fail('Production promotion does not guard the F3-A2 composition marker.');
    }
  }catch(error){fail('Production promotion guard check failed: '+error.message);}

  try{
    const pkg=json('package.json');
    if(pkg.scripts?.['r4:conversion:inquiry-composition']!=='node scripts/validate-f3-a2-inquiry-conversion-composition.mjs --source'){
      fail('package.json is missing r4:conversion:inquiry-composition.');
    }
    if(pkg.scripts?.['r4:conversion:inquiry-composition:dist']!=='node scripts/validate-f3-a2-inquiry-conversion-composition.mjs --dist'){
      fail('package.json is missing r4:conversion:inquiry-composition:dist.');
    }
    const validate=String(pkg.scripts?.validate||'');
    const ec4=validate.indexOf('npm run r4:commercial:closeout');
    const f3=validate.indexOf('npm run r4:conversion:inquiry-composition');
    const contact=validate.indexOf('npm run r4:astro:contact');
    if(ec4<0||f3<=ec4||contact<=f3) fail('F3-A2 source gate must run after Commercial Closeout and before Contact.');
    const build=String(pkg.scripts?.build||'');
    const ec4dist=build.indexOf('npm run r4:commercial:closeout:dist');
    const f3dist=build.indexOf('npm run r4:conversion:inquiry-composition:dist');
    if(ec4dist<0||f3dist<=ec4dist) fail('F3-A2 dist gate must run after Commercial Production Closeout.');
  }catch(error){fail('package gate topology failed: '+error.message);}
}

if(dist){
  try{
    for(const relative of ['.r4-astro-dist/inquiry/index.html','dist/inquiry/index.html']){
      const html=read(relative);
      for(const marker of [
        'data-inquiry-conversion-composition="true"',
        'class="inquiry-summary__amount"',
        'data-inquiry-estimate-block'
      ]) if(!html.includes(marker)) fail(relative+' is missing: '+marker);
    }
  }catch(error){fail('Production artifact validation failed: '+error.message);}
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F3-A2 INQUIRY CONVERSION COMPOSITION: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}
console.log('');
console.log('DREAMLAND F3-A2 INQUIRY CONVERSION COMPOSITION: PASS');
console.log(source
  ? 'Compact conversion hierarchy / mobile rail / standalone amount / canonical Inquiry + Commercial owners preserved.'
  : 'Isolated Astro + Production Inquiry preserve the F3-A2 conversion composition.');
console.log('');

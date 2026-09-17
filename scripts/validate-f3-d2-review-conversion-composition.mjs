#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.argv.includes('--source');
const dist=process.argv.includes('--dist');
if(source===dist){ console.error('use --source or --dist'); process.exit(1); }

const errors=[];
const fail=m=>errors.push(m);
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8').replace(/\r\n?/g,'\n');
const has=(l,s,ms)=>ms.forEach(m=>{if(!s.includes(m))fail(l+' missing: '+m);});
const hash=r=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,r))).digest('hex');

if(source){
  const page=read('src/astro/components/review/ReviewPage.astro');
  has('page',page,[
    'data-review-conversion-composition="true"',
    'hidden={optionalContactKeys.has(row.key)}',
    'data-review-product-quantity-summary',
    'data-review-total-quantity',
    'review-summary__reference',
    'data-review-static-notice hidden'
  ]);
  if(page.includes('class="review-notice"')) fail('visible duplicate notice still exists');

  const runtime=read('src/astro/runtime/review-runtime.js');
  has('runtime',runtime,[
    'function conciseProductPreview(',
    'optionalContactKeys',
    'data-review-product-quantity-summary',
    'data-review-total-quantity',
    'submissionPayload.build(',
    'risk.assess(',
    'submissionFlow.submit({'
  ]);
  if(runtime.includes('data-review-notice-index')) fail('obsolete notice index runtime remains');
  if(runtime.includes('fetch(')) fail('Review adapter absorbed transport ownership');

  const view=read('src/astro/lib/review-view-model.mjs');
  has('view',view,["'totalQuantity'","'dreamlandPendingInquiryIdV1'","'hasValidContact'"]);

  const css=read('src/astro/styles/review.css');
  has('css',css,[
    'F3-D2 — Review Conversion Composition',
    'font-size:clamp(38px,4.2vw,56px);',
    '.review-summary__reference',
    '-webkit-line-clamp:2;'
  ]);
  if(css.includes('.review-notice')) fail('obsolete review-notice CSS remains');

  const pkg=JSON.parse(read('package.json'));
  if(pkg.scripts?.['r4:conversion:review-composition']!=='node scripts/validate-f3-d2-review-conversion-composition.mjs --source') fail('missing source script');
  if(pkg.scripts?.['r4:conversion:review-composition:dist']!=='node scripts/validate-f3-d2-review-conversion-composition.mjs --dist') fail('missing dist script');
  const v=String(pkg.scripts?.validate||'');
  if(!(v.indexOf('r4:astro:review-submission')<v.indexOf('r4:conversion:review-composition')&&v.indexOf('r4:conversion:review-composition')<v.indexOf('r4:astro:success'))) fail('source gate order invalid');
}

if(dist){
  for(const [a,b] of [
    ['.r4-astro-dist/inquiry/review/index.html','dist/inquiry/review/index.html'],
    ['.r4-astro-dist/r4-review-runtime.js','dist/r4-review-runtime.js']
  ]){
    if(!fs.existsSync(path.join(ROOT,a))||!fs.existsSync(path.join(ROOT,b))){
      fail('artifact pair missing: '+a+' / '+b);
      continue;
    }
    if(hash(a)!==hash(b)) fail('artifact mismatch: '+b);
  }
  for(const r of ['.r4-astro-dist/inquiry/review/index.html','dist/inquiry/review/index.html']){
    if(!fs.existsSync(path.join(ROOT,r))) continue;
    const html=read(r);
    has(r,html,[
      'data-review-conversion-composition="true"',
      'data-review-product-quantity-summary',
      'data-review-total-quantity',
      'review-summary__reference',
      'data-review-static-notice'
    ]);
    if(html.includes('class="review-notice"')) fail(r+' visible duplicate notice remains');
    const fields=[...html.matchAll(/data-review-static-contact-field="([^"]+)"/g)].map(x=>x[1]);
    if(fields.length!==8) fail(r+' contact field count='+fields.length);
  }
  for(const r of ['.r4-astro-dist/r4-review-runtime.js','dist/r4-review-runtime.js']){
    if(!fs.existsSync(path.join(ROOT,r))) continue;
    has(r,read(r),['function conciseProductPreview(','data-review-total-quantity','submissionFlow.submit({']);
  }
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F3-D2 REVIEW CONVERSION COMPOSITION: FAIL');
  errors.forEach(e=>console.error('- '+e));
  console.error('');
  process.exit(1);
}
console.log('');
console.log('DREAMLAND F3-D2 REVIEW CONVERSION COMPOSITION: PASS');
console.log('');

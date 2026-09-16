#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url
      )
    ),
    '..'
  );

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs
    .readFileSync(
      path.join(
        ROOT,
        relative
      ),
      'utf8'
    )
    .replace(
      /\r\n?/g,
      '\n'
    );
}

try{
  const inquiryCss=
    read(
      'src/astro/styles/inquiry.css'
    );

  if(
    !/\.inquiry-item__qty input\s*\{[\s\S]*?font-size\s*:\s*16px\s*;/m
      .test(inquiryCss)
  ){
    fail(
      'Mobile Inquiry quantity input must remain at least 16px to prevent iOS Safari focus zoom.'
    );
  }

  const pdpCss=
    read(
      'src/astro/styles/pdp.css'
    );

  if(
    !/\.pdp-quantity input\s*\{[\s\S]*?font-size\s*:\s*16px\s*;/m
      .test(pdpCss)
  ){
    fail(
      'Mobile PDP quantity input must remain at least 16px to prevent iOS Safari focus zoom.'
    );
  }
}catch(error){
  fail(
    'Mobile quantity focus CSS validation failed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/inquiry-runtime.js'
    );

  for(const marker of [
    'let preserveMediaOnNextRender=false;',
    'preserveMediaOnNextRender=true;',
    "'.inquiry-item__media'",
    'nextMedia.replaceWith(',
    'preserveMediaOnNextRender=false;'
  ]){
    if(!runtime.includes(marker)){
      fail(
        'Inquiry quantity render-stability contract is missing: '+
        marker
      );
    }
  }

  if(
    !runtime.includes(
      'itemsNode.replaceChildren();'
    )
  ){
    fail(
      'Inquiry must keep the canonical full render path; FIX2 should preserve media rather than bypass pricing/view-model refresh.'
    );
  }

  const bytes=
    Buffer.byteLength(
      runtime,
      'utf8'
    );

  if(bytes>48*1024){
    fail(
      'Inquiry adapter exceeds protected 48 KiB budget after FIX2: '+
      bytes+
      ' bytes.'
    );
  }
}catch(error){
  fail(
    'Inquiry render-stability source validation failed: '+
    error.message
  );
}

try{
  const pkg=
    JSON.parse(
      read(
        'package.json'
      )
    );

  if(
    pkg.scripts
      ?.['r4:commercial:quantity-stability']!==
    'node scripts/validate-r4-11b4-1ec3-fix2c-mobile-quantity-stability.mjs'
  ){
    fail(
      'package.json is missing r4:commercial:quantity-stability.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const inquiry=
    validate.indexOf(
      'npm run r4:commercial:inquiry-projection'
    );

  const stability=
    validate.indexOf(
      'npm run r4:commercial:quantity-stability'
    );

  const contact=
    validate.indexOf(
      'npm run r4:astro:contact'
    );

  if(
    inquiry<0||
    stability<=inquiry||
    contact<=stability
  ){
    fail(
      'Quantity-stability gate must run after E-C3 Inquiry Projection and before Contact.'
    );
  }
}catch(error){
  fail(
    'Quantity-stability package validation failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND R4.11B4.1E-C3-FIX2C MOBILE QUANTITY / INQUIRY RENDER STABILITY: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+
      error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND R4.11B4.1E-C3-FIX2C MOBILE QUANTITY / INQUIRY RENDER STABILITY: PASS'
);
console.log(
  '16px mobile quantity focus controls / preserved Inquiry decoded media during quantity-only full renders / canonical pricing and commercial refresh / adapter budget verified.'
);
console.log('');

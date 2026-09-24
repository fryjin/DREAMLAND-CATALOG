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

const SOURCE_MODE=
  process.argv.includes('--source');

const DIST_MODE=
  process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error(
    'Usage: node scripts/validate-f3-b5-fix2r2-group-status-deduplication.mjs --source|--dist'
  );
  process.exit(1);
}

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs
    .readFileSync(
      path.join(ROOT,relative),
      'utf8'
    )
    .replace(/\r\n?/g,'\n');
}

function requireMarkers(label,source,markers){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(label+' is missing: '+marker);
    }
  }
}

function forbidMarkers(label,source,markers){
  for(const marker of markers){
    if(source.includes(marker)){
      fail(label+' still contains deprecated per-card group status: '+marker);
    }
  }
}

if(SOURCE_MODE){
  try{
    const core=
      read('src/astro/runtime/inquiry-runtime.js');

    requireMarkers(
      'Core Inquiry grouping/validation ownership',
      core,
      [
        '.commercialGroupKey(',
        '.productMoqGroups(',
        'inquiryMoqState',
        'inquiryMoqGroup',
        'function unmetGroups(',
        'inquiry-validation__row'
      ]
    );

    forbidMarkers(
      'Core Inquiry Product card',
      core,
      [
        'inquiry-item__moq-feedback',
        'inquiryMoqFeedback'
      ]
    );
  }catch(error){
    fail(
      'Core Inquiry de-dup validation failed: '+
      error.message
    );
  }

  try{
    const commercial=
      read('src/astro/runtime/inquiry-commercial-runtime.js');

    requireMarkers(
      'Group-level procurement status',
      commercial,
      [
        'F3-B5-FIX2R2 — Group Status De-duplication',
        'function renderGroupStatus(',
        'inquiry-quantity-group__status',
        'inquiryGroupStatus',
        'inquiryGroupState',
        '.commercialGroupKey(',
        '.productMoqGroups(',
        "'groupTotal'",
        "'moreToMoq'"
      ]
    );

    forbidMarkers(
      'Commercial Product-card status',
      commercial,
      [
        'function renderItemGroupStatus(',
        'inquiry-item__group-status'
      ]
    );

    if(
      !/renderGroupSections\(\s*projected,\s*moqGroups,\s*state,\s*language\s*\)/m
        .test(commercial)
    ){
      fail(
        'renderGroupSections must receive canonical MOQ groups once.'
      );
    }

    if(
      !/section\.append\(\s*header,\s*rule,\s*status,\s*body\s*\)/m
        .test(commercial)
    ){
      fail(
        'Group status must render once between group rule and Product cards.'
      );
    }
  }catch(error){
    fail(
      'Group-level status validation failed: '+
      error.message
    );
  }

  try{
    const css=
      read('src/astro/styles/inquiry.css');

    requireMarkers(
      'Group-level status CSS',
      css,
      [
        'F3-B5-FIX2R2 — Group Status De-duplication',
        '.inquiry-quantity-group__status',
        '[data-inquiry-group-state="unmet"]'
      ]
    );

    forbidMarkers(
      'Per-card duplicated status CSS',
      css,
      [
        '.inquiry-item__moq-feedback',
        '.inquiry-item__group-status'
      ]
    );
  }catch(error){
    fail(
      'Group-level CSS validation failed: '+
      error.message
    );
  }

  try{
    const b2=
      read('scripts/validate-f3-b2-inquiry-interaction-efficiency.mjs');

    forbidMarkers(
      'F3-B2 regression contract',
      b2,
      [
        "'inquiry-item__moq-feedback'",
        "'.inquiry-item__moq-feedback'"
      ]
    );

    requireMarkers(
      'F3-B2 regression contract',
      b2,
      [
        "'.commercialGroupKey('",
        "'inquiry-validation__row'"
      ]
    );
  }catch(error){
    fail(
      'F3-B2 regression contract validation failed: '+
      error.message
    );
  }

  try{
    const r1=
      read('scripts/validate-f3-b5-fix2r1-unified-grouping-visibility.mjs');

    requireMarkers(
      'FIX2R1 upgraded visibility contract',
      r1,
      [
        'function renderGroupStatus(',
        'inquiry-quantity-group__status',
        'inquiryGroupStatus'
      ]
    );

    forbidMarkers(
      'FIX2R1 upgraded visibility contract',
      r1,
      [
        'function renderItemGroupStatus(',
        'inquiry-item__group-status'
      ]
    );
  }catch(error){
    fail(
      'FIX2R1 contract upgrade failed: '+
      error.message
    );
  }

  try{
    const closeout=
      read('scripts/validate-f3-b5-interaction-closeout.mjs');

    requireMarkers(
      'Interaction Closeout group-level status',
      closeout,
      [
        'renderGroupStatus',
        '.inquiry-quantity-group__status',
        'inquiryGroupStatus'
      ]
    );

    forbidMarkers(
      'Interaction Closeout',
      closeout,
      [
        "'inquiry-item__moq-feedback'",
        "'.inquiry-item__moq-feedback'",
        "'.inquiry-item__group-status'"
      ]
    );
  }catch(error){
    fail(
      'Interaction Closeout de-dup contract failed: '+
      error.message
    );
  }

  try{
    const pkg=
      JSON.parse(read('package.json'));

    if(
      pkg.scripts?.['r4:conversion:group-status-dedup']!==
      'node scripts/validate-f3-b5-fix2r2-group-status-deduplication.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:group-status-dedup.'
      );
    }

    if(
      pkg.scripts?.['r4:conversion:group-status-dedup:dist']!==
      'node scripts/validate-f3-b5-fix2r2-group-status-deduplication.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:group-status-dedup:dist.'
      );
    }

    const validate=String(pkg.scripts?.validate||'');
    const visibility=
      validate.indexOf('npm run r4:conversion:grouping-visibility');
    const dedup=
      validate.indexOf('npm run r4:conversion:group-status-dedup');
    const closeout=
      validate.indexOf('npm run r4:conversion:interaction-closeout');

    if(
      visibility<0||
      dedup<=visibility||
      closeout<=dedup
    ){
      fail(
        'Source gate order must be FIX2R1 → FIX2R2 → Interaction Closeout.'
      );
    }

    const build=String(pkg.scripts?.build||'');
    const visibilityDist=
      build.indexOf('npm run r4:conversion:grouping-visibility:dist');
    const dedupDist=
      build.indexOf('npm run r4:conversion:group-status-dedup:dist');
    const closeoutDist=
      build.indexOf('npm run r4:conversion:interaction-closeout:dist');

    if(
      visibilityDist<0||
      dedupDist<=visibilityDist||
      closeoutDist<=dedupDist
    ){
      fail(
        'Production gate order must be FIX2R1 → FIX2R2 → Interaction Closeout.'
      );
    }
  }catch(error){
    fail(
      'Package topology validation failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  try{
    for(const relative of [
      '.r4-astro-dist/r4-inquiry-runtime.js',
      'dist/r4-inquiry-runtime.js'
    ]){
      const runtime=read(relative);

      requireMarkers(
        relative,
        runtime,
        [
          'F3-B5-FIX2R2 — Group Status De-duplication',
          'renderGroupStatus',
          'inquiry-quantity-group__status',
          'inquiryGroupStatus',
          'inquiryGroupState',
          '.commercialGroupKey(',
          '.productMoqGroups('
        ]
      );

      forbidMarkers(
        relative,
        runtime,
        [
          'inquiry-item__moq-feedback',
          'inquiryMoqFeedback',
          'renderItemGroupStatus',
          'inquiry-item__group-status'
        ]
      );
    }
  }catch(error){
    fail(
      'Production runtime de-dup validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-B5-FIX2R2 GROUP STATUS DE-DUPLICATION: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND F3-B5-FIX2R2 GROUP STATUS DE-DUPLICATION: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Shared MOQ progress renders exactly once per canonical Quantity Group; Product cards no longer repeat group-level status.'
    : 'Isolated Astro + Production Inquiry preserve one group-level procurement status with no per-card duplication.'
);
console.log('');

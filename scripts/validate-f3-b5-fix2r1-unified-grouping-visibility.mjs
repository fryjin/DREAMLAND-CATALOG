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
  process.argv.includes(
    '--source'
  );

const DIST_MODE=
  process.argv.includes(
    '--dist'
  );

if(SOURCE_MODE===DIST_MODE){
  console.error(
    'Usage: node scripts/validate-f3-b5-fix2r1-unified-grouping-visibility.mjs --source|--dist'
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

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function requireMarkers(
  label,
  source,
  markers
){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(
        label+
        ' is missing: '+
        marker
      );
    }
  }
}

if(SOURCE_MODE){
  try{
    const i18n=
      json(
        'data/i18n.json'
      );

    for(const language of [
      'en',
      'zh',
      'ko'
    ]){
      for(const key of [
        'quantityGroup',
        'quantityGroups',
        'quantityGroupRule',
        'groupTotal'
      ]){
        if(
          !String(
            i18n.ui
              ?.[language]
              ?.[key]||
            ''
          ).trim()
        ){
          fail(
            'Unified grouping visibility localization is missing: '+
            language+
            '.'+
            key
          );
        }
      }
    }
  }catch(error){
    fail(
      'Unified grouping localization validation failed: '+
      error.message
    );
  }

  try{
    const view=
      read(
        'src/astro/lib/inquiry-view-model.mjs'
      );

    for(const marker of [
      "'models'",
      "'quantityGroup'",
      "'quantityGroups'",
      "'quantityGroupRule'",
      "'groupTotal'"
    ]){
      if(!view.includes(marker)){
        fail(
          'Inquiry runtime state does not expose unified grouping copy: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'Unified grouping runtime-state projection failed: '+
      error.message
    );
  }

  try{
    const commercial=
      read(
        'src/astro/runtime/inquiry-commercial-runtime.js'
      );

    requireMarkers(
      'Unified grouping presentation',
      commercial,
      [
        'F3-B5-FIX2R1 — Unified Grouping Visibility',
        'function renderGroupSections(',
        'function renderGroupStatus(',
        '.commercialGroupKey(',
        '.productMoqGroups(',
        '.pricingGroupQuantity(',
        'inquiry-quantity-group',
        'inquiryQuantityGroup',
        'inquiry-quantity-group__status',
        'inquiryGroupStatus',
        "'quantityGroup'",
        "'quantityGroups'",
        "'quantityGroupRule'",
        "'groupTotal'"
      ]
    );

    for(const forbidden of [
      'function commercialGroupKey(',
      'function productMoqGroups(',
      'function pricingGroupQuantity('
    ]){
      if(commercial.includes(forbidden)){
        fail(
          'Grouping visibility must consume canonical owners instead of forking them: '+
          forbidden
        );
      }
    }

    const runtimeSources=[
      'src/domain/pricing/runtime-pricing-policy.js',
      'src/features/inquiry/runtime-inquiry.js',
      'src/astro/runtime/inquiry-commercial-runtime.js',
      'src/astro/runtime/inquiry-runtime.js'
    ];

    const projected=
      runtimeSources.reduce(
        (
          total,
          relative
        )=>
          total+
          Buffer.byteLength(
            read(relative),
            'utf8'
          ),
        0
      )+
      3*
      Buffer.byteLength(
        '\n;\n',
        'utf8'
      )+
      1;

    if(projected>112*1024){
      fail(
        'Projected Inquiry runtime bundle exceeds protected 112 KiB: '+
        projected+
        ' bytes.'
      );
    }
  }catch(error){
    fail(
      'Unified grouping presentation contract failed: '+
      error.message
    );
  }

  try{
    const inquiry=
      read(
        'src/features/inquiry/runtime-inquiry.js'
      );

    requireMarkers(
      'Canonical commercial quantity group',
      inquiry,
      [
        'function commercialGroupKey(',
        'function productMoqGroups(',
        'function pricingGroupQuantity(',
        'commercialGroupKey,'
      ]
    );
  }catch(error){
    fail(
      'Canonical unified group owner validation failed: '+
      error.message
    );
  }

  try{
    const css=
      read(
        'src/astro/styles/inquiry.css'
      );

    requireMarkers(
      'Unified grouping visibility CSS',
      css,
      [
        'F3-B5-FIX2R1 — Unified Grouping Visibility',
        '.inquiry-quantity-group',
        '.inquiry-quantity-group__header',
        '.inquiry-quantity-group__body',
        '.inquiry-quantity-group__status'
      ]
    );
  }catch(error){
    fail(
      'Unified grouping CSS validation failed: '+
      error.message
    );
  }

  try{
    const promotion=
      read(
        'scripts/r4-promote-astro-inquiry.mjs'
      );

    for(const marker of [
      "'inquiryQuantityGroup'",
      "'inquiryGroupStatus'",
      "'renderGroupSections'"
    ]){
      if(!promotion.includes(marker)){
        fail(
          'Production Inquiry promotion does not protect unified grouping visibility: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'Unified grouping promotion validation failed: '+
      error.message
    );
  }

  try{
    const pkg=
      json(
        'package.json'
      );

    if(
      pkg.scripts
        ?.['r4:conversion:grouping-visibility']!==
      'node scripts/validate-f3-b5-fix2r1-unified-grouping-visibility.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:grouping-visibility.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:grouping-visibility:dist']!==
      'node scripts/validate-f3-b5-fix2r1-unified-grouping-visibility.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:grouping-visibility:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    const unified=
      validate.indexOf(
        'npm run r4:conversion:unified-commercial-group'
      );

    const visibility=
      validate.indexOf(
        'npm run r4:conversion:grouping-visibility'
      );

    const closeout=
      validate.indexOf(
        'npm run r4:conversion:interaction-closeout'
      );

    if(
      unified<0||
      visibility<=unified||
      closeout<=visibility
    ){
      fail(
        'Grouping visibility source gate must run after RULE1 and before F3-B5 closeout.'
      );
    }

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    const unifiedDist=
      build.indexOf(
        'npm run r4:conversion:unified-commercial-group:dist'
      );

    const visibilityDist=
      build.indexOf(
        'npm run r4:conversion:grouping-visibility:dist'
      );

    const closeoutDist=
      build.indexOf(
        'npm run r4:conversion:interaction-closeout:dist'
      );

    if(
      unifiedDist<0||
      visibilityDist<=unifiedDist||
      closeoutDist<=visibilityDist
    ){
      fail(
        'Grouping visibility Production gate must run after RULE1 and before F3-B5 Production closeout.'
      );
    }
  }catch(error){
    fail(
      'Unified grouping package topology failed: '+
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
      const runtime=
        read(
          relative
        );

      requireMarkers(
        relative,
        runtime,
        [
          'F3-B5-FIX2R1 — Unified Grouping Visibility',
          'renderGroupSections',
          'renderGroupStatus',
          'inquiryQuantityGroup',
          'inquiryGroupStatus',
          '.commercialGroupKey(',
          '.productMoqGroups('
        ]
      );
    }
  }catch(error){
    fail(
      'Production unified grouping runtime validation failed: '+
      error.message
    );
  }

  try{
    for(const relative of [
      '.r4-astro-dist/inquiry/index.html',
      'dist/inquiry/index.html'
    ]){
      const html=
        read(
          relative
        );

      for(const value of [
        'Quantity groups',
        '合并计数组',
        '수량 합산 그룹'
      ]){
        if(!html.includes(value)){
          fail(
            relative+
            ' runtime state is missing localized grouping copy: '+
            value
          );
        }
      }
    }
  }catch(error){
    fail(
      'Production unified grouping localization validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-B5-FIX2R1 UNIFIED GROUPING VISIBILITY: FAIL'
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
  'DREAMLAND F3-B5-FIX2R1 UNIFIED GROUPING VISIBILITY: PASS'
);

console.log(
  SOURCE_MODE
    ? 'Canonical commercial groups are visible as left-side Product sections, one group-level status and right-side Quantity Groups without duplicating grouping logic.'
    : 'Isolated Astro + Production Inquiry preserve unified grouping visibility and EN/ZH/KO copy.'
);

console.log('');

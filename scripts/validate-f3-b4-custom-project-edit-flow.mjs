#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';

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
    'Usage: node scripts/validate-f3-b4-custom-project-edit-flow.mjs --source|--dist'
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
        'editConfig',
        'saveChanges'
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
            'F3-B4 localization is missing: '+
            language+
            '.'+
            key
          );
        }
      }
    }
  }catch(error){
    fail(
      'F3-B4 localization validation failed: '+
      error.message
    );
  }

  try{
    const inquiryRuntime=
      read(
        'src/astro/runtime/inquiry-runtime.js'
      );

    for(const marker of [
      'F3-B4 — Custom Project Edit Flow',
      'function customEditHref(',
      'inquiryCustomEditProject',
      "'/custom/'",
      "'?edit='"
    ]){
      if(
        !inquiryRuntime.includes(
          marker
        )
      ){
        fail(
          'Inquiry Custom edit entry is missing: '+
          marker
        );
      }
    }

    const bytes=
      Buffer.byteLength(
        inquiryRuntime,
        'utf8'
      );

    if(bytes>48*1024){
      fail(
        'Inquiry adapter exceeded protected 48 KiB budget: '+
        bytes+
        ' bytes.'
      );
    }
  }catch(error){
    fail(
      'F3-B4 Inquiry entry validation failed: '+
      error.message
    );
  }

  try{
    const customView=
      read(
        'src/astro/lib/custom-view-model.mjs'
      );

    for(const marker of [
      'saveChanges',
      'updatedInquiry',
      'ui:Object.freeze'
    ]){
      if(
        !customView.includes(
          marker
        )
      ){
        fail(
          'Custom runtime-state edit copy projection is missing: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'F3-B4 Custom runtime-state projection validation failed: '+
      error.message
    );
  }

  try{
    const customRuntime=
      read(
        'src/astro/runtime/custom-runtime.js'
      );

    for(const marker of [
      'F3-B4 — Custom Project Edit Flow',
      'requestedEditId',
      'editDraftFromItem',
      'hydrateEditSelection',
      'editItemId',
      '.findItem(',
      '.replaceItem(',
      '.persist()',
      'customInquiryEdit',
      'customEditSave',
      'saveChanges'
    ]){
      if(
        !customRuntime.includes(
          marker
        )
      ){
        fail(
          'Custom edit runtime is missing: '+
          marker
        );
      }
    }

    for(const retained of [
      '.addCustom(',
      '.validateDraft(',
      '.buildIntent(',
      '.setSeries(',
      '.toggleScent('
    ]){
      if(
        !customRuntime.includes(
          retained
        )
      ){
        fail(
          'Normal Custom create flow/canonical delegation was lost: '+
          retained
        );
      }
    }

    const bytes=
      Buffer.byteLength(
        customRuntime,
        'utf8'
      );

    if(bytes>36*1024){
      fail(
        'Custom adapter exceeded protected 36 KiB budget: '+
        bytes+
        ' bytes.'
      );
    }
  }catch(error){
    fail(
      'F3-B4 Custom runtime validation failed: '+
      error.message
    );
  }

  try{
    const feature=
      read(
        'src/features/custom/runtime-custom.js'
      );

    const inquiry=
      read(
        'src/features/inquiry/runtime-inquiry.js'
      );

    for(const marker of [
      'function setSeries(',
      'function toggleScent(',
      'function buildIntent(',
      'setSeries,',
      'toggleScent,',
      'buildIntent'
    ]){
      if(
        !feature.includes(
          marker
        )
      ){
        fail(
          'Canonical Custom owner is missing: '+
          marker
        );
      }
    }

    for(const marker of [
      'function findItem(',
      'function replaceItem(',
      'findItem,',
      'replaceItem,'
    ]){
      if(
        !inquiry.includes(
          marker
        )
      ){
        fail(
          'Canonical Inquiry edit owner is missing: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'F3-B4 canonical owner validation failed: '+
      error.message
    );
  }

  try{
    const customFeature=
      read(
        'src/features/custom/runtime-custom.js'
      );

    const inquiryFeature=
      read(
        'src/features/inquiry/runtime-inquiry.js'
      );

    const customAdapter=
      read(
        'src/astro/runtime/custom-runtime.js'
      );

    const projectedBundle=
      Buffer.byteLength(
        customFeature,
        'utf8'
      )+
      Buffer.byteLength(
        inquiryFeature,
        'utf8'
      )+
      Buffer.byteLength(
        customAdapter,
        'utf8'
      )+
      2*
      Buffer.byteLength(
        '\n;\n',
        'utf8'
      )+
      1;

    if(projectedBundle>104*1024){
      fail(
        'F3-B4 projected Custom bundle exceeds protected 104 KiB: '+
        projectedBundle+
        ' bytes.'
      );
    }
  }catch(error){
    fail(
      'F3-B4 Custom bundle budget validation failed: '+
      error.message
    );
  }

  try{
    const inquiryPromotion=
      read(
        'scripts/r4-promote-astro-inquiry.mjs'
      );

    for(const marker of [
      "'inquiryCustomEditProject'",
      "'customEditHref'"
    ]){
      if(
        !inquiryPromotion.includes(
          marker
        )
      ){
        fail(
          'Inquiry Production promotion does not protect F3-B4: '+
          marker
        );
      }
    }

    const customPromotion=
      read(
        'scripts/r4-promote-astro-custom.mjs'
      );

    for(const marker of [
      "'customInquiryEdit'",
      "'.findItem('",
      "'.replaceItem('",
      "'customEditSave'"
    ]){
      if(
        !customPromotion.includes(
          marker
        )
      ){
        fail(
          'Custom Production promotion does not protect F3-B4: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'F3-B4 Production promotion validation failed: '+
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
        ?.['r4:conversion:custom-edit']!==
      'node scripts/validate-f3-b4-custom-project-edit-flow.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:custom-edit.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:custom-edit:dist']!==
      'node scripts/validate-f3-b4-custom-project-edit-flow.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:custom-edit:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    const productEdit=
      validate.indexOf(
        'npm run r4:conversion:product-edit'
      );

    const customEdit=
      validate.indexOf(
        'npm run r4:conversion:custom-edit'
      );

    const contact=
      validate.indexOf(
        'npm run r4:astro:contact'
      );

    if(
      productEdit<0||
      customEdit<=productEdit||
      contact<=customEdit
    ){
      fail(
        'F3-B4 source gate must run after F3-B3 and before Contact.'
      );
    }

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    const productEditDist=
      build.indexOf(
        'npm run r4:conversion:product-edit:dist'
      );

    const customEditDist=
      build.indexOf(
        'npm run r4:conversion:custom-edit:dist'
      );

    if(
      productEditDist<0||
      customEditDist<=
      productEditDist
    ){
      fail(
        'F3-B4 Production gate must run after F3-B3 Production edit gate.'
      );
    }
  }catch(error){
    fail(
      'F3-B4 package topology validation failed: '+
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

      for(const marker of [
        'customEditHref',
        'inquiryCustomEditProject',
        "'?edit='"
      ]){
        if(
          !runtime.includes(
            marker
          )
        ){
          fail(
            relative+
            ' lost F3-B4 Inquiry custom-edit entry: '+
            marker
          );
        }
      }
    }

    for(const relative of [
      '.r4-astro-dist/r4-custom-runtime.js',
      'dist/r4-custom-runtime.js'
    ]){
      const runtime=
        read(
          relative
        );

      for(const marker of [
        'F3-B4 — Custom Project Edit Flow',
        'requestedEditId',
        '.findItem(',
        '.replaceItem(',
        'customInquiryEdit',
        'customEditSave'
      ]){
        if(
          !runtime.includes(
            marker
          )
        ){
          fail(
            relative+
            ' lost F3-B4 Custom edit behavior: '+
            marker
          );
        }
      }
    }
  }catch(error){
    fail(
      'F3-B4 Production artifact validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-B4 CUSTOM PROJECT EDIT FLOW: FAIL'
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
  'DREAMLAND F3-B4 CUSTOM PROJECT EDIT FLOW: PASS'
);

console.log(
  SOURCE_MODE
    ? 'Inquiry Custom edit entry / existing draft hydration / canonical Custom selection / ID-preserving replaceItem save / create-flow preservation / budgets verified.'
    : 'Isolated Astro + Production Inquiry/Custom runtimes preserve the F3-B4 edit flow.'
);

console.log('');

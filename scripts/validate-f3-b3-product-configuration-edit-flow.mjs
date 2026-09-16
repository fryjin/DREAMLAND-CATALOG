#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
  pathToFileURL
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
    'Usage: node scripts/validate-f3-b3-product-configuration-edit-flow.mjs --source|--dist'
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
            'F3-B3 localization is missing: '+
            language+
            '.'+
            key
          );
        }
      }
    }
  }catch(error){
    fail(
      'F3-B3 localization validation failed: '+
      error.message
    );
  }

  try{
    const inquiryView=
      read(
        'src/astro/lib/inquiry-view-model.mjs'
      );

    const pdpView=
      read(
        'src/astro/lib/pdp-view-model.mjs'
      );

    if(
      !/compactUi[\s\S]*?'editConfig'/m
        .test(
          inquiryView
        )
    ){
      fail(
        'Inquiry runtime state must expose ui.editConfig.'
      );
    }

    if(
      !/compactUi[\s\S]*?'saveChanges'/m
        .test(
          pdpView
        )
    ){
      fail(
        'PDP runtime state must expose ui.saveChanges.'
      );
    }
  }catch(error){
    fail(
      'F3-B3 runtime-state projection validation failed: '+
      error.message
    );
  }

  try{
    const inquiryRuntime=
      read(
        'src/astro/runtime/inquiry-runtime.js'
      );

    for(const marker of [
      'F3-B3 — Product Configuration Edit Flow',
      'inquiry-item__edit',
      'inquiryEditConfiguration',
      "'/?edit='"
    ]){
      if(
        !inquiryRuntime.includes(
          marker
        )
      ){
        fail(
          'Inquiry product-edit entry is missing: '+
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
      'F3-B3 Inquiry entry validation failed: '+
      error.message
    );
  }

  try{
    const editRuntime=
      read(
        'src/astro/runtime/pdp-inquiry-edit-runtime.js'
      );

    for(const marker of [
      "const VERSION='F3-B3'",
      "searchParams.get(",
      "'edit'",
      '.openItem(',
      '.replaceItem(',
      '.mergeDuplicateProducts(',
      '.persist()',
      "pdpUi=",
      "'saveChanges'",
      "location.assign("
    ]){
      if(
        !editRuntime.includes(
          marker
        )
      ){
        fail(
          'PDP edit runtime is missing: '+
          marker
        );
      }
    }

    if(
      Buffer.byteLength(
        editRuntime,
        'utf8'
      )>
      8*1024
    ){
      fail(
        'PDP Inquiry Edit runtime exceeded its 8 KiB route utility budget.'
      );
    }

    const pdpAdapter=
      read(
        'src/astro/runtime/pdp-runtime.js'
      );

    if(
      Buffer.byteLength(
        pdpAdapter,
        'utf8'
      )>
      36*1024
    ){
      fail(
        'Protected PDP adapter exceeded 36 KiB.'
      );
    }

    if(
      pdpAdapter.includes(
        'F3-B3'
      )||
      pdpAdapter.includes(
        'searchParams.get'
      )
    ){
      fail(
        'F3-B3 edit-mode orchestration leaked into the protected PDP adapter.'
      );
    }
  }catch(error){
    fail(
      'F3-B3 PDP edit-runtime boundary validation failed: '+
      error.message
    );
  }

  try{
    delete globalThis
      .DreamlandPdpInquiryEdit;

    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/astro/runtime/pdp-inquiry-edit-runtime.js'
        )
      ).href+
      '?f3b3='+
      Date.now()
    );

    const runtime=
      globalThis
        .DreamlandPdpInquiryEdit;

    if(
      !runtime||
      runtime.version!==
        'F3-B3'||
      runtime.mount()!==
        null
    ){
      fail(
        'F3-B3 PDP edit runtime must remain Node-safe.'
      );
    }else{
      const item=
        runtime.buildItem(
          {
            product:{
              id:'ADV001',
              series:'advanced',
              name:'A',
              names:{
                en:'A'
              },
              cover:'/a.webp'
            }
          },
          {
            pricing:{
              moq:100
            },
            config:{
              size:'M',
              scentSeries:'',
              scentId:'S1',
              scent:'Scent',
              pattern:'P2',
              pack:'Gift',
              qty:120
            }
          },
          'existing-item-id'
        );

      if(
        item.id!==
          'existing-item-id'||
        item.productId!==
          'ADV001'||
        item.size!==
          'M'||
        item.qty!==
          120
      ){
        fail(
          'F3-B3 edit projection must preserve the existing item ID and edited canonical configuration.'
        );
      }
    }
  }catch(error){
    fail(
      'F3-B3 Node-safe edit projection failed: '+
      error.message
    );
  }

  try{
    const detail=
      read(
        'src/features/detail/runtime-detail.js'
      );

    const inquiry=
      read(
        'src/features/inquiry/runtime-inquiry.js'
      );

    for(const marker of [
      'function openItem(',
      'openItem,'
    ]){
      if(
        !detail.includes(
          marker
        )
      ){
        fail(
          'Canonical Detail edit hydration is missing: '+
          marker
        );
      }
    }

    for(const marker of [
      'function replaceItem(',
      'function mergeDuplicateProducts(',
      'replaceItem,',
      'mergeDuplicateProducts,'
    ]){
      if(
        !inquiry.includes(
          marker
        )
      ){
        fail(
          'Canonical Inquiry edit ownership is missing: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'F3-B3 canonical owner validation failed: '+
      error.message
    );
  }

  try{
    const copyScript=
      read(
        'scripts/r4-copy-astro-pdp-assets.mjs'
      );

    const adapter=
      copyScript.indexOf(
        "'pdp-runtime.js'"
      );

    const edit=
      copyScript.indexOf(
        "'pdp-inquiry-edit-runtime.js'"
      );

    if(
      adapter<0||
      edit<=adapter
    ){
      fail(
        'PDP Inquiry Edit runtime must be bundled immediately after the base PDP adapter.'
      );
    }

    const bundleSources=[
      'src/features/detail/runtime-detail.js',
      'src/domain/pricing/runtime-pricing-policy.js',
      'src/features/inquiry/runtime-inquiry.js',
      'src/astro/runtime/pdp-commercial-runtime.js',
      'src/astro/runtime/pdp-runtime.js',
      'src/astro/runtime/pdp-inquiry-edit-runtime.js'
    ];

    const raw=
      bundleSources
        .reduce(
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
      (
        bundleSources.length-
        1
      )*
      Buffer.byteLength(
        '\n;\n',
        'utf8'
      )+
      1;

    if(raw>104*1024){
      fail(
        'F3-B3 projected PDP bundle exceeds protected 104 KiB: '+
        raw+
        ' bytes.'
      );
    }
  }catch(error){
    fail(
      'F3-B3 PDP bundle topology validation failed: '+
      error.message
    );
  }

  try{
    const inquiryPromotion=
      read(
        'scripts/r4-promote-astro-inquiry.mjs'
      );

    for(const marker of [
      "'inquiry-item__edit'",
      "\"'/?edit='\""
    ]){
      if(
        !inquiryPromotion.includes(
          marker
        )
      ){
        fail(
          'Inquiry Production promotion does not protect F3-B3: '+
          marker
        );
      }
    }

    const pdpPromotion=
      read(
        'scripts/r4-promote-astro-pdp.mjs'
      );

    for(const marker of [
      "'DreamlandPdpInquiryEdit'",
      "'.openItem('",
      "'.replaceItem('",
      "'.mergeDuplicateProducts('"
    ]){
      if(
        !pdpPromotion.includes(
          marker
        )
      ){
        fail(
          'PDP Production promotion does not protect F3-B3: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'F3-B3 Production promotion validation failed: '+
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
        ?.['r4:conversion:product-edit']!==
      'node scripts/validate-f3-b3-product-configuration-edit-flow.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:product-edit.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:product-edit:dist']!==
      'node scripts/validate-f3-b3-product-configuration-edit-flow.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:product-edit:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    const interaction=
      validate.indexOf(
        'npm run r4:conversion:inquiry-interaction'
      );

    const productEdit=
      validate.indexOf(
        'npm run r4:conversion:product-edit'
      );

    const contact=
      validate.indexOf(
        'npm run r4:astro:contact'
      );

    if(
      interaction<0||
      productEdit<=interaction||
      contact<=productEdit
    ){
      fail(
        'F3-B3 source gate must run after F3-B2 and before Contact.'
      );
    }

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    const interactionDist=
      build.indexOf(
        'npm run r4:conversion:inquiry-interaction:dist'
      );

    const productEditDist=
      build.indexOf(
        'npm run r4:conversion:product-edit:dist'
      );

    if(
      interactionDist<0||
      productEditDist<=
      interactionDist
    ){
      fail(
        'F3-B3 Production gate must run after F3-B2 Production interaction gate.'
      );
    }
  }catch(error){
    fail(
      'F3-B3 package topology validation failed: '+
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
        'inquiry-item__edit',
        'inquiryEditConfiguration',
        "'/?edit='"
      ]){
        if(
          !runtime.includes(
            marker
          )
        ){
          fail(
            relative+
            ' lost F3-B3 Inquiry edit entry: '+
            marker
          );
        }
      }
    }

    for(const relative of [
      '.r4-astro-dist/r4-pdp-runtime.js',
      'dist/r4-pdp-runtime.js'
    ]){
      const runtime=
        read(
          relative
        );

      for(const marker of [
        "const VERSION='F3-B3'",
        'DreamlandPdpInquiryEdit',
        '.openItem(',
        '.replaceItem(',
        '.mergeDuplicateProducts(',
        "'saveChanges'"
      ]){
        if(
          !runtime.includes(
            marker
          )
        ){
          fail(
            relative+
            ' lost F3-B3 PDP edit runtime: '+
            marker
          );
        }
      }
    }
  }catch(error){
    fail(
      'F3-B3 Production artifact validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-B3 PRODUCT CONFIGURATION EDIT FLOW: FAIL'
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
  'DREAMLAND F3-B3 PRODUCT CONFIGURATION EDIT FLOW: PASS'
);

console.log(
  SOURCE_MODE
    ? 'Inquiry edit entry / PDP canonical openItem hydration / ID-preserving replaceItem save / duplicate merge / adapter and bundle budgets verified.'
    : 'Isolated Astro + Production Inquiry/PDP runtimes preserve the F3-B3 edit flow.'
);

console.log('');

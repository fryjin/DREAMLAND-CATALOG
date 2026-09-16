#!/usr/bin/env node
import crypto from 'node:crypto';
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
    'Usage: node scripts/validate-f3-b5-interaction-closeout.mjs --source|--dist'
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

function hash(relative){
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(
        path.join(
          ROOT,
          relative
        )
      )
    )
    .digest('hex');
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
  /*
   * F3-A2 + F3-B2 shell must remain intact.
   */
  try{
    const page=
      read(
        'src/astro/components/inquiry/InquiryPage.astro'
      );

    requireMarkers(
      'Inquiry closeout shell',
      page,
      [
        'data-inquiry-conversion-composition="true"',
        'data-inquiry-interaction-efficiency="true"',
        'data-inquiry-validation',
        'data-inquiry-summary-value="estimate"'
      ]
    );
  }catch(error){
    fail(
      'Inquiry shell closeout failed: '+
      error.message
    );
  }

  /*
   * Quantity / MOQ / Remove / Clear / Continue interaction contract.
   */
  try{
    const runtime=
      read(
        'src/astro/runtime/inquiry-runtime.js'
      );

    requireMarkers(
      'Inquiry interaction runtime',
      runtime,
      [
        'function unmetGroups(',
        '.productMoqGroups(',
        'inquiry-item__moq-feedback',
        'inquiry-validation__row',
        'minus.disabled=',
        'plus.disabled=',
        '.setProductQuantity(',
        'preserveMediaOnNextRender=true;',
        'nextMedia.replaceWith(',
        'root.confirm(',
        '.removeItem(',
        '.clearItems(',
        'state.routes.contact',
        'function productEditHref(',
        'inquiryEditConfiguration',
        'function customEditHref(',
        'inquiryCustomEditProject'
      ]
    );

    const bytes=
      Buffer.byteLength(
        runtime,
        'utf8'
      );

    if(bytes>48*1024){
      fail(
        'Inquiry adapter exceeds protected 48 KiB budget: '+
        bytes+
        ' bytes.'
      );
    }
  }catch(error){
    fail(
      'Inquiry interaction closeout failed: '+
      error.message
    );
  }

  /*
   * Product edit round trip.
   */
  try{
    const edit=
      read(
        'src/astro/runtime/pdp-inquiry-edit-runtime.js'
      );

    requireMarkers(
      'Product configuration edit runtime',
      edit,
      [
        "const VERSION='F3-B3'",
        "searchParams.get(",
        "'edit'",
        '.findItem(',
        "item.type!==",
        "'product'",
        '.openItem(',
        '.replaceItem(',
        '.mergeDuplicateProducts(',
        '.persist()',
        "'saveChanges'",
        "root.location.assign("
      ]
    );

    if(
      Buffer.byteLength(
        edit,
        'utf8'
      )>
      8*1024
    ){
      fail(
        'PDP Inquiry Edit utility exceeds protected 8 KiB budget.'
      );
    }

    const pdp=
      read(
        'src/astro/runtime/pdp-runtime.js'
      );

    if(
      Buffer.byteLength(
        pdp,
        'utf8'
      )>
      36*1024
    ){
      fail(
        'Protected PDP adapter exceeds 36 KiB.'
      );
    }

    if(
      pdp.includes(
        'F3-B3'
      )||
      pdp.includes(
        'searchParams.get'
      )
    ){
      fail(
        'Product edit orchestration leaked into the protected PDP adapter.'
      );
    }
  }catch(error){
    fail(
      'Product edit closeout failed: '+
      error.message
    );
  }

  /*
   * Custom edit + normal create flow must coexist.
   */
  try{
    const custom=
      read(
        'src/astro/runtime/custom-runtime.js'
      );

    requireMarkers(
      'Custom Project edit runtime',
      custom,
      [
        'F3-B4 — Custom Project Edit Flow',
        'requestedEditId',
        'editDraftFromItem',
        'hydrateEditSelection',
        'editItemId',
        '.findItem(',
        "existing.type===",
        "'custom'",
        '.replaceItem(',
        '.addCustom(',
        '.validateDraft(',
        '.buildIntent(',
        '.setSeries(',
        '.toggleScent(',
        '.persist()',
        'customInquiryEdit',
        'customEditSave'
      ]
    );

    if(
      !/else\s*\{\s*editItemId='';\s*draft=freshDraft\(\);/m
        .test(
          custom
        )
    ){
      fail(
        'Invalid/stale Custom edit IDs must fall back to a fresh create draft.'
      );
    }

    const bytes=
      Buffer.byteLength(
        custom,
        'utf8'
      );

    if(bytes>36*1024){
      fail(
        'Custom adapter exceeds protected 36 KiB budget: '+
        bytes+
        ' bytes.'
      );
    }
  }catch(error){
    fail(
      'Custom edit closeout failed: '+
      error.message
    );
  }

  /*
   * Canonical ownership: no edit-specific persisted state.
   */
  try{
    const inquiryFeature=
      read(
        'src/features/inquiry/runtime-inquiry.js'
      );

    const customFeature=
      read(
        'src/features/custom/runtime-custom.js'
      );

    requireMarkers(
      'Canonical Inquiry owner',
      inquiryFeature,
      [
        'function productMoqGroups(',
        'function pricingGroupQuantity(',
        'function findItem(',
        'function replaceItem(',
        'function removeItem(',
        'function clearItems(',
        'function setProductQuantity(',
        'function mergeDuplicateProducts('
      ]
    );

    requireMarkers(
      'Canonical Custom owner',
      customFeature,
      [
        'function setSeries(',
        'function toggleScent(',
        'function validateDraft(',
        'function buildIntent('
      ]
    );

    const inquiryView=
      read(
        'src/astro/lib/inquiry-view-model.mjs'
      );

    const customView=
      read(
        'src/astro/lib/custom-view-model.mjs'
      );

    for(const [
      label,
      source
    ] of [
      [
        'Inquiry storage contract',
        inquiryView
      ],
      [
        'Custom storage contract',
        customView
      ]
    ]){
      if(
        !/inquiryKey\s*:\s*['"]productManualV2State['"]/m
          .test(
            source
          )
      ){
        fail(
          label+
          ' is missing semantic inquiryKey=productManualV2State.'
        );
      }

      if(
        !/inquiryVersion\s*:\s*2\b/m
          .test(
            source
          )
      ){
        fail(
          label+
          ' is missing semantic inquiryVersion=2.'
        );
      }
    }

    for(const forbidden of [
      'productManualV3State',
      'productEditState',
      'customEditState'
    ]){
      if(
        inquiryView.includes(forbidden)||
        customView.includes(forbidden)||
        inquiryFeature.includes(forbidden)||
        customFeature.includes(forbidden)
      ){
        fail(
          'Interaction closeout introduced a second persisted state owner: '+
          forbidden
        );
      }
    }
  }catch(error){
    fail(
      'Canonical owner closeout failed: '+
      error.message
    );
  }

  /*
   * EN / ZH / KO interaction copy.
   */
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
        'moreToMoq',
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
            'Interaction localization is missing: '+
            language+
            '.'+
            key
          );
        }
      }
    }
  }catch(error){
    fail(
      'Interaction localization closeout failed: '+
      error.message
    );
  }

  /*
   * Mobile focus stability + utility action styling remain intact.
   */
  try{
    const inquiryCss=
      read(
        'src/astro/styles/inquiry.css'
      );

    requireMarkers(
      'Inquiry interaction CSS',
      inquiryCss,
      [
        '.inquiry-item__qty button:disabled',
        '.inquiry-item__moq-feedback',
        '.inquiry-validation__row',
        '.inquiry-item__edit'
      ]
    );

    if(
      !/\.inquiry-item__qty input\s*\{[\s\S]*?font-size\s*:\s*16px\s*;/m
        .test(
          inquiryCss
        )
    ){
      fail(
        'Mobile Inquiry quantity input lost the 16px focus-zoom guard.'
      );
    }

    const pdpCss=
      read(
        'src/astro/styles/pdp.css'
      );

    const quantityRules=[
      ...pdpCss.matchAll(
        /\[data-pdp-quantity-field\]\s*>\s*\.pdp-quantity\s*>\s*input\s*\{([\s\S]*?)\n\s*\}/gm
      )
    ];

    const sizes=
      quantityRules
        .map(
          match=>
            match[1]
              .match(
                /font-size\s*:\s*(\d+(?:\.\d+)?)px\s*;/
              )
        )
        .filter(Boolean)
        .map(
          match=>
            Number(
              match[1]
            )
        );

    if(
      sizes.length!==1||
      sizes[0]!==16
    ){
      fail(
        'Mobile PDP quantity input no longer resolves to exactly one explicit 16px typography owner.'
      );
    }
  }catch(error){
    fail(
      'Mobile interaction stability closeout failed: '+
      error.message
    );
  }

  /*
   * Production promotions must still protect all interaction work.
   */
  try{
    const inquiryPromotion=
      read(
        'scripts/r4-promote-astro-inquiry.mjs'
      );

    requireMarkers(
      'Inquiry Production promotion',
      inquiryPromotion,
      [
        "'data-inquiry-interaction-efficiency=\"true\"'",
        "'.productMoqGroups('",
        "'inquiry-item__edit'",
        "'inquiryCustomEditProject'",
        "'customEditHref'"
      ]
    );

    const pdpPromotion=
      read(
        'scripts/r4-promote-astro-pdp.mjs'
      );

    requireMarkers(
      'PDP Production promotion',
      pdpPromotion,
      [
        "'DreamlandPdpInquiryEdit'",
        "'.openItem('",
        "'.replaceItem('",
        "'.mergeDuplicateProducts('"
      ]
    );

    const customPromotion=
      read(
        'scripts/r4-promote-astro-custom.mjs'
      );

    requireMarkers(
      'Custom Production promotion',
      customPromotion,
      [
        "'customInquiryEdit'",
        "'customEditSave'",
        "'.findItem('",
        "'.replaceItem('",
        "'.addCustom('"
      ]
    );
  }catch(error){
    fail(
      'Production promotion interaction closeout failed: '+
      error.message
    );
  }

  /*
   * Main gate topology: A2 → B2 → B3 → B4 → B5 → Contact.
   */
  try{
    const pkg=
      json(
        'package.json'
      );

    if(
      pkg.scripts
        ?.['r4:conversion:interaction-closeout']!==
      'node scripts/validate-f3-b5-interaction-closeout.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:interaction-closeout.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:interaction-closeout:dist']!==
      'node scripts/validate-f3-b5-interaction-closeout.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:interaction-closeout:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    const order=[
      'npm run r4:conversion:inquiry-composition',
      'npm run r4:conversion:inquiry-interaction',
      'npm run r4:conversion:product-edit',
      'npm run r4:conversion:custom-edit',
      'npm run r4:conversion:interaction-closeout',
      'npm run r4:astro:contact'
    ];

    let last=-1;

    for(const command of order){
      const index=
        validate.indexOf(
          command
        );

      if(index<=last){
        fail(
          'Interaction source gate order is invalid around: '+
          command
        );
        break;
      }

      last=index;
    }

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    const distOrder=[
      'npm run r4:conversion:inquiry-composition:dist',
      'npm run r4:conversion:inquiry-interaction:dist',
      'npm run r4:conversion:product-edit:dist',
      'npm run r4:conversion:custom-edit:dist',
      'npm run r4:conversion:interaction-closeout:dist'
    ];

    last=-1;

    for(const command of distOrder){
      const index=
        build.indexOf(
          command
        );

      if(index<=last){
        fail(
          'Interaction Production gate order is invalid around: '+
          command
        );
        break;
      }

      last=index;
    }
  }catch(error){
    fail(
      'Interaction closeout package topology failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  /*
   * Interaction-bearing runtimes must promote byte-identically.
   */
  try{
    for(const file of [
      'r4-inquiry-runtime.js',
      'r4-pdp-runtime.js',
      'r4-custom-runtime.js'
    ]){
      const isolated=
        path.join(
          '.r4-astro-dist',
          file
        );

      const production=
        path.join(
          'dist',
          file
        );

      if(
        hash(isolated)!==
        hash(production)
      ){
        fail(
          'Production runtime is not byte-identical to isolated Astro artifact: '+
          file
        );
      }
    }
  }catch(error){
    fail(
      'Production runtime identity closeout failed: '+
      error.message
    );
  }

  try{
    const inquiry=
      read(
        'dist/r4-inquiry-runtime.js'
      );

    requireMarkers(
      'Production Inquiry runtime',
      inquiry,
      [
        'function unmetGroups(',
        'inquiry-item__moq-feedback',
        'preserveMediaOnNextRender=true;',
        'inquiryEditConfiguration',
        'inquiryCustomEditProject',
        'root.confirm(',
        '.removeItem(',
        '.clearItems('
      ]
    );

    const pdp=
      read(
        'dist/r4-pdp-runtime.js'
      );

    requireMarkers(
      'Production PDP runtime',
      pdp,
      [
        "const VERSION='F3-B3'",
        'DreamlandPdpInquiryEdit',
        '.openItem(',
        '.replaceItem(',
        '.mergeDuplicateProducts('
      ]
    );

    const custom=
      read(
        'dist/r4-custom-runtime.js'
      );

    requireMarkers(
      'Production Custom runtime',
      custom,
      [
        'F3-B4 — Custom Project Edit Flow',
        'requestedEditId',
        'editDraftFromItem',
        '.replaceItem(',
        '.addCustom(',
        'customInquiryEdit'
      ]
    );
  }catch(error){
    fail(
      'Production interaction marker closeout failed: '+
      error.message
    );
  }

  try{
    const inquiryHtml=
      read(
        'dist/inquiry/index.html'
      );

    requireMarkers(
      'Production Inquiry document',
      inquiryHtml,
      [
        'data-inquiry-conversion-composition="true"',
        'data-inquiry-interaction-efficiency="true"',
        'data-inquiry-validation'
      ]
    );

    const manifest=
      json(
        'dist/multipage-build-manifest.json'
      );

    for(const [
      owner,
      expected
    ] of [
      [
        'pdpOwner',
        'astro'
      ],
      [
        'customOwner',
        'astro'
      ],
      [
        'inquiryOwner',
        'astro'
      ]
    ]){
      if(
        manifest[owner]!==
        expected
      ){
        fail(
          'Production interaction route ownership drifted: '+
          owner+
          '='+
          String(
            manifest[owner]
          )
        );
      }
    }
  }catch(error){
    fail(
      'Production route ownership closeout failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-B5 INTERACTION CLOSEOUT: FAIL'
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
  'DREAMLAND F3-B5 INTERACTION CLOSEOUT: PASS'
);

console.log(
  SOURCE_MODE
    ? 'Quantity/MOQ + Product Edit + Custom Edit + Remove/Clear + mobile focus stability + canonical ownership + Production promotion contracts verified.'
    : 'Production Inquiry/PDP/Custom interaction runtimes are byte-identical to isolated Astro artifacts and retain the full F3-B interaction contract.'
);

console.log('');

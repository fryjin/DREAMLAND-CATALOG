#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
    'Usage: node scripts/validate-f3-c4-contact-closeout.mjs --source|--dist'
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
    read(
      relative
    )
  );
}

function exists(relative){
  return fs.existsSync(
    path.join(
      ROOT,
      relative
    )
  );
}

function hash(relative){
  return crypto
    .createHash(
      'sha256'
    )
    .update(
      fs.readFileSync(
        path.join(
          ROOT,
          relative
        )
      )
    )
    .digest(
      'hex'
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

function forbidMarkers(
  label,
  source,
  markers
){
  for(const marker of markers){
    if(source.includes(marker)){
      fail(
        label+
        ' crossed a protected boundary: '+
        marker
      );
    }
  }
}

function assertOrder(
  label,
  source,
  markers
){
  let cursor=-1;

  for(const marker of markers){
    const index=
      source.indexOf(
        marker
      );

    if(
      index<0||
      index<=cursor
    ){
      fail(
        label+
        ' order is invalid around: '+
        marker
      );
      return;
    }

    cursor=index;
  }
}

function contactFieldsFromHtml(html){
  return [
    ...html.matchAll(
      /data-contact-static-field="([^"]+)"/gi
    )
  ].map(
    match=>match[1]
  );
}

const EXPECTED_FIELDS=[
  'name',
  'company',
  'country',
  'city',
  'email',
  'phone',
  'buyerType',
  'message'
];

if(SOURCE_MODE){
  try{
    const page=
      read(
        'src/astro/components/contact/ContactPage.astro'
      );

    requireMarkers(
      'Contact page closeout',
      page,
      [
        'data-contact-conversion-composition="true"',
        'data-contact-input-efficiency="true"',
        "fields:['name','country','email','phone']",
        "fields:['company','buyerType','city','message']",
        'data-contact-section={section.key}',
        "type:'text'",
        "autocomplete:'tel'",
        "inputMode:'text'",
        'aria-invalid="false"',
        'aria-describedby={`${key}Error`}',
        'id={`${key}Error`}'
      ]
    );

    forbidMarkers(
      'Contact page',
      page,
      [
        'const chapters=[',
        'data-contact-static-chapter'
      ]
    );

    assertOrder(
      'Contact required-first composition',
      page,
      [
        "key:'required'",
        "key:'optional'"
      ]
    );

    const phoneStart=
      page.indexOf(
        '  phone:{'
      );

    const phoneEnd=
      page.indexOf(
        '  buyerType:{',
        phoneStart
      );

    const phone=
      phoneStart>=0&&
      phoneEnd>phoneStart
        ? page.slice(
            phoneStart,
            phoneEnd
          )
        : '';

    requireMarkers(
      'Contact-method field',
      phone,
      [
        "type:'text'",
        "autocomplete:'tel'",
        "inputMode:'text'",
        "autoCapitalize:'none'",
        'spellcheck:false'
      ]
    );

    if(
      phone.includes(
        "type:'tel'"
      )
    ){
      fail(
        'Contact-method field regressed to type=tel.'
      );
    }
  }catch(error){
    fail(
      'Contact page closeout failed: '+
      error.message
    );
  }

  try{
    const view=
      read(
        'src/astro/lib/contact-view-model.mjs'
      );

    requireMarkers(
      'Contact view-model contract',
      view,
      [
        "const FIELD_IDS=Object.freeze([",
        "'name'",
        "'company'",
        "'country'",
        "'city'",
        "'email'",
        "'phone'",
        "'buyerType'",
        "'message'",
        "'dreamlandContactDraftV1'",
        '24*60*60*1000',
        "'productManualV2State'",
        "inquiryVersion:",
        "review:",
        "'/inquiry/review/'",
        "guard:",
        "'hasInquiry'"
      ]
    );

    if(
      Buffer.byteLength(
        view,
        'utf8'
      )>32*1024
    ){
      fail(
        'Contact view-model exceeds protected 32 KiB budget.'
      );
    }
  }catch(error){
    fail(
      'Contact view-model closeout failed: '+
      error.message
    );
  }

  try{
    const runtime=
      read(
        'src/astro/runtime/contact-runtime.js'
      );

    requireMarkers(
      'Contact runtime closeout',
      runtime,
      [
        "const VERSION='R4.8B'",
        'function guardSatisfied(',
        'redirectWithoutInquiry()',
        'function contactFromDom(',
        '.loadDraft()',
        'contact.scheduleDraft(',
        '250',
        'contact.flushDraft(',
        'contact.validate(',
        'renderValidation(',
        "'aria-invalid'",
        'scrollIntoView',
        'target',
        '?.focus?.()',
        "root.addEventListener(\n        'storage'",
        "root.addEventListener(\n        'pageshow'",
        "root.addEventListener(\n        'pagehide'",
        "'visibilitychange'",
        'state.routes\n            .review'
      ]
    );

    const continueStart=
      runtime.indexOf(
        '    function continueToReview(){'
      );

    const continueEnd=
      runtime.indexOf(
        '    function flush(){',
        continueStart
      );

    const continueBlock=
      continueStart>=0&&
      continueEnd>continueStart
        ? runtime.slice(
            continueStart,
            continueEnd
          )
        : '';

    assertOrder(
      'Contact Continue contract',
      continueBlock,
      [
        'contactFromDom(',
        'contact.replace(',
        'contact.validate(',
        'contact.flushDraft(',
        'state.routes\n            .review'
      ]
    );

    forbidMarkers(
      'Contact runtime',
      runtime,
      [
        'DreamlandRisk',
        'DreamlandSubmission',
        'DreamlandInquirySubmissionFlow',
        'hcaptcha',
        'fetch('
      ]
    );

    if(
      Buffer.byteLength(
        runtime,
        'utf8'
      )>48*1024
    ){
      fail(
        'Contact runtime exceeds protected 48 KiB budget.'
      );
    }
  }catch(error){
    fail(
      'Contact runtime closeout failed: '+
      error.message
    );
  }

  try{
    const css=
      read(
        'src/astro/styles/contact.css'
      );

    requireMarkers(
      'Contact CSS closeout',
      css,
      [
        'F3-C2 — Contact Conversion Composition',
        'F3-C3 — Contact Input Efficiency',
        '.contact-section',
        '.contact-section--optional .contact-section__header',
        'grid-template-columns:repeat(3,minmax(0,1fr));',
        '.contact-field :is(input,select,textarea) {',
        'font-size:16px;'
      ]
    );

    forbidMarkers(
      'Contact CSS',
      css,
      [
        '.contact-chapter__header',
        '.contact-chapter__fields'
      ]
    );
  }catch(error){
    fail(
      'Contact CSS closeout failed: '+
      error.message
    );
  }

  try{
    const content=
      json(
        'data/site-content.json'
      );

    const phoneCopy={
      en:
        'Phone, WhatsApp number or WeChat ID',
      zh:
        '手机号、WhatsApp 或微信号',
      ko:
        '전화번호, WhatsApp 또는 WeChat ID'
    };

    for(const language of [
      'en',
      'zh',
      'ko'
    ]){
      const copy=
        content.languages
          ?.[language]
          ?.inquiryFlow;

      for(const key of [
        'contactRequiredTitle',
        'contactRequiredBody',
        'contactOptionalTitle',
        'contactOptionalBody'
      ]){
        if(
          !String(
            copy?.[key]||
            ''
          ).trim()
        ){
          fail(
            'Contact closeout copy is missing: '+
            language+
            '.'+
            key
          );
        }
      }

      if(
        copy?.phonePlaceholder!==
        phoneCopy[language]
      ){
        fail(
          'Contact-method placeholder regressed: '+
          language
        );
      }
    }
  }catch(error){
    fail(
      'Contact localization closeout failed: '+
      error.message
    );
  }

  try{
    delete globalThis
      .DreamlandContact;

    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/features/contact/runtime-contact.js'
        )
      ).href+
      '?f3-c4='+
      Date.now()
    );

    const contact=
      globalThis
        .DreamlandContact;

    contact.configure({
      storage:null,
      storageKey:
        'dreamlandContactDraftV1',
      ttlMs:
        24*60*60*1000,
      fieldIds:
        EXPECTED_FIELDS
    });

    const complete={
      name:'Buyer Name',
      company:'',
      country:'SG',
      city:'',
      email:'buyer@example.com',
      phone:'dreamland_wechat',
      buyerType:'',
      message:''
    };

    if(
      !contact.validate(
        complete
      ).valid
    ){
      fail(
        'Locked Contact contract no longer accepts required-only data with alphanumeric contact ID.'
      );
    }

    const required={
      name:'invalidName',
      country:'countryRequired',
      email:'invalidEmail',
      phone:'invalidPhone'
    };

    for(const [
      field,
      code
    ] of Object.entries(
      required
    )){
      const result=
        contact.validate({
          ...complete,
          [field]:''
        });

      if(
        result.valid||
        !result.errors
          ?.some(
            row=>
              row.field===field&&
              row.code===code
          )
      ){
        fail(
          'Locked required Contact field changed: '+
          field
        );
      }
    }
  }catch(error){
    fail(
      'Canonical Contact domain closeout failed: '+
      error.message
    );
  }

  try{
    const promotion=
      read(
        'scripts/r4-promote-astro-contact.mjs'
      );

    requireMarkers(
      'Contact Production promotion guards',
      promotion,
      [
        "'data-contact-conversion-composition=\"true\"'",
        "'data-contact-input-efficiency=\"true\"'",
        "'inputmode=\"text\"'",
        "'aria-invalid=\"false\"'",
        "'data-contact-section=\"required\"'",
        "'data-contact-section=\"optional\"'",
        "'dreamlandContactDraftV1'",
        "'productManualV2State'",
        "'/inquiry/review/'"
      ]
    );

    requireMarkers(
      'Contact Production promotion boundary guards',
      promotion,
      [
        'for(const forbidden of [',
        "'DreamlandRisk'",
        "'DreamlandSubmission'",
        "'DreamlandInquirySubmissionFlow'"
      ]
    );
  }catch(error){
    fail(
      'Contact Production promotion closeout failed: '+
      error.message
    );
  }

  try{
    const runtime=
      read(
        'src/astro/runtime/contact-runtime.js'
      );

    if(
      !/contact\s*\.loadDraft\(\)/m.test(
        runtime
      )
    ){
      fail(
        'Contact runtime lost canonical loadDraft() ownership.'
      );
    }

    const css=
      read(
        'src/astro/styles/contact.css'
      );

    if(
      !css.includes(
        '.contact-section--optional .contact-section__header'
      )
    ){
      fail(
        'Contact optional-section visual hierarchy is missing.'
      );
    }

    const promotion=
      read(
        'scripts/r4-promote-astro-contact.mjs'
      );

    const forbiddenStart=
      promotion.indexOf(
        'for(const forbidden of ['
      );

    const forbiddenEnd=
      promotion.indexOf(
        ']){',
        forbiddenStart
      );

    const forbiddenBlock=
      forbiddenStart>=0&&
      forbiddenEnd>forbiddenStart
        ? promotion.slice(
            forbiddenStart,
            forbiddenEnd
          )
        : '';

    for(const marker of [
      "'DreamlandRisk'",
      "'DreamlandSubmission'",
      "'DreamlandInquirySubmissionFlow'"
    ]){
      if(
        !forbiddenBlock.includes(
          marker
        )
      ){
        fail(
          'Contact promotion no longer guards downstream boundary: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'Contact closeout semantic guard validation failed: '+
      error.message
    );
  }

  try{
    for(const relative of [
      'scripts/validate-f3-c2-contact-conversion-composition.mjs',
      'scripts/validate-f3-c3-contact-input-efficiency.mjs'
    ]){
      if(!exists(relative)){
        fail(
          'Contact closeout prerequisite gate is missing: '+
          relative
        );
      }
    }

    const pkg=
      json(
        'package.json'
      );

    if(
      pkg.scripts
        ?.['r4:conversion:contact-closeout']!==
      'node scripts/validate-f3-c4-contact-closeout.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:contact-closeout.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:contact-closeout:dist']!==
      'node scripts/validate-f3-c4-contact-closeout.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:contact-closeout:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    assertOrder(
      'Contact source gate topology',
      validate,
      [
        'npm run r4:conversion:contact-composition',
        'npm run r4:conversion:contact-input',
        'npm run r4:conversion:contact-closeout',
        'npm run r4:astro:review'
      ]
    );

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    assertOrder(
      'Contact Production gate topology',
      build,
      [
        'npm run r4:conversion:contact-composition:dist',
        'npm run r4:conversion:contact-input:dist',
        'npm run r4:conversion:contact-closeout:dist'
      ]
    );
  }catch(error){
    fail(
      'Contact closeout package topology failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  try{
    const pairs=[
      [
        '.r4-astro-dist/inquiry/contact/index.html',
        'dist/inquiry/contact/index.html'
      ],
      [
        '.r4-astro-dist/r4-contact-runtime.js',
        'dist/r4-contact-runtime.js'
      ]
    ];

    for(const [
      isolated,
      production
    ] of pairs){
      if(
        !exists(isolated)||
        !exists(production)
      ){
        fail(
          'Contact closeout artifact pair is missing: '+
          isolated+
          ' / '+
          production
        );
        continue;
      }

      if(
        hash(isolated)!==
        hash(production)
      ){
        fail(
          'Isolated Astro and Production Contact are not byte-identical: '+
          production
        );
      }
    }
  }catch(error){
    fail(
      'Contact Production identity closeout failed: '+
      error.message
    );
  }

  try{
    for(const relative of [
      '.r4-astro-dist/inquiry/contact/index.html',
      'dist/inquiry/contact/index.html'
    ]){
      const html=
        read(
          relative
        );

      requireMarkers(
        relative,
        html,
        [
          'data-contact-conversion-composition="true"',
          'data-contact-input-efficiency="true"',
          'data-contact-section="required"',
          'data-contact-section="optional"',
          'inputmode="text"',
          'autocomplete="tel"',
          'aria-invalid="false"',
          'aria-describedby="phoneError"',
          'id="phoneError"',
          'data-contact-static-summary',
          'data-contact-static-back',
          'data-contact-static-continue'
        ]
      );

      const fields=
        contactFieldsFromHtml(
          html
        );

      if(
        fields.length!==8||
        JSON.stringify(
          [
            ...fields
          ].sort()
        )!==
        JSON.stringify(
          [
            ...EXPECTED_FIELDS
          ].sort()
        )
      ){
        fail(
          relative+
          ' changed the locked 8-field Contact schema: '+
          fields.join(', ')
        );
      }

      assertOrder(
        relative+
        ' required-first sections',
        html,
        [
          'data-contact-section="required"',
          'data-contact-section="optional"'
        ]
      );

      if(
        html.includes(
          'data-contact-static-chapter='
        )
      ){
        fail(
          relative+
          ' regressed to the old Contact chapter composition.'
        );
      }
    }
  }catch(error){
    fail(
      'Contact Production HTML closeout failed: '+
      error.message
    );
  }

  try{
    for(const relative of [
      '.r4-astro-dist/r4-contact-runtime.js',
      'dist/r4-contact-runtime.js'
    ]){
      const runtime=
        read(
          relative
        );

      requireMarkers(
        relative,
        runtime,
        [
          'function contactFromDom(',
          'contact.scheduleDraft(',
          'contact.flushDraft(',
          'contact.validate(',
          'aria-invalid',
          'redirectWithoutInquiry',
          'state.routes'
        ]
      );

      forbidMarkers(
        relative,
        runtime,
        [
          'DreamlandRisk',
          'DreamlandSubmission',
          'DreamlandInquirySubmissionFlow',
          'hcaptcha',
          'fetch('
        ]
      );
    }
  }catch(error){
    fail(
      'Contact Production runtime closeout failed: '+
      error.message
    );
  }

  try{
    const manifest=
      json(
        'dist/multipage-build-manifest.json'
      );

    if(
      manifest.contactOwner!==
      'astro'
    ){
      fail(
        'Production manifest Contact owner is not Astro.'
      );
    }

    if(
      manifest.contactCutover!==
      'B7-00B.4J-R4.8C'
    ){
      fail(
        'Production manifest Contact cutover changed: '+
        String(
          manifest.contactCutover
        )
      );
    }

    if(
      manifest.presentationOverrides
        ?.contact!==
      'astro-r4.8c'
    ){
      fail(
        'Production manifest Contact presentation override changed.'
      );
    }
  }catch(error){
    fail(
      'Contact Production manifest closeout failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-C4 CONTACT CLOSEOUT: FAIL'
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
  'DREAMLAND F3-C4 CONTACT CLOSEOUT: PASS'
);

console.log(
  SOURCE_MODE
    ? 'C2 composition + C3 input efficiency + locked Contact field/storage/navigation/boundary contracts are closed.'
    : 'Isolated Astro + Production Contact are identical and preserve the complete F3-C contract.'
);

console.log('');

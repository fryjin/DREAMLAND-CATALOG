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
    'Usage: node scripts/validate-f3-c3-contact-input-efficiency.mjs --source|--dist'
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

function sliceBetween(
  source,
  start,
  end
){
  const from=
    source.indexOf(
      start
    );

  if(from<0){
    return '';
  }

  const to=
    source.indexOf(
      end,
      from+
      start.length
    );

  return source.slice(
    from,
    to<0
      ? source.length
      : to
  );
}

if(SOURCE_MODE){
  try{
    const page=
      read(
        'src/astro/components/contact/ContactPage.astro'
      );

    requireMarkers(
      'Contact input-efficiency page',
      page,
      [
        'data-contact-input-efficiency="true"',
        'inputmode={field.inputMode}',
        'enterkeyhint={field.enterKeyHint}',
        'autocapitalize={field.autoCapitalize}',
        'spellcheck={field.spellcheck}',
        'aria-invalid="false"',
        'aria-describedby={`${key}Error`}',
        'id={`${key}Error`}'
      ]
    );

    const dynamicErrorIdMarker=
      'id={'+'`'+'${key}Error'+'`'+'}';

    const dynamicErrorIdCount=
      page.split(
        dynamicErrorIdMarker
      ).length-
      1;

    if(dynamicErrorIdCount!==2){
      fail(
        'Contact page must render dynamic error IDs for both textarea and generic input branches; found '+
        dynamicErrorIdCount+
        '.'
      );
    }
    const phone=
      sliceBetween(
        page,
        '  phone:{',
        '  buyerType:{'
      );

    requireMarkers(
      'Phone / WhatsApp / WeChat field semantics',
      phone,
      [
        "type:'text'",
        "autocomplete:'tel'",
        "inputMode:'text'",
        "enterKeyHint:'done'",
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
        'Phone / WhatsApp / WeChat field still uses type=tel.'
      );
    }

    const email=
      sliceBetween(
        page,
        '  email:{',
        '  phone:{'
      );

    requireMarkers(
      'Email input semantics',
      email,
      [
        "type:'email'",
        "autocomplete:'email'",
        "inputMode:'email'",
        "enterKeyHint:'next'"
      ]
    );
  }catch(error){
    fail(
      'Contact page input validation failed: '+
      error.message
    );
  }

  try{
    const runtime=
      read(
        'src/astro/runtime/contact-runtime.js'
      );

    requireMarkers(
      'Contact input runtime',
      runtime,
      [
        'function contactFromDom(',
        'function continueToReview(){',
        'currentContact=',
        'contactFromDom(',
        "'aria-invalid'",
        "'false'",
        "'true'",
        'contact.scheduleDraft(',
        'contact.flushDraft(',
        'contact.validate('
      ]
    );

    const continueBlock=
      sliceBetween(
        runtime,
        '    function continueToReview(){',
        '    function onInput('
      );

    if(
      !continueBlock.includes(
        'contactFromDom('
      )||
      !continueBlock.includes(
        'contact.replace('
      )||
      !continueBlock.includes(
        'contact.validate('
      )
    ){
      fail(
        'Continue must resync visible DOM/autofill values before canonical replace/validate.'
      );
    }

    for(const forbidden of [
      'DreamlandRisk',
      'DreamlandSubmission',
      'DreamlandInquirySubmissionFlow',
      'hcaptcha',
      'fetch('
    ]){
      if(runtime.includes(forbidden)){
        fail(
          'C3 crossed the Contact / Review / Submission boundary: '+
          forbidden
        );
      }
    }
  }catch(error){
    fail(
      'Contact runtime input validation failed: '+
      error.message
    );
  }

  try{
    const css=
      read(
        'src/astro/styles/contact.css'
      );

    requireMarkers(
      'Contact mobile input stability',
      css,
      [
        'F3-C3 — Contact Input Efficiency',
        '.contact-field :is(input,select,textarea) {',
        'font-size:16px;'
      ]
    );

    const mobile=
      css.slice(
        css.indexOf(
          '@media (max-width:760px)'
        )
      );

    if(
      !mobile.includes(
        '.contact-field :is(input,select,textarea) {'
      )||
      !mobile.includes(
        'font-size:16px;'
      )
    ){
      fail(
        'Mobile Contact controls must own a 16px font size.'
      );
    }
  }catch(error){
    fail(
      'Contact mobile input CSS validation failed: '+
      error.message
    );
  }

  try{
    const content=
      json(
        'data/site-content.json'
      );

    const expected={
      en:
        'Phone, WhatsApp number or WeChat ID',
      zh:
        '手机号、WhatsApp 或微信号',
      ko:
        '전화번호, WhatsApp 또는 WeChat ID'
    };

    for(const [
      language,
      value
    ] of Object.entries(
      expected
    )){
      if(
        content.languages
          ?.[language]
          ?.inquiryFlow
          ?.phonePlaceholder!==value
      ){
        fail(
          'Explicit contact-method placeholder is missing for '+
          language+
          '.'
        );
      }
    }
  }catch(error){
    fail(
      'Contact placeholder localization validation failed: '+
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
      '?f3-c3='+
      Date.now()
    );

    const contact=
      globalThis
        .DreamlandContact;

    if(!contact){
      fail(
        'DreamlandContact canonical owner did not load.'
      );
    }else{
      contact.configure({
        storage:null,
        fieldIds:[
          'name',
          'company',
          'country',
          'city',
          'email',
          'phone',
          'buyerType',
          'message'
        ]
      });

      const result=
        contact.validate({
          name:'Buyer Name',
          company:'',
          country:'SG',
          city:'',
          email:'buyer@example.com',
          phone:'dreamland_wechat',
          buyerType:'',
          message:''
        });

      if(!result.valid){
        fail(
          'Canonical Contact validation no longer accepts an alphanumeric WeChat ID.'
        );
      }
    }
  }catch(error){
    fail(
      'Locked Contact domain contract validation failed: '+
      error.message
    );
  }

  try{
    const promotion=
      read(
        'scripts/r4-promote-astro-contact.mjs'
      );

    requireMarkers(
      'Contact Production promotion',
      promotion,
      [
        "'data-contact-input-efficiency=\"true\"'",
        "'inputmode=\"text\"'",
        "'aria-invalid=\"false\"'"
      ]
    );
  }catch(error){
    fail(
      'Contact Production promotion validation failed: '+
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
        ?.['r4:conversion:contact-input']!==
      'node scripts/validate-f3-c3-contact-input-efficiency.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:contact-input.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:contact-input:dist']!==
      'node scripts/validate-f3-c3-contact-input-efficiency.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:contact-input:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    const composition=
      validate.indexOf(
        'npm run r4:conversion:contact-composition'
      );

    const input=
      validate.indexOf(
        'npm run r4:conversion:contact-input'
      );

    const review=
      validate.indexOf(
        'npm run r4:astro:review'
      );

    if(
      composition<0||
      input<=composition||
      review<=input
    ){
      fail(
        'C3 source gate must run after C2 Contact Composition and before Review.'
      );
    }

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    const compositionDist=
      build.indexOf(
        'npm run r4:conversion:contact-composition:dist'
      );

    const inputDist=
      build.indexOf(
        'npm run r4:conversion:contact-input:dist'
      );

    if(
      compositionDist<0||
      inputDist<=compositionDist
    ){
      fail(
        'C3 Production gate must run after C2 Contact Composition.'
      );
    }
  }catch(error){
    fail(
      'Contact input package topology failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
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
          'data-contact-input-efficiency="true"',
          'inputmode="text"',
          'autocomplete="tel"',
          'aria-invalid="false"',
          'aria-describedby="phoneError"',
          'id="phoneError"'
        ]
      );

      const phoneIndex=
        html.indexOf(
          'data-contact-static-field="phone"'
        );

      if(phoneIndex<0){
        fail(
          relative+
          ' is missing the rendered phone/contact-method field.'
        );
      }else{
        const around=
          html.slice(
            Math.max(
              0,
              phoneIndex-
              500
            ),
            phoneIndex+
            700
          );

        if(
          around.includes(
            'type="tel"'
          )
        ){
          fail(
            relative+
            ' still renders the contact-method field as type=tel.'
          );
        }

        if(
          !around.includes(
            'type="text"'
          )
        ){
          fail(
            relative+
            ' does not render the contact-method field as type=text.'
          );
        }
      }
    }

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
          'aria-invalid',
          'contact.validate(',
          'contact.flushDraft('
        ]
      );
    }
  }catch(error){
    fail(
      'Production Contact input-efficiency validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-C3 CONTACT INPUT EFFICIENCY: FAIL'
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
  'DREAMLAND F3-C3 CONTACT INPUT EFFICIENCY: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Alphanumeric contact-method entry / browser-autofill resync / accessible validation state / mobile anti-zoom input sizing verified.'
    : 'Isolated Astro + Production Contact preserve the F3-C3 input-efficiency contract.'
);
console.log('');

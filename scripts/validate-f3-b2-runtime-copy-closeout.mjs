#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_MODE=process.argv.includes('--source');
const DIST_MODE=process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error('Usage: node scripts/validate-f3-b2-runtime-copy-closeout.mjs --source|--dist');
  process.exit(1);
}

const errors=[];
const fail=message=>errors.push(message);
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\\r\\n?/g,'\\n');
const json=relative=>JSON.parse(read(relative));

function requireMarker(source,marker,label){
  if(!source.includes(marker)) fail(label+': '+marker);
}

function rejectMarker(source,marker,label){
  if(source.includes(marker)) fail(label+': '+marker);
}

function requireEqual(actual,expected,label){
  if(actual!==expected){
    fail(label+' expected '+JSON.stringify(expected)+'; got '+JSON.stringify(actual));
  }
}

const legalHold=Object.freeze({
  site:{
    en:{
      privacyPrefix:'I have read and agree to the',
      privacyLink:'Privacy Notice',
      privacyRequired:'Please agree to the Privacy Notice before sending.'
    },
    ko:{
      privacyPrefix:'다음을 읽고 동의합니다:',
      privacyLink:'개인정보 안내',
      privacyRequired:'문의 전 개인정보 안내에 동의해 주세요.'
    }
  },
  ui:{
    en:{
      privacyAgreePrefix:'I have read and agree to the',
      privacyLink:'Privacy Notice',
      privacyRequired:'Please read and accept the Privacy Notice.'
    },
    ko:{
      privacyAgreePrefix:'다음 내용을 읽고 동의합니다:',
      privacyLink:'개인정보 안내',
      privacyRequired:'개인정보 안내를 읽고 동의해 주세요.'
    }
  }
});

if(SOURCE_MODE){
  try{
    const site=json('data/site-content.json');
    const i18n=json('data/i18n.json');

    requireEqual(
      site.languages?.en?.customProject?.errorScents,
      'Choose at least one fragrance.',
      'EN Custom validation terminology'
    );

    for(const language of ['en','ko']){
      for(const [key,value] of Object.entries(legalHold.site[language])){
        requireEqual(
          site.languages?.[language]?.inquiryFlow?.[key],
          value,
          'LEGAL HOLD site '+language+'.'+key
        );
      }

      for(const [key,value] of Object.entries(legalHold.ui[language])){
        requireEqual(
          i18n.ui?.[language]?.[key],
          value,
          'LEGAL HOLD ui '+language+'.'+key
        );
      }
    }
  }catch(error){
    fail('F3-B2 canonical copy validation failed: '+error.message);
  }

  try{
    const custom=read('src/astro/runtime/custom-runtime.js');

    for(const marker of [
      'use:c.errorUse',
      'quantity:c.errorQuantity',
      "'quantity-min':c.errorQuantityMin",
      "'quantity-max':c.errorQuantityMax",
      'scents:c.errorScents',
      'added:c.addedTitle',
      "scents:'Choose at least one fragrance.'",
      "added:'Added to your quote request.'",
      "added:'견적 요청에 추가했습니다.'"
    ]){
      requireMarker(custom,marker,'Custom runtime canonical copy mapping missing');
    }

    for(const stale of [
      'c.validationUse',
      'c.validationQuantity',
      'c.validationQuantityMin',
      'c.validationQuantityMax',
      'c.validationScents',
      'c.addedInquiry',
      "scents:'Choose at least one scent.'",
      "added:'Custom project added to inquiry.'",
      "added:'커스텀 프로젝트를 문의 목록에 추가했습니다.'"
    ]){
      rejectMarker(custom,stale,'Custom runtime still carries stale copy');
    }
  }catch(error){
    fail('F3-B2 Custom runtime inspection failed: '+error.message);
  }

  try{
    const view=read('src/astro/lib/review-view-model.mjs');

    for(const marker of [
      "'privacyRequired'",
      "'securityAdditional'",
      "'submitting'",
      "'submitFailed'"
    ]){
      requireMarker(view,marker,'Review runtime-state canonical copy projection missing');
    }
  }catch(error){
    fail('F3-B2 Review projection inspection failed: '+error.message);
  }

  try{
    const runtime=read('src/astro/runtime/review-runtime.js');

    for(const marker of [
      'copy.privacyRequired',
      'copy.submitting',
      'ui.captchaRequired',
      'copy.submitFailed',
      'ui.formNotConfigured',
      'ui.submissionDuplicate',
      "submitting:'Submitting Quote Request…'",
      "offline:'You’re offline. Your quote request is still saved on this device.'",
      "duplicate:'This quote request is already being submitted in another tab.'",
      "submitting:'견적 요청 제출 중…'",
      "offline:'현재 네트워크에 연결할 수 없습니다. 견적 요청 내용은 이 기기에 저장되어 있습니다.'",
      "duplicate:'이 견적 요청은 다른 탭에서 이미 제출 중입니다.'"
    ]){
      requireMarker(runtime,marker,'Review runtime closeout marker missing');
    }

    for(const stale of [
      "submitting:'Sending your inquiry…'",
      'We couldn’t send this inquiry yet.',
      'We couldn’t send your inquiry.',
      'Your inquiry is still saved',
      'This inquiry is already being sent',
      "submitting:'문의를 보내는 중입니다…'",
      '지금은 이 문의를 보낼 수 없습니다.',
      '현재 네트워크에 연결할 수 없습니다. 문의 내용은',
      '이 문의는 다른 탭에서 이미 전송 중입니다.'
    ]){
      rejectMarker(runtime,stale,'Review runtime still carries stale customer terminology');
    }
  }catch(error){
    fail('F3-B2 Review runtime inspection failed: '+error.message);
  }

  try{
    const pkg=json('package.json');

    if(
      pkg.scripts?.['r4:conversion:runtime-copy-closeout']!==
      'node scripts/validate-f3-b2-runtime-copy-closeout.mjs --source'
    ){
      fail('package.json is missing r4:conversion:runtime-copy-closeout.');
    }

    if(
      pkg.scripts?.['r4:conversion:runtime-copy-closeout:dist']!==
      'node scripts/validate-f3-b2-runtime-copy-closeout.mjs --dist'
    ){
      fail('package.json is missing r4:conversion:runtime-copy-closeout:dist.');
    }

    const validate=String(pkg.scripts?.validate||'');
    const d4=validate.indexOf('npm run r4:conversion:review-submission-closeout');
    const copyGate=validate.indexOf('npm run r4:conversion:runtime-copy-closeout');
    const success=validate.indexOf('npm run r4:astro:success');

    if(d4<0||copyGate<=d4||success<=copyGate){
      fail('F3-B2 source gate must run after Review/Submission closeout and before Success.');
    }

    const build=String(pkg.scripts?.build||'');
    const d4Dist=build.indexOf('npm run r4:conversion:review-submission-closeout:dist');
    const copyGateDist=build.indexOf('npm run r4:conversion:runtime-copy-closeout:dist');
    const closeoutDist=build.indexOf('npm run r4:conversion:closeout:dist');

    if(d4Dist<0||copyGateDist<=d4Dist||closeoutDist<=copyGateDist){
      fail('F3-B2 dist gate must run after Review/Submission closeout dist and before Conversion closeout dist.');
    }
  }catch(error){
    fail('F3-B2 package topology validation failed: '+error.message);
  }
}

if(DIST_MODE){
  try{
    for(const relative of [
      '.r4-astro-dist/r4-custom-runtime.js',
      'dist/r4-custom-runtime.js'
    ]){
      const runtime=read(relative);

      for(const marker of [
        'use:c.errorUse',
        'scents:c.errorScents',
        'added:c.addedTitle',
        "scents:'Choose at least one fragrance.'",
        "added:'견적 요청에 추가했습니다.'"
      ]){
        requireMarker(runtime,marker,relative+' lost Custom runtime copy closeout');
      }

      rejectMarker(
        runtime,
        "scents:'Choose at least one scent.'",
        relative+' restored stale EN Custom validation copy'
      );
    }

    for(const relative of [
      '.r4-astro-dist/r4-review-runtime.js',
      'dist/r4-review-runtime.js'
    ]){
      const runtime=read(relative);

      for(const marker of [
        'copy.submitting',
        'copy.submitFailed',
        'ui.submissionDuplicate',
        "submitting:'Submitting Quote Request…'",
        "submitting:'견적 요청 제출 중…'"
      ]){
        requireMarker(runtime,marker,relative+' lost Review runtime copy closeout');
      }

      for(const stale of [
        "submitting:'Sending your inquiry…'",
        "submitting:'문의를 보내는 중입니다…'",
        'This inquiry is already being sent',
        '이 문의는 다른 탭에서 이미 전송 중입니다.'
      ]){
        rejectMarker(runtime,stale,relative+' restored stale Review status copy');
      }
    }

    const htmlChecks=[
      [
        'dist/en/custom/index.html',
        '"errorScents":"Choose at least one fragrance."'
      ],
      [
        'dist/en/inquiry/review/index.html',
        '"submitting":"Submitting Quote Request…"'
      ],
      [
        'dist/en/inquiry/review/index.html',
        '"submitFailed":"We can’t submit your quote request right now. Your selections have been saved, so please try again shortly."'
      ],
      [
        'dist/ko/inquiry/review/index.html',
        '"submitting":"견적 요청 제출 중…"'
      ],
      [
        'dist/ko/inquiry/review/index.html',
        '"submitFailed":"지금은 견적 요청을 제출할 수 없습니다. 선택한 내용은 저장되어 있으니 잠시 후 다시 시도해 주세요."'
      ]
    ];

    for(const [relative,marker] of htmlChecks){
      requireMarker(
        read(relative),
        marker,
        relative+' lost canonical runtime copy'
      );
    }
  }catch(error){
    fail('F3-B2 Production artifact validation failed: '+error.message);
  }
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F3-B2 RUNTIME COPY CLOSEOUT: FAIL');
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND F3-B2 RUNTIME COPY CLOSEOUT: PASS');
console.log(
  SOURCE_MODE
    ? 'Custom validation/add feedback consumes canonical copy; Review hidden submission states preserve Quote Request / 견적 요청 terminology; Privacy LEGAL HOLD preserved.'
    : 'Production Custom + Review runtime artifacts preserve the F3-B2 copy closeout.'
);
console.log('');

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  '..'
);

const SOURCE_MODE=
  process.argv.includes('--source');

const DIST_MODE=
  process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error(
    'Usage: node scripts/validate-f3-d4-review-submission-closeout.mjs --source|--dist'
  );
  process.exit(1);
}

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  ).replace(
    /\r\n?/g,
    '\n'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
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

function count(
  source,
  marker
){
  return source
    .split(
      marker
    ).length-
    1;
}

if(SOURCE_MODE){
  try{
    for(const relative of [
      'scripts/validate-f3-d2-review-conversion-composition.mjs',
      'scripts/validate-f3-d3-submission-reliability.mjs',
      'scripts/validate-r4-astro-success.mjs',
      'scripts/validate-r4-astro-success-runtime.mjs'
    ]){
      if(!exists(relative)){
        fail(
          'D4 prerequisite gate is missing: '+
          relative
        );
      }
    }
  }catch(error){
    fail(
      'D4 prerequisite inspection failed: '+
      error.message
    );
  }

  try{
    const config=
      json(
        'data/app-config.json'
      );

    const expected={
      submissionTransport:
        'web3forms-direct',
      submitCooldownMs:
        10000,
      submissionRiskTimeoutMs:
        12000,
      submissionRequestTimeoutMs:
        20000,
      submissionAttemptTtlMs:
        45000,
      submissionUnknownRetryDelayMs:
        15000,
      submissionAttemptKey:
        'dreamlandSubmissionAttemptV1'
    };

    for(const [
      key,
      value
    ] of Object.entries(
      expected
    )){
      if(config[key]!==value){
        fail(
          'D4 app-config contract changed: '+
          key+
          '='+
          String(
            config[key]
          )
        );
      }
    }
  }catch(error){
    fail(
      'D4 app-config inspection failed: '+
      error.message
    );
  }

  try{
    const page=
      read(
        'src/astro/components/review/ReviewPage.astro'
      );

    requireMarkers(
      'D4 Review composition',
      page,
      [
        'data-review-conversion-composition="true"',
        'data-review-static-contact',
        'data-review-static-products',
        'data-review-static-summary',
        'data-review-product-quantity-summary',
        'data-review-total-quantity',
        'data-review-static-consent',
        'data-review-static-submit',
        'data-review-runtime-status'
      ]
    );

    if(
      count(
        page,
        'data-review-static-submit'
      )!==1
    ){
      fail(
        'Review must keep exactly one canonical Submit CTA.'
      );
    }

    if(
      page.includes(
        'class="review-notice"'
      )
    ){
      fail(
        'Review regressed to the duplicated visible Before Submission panel.'
      );
    }
  }catch(error){
    fail(
      'D4 Review page inspection failed: '+
      error.message
    );
  }

  try{
    const runtime=
      read(
        'src/astro/runtime/review-runtime.js'
      );

    requireMarkers(
      'D4 Review runtime',
      runtime,
      [
        'function conciseProductPreview(',
        'data-review-total-quantity',
        'function runWithTimeout(',
        "'RISK_TIMEOUT'",
        'function classifySubmissionError(',
        "'UNKNOWN_PENDING'",
        "'SUBMISSION_TIMEOUT'",
        "'COOLDOWN'",
        "'DUPLICATE'",
        'function refreshAttemptGate(',
        'submissionFlow.attemptState(',
        'submissionPayload.build(',
        'submissionPayload.validate(',
        'risk.assess(',
        'risk.renderCaptcha(',
        'risk.ensureCaptcha(',
        'submissionFlow.submit({',
        "'/inquiry/success/'"
      ]
    );

    forbidMarkers(
      'Review runtime',
      runtime,
      [
        'fetch(',
        'XMLHttpRequest'
      ]
    );

    const resultGate=
      runtime.indexOf(
        'if(!result?.success)'
      );

    const successNavigation=
      runtime.indexOf(
        "'/inquiry/success/'",
        resultGate
      );

    if(
      resultGate<0||
      successNavigation<=resultGate
    ){
      fail(
        'Review Success navigation is no longer gated by canonical submission success.'
      );
    }
  }catch(error){
    fail(
      'D4 Review runtime inspection failed: '+
      error.message
    );
  }

  try{
    const flow=
      read(
        'src/app/runtime-inquiry-submission-flow.js'
      );

    requireMarkers(
      'D4 Submission Flow',
      flow,
      [
        'function attemptState(',
        'function acquireAttempt(',
        'function persistAttemptOutcome(',
        "'UNKNOWN_PENDING'",
        "'SUBMISSION_TIMEOUT'",
        'submissionTimeoutMs',
        'unknownRetryDelayMs',
        'attemptTtlMs',
        'function clearSubmittedState()',
        'archive(',
        'removeAttemptRecord(',
        'clearSubmittedState();'
      ]
    );

    const successRecord=
      flow.indexOf(
        'const record={'
      );

    const archiveCall=
      flow.indexOf(
        'archive(',
        successRecord
      );

    const attemptClear=
      flow.indexOf(
        'removeAttemptRecord(',
        archiveCall
      );

    const stateClear=
      flow.indexOf(
        'clearSubmittedState();',
        attemptClear
      );

    const successReturn=
      flow.indexOf(
        'success:true',
        stateClear
      );

    if(
      successRecord<0||
      archiveCall<0||
      attemptClear<=archiveCall||
      stateClear<=attemptClear||
      successReturn<=stateClear
    ){
      fail(
        'Confirmed-success closeout order must remain Archive -> Attempt Clear -> Inquiry/Contact Clear -> success return.'
      );
    }

    const ambiguous=
      flow.indexOf(
        'const ambiguous='
      );

    const finallyIndex=
      flow.indexOf(
        '}finally{',
        ambiguous
      );

    if(
      ambiguous<0||
      finallyIndex<=ambiguous
    ){
      fail(
        'Submission failure recovery block is missing.'
      );
    }else{
      const failureBlock=
        flow.slice(
          ambiguous,
          finallyIndex
        );

      requireMarkers(
        'D4 failure recovery block',
        failureBlock,
        [
          'persistAttemptOutcome(',
          "'unknown'",
          "'cooldown'",
          'retryAfterMs'
        ]
      );

      if(
        failureBlock.includes(
          'clearSubmittedState();'
        )
      ){
        fail(
          'Failure/unknown paths must never clear Inquiry or Contact state.'
        );
      }
    }
  }catch(error){
    fail(
      'D4 Submission Flow inspection failed: '+
      error.message
    );
  }

  try{
    const submission=
      read(
        'src/services/submission/runtime-submission.js'
      );

    requireMarkers(
      'D4 Browser Direct transport',
      submission,
      [
        "'web3forms-direct'",
        "async function submitDirect(payload,{captchaToken='',signal}={})",
        '...(signal?{signal}:{})'
      ]
    );
  }catch(error){
    fail(
      'D4 Submission transport inspection failed: '+
      error.message
    );
  }

  try{
    const success=
      read(
        'src/astro/runtime/success-runtime.js'
      );

    requireMarkers(
      'D4 Success runtime',
      success,
      [
        "'dreamlandLastSubmissionV1'",
        'function readLastSubmission(',
        'record?.inquiryId||',
        'record?.clientInquiryId',
        "'hasLastSubmission'",
        'root.DreamlandSuccessRuntime='
      ]
    );

    forbidMarkers(
      'Success runtime',
      success,
      [
        'root.DreamlandSubmission=',
        'root.DreamlandRisk=',
        'root.DreamlandInquirySubmissionFlow=',
        'root.DreamlandPwa='
      ]
    );
  }catch(error){
    fail(
      'D4 Success runtime inspection failed: '+
      error.message
    );
  }

  try{
    const successView=
      read(
        'src/astro/lib/success-view-model.mjs'
      );

    requireMarkers(
      'D4 Success view-model',
      successView,
      [
        "'dreamlandLastSubmissionV1'",
        "'hasLastSubmission'",
        "'/inquiry/'",
        "'/products/'",
        "'/custom/'"
      ]
    );
  }catch(error){
    fail(
      'D4 Success view-model inspection failed: '+
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
        ?.['r4:conversion:review-submission-closeout']!==
      'node scripts/validate-f3-d4-review-submission-closeout.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:review-submission-closeout.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:review-submission-closeout:dist']!==
      'node scripts/validate-f3-d4-review-submission-closeout.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:review-submission-closeout:dist.'
      );
    }

    assertOrder(
      'D4 source gate topology',
      String(
        pkg.scripts
          ?.validate||
        ''
      ),
      [
        'npm run r4:conversion:review-composition',
        'npm run r4:conversion:submission-reliability',
        'npm run r4:conversion:review-submission-closeout',
        'npm run r4:astro:success'
      ]
    );

    assertOrder(
      'D4 Production gate topology',
      String(
        pkg.scripts
          ?.build||
        ''
      ),
      [
        'npm run r4:conversion:review-composition:dist',
        'npm run r4:conversion:submission-reliability:dist',
        'npm run r4:conversion:review-submission-closeout:dist'
      ]
    );
  }catch(error){
    fail(
      'D4 package topology failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  try{
    const pairs=[
      [
        '.r4-astro-dist/inquiry/review/index.html',
        'dist/inquiry/review/index.html'
      ],
      [
        '.r4-astro-dist/r4-review-runtime.js',
        'dist/r4-review-runtime.js'
      ],
      [
        '.r4-astro-dist/inquiry/success/index.html',
        'dist/inquiry/success/index.html'
      ],
      [
        '.r4-astro-dist/r4-success-runtime.js',
        'dist/r4-success-runtime.js'
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
          'D4 artifact pair is missing: '+
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
          'Isolated Astro and Production artifacts are not byte-identical: '+
          production
        );
      }
    }
  }catch(error){
    fail(
      'D4 Production identity validation failed: '+
      error.message
    );
  }

  try{
    for(const relative of [
      '.r4-astro-dist/inquiry/review/index.html',
      'dist/inquiry/review/index.html'
    ]){
      if(!exists(relative)){
        continue;
      }

      const html=
        read(
          relative
        );

      requireMarkers(
        relative,
        html,
        [
          'data-r4-astro-review="true"',
          'data-review-conversion-composition="true"',
          'data-review-static-summary',
          'data-review-static-consent',
          'data-review-static-submit',
          'src="/r4-review-runtime.js"'
        ]
      );
    }

    for(const relative of [
      '.r4-astro-dist/r4-review-runtime.js',
      'dist/r4-review-runtime.js'
    ]){
      if(!exists(relative)){
        continue;
      }

      const runtime=
        read(
          relative
        );

      requireMarkers(
        relative,
        runtime,
        [
          'function conciseProductPreview(',
          'function runWithTimeout(',
          'function classifySubmissionError(',
          'function refreshAttemptGate(',
          'submissionFlow.attemptState(',
          "'UNKNOWN_PENDING'",
          "'SUBMISSION_TIMEOUT'"
        ]
      );
    }
  }catch(error){
    fail(
      'D4 Production Review validation failed: '+
      error.message
    );
  }

  try{
    for(const relative of [
      '.r4-astro-dist/inquiry/success/index.html',
      'dist/inquiry/success/index.html'
    ]){
      if(!exists(relative)){
        continue;
      }

      requireMarkers(
        relative,
        read(relative),
        [
          'data-r4-astro-success="true"',
          'data-success-static-reference',
          'data-success-static-next',
          'data-success-static-details',
          'data-success-static-actions',
          'src="/r4-success-runtime.js"'
        ]
      );
    }

    for(const relative of [
      '.r4-astro-dist/r4-success-runtime.js',
      'dist/r4-success-runtime.js'
    ]){
      if(!exists(relative)){
        continue;
      }

      const runtime=
        read(
          relative
        );

      requireMarkers(
        relative,
        runtime,
        [
          "'dreamlandLastSubmissionV1'",
          'function readLastSubmission(',
          'record?.inquiryId||',
          'record?.clientInquiryId',
          'root.DreamlandSuccessRuntime='
        ]
      );

      forbidMarkers(
        relative,
        runtime,
        [
          'root.DreamlandSubmission=',
          'root.DreamlandRisk=',
          'root.DreamlandInquirySubmissionFlow='
        ]
      );
    }
  }catch(error){
    fail(
      'D4 Production Success validation failed: '+
      error.message
    );
  }

  try{
    const manifest=
      json(
        'dist/multipage-build-manifest.json'
      );

    if(
      manifest.reviewOwner!==
        'astro'||
      manifest.reviewCutover!==
        'B7-00B.4J-R4.9D'||
      manifest.presentationOverrides
        ?.review!==
        'astro-r4.9d'
    ){
      fail(
        'Production manifest Review ownership/cutover contract changed.'
      );
    }

    if(
      manifest.successOwner!==
        'astro'||
      manifest.successCutover!==
        'B7-00B.4J-R4.10C'||
      manifest.presentationOverrides
        ?.success!==
        'astro-r4.10c'
    ){
      fail(
        'Production manifest Success ownership/cutover contract changed.'
      );
    }
  }catch(error){
    fail(
      'D4 Production manifest validation failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-D4 REVIEW & SUBMISSION CLOSEOUT: FAIL'
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
  'DREAMLAND F3-D4 REVIEW & SUBMISSION CLOSEOUT: PASS'
);
console.log(
  SOURCE_MODE
    ? 'D2 Review composition + D3 submission reliability + Success archive/readback + success-only clearing boundaries are closed.'
    : 'Isolated Astro + Production Review/Success preserve the complete F3-D Review & Submission contract.'
);
console.log('');

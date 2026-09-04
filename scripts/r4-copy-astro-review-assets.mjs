#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  ),
  '..'
);

const OUT=
  path.join(
    ROOT,
    '.r4-astro-dist'
  );

const SOURCES=Object.freeze([
  Object.freeze({
    owner:'PricingPolicy',
    path:
      'src/domain/pricing/runtime-pricing-policy.js'
  }),
  Object.freeze({
    owner:'Inquiry',
    path:
      'src/features/inquiry/runtime-inquiry.js'
  }),
  Object.freeze({
    owner:'Contact',
    path:
      'src/features/contact/runtime-contact.js'
  }),
  Object.freeze({
    owner:'PageGuards',
    path:
      'src/site/runtime/runtime-page-guards.js'
  }),
  Object.freeze({
    owner:'SubmissionPayload',
    path:
      'src/domain/submission/runtime-submission-payload.js'
  }),
  Object.freeze({
    owner:'Risk',
    path:
      'src/services/risk/runtime-risk.js'
  }),
  Object.freeze({
    owner:'Submission',
    path:
      'src/services/submission/runtime-submission.js'
  }),
  Object.freeze({
    owner:'Pwa',
    path:
      'src/services/pwa/runtime-pwa.js'
  }),
  Object.freeze({
    owner:'InquirySubmissionFlow',
    path:
      'src/app/runtime-inquiry-submission-flow.js'
  }),
  Object.freeze({
    owner:'Astro Review adapter',
    path:
      'src/astro/runtime/review-runtime.js'
  })
]);

function fail(message){
  console.error(
    '[R4.9C Review Submission Assets] FAIL'
  );
  console.error(
    '- '+
    message
  );
  process.exit(1);
}

if(
  !fs.existsSync(
    OUT
  )||
  fs.lstatSync(
    OUT
  ).isSymbolicLink()
){
  fail(
    'isolated Astro output is missing or unsafe.'
  );
}

const html=
  path.join(
    OUT,
    'inquiry',
    'review',
    'index.html'
  );

if(
  !fs.existsSync(
    html
  )
){
  fail(
    'isolated Review HTML is missing.'
  );
}

const chunks=[];

for(const source of SOURCES){
  const file=
    path.join(
      ROOT,
      source.path
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'canonical owner is missing: '+
      source.path
    );
  }

  const sourceText=
    fs.readFileSync(
      file,
      'utf8'
    );

  const wrapped=
    source.owner==='Pwa'
      ? (
          'globalThis.DREAMLAND_PWA_AUTO_REGISTER=false;\n'+
          sourceText+
          '\ndelete globalThis.DREAMLAND_PWA_AUTO_REGISTER;\n'
        )
      : sourceText;

  chunks.push(
    '/* R4.9C owner: '+
    source.owner+
    ' | '+
    source.path+
    ' */\n'+
    wrapped
  );
}

const bundle=
  chunks.join(
    '\n\n'
  )+
  '\n';

for(const [
  marker,
  label
] of [
  [
    'root.DreamlandPricingPolicy=',
    'DreamlandPricingPolicy'
  ],
  [
    'root.DreamlandInquiry=',
    'DreamlandInquiry'
  ],
  [
    'root.DreamlandContact=',
    'DreamlandContact'
  ],
  [
    'root.DreamlandPageGuards=',
    'DreamlandPageGuards'
  ],
  [
    'root.DreamlandSubmissionPayload=',
    'DreamlandSubmissionPayload'
  ],
  [
    'root.DreamlandRisk=',
    'DreamlandRisk'
  ],
  [
    'root.DreamlandSubmission=',
    'DreamlandSubmission'
  ],
  [
    'root.DreamlandPwa=api;',
    'DreamlandPwa'
  ],
  [
    'root.DreamlandInquirySubmissionFlow=',
    'DreamlandInquirySubmissionFlow'
  ],
  [
    'root.DreamlandReviewRuntime=',
    'DreamlandReviewRuntime'
  ]
]){
  const count=
    bundle.split(
      marker
    ).length-1;

  if(count!==1){
    fail(
      label+
      ' owner definition count must equal 1; found '+
      count+
      '.'
    );
  }
}

for(const marker of [
  'globalThis.DREAMLAND_PWA_AUTO_REGISTER=false;',
  'delete globalThis.DREAMLAND_PWA_AUTO_REGISTER;'
]){
  if(
    !bundle.includes(
      marker
    )
  ){
    fail(
      'Review submission bundle is missing isolated PWA registration suppression: '+
      marker
    );
  }
}

fs.writeFileSync(
  path.join(
    OUT,
    'r4-review-runtime.js'
  ),
  bundle,
  'utf8'
);

console.log(
  '[R4.9C Review Submission Assets] bundled canonical Review projection + Risk + Submission + PWA reachability + SubmissionFlow + Astro adapter -> .r4-astro-dist/r4-review-runtime.js'
);

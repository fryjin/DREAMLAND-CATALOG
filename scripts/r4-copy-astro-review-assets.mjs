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
    owner:'Astro Review adapter',
    path:
      'src/astro/runtime/review-runtime.js'
  })
]);

function fail(message){
  console.error(
    '[R4.9B Review Assets] FAIL'
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

  chunks.push(
    '/* R4.9B owner: '+
    source.owner+
    ' | '+
    source.path+
    ' */\n'+
    fs.readFileSync(
      file,
      'utf8'
    )
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

for(const forbidden of [
  'DreamlandRisk',
  'DreamlandSubmission',
  'DreamlandInquirySubmissionFlow',
  'hcaptcha',
  'runtime-pwa.js',
  'startup-loader.js',
  'serviceWorker.register',
  'navigator.serviceWorker',
  'fetch(',
  'XMLHttpRequest'
]){
  if(
    bundle.includes(
      forbidden
    )
  ){
    fail(
      'Review bundle crossed a downstream/PWA/data-fetch boundary: '+
      forbidden
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
  '[R4.9B Review Assets] bundled PricingPolicy + Inquiry + Contact + PageGuards + minimal Astro adapter -> .r4-astro-dist/r4-review-runtime.js'
);

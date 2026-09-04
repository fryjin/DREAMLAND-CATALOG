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

const BUNDLE_SOURCES=Object.freeze([
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
    owner:'Astro Contact adapter',
    path:
      'src/astro/runtime/contact-runtime.js'
  })
]);

function fail(message){
  console.error(
    '[R4.8B Contact Assets] FAIL'
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

const contactHtml=
  path.join(
    OUT,
    'inquiry',
    'contact',
    'index.html'
  );

if(
  !fs.existsSync(
    contactHtml
  )
){
  fail(
    'isolated Contact HTML is missing.'
  );
}

const chunks=[];

for(const source of BUNDLE_SOURCES){
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
    '/* R4.8B owner: '+
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
    'root.DreamlandContactRuntime=',
    'DreamlandContactRuntime'
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
  'startup-loader.js'
]){
  if(
    bundle.includes(
      forbidden
    )
  ){
    fail(
      'Contact bundle crossed a downstream boundary: '+
      forbidden
    );
  }
}

const output=
  path.join(
    OUT,
    'r4-contact-runtime.js'
  );

fs.writeFileSync(
  output,
  bundle,
  'utf8'
);

console.log(
  '[R4.8B Contact Assets] bundled PricingPolicy + Inquiry + Contact + minimal Astro adapter -> .r4-astro-dist/r4-contact-runtime.js'
);

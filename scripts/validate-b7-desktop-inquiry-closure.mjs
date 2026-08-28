#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function compact(value){
  return String(value||'').replace(/\s+/g,'');
}

async function executable(relative,globalName,methods){
  try{
    delete globalThis[globalName];

    await import(
      `${pathToFileURL(path.join(ROOT,relative)).href}?b7-00b3d=${Date.now()}-${globalName}`
    );

    const runtime=globalThis[globalName];

    if(!runtime||runtime.version!=='B7-00B.3D'){
      fail(`${globalName} B7-00B.3D was not exposed.`);
      return;
    }

    for(const method of methods){
      if(typeof runtime[method]!=='function'){
        fail(`${globalName}.${method} is missing.`);
      }
    }
  }catch(error){
    fail(`${globalName} executable validation failed: ${error.message}`);
  }
}

await executable(
  'src/ui/desktop/inquiry/runtime-desktop-inquiry.js',
  'DreamlandDesktopInquiry',
  ['configure','mount','refresh','syncInquiry','snapshot']
);

await executable(
  'src/ui/desktop/contact/runtime-desktop-contact.js',
  'DreamlandDesktopContact',
  ['configure','mount','refresh','syncInquiry','snapshot']
);

await executable(
  'src/ui/desktop/review/runtime-desktop-review.js',
  'DreamlandDesktopReview',
  ['configure','mount','refresh','syncInquiry','snapshot']
);

await executable(
  'src/ui/desktop/success/runtime-desktop-success.js',
  'DreamlandDesktopSuccess',
  ['configure','mount','refresh','snapshot']
);

for(const [relative,forbidden] of [
  [
    'src/ui/desktop/inquiry/runtime-desktop-inquiry.js',
    ['DreamlandInquiry','localStorage','sessionStorage','tierUnitCny','packSurchargeCny']
  ],
  [
    'src/ui/desktop/contact/runtime-desktop-contact.js',
    ['DreamlandContact','localStorage','sessionStorage']
  ],
  [
    'src/ui/desktop/review/runtime-desktop-review.js',
    ['DreamlandInquiry','DreamlandRisk','DreamlandInquirySubmissionFlow','fetch(']
  ],
  [
    'src/ui/desktop/success/runtime-desktop-success.js',
    ['DreamlandInquiry','localStorage','sessionStorage']
  ]
]){
  const source=read(relative);

  for(const marker of forbidden){
    if(source.includes(marker)){
      fail(`${relative} crossed its presentation boundary: ${marker}`);
    }
  }
}

try{
  const experience=read(
    'src/ui/desktop/runtime-desktop-experience.js'
  );

  for(const required of [
    "const VERSION='B7-00B.3D';",
    'id="desktopInquiryRoot"',
    'id="desktopContactRoot"',
    'id="desktopReviewRoot"',
    'id="desktopSuccessRoot"',
    'DreamlandDesktopInquiry',
    'DreamlandDesktopContact',
    'DreamlandDesktopReview',
    'DreamlandDesktopSuccess',
    "currentScreen==='inquiry'",
    "currentScreen==='contact'",
    "currentScreen==='preview'",
    "currentScreen==='success'",
    "'is-inquiry'",
    "'is-contact'",
    "'is-review'",
    "'is-success'",
    'inquiryState:',
    'contactState:',
    'inquiryPresentation()',
    'contactPresentation()',
    'reviewPresentation()',
    'successPresentation()'
  ]){
    if(!experience.includes(required)){
      fail(`Desktop Experience is missing Inquiry Closure integration: ${required}`);
    }
  }

  const flatExperience=
    compact(
      experience
    );

  if(
    !flatExperience.includes(
      'config.inquiryState?.buildViewModel?.()'
    )
  ){
    fail(
      'Desktop Experience must build the Inquiry ViewModel through injected config.inquiryState.'
    );
  }

  for(const forbidden of [
    'root.DreamlandInquiry',
    'root.DreamlandContact',
    'root.DreamlandRisk',
    'root.DreamlandInquirySubmissionFlow'
  ]){
    if(experience.includes(forbidden)){
      fail(`Desktop Experience reached into a global business owner: ${forbidden}`);
    }
  }
}catch(error){
  fail(`Desktop Experience validation failed: ${error.message}`);
}

try{
  const index=read('index.html');

  for(const required of [
    "window.DREAMLAND_RELEASE='b7-00b4e-r1.1-v118';",
    './src/ui/desktop/styles/inquiry.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/styles/contact.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/styles/review.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/styles/success.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/inquiry/runtime-desktop-inquiry.js?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/contact/runtime-desktop-contact.js?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/review/runtime-desktop-review.js?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/success/runtime-desktop-success.js?release=b7-00b4e-r1.1-v118',
    'inquiryState:',
    'inquiryFeature,',
    'contactState:',
    'contactFeature,',
    'desktopContinueInquiry(',
    'desktopContinueContact(',
    'desktopReviewProjection(',
    'desktopSubmitInquiry(',
    'desktopLastSubmission(',
    'contactFeature.validate(',
    'submissionFlow',
    'riskService'
  ]){
    if(!index.includes(required)){
      fail(`index.html is missing Inquiry Closure bridge: ${required}`);
    }
  }

  const flatIndex=
    compact(
      index
    );

  if(
    !flatIndex.includes(
      'inquiryFeature.buildProjection('
    )
  ){
    fail(
      'index.html must build the Review Projection through canonical inquiryFeature.buildProjection().'
    );
  }

  for(const required of [
    'data-screen="inquiry"',
    'data-screen="contact"',
    'data-screen="preview"',
    'data-screen="success"'
  ]){
    if(!index.includes(required)){
      fail(`Historical Mobile Inquiry Flow presentation regressed: ${required}`);
    }
  }
}catch(error){
  fail(`index bridge validation failed: ${error.message}`);
}

try{
  const inquiry=read('src/features/inquiry/runtime-inquiry.js');
  const contact=read('src/features/contact/runtime-contact.js');
  const submission=read('src/app/runtime-inquiry-submission-flow.js');
  const risk=read('src/services/risk/runtime-risk.js');

  if(!inquiry.includes("version:'B5-05'")){
    fail('Canonical DreamlandInquiry B5-05 changed.');
  }

  if(!contact.includes("const VERSION='B5-06';")){
    fail('Canonical DreamlandContact B5-06 changed.');
  }

  if(!submission.includes('DreamlandInquirySubmissionFlow')){
    fail('Canonical submission flow is unavailable.');
  }

  if(!risk.includes("version:'B4-02'")){
    fail('Canonical DreamlandRisk B4-02 changed.');
  }
}catch(error){
  fail(`Canonical owner validation failed: ${error.message}`);
}

for(const [relative,screen,className] of [
  ['src/ui/desktop/styles/inquiry.css','inquiry','is-inquiry'],
  ['src/ui/desktop/styles/contact.css','contact','is-contact'],
  ['src/ui/desktop/styles/review.css','preview','is-review'],
  ['src/ui/desktop/styles/success.css','success','is-success']
]){
  try{
    const css=read(relative);
    const flat=compact(css);

    if(!flat.includes(
      compact(`body.desktop-experience-ready[data-desktop-screen="${screen}"] > #app{display:none!important;}`)
    )){
      fail(`${relative} does not hide Mobile #app for ${screen}.`);
    }

    if(!flat.includes(
      compact(`.desktop-experience.${className} .desktop-site-main`)
    )){
      fail(`${relative} does not restore Desktop main for ${className}.`);
    }
  }catch(error){
    fail(`${relative} validation failed: ${error.message}`);
  }
}

try{
  const site=JSON.parse(
    read('data/site-content.json')
  );

  for(const lang of ['en','zh','ko']){
    const flow=site?.languages?.[lang]?.inquiryFlow;

    for(const key of [
      'title',
      'contactTitle',
      'reviewTitle',
      'successTitle',
      'continueContact',
      'reviewInquiry',
      'submitInquiry',
      'customQuotedSeparately',
      'privacyRequired'
    ]){
      if(!flow?.[key]){
        fail(`Inquiry Flow copy is incomplete for ${lang}.${key}`);
      }
    }
  }
}catch(error){
  fail(`Inquiry Flow copy validation failed: ${error.message}`);
}

try{
  const sw=read('sw.js');
  const pwa=read(
    'src/services/pwa/runtime-pwa.js'
  );

  for(const required of [
    "const CACHE_VERSION = 'dreamland-pwa-v118';",
    "'b7-00b4e-r1.1-v118'",
    './src/ui/desktop/styles/inquiry.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/styles/contact.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/styles/review.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/styles/success.css?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/inquiry/runtime-desktop-inquiry.js?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/contact/runtime-desktop-contact.js?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/review/runtime-desktop-review.js?release=b7-00b4e-r1.1-v118',
    './src/ui/desktop/success/runtime-desktop-success.js?release=b7-00b4e-r1.1-v118',
    "'./src/ui/desktop/inquiry/runtime-desktop-inquiry.js'",
    "'./src/ui/desktop/contact/runtime-desktop-contact.js'",
    "'./src/ui/desktop/review/runtime-desktop-review.js'",
    "'./src/ui/desktop/success/runtime-desktop-success.js'"
  ]){
    if(!sw.includes(required)){
      fail(`sw.js is missing PWA v98 Inquiry Closure asset: ${required}`);
    }
  }

  if(!pwa.includes("'b7-00b4e-r1.1-v118'")){
    fail('PWA runtime was not advanced to B7-00B.3D.');
  }
}catch(error){
  fail(`PWA validation failed: ${error.message}`);
}

try{
  const pkg=JSON.parse(read('package.json'));

  if(
    pkg?.scripts?.['desktop:inquiry-closure']!==
    'node scripts/validate-b7-desktop-inquiry-closure.mjs'
  ){
    fail('package.json is missing desktop:inquiry-closure.');
  }

  const validate=String(pkg?.scripts?.validate||'');

  if(!validate.includes(
    'npm run desktop:inquiry-closure && npm run desktop:custom && npm run desktop:detail && npm run desktop:website && npm run desktop:catalog'
  )){
    fail('Desktop Inquiry Closure gate must run before Custom / Detail / Website / final Catalog.');
  }

  if(!validate.endsWith('npm run desktop:catalog')){
    fail('desktop:catalog must remain the final Desktop aggregate gate.');
  }
}catch(error){
  fail(`package validation failed: ${error.message}`);
}

if(errors.length){
  console.error('\nB7-00B.3D Desktop Inquiry Closure validation failed:\n');

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  'B7-00B.3D Desktop Inquiry / Contact / Review / Success validation: PASS'
);

console.log(
  'Desktop-owned Inquiry Closure / canonical Inquiry + Contact + Submission + Risk owners / no Mobile fallback / EN-ZH-KO / PWA v98 PASS.'
);

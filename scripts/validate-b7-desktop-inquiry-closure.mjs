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
    "window.DREAMLAND_RELEASE='b7-00b4j-r3-v129';",
    './src/ui/desktop/styles/inquiry.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/styles/contact.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/styles/review.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/styles/success.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/inquiry/runtime-desktop-inquiry.js?release=b7-00b4j-r3-v129',
    './src/ui/desktop/contact/runtime-desktop-contact.js?release=b7-00b4j-r3-v129',
    './src/ui/desktop/review/runtime-desktop-review.js?release=b7-00b4j-r3-v129',
    './src/ui/desktop/success/runtime-desktop-success.js?release=b7-00b4j-r3-v129',
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
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    "'b7-00b4j-r3-v129'",
    './src/ui/desktop/styles/inquiry.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/styles/contact.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/styles/review.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/styles/success.css?release=b7-00b4j-r3-v129',
    './src/ui/desktop/inquiry/runtime-desktop-inquiry.js?release=b7-00b4j-r3-v129',
    './src/ui/desktop/contact/runtime-desktop-contact.js?release=b7-00b4j-r3-v129',
    './src/ui/desktop/review/runtime-desktop-review.js?release=b7-00b4j-r3-v129',
    './src/ui/desktop/success/runtime-desktop-success.js?release=b7-00b4j-r3-v129',
    "'./src/ui/desktop/inquiry/runtime-desktop-inquiry.js'",
    "'./src/ui/desktop/contact/runtime-desktop-contact.js'",
    "'./src/ui/desktop/review/runtime-desktop-review.js'",
    "'./src/ui/desktop/success/runtime-desktop-success.js'"
  ]){
    if(!sw.includes(required)){
      fail(`sw.js is missing PWA v98 Inquiry Closure asset: ${required}`);
    }
  }

  if(!pwa.includes("'b7-00b4j-r3-v129'")){
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


/* Gate 4F-R1 — Inquiry Workspace + MOQ Group Review Recomposition. */
try{
  const runtime=read('src/ui/desktop/inquiry/runtime-desktop-inquiry.js');
  const css=read('src/ui/desktop/styles/inquiry.css');
  const site=JSON.parse(read('data/site-content.json'));

  for(const required of [
    "const PRESENTATION_VERSION='B7-00B.4F-R1';",
    'data-desktop-inquiry-presentation=',
    'desktop-inquiry-workspace',
    'desktop-inquiry-moq-group',
    'desktop-inquiry-overview',
    'desktop-inquiry-product-selection',
    'desktop-inquiry-custom-projects',
    'function deriveMoqGroups(data=view())',
    'function syncWorkspace(data=view())',
    'function syncOverview(data=view())',
    'function renderDialog()'
  ]){
    if(!runtime.includes(required)){
      fail('Desktop Inquiry 4F R1 runtime is missing: '+required);
    }
  }

  for(const required of [
    'B7-00B.4F R1 — Inquiry Workspace + MOQ Group Review Recomposition',
    '[data-desktop-inquiry-presentation="B7-00B.4F-R1"]',
    '.desktop-inquiry-moq-group__head',
    '.desktop-inquiry-overview',
    '.desktop-inquiry-custom-projects',
    'var(--dw-container-wide)'
  ]){
    if(!css.includes(required)){
      fail('Desktop Inquiry 4F R1 CSS is missing: '+required);
    }
  }

  if(/font-size:(?:8|9|10)px;/.test(css)){
    fail('Desktop Inquiry 4F R1 readability regression: inquiry.css contains visible 8/9/10px text.');
  }

  const clickStart=runtime.indexOf('function onClick(event)');
  const clickEnd=runtime.indexOf('function onChange(event)',clickStart);
  const clickBody=
    clickStart>=0&&clickEnd>clickStart
      ? runtime.slice(clickStart,clickEnd)
      : '';

  if(clickBody.includes('render();')){
    fail('Desktop Inquiry 4F R1 interaction regression: click mutations/dialog actions still call full render().');
  }

  const changeStart=runtime.indexOf('function onChange(event)');
  const changeEnd=runtime.indexOf('function onKeyDown(event)',changeStart);
  const changeBody=
    changeStart>=0&&changeEnd>changeStart
      ? runtime.slice(changeStart,changeEnd)
      : '';

  if(changeBody.includes('render();')){
    fail('Desktop Inquiry 4F R1 interaction regression: quantity changes still call full render().');
  }

  for(const lang of ['en','zh','ko']){
    const flow=site?.languages?.[lang]?.inquiryFlow;

    for(const key of [
      'workspaceTitle',
      'productSelection',
      'customProjects',
      'inquiryOverview',
      'currentItemQuantity',
      'moqRule',
      'moqReady',
      'moqRemaining',
      'moqGroupsPending'
    ]){
      if(!flow?.[key]){
        fail('Desktop Inquiry 4F R1 copy is missing for '+lang+'.'+key+'.');
      }
    }
  }
}catch(error){
  fail('Desktop Inquiry 4F R1 successor validation failed: '+error.message);
}


/* Gate 4F-R1.1 + 4G-R1 — selection, countries and public-copy audit. */
try{
  const inquiry=read('src/ui/desktop/inquiry/runtime-desktop-inquiry.js');
  const contact=read('src/ui/desktop/contact/runtime-desktop-contact.js');
  const review=read('src/ui/desktop/review/runtime-desktop-review.js');
  const inquiryCss=read('src/ui/desktop/styles/inquiry.css');
  const contactCss=read('src/ui/desktop/styles/contact.css');
  const site=JSON.parse(read('data/site-content.json'));

  for(const required of [
    "const SELECTION_VERSION='B7-00B.4F-R1.1';",
    'let selectedIds=new Set();',
    'data-desktop-inquiry-select-all',
    'data-desktop-inquiry-select-item',
    'data-desktop-inquiry-select-group',
    'data-desktop-inquiry-action="remove-selected"',
    'data-desktop-inquiry-action="remove-group"',
    'function syncSelectionControls(data=view())'
  ]){
    if(!inquiry.includes(required)){
      fail('Desktop Inquiry 4F R1.1 is missing: '+required);
    }
  }

  for(const required of [
    'B7-00B.4F R1.1 — Inquiry Multi-Select + Group Actions',
    '[data-desktop-inquiry-selection="B7-00B.4F-R1.1"]',
    '.desktop-inquiry-select',
    '.desktop-inquiry-group-remove'
  ]){
    if(!inquiryCss.includes(required)){
      fail('Desktop Inquiry 4F R1.1 CSS is missing: '+required);
    }
  }

  // B7-00B.4I R1.2 — Contact presentation compatibility.
  // Country/region behavior remains the 4F R1.1 contract; only the Desktop
  // Contact presentation owner advanced to 4I.
  for(const required of [
    "const PRESENTATION_VERSION='B7-00B.4I-R1';",
    'function countryRegions()',
    'function countryField()',
    'data-desktop-contact-field="country"',
    '<select'
  ]){
    if(!contact.includes(required)){
      fail('Desktop Contact country selector is missing: '+required);
    }
  }

  if(!review.includes('function countryDisplay(value)')){
    fail('Desktop Review must display localized country / region name + ISO code.');
  }

  const contactChangeStart=contact.indexOf('function onChange(event)');
  const contactChangeEnd=contact.indexOf('function onClick(event)',contactChangeStart);
  const contactChangeBody=
    contactChangeStart>=0&&contactChangeEnd>contactChangeStart
      ? contact.slice(contactChangeStart,contactChangeEnd)
      : '';

  if(contactChangeBody.includes('render(')){
    fail('Desktop Contact selector change still triggers a full render.');
  }

  if(!contactCss.includes('B7-00B.4F R1.1 — Country / Region Selector')){
    fail('Desktop Contact country selector CSS is missing.');
  }

  const serialized=JSON.stringify(site);

  for(const forbidden of [
    '你的作品清单正在成形。',
    'Your selection is taking shape.',
    '선택한 디자인이 모이고 있습니다.',
    '当前意向单',
    '确认意向单'
  ]){
    if(serialized.includes(forbidden)){
      fail('Global public-copy audit still contains rejected copy: '+forbidden);
    }
  }

  for(const lang of ['en','zh','ko']){
    const language=site?.languages?.[lang];
    const flow=language?.inquiryFlow;
    const rows=flow?.countryRegions;

    if(!Array.isArray(rows)||rows.length<240){
      fail('Country / region list is incomplete for '+lang+'.');
      continue;
    }

    const codes=new Set();

    for(const row of rows){
      if(
        !/^[A-Z]{2}$/.test(String(row?.code||''))||
        !String(row?.label||'').trim()
      ){
        fail('Invalid country / region row for '+lang+'.');
        break;
      }

      codes.add(row.code);
    }

    if(codes.size!==rows.length){
      fail('Country / region codes are not unique for '+lang+'.');
    }

    for(const key of [
      'selectAll',
      'selectedCount',
      'removeSelected',
      'removeGroup',
      'workspaceTitle',
      'productSelection'
    ]){
      if(!flow?.[key]){
        fail('Inquiry selection copy is missing for '+lang+'.'+key+'.');
      }
    }
  }

  if(site?.languages?.zh?.catalog?.ctaReadyTitle!=='查看已选产品。'){
    fail('Chinese Catalog CTA still uses rejected ownership wording.');
  }

  if(site?.languages?.en?.catalog?.ctaReadyTitle!=='Review selected products.'){
    fail('English Catalog CTA audit was not applied.');
  }

  if(site?.languages?.ko?.catalog?.ctaReadyTitle!=='선택한 제품을 확인하세요.'){
    fail('Korean Catalog CTA audit was not applied.');
  }
}catch(error){
  fail('4F R1.1 + 4G R1 successor validation failed: '+error.message);
}


/* Gate 4I-R1 — Contact Brief + Final Review + Submission Confirmation. */
try{
  const contact=read('src/ui/desktop/contact/runtime-desktop-contact.js');
  const review=read('src/ui/desktop/review/runtime-desktop-review.js');
  const success=read('src/ui/desktop/success/runtime-desktop-success.js');
  const contactCss=read('src/ui/desktop/styles/contact.css');
  const reviewCss=read('src/ui/desktop/styles/review.css');
  const successCss=read('src/ui/desktop/styles/success.css');
  const experience=read('src/ui/desktop/runtime-desktop-experience.js');
  const site=JSON.parse(read('data/site-content.json'));

  for(const [source,label,markers] of [
    [
      contact,
      'Contact',
      [
        "const PRESENTATION_VERSION='B7-00B.4I-R1';",
        'desktop-contact-brief',
        'desktop-contact-chapter',
        'function syncValidationUi()',
        'function syncFieldError(field)',
        'data-desktop-contact-field-shell='
      ]
    ],
    [
      review,
      'Review',
      [
        "const PRESENTATION_VERSION='B7-00B.4I-R1';",
        'desktop-final-review',
        'desktop-review-product',
        'function deriveMoqGroups(data=projection())',
        'function budgetDisplay(value)',
        'function syncSubmitState()',
        'data-desktop-review-risk-status',
        'data-desktop-review-captcha-section',
        'data-desktop-review-captcha'
      ]
    ],
    [
      success,
      'Success',
      [
        "const PRESENTATION_VERSION='B7-00B.4I-R1';",
        'desktop-submission-confirmation',
        'desktop-success-reference',
        'data-desktop-success-presentation='
      ]
    ]
  ]){
    for(const marker of markers){
      if(!source.includes(marker)){
        fail('Desktop '+label+' 4I R1 runtime is missing: '+marker);
      }
    }
  }

  if(review.includes('previewValue}</p>')){
    fail('Desktop Review 4I R1 must not use canonical previewValue as the primary product UI.');
  }

  /*
   * B7-00B.4J R3.4a — Review security ownership successor.
   *
   * R3.4 intentionally removes the old:
   *   if(!state.requiresCaptcha) return '';
   *
   * The Risk/CAPTCHA mount must exist before the async assessment starts.
   */
  const reviewSecurityStart=
    review.indexOf(
      'function securityHtml(){'
    );

  const reviewSecurityEnd=
    review.indexOf(
      'function summaryHtml(data)',
      reviewSecurityStart
    );

  const reviewSecurityBody=
    reviewSecurityStart>=0&&
    reviewSecurityEnd>reviewSecurityStart
      ? review.slice(
          reviewSecurityStart,
          reviewSecurityEnd
        )
      : '';

  for(const marker of [
    'data-desktop-review-risk-status',
    'data-desktop-review-captcha-section',
    'data-desktop-review-captcha',
    'hidden'
  ]){
    if(!reviewSecurityBody.includes(marker)){
      fail(
        'Desktop Review R3.4 native security mount is missing: '+
        marker
      );
    }
  }

  if(
    reviewSecurityBody.includes(
      'if(!state.requiresCaptcha)'
    )
  ){
    fail(
      'Desktop Review R3.4 security mount must not depend on requiresCaptcha before Risk assessment.'
    );
  }

  const contactClickStart=contact.indexOf('function onClick(event)');
  const contactClickEnd=contact.indexOf('function loadDraft()',contactClickStart);
  const contactClickBody=
    contactClickStart>=0&&contactClickEnd>contactClickStart
      ? contact.slice(contactClickStart,contactClickEnd)
      : '';

  if(contactClickBody.includes('render({preserveScroll:true})')){
    fail('Desktop Contact 4I R1 validation must update locally without full render.');
  }

  const reviewChangeStart=review.indexOf('function onChange(event)');
  const reviewChangeEnd=review.indexOf('function onClick(event)',reviewChangeStart);
  const reviewChangeBody=
    reviewChangeStart>=0&&reviewChangeEnd>reviewChangeStart
      ? review.slice(reviewChangeStart,reviewChangeEnd)
      : '';

  if(reviewChangeBody.includes('render(')){
    fail('Desktop Review 4I R1 privacy changes must not rebuild the page.');
  }

  const reviewSubmitStart=review.indexOf('async function submit()');
  const reviewSubmitEnd=review.indexOf('function onChange(event)',reviewSubmitStart);
  const reviewSubmitBody=
    reviewSubmitStart>=0&&reviewSubmitEnd>reviewSubmitStart
      ? review.slice(reviewSubmitStart,reviewSubmitEnd)
      : '';

  if(reviewSubmitBody.includes('render(')){
    fail('Desktop Review 4I R1 submit state must update locally without full render.');
  }

  for(const [css,label,marker] of [
    [contactCss,'Contact','B7-00B.4I R1 — Business Contact Brief'],
    [reviewCss,'Review','B7-00B.4I R1 — Final Inquiry Review'],
    [successCss,'Success','B7-00B.4I R1 — Submission Confirmation']
  ]){
    if(!css.includes(marker)){
      fail('Desktop '+label+' 4I R1 CSS marker is missing.');
    }

    if(/font-size:(?:8|9|10)px;/.test(css.slice(css.indexOf(marker)))){
      fail('Desktop '+label+' 4I R1 readability regression: visible 8/9/10px text.');
    }
  }

  for(const required of [
    'budgetOptions:',
    'config.budgetOptions',
    'choiceLabel:',
    'config.choiceLabel',
    'seriesLabel:',
    'config.seriesLabel',
    'itemScentLabel:',
    'config.itemScentLabel',
    'itemMoq:',
    'config.itemMoq'
  ]){
    if(!experience.includes(required)){
      fail('Desktop Experience 4I Review bridge is missing: '+required);
    }
  }

  for(const lang of ['en','zh','ko']){
    const flow=site?.languages?.[lang]?.inquiryFlow;

    for(const key of [
      'contactChapterPerson',
      'contactChapterRegion',
      'contactChapterChannels',
      'contactChapterNotes',
      'requiredLabel',
      'optionalLabel',
      'selectBuyerType',
      'contactSnapshotTitle',
      'reviewMoqStatus',
      'reviewMoqGroupsReady'
    ]){
      if(!flow?.[key]){
        fail('Desktop 4I R1 copy is missing for '+lang+'.'+key+'.');
      }
    }
  }
}catch(error){
  fail('Desktop 4I R1 conversion-flow validation failed: '+error.message);
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

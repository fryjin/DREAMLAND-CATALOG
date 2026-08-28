#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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

function includesAll(source,markers,label){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(`${label} is missing: ${marker}`);
    }
  }
}

try{
  const tokens=read('src/ui/desktop/styles/tokens.css');
  const primitives=read('src/ui/desktop/styles/primitives.css');

  includesAll(
    tokens,
    [
      'B7-00B.4A',
      '--dw-color-canvas:',
      '--dw-color-surface-warm:',
      '--dw-color-danger:',
      '--dw-focus-ring:',
      '--dw-font-sans:',
      '--dw-type-display-xl-size:',
      '--dw-type-page-size:',
      '--dw-type-section-size:',
      '--dw-copy-measure:',
      '--dw-space-1:',
      '--dw-section-editorial:',
      '--dw-container-wide:',
      '--dw-radius-control:',
      '--dw-shadow-float:',
      '--dw-ratio-product:',
      '--dw-duration-standard:',
      '--dw-ease-out:',
      'body.desktop-experience-ready[data-desktop-screen] > #app'
    ],
    'Desktop visual tokens'
  );

  includesAll(
    primitives,
    [
      'B7-00B.4A',
      '.desktop-display-xl',
      '.desktop-page-display',
      '.desktop-section-heading',
      '.desktop-button',
      '.desktop-control',
      '.desktop-choice',
      '.desktop-media',
      'text-wrap:balance;',
      'text-wrap:pretty;',
      'word-break:keep-all;',
      'white-space:nowrap;',
      '@media (prefers-reduced-motion:reduce)'
    ],
    'Desktop visual primitives'
  );

  for(const forbidden of [
    'DreamlandInquiry',
    'DreamlandContact',
    'DreamlandCustom',
    'DreamlandDetail',
    'DreamlandSubmission',
    'DreamlandRisk',
    'localStorage',
    'sessionStorage'
  ]){
    if(tokens.includes(forbidden)||primitives.includes(forbidden)){
      fail(`Visual Foundation crossed a business owner boundary: ${forbidden}`);
    }
  }
}catch(error){
  fail(`Visual Foundation source validation failed: ${error.message}`);
}

try{
  const index=read('index.html');
  const tokensRef='./src/ui/desktop/styles/tokens.css?release=b7-00b4e-r1.1-v118';
  const primitivesRef='./src/ui/desktop/styles/primitives.css?release=b7-00b4e-r1.1-v118';
  const shellRef='./src/ui/desktop/styles/shell.css?release=b7-00b4e-r1.1-v118';

  includesAll(
    index,
    [
      "window.DREAMLAND_RELEASE='b7-00b4e-r1.1-v118';",
      tokensRef,
      primitivesRef,
      shellRef
    ],
    'index Desktop Foundation integration'
  );

  if(!(
    index.indexOf(tokensRef)<index.indexOf(primitivesRef)&&
    index.indexOf(primitivesRef)<index.indexOf(shellRef)
  )){
    fail('Desktop CSS load order must remain tokens -> primitives -> shell.');
  }
}catch(error){
  fail(`index Foundation validation failed: ${error.message}`);
}

try{
  const sw=read('sw.js');
  const pwa=read('src/services/pwa/runtime-pwa.js');

  includesAll(
    sw,
    [
      "const CACHE_VERSION = 'dreamland-pwa-v118';",
      "'b7-00b4e-r1.1-v118'",
      './src/ui/desktop/styles/primitives.css?release=b7-00b4e-r1.1-v118',
      "'./src/ui/desktop/styles/primitives.css'"
    ],
    'Service Worker Foundation release'
  );

  if(!pwa.includes("'b7-00b4e-r1.1-v118'")){
    fail('PWA runtime release tag was not advanced to B7-00B.4A R1.');
  }
}catch(error){
  fail(`PWA Foundation validation failed: ${error.message}`);
}

try{
  const shell=read('src/ui/desktop/styles/shell.css');

  includesAll(
    shell,
    [
      'B7-00B.4A — all current Desktop screens are Desktop-owned',
      '.desktop-experience[data-desktop-structured="true"] .desktop-site-main',
      '.desktop-experience[data-desktop-structured="true"] .desktop-site-footer'
    ],
    'Desktop Shell ownership successor'
  );
}catch(error){
  fail(`Desktop Shell successor validation failed: ${error.message}`);
}

try{
  const experience=
    read('src/ui/desktop/runtime-desktop-experience.js');
  const primitives=
    read('src/ui/desktop/styles/primitives.css');
  const inquiry=
    read('src/ui/desktop/styles/inquiry.css');
  const custom=
    read('src/ui/desktop/styles/custom.css');
  const detail=
    read('src/ui/desktop/styles/detail.css');
  const site=
    JSON.parse(
      read('data/site-content.json')
    );

  includesAll(
    experience,
    [
      'function syncPresentationLanguage()',
      'rootElement.dataset',
      ".lang=\n      lang;",
      "lang==='zh'"
    ],
    'Desktop language-aware presentation hook'
  );

  includesAll(
    primitives,
    [
      'B7-00B.4A R1.1 — language-aware typography successor',
      '.desktop-experience[data-lang="en"]',
      '.desktop-experience[data-lang="zh"]',
      '.desktop-experience[data-lang="ko"]',
      'line-break:strict;',
      'word-break:keep-all;',
      '@media (min-width:1280px)'
    ],
    'R1.1 typography successor'
  );

  if(
    inquiry.includes(
      '.desktop-flow-progress{\n    margin-top:34px;\n    display:grid;\n    grid-template-columns:repeat(3,minmax(0,1fr));\n    max-width:620px;\n    border-top:'
    )
  ){
    fail('Inquiry progress rule must not sit above the step labels.');
  }

  includesAll(
    inquiry,
    [
      'border-bottom:1px solid var(--dw-color-line);',
      'border-color:var(--dw-color-ink);'
    ],
    'R1.1 progress treatment'
  );

  includesAll(
    custom,
    [
      'R1.1 Foundation migration',
      'border:0;',
      'border-radius:0;',
      'background:transparent;'
    ],
    'R1.1 Custom Foundation migration'
  );

  includesAll(
    detail,
    [
      'lower PDP facts use editorial dividers',
      '.desktop-detail-info-card{',
      'border-radius:0;',
      'background:transparent;'
    ],
    'R1.1 PDP Foundation migration'
  );

  const publicCopy={
    en:{
      customTitle:'Custom-made for brands, events and collections.',
      reviewTitle:'Review your inquiry before sending.',
      successTitle:'Thank you. We’ve received your inquiry.'
    },
    zh:{
      customTitle:'为品牌、活动与专属系列定制。',
      reviewTitle:'提交前，请确认以下信息。',
      successTitle:'感谢提交，我们已收到你的询价。'
    },
    ko:{
      customTitle:'브랜드, 이벤트와 전용 컬렉션을 위한 맞춤 제작.',
      reviewTitle:'제출 전에 문의 내용을 확인해 주세요.',
      successTitle:'감사합니다. 문의가 접수되었습니다.'
    }
  };

  for(const [lang,expected] of Object.entries(publicCopy)){
    const localized=site.languages?.[lang];

    if(
      localized?.customProject?.title!==
      expected.customTitle
    ){
      fail(`Public copy regression: ${lang}.customProject.title`);
    }

    if(
      localized?.inquiryFlow?.reviewTitle!==
      expected.reviewTitle
    ){
      fail(`Public copy regression: ${lang}.inquiryFlow.reviewTitle`);
    }

    if(
      localized?.inquiryFlow?.successTitle!==
      expected.successTitle
    ){
      fail(`Public copy regression: ${lang}.inquiryFlow.successTitle`);
    }
  }

  const serialized=
    JSON.stringify(
      site
    );

  for(const legacy of [
    '先说清楚这是什么项目。',
    '在一个页面完成最终确认。',
    '谢谢，项目已经交给我们了。',
    'Start with the project.',
    'Everything in one place.',
    'Thank you. Your project is now with us.'
  ]){
    if(serialized.includes(legacy)){
      fail(`Legacy internal/product copy remains: ${legacy}`);
    }
  }
}catch(error){
  fail(`R1.1 Visual / copy successor validation failed: ${error.message}`);
}

try{
  const custom=read('src/ui/desktop/styles/custom.css');
  const inquiry=read('src/ui/desktop/styles/inquiry.css');
  const contact=read('src/ui/desktop/styles/contact.css');
  const review=read('src/ui/desktop/styles/review.css');
  const detail=read('src/ui/desktop/styles/detail.css');
  const site=JSON.parse(read('data/site-content.json'));

  includesAll(
    custom,
    [
      'B7-00B.4A R1.2 — section rhythm without leading rules',
      '.desktop-custom-section > .desktop-custom-field + .desktop-custom-field',
      '.desktop-custom-two > .desktop-custom-field',
      '.desktop-custom-input-wrap:focus-within',
      '.desktop-custom-input-wrap .desktop-custom-input:focus-visible',
      'outline:0!important;'
    ],
    'R1.2 Custom alignment/focus successor'
  );

  for(const [label,source,pattern] of [
    [
      'Custom section shell',
      custom,
      /\.desktop-custom-section\s*\{[^}]*border-top\s*:/m
    ],
    [
      'Inquiry list shell',
      inquiry,
      /\.desktop-inquiry-list\s*\{[^}]*border-top\s*:\s*1px/m
    ],
    [
      'Contact card shell',
      contact,
      /\.desktop-contact-card\s*\{[^}]*border-top\s*:/m
    ],
    [
      'Review main shell',
      review,
      /\.desktop-review-main\s*\{[^}]*border-top\s*:\s*1px/m
    ],
    [
      'Review section shell',
      review,
      /\.desktop-review-section\s*\{[^}]*border-bottom\s*:\s*1px/m
    ],
    [
      'PDP info-card shell',
      detail,
      /\.desktop-detail-info-card\s*\{[^}]*border-top\s*:/m
    ]
  ]){
    if(pattern.test(source)){
      fail(`R1.2 divider regression: ${label} still draws a leading section rule.`);
    }
  }

  if(
    site.languages?.zh?.customProject?.quotedAfterReview!==
    '根据确认需求核算报价'
  ){
    fail('R1.2 public copy regression: zh custom quotation wording.');
  }

  if(
    site.languages?.zh?.customProject?.minimumQuantity!==
    '最低定制数量'
  ){
    fail('R1.2 public copy regression: zh minimum quantity label.');
  }
}catch(error){
  fail(`R1.2 Visual Polish successor validation failed: ${error.message}`);
}

try{
  const tokens=read('src/ui/desktop/styles/tokens.css');
  const primitives=read('src/ui/desktop/styles/primitives.css');

  includesAll(
    tokens,
    [
      '--dw-type-page-size:clamp(42px,4vw,64px);',
      '--dw-type-page-line:1.02;',
      '--dw-type-support-size:11px;',
      '--dw-type-label-size:12px;',
      '--dw-type-control-size:13px;'
    ],
    'R1.3 Desktop readability tokens'
  );

  includesAll(
    primitives,
    [
      'R1.3 focus contract',
      '.desktop-experience :is(\n    button,\n    a,\n    [tabindex]',
      'input[type="number"]::-webkit-inner-spin-button'
    ],
    'R1.3 complete-control focus contract'
  );

  const pageCss=[
    'home.css',
    'catalog.css',
    'detail.css',
    'custom.css',
    'inquiry.css',
    'contact.css',
    'review.css',
    'success.css'
  ];

  for(const file of pageCss){
    const source=read(`src/ui/desktop/styles/${file}`);
    if(/font-size:(?:8|9|10)px;/.test(source)){
      fail(`R1.3 readability regression: ${file} still contains visible 8/9/10px text.`);
    }
  }

  for(const [file,marker] of [
    ['catalog.css','B7-00B.4A R1.3 — Catalog control focus consistency'],
    ['detail.css','B7-00B.4A R1.3 — PDP readable metadata + compound focus'],
    ['custom.css','B7-00B.4A R1.3 — Custom unified controls + readable hierarchy'],
    ['inquiry.css','B7-00B.4A R1.3 — Inquiry readable data + full-control focus'],
    ['contact.css','B7-00B.4A R1.3 — Contact readable fields + unified focus'],
    ['review.css','B7-00B.4A R1.3 — Review readability + checkbox focus'],
    ['success.css','B7-00B.4A R1.3 — Success calmer title + readable details']
  ]){
    if(!read(`src/ui/desktop/styles/${file}`).includes(marker)){
      fail(`R1.3 screen consistency marker missing: ${file}`);
    }
  }

  const custom=read('src/ui/desktop/styles/custom.css');
  includesAll(
    custom,
    [
      '.desktop-custom-select{\n    -webkit-appearance:none;',
      '.desktop-custom-input-wrap:focus-within',
      'font-size:var(--dw-type-control-size);'
    ],
    'R1.3 Custom control parity'
  );

  const detail=read('src/ui/desktop/styles/detail.css');
  includesAll(
    detail,
    [
      '.desktop-detail-quantity label:focus-within',
      '.desktop-detail-quantity input:focus-visible',
      'outline:0!important;'
    ],
    'R1.3 PDP quantity focus'
  );
}catch(error){
  fail(`R1.3 Foundation Consistency validation failed: ${error.message}`);
}

try{
  const home=read('src/ui/desktop/styles/home.css');
  const runtime=read('src/ui/desktop/home/runtime-desktop-home.js');
  const site=JSON.parse(read('data/site-content.json'));

  includesAll(
    home,
    [
      'B7-00B.4B R1 — Home Editorial Composition',
      'B7-00B.4B R2 — Home Art Direction Realignment',
      'B7-00B.4B R3 — Home Editorial Structure Realignment',
      'B7-00B.4B R4 — Home Art Direction Distinction + Editorial Recomposition',
      'B7-00B.4B R4.1.1 — accepted visual runtime alignment',
      'B7-00B.4B R4.2 — Hero Graffiti Rebalance + Current Picks Height Recomposition',
      'B7-00B.4B R4.2.4 — Canonical Craft Container + Directional Typography System',
      'B7-00B.4B R4.2.5 — Home Editorial Grid Unification + Typography Rail + Hero Asset Cleanup',
      'B7-00B.4B R4.2.6 — Hero Dual Asset Renewal + Collections Left-Line Recomposition',
      '.desktop-home-hero--cover{',
      '.desktop-home-collections::before{',
      '.desktop-home-story + .desktop-home-section',
      '--dw-home-serif:',
      '--dw-home-accent:',
      '.desktop-home-hero::before',
      '.desktop-collection-card:nth-child(4)',
      '.desktop-product-card:nth-child(4)',
      '.desktop-wholesale-layout{',
      '.desktop-wholesale-media{',
      '.desktop-home-cta__inner'
    ],
    'B7-00B.4B Home editorial composition'
  );

  includesAll(
    runtime,
    [
      "const VERSION='B7-00B.4B-R4.2.6';",
      'desktop-home-editorial-wide',
      'desktop-home-collections__typography-rail',
      'desktop-home-collections__annotation-index',
      'desktop-home-craft',
      'desktop-container',
      'desktop-home-hero--cover',
      'function storyHtml(view)',
      '${collectionsHtml(view)}',
      '${storyHtml(view)}',
      'desktop-wholesale-media',
      'view.wholesale.image',
      'desktop-wholesale-index'
    ],
    'B7-00B.4B Home runtime successor'
  );

  for(const [lang,title] of [
    ['en','Candles, carved by hand.'],
    ['zh','把蜡烛，做成一件作品。'],
    ['ko','손으로 조각한 하나의 작품.']
  ]){
    if(site.languages?.[lang]?.hero?.title!==title){
      fail(`4B Home public copy regression: ${lang}.hero.title`);
    }
  }

  for(const lang of ['en','zh','ko']){
    if(site.languages?.[lang]?.story?.title!=='meet DREAMLAND'){
      fail(`4B R4.1 Brand Story copy regression: ${lang}.story.title`);
    }
  }
}catch(error){
  fail(`B7-00B.4B Home Editorial Composition validation failed: ${error.message}`);
}

try{
  const pkg=JSON.parse(read('package.json'));

  if(
    pkg?.scripts?.['desktop:visual-foundation']!==
    'node scripts/validate-b7-desktop-visual-foundation.mjs'
  ){
    fail('package.json is missing desktop:visual-foundation.');
  }

  const validate=String(pkg?.scripts?.validate||'');

  if(!validate.includes(
    'npm run desktop:home-assets && npm run desktop:visual-foundation && npm run desktop:inquiry-closure'
  )){
    fail('Desktop Visual Foundation gate must run after Home Assets and before Inquiry Closure.');
  }

  if(!validate.endsWith('npm run desktop:catalog')){
    fail('desktop:catalog must remain the final Desktop aggregate gate.');
  }
}catch(error){
  fail(`Package Foundation validation failed: ${error.message}`);
}

if(errors.length){
  console.error('\nB7-00B.4A Desktop Visual Refresh Foundation validation failed:\n');

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log('B7-00B.4A R1.3 Desktop Visual Refresh Foundation validation: PASS');
console.log('Calmer Page Display / 11px Desktop readability floor / unified Input-Select focus / compound-control ownership / EN-ZH-KO typography / Foundation migration / PWA v99 PASS.');

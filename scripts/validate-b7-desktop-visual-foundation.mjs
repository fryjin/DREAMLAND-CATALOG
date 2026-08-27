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
  const tokensRef='./src/ui/desktop/styles/tokens.css?release=b7-00b4a-r1-v99';
  const primitivesRef='./src/ui/desktop/styles/primitives.css?release=b7-00b4a-r1-v99';
  const shellRef='./src/ui/desktop/styles/shell.css?release=b7-00b4a-r1-v99';

  includesAll(
    index,
    [
      "window.DREAMLAND_RELEASE='b7-00b4a-r1-v99';",
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
      "const CACHE_VERSION = 'dreamland-pwa-v99';",
      "'b7-00b4a-r1-v99'",
      './src/ui/desktop/styles/primitives.css?release=b7-00b4a-r1-v99',
      "'./src/ui/desktop/styles/primitives.css'"
    ],
    'Service Worker Foundation release'
  );

  if(!pwa.includes("'b7-00b4a-r1-v99'")){
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
      'border-top:1px solid var(--dw-color-line);',
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

console.log('B7-00B.4A R1.1 Desktop Visual Refresh Foundation validation: PASS');
console.log('Warm Editorial tokens / language-aware typography / bottom progress rules / Foundation migration / public EN-ZH-KO copy / Desktop ownership / PWA v99 PASS.');

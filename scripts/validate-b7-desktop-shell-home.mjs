#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function exists(relative){
  return fs.existsSync(
    path.join(ROOT,relative)
  );
}

function read(relative){
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function readJson(relative){
  return JSON.parse(
    read(relative)
  );
}

function includesAll(
  source,
  markers,
  label
){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(
        `${label} is missing: ${marker}`
      );
    }
  }
}

/*
 * Gate 1 — The old Desktop Foundation prototype is retired.
 */
for(const relative of [
  'desktop-foundation.css',
  'desktop-foundation.js',
  'scripts/validate-b7-desktop-foundation.mjs'
]){
  if(exists(relative)){
    fail(
      `Retired Desktop Foundation prototype file still exists: ${relative}`
    );
  }
}

try{
  const index=
    read('index.html');

  for(const marker of [
    './desktop-foundation.css',
    './desktop-foundation.js',
    'id="desktopHeader"',
    'DreamlandDesktopFoundation'
  ]){
    if(index.includes(marker)){
      fail(
        `index.html still contains retired Desktop Foundation marker: ${marker}`
      );
    }
  }

  includesAll(
    index,
    [
      '<div id="desktopExperience" class="desktop-experience" aria-hidden="true"></div>',
      '<main class="phone" id="app">',
      './src/ui/desktop/styles/tokens.css',
      './src/ui/desktop/styles/shell.css',
      './src/ui/desktop/styles/home.css',
      './src/ui/desktop/shell/runtime-desktop-shell.js',
      './src/ui/desktop/home/runtime-desktop-home.js',
      './src/ui/desktop/runtime-desktop-experience.js',
      'const desktopExperience=window.DreamlandDesktopExperience;',
      'let siteContent={};',
      "fetch('./data/site-content.json',{cache:'no-cache'})",
      'inquiryCount:\n      ()=>inquiryFeature\n        .items()\n        .length',
      'desktopExperience.syncScreen(',
      'desktopExperience.refresh();',
      'desktopExperience.syncInquiry();'
    ],
    'index.html formal Desktop integration'
  );

  if(
    index.indexOf(
      'id="desktopExperience"'
    )>
    index.indexOf(
      '<main class="phone" id="app">'
    )
  ){
    fail(
      'Desktop Experience root must be a sibling before the Mobile app root.'
    );
  }

  includesAll(
    index,
    [
      '.phone{width:min(100vw,390px)',
      '@media (max-width:600px)',
      '<section class="screen active" data-screen="home">',
      '<nav class="bottom-nav" id="bottomNav">'
    ],
    'Mobile baseline preservation'
  );
}catch(error){
  fail(
    `Desktop integration validation failed: ${error.message}`
  );
}

/*
 * Gate 2 — Desktop Presentation must not own a second business state.
 */
try{
  const desktopFiles=[
    'src/ui/desktop/shell/runtime-desktop-shell.js',
    'src/ui/desktop/home/runtime-desktop-home.js',
    'src/ui/desktop/runtime-desktop-experience.js'
  ];

  const forbidden=[
    'DreamlandCatalog',
    'DreamlandDetail',
    'DreamlandInquiry',
    'DreamlandCustom',
    'DreamlandContact',
    'localStorage.setItem',
    'sessionStorage.setItem',
    'productManualV2State'
  ];

  for(const relative of desktopFiles){
    const source=
      read(relative);

    for(const marker of forbidden){
      if(source.includes(marker)){
        fail(
          `${relative} must not own/read business Feature state directly: ${marker}`
        );
      }
    }
  }

  includesAll(
    read(
      'src/ui/desktop/runtime-desktop-experience.js'
    ),
    [
      "const VERSION='B7-00B.1';",
      "const BREAKPOINT='(min-width: 1024px)';",
      'desktopMounted',
      'function syncScreen(',
      'function syncInquiry('
    ],
    'Desktop Experience runtime'
  );
}catch(error){
  fail(
    `Desktop ownership validation failed: ${error.message}`
  );
}

/*
 * Gate 3 — Execute the pure Desktop Home ViewModel.
 */
try{
  delete globalThis.DreamlandDesktopHome;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/ui/desktop/home/runtime-desktop-home.js'
      )
    ).href+
    `?desktop-home-test=${Date.now()}`
  );

  const home=
    globalThis.DreamlandDesktopHome;

  if(
    !home||
    typeof home.buildViewModel!==
      'function'
  ){
    fail(
      'DreamlandDesktopHome.buildViewModel is unavailable.'
    );
  }else{
    const series=[
      'advanced',
      'masterpiece',
      'holiday',
      'classic'
    ];

    const products=
      series.map(
        (seriesId,index)=>({
          id:`P${index+1}`,
          status:'active',
          series:seriesId,
          listSort:100-index,
          name:`Product ${index+1}`,
          cover_image:`./images/products/P${index+1}/cover.webp`,
          angle_image:`./images/products/P${index+1}/angle.webp`,
          detail_image:`./images/products/P${index+1}/detail.webp`
        })
      );

    const model=
      home.buildViewModel({
        content:{
          collections:{
            designSingular:'design',
            designPlural:'designs'
          }
        },
        homeConfig:{
          collectionOrder:[
            'masterpiece',
            'advanced',
            'holiday',
            'classic'
          ],
          featuredSeriesOrder:[
            'advanced',
            'masterpiece',
            'holiday',
            'classic'
          ]
        },
        products,
        seriesMeta:{
          advanced:{},
          masterpiece:{},
          holiday:{},
          classic:{}
        },
        seriesLabel:value=>value,
        productName:product=>product.name,
        productCover:product=>product.cover_image,
        productAngle:product=>product.angle_image,
        productDetail:product=>product.detail_image,
        productPrice:()=> 'USD 10.00',
        productMoq:()=>36,
        inquiryCount:1
      });

    if(
      model.collections.length!==4||
      model.collections[0]?.id!==
        'masterpiece'
    ){
      fail(
        'Desktop Home collections do not respect the presentation collection order.'
      );
    }

    if(
      model.featuredProducts.length!==4
    ){
      fail(
        'Desktop Home must produce four featured product cards for the four-series baseline.'
      );
    }

    if(model.inquiryCount!==1){
      fail(
        'Desktop inquiry context must use item count, not purchase quantity.'
      );
    }

    if(
      !model.craft.image||
      !model.custom.image
    ){
      fail(
        'Desktop editorial sections must resolve product-backed imagery.'
      );
    }
  }
}catch(error){
  fail(
    `Desktop Home executable ViewModel regression failed: ${error.message}`
  );
}

/*
 * Gate 4 — Warm Editorial Home content / responsive design contract.
 */
try{
  const content=
    readJson(
      'data/site-content.json'
    );

  if(
    content.schemaVersion!==1||
    content.presentation!==
      'desktop-home'
  ){
    fail(
      'site-content.json has an invalid Desktop Home contract.'
    );
  }

  for(const lang of [
    'en',
    'zh',
    'ko'
  ]){
    const localized=
      content.languages?.[lang];

    if(!localized){
      fail(
        `site-content.json is missing ${lang}.`
      );
      continue;
    }

    for(const section of [
      'navigation',
      'hero',
      'collections',
      'featured',
      'craft',
      'custom',
      'wholesale',
      'cta',
      'footer'
    ]){
      if(!localized[section]){
        fail(
          `site-content.json ${lang} is missing ${section}.`
        );
      }
    }

    if(
      !Array.isArray(
        localized.wholesale
          ?.facts
      )||
      localized.wholesale
        .facts.length!==4
    ){
      fail(
        `site-content.json ${lang} must contain four wholesale facts.`
      );
    }
  }

  const tokens=
    read(
      'src/ui/desktop/styles/tokens.css'
    );

  const shell=
    read(
      'src/ui/desktop/styles/shell.css'
    );

  const home=
    read(
      'src/ui/desktop/styles/home.css'
    );

  includesAll(
    tokens,
    [
      '@media (min-width:1024px)',
      '--dw-canvas:#f5f3ef;',
      '--dw-sand:#e9e0d5;',
      '--dw-clay:#bfa38e;',
      '--dw-ink:#171614;',
      '--dw-max:1440px;',
      'body.desktop-experience-ready[data-desktop-screen="home"] > #app'
    ],
    'Desktop tokens'
  );

  includesAll(
    shell,
    [
      '.desktop-site-header',
      '.desktop-site-footer',
      '.desktop-language__menu',
      '.desktop-inquiry-button'
    ],
    'Desktop shell styles'
  );

  includesAll(
    home,
    [
      '.desktop-home-hero',
      'grid-template-columns:7fr 5fr;',
      '.desktop-collection-grid',
      '.desktop-product-grid',
      '.desktop-home-band--sand',
      '.desktop-custom-card',
      '.desktop-custom-media img',
      '.desktop-wholesale-grid',
      '.desktop-home-cta'
    ],
    'Desktop Home styles'
  );

  if(
    read(
      'src/ui/desktop/home/runtime-desktop-home.js'
    ).includes(
      'desktop-custom-media desktop-editorial-media'
    )
  ){
    fail(
      'Custom Home media must not inherit the Craft 12-column grid placement.'
    );
  }
}catch(error){
  fail(
    `Desktop visual/content validation failed: ${error.message}`
  );
}

/*
 * Gate 5 — B7-00A real-device regression remains authoritative.
 */
try{
  const previous=
    read(
      'scripts/validate-b7-real-device-baseline-fix.mjs'
    );

  if(
    previous.includes(
      "\"const CACHE_VERSION = 'dreamland-pwa-v87';\""
    )||
    previous.includes(
      "endsWith(\n        'npm run b7:device-baseline'"
    )
  ){
    fail(
      'B7-00A still owns an exact v87/final validation lock.'
    );
  }

  if(
    !previous.includes(
      'Number(cacheVersion[1])<87'
    )
  ){
    fail(
      'B7-00A must continue requiring PWA v87 or later.'
    );
  }
}catch(error){
  fail(
    `Historical B7 gate validation failed: ${error.message}`
  );
}

/*
 * Gate 6 — Package validation chain and PWA v89.
 */
try{
  const packageJson=
    readJson(
      'package.json'
    );

  if(
    Object.prototype.hasOwnProperty.call(
      packageJson.scripts||{},
      'desktop:foundation'
    )
  ){
    fail(
      'Retired desktop:foundation npm script must be removed.'
    );
  }

  if(
    packageJson.scripts
      ?.['desktop:home']!==
      'node scripts/validate-b7-desktop-shell-home.mjs'
  ){
    fail(
      'package.json is missing desktop:home.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  if(
    validate.includes(
      'npm run desktop:foundation'
    )
  ){
    fail(
      'npm run validate still calls the retired Desktop Foundation gate.'
    );
  }

  if(
    !validate.includes(
      'npm run b7:device-baseline'
    )||
    !validate.trim()
      .endsWith(
        'npm run desktop:home'
      )
  ){
    fail(
      'npm run validate must keep B7 device baseline and finish with desktop:home.'
    );
  }

  const sw=
    read('sw.js');

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v89';"
    )
  ){
    fail(
      'Formal Desktop Shell + Home requires dreamland-pwa-v89.'
    );
  }

  for(const retired of [
    './desktop-foundation.css',
    './desktop-foundation.js'
  ]){
    if(sw.includes(retired)){
      fail(
        `sw.js still caches retired prototype asset: ${retired}`
      );
    }
  }

  const appShellStart=
    sw.indexOf(
      'const APP_SHELL = ['
    );

  const appShellEnd=
    sw.indexOf(
      '];',
      appShellStart
    );

  if(
    appShellStart<0||
    appShellEnd<=appShellStart
  ){
    fail(
      'sw.js APP_SHELL could not be isolated.'
    );
  }else{
    const shellBlock=
      sw.slice(
        appShellStart,
        appShellEnd+2
      );

    for(const entry of [
      './data/site-content.json',
      './src/ui/desktop/styles/tokens.css',
      './src/ui/desktop/styles/shell.css',
      './src/ui/desktop/styles/home.css',
      './src/ui/desktop/shell/runtime-desktop-shell.js',
      './src/ui/desktop/home/runtime-desktop-home.js',
      './src/ui/desktop/runtime-desktop-experience.js'
    ]){
      const count=
        shellBlock.split(
          `'${entry}'`
        ).length-1;

      if(count!==1){
        fail(
          `APP_SHELL must include ${entry} exactly once; found ${count}.`
        );
      }
    }
  }
}catch(error){
  fail(
    `Desktop release-gate validation failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nB7-00B.1 Desktop Shell + Home validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'B7-00B.1 Desktop Shell + Home validation: PASS'
);

console.log(
  'Prototype retired / separate Desktop Presentation / Editorial Home / item-count Inquiry / zh-en-ko / PWA v89 PASS.'
);

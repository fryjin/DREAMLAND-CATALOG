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

function readJson(relative){
  return JSON.parse(
    read(relative)
  );
}

function includesAll(source,markers,label){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(
        `${label} is missing: ${marker}`
      );
    }
  }
}

try{
  const index=
    read('index.html');

  includesAll(
    index,
    [
      '<link rel="stylesheet" href="./desktop-foundation.css"/>',
      '<header class="desktop-header" id="desktopHeader"',
      'data-desktop-nav="home"',
      'data-desktop-nav="catalog"',
      'data-desktop-nav="custom"',
      'data-desktop-nav="inquiry"',
      'data-desktop-lang="zh"',
      'data-desktop-lang="en"',
      'data-desktop-lang="ko"',
      '<script src="./desktop-foundation.js"></script>'
    ],
    'index.html desktop shell'
  );

  includesAll(
    index,
    [
      '.phone{width:min(100vw,390px)',
      '@media (max-width:600px)',
      '<nav class="bottom-nav" id="bottomNav">'
    ],
    'index.html mobile baseline'
  );

  includesAll(
    index,
    [
      "window.DreamlandDesktopFoundation\n    ?.syncNavigation?.(\n      n\n    );",
      "window.DreamlandDesktopFoundation\n    ?.syncInquiry?.(\n      count\n    );",
      "window.DreamlandDesktopFoundation\n    ?.syncI18n?.();"
    ],
    'index.html desktop bridge'
  );
}catch(error){
  fail(
    `Desktop shell validation failed: ${error.message}`
  );
}

try{
  const css=
    read('desktop-foundation.css');

  includesAll(
    css,
    [
      '@media (min-width:1024px)',
      '--desktop-bg:#f5f3ef;',
      '--desktop-surface:#faf8f4;',
      '--desktop-sand:#e9e0d5;',
      '--desktop-ink:#171614;',
      '--desktop-header-height:76px;',
      '--desktop-content-max:1440px;',
      'grid-template-columns:auto minmax(0,1fr) auto;',
      '.bottom-nav{',
      'display:none!important;',
      'height:calc(100dvh - var(--desktop-header-height));',
      '.preview-layer.scent-mode{',
      'outline:2px solid #8f765f;'
    ],
    'desktop-foundation.css'
  );

  if(
    css.includes(
      '@media (max-width:1023px)'
    )
  ){
    fail(
      'Desktop Foundation must not add mobile/tablet override rules.'
    );
  }
}catch(error){
  fail(
    `Desktop CSS validation failed: ${error.message}`
  );
}

try{
  const runtime=
    read('desktop-foundation.js');

  includesAll(
    runtime,
    [
      "const VERSION='B7-00B.1';",
      "const BREAKPOINT='(min-width: 1024px)';",
      'function syncNavigation(',
      'function syncInquiry(',
      'function syncI18n(){',
      'window.go?.(screen);',
      'window.chooseLang?.(lang);',
      'window.DreamlandDesktopFoundation='
    ],
    'desktop-foundation.js'
  );

  for(const forbidden of [
    'DreamlandCatalog',
    'DreamlandDetail',
    'DreamlandInquiry',
    'DreamlandCustom',
    'DreamlandContact',
    'localStorage.setItem',
    'sessionStorage.setItem'
  ]){
    if(runtime.includes(forbidden)){
      fail(
        `Desktop adapter must not own business state: ${forbidden}`
      );
    }
  }
}catch(error){
  fail(
    `Desktop adapter validation failed: ${error.message}`
  );
}

try{
  const previous=
    read(
      'scripts/validate-b7-real-device-baseline-fix.mjs'
    );

  if(
    previous.includes(
      "endsWith(\n        'npm run b7:device-baseline'"
    )||
    previous.includes(
      "\"const CACHE_VERSION = 'dreamland-pwa-v87';\""
    )
  ){
    fail(
      'B7-00A validator still owns an exact final-gate/cache-version lock.'
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

try{
  const packageJson=
    readJson('package.json');

  if(
    packageJson.scripts
      ?.['desktop:foundation']!==
      'node scripts/validate-b7-desktop-foundation.mjs'
  ){
    fail(
      'package.json is missing desktop:foundation.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run b7:device-baseline'
    )||
    !validate.trim()
      .endsWith(
        'npm run desktop:foundation'
      )
  ){
    fail(
      'npm run validate must preserve B7 device baseline and finish with desktop:foundation.'
    );
  }

  const sw=
    read('sw.js');

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v88';"
    )
  ){
    fail(
      'Desktop Foundation requires dreamland-pwa-v88.'
    );
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
    const shell=
      sw.slice(
        appShellStart,
        appShellEnd+2
      );

    for(const entry of [
      './desktop-foundation.css',
      './desktop-foundation.js'
    ]){
      const count=
        shell.split(
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
    '\nB7-00B.1 Desktop Foundation validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'B7-00B.1 Desktop Foundation validation: PASS'
);

console.log(
  '1024px+ desktop shell / warm editorial tokens / top navigation / responsive overlay policy / PWA v88 PASS.'
);

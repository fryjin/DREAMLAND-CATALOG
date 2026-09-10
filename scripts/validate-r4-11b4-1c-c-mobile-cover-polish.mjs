#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];
const fail=message=>errors.push(message);

function read(relative){
  const file=path.join(ROOT,relative);

  if(!fs.existsSync(file)){
    fail('Missing required file: '+relative);
    return '';
  }

  return fs.readFileSync(file,'utf8');
}

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const header=read(
  'src/astro/components/site/SiteHeader.astro'
);
const index=read(
  'src/astro/pages/index.astro'
);
const page=read(
  'src/astro/components/home/HomePage.astro'
);
const css=read(
  'src/astro/styles/mobile-home.css'
);
const runtime=read(
  'src/astro/runtime/home-runtime.js'
);
const pkg=read('package.json');

for(const marker of [
  'coverLanguageMenu?:boolean;',
  'coverLanguageMenu=false',
  'home-cover-language',
  'home-cover-language__current',
  'home-cover-language__menu',
  'data-home-language-option={option.value}',
  'data-home-language-select'
]){
  expect(
    header,
    marker,
    'C-C Cover-native language control changed.'
  );
}

expect(
  index,
  'coverLanguageMenu={true}',
  'Home route must opt into the Cover-native language control.'
);

const cStart=
  css.indexOf(
    '/* R4.11B4.1C-C — Mobile Cover Visual / Motion Polish */'
  );

if(cStart<0){
  fail(
    'C-C polish CSS marker is missing.'
  );
}

const firstMobileMedia=
  css.indexOf(
    '@media (max-width:720px)'
  );

const baseCss=
  firstMobileMedia>=0
    ? css.slice(0,firstMobileMedia)
    : css;

if(
  !/\.home-mobile-cover\s*\{[^}]*display\s*:\s*none/s
    .test(baseCss)
){
  fail(
    'C-C must preserve default Desktop isolation for Mobile Cover.'
  );
}

const cCss=
  cStart>=0
    ? css.slice(cStart)
    : '';

for(const marker of [
  '.home-cover-language {',
  '.home-cover-language__menu',
  'body[data-home-language="zh"]',
  'body[data-home-language="ko"]',
  '.home-mobile-cover__copy p',
  'object-position:46% center;',
  'rgba(8,6,5,.78) 100%',
  '.home-mobile-gate__track',
  '.home-mobile-gate__thumb',
  '@media (max-width:374px)',
  '@media (min-width:421px) and (max-width:720px)',
  '@media (max-width:720px) and (max-height:740px)'
]){
  expect(
    cCss,
    marker,
    'C-C Mobile Cover visual contract changed.'
  );
}

for(const forbidden of [
  '!important',
  'writing-mode:',
  'position:sticky',
  'display:none'
]){
  if(
    forbidden==='display:none'
  ){
    continue;
  }

  if(cCss.includes(forbidden)){
    fail(
      'C-C polish contains forbidden visual behavior: '+
      forbidden
    );
  }
}

if(
  !/body\[data-dreamland-page="home"\][\s\S]*\.home-language-control\s*\{[\s\S]*display\s*:\s*none\s*;/
    .test(cCss)
){
  fail(
    'C-C must hide the native language select only inside Mobile Home Cover mode.'
  );
}

if(
  !/body\[data-dreamland-page="home"\][\s\S]*\.home-cover-language\s*\{[\s\S]*display\s*:\s*block\s*;/
    .test(cCss)
){
  fail(
    'C-C Cover-native language menu must display in Mobile Home Cover mode.'
  );
}

for(const marker of [
  "document.addEventListener('click',e=>{let b=e.target.closest?.('[data-home-language-option]');",
  'applyLanguage(b.dataset.homeLanguageOption);',
  "b.closest('details').open=false;",
  "const MOBILE_STARTUP_VERSION='R4.11B4.1C-A';",
  'target:24',
  'minimum:preferFull?24:16',
  'progress>=.72',
  "root.location.assign(gate.href)"
]){
  expect(
    runtime,
    marker,
    'C-C must preserve language binding, preload and Touch Handoff contracts.'
  );
}

if(
  Buffer.byteLength(
    runtime,
    'utf8'
  )>
  20*1024
){
  fail(
    'C-C Home runtime exceeds the frozen 20 KiB budget.'
  );
}

for(const forbidden of [
  'startup-loader.js',
  'DreamlandStartupLoader',
  "go('catalog')",
  'screen[data-screen',
  'window.fetch =',
  'root.fetch ='
]){
  if(runtime.includes(forbidden)){
    fail(
      'C-C reintroduced Legacy Mobile architecture: '+
      forbidden
    );
  }
}

const eagerCount=
  (
    page.match(
      /<img\b[^>]*\bloading="eager"[^>]*>/gi
    )||[]
  ).length;

if(eagerCount!==1){
  fail(
    'C-C must preserve exactly one eager Home image; found '+
    eagerCount+'.'
  );
}

expect(
  pkg,
  '"r4:visual:mobile-cover-polish": "node scripts/validate-r4-11b4-1c-c-mobile-cover-polish.mjs"',
  'package.json must expose the C-C validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-cover-recovery && npm run r4:visual:mobile-cover-polish',
  'Main validation chain must run C-C after FIX1.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1C-C MOBILE COVER VISUAL / MOTION POLISH: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1C-C MOBILE COVER VISUAL / MOTION POLISH: PASS'
);

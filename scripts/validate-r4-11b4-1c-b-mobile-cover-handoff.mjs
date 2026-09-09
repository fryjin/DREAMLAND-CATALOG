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
  'const hero=content.hero||{};',
  'class="home-mobile-cover"',
  'data-mobile-cover',
  'home-mobile-cover__edition',
  'home-mobile-cover__display',
  'data-home-bind="hero.kicker"',
  'data-home-bind="hero.title"',
  'data-home-bind="hero.body"',
  'href="/products/"',
  'data-mobile-cover-gate',
  'data-mobile-cover-track',
  'data-mobile-cover-thumb',
  'data-home-bind="hero.primary"'
]){
  expect(
    page,
    marker,
    'B4.1C-B Mobile Cover markup changed.'
  );
}

const heroCount=
  (
    page.match(
      /data-home-section="hero"/g
    )||[]
  ).length;

if(heroCount!==1){
  fail(
    'B4.1C-B must keep one canonical Home Hero DOM; found '+
    heroCount+'.'
  );
}

const eagerCount=
  (
    page.match(
      /<img\b[^>]*\bloading="eager"[^>]*>/gi
    )||[]
  ).length;

if(eagerCount!==1){
  fail(
    'B4.1C-B must preserve exactly one eager Home image; found '+
    eagerCount+'.'
  );
}

for(const marker of [
  '/* R4.11B4.1C-B — Digital Catalog Cover */',
  'body[data-dreamland-page="home"]',
  '.home-footer',
  '.home-header',
  '.home-nav',
  '.home-nav__inquiry',
  '.home-hero {',
  'height:100svh;',
  '.home-mobile-cover {',
  '.home-mobile-cover__display',
  '.home-mobile-cover__copy',
  '.home-mobile-gate',
  '--dl-cover-progress',
  '--dl-cover-shift',
  'body[data-mobile-cover-leaving="true"]',
  '@media (prefers-reduced-motion:reduce)'
]){
  expect(
    css,
    marker,
    'B4.1C-B Mobile Cover CSS changed.'
  );
}


const compactCss=
  css.replace(/\s+/g,' ');

if(
  !/\.home-main\s*>\s*\[data-home-section\]:not\(\s*\[data-home-section="hero"\]\s*\)/
    .test(compactCss)
){
  fail(
    'B4.1C-B Mobile Cover must hide every non-Hero Home section on Mobile.'
  );
}

for(const forbidden of [
  'writing-mode:',
  ':nth-child',
  'position:sticky'
]){
  const mobileStart=
    css.indexOf(
      '/* R4.11B4.1C-B — Digital Catalog Cover */'
    );

  const slice=
    mobileStart>=0
      ? css.slice(mobileStart)
      : css;

  if(slice.includes(forbidden)){
    fail(
      'B4.1C-B Mobile Cover reintroduced a forbidden responsive-PC pattern: '+
      forbidden
    );
  }
}

for(const marker of [
  'let mobileCatalogWarmup=null;',
  'awaitMobileCatalogReady',
  'mountMobileCoverGate',
  "querySelector('[data-mobile-cover-gate]')",
  "addEventListener('pointerdown'",
  "addEventListener('pointermove'",
  "addEventListener('pointerup'",
  "addEventListener('pointercancel'",
  "addEventListener('click'",
  'progress>=.72',
  "root.location.assign(gate.href)",
  "data-mobile-cover-leaving",
  "mountMobileCoverGate();"
]){
  expect(
    runtime,
    marker,
    'B4.1C-B Touch Handoff runtime changed.'
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
      'B4.1C-B reintroduced Legacy Mobile architecture: '+
      forbidden
    );
  }
}

if(
  Buffer.byteLength(
    runtime,
    'utf8'
  )>
  20*1024
){
  fail(
    'B4.1C-B must remain inside the existing controlled 20 KiB Home runtime budget.'
  );
}

for(const marker of [
  "const MOBILE_STARTUP_VERSION='R4.11B4.1C-A';",
  'target:24',
  'minimum:preferFull?24:16',
  'startCatalogWarmup',
  'mobileStartupSnapshot'
]){
  expect(
    runtime,
    marker,
    'B4.1C-B must preserve the CLOSED C-A preload contract.'
  );
}

expect(
  pkg,
  '"r4:visual:mobile-cover": "node scripts/validate-r4-11b4-1c-b-mobile-cover-handoff.mjs"',
  'package.json must expose the B4.1C-B validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-startup && npm run r4:visual:mobile-cover',
  'Main validation chain must run B4.1C-B after C-A.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1C-B MOBILE COVER + TOUCH HANDOFF: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1C-B MOBILE COVER + TOUCH HANDOFF: PASS'
);

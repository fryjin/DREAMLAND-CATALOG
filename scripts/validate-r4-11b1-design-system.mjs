#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  const file=path.join(ROOT,relative);

  if(!fs.existsSync(file)){
    fail('Missing required file: '+relative);
    return '';
  }

  return fs.readFileSync(file,'utf8');
}

function expectIncludes(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const tokens=read('src/astro/styles/system/tokens.css');
const base=read('src/astro/styles/system/base.css');
const layout=read('src/astro/styles/system/layout.css');
const siteLayout=read('src/astro/layouts/SiteLayout.astro');
const packageJsonText=read('package.json');

for(const marker of [
  '--dl-color-canvas:#f8f5ef;',
  '--dl-color-surface:#fffdf9;',
  '--dl-color-surface-soft:#ede4d8;',
  '--dl-color-ink:#181512;',
  '--dl-color-ink-muted:#6e665f;',
  '--dl-color-ink-soft:#928981;',
  '--dl-color-border:rgba(24,21,18,.13);',
  '--dl-color-action:var(--dl-color-ink);',
  '--dl-font-serif:Georgia,"Times New Roman",serif;',
  '--dl-font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
  '--dl-container-max:1440px;',
  '--dl-page-gutter:clamp(20px,4vw,64px);',
  '--dl-section-space:clamp(88px,10vw,156px);',
  '--dl-radius-surface:24px;',
  '--dl-radius-pill:999px;'
]){
  expectIncludes(
    tokens,
    marker,
    'Canonical R4.11B1 token contract changed.'
  );
}

const routeStyles=[
  'src/astro/styles/home.css',
  'src/astro/styles/catalog.css',
  'src/astro/styles/pdp.css',
  'src/astro/styles/custom.css',
  'src/astro/styles/inquiry.css',
  'src/astro/styles/contact.css',
  'src/astro/styles/review.css',
  'src/astro/styles/success.css'
];

const routeUsesLegacyTokens=
  routeStyles.some(relative=>
    read(relative).includes('var(--home-')
  );

if(routeUsesLegacyTokens){
  for(const marker of [
    '--home-canvas:var(--dl-color-canvas);',
    '--home-surface:var(--dl-color-surface);',
    '--home-sand:var(--dl-color-surface-soft);',
    '--home-ink:var(--dl-color-ink);',
    '--home-muted:var(--dl-color-ink-muted);',
    '--home-soft:var(--dl-color-ink-soft);',
    '--home-line:var(--dl-color-border);',
    '--home-radius:var(--dl-radius-surface);',
    '--home-max:var(--dl-container-max);',
    '--home-gutter:var(--dl-page-gutter);',
    '--home-section:var(--dl-section-space);',
    '--home-serif:var(--dl-font-serif);',
    '--home-sans:var(--dl-font-sans);'
  ]){
    expectIncludes(
      tokens,
      marker,
      'Legacy route compatibility bridge is incomplete.'
    );
  }
}

for(const marker of [
  "import '../styles/system/tokens.css';",
  "import '../styles/system/base.css';",
  "import '../styles/system/layout.css';"
]){
  expectIncludes(
    siteLayout,
    marker,
    'SiteLayout must own the shared R4.11B1 design-system imports.'
  );
}

if(siteLayout.includes('<style is:global>')){
  fail(
    'SiteLayout must no longer keep the extracted global foundation in an inline <style is:global> block.'
  );
}

if(siteLayout.includes('--home-canvas:')){
  fail(
    'SiteLayout still owns legacy token declarations; canonical tokens must live in system/tokens.css.'
  );
}

for(const marker of [
  'box-sizing:border-box;',
  'background:var(--dl-color-canvas);',
  'font-family:var(--dl-font-sans);'
]){
  expectIncludes(
    base,
    marker,
    'Shared base foundation is incomplete.'
  );
}

for(const marker of [
  '.dl-container,',
  '.home-container {',
  'var(--dl-page-gutter)',
  'var(--dl-container-max)',
  '.dl-sr-only,',
  '.home-sr-only {'
]){
  expectIncludes(
    layout,
    marker,
    'Shared layout foundation is incomplete.'
  );
}

for(const relative of [
  'src/astro/styles/system/tokens.css',
  'src/astro/styles/system/base.css',
  'src/astro/styles/system/layout.css'
]){
  const content=read(relative);

  for(const forbidden of [
    '../home.css',
    '../catalog.css',
    '../pdp.css',
    '../custom.css',
    '../inquiry.css',
    '../contact.css',
    '../review.css',
    '../success.css'
  ]){
    if(content.includes(forbidden)){
      fail(
        relative+
        ' must not import route CSS ('+
        forbidden+
        ').'
      );
    }
  }
}

expectIncludes(
  packageJsonText,
  '"r4:visual:foundation": "node scripts/validate-r4-11b1-design-system.mjs"',
  'package.json must expose the R4.11B1 validator.'
);

expectIncludes(
  packageJsonText,
  'npm run r4:production:success:detachment && npm run r4:visual:foundation',
  'Main validation chain must include the R4.11B1 visual foundation gate after architecture detachment gates.'
);

if(errors.length){
  console.error('\nR4.11B1 DESIGN SYSTEM FOUNDATION: FAIL\n');

  for(const error of errors){
    console.error('- '+error);
  }

  process.exit(1);
}

console.log(
  'R4.11B1 DESIGN SYSTEM FOUNDATION: PASS'
);

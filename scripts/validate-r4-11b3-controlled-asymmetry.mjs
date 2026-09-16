#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];

function fail(message){ errors.push(message); }
function read(relative){
  const file=path.join(ROOT,relative);
  if(!fs.existsSync(file)){
    fail('Missing required file: '+relative);
    return '';
  }
  return fs.readFileSync(file,'utf8');
}
function expect(content,marker,message){
  if(!content.includes(marker)) fail(message+' Missing: '+marker);
}

const css=read('src/astro/styles/system/asymmetry.css');
const tokens=read('src/astro/styles/system/tokens.css');
const layout=read('src/astro/layouts/SiteLayout.astro');
const pkg=read('package.json');

for(const marker of [
  '.dl-editorial-grid {',
  '.dl-asym-split {',
  '.dl-asym-split--media-heavy',
  '.dl-asym-split--copy-heavy',
  '.dl-edge-caption',
  '.dl-visual-anchor',
  '.dl-stagger-grid {',
  '.dl-weighted-row {',
  '.dl-offset-surface {',
  '@media (max-width:900px)',
  '@media (max-width:560px)'
]){
  expect(css,marker,'Controlled asymmetry primitive contract changed.');
}

for(const marker of [
  '--dl-asym-gap-sm:',
  '--dl-asym-gap-md:',
  '--dl-asym-gap-lg:',
  '--dl-asym-offset-sm:',
  '--dl-asym-offset-md:',
  '--dl-asym-mobile-gap:',
  '--dl-asym-stagger-offset:',
  '--dl-asym-mobile-inset:'
]){
  expect(tokens,marker,'Controlled asymmetry token is missing.');
}

expect(
  layout,
  "import '../styles/system/asymmetry.css';",
  'SiteLayout must import the B3 primitive layer.'
);

expect(
  pkg,
  '"r4:visual:asymmetry": "node scripts/validate-r4-11b3-controlled-asymmetry.mjs"',
  'package.json must expose the B3 validator.'
);

expect(
  pkg,
  'npm run r4:visual:foundation && npm run r4:visual:components && npm run r4:visual:asymmetry',
  'Main validation chain must run B3 after B2.'
);

/*
 * B3 primitives must remain opt-in.
 * They must not attach themselves to route-era selectors yet.
 */
for(const forbidden of [
  '.home-',
  '.catalog-',
  '.pdp-',
  '.custom-',
  '.inquiry-',
  '.contact-',
  '.review-',
  '.success-',
  '[data-r4-astro-'
]){
  if(css.includes(forbidden)){
    fail('B3 primitive layer must stay route-agnostic; found '+forbidden);
  }
}

for(const forbidden of [
  'position:fixed',
  'position:sticky',
  'overflow:hidden',
  '!important'
]){
  if(css.includes(forbidden)){
    fail('B3 primitive layer contains an unsafe global layout behavior: '+forbidden);
  }
}

if(errors.length){
  console.error('\nR4.11B3 CONTROLLED ASYMMETRY: FAIL\n');
  for(const error of errors) console.error('- '+error);
  process.exit(1);
}

console.log('R4.11B3 CONTROLLED ASYMMETRY: PASS');

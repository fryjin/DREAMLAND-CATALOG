#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {logicalTextBytes} from './lib/r4-validation-io.mjs';

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

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const css=read('src/astro/styles/home.css');
const runtime=read('src/astro/runtime/home-runtime.js');
const composition=read('scripts/validate-r4-11b4-1b-desktop-home-composition.mjs');
const pkg=read('package.json');

const desktopStart=css.indexOf('@media (min-width:901px)');
const mobileStart=css.indexOf('@media (max-width:900px)');

if(desktopStart<0||mobileStart<0||mobileStart<=desktopStart){
  fail('Home responsive CSS boundaries are missing or reordered.');
}

const desktop=
  desktopStart>=0&&mobileStart>desktopStart
    ? css.slice(desktopStart,mobileStart)
    : css;

for(const marker of [
  'F4-POLISH-1 — Persistent Home Navigation',
  '.home-header {',
  'position:fixed;',
  'background:transparent;',
  'backdrop-filter:none;',
  '.home-header.is-scrolled {',
  'border-bottom:1px solid rgba(24,21,18,.08);',
  'background:color-mix(in srgb,var(--home-canvas) 94%,transparent);',
  'backdrop-filter:blur(18px);'
]){
  expect(
    desktop,
    marker,
    'F4-POLISH-1 Desktop persistent navigation contract changed.'
  );
}

for(const marker of [
  'function syncHeader()',
  "'[data-home-header]'",
  "'is-scrolled'",
  'root.scrollY>24',
  "root.addEventListener('scroll',syncHeader,{passive:true});",
  'syncHeader();'
]){
  expect(
    runtime,
    marker,
    'F4-POLISH-1 Home runtime header state contract changed.'
  );
}

if(logicalTextBytes(runtime)>20*1024){
  fail(
    'F4-POLISH-1 must preserve the controlled 20 KiB Home runtime budget.'
  );
}

expect(
  composition,
  "'position:fixed;'",
  'B4.1B Desktop Home composition gate must recognize the persistent header.'
);

if(
  composition.includes(
    "'position:absolute;'"
  )
){
  fail(
    'B4.1B Desktop Home composition gate still requires the retired absolute Home header.'
  );
}

expect(
  pkg,
  '"f4:polish:home-navigation": "node scripts/validate-f4-polish-1-persistent-home-navigation.mjs"',
  'package.json must expose the F4-POLISH-1 gate.'
);

expect(
  pkg,
  'npm run r4:visual:home-composition && npm run f4:polish:home-navigation && npm run r4:visual:home-narrative',
  'Main validation chain must run F4-POLISH-1 after Desktop Home composition.'
);

if(errors.length){
  console.error('');
  console.error('F4-POLISH-1 PERSISTENT HOME NAVIGATION: FAIL');

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log('F4-POLISH-1 PERSISTENT HOME NAVIGATION: PASS');
console.log('PC Hero overlay is transparent only at the page top; after the first 24px of scroll the fixed navigation uses a restrained translucent surface through the rest of Hero and the page; Mobile sticky behavior remains outside this Desktop override.');
console.log('');

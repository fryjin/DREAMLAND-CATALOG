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

function json(relative){
  try{
    return JSON.parse(read(relative));
  }catch(error){
    fail('Invalid JSON: '+relative+' — '+error.message);
    return {};
  }
}

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const loader=read(
  'src/astro/components/home/MobileStartupLoader.astro'
);
const runtime=read(
  'src/astro/runtime/home-runtime.js'
);
const index=read(
  'src/astro/pages/index.astro'
);
const page=read(
  'src/astro/components/home/HomePage.astro'
);
const desktopAssets=json(
  'data/desktop-home-assets.json'
);
const pkg=read('package.json');

for(const marker of [
  'aria-label="Entering DREAMLAND"',
  'A dream is taking shape.',
  'Opening the first page'
]){
  expect(
    loader,
    marker,
    'FIX2 branded Startup Loader copy changed.'
  );
}

for(const marker of [
  "'Opening the first page'",
  "'The collection is coming into view'",
  "'Almost there'",
  "'Welcome to DREAMLAND'"
]){
  expect(
    runtime,
    marker,
    'FIX2 branded Startup runtime copy changed.'
  );
}

for(const forbidden of [
  'Preparing the collection',
  'Preparing collection ',
  'Loading cover',
  'Collection ready'
]){
  if(
    loader.includes(forbidden)||
    runtime.includes(forbidden)
  ){
    fail(
      'FIX2 must not expose engineering-oriented Startup copy: '+
      forbidden
    );
  }
}

if(
  /(?:Preparing|Loading)[^\n'"]*\d+\s*\/\s*\d+/i
    .test(loader)||
  /(?:Preparing|Loading)[^\n'"]*\d+\s*\/\s*\d+/i
    .test(runtime)
){
  fail(
    'FIX2 Startup UI must not expose resource counters such as 5 / 24.'
  );
}

for(const marker of [
  "const MOBILE_STARTUP_VERSION='R4.11B4.1C-A';",
  'target:24',
  'minimum:preferFull?24:16',
  'mobileStartupSnapshot',
  'startCatalogWarmup',
  'progress>=.72',
  "root.location.assign(gate.href)"
]){
  expect(
    runtime,
    marker,
    'FIX2 must preserve preload and Touch Handoff business logic.'
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
    'FIX2 Home runtime exceeds the frozen 20 KiB source budget.'
  );
}

const headStart=index.indexOf('<Fragment slot="head">');
const headEnd=headStart>=0
  ? index.indexOf('</Fragment>',headStart)
  : -1;
const headSlice=
  headStart>=0&&headEnd>headStart
    ? index.slice(headStart,headEnd)
    : '';

for(const marker of [
  'href={view.wholesale.image}',
  'media="(min-width:901px)"',
  'fetchpriority="low"'
]){
  expect(
    headSlice,
    marker,
    'FIX2 Desktop lower-media warmup contract changed.'
  );
}

if(
  !/<link[\s\S]*rel="preload"[\s\S]*as="image"[\s\S]*href=\{view\.wholesale\.image\}[\s\S]*media="\(min-width:901px\)"[\s\S]*fetchpriority="low"[\s\S]*\/>/m
    .test(headSlice)
){
  fail(
    'FIX2 must preload Wholesale media only on Desktop at low priority.'
  );
}

const wholesaleStart=
  page.indexOf(
    'data-home-section="wholesale"'
  );
const wholesaleEnd=
  wholesaleStart>=0
    ? page.indexOf(
        '</section>',
        wholesaleStart
      )
    : -1;
const wholesaleSlice=
  wholesaleStart>=0&&
  wholesaleEnd>wholesaleStart
    ? page.slice(
        wholesaleStart,
        wholesaleEnd
      )
    : '';

for(const marker of [
  'src={view.wholesale.image}',
  'loading="lazy"'
]){
  expect(
    wholesaleSlice,
    marker,
    'FIX2 must preserve the canonical lazy Wholesale image DOM.'
  );
}

if(
  wholesaleSlice.includes(
    'loading="eager"'
  )
){
  fail(
    'FIX2 must not convert the lower Wholesale img itself to eager loading.'
  );
}

const wholesalePath=
  String(
    desktopAssets
      ?.wholesale
      ?.image||
    ''
  )
    .replace(
      /^\.\//,
      ''
    );

if(!wholesalePath){
  fail(
    'FIX2 desktop Home asset contract is missing Wholesale media.'
  );
}else{
  const file=
    path.join(
      ROOT,
      wholesalePath
    );

  if(!fs.existsSync(file)){
    fail(
      'FIX2 Wholesale media file is missing: '+
      wholesalePath
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
    'FIX2 must preserve exactly one eager Home img; found '+
    eagerCount+'.'
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
      'FIX2 reintroduced Legacy Mobile architecture: '+
      forbidden
    );
  }
}

expect(
  pkg,
  '"r4:visual:mobile-cover-fix2": "node scripts/validate-r4-11b4-1c-c-fix2-loader-copy-lower-asset.mjs"',
  'package.json must expose the FIX2 validator.'
);

expect(
  pkg,
  'npm run r4:visual:mobile-cover-image-type && npm run r4:visual:mobile-cover-fix2',
  'Main validation chain must run FIX2 after C-C-FIX1.'
);

if(errors.length){
  console.error(
    '\nR4.11B4.1C-C-FIX2 LOADER COPY + PC LOWER ASSET: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4.1C-C-FIX2 LOADER COPY + PC LOWER ASSET: PASS'
);

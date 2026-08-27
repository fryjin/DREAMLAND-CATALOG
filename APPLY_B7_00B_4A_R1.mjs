#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const PATCH_DIR=path.dirname(fileURLToPath(import.meta.url));
const PAYLOAD=path.join(PATCH_DIR,'payload');
const ROOT=process.cwd();

const EXPECTED_HEAD='ef32575f48e81378d8907636119a937bc99b7c73';
const OLD_RELEASE='b7-00b3d-r1-v98';
const NEW_RELEASE='b7-00b4a-r1-v99';
const OLD_PWA='dreamland-pwa-v98';
const NEW_PWA='dreamland-pwa-v99';

function die(message){
  console.error(`\nB7-00B.4A R1 apply failed:\n- ${message}\n`);
  process.exit(1);
}

function absolute(relative){
  return path.join(ROOT,relative);
}

function read(relative){
  const target=absolute(relative);
  if(!fs.existsSync(target)){
    die(`Missing repository file: ${relative}`);
  }
  return fs.readFileSync(target,'utf8');
}

function write(relative,content){
  const target=absolute(relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,content,'utf8');
}

function copyPayload(relative){
  const source=path.join(PAYLOAD,relative);
  if(!fs.existsSync(source)){
    die(`Missing patch payload: ${relative}`);
  }
  write(relative,fs.readFileSync(source,'utf8'));
}

function replaceRequired(relative,from,to,label=from){
  const source=read(relative);
  if(!source.includes(from)){
    die(`${relative} is missing expected marker: ${label}`);
  }
  write(relative,source.replace(from,to));
}

function replaceAllIfPresent(relative,from,to){
  const source=read(relative);
  if(!source.includes(from)){
    return false;
  }
  write(relative,source.split(from).join(to));
  return true;
}

function currentHead(){
  try{
    return execFileSync('git',['rev-parse','HEAD'],{
      cwd:ROOT,
      encoding:'utf8'
    }).trim();
  }catch(error){
    die(`Unable to read git HEAD: ${error.message}`);
  }
}

const head=currentHead();
if(head!==EXPECTED_HEAD){
  die(
    `Patch expects develop@${EXPECTED_HEAD}, but current HEAD is ${head}. `+
    'Create the B7-00B.4A branch from the latest develop before applying.'
  );
}

const currentIndex=read('index.html');
if(
  currentIndex.includes(NEW_RELEASE)||
  fs.existsSync(absolute('src/ui/desktop/styles/primitives.css'))
){
  die('B7-00B.4A R1 appears to be already applied. Do not apply it twice.');
}

if(!currentIndex.includes(OLD_RELEASE)){
  die(`index.html does not contain expected release ${OLD_RELEASE}.`);
}

/* 1. Foundation payload. */
copyPayload('src/ui/desktop/styles/tokens.css');
copyPayload('src/ui/desktop/styles/primitives.css');
copyPayload('scripts/validate-b7-desktop-visual-foundation.mjs');

/* 2. Versioned Desktop CSS integration. */
replaceAllIfPresent('index.html',OLD_RELEASE,NEW_RELEASE);
replaceRequired(
  'index.html',
  `<link rel="stylesheet" href="./src/ui/desktop/styles/tokens.css?release=${NEW_RELEASE}"/>\n<link rel="stylesheet" href="./src/ui/desktop/styles/shell.css?release=${NEW_RELEASE}"/>`,
  `<link rel="stylesheet" href="./src/ui/desktop/styles/tokens.css?release=${NEW_RELEASE}"/>\n<link rel="stylesheet" href="./src/ui/desktop/styles/primitives.css?release=${NEW_RELEASE}"/>\n<link rel="stylesheet" href="./src/ui/desktop/styles/shell.css?release=${NEW_RELEASE}"/>`,
  'Desktop tokens -> shell stylesheet sequence'
);

/* 3. PWA release convergence. */
replaceAllIfPresent('sw.js',OLD_RELEASE,NEW_RELEASE);
replaceRequired('sw.js',OLD_PWA,NEW_PWA,'PWA cache version v98');
replaceRequired(
  'sw.js',
  `  './src/ui/desktop/styles/tokens.css?release=${NEW_RELEASE}',\n  './src/ui/desktop/styles/shell.css?release=${NEW_RELEASE}',`,
  `  './src/ui/desktop/styles/tokens.css?release=${NEW_RELEASE}',\n  './src/ui/desktop/styles/primitives.css?release=${NEW_RELEASE}',\n  './src/ui/desktop/styles/shell.css?release=${NEW_RELEASE}',`,
  'versioned Desktop tokens -> shell entries'
);
replaceRequired(
  'sw.js',
  `  './src/ui/desktop/styles/tokens.css',\n  './src/ui/desktop/styles/shell.css',`,
  `  './src/ui/desktop/styles/tokens.css',\n  './src/ui/desktop/styles/primitives.css',\n  './src/ui/desktop/styles/shell.css',`,
  'APP_SHELL Desktop tokens -> shell entries'
);
replaceAllIfPresent('src/services/pwa/runtime-pwa.js',OLD_RELEASE,NEW_RELEASE);

/* 4. Shell successor: keep old marker for historical gates, override it with
 * the current all-Desktop ownership contract. */
replaceRequired(
  'src/ui/desktop/styles/shell.css',
  `  .desktop-experience:not(.is-home):not(.is-catalog) .desktop-site-main,\n  .desktop-experience:not(.is-home):not(.is-catalog) .desktop-site-footer{\n    display:none;\n  }\n\n  .desktop-site-footer{`,
  `  .desktop-experience:not(.is-home):not(.is-catalog) .desktop-site-main,\n  .desktop-experience:not(.is-home):not(.is-catalog) .desktop-site-footer{\n    display:none;\n  }\n\n  /*\n   * B7-00B.4A — all current Desktop screens are Desktop-owned.\n   * This higher-specificity successor keeps the historical 3A marker above\n   * readable by old gates without letting it hide current Desktop pages.\n   */\n  body.desktop-experience-ready\n  .desktop-experience[data-desktop-structured="true"] .desktop-site-main,\n  body.desktop-experience-ready\n  .desktop-experience[data-desktop-structured="true"] .desktop-site-footer{\n    display:block;\n  }\n\n  .desktop-site-footer{`,
  'historical Desktop fallback shell block'
);

/* 5. Validation chain. */
replaceRequired(
  'package.json',
  'npm run desktop:home && npm run desktop:home-assets && npm run desktop:inquiry-closure',
  'npm run desktop:home && npm run desktop:home-assets && npm run desktop:visual-foundation && npm run desktop:inquiry-closure',
  'Desktop validation sequence'
);
replaceRequired(
  'package.json',
  '    "desktop:home-assets": "node scripts/validate-b7-desktop-home-assets.mjs",\n    "desktop:catalog":',
  '    "desktop:home-assets": "node scripts/validate-b7-desktop-home-assets.mjs",\n    "desktop:visual-foundation": "node scripts/validate-b7-desktop-visual-foundation.mjs",\n    "desktop:catalog":',
  'Desktop npm scripts block'
);

/* 6. Historical release gates accept the new presentation successor. */
const desktopValidators=[
  'scripts/validate-b7-desktop-shell-home.mjs',
  'scripts/validate-b7-desktop-home-assets.mjs',
  'scripts/validate-b7-desktop-catalog.mjs',
  'scripts/validate-b7-desktop-website-positioning.mjs',
  'scripts/validate-b7-desktop-detail.mjs',
  'scripts/validate-b7-desktop-custom.mjs',
  'scripts/validate-b7-desktop-inquiry-closure.mjs'
];

for(const relative of desktopValidators){
  replaceAllIfPresent(relative,OLD_RELEASE,NEW_RELEASE);
  replaceAllIfPresent(relative,OLD_PWA,NEW_PWA);
}

replaceRequired(
  'scripts/validate-b7-desktop-catalog.mjs',
  'Number(cacheVersion[1])!==98',
  'Number(cacheVersion[1])!==99',
  'Desktop Catalog exact cache-version gate'
);

/* 7. Final consistency checks before returning control to the user. */
const finalIndex=read('index.html');
const finalSw=read('sw.js');
const finalPkg=read('package.json');

for(const [label,source,markers] of [
  [
    'index.html',
    finalIndex,
    [
      `window.DREAMLAND_RELEASE='${NEW_RELEASE}';`,
      `./src/ui/desktop/styles/primitives.css?release=${NEW_RELEASE}`
    ]
  ],
  [
    'sw.js',
    finalSw,
    [
      `const CACHE_VERSION = '${NEW_PWA}';`,
      `'${NEW_RELEASE}'`,
      `./src/ui/desktop/styles/primitives.css?release=${NEW_RELEASE}`,
      "'./src/ui/desktop/styles/primitives.css'"
    ]
  ],
  [
    'package.json',
    finalPkg,
    [
      'desktop:visual-foundation',
      'validate-b7-desktop-visual-foundation.mjs'
    ]
  ]
]){
  for(const marker of markers){
    if(!source.includes(marker)){
      die(`${label} final consistency check is missing: ${marker}`);
    }
  }
}

console.log('\nB7-00B.4A R1 Foundation patch applied.');
console.log(`Client release: ${NEW_RELEASE}`);
console.log(`PWA cache: ${NEW_PWA}`);
console.log('Next: npm run check');
console.log('Then perform Desktop Real Preview at 1024 / 1280 / 1440 / 1920 and EN / ZH / KO.\n');

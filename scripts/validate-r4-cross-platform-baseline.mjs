#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
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

  return fs
    .readFileSync(
      file,
      'utf8'
    )
    .replace(
      /\r\n?/g,
      '\n'
    );
}

function git(args){
  try{
    return execFileSync(
      'git',
      args,
      {
        cwd:ROOT,
        encoding:'utf8',
        stdio:['ignore','pipe','pipe']
      }
    ).trim();
  }catch(error){
    fail(
      'Git command failed: git '+
      args.join(' ')+
      ' — '+
      String(
        error.stderr||
        error.message||
        error
      )
    );
    return '';
  }
}

const attrs=read('.gitattributes');

for(const marker of [
  '* text=auto',
  '*.js      text eol=lf',
  '*.mjs     text eol=lf',
  '*.astro   text eol=lf',
  '*.css     text eol=lf',
  '*.html    text eol=lf',
  '*.json    text eol=lf',
  '*.md      text eol=lf',
  '*.yml     text eol=lf',
  '*.yaml    text eol=lf',
  '*.bat     text eol=crlf',
  '*.cmd     text eol=crlf',
  '*.png     -text',
  '*.jpg     -text',
  '*.webp    -text'
]){
  if(!attrs.includes(marker)){
    fail('.gitattributes is missing baseline rule: '+marker);
  }
}

const representative=[
  'package.json',
  'sw.js',
  'scripts/build-pages.mjs',
  'src/astro/components/product/PdpPage.astro',
  'src/astro/styles/pdp.css'
];

const attrOutput=
  git([
    'check-attr',
    'text',
    'eol',
    '--',
    ...representative
  ]);

for(const relative of representative){
  if(!attrOutput.includes(relative+': text: set')){
    fail('Git text attribute is not explicitly set for: '+relative);
  }

  if(!attrOutput.includes(relative+': eol: lf')){
    fail('Git eol=lf attribute is not active for: '+relative);
  }
}

const indexEol=
  git([
    'ls-files',
    '--eol',
    '--',
    ...representative
  ]);

for(const relative of representative){
  const line=
    indexEol
      .split(/\r?\n/)
      .find(item=>item.includes(relative))||'';

  if(line&&!/\bi\/lf\b/.test(line)){
    fail(
      'Git index must store canonical LF for '+
      relative+
      '; observed: '+
      line
    );
  }
}

const buildPages=read('scripts/build-pages.mjs');

if(
  !/relative\s*===\s*['"]sw\.js['"]/.test(buildPages)||
  !/\.replace\s*\(\s*\/\\r\\n\?\/g\s*,\s*['"]\\n['"]\s*\)/m.test(buildPages)
){
  fail('build-pages.mjs must emit dist/sw.js through LF-normalized UTF-8 text.');
}

for(const relative of [
  'scripts/r4-copy-astro-home-assets.mjs',
  'scripts/r4-copy-astro-catalog-assets.mjs',
  'scripts/r4-copy-astro-pdp-assets.mjs',
  'scripts/r4-copy-astro-custom-assets.mjs',
  'scripts/r4-copy-astro-inquiry-assets.mjs',
  'scripts/r4-copy-astro-contact-assets.mjs',
  'scripts/r4-copy-astro-review-assets.mjs',
  'scripts/r4-copy-astro-success-assets.mjs'
]){
  const source=read(relative);

  if(!/\.replace\s*\(\s*\/\\r\\n\?\/g\s*,\s*['"]\\n['"]\s*\)/m.test(source)){
    fail(
      relative+
      ' must normalize UTF-8 runtime source to LF before artifact emission.'
    );
  }
}

for(const relative of [
  'scripts/validate-r4-production-review-cutover.mjs',
  'scripts/validate-r4-production-review-detachment.mjs',
  'scripts/validate-r4-production-success-cutover.mjs',
  'scripts/validate-r4-production-success-detachment.mjs'
]){
  const source=read(relative);

  const usesSharedLogicalIdentity=
    source.includes(
      "from './lib/r4-validation-io.mjs';"
    )&&
    source.includes(
      'hashLogicalTextFile('
    )&&
    !source.includes(
      'function hashLogicalTextFile(file)'
    );

  if(!usesSharedLogicalIdentity){
    fail(
      relative+
      ' must use the shared logical Service Worker identity contract from scripts/lib/r4-validation-io.mjs.'
    );
  }
}

const autoCrlf=
  git([
    'config',
    '--get',
    'core.autocrlf'
  ]);

if(errors.length){
  console.error('');
  console.error('DREAMLAND R4 CROSS-PLATFORM VALIDATION BASELINE B0: FAIL');

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND R4 CROSS-PLATFORM VALIDATION BASELINE B0: PASS');
console.log(
  'Repository EOL policy / canonical LF index / deterministic runtime + Service Worker artifact emission / shared protected logical SW identity verified.'
);
console.log(
  'Local core.autocrlf: '+
  (autoCrlf||'(unset)')+
  ' — repository attributes remain authoritative.'
);
console.log('');

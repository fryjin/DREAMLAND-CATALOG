#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
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
  const file=
    path.join(
      ROOT,
      relative
    );

  if(!fs.existsSync(file)){
    fail(
      'Missing required file: '+
      relative
    );
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

const workflow=
  read(
    '.github/workflows/cross-platform-determinism.yml'
  );

for(const marker of [
  'name: Cross-platform deterministic build',
  'ubuntu-latest',
  'windows-latest',
  'node-version: 24',
  'run: npm ci',
  'run: npm run check',
  'run: npm run build',
  'write-r4-cross-platform-manifest.mjs',
  'actions/upload-artifact@v4',
  'actions/download-artifact@v4',
  'merge-multiple: true',
  'compare-r4-cross-platform-manifests.mjs'
]){
  if(!workflow.includes(marker)){
    fail(
      'Cross-platform CI workflow is missing: '+
      marker
    );
  }
}

const writer=
  read(
    'scripts/write-r4-cross-platform-manifest.mjs'
  );

for(const marker of [
  'physicalBytes',
  'physicalSha256',
  'logicalBytes',
  'logicalSha256',
  "'index.html'",
  "'sw.js'",
  "'r4-home-runtime.js'",
  "'r4-catalog-runtime.js'",
  "'r4-pdp-runtime.js'"
]){
  if(!writer.includes(marker)){
    fail(
      'Cross-platform manifest writer is missing: '+
      marker
    );
  }
}

const compare=
  read(
    'scripts/compare-r4-cross-platform-manifests.mjs'
  );

for(const marker of [
  'physical artifact drift with identical logical text',
  'artifact content drift',
  'byte-identical Production artifacts'
]){
  if(!compare.includes(marker)){
    fail(
      'Cross-platform manifest comparator is missing: '+
      marker
    );
  }
}

const packageJson=
  JSON.parse(
    read(
      'package.json'
    )
  );

for(const [name,command] of [
  [
    'cross-platform:manifest',
    'node scripts/write-r4-cross-platform-manifest.mjs'
  ],
  [
    'cross-platform:compare',
    'node scripts/compare-r4-cross-platform-manifests.mjs'
  ],
  [
    'cross-platform:ci-contract',
    'node scripts/validate-r4-cross-platform-ci.mjs'
  ]
]){
  if(
    packageJson.scripts?.[name]!==
    command
  ){
    fail(
      'package.json is missing '+name+'.'
    );
  }
}

const validate=
  String(
    packageJson.scripts
      ?.validate||
    ''
  );

const baseline=
  validate.indexOf(
    'npm run cross-platform:baseline'
  );

const contract=
  validate.indexOf(
    'npm run cross-platform:contract'
  );

const ci=
  validate.indexOf(
    'npm run cross-platform:ci-contract'
  );

const project=
  validate.indexOf(
    'node scripts/validate-project.mjs'
  );

if(
  baseline<0||
  contract<=baseline||
  ci<=contract||
  project<=ci
){
  fail(
    'Cross-platform gate order must be B0 baseline → B1 contract → B2 CI contract → project validation.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND R4 CROSS-PLATFORM VALIDATION BASELINE B2: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+
      error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND R4 CROSS-PLATFORM VALIDATION BASELINE B2: PASS'
);
console.log(
  'Windows + Linux CI matrix / complete check+build / Production artifact manifest upload / cross-OS byte-for-byte comparison contract verified.'
);
console.log('');

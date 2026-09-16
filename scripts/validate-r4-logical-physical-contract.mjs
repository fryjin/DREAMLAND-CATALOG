#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  hashLogicalTextFile,
  hashPhysicalFile,
  logicalTextBytes,
  normalizeLogicalText,
  physicalBytes,
  readLogicalText
} from './lib/r4-validation-io.mjs';

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
  const file=path.join(
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

  return readLogicalText(
    file
  );
}

/*
 * Semantic proof:
 * logical source identity is EOL-insensitive,
 * physical artifact identity is byte-sensitive.
 */
const fixtureDir=
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'dreamland-r4-xplat-b1-'
    )
  );

const lfFile=
  path.join(
    fixtureDir,
    'lf.txt'
  );

const crlfFile=
  path.join(
    fixtureDir,
    'crlf.txt'
  );

try{
  const logicalFixture=
    'alpha\nbeta\ngamma\n';

  const crlfFixture=
    logicalFixture.replace(
      /\n/g,
      '\r\n'
    );

  fs.writeFileSync(
    lfFile,
    logicalFixture,
    'utf8'
  );

  fs.writeFileSync(
    crlfFile,
    crlfFixture,
    'utf8'
  );

  if(
    normalizeLogicalText(
      crlfFixture
    )!==logicalFixture
  ){
    fail(
      'normalizeLogicalText() does not canonicalize CRLF to LF.'
    );
  }

  if(
    readLogicalText(lfFile)!==
    readLogicalText(crlfFile)
  ){
    fail(
      'Logical text reads must be identical across LF/CRLF fixtures.'
    );
  }

  if(
    logicalTextBytes(
      fs.readFileSync(
        lfFile,
        'utf8'
      )
    )!==
    logicalTextBytes(
      fs.readFileSync(
        crlfFile,
        'utf8'
      )
    )
  ){
    fail(
      'Logical source byte budgets must be invariant across LF/CRLF.'
    );
  }

  if(
    hashLogicalTextFile(lfFile)!==
    hashLogicalTextFile(crlfFile)
  ){
    fail(
      'Logical source hashes must be invariant across LF/CRLF.'
    );
  }

  if(
    physicalBytes(lfFile)===
    physicalBytes(crlfFile)
  ){
    fail(
      'Physical artifact byte sizes must preserve real EOL byte differences.'
    );
  }

  if(
    hashPhysicalFile(lfFile)===
    hashPhysicalFile(crlfFile)
  ){
    fail(
      'Physical artifact hashes must preserve real EOL byte differences.'
    );
  }
}finally{
  try{
    fs.rmSync(
      fixtureDir,
      {
        recursive:true,
        force:true
      }
    );
  }catch{
    // best effort
  }
}

/*
 * Architecture proof: canonical source-budget and protected SW
 * validators must consume the shared logical-source helper.
 */
const homeRuntime=
  read(
    'scripts/validate-r4-astro-home-runtime.mjs'
  );

for(const marker of [
  "from './lib/r4-validation-io.mjs';",
  'logicalTextBytes(',
  'readLogicalText('
]){
  if(!homeRuntime.includes(marker)){
    fail(
      'Home source-budget validator is not using the shared logical-source contract: '+
      marker
    );
  }
}

if(
  homeRuntime.includes(
    ".replace(/\\r\\n?/g,'\\n')"
  )
){
  fail(
    'Home source-budget validator must not maintain a private EOL normalization implementation.'
  );
}

for(const relative of [
  'scripts/validate-r4-production-review-cutover.mjs',
  'scripts/validate-r4-production-review-detachment.mjs',
  'scripts/validate-r4-production-success-cutover.mjs',
  'scripts/validate-r4-production-success-detachment.mjs'
]){
  const source=read(relative);

  if(
    !source.includes(
      "from './lib/r4-validation-io.mjs';"
    )||
    !source.includes(
      'hashLogicalTextFile('
    )
  ){
    fail(
      relative+
      ' must consume the shared protected logical-text identity helper.'
    );
  }

  if(
    source.includes(
      'function hashLogicalTextFile(file)'
    )
  ){
    fail(
      relative+
      ' must not keep a private hashLogicalTextFile implementation.'
    );
  }
}

/*
 * Physical artifact budgets remain physical.
 * These production detachment validators intentionally use fs.statSync().size
 * against emitted assets. B1 must not normalize those bytes away.
 */
for(const relative of [
  'scripts/validate-r4-production-home-detachment.mjs',
  'scripts/validate-r4-production-catalog-detachment.mjs',
  'scripts/validate-r4-production-pdp-detachment.mjs',
  'scripts/validate-r4-production-review-detachment.mjs',
  'scripts/validate-r4-production-success-detachment.mjs'
]){
  const source=read(relative);

  if(
    !source.includes(
      'fs.statSync'
    )
  ){
    fail(
      relative+
      ' lost its physical artifact byte-budget measurement.'
    );
  }
}

const packageJson=
  JSON.parse(
    read(
      'package.json'
    )
  );

if(
  packageJson.scripts
    ?.['cross-platform:contract']!==
  'node scripts/validate-r4-logical-physical-contract.mjs'
){
  fail(
    'package.json is missing cross-platform:contract.'
  );
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

const contractIndex=
  validate.indexOf(
    'npm run cross-platform:contract'
  );

const project=
  validate.indexOf(
    'node scripts/validate-project.mjs'
  );

if(
  baseline<0||
  contractIndex<=baseline||
  project<=contractIndex
){
  fail(
    'Cross-platform gate order must be baseline → logical/physical contract → project validation.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND R4 CROSS-PLATFORM VALIDATION BASELINE B1: FAIL'
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
  'DREAMLAND R4 CROSS-PLATFORM VALIDATION BASELINE B1: PASS'
);
console.log(
  'Logical source reads/budgets/hashes are EOL-canonical; physical artifact bytes/hashes remain byte-exact; shared validation IO ownership verified.'
);
console.log('');

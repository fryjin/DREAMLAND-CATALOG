#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();

const leftArg=
  process.argv[2];

const rightArg=
  process.argv[3];

if(
  !leftArg||
  !rightArg
){
  console.error(
    'Usage: node scripts/compare-r4-cross-platform-manifests.mjs <left.json> <right.json>'
  );
  process.exit(1);
}

function load(relative){
  const absolute=
    path.resolve(
      ROOT,
      relative
    );

  if(!fs.existsSync(absolute)){
    console.error(
      'Manifest is missing: '+
      relative
    );
    process.exit(1);
  }

  try{
    return JSON.parse(
      fs.readFileSync(
        absolute,
        'utf8'
      )
    );
  }catch(error){
    console.error(
      'Manifest JSON is invalid: '+
      relative+
      ' — '+
      error.message
    );
    process.exit(1);
  }
}

const left=load(leftArg);
const right=load(rightArg);

if(
  left.schemaVersion!==1||
  right.schemaVersion!==1
){
  console.error(
    'Unsupported cross-platform manifest schema.'
  );
  process.exit(1);
}

const leftMap=
  new Map(
    (left.entries||[])
      .map(
        entry=>[
          entry.path,
          entry
        ]
      )
  );

const rightMap=
  new Map(
    (right.entries||[])
      .map(
        entry=>[
          entry.path,
          entry
        ]
      )
  );

const paths=[
  ...new Set([
    ...leftMap.keys(),
    ...rightMap.keys()
  ])
].sort(
  (a,b)=>
    a.localeCompare(b,'en')
);

const errors=[];

for(const pathname of paths){
  const a=leftMap.get(pathname);
  const b=rightMap.get(pathname);

  if(!a){
    errors.push(
      pathname+
      ': missing from '+
      String(left.platform||'left')
    );
    continue;
  }

  if(!b){
    errors.push(
      pathname+
      ': missing from '+
      String(right.platform||'right')
    );
    continue;
  }

  if(
    a.physicalBytes===
      b.physicalBytes&&
    a.physicalSha256===
      b.physicalSha256
  ){
    continue;
  }

  const hasLogical=
    a.logicalSha256&&
    b.logicalSha256;

  const logicalEqual=
    hasLogical&&
    a.logicalBytes===
      b.logicalBytes&&
    a.logicalSha256===
      b.logicalSha256;

  if(logicalEqual){
    errors.push(
      pathname+
      ': physical artifact drift with identical logical text '+
      '(likely EOL/encoding emission drift); '+
      String(left.platform||'left')+
      '='+
      a.physicalBytes+
      ' bytes, '+
      String(right.platform||'right')+
      '='+
      b.physicalBytes+
      ' bytes.'
    );
  }else{
    errors.push(
      pathname+
      ': artifact content drift; physical SHA differs'+
      (
        hasLogical
          ? ' and logical SHA differs.'
          : '.'
      )
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND R4 CROSS-PLATFORM DETERMINISTIC BUILD: FAIL'
  );

  for(const error of errors.slice(0,50)){
    console.error('- '+error);
  }

  if(errors.length>50){
    console.error(
      '- ... '+
      (errors.length-50)+
      ' additional mismatch(es) omitted.'
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND R4 CROSS-PLATFORM DETERMINISTIC BUILD: PASS'
);
console.log(
  '- '+
  String(left.platform||'left')+
  ' and '+
  String(right.platform||'right')+
  ' produced '+
  paths.length+
  ' byte-identical Production artifacts.'
);
console.log('');

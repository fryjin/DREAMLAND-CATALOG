#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const TARGET=path.join(
  ROOT,
  'scripts',
  'validate-f3-c3-contact-input-efficiency.mjs'
);

function fail(message){
  console.error(`\n[F3-C1 C3 VALIDATOR REPAIR] FAIL: ${message}\n`);
  process.exit(1);
}

if(!fs.existsSync(TARGET)){
  fail('missing scripts/validate-f3-c3-contact-input-efficiency.mjs');
}

const raw=fs.readFileSync(TARGET,'utf8');
const eol=raw.includes('\r\n')?'\r\n':'\n';
let source=raw.replace(/\r\n?/g,'\n');

const oldText=`        "enterKeyHint:'done'",`;
const newText=`        "enterKeyHint:'next'",`;

const count=source.split(oldText).length-1;
if(count!==1){
  fail(`expected exactly 1 stale phone enterKeyHint anchor, found ${count}`);
}

source=source.replace(oldText,newText);

if(source.includes(oldText)){
  fail('stale phone enterKeyHint validator marker remains');
}

if(!source.includes(newText)){
  fail('expected repaired phone enterKeyHint marker missing');
}

fs.writeFileSync(
  TARGET,
  eol==='\r\n'
    ? source.replace(/\n/g,'\r\n')
    : source,
  'utf8'
);

console.log('[F3-C1 C3 VALIDATOR REPAIR] PASS');
console.log('  updated: scripts/validate-f3-c3-contact-input-efficiency.mjs');
console.log('  scope:   stale phone enterKeyHint assertion only');
console.log('  reason:  phone moved from last Required field to first Optional field');
console.log('  runtime: no runtime/data/CSS changes');
console.log('');
console.log('Next: npm run r4:conversion:contact-input');

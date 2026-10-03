#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const TARGET=path.join(
  ROOT,
  'scripts',
  'validate-site-copy-zh1-customer-override.mjs'
);

function fail(message){
  console.error(`\n[F3-C1 ZH3 VALIDATOR REPAIR] FAIL: ${message}\n`);
  process.exit(1);
}

if(!fs.existsSync(TARGET)){
  fail('missing scripts/validate-site-copy-zh1-customer-override.mjs');
}

const raw=fs.readFileSync(TARGET,'utf8');
const eol=raw.includes('\r\n')?'\r\n':'\n';
let source=raw.replace(/\r\n?/g,'\n');

const replacements=[
  [
    'ZH Contact required body',
    `expect(zh.inquiryFlow?.contactRequiredBody,'为确保准确收到正式报价单，请填写有效联络方式','ZH Contact required body');`,
    `expect(zh.inquiryFlow?.contactRequiredBody,'请填写联系人、国家 / 地区和邮箱，以便我们准确发送正式报价单。','ZH Contact required body');`
  ],
  [
    'ZH Contact optional body',
    `expect(zh.inquiryFlow?.contactOptionalBody,'提供公司名称与采购背景，有助于为您提供精准折扣','ZH Contact optional body');`,
    `expect(zh.inquiryFlow?.contactOptionalBody,'可补充其他联系方式、公司信息与采购背景，帮助我们更准确地准备报价。','ZH Contact optional body');`
  ]
];

for(const [label,oldText,newText] of replacements){
  const count=source.split(oldText).length-1;
  if(count!==1){
    fail(`${label}: expected exactly 1 stale anchor, found ${count}`);
  }
  source=source.replace(oldText,newText);
}

for(const [,oldText] of replacements){
  if(source.includes(oldText)){
    fail(`stale ZH3 validator assertion remains: ${oldText}`);
  }
}

fs.writeFileSync(
  TARGET,
  eol==='\r\n'
    ? source.replace(/\n/g,'\r\n')
    : source,
  'utf8'
);

console.log('[F3-C1 ZH3 VALIDATOR REPAIR] PASS');
console.log('  updated: scripts/validate-site-copy-zh1-customer-override.mjs');
console.log('  scope:   Contact required/optional body assertions only');
console.log('  runtime: no runtime/data/CSS changes');
console.log('');
console.log('Next: npm run r4:copy:zh-customer');

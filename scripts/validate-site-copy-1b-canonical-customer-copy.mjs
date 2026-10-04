#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];

function fail(message){errors.push(message);}
function read(relative){
  const file=path.join(ROOT,relative);
  if(!fs.existsSync(file)){fail('Missing required file: '+relative);return '';}
  return fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n');
}
function json(relative){
  try{return JSON.parse(read(relative));}
  catch(error){fail(relative+' is not valid JSON: '+error.message);return {};}
}
function expect(value,expected,label){
  if(value!==expected) fail(label+' changed. Expected: '+JSON.stringify(expected)+'; got: '+JSON.stringify(value));
}
function strings(value,out=[]){
  if(typeof value==='string'){out.push(value);return out;}
  if(Array.isArray(value)){for(const item of value) strings(item,out);return out;}
  if(value&&typeof value==='object'){for(const item of Object.values(value)) strings(item,out);}
  return out;
}

const site=json('data/site-content.json');
const i18n=json('data/i18n.json');
const css=read('src/astro/styles/home.css');
const reviewRuntime=read('src/astro/runtime/review-runtime.js');
const pkg=json('package.json');

for(const lang of ['zh','en','ko']){
  if(!site.languages?.[lang]) fail('Missing site-content language: '+lang);
  if(!i18n.ui?.[lang]) fail('Missing i18n UI language: '+lang);
}

expect(site.languages?.zh?.craft?.title,'揉光进影，手作修刃','ZH Craft title');
expect(site.languages?.zh?.craft?.body,'以食品级石蜡和天然白蜂蜡为基底，我们将传统多层提浸工艺与几何雕琢融为一体。每一支蜡烛，都在静止的蜡质中凝固流动的感官色彩，为空间注入独立而温润的气场。','ZH Craft body');
expect(site.languages?.zh?.catalog?.title,'搜寻属于你的光影廓形','ZH Catalog title');
expect(site.languages?.en?.catalog?.title,'Find the form that belongs in your space.','EN Catalog title');
expect(site.languages?.ko?.catalog?.title,'공간에 어울리는 빛의 형태를 찾아보세요.','KO Catalog title');

expect(site.languages?.zh?.inquiryFlow?.reviewTitle,'询价信息最终确认','ZH Review title');
expect(site.languages?.en?.inquiryFlow?.reviewTitle,'Final Quote Request Review','EN Review title');
expect(site.languages?.ko?.inquiryFlow?.reviewTitle,'견적 요청 최종 확인','KO Review title');

expect(site.languages?.zh?.inquiryFlow?.beforeSubmitTitle,'提交后，我们将根据您的梯次数量与个性化要求，计算最终优惠总价、生产工期与交付方案。','ZH before-submit title');
expect(site.languages?.en?.inquiryFlow?.beforeSubmitTitle,'After you submit, we’ll prepare the final quotation and delivery plan.','EN before-submit title');
expect(site.languages?.ko?.inquiryFlow?.beforeSubmitTitle,'제출 후 최종 견적과 납품 방안을 준비합니다.','KO before-submit title');

expect(site.languages?.zh?.inquiryFlow?.successTitle,'询价申请已成功提交','ZH success title');
expect(site.languages?.en?.inquiryFlow?.successTitle,'Your quote request has been submitted successfully.','EN success title');
expect(site.languages?.ko?.inquiryFlow?.successTitle,'견적 요청이 정상적으로 접수되었습니다.','KO success title');

if(!css.includes('SITE-COPY-1B — Craft Longform Copy')){
  fail('Craft longform CSS stage is missing.');
}
if(!/data-home-bind="craft\.body"[\s\S]*white-space\s*:\s*pre-line/m.test(css)){
  fail('Craft longform copy must preserve paragraph breaks with white-space:pre-line.');
}

const engineering=/Web3Forms|Access Key|Sync Status|runtime state|payload|submission service|form not configured/i;
for(const lang of ['zh','en','ko']){
  for(const value of strings(i18n.ui?.[lang]||{})){
    if(engineering.test(value)){
      fail('Customer-facing '+lang+' i18n still exposes engineering language: '+value);
    }
  }
}

for(const marker of [
  "submitting:'Submitting Quote Request…'",
  "failed:'We can’t submit your quote request right now. Please try again shortly.'",
  "config:'We can’t submit your quote request right now. Your selections are still saved.'",
  "submitting:'正在发送询价…'",
  "submitting:'견적 요청 제출 중…'"
]){
  if(!reviewRuntime.includes(marker)){
    fail('Review customer-facing runtime copy changed. Missing: '+marker);
  }
}

if(
  pkg.scripts?.['r4:copy:canonical-customer']!==
  'node scripts/validate-site-copy-1b-canonical-customer-copy.mjs'
){
  fail('package.json lost r4:copy:canonical-customer.');
}

const validate=String(pkg.scripts?.validate||'');
if(!validate.endsWith('npm run r4:visual:pdp-metadata-cleanup && npm run r4:copy:canonical-customer && npm run r4:copy:zh-customer')){
  fail('SITE-COPY-1B / ZH1 must close the validation chain after PDP-POLISH-2 with canonical-customer -> zh-customer.');
}

if(errors.length){
  console.error('');
  console.error('SITE-COPY-1B CANONICAL CUSTOMER COPY: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('SITE-COPY-1B CANONICAL CUSTOMER COPY: PASS');
console.log('Home → Catalog → PDP → Custom → Inquiry → Contact → Review → Success customer copy is aligned across ZH / EN / KO.');
console.log('');

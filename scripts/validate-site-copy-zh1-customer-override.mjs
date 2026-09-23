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

const site=json('data/site-content.json');
const i18n=json('data/i18n.json');

const zh=site.languages?.zh||{};
const ui=i18n.ui?.zh||{};

expect(zh.hero?.title,'DREAMLAND','ZH Home hero title');
expect(zh.story?.title,'光影与手温的相遇','ZH brand-story title');
expect(zh.story?.note,'心中有爱，好梦常在。','ZH official slogan placement');
expect(zh.featured?.title,'五款精选作品','ZH featured title');
expect(zh.craft?.title,'揉光进影，手作修刃','ZH Craft title');
if(!String(zh.craft?.body||'').includes('30至50次反复浸染')){
  fail('ZH Craft copy must preserve the approved 30–50 dipping fact.');
}
expect(zh.wholesale?.title,'清晰有序的服务流程','ZH service-flow title');
expect(zh.catalog?.title,'搜寻属于你的光影廓形','ZH Catalog title');
expect(zh.catalog?.reviewInquiry,'查看询价清单','ZH Catalog inquiry CTA');
expect(zh.detail?.addInquiry,'加入询价清单','ZH PDP add-to-inquiry');
expect(zh.detail?.customProject,'预约专属定制','ZH PDP custom CTA');
expect(zh.inquiryFlow?.title,'询价清单确认','ZH Inquiry title');
expect(zh.inquiryFlow?.contactTitle,'联系方式与项目信息','ZH Contact title');
expect(zh.inquiryFlow?.reviewTitle,'询价信息最终确认','ZH Review title');
expect(zh.inquiryFlow?.beforeSubmitTitle,'提交后，我们将进入报价确认流程。','ZH pre-submit title');
expect(zh.inquiryFlow?.successTitle,'询价申请已成功提交','ZH Success title');
expect(zh.inquiryFlow?.awaitingReview,'需求确认中','ZH Success status');
expect(zh.inquiryFlow?.moqGroup,'合并计价组','ZH MOQ group label');

expect(ui.addInquiry,'加入询价清单','ZH UI add-to-inquiry');
expect(ui.inquiry,'询价清单','ZH UI inquiry terminology');
expect(ui.viewTierPrice,'查看阶梯价格','ZH UI tier-pricing label');
expect(ui.unitSaving,'每件立减','ZH UI unit saving');

for(const [label,value] of [
  ['site-content',JSON.stringify(zh)],
  ['i18n',JSON.stringify(ui)]
]){
  if(/天然白蜂蜡为基底|甄选天然白蜂蜡|24 小时内|24小时内|精准折扣|感谢您的垂询|专属顾问正在/.test(value)){
    fail('ZH customer copy contains an unverified or overcommitted claim in '+label+'.');
  }
}

if(errors.length){
  console.error('');
  console.error('SITE-COPY-ZH1 CHINESE CUSTOMER COPY OVERRIDE: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('SITE-COPY-ZH1 CHINESE CUSTOMER COPY OVERRIDE: PASS');
console.log('Chinese Home → Catalog → PDP → Inquiry → Contact → Review → Success copy matches the approved commercial/editorial direction; EN/KO remain untouched.');
console.log('');

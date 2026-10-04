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
  if(value!==expected){
    fail(label+' changed. Expected: '+JSON.stringify(expected)+'; got: '+JSON.stringify(value));
  }
}

const site=json('data/site-content.json');
const i18n=json('data/i18n.json');

const zh=site.languages?.zh||{};
const ui=i18n.ui?.zh||{};

expect(zh.hero?.title,'DREAMLAND','ZH Home Hero title');
expect(zh.hero?.body,'专为精品零售与定制礼赠而生。优材精选，匠心手作，定制属于你的空间光影。','ZH Home Hero body');

expect(zh.story?.title,'光影与手温的相遇','ZH Story title');
expect(zh.story?.body,'层层浸染，一刃成境。甄选环保蜡材搭配莫兰迪色彩体系，为精品零售与定制礼赠打造雕琢光影的感官艺术。','ZH Story body');

expect(zh.collections?.title,'搜寻属于你的光影廓形','ZH Home Collections title');
expect(zh.collections?.body,'凝练色彩与精雕廓形，全方位适配空间美学展示与品牌高定礼赠需求。','ZH Home Collections body');

expect(zh.featured?.title,'臻选推荐','ZH Featured title');

expect(zh.craft?.title,'揉光进影，手作修刃','ZH Craft title');
expect(zh.craft?.body,'以食品级石蜡和天然白蜂蜡为基底，我们将传统多层提浸工艺与几何雕琢融为一体。每一支蜡烛，都在静止的蜡质中凝固流动的感官色彩，为空间注入独立而温润的气场。','ZH Craft body');

expect(zh.custom?.title,'私享定制 · 灵感落地','ZH Home Custom title');

expect(zh.wholesale?.title,'严谨有序的服务流程','ZH Service title');
expect(zh.wholesale?.facts?.[0]?.title,'01 廓形选款','ZH Service node 01');
expect(zh.wholesale?.facts?.[1]?.title,'02 细节沟通','ZH Service node 02');
expect(zh.wholesale?.facts?.[2]?.title,'03 试样确认','ZH Service node 03');
expect(zh.wholesale?.facts?.[3]?.title,'04 尊享交付','ZH Service node 04');

expect(zh.catalog?.title,'搜寻属于你的光影廓形','ZH Catalog title');
expect(zh.catalog?.body,'凝练色彩与精雕廓形，全方位适配空间美学展示与品牌高定礼赠需求。','ZH Catalog shared body');

expect(zh.detail?.moqNote,'💡 同系列、同尺寸款式支持合并计算起订量与阶梯优惠','ZH PDP MOQ helper');
expect(zh.detail?.pricingNote,'最终结算单价将依据采购总量与个性化定制配置，在正式报价单中确认。','ZH PDP pricing note');

expect(zh.inquiryFlow?.title,'询价清单确认','ZH Inquiry title');
expect(zh.inquiryFlow?.body,'核对您的选款组合与预估数量，确认无误后即可填写真实联系方式获取商业报价单。','ZH Inquiry body');
expect(zh.inquiryFlow?.stepSelection,'选款核对','ZH Inquiry step 1');
expect(zh.inquiryFlow?.stepContact,'填写联系方式','ZH Inquiry step 2');
expect(zh.inquiryFlow?.stepReview,'提交确认','ZH Inquiry step 3');
expect(zh.inquiryFlow?.moqRule,'本组内款式享起订量合并累加，快速解锁下一阶梯批发优惠。','ZH Inquiry grouping rule');
expect(zh.inquiryFlow?.cannotContinue,'⚠️ 当前选款组合尚未达到基础起订量门槛，请调整数量后继续。','ZH Inquiry MOQ blocker');

expect(zh.inquiryFlow?.contactTitle,'联系方式与项目信息','ZH Contact title');
expect(zh.inquiryFlow?.contactBody,'请留下您的常用联系方式，我们的定制顾问将在 24 小时内与您对接详细报价与落地细节。','ZH Contact body');
expect(zh.inquiryFlow?.contactDetailsTitle,'联系信息','ZH Review contact title');
expect(zh.inquiryFlow?.contactRequiredTitle,'联系信息','ZH Contact required title');
expect(zh.inquiryFlow?.contactRequiredBody,'请填写联系人、国家 / 地区和邮箱，以便我们准确发送正式报价单。','ZH Contact required body');
expect(zh.inquiryFlow?.contactOptionalTitle,'其他补充','ZH Contact optional title');
expect(zh.inquiryFlow?.contactOptionalBody,'可补充其他联系方式、公司信息与采购背景，帮助我们更准确地准备报价。','ZH Contact optional body');
expect(JSON.stringify(zh.inquiryFlow?.whatNextSteps),JSON.stringify(['需求初审','细节沟通','正式报价']),'ZH Contact/Success steps');

expect(zh.inquiryFlow?.reviewTitle,'询价信息最终确认','ZH Review title');
expect(zh.inquiryFlow?.reviewBody,'请复核您的联系信息与选款清单，无误后即可提交询价申请。','ZH Review body');
expect(zh.inquiryFlow?.beforeSubmitTitle,'提交后，我们将根据您的梯次数量与个性化要求，计算最终优惠总价、生产工期与交付方案。','ZH Review service promise');
expect(zh.inquiryFlow?.privacyPrefix,'我已阅读并同意','ZH Review privacy prefix');
expect(zh.inquiryFlow?.privacyLink,'《隐私政策与服务条款》','ZH Review privacy label');
expect(zh.inquiryFlow?.submitInquiry,'提交询价申请','ZH Review CTA');

expect(zh.inquiryFlow?.successTitle,'询价申请已成功提交','ZH Success title');
expect(zh.inquiryFlow?.successBody,'感谢您的咨询。我们已收到您的询价意向，专属顾问正在整理项目需求，并将尽快与您建立对接。','ZH Success body');
expect(zh.inquiryFlow?.continueExploring,'探索更多产品','ZH Success browse CTA');
expect(zh.inquiryFlow?.startAnotherProject,'提交新的询价','ZH Success new-inquiry CTA');

expect(ui.heroCopy,'专为精品零售与定制礼赠而生。优材精选，匠心手作，定制属于你的空间光影。','ZH legacy Hero copy');
expect(ui.catalogSub,'凝练色彩与精雕廓形，全方位适配空间美学展示与品牌高定礼赠需求。','ZH legacy Catalog copy');
expect(ui.quantityGroupRule,'本组内款式享起订量合并累加，快速解锁下一阶梯批发优惠。','ZH UI quantity group rule');
expect(ui.tierRule,'本组内款式享起订量合并累加，快速解锁下一阶梯批发优惠。','ZH UI tier rule');

if(errors.length){
  console.error('');
  console.error('SITE-COPY-ZH3 COPY-ONLY UPDATE: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('SITE-COPY-ZH3 COPY-ONLY UPDATE: PASS');
console.log('Chinese copy follows 文案优化方案(2).xlsx within the existing UI/data contract. No UI/runtime/component/style changes are required by this validator.');
console.log('');

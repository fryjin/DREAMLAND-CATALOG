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
const pdp=json('data/pdp-content.json');
const zh=site.languages?.zh||{};
const ui=i18n.ui?.zh||{};
const override=pdp.productPresentationOverrides?.MPC001||{};

expect(zh.hero?.title,'DREAMLAND','Home PC hero title');
expect(zh.hero?.bodyDesktop,'层层浸染，一刃成境。甄选天然白蜂蜡与莫兰迪色彩体系，为精品零售与定制礼赠打造雕琢光影的感官艺术。','Home PC hero subtitle');
expect(zh.hero?.bodyMobile,'专为精品零售与定制礼赠而生。甄选天然白蜂蜡，手工层叠切割。从廓形、色彩到香氛，定制属于你的空间光影。','Home Mobile hero subtitle');
expect(zh.story?.title,'光影与手温的相遇','Home brand-story title');
expect(zh.story?.body,'以天然白蜂蜡为基底，我们将传统多层提浸工艺与几何雕琢融为一体。每一支蜡烛，都在静止的蜡质中凝固流动的感官色彩，为空间注入独立而温润的气场。','Home brand-story body');
expect(zh.featured?.title,'匠心臻选 · 经典系列展示','Home featured title');
expect(zh.craft?.title,'揉光进影，手作修刃','Home craft title');
expect(zh.craft?.body,'摒弃工业化模具灌装，从调色、提浸到每一刀切割均由工匠手工完成。','Home craft body');
expect(zh.custom?.title,'私享定制 · 灵感落地','Home custom title');
expect(zh.wholesale?.title,'严谨有序的服务流程','Home service-flow title');

expect(zh.catalog?.title,'搜寻属于你的光影廓形','Catalog title');
expect(zh.catalog?.bodyDesktop,'38 款凝练色彩与精雕廓形，全方位适配空间美学展示与品牌高定礼赠需求。','Catalog PC subtitle');
expect(zh.catalog?.bodyMobile,'探索精雕廓形与色彩层次，选中款式即可加入询价清单。','Catalog Mobile subtitle');
expect(JSON.stringify(zh.catalog?.seriesOrder),JSON.stringify(['all','masterpiece','advanced','classic','holiday']),'Catalog tab order');
expect(zh.catalog?.ctaEmptyTitle,'灵感私享 · 凭图定制','Catalog reference-image banner title');
expect(zh.catalog?.ctaEmptyBody,'已具备明确的设计手稿或参考意向？上传你的灵感图纸，我们的手作团队将直接为你评估工艺可行性、梯次报价与生产周期。','Catalog reference-image banner body');
expect(zh.catalog?.reviewInquiry,'上传图纸并询价','Catalog reference-image CTA');

expect(override?.seriesLabel?.zh,'匠作系列 · Mastercraft','MPC001 series presentation');
expect(override?.name?.zh,'怦然心动 (Heartbeat)','MPC001 product presentation name');
expect(override?.description?.zh,'柔和的莫兰迪基底中，跃出一抹亮烈的光影。如同视线交汇的瞬间——轻盈却深刻，于静止中凝固流动的情感。','MPC001 product description');

const pdpViewModel=read('src/astro/lib/pdp-view-model.mjs');
const pdpRuntime=read('src/astro/runtime/pdp-runtime.js');

if(!pdpViewModel.includes('presentationDescription:')){
  fail('PDP runtime must expose spreadsheet copy through presentationDescription.');
}
if(
  !pdpViewModel.includes(
    'description:\n                pdpCopy.colorStory||'
  )
){
  fail('PDP runtime must preserve Approved Color Story in description.');
}
if(!pdpRuntime.includes('content().presentationDescription||')){
  fail('PDP visible description must prefer presentationDescription.');
}
expect(zh.detail?.moqNote,'💡 同系列、同规格款式支持合并累加计算起订量与阶梯优惠','PDP MOQ helper');
expect(zh.detail?.addInquiry,'加入询价清单','PDP main CTA');
expect(zh.detail?.customProject,'预约专属定制','PDP secondary CTA');
expect(zh.detail?.pricingNote,'最终结算单价将依据采购总量与个性化定制配置，在正式报价单中确认。','PDP pricing note');

expect(zh.inquiryFlow?.title,'询价清单确认','Inquiry title');
expect(zh.inquiryFlow?.body,'核对您的选款组合与预估数量，确认无误后即可填写真实联系方式获取商业报价单。','Inquiry subtitle');
expect(zh.inquiryFlow?.stepSelection,'选款核对','Inquiry step 1');
expect(zh.inquiryFlow?.stepContact,'填写联系方式','Inquiry step 2');
expect(zh.inquiryFlow?.stepReview,'提交确认','Inquiry step 3');
expect(ui.quantityGroupRule,'本组内款式享起订量合并累加，快速解锁下一阶梯批发优惠。','Inquiry group rule');

expect(zh.inquiryFlow?.contactTitle,'联系方式与项目信息','Contact title');
expect(zh.inquiryFlow?.contactBody,'请留下您的常用联系方式，我们的定制顾问将在 24 小时内与您对接详细报价与落地细节。','Contact subtitle');
expect(zh.inquiryFlow?.contactRequiredTitle,'基础联系信息（必填）— 为确保准确收到正式报价单，请填写有效联络方式','Contact required module');
expect(zh.inquiryFlow?.contactOptionalTitle,'项目背景与定制需求（选填）— 提供公司名称与采购背景，有助于为您提供精准折扣','Contact optional module');

expect(zh.inquiryFlow?.reviewTitle,'询价信息最终确认','Review title');
expect(zh.inquiryFlow?.reviewBody,'请复核您的联系信息与选款清单，无误后即可提交询价申请。','Review subtitle');
expect(zh.inquiryFlow?.beforeSubmitTitle,'提交后，我们将根据您的梯次数量与个性化要求，计算最终优惠总价、生产工期与交付方案。','Review service promise');
expect(zh.inquiryFlow?.privacyPrefix,'我已阅读并同意','Review privacy prefix');
expect(zh.inquiryFlow?.privacyLink,'《隐私政策与服务条款》','Review privacy link text');
expect(zh.inquiryFlow?.submitInquiry,'提交询价申请','Review CTA');

expect(zh.inquiryFlow?.successTitle,'询价申请已成功提交','Success title');
expect(zh.inquiryFlow?.successBody,'感谢您的垂询。我们已收到您的询价意向，专属顾问正在整理项目需求，并将尽快与您建立对接。','Success subtitle');
expect(zh.inquiryFlow?.awaitingReview,'需求审核中','Success status');
expect(JSON.stringify(zh.inquiryFlow?.successNextSteps),JSON.stringify(['需求复核','方案对接','正式报价']),'Success next steps');
expect(zh.inquiryFlow?.continueExploring,'探索更多产品','Success primary CTA');
expect(zh.inquiryFlow?.startAnotherProject,'提交新的询价','Success secondary CTA');

if(errors.length){
  console.error('');
  console.error('SITE-COPY-ZH2 EXACT SPREADSHEET COPY: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('SITE-COPY-ZH2 EXACT SPREADSHEET COPY: PASS');
console.log('Chinese customer copy matches 文案优化方案(1).xlsx. EN / KO wording is not rewritten by this patch.');
console.log('');

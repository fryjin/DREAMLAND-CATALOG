#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const BASE='3f1b1d64fb861428eba23d3e975d8a7b43984cbb';
const die=m=>{console.error(`\n[F3-C1 APPLY] FAIL: ${m}\n`);process.exit(1);};
const git=a=>String(execFileSync('git',a,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']})).trim();

function file(rel){
  const p=path.join(ROOT,rel);
  if(!fs.existsSync(p)) die(`missing ${rel}`);
  const raw=fs.readFileSync(p,'utf8');
  return {rel,p,eol:raw.includes('\r\n')?'\r\n':'\n',s:raw.replace(/\r\n?/g,'\n')};
}
function save(f,s){fs.writeFileSync(f.p,f.eol==='\r\n'?s.replace(/\n/g,'\r\n'):s,'utf8');}
function one(s,a,b,label){
  const n=s.split(a).length-1;
  if(n!==1) die(`${label}: expected 1 anchor, found ${n}`);
  return s.replace(a,b);
}

if(git(['rev-parse','HEAD'])!==BASE) die(`baseline mismatch; checkout latest origin/f3-conversion-closeout (${BASE})`);
try{
  execFileSync('git',['diff','--quiet'],{cwd:ROOT,stdio:'ignore'});
  execFileSync('git',['diff','--cached','--quiet'],{cwd:ROOT,stdio:'ignore'});
}catch{die('tracked working tree/index must be clean before APPLY');}

// Contact page
const page=file('src/astro/components/contact/ContactPage.astro');
let s=page.s;
s=one(s,
`    body:c.contactRequiredBody||'Complete these four fields to continue to review.',
    fields:['name','country','email','phone']`,
`    body:c.contactRequiredBody||'Complete these three fields to continue to review.',
    fields:['name','country','email']`,
'contact required section');
s=one(s,
`    body:c.contactOptionalBody||'Add company, buyer and location context if it helps us prepare the quotation.',
    fields:['company','buyerType','city','message']`,
`    body:c.contactOptionalBody||'Add another contact method or any company and purchasing context that may help us prepare the quotation.',
    fields:['phone','company','buyerType','city','message']`,
'contact optional section');
s=one(s,
`    required:true,
    type:'text',
    autocomplete:'tel',
    inputMode:'text',
    enterKeyHint:'done',`,
`    required:false,
    type:'text',
    autocomplete:'tel',
    inputMode:'text',
    enterKeyHint:'next',`,
'phone optional config');
save(page,s);

// Contact owner
const contact=file('src/features/contact/runtime-contact.js');
s=one(contact.s,
`    if(
      normalized.phone.length<5
    ){`,
`    if(
      normalized.phone&&
      normalized.phone.length<5
    ){`,
'contact optional phone validation');
save(contact,s);

// Submission payload
const payload=file('src/domain/submission/runtime-submission-payload.js');
s=one(payload.s,
`    if(
      text(
        value.phone_or_wechat
      ).length<5
    ){`,
`    if(
      text(
        value.phone_or_wechat
      )&&
      text(
        value.phone_or_wechat
      ).length<5
    ){`,
'payload optional phone validation');
save(payload,s);

// Review hides empty optional phone
const review=file('src/astro/runtime/review-runtime.js');
s=one(review.s,
`const optionalContactKeys=new Set(['company','buyerType','city','message']);`,
`const optionalContactKeys=new Set(['phone','company','buyerType','city','message']);`,
'review optional phone');
save(review,s);

// Canonical site copy
const site=file('data/site-content.json');
s=site.s;
for(const [a,b,label] of [
['"contactDetailsBody": "Please provide a valid contact method so we can send your formal quotation accurately."','"contactDetailsBody": "Add your name, country or region, and email so we can send your formal quotation."','EN details'],
['"contactRequiredBody": "Please provide a valid contact method so we can send your formal quotation accurately."','"contactRequiredBody": "Add your name, country or region, and email so we can send your formal quotation."','EN required'],
['"contactOptionalBody": "Company and purchasing context help us apply the most relevant pricing tier."','"contactOptionalBody": "Add another contact method or any company and purchasing context that may help us prepare your quotation."','EN optional'],
['"invalidPhone": "Add one contact method we can reach you on."','"invalidPhone": "Check the WhatsApp, phone or WeChat contact."','EN invalid phone'],
['"contactDetailsBody": "为确保准确收到正式报价单，请填写有效联络方式"','"contactDetailsBody": "请填写联系人、国家 / 地区和邮箱，以便我们准确发送正式报价单。"','ZH details'],
['"contactRequiredBody": "为确保准确收到正式报价单，请填写有效联络方式"','"contactRequiredBody": "请填写联系人、国家 / 地区和邮箱，以便我们准确发送正式报价单。"','ZH required'],
['"contactOptionalBody": "提供公司名称与采购背景，有助于为您提供精准折扣"','"contactOptionalBody": "可补充其他联系方式、公司信息与采购背景，帮助我们更准确地准备报价。"','ZH optional'],
['"invalidPhone": "请填写一个可联系到你的方式。"','"invalidPhone": "请检查填写的 WhatsApp、电话或微信联系方式。"','ZH invalid phone'],
['"contactDetailsBody": "정식 견적서를 정확히 받아보실 수 있도록 유효한 연락처를 입력해 주세요."','"contactDetailsBody": "정식 견적서를 정확히 보내드릴 수 있도록 담당자 이름, 국가 / 지역, 이메일을 입력해 주세요."','KO details'],
['"contactRequiredBody": "정식 견적서를 정확히 받아보실 수 있도록 유효한 연락처를 입력해 주세요."','"contactRequiredBody": "정식 견적서를 정확히 보내드릴 수 있도록 담당자 이름, 국가 / 지역, 이메일을 입력해 주세요."','KO required'],
['"contactOptionalBody": "회사 정보와 구매 배경을 알려주시면 프로젝트에 맞는 가격 조건을 안내하는 데 도움이 됩니다."','"contactOptionalBody": "추가 연락처나 회사 및 구매 관련 정보를 남겨주시면 견적 준비에 도움이 됩니다."','KO optional'],
['"invalidPhone": "연락 가능한 방법을 하나 이상 입력해 주세요."','"invalidPhone": "입력한 WhatsApp, 전화 또는 WeChat 연락처를 확인해 주세요."','KO invalid phone']
]) s=one(s,a,b,label);
save(site,s);

// i18n alignment
const i18n=file('data/i18n.json');
s=i18n.s;
for(const [a,b,label] of [
['"phoneLabel": "WhatsApp / 手机 / 微信 *"','"phoneLabel": "WhatsApp / 手机 / 微信"','ZH label'],
['"phoneError": "请填写 WhatsApp、手机或微信。"','"phoneError": "请检查填写的 WhatsApp、手机或微信联系方式。"','ZH error'],
['"invalidPhone": "请填写有效的 WhatsApp、手机或微信联系方式"','"invalidPhone": "请检查填写的 WhatsApp、手机或微信联系方式"','ZH invalid'],
['"phoneLabel": "WhatsApp / Phone / WeChat *"','"phoneLabel": "WhatsApp / Phone / WeChat"','EN label'],
['"phoneError": "Please enter WhatsApp, phone or WeChat."','"phoneError": "Check the WhatsApp, phone or WeChat contact."','EN error'],
['"invalidPhone": "Enter a valid WhatsApp, phone or WeChat contact."','"invalidPhone": "Check the WhatsApp, phone or WeChat contact."','EN invalid'],
['"phoneLabel": "WhatsApp / 휴대폰 / WeChat *"','"phoneLabel": "WhatsApp / 휴대폰 / WeChat"','KO label'],
['"phoneError": "WhatsApp, 휴대폰 또는 WeChat을 입력해 주세요."','"phoneError": "입력한 WhatsApp, 휴대폰 또는 WeChat 연락처를 확인해 주세요."','KO error'],
['"invalidPhone": "유효한 WhatsApp, 전화 또는 WeChat 연락처를 입력해 주세요."','"invalidPhone": "입력한 WhatsApp, 전화 또는 WeChat 연락처를 확인해 주세요."','KO invalid']
]) s=one(s,a,b,label);
save(i18n,s);

// Repair validators that froze the previous required-phone contract
const c2=file('scripts/validate-f3-c2-contact-conversion-composition.mjs');
s=c2.s;
s=one(s,
`      "fields:['name','country','email','phone']",
      "key:'optional'",
      "fields:['company','buyerType','city','message']",`,
`      "fields:['name','country','email']",
      "key:'optional'",
      "fields:['phone','company','buyerType','city','message']",`,
'C2 section contract');
s=one(s,
`    const expected={name:'invalidName',country:'countryRequired',email:'invalidEmail',phone:'invalidPhone'};`,
`    const expected={name:'invalidName',country:'countryRequired',email:'invalidEmail'};`,
'C2 required fields');
s=one(s,
`  ? 'Compact task-first Hero / required-first 4-field block / secondary optional project context / horizontal mobile progress / locked Contact schema verified.'`,
`  ? 'Compact task-first Hero / required-first 3-field block / optional contact + project context / horizontal mobile progress / locked 8-field Contact schema verified.'`,
'C2 summary');
save(c2,s);

const c4=file('scripts/validate-f3-c4-contact-closeout.mjs');
s=c4.s;
s=one(s,
`        "fields:['name','country','email','phone']",
        "fields:['company','buyerType','city','message']",`,
`        "fields:['name','country','email']",
        "fields:['phone','company','buyerType','city','message']",`,
'C4 section contract');
s=one(s,
`    const required={
      name:'invalidName',
      country:'countryRequired',
      email:'invalidEmail',
      phone:'invalidPhone'
    };`,
`    const required={
      name:'invalidName',
      country:'countryRequired',
      email:'invalidEmail'
    };`,
'C4 required fields');
save(c4,s);

// New F3-C1 gate
const validator=`#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE=process.argv.includes('--source'),DIST=process.argv.includes('--dist');
if(SOURCE===DIST){console.error('Usage: node scripts/validate-f3-c1-contact-requirement-decision.mjs --source|--dist');process.exit(1);}
const errors=[],fail=m=>errors.push(m);
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8').replace(/\\\\r\\\\n?/g,'\\\\n');
const json=r=>JSON.parse(read(r));
const req=(s,m,l)=>{if(!s.includes(m))fail(l+': '+m);};

if(SOURCE){
  try{
    const p=read('src/astro/components/contact/ContactPage.astro');
    req(p,"fields:['name','country','email']",'required section');
    req(p,"fields:['phone','company','buyerType','city','message']",'optional section');
    if(p.includes("fields:['name','country','email','phone']"))fail('phone still in required section');
    const a=p.indexOf('  phone:{'),b=p.indexOf('  buyerType:{',a),block=p.slice(a,b);
    if(!block.includes('required:false')||block.includes('required:true'))fail('phone fieldConfig is not optional');
  }catch(e){fail('page contract: '+e.message);}

  try{
    delete globalThis.DreamlandContact;
    await import(pathToFileURL(path.join(ROOT,'src/features/contact/runtime-contact.js')).href+'?f3c1='+Date.now());
    const c=globalThis.DreamlandContact;
    c.configure({storage:null,fieldIds:['name','company','country','city','email','phone','buyerType','message']});
    const base={name:'Buyer Name',company:'',country:'SG',city:'',email:'buyer@example.com',phone:'',buyerType:'',message:''};
    if(!c.validate(base).valid)fail('blank optional phone blocks Contact validation');
    const bad=c.validate({...base,phone:'123'});
    if(bad.valid||!bad.errors?.some(x=>x.field==='phone'&&x.code==='invalidPhone'))fail('provided invalid phone is not rejected');
  }catch(e){fail('Contact owner: '+e.message);}

  try{
    delete globalThis.DreamlandSubmissionPayload;
    await import(pathToFileURL(path.join(ROOT,'src/domain/submission/runtime-submission-payload.js')).href+'?f3c1='+Date.now());
    const p=globalThis.DreamlandSubmissionPayload;
    const base={inquiry_id:'DL-TEST-1234',contact_name:'Buyer Name',country_or_region:'SG',email_address:'buyer@example.com',phone_or_wechat:'',product_count:1,custom_count:0,items_summary:'Product: test'};
    const ok=p.validate(base);
    if(!ok.ok)fail('blank optional phone_or_wechat blocks submission payload');
    const bad=p.validate({...base,phone_or_wechat:'123'});
    if(bad.ok||bad.code!=='INVALID_CONTACT_METHOD')fail('provided invalid phone_or_wechat is not rejected');
  }catch(e){fail('Submission payload: '+e.message);}

  try{
    req(read('src/astro/runtime/review-runtime.js'),"const optionalContactKeys=new Set(['phone','company','buyerType','city','message']);",'Review optional phone');
    const content=json('data/site-content.json'),ui=json('data/i18n.json').ui;
    const labels={en:'WhatsApp / Phone / WeChat',zh:'WhatsApp / 手机 / 微信',ko:'WhatsApp / 휴대폰 / WeChat'};
    for(const l of ['en','zh','ko']){
      if(ui?.[l]?.phoneLabel!==labels[l])fail('phone label still required: '+l);
      if(!String(content.languages?.[l]?.inquiryFlow?.contactOptionalBody||'').trim())fail('missing optional copy: '+l);
    }
  }catch(e){fail('copy/review: '+e.message);}

  try{
    const pkg=json('package.json');
    if(pkg.scripts?.['r4:conversion:contact-requirements']!=='node scripts/validate-f3-c1-contact-requirement-decision.mjs --source')fail('missing source script');
    if(pkg.scripts?.['r4:conversion:contact-requirements:dist']!=='node scripts/validate-f3-c1-contact-requirement-decision.mjs --dist')fail('missing dist script');
    const v=String(pkg.scripts?.validate||''),b=String(pkg.scripts?.build||'');
    if(v.indexOf('npm run r4:conversion:contact-requirements')<=v.indexOf('npm run r4:conversion:contact-closeout'))fail('source gate order');
    if(b.indexOf('npm run r4:conversion:contact-requirements:dist')<=b.indexOf('npm run r4:conversion:contact-closeout:dist'))fail('dist gate order');
  }catch(e){fail('package topology: '+e.message);}
}

if(DIST){
  try{
    for(const r of ['.r4-astro-dist/inquiry/contact/index.html','dist/inquiry/contact/index.html']){
      const h=read(r),a=h.indexOf('data-contact-section="required"'),b=h.indexOf('data-contact-section="optional"'),c=h.indexOf('</form>',b);
      const reqBlock=h.slice(a,b),optBlock=h.slice(b,c);
      for(const f of ['name','country','email'])if(!reqBlock.includes('data-contact-static-field="'+f+'"'))fail(r+' required missing '+f);
      if(reqBlock.includes('data-contact-static-field="phone"'))fail(r+' phone still required');
      for(const f of ['phone','company','buyerType','city','message'])if(!optBlock.includes('data-contact-static-field="'+f+'"'))fail(r+' optional missing '+f);
    }
    for(const r of ['.r4-astro-dist/r4-contact-runtime.js','dist/r4-contact-runtime.js'])req(read(r),'normalized.phone&&',r+' optional contact validation');
    for(const r of ['.r4-astro-dist/r4-review-runtime.js','dist/r4-review-runtime.js']){
      const x=read(r);
      req(x,"const optionalContactKeys=new Set(['phone','company','buyerType','city','message']);",r+' optional review phone');
      req(x,'value.phone_or_wechat\\n      )&&',r+' optional payload phone');
    }
  }catch(e){fail('dist contract: '+e.message);}
}

if(errors.length){console.error('\\nDREAMLAND F3-C1 CONTACT REQUIREMENT DECISION: FAIL');errors.forEach(e=>console.error('- '+e));console.error('');process.exit(1);}
console.log('\\nDREAMLAND F3-C1 CONTACT REQUIREMENT DECISION: PASS');
console.log(SOURCE?'Required = Name + Country/Region + Email; Phone/WhatsApp/WeChat optional but validated when provided; 8-field schema preserved.':'Production Contact / Review / Submission preserve the optional-phone contract.');
console.log('');
`;

const validatorPath=path.join(ROOT,'scripts/validate-f3-c1-contact-requirement-decision.mjs');
if(fs.existsSync(validatorPath)) die('F3-C1 validator already exists');
fs.writeFileSync(validatorPath,validator,'utf8');

// package scripts + gate order
const pkg=file('package.json');
s=pkg.s;
s=one(s,
`    "r4:conversion:contact-closeout": "node scripts/validate-f3-c4-contact-closeout.mjs --source",
    "r4:conversion:contact-closeout:dist": "node scripts/validate-f3-c4-contact-closeout.mjs --dist",
    "r4:production:contact":`,
`    "r4:conversion:contact-closeout": "node scripts/validate-f3-c4-contact-closeout.mjs --source",
    "r4:conversion:contact-closeout:dist": "node scripts/validate-f3-c4-contact-closeout.mjs --dist",
    "r4:conversion:contact-requirements": "node scripts/validate-f3-c1-contact-requirement-decision.mjs --source",
    "r4:conversion:contact-requirements:dist": "node scripts/validate-f3-c1-contact-requirement-decision.mjs --dist",
    "r4:production:contact":`,
'package scripts');
s=one(s,
`npm run r4:conversion:contact-composition && npm run r4:conversion:contact-input && npm run r4:conversion:contact-closeout && npm run r4:astro:review`,
`npm run r4:conversion:contact-composition && npm run r4:conversion:contact-input && npm run r4:conversion:contact-closeout && npm run r4:conversion:contact-requirements && npm run r4:astro:review`,
'validate order');
s=one(s,
`npm run r4:conversion:contact-composition:dist && npm run r4:conversion:contact-input:dist && npm run r4:conversion:contact-closeout:dist && npm run r4:conversion:review-composition:dist`,
`npm run r4:conversion:contact-composition:dist && npm run r4:conversion:contact-input:dist && npm run r4:conversion:contact-closeout:dist && npm run r4:conversion:contact-requirements:dist && npm run r4:conversion:review-composition:dist`,
'build order');
save(pkg,s);

console.log('[F3-C1 APPLY] PASS');
console.log('  Required: Contact Name + Country/Region + Email');
console.log('  Optional: Phone/WhatsApp/WeChat + Company + Buyer Type + City + Message');
console.log('  Phone blank = PASS; provided invalid value = FAIL');
console.log('  8-field Contact storage/payload schema preserved');
console.log('');
console.log('Next: npm run r4:conversion:contact-requirements');

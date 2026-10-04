#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE=process.argv.includes('--source'),DIST=process.argv.includes('--dist');
if(SOURCE===DIST){console.error('Usage: node scripts/validate-f3-c1-contact-requirement-decision.mjs --source|--dist');process.exit(1);}
const errors=[],fail=m=>errors.push(m);
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8').replace(/\\r\\n?/g,'\\n');
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
    for(const file of [
      'functions/api/inquiry.js',
      'functions/api/risk.js',
      'functions/api/submit.js'
    ]){
      const source=read(file);
      req(
        source,
        'const contactMethod=',
        file+' optional contact-method normalization'
      );
      req(
        source,
        'contactMethod&&\n    contactMethod.length<5',
        file+' optional contact-method validation'
      );

      if(
        source.includes(
          'asText(payload.phone_or_wechat,200).length<5'
        )||
        source.includes(
          'asText(payload.phone_or_wechat, 200).length < 5'
        )
      ){
        fail(
          file+
          ' still requires a non-empty phone / WhatsApp / WeChat value.'
        );
      }
    }
  }catch(e){fail('server contact contract: '+e.message);}

  try{
    req(read('src/astro/components/review/ReviewPage.astro'),"const optionalContactKeys=new Set(['phone','company','buyerType','city','message']);",'Review static optional phone');
    req(read('src/astro/runtime/review-runtime.js'),"const optionalContactKeys=new Set(['phone','company','buyerType','city','message']);",'Review runtime optional phone');
    const sw=read('sw.js');
    const fresh=sw.indexOf("url.pathname===\n      '/r4-review-runtime.js'");
    const generic=sw.indexOf("url.searchParams.get(\n      'release'");
    if(fresh<0||generic<0||fresh>=generic)fail('Review runtime is not protected from stale Service Worker delivery');
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
    for(const r of ['.r4-astro-dist/inquiry/review/index.html','dist/inquiry/review/index.html']){
      const h=read(r);
      const tag=(h.match(/<div[^>]*data-review-static-contact-field="phone"[^>]*>/i)||[])[0]||'';
      if(!tag||!/\shidden(?:\s|>|=)/i.test(tag))fail(r+' blank optional phone row is not statically hidden');
    }
    for(const r of ['.r4-astro-dist/r4-review-runtime.js','dist/r4-review-runtime.js']){
      const x=read(r);
      req(x,"const optionalContactKeys=new Set(['phone','company','buyerType','city','message']);",r+' optional review phone');
      req(x,'value.phone_or_wechat\n      )&&',r+' optional payload phone');
    }
  }catch(e){fail('dist contract: '+e.message);}
}

if(errors.length){console.error('\nDREAMLAND F3-C1 CONTACT REQUIREMENT DECISION: FAIL');errors.forEach(e=>console.error('- '+e));console.error('');process.exit(1);}
console.log('\nDREAMLAND F3-C1 CONTACT REQUIREMENT DECISION: PASS');
console.log(SOURCE?'Required = Name + Country/Region + Email; Phone/WhatsApp/WeChat optional but validated when provided; 8-field schema preserved.':'Production Contact / Review / Submission preserve the optional-phone contract.');
console.log('');

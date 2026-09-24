#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE=process.argv.includes('--source');
const DIST=process.argv.includes('--dist');
if(SOURCE===DIST){console.error('Usage: node scripts/validate-f3-c2-contact-conversion-composition.mjs --source|--dist');process.exit(1);}
const errors=[];
const fail=m=>errors.push(m);
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8').replace(/\r\n?/g,'\n');
const json=r=>JSON.parse(read(r));
const req=(label,src,markers)=>markers.forEach(m=>{if(!src.includes(m))fail(label+' is missing: '+m);});
const forbid=(label,src,markers)=>markers.forEach(m=>{if(src.includes(m))fail(label+' still contains deprecated composition: '+m);});

function assertFields(html,label){
  const fields=[...html.matchAll(/data-contact-static-field="([^"]+)"/gi)].map(m=>m[1]);
  const expected=['name','company','country','city','email','phone','buyerType','message'].sort();
  const actual=[...fields].sort();
  if(fields.length!==8||JSON.stringify(actual)!==JSON.stringify(expected)){
    fail(label+' changed the 8-field Contact schema: '+fields.join(', '));
  }
}

if(SOURCE){
  try{
    const page=read('src/astro/components/contact/ContactPage.astro');
    req('Contact composition',page,[
      'data-contact-conversion-composition="true"',
      'const sections=[',
      "key:'required'",
      "fields:['name','country','email','phone']",
      "key:'optional'",
      "fields:['company','buyerType','city','message']",
      'data-contact-section={section.key}',
      'contact-section__header',
      'contact-section__fields',
      "titleKey:'contactRequiredTitle'",
      "titleKey:'contactOptionalTitle'"
    ]);
    forbid('Contact composition',page,['const chapters=[','contact-chapter','data-contact-static-chapter']);
    if(page.indexOf("key:'optional'")<=page.indexOf("key:'required'"))fail('Required Contact fields must be presented before optional project context.');
    if(page.includes('<header class="contact-form__header">'))fail('Duplicate Contact form header must be removed.');
  }catch(e){fail('Contact composition source validation failed: '+e.message);}

  try{
    const view=read('src/astro/lib/contact-view-model.mjs');
    req('Contact view-model copy',view,["'contactRequiredTitle'","'contactRequiredBody'","'contactOptionalTitle'","'contactOptionalBody'"]);
  }catch(e){fail('Contact view-model validation failed: '+e.message);}

  try{
    const content=json('data/site-content.json');
    for(const lang of ['en','zh','ko']){
      const copy=content.languages?.[lang]?.inquiryFlow;
      for(const key of ['contactRequiredTitle','contactRequiredBody','contactOptionalTitle','contactOptionalBody']){
        if(!String(copy?.[key]||'').trim())fail('Contact composition copy is missing: '+lang+'.'+key);
      }
    }
  }catch(e){fail('Contact localization validation failed: '+e.message);}

  try{
    const css=read('src/astro/styles/contact.css');
    req('Contact conversion CSS',css,[
      'F3-C2 — Contact Conversion Composition',
      '.contact-section',
      '.contact-section__header',
      '.contact-section__fields',
      '.contact-section--optional',
      'grid-template-columns:repeat(3,minmax(0,1fr));'
    ]);
    forbid('Contact conversion CSS',css,['.contact-chapter','.contact-chapter__header','.contact-chapter__fields']);
    if(!/\.contact-hero h1\s*\{[\s\S]*?font-size:clamp\(44px,5\.4vw,68px\);/m.test(css))fail('Contact Hero was not compacted to the F3-C2 conversion scale.');
  }catch(e){fail('Contact CSS validation failed: '+e.message);}

  try{
    delete globalThis.DreamlandContact;
    await import(pathToFileURL(path.join(ROOT,'src/features/contact/runtime-contact.js')).href+'?f3c2='+Date.now());
    const contact=globalThis.DreamlandContact;
    contact.configure({storage:null,fieldIds:['name','company','country','city','email','phone','buyerType','message']});
    const base={name:'Buyer Name',company:'',country:'SG',city:'',email:'buyer@example.com',phone:'+65 12345678',buyerType:'',message:''};
    if(!contact.validate(base).valid)fail('Optional project-context fields became required.');
    const expected={name:'invalidName',country:'countryRequired',email:'invalidEmail',phone:'invalidPhone'};
    for(const [field,code] of Object.entries(expected)){
      const result=contact.validate({...base,[field]:''});
      if(result.valid||!result.errors?.some(row=>row.field===field&&row.code===code))fail('Locked required Contact contract changed for '+field+'.');
    }
  }catch(e){fail('Locked Contact field contract validation failed: '+e.message);}

  try{
    const runtime=read('src/astro/runtime/contact-runtime.js');
    req('Contact runtime preservation',runtime,['contact.scheduleDraft(','contact.flushDraft(','contact.validate(','continueToReview()','renderValidation(']);
    for(const marker of ['DreamlandRisk','DreamlandSubmission','DreamlandInquirySubmissionFlow','hcaptcha','fetch('])if(runtime.includes(marker))fail('C2 crossed Contact/Review/Submission boundary: '+marker);
  }catch(e){fail('Contact runtime preservation failed: '+e.message);}

  try{
    const promotion=read('scripts/r4-promote-astro-contact.mjs');
    req('Contact Production promotion',promotion,["'data-contact-conversion-composition=\"true\"'","'data-contact-section=\"required\"'","'data-contact-section=\"optional\"'"]);
  }catch(e){fail('Contact promotion validation failed: '+e.message);}

  try{
    const pkg=json('package.json');
    if(pkg.scripts?.['r4:conversion:contact-composition']!=='node scripts/validate-f3-c2-contact-conversion-composition.mjs --source')fail('package.json is missing r4:conversion:contact-composition.');
    if(pkg.scripts?.['r4:conversion:contact-composition:dist']!=='node scripts/validate-f3-c2-contact-conversion-composition.mjs --dist')fail('package.json is missing r4:conversion:contact-composition:dist.');
    const validate=String(pkg.scripts?.validate||'');
    const runtime=validate.indexOf('npm run r4:astro:contact-runtime');
    const composition=validate.indexOf('npm run r4:conversion:contact-composition');
    const review=validate.indexOf('npm run r4:astro:review');
    if(runtime<0||composition<=runtime||review<=composition)fail('Contact composition source gate must run after Contact Runtime and before Review.');
    const build=String(pkg.scripts?.build||'');
    if(build.indexOf('npm run r4:conversion:contact-composition:dist')<=build.indexOf('npm run r4:conversion:interaction-closeout:dist'))fail('Contact composition Production gate must run after Inquiry conversion closeout.');
  }catch(e){fail('Contact package topology failed: '+e.message);}
}

if(DIST){
  try{
    for(const relative of ['.r4-astro-dist/inquiry/contact/index.html','dist/inquiry/contact/index.html']){
      const html=read(relative);
      req(relative,html,[
        'data-contact-conversion-composition="true"',
        'data-contact-section="required"',
        'data-contact-section="optional"',
        'data-contact-static-form',
        'data-contact-static-summary',
        'data-contact-static-continue'
      ]);
      assertFields(html,relative);
      if(html.indexOf('data-contact-section="optional"')<=html.indexOf('data-contact-section="required"'))fail(relative+' does not present required fields before optional context.');
      if(html.includes('data-contact-static-chapter='))fail(relative+' still exposes the old four-chapter Contact composition.');
    }
  }catch(e){fail('Production Contact composition validation failed: '+e.message);}
}

if(errors.length){
  console.error('\nDREAMLAND F3-C2 CONTACT CONVERSION COMPOSITION: FAIL');
  errors.forEach(e=>console.error('- '+e));
  console.error('');
  process.exit(1);
}
console.log('\nDREAMLAND F3-C2 CONTACT CONVERSION COMPOSITION: PASS');
console.log(SOURCE
  ? 'Compact task-first Hero / required-first 4-field block / secondary optional project context / horizontal mobile progress / locked Contact schema verified.'
  : 'Isolated Astro + Production Contact preserve the F3-C2 conversion composition.');
console.log('');

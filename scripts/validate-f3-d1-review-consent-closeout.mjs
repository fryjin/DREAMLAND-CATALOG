import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const DIST=process.argv.includes('--dist');
const errors=[];

function fail(message){
  errors.push(message);
}

function exists(relative){
  return fs.existsSync(path.join(ROOT,relative));
}

function read(relative){
  return fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\r\n?/g,'\n');
}

function requireMarker(label,content,marker){
  if(!content.includes(marker)){
    fail(label+' missing: '+marker);
  }
}

function forbidMarker(label,content,marker){
  if(content.includes(marker)){
    fail(label+' must not contain: '+marker);
  }
}

function checkSource(){
  const page=read('src/astro/components/review/ReviewPage.astro');
  const view=read('src/astro/lib/review-view-model.mjs');
  const runtime=read('src/astro/runtime/review-runtime.js');
  const config=JSON.parse(read('data/app-config.json'));

  for(const marker of [
    'data-review-static-consent',
    'data-review-privacy-link',
    'href={(view.routes.privacy||\'/privacy/\')+\'#\'+(view.language||\'en\')}',
    'target="_blank"',
    'rel="noopener noreferrer"',
    'aria-describedby="reviewSubmitStatus"',
    'id="reviewSubmitStatus"'
  ]){
    requireMarker('ReviewPage',page,marker);
  }

  const submitTag=(page.match(/<button[^>]*data-review-static-submit[^>]*>/is)||[])[0]||'';
  if(!submitTag){
    fail('Review Submit CTA missing.');
  }else if(/\sdisabled(?:\s|>|=)/i.test(submitTag)){
    fail('Review Submit must not be disabled only because consent is unchecked.');
  }

  if((view.match(/privacy:\s*\n\s*'\/privacy\/'/g)||[]).length!==2){
    fail('Review static/runtime state must share exactly two canonical /privacy/ route declarations.');
  }

  for(const marker of [
    'function privacyHref(state,language)',
    "'[data-review-privacy-link]'",
    "statusText('privacy')",
    "'[data-review-privacy]'",
    'privacy?.focus?.();',
    'attemptGate.active;'
  ]){
    requireMarker('Review runtime',runtime,marker);
  }

  forbidMarker(
    'Review runtime Submit disabled expression',
    runtime,
    'attemptGate.active||\n          !privacyAccepted'
  );

  if(config.privacyUrl!=='./privacy.html'){
    fail('LEGAL HOLD: source app-config privacyUrl must remain ./privacy.html.');
  }

  if(config.privacyVersion!=='2026-07-30'){
    fail('LEGAL HOLD: privacyVersion changed unexpectedly.');
  }

  if(/\bterms\b/i.test(
    page
      .replace(/beforeSubmit/g,'')
  )){
    fail('F3-D1 must not introduce Terms UI on Review.');
  }
}

function checkDist(){
  const routes=[
    ['dist/inquiry/review/index.html','en'],
    ['dist/en/inquiry/review/index.html','en'],
    ['dist/zh/inquiry/review/index.html','zh'],
    ['dist/ko/inquiry/review/index.html','ko']
  ];

  for(const [relative,locale] of routes){
    if(!exists(relative)){
      continue;
    }

    const html=read(relative);

    requireMarker(relative,html,'data-review-privacy-link');
    requireMarker(relative,html,'href="/privacy/#'+locale+'"');
    requireMarker(relative,html,'id="reviewSubmitStatus"');

    const submitTag=(html.match(/<button[^>]*data-review-static-submit[^>]*>/is)||[])[0]||'';
    if(!submitTag){
      fail(relative+' Submit CTA missing.');
    }else if(/\sdisabled(?:\s|>|=)/i.test(submitTag)){
      fail(relative+' Submit is still initially disabled.');
    }
  }

  if(exists('dist/r4-review-runtime.js')){
    const runtime=read('dist/r4-review-runtime.js');
    requireMarker('dist Review runtime',runtime,'function privacyHref(state,language)');
    requireMarker('dist Review runtime',runtime,'privacy?.focus?.();');
  }

  if(!exists('dist/privacy/index.html')){
    fail('Production Privacy route is missing: dist/privacy/index.html');
  }else{
    const privacy=read('dist/privacy/index.html');
    for(const marker of [
      'data-section="zh"',
      'data-section="en"',
      'data-section="ko"'
    ]){
      requireMarker('Production Privacy document',privacy,marker);
    }
  }
}

try{
  checkSource();
  if(DIST){
    checkDist();
  }
}catch(error){
  fail(error?.stack||error?.message||String(error));
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F3-D1 REVIEW CONSENT CLOSEOUT: FAIL');
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND F3-D1 REVIEW CONSENT CLOSEOUT: PASS');
console.log('- Privacy Notice is a real EN/ZH/KO-aware target.');
console.log('- Consent is actionable: Submit explains the blocker instead of silently disabling.');
console.log('- Existing Review guards / submission reliability remain canonical owners.');
console.log('- Terms LEGAL HOLD preserved.');
console.log('');

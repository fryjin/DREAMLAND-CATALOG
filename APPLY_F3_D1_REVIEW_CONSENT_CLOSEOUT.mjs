import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();

function fail(message){
  console.error('');
  console.error('[F3-D1 APPLY] FAIL');
  console.error('- '+message);
  console.error('');
  process.exit(1);
}

function read(relative){
  const file=path.join(ROOT,relative);
  if(!fs.existsSync(file)) fail('Missing file: '+relative);
  return fs.readFileSync(file,'utf8');
}

function write(relative,content){
  const file=path.join(ROOT,relative);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content,'utf8');
  console.log('updated: '+relative);
}

function replaceOnce(content,from,to,label){
  const first=content.indexOf(from);
  if(first<0) fail('Source lock not found: '+label);
  if(content.indexOf(from,first+from.length)>=0) fail('Source lock is not unique: '+label);
  return content.slice(0,first)+to+content.slice(first+from.length);
}

function insertBeforeOnce(content,marker,addition,label){
  const first=content.indexOf(marker);
  if(first<0) fail('Insertion marker not found: '+label);
  if(content.indexOf(marker,first+marker.length)>=0) fail('Insertion marker is not unique: '+label);
  return content.slice(0,first)+addition+content.slice(first);
}

function patchReviewPage(){
  const file='src/astro/components/review/ReviewPage.astro';
  let source=read(file);

  const oldConsent=`      <label
        class="review-consent"
        data-review-static-consent
      >
        <input
          type="checkbox"
          data-review-privacy
        />
        <span>
          <span data-review-bind="privacyPrefix">
            {c.privacyPrefix||'I have read and agree to the'}
          </span>
          <span
            class="review-consent__link"
            data-review-bind="privacyLink"
          >
            {c.privacyLink||'Privacy Notice'}
          </span>
        </span>
      </label>`;

  const newConsent=`      <div
        class="review-consent"
        data-review-static-consent
      >
        <input
          id="reviewPrivacyConsent"
          type="checkbox"
          data-review-privacy
          aria-describedby="reviewSubmitStatus"
        />
        <span>
          <label
            for="reviewPrivacyConsent"
            data-review-bind="privacyPrefix"
          >
            {c.privacyPrefix||'I have read and agree to the'}
          </label>
          {' '}
          <a
            class="review-consent__link"
            href={(view.routes.privacy||'/privacy/')+'#'+(view.language||'en')}
            target="_blank"
            rel="noopener noreferrer"
            data-review-privacy-link
            data-review-bind="privacyLink"
          >
            {c.privacyLink||'Privacy Notice'}
          </a>
        </span>
      </div>`;

  source=replaceOnce(
    source,
    oldConsent,
    newConsent,
    'Review consent composition'
  );

  source=replaceOnce(
    source,
`      <button
        class="review-submit"
        type="button"
        disabled
        data-review-static-submit
        data-review-submit
      >`,
`      <button
        class="review-submit"
        type="button"
        aria-describedby="reviewSubmitStatus"
        data-review-static-submit
        data-review-submit
      >`,
    'Review Submit initial disabled state'
  );

  source=replaceOnce(
    source,
`      <p
        class="review-static-status"
        data-review-static-status`,
`      <p
        id="reviewSubmitStatus"
        class="review-static-status"
        data-review-static-status`,
    'Review submit status id'
  );

  write(file,source);
}

function patchReviewViewModel(){
  const file='src/astro/lib/review-view-model.mjs';
  let source=read(file);

  source=replaceOnce(
    source,
`      contact:
        '/inquiry/contact/',
      success:
        '/inquiry/success/'`,
`      contact:
        '/inquiry/contact/',
      privacy:
        '/privacy/',
      success:
        '/inquiry/success/'`,
    'Review static privacy route'
  );

  source=replaceOnce(
    source,
`    routes:Object.freeze({
      inquiry:
        '/inquiry/',
      contact:
        '/inquiry/contact/'
    }),`,
`    routes:Object.freeze({
      inquiry:
        '/inquiry/',
      contact:
        '/inquiry/contact/',
      privacy:
        '/privacy/'
    }),`,
    'Review runtime privacy route'
  );

  write(file,source);
}

function patchReviewRuntime(){
  const file='src/astro/runtime/review-runtime.js';
  let source=read(file);

  source=insertBeforeOnce(
    source,
`  function localeFor(language,state){`,
`  function privacyHref(state,language){
    const raw=
      text(
        state.routes
          ?.privacy
      )||
      '/privacy/';

    const base=
      raw.replace(
        /#.*$/,
        ''
      );

    return (
      base+
      '#'+
      supportedLanguage(
        language,
        state
      )
    );
  }

`,
    'privacyHref helper'
  );

  source=replaceOnce(
    source,
`  function setLanguagePresentation(
    documentRef,
    language,
    locale
  ){`,
`  function setLanguagePresentation(
    documentRef,
    language,
    locale,
    state
  ){`,
    'setLanguagePresentation signature'
  );

  source=replaceOnce(
    source,
`    renderReviewBindings(
      documentRef,
      locale
    );

    documentRef.title=`,
`    renderReviewBindings(
      documentRef,
      locale
    );

    const privacyLink=
      documentRef.querySelector(
        '[data-review-privacy-link]'
      );

    if(privacyLink){
      privacyLink.setAttribute(
        'href',
        privacyHref(
          state,
          language
        )
      );
    }

    documentRef.title=`,
    'runtime privacy target projection'
  );

  source=replaceOnce(
    source,
`      setLanguagePresentation(
        documentRef,
        language,
        currentLocale
      );`,
`      setLanguagePresentation(
        documentRef,
        language,
        currentLocale,
        state
      );`,
    'setLanguagePresentation call'
  );

  source=replaceOnce(
    source,
`        submitButton.disabled=
          submitting||
          attemptGate.active||
          !privacyAccepted;`,
`        submitButton.disabled=
          submitting||
          attemptGate.active;`,
    'Submit consent disabled blocker'
  );

  source=replaceOnce(
    source,
`      if(!privacyAccepted){
        setStatus(
          statusText('privacy'),
          'error'
        );
        syncSubmitUi();
        return false;
      }`,
`      if(!privacyAccepted){
        setStatus(
          statusText('privacy'),
          'error'
        );

        const privacy=
          documentRef.querySelector(
            '[data-review-privacy]'
          );

        privacy?.focus?.();
        syncSubmitUi();
        return false;
      }`,
    'Consent blocker feedback'
  );

  write(file,source);
}

function patchReviewCss(){
  const file='src/astro/styles/review.css';
  let source=read(file);

  source=replaceOnce(
    source,
`.review-consent input {
  margin:2px 0 0;
}

.review-consent__link {`,
`.review-consent input {
  margin:2px 0 0;
}

.review-consent label {
  cursor:pointer;
}

.review-consent__link {`,
    'Consent label cursor'
  );

  write(file,source);
}

function validatorSource(){
  return `import fs from 'node:fs';
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
  return fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\\r\\n?/g,'\\n');
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
    'href={(view.routes.privacy||\\'/privacy/\\')+\\'#\\'+(view.language||\\'en\\')}',
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
  }else if(/\\sdisabled(?:\\s|>|=)/i.test(submitTag)){
    fail('Review Submit must not be disabled only because consent is unchecked.');
  }

  if((view.match(/privacy:\\s*\\n\\s*'\\/privacy\\/'/g)||[]).length!==2){
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
    'attemptGate.active||\\n          !privacyAccepted'
  );

  if(config.privacyUrl!=='./privacy.html'){
    fail('LEGAL HOLD: source app-config privacyUrl must remain ./privacy.html.');
  }

  if(config.privacyVersion!=='2026-07-30'){
    fail('LEGAL HOLD: privacyVersion changed unexpectedly.');
  }

  if(/\\bterms\\b/i.test(
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
    }else if(/\\sdisabled(?:\\s|>|=)/i.test(submitTag)){
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
`;
}

function addValidator(){
  const file='scripts/validate-f3-d1-review-consent-closeout.mjs';
  if(fs.existsSync(path.join(ROOT,file))){
    fail(file+' already exists; refusing to overwrite an unknown validator.');
  }
  write(file,validatorSource());
}

function patchPackage(){
  const file='package.json';
  let source=read(file);

  source=replaceOnce(
    source,
`    "r4:conversion:review-composition": "node scripts/validate-f3-d2-review-conversion-composition.mjs --source",`,
`    "r4:conversion:review-consent-closeout": "node scripts/validate-f3-d1-review-consent-closeout.mjs --source",
    "r4:conversion:review-consent-closeout:dist": "node scripts/validate-f3-d1-review-consent-closeout.mjs --dist",
    "r4:conversion:review-composition": "node scripts/validate-f3-d2-review-conversion-composition.mjs --source",`,
    'package F3-D1 scripts'
  );

  source=replaceOnce(
    source,
`npm run r4:astro:review-submission && npm run r4:conversion:review-composition`,
`npm run r4:astro:review-submission && npm run r4:conversion:review-consent-closeout && npm run r4:conversion:review-composition`,
    'package validate gate order'
  );

  source=replaceOnce(
    source,
`npm run r4:conversion:contact-requirements:dist && npm run r4:conversion:review-composition:dist`,
`npm run r4:conversion:contact-requirements:dist && npm run r4:conversion:review-consent-closeout:dist && npm run r4:conversion:review-composition:dist`,
    'package build dist gate order'
  );

  write(file,source);
}

function main(){
  console.log('');
  console.log('[F3-D1 APPLY] Review Consent Closeout');
  console.log('- scope: Review consent / Privacy target / Submit blocker feedback only');
  console.log('- no Terms content or route added');
  console.log('');

  patchReviewPage();
  patchReviewViewModel();
  patchReviewRuntime();
  patchReviewCss();
  addValidator();
  patchPackage();

  console.log('');
  console.log('[F3-D1 APPLY] PASS');
  console.log('Next: npm run r4:conversion:review-consent-closeout');
  console.log('');
}

main();

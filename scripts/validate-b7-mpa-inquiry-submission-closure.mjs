#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function compact(value){
  return String(value||'')
    .replace(/\s+/g,'');
}

function execute(relative,extra={}){
  const sandbox={
    console,
    Object,
    Array,
    String,
    Number,
    Boolean,
    JSON,
    Date,
    Math,
    RegExp,
    Set,
    Map,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    ...extra
  };

  sandbox.globalThis=sandbox;

  vm.runInNewContext(
    read(relative),
    sandbox,
    {filename:relative}
  );

  return sandbox;
}

try{
  const index=read('index.html');
  const compactIndex=compact(index);

  for(const marker of [
    "window.DREAMLAND_RELEASE='b7-00b4j-r3-v129';",
    'function desktopPresentationOwnsContactDraft()',
    'contactFeature.flushDraft(contactFeature.snapshot())',
    'function submissionEmailValid(',
    'function validateSubmissionPayload(',
    "riskAssessmentState='idle'",
    "riskAssessmentState='checking'",
    "riskAssessmentState='failed'",
    "riskAssessmentState='passed'",
    "riskAssessmentState='captcha-required'",
    "document.querySelector('[data-desktop-review-privacy]')||document.getElementById('privacyConsent')"
  ]){
    if(!compactIndex.includes(compact(marker))){
      fail(
        'R3.5 index contract is missing: '+
        marker
      );
    }
  }

  const saveStart=
    index.indexOf(
      'function saveContactDraftNow(){'
    );

  const saveEnd=
    index.indexOf(
      'function scheduleContactDraftSave()',
      saveStart
    );

  const saveSource=
    saveStart>=0&&saveEnd>saveStart
      ? index.slice(saveStart,saveEnd)
      : '';

  const compactSave=
    compact(saveSource);

  if(
    !compactSave.includes(
      'if(desktopPresentationOwnsContactDraft()){contactFeature.flushDraft(contactFeature.snapshot());return;}'
    )
  ){
    fail(
      'Desktop pagehide must preserve canonical Contact snapshot instead of collecting Legacy DOM.'
    );
  }

  const reviewRouteStart=
    index.indexOf(
      "if(\n      entry.page==='review'"
    );

  const routeGateStart=
    index.indexOf(
      'const routeGate=',
      reviewRouteStart
    );

  const reviewRouteSource=
    reviewRouteStart>=0&&
    routeGateStart>reviewRouteStart
      ? index.slice(
          reviewRouteStart,
          routeGateStart
        )
      : '';

  const compactReviewRoute=
    compact(
      reviewRouteSource
    );

  for(const marker of [
    'contactFeature.loadDraft()',
    'submissionEmailValid(',
    'window.location.replace(',
    "'/inquiry/contact/'"
  ]){
    if(
      !compactReviewRoute.includes(
        compact(marker)
      )
    ){
      fail(
        'Review MPA Contact hydration contract is missing: '+
        marker
      );
    }
  }

  const payloadStart=
    index.indexOf(
      'function buildWeb3FormsPayload('
    );

  const payloadEnd=
    index.indexOf(
      'function submissionSnapshot(',
      payloadStart
    );

  const payloadSource=
    payloadStart>=0&&payloadEnd>payloadStart
      ? index.slice(payloadStart,payloadEnd)
      : '';

  for(const marker of [
    'inquiryFeature.buildProjection(',
    'submissionPayloadPolicy.build('
  ]){
    if(
      !compact(
        payloadSource
      ).includes(
        compact(
          marker
        )
      )
    ){
      fail(
        'Submission payload bridge is missing: '+
        marker
      );
    }
  }

  const payloadDomain=
    read(
      'src/domain/submission/runtime-submission-payload.js'
    );

  for(const marker of [
    'contact_name:',
    'country_or_region:',
    'email_address:',
    'phone_or_wechat:',
    'product_count:',
    'custom_count:',
    'items_summary:'
  ]){
    if(
      !compact(
        payloadDomain
      ).includes(
        compact(
          marker
        )
      )
    ){
      fail(
        'Canonical Submission Payload Domain mapping is missing: '+
        marker
      );
    }
  }

  const review=read(
    'src/ui/desktop/review/runtime-desktop-review.js'
  );

  const compactReview=
    compact(
      review
    );

  if(
    !compactReview.includes(
      compact(
        'async function onChange(event)'
      )
    )||
    !compactReview.includes(
      compact(
        'await config?.actions?.privacyChanged?.('
      )
    )||
    !compactReview.includes(
      compact(
        'catch(error)'
      )
    )||
    !review.includes(
      'Desktop Review security verification failed:'
    )
  ){
    fail(
      'Desktop Review must await privacyChanged and catch Risk/CAPTCHA failures.'
    );
  }

  const builder=read(
    'scripts/build-pages.mjs'
  );

  for(const marker of [
    'function absoluteRootRuntimeAssetPaths()',
    'function productionRootAssetPaths()',
    '...productionRootAssetPaths()'
  ]){
    if(!builder.includes(marker)){
      fail(
        'Production Builder root-runtime closure is missing: '+
        marker
      );
    }
  }

  const sw=read('sw.js');

  for(const marker of [
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    'async function cacheAvailableAssets(',
    'cacheAvailableAssets(APP_CACHE,APP_SHELL)',
    'cacheAvailableAssets(RUNTIME_CACHE,RELEASE_ASSETS)'
  ]){
    if(!compact(sw).includes(compact(marker))){
      fail(
        'Service Worker resilient install contract is missing: '+
        marker
      );
    }
  }

  if(
    sw.includes(
      'cache.addAll(\n              APP_SHELL'
    )||
    sw.includes(
      'cache.addAll(\n              RELEASE_ASSETS'
    )
  ){
    fail(
      'Service Worker must not let one optional asset reject the entire v129 install.'
    );
  }

  const riskApi=read(
    'functions/api/risk.js'
  );

  for(const marker of [
    'ASSESSMENT_TTL_SECONDS',
    'recordAssessmentDecision(',
    'assessment_recorded:',
    'hcaptcha_site_key_configured:',
    'risk_store_configured:'
  ]){
    if(!riskApi.includes(marker)){
      fail(
        'Risk server closure is missing: '+
        marker
      );
    }
  }

  const inquiryApi=read(
    'functions/api/inquiry.js'
  );

  for(const marker of [
    'readAssessmentDecision(',
    "code:'CAPTCHA_REQUIRED'",
    "code:'CAPTCHA_NOT_CONFIGURED'",
    'provider_configured:',
    'risk_store_configured:'
  ]){
    if(!inquiryApi.includes(marker)){
      fail(
        'Inquiry Gateway CAPTCHA closure is missing: '+
        marker
      );
    }
  }

  const pkg=json('package.json');

  if(
    pkg.scripts
      ?.['mpa-inquiry:closure']!==
    'node scripts/validate-b7-mpa-inquiry-submission-closure.mjs'
  ){
    fail(
      'package.json mpa-inquiry:closure script is missing.'
    );
  }

  if(
    pkg.scripts
      ?.['conversion-route:gateway']!==
    'node scripts/validate-b7-conversion-route-submission-gateway.mjs && npm run mpa-inquiry:closure'
  ){
    fail(
      'R3.5 MPA closure must run inside the existing conversion-route aggregate gate.'
    );
  }
}catch(error){
  fail(
    'R3.5 static closure inspection crashed: '+
    error.message
  );
}

try{
  /*
   * Execute the canonical Contact owner with shared storage to prove that its
   * draft itself survives a document boundary. R3.5 specifically prevents the
   * Legacy pagehide bridge from overwriting that valid envelope.
   */
  const values=new Map();

  const storage={
    getItem(key){
      return values.has(String(key))
        ? values.get(String(key))
        : null;
    },
    setItem(key,value){
      values.set(
        String(key),
        String(value)
      );
    },
    removeItem(key){
      values.delete(
        String(key)
      );
    }
  };

  const first=execute(
    'src/features/contact/runtime-contact.js'
  );

  first.DreamlandContact.configure({
    storage,
    storageKey:'dreamlandContactDraftV1'
  });

  first.DreamlandContact.replace({
    name:'Ada Test',
    country:'SG',
    email:'ada@example.com',
    phone:'12345678'
  });

  first.DreamlandContact.flushDraft();

  const second=execute(
    'src/features/contact/runtime-contact.js'
  );

  second.DreamlandContact.configure({
    storage,
    storageKey:'dreamlandContactDraftV1'
  });

  const restored=
    second.DreamlandContact.loadDraft();

  const validation=
    second.DreamlandContact.validate(
      restored,
      {emailValid:true}
    );

  if(
    restored.name!=='Ada Test'||
    restored.country!=='SG'||
    restored.email!=='ada@example.com'||
    restored.phone!=='12345678'||
    validation.valid!==true
  ){
    fail(
      'Canonical Contact draft does not survive a simulated MPA document boundary.'
    );
  }
}catch(error){
  fail(
    'Contact MPA draft execution failed: '+
    error.message
  );
}

try{
  /*
   * Execute DreamlandRisk twice against one storage adapter. The second
   * document must restore the first document's form start and interaction
   * count rather than resetting the customer to an artificial "zero history"
   * state.
   */
  const values=new Map();

  const storage={
    getItem(key){
      return values.has(String(key))
        ? values.get(String(key))
        : null;
    },
    setItem(key,value){
      values.set(
        String(key),
        String(value)
      );
    },
    removeItem(key){
      values.delete(
        String(key)
      );
    }
  };

  const fakeFetch=async ()=>({
    ok:true,
    status:200,
    async json(){
      return {
        success:true,
        captcha_required:false,
        risk_score:0,
        reasons:[]
      };
    }
  });

  const first=execute(
    'src/services/risk/runtime-risk.js',
    {fetch:fakeFetch}
  );

  first.DreamlandRisk.configure({
    endpoint:'/api/risk',
    storage,
    fetchImpl:fakeFetch
  });

  first.DreamlandRisk.markFormStart();

  first.DreamlandRisk.recordInteraction({
    isTrusted:true
  });

  const firstSnapshot=
    first.DreamlandRisk.snapshot();

  const second=execute(
    'src/services/risk/runtime-risk.js',
    {fetch:fakeFetch}
  );

  second.DreamlandRisk.configure({
    endpoint:'/api/risk',
    storage,
    fetchImpl:fakeFetch
  });

  const secondSnapshot=
    second.DreamlandRisk.snapshot();

  if(
    !firstSnapshot.formStartedAt||
    secondSnapshot.formStartedAt!==
      firstSnapshot.formStartedAt||
    secondSnapshot.interactionCount<1
  ){
    fail(
      'Risk context does not survive a simulated MPA document boundary.'
    );
  }
}catch(error){
  fail(
    'Risk MPA context execution failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R3.5 MPA Inquiry Submission Closure: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R3.5 MPA Inquiry Submission Closure: PASS'
);
console.log(
  'Desktop Contact draft ownership / Review hydration / payload parity / cross-document Risk context / native async Risk / server CAPTCHA decision / resilient SW install verified.'
);
console.log('');

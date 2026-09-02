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
  return JSON.parse(read(relative));
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
  const guardBox=execute(
    'src/site/runtime/runtime-page-guards.js'
  );

  const guards=guardBox.DreamlandPageGuards;

  if(
    !guards||
    guards.version!=='B7-00B.4J-R3'||
    typeof guards.evaluate!=='function'
  ){
    fail('DreamlandPageGuards R3 runtime is missing.');
  }else{
    const route={
      inquiry:()=>'/inquiry/',
      contact:()=>'/inquiry/contact/'
    };

    const emptyInquiry={
      items:()=>[]
    };

    const filledInquiry={
      items:()=>[
        {id:'line-1'}
      ]
    };

    const invalidContact={
      snapshot:()=>({}),
      validate:()=>({valid:false})
    };

    const validContact={
      snapshot:()=>({
        name:'Ada'
      }),
      validate:()=>({valid:true})
    };

    const contactGate=guards.evaluate(
      'contact',
      {
        inquiry:emptyInquiry,
        route
      }
    );

    if(
      contactGate.allowed!==false||
      contactGate.target!=='/inquiry/'||
      contactGate.code!=='INQUIRY_REQUIRED'
    ){
      fail('Contact direct-route guard failed.');
    }

    const reviewEmpty=guards.evaluate(
      'review',
      {
        inquiry:emptyInquiry,
        contact:validContact,
        route
      }
    );

    if(
      reviewEmpty.allowed!==false||
      reviewEmpty.target!=='/inquiry/'
    ){
      fail('Review empty-Inquiry guard failed.');
    }

    const reviewContact=guards.evaluate(
      'review',
      {
        inquiry:filledInquiry,
        contact:invalidContact,
        route
      }
    );

    if(
      reviewContact.allowed!==false||
      reviewContact.target!=='/inquiry/contact/'||
      reviewContact.code!=='CONTACT_REQUIRED'
    ){
      fail('Review Contact guard failed.');
    }

    if(
      guards.evaluate(
        'review',
        {
          inquiry:filledInquiry,
          contact:validContact,
          route
        }
      ).allowed!==true
    ){
      fail('Valid Review route was incorrectly blocked.');
    }

    if(
      guards.evaluate(
        'success',
        {
          lastSubmission:{},
          route
        }
      ).allowed!==false
    ){
      fail('Success route must reject missing lastSubmission.');
    }

    if(
      guards.evaluate(
        'success',
        {
          lastSubmission:{
            inquiryId:'INQ-12345678'
          },
          route
        }
      ).allowed!==true
    ){
      fail('Success route rejected a valid submission record.');
    }
  }

  const index=read('index.html');
  const compact=index.replace(/\s+/g,'');

  for(const marker of [
    "window.DREAMLAND_RELEASE='b7-00b4j-r3-v129';",
    'runtime-page-guards.js?release=b7-00b4j-r3-v129',
    'const pageGuards=window.DreamlandPageGuards',
    'pageGuards',
    'evaluate?.(',
    'appConfig.inquiryEndpoint',
    'appConfig.riskEndpoint',
    'appConfig.inquiryClientConfigEndpoint',
    "appConfig.submissionTransport||'gateway'"
  ]){
    if(!compact.includes(marker.replace(/\s+/g,''))){
      fail(`index.html is missing R3 integration: ${marker}`);
    }
  }

  const config=json('data/app-config.json');

  if(
    Number(config.schemaVersion)!==2||
    config.inquiryEndpoint!=='/api/inquiry'||
    config.riskEndpoint!=='/api/risk'||
    config.submissionEndpoint!=='/api/risk'||
    config.submissionTransport!=='web3forms-direct'||
    config.inquiryClientConfigEndpoint!==
      '/api/inquiry?client_config=1'
  ){
    fail('R3 app-config endpoint contract is incorrect.');
  }

  if(
    Object.prototype.hasOwnProperty.call(
      config,
      'web3formsAccessKey'
    )||
    Object.prototype.hasOwnProperty.call(
      config,
      'web3formsSubmitUrl'
    )
  ){
    fail('R3 public app-config still exposes provider configuration.');
  }

  const submission=read(
    'src/services/submission/runtime-submission.js'
  );

  for(const marker of [
    "const VERSION='B4-03';",
    "const DEFAULT_SUBMIT_URL='/api/inquiry';",
    "const DEFAULT_TRANSPORT='gateway';",
    'accessKeyEndpoint',
    'resolveDirectProviderConfig',
    "'web3forms-direct'",
    'DIRECT_CONFIG_FAILED',
    'function buildGatewayBody(',
    'async function submitGateway('
  ]){
    if(!submission.includes(marker)){
      fail(`Submission B4-03 is missing: ${marker}`);
    }
  }

  // R3.3a — Desktop submission semantic bridge validation.
  //
  // The R3.3 APPLY post-check incorrectly compared literal "\\n" source
  // formatting, and its validator also expected the bridge comment inside
  // the desktopSubmitInquiry() slice even though the comment lives above it.
  //
  // Validate behavior independent of whitespace/source formatting instead.
  if(
    !index.includes(
      'Desktop Review owns its native submission bridge'
    )
  ){
    fail(
      'R3.3 Desktop native submission bridge ownership marker is missing.'
    );
  }

  const desktopSubmitStart=
    index.indexOf(
      'async function desktopSubmitInquiry('
    );

  const desktopSubmitEnd=
    index.indexOf(
      'function desktopLastSubmission()',
      desktopSubmitStart
    );

  const desktopSubmitSource=
    desktopSubmitStart>=0&&
    desktopSubmitEnd>desktopSubmitStart
      ? index.slice(
          desktopSubmitStart,
          desktopSubmitEnd
        )
      : '';

  const compactDesktopSubmit=
    desktopSubmitSource.replace(
      /\s+/g,
      ''
    );

  for(const marker of [
    'submissionFlow.preflight()',
    'awaitsubmissionFlow.submit({',
    'buildWeb3FormsPayload(',
    'submissionSnapshot(',
    "go('success')"
  ]){
    if(
      !compactDesktopSubmit.includes(
        marker
      )
    ){
      fail(
        'R3.3 Desktop native submission bridge is missing: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'awaitsubmitInquiry();',
    "getElementById('submitBtn')",
    "getElementById('privacyConsent')"
  ]){
    if(
      compactDesktopSubmit.includes(
        forbidden
      )
    ){
      fail(
        'R3.3 Desktop submission still depends on Legacy Preview DOM: '+
        forbidden
      );
    }
  }

  // R3.4 — Native Desktop Risk / CAPTCHA ownership.
  const reviewRuntime=read(
    'src/ui/desktop/review/runtime-desktop-review.js'
  );

  for(const marker of [
    'data-desktop-review-risk-status',
    'data-desktop-review-captcha-section',
    'data-desktop-review-captcha',
    'The native Desktop Review must always own the Risk/CAPTCHA mount.'
  ]){
    if(!reviewRuntime.includes(marker)){
      fail(
        'R3.4 Desktop Review native Risk/CAPTCHA mount is missing: '+
        marker
      );
    }
  }

  for(const marker of [
    "document.querySelector(\n      '[data-desktop-review-risk-status]'",
    "document.querySelector(\n      '[data-desktop-review-captcha-section]'",
    "document.querySelector(\n      '[data-desktop-review-captcha]'"
  ]){
    if(!index.includes(marker)){
      fail(
        'R3.4 Desktop-first Risk UI bridge is missing: '+
        marker
      );
    }
  }

  const reviewCss=read(
    'src/ui/desktop/styles/review.css'
  );

  if(
    !reviewCss.includes(
      'B7-00B.4J R3.4 — native Desktop Risk / hCaptcha'
    )
  ){
    fail(
      'R3.4 Desktop Review CAPTCHA presentation CSS is missing.'
    );
  }

  const flow=read(
    'src/app/runtime-inquiry-submission-flow.js'
  );

  for(const marker of [
    'Connectivity probe is advisory',
    'let advisoryReachable=true;',
    'Successful submission delivery is definitive proof',
    'error?.status'
  ]){
    if(!flow.includes(marker)){
      fail(
        'R3.2 Submission reachability contract is missing: '+
        marker
      );
    }
  }

  const risk=read(
    'src/services/risk/runtime-risk.js'
  );

  if(
    !risk.includes("'/api/risk'")||
    !risk.includes("version:'B4-02'")
  ){
    fail('Risk B4-02 did not converge on /api/risk.');
  }

  const riskApi=read('functions/api/risk.js');
  const inquiryApi=read('functions/api/inquiry.js');

  for(const marker of [
    "service:'dreamland-risk-assessment'",
    'env.RISK_STORE',
    'captcha_required'
  ]){
    if(!riskApi.includes(marker)){
      fail(`Risk API is missing: ${marker}`);
    }
  }

  for(const marker of [
    "service:'dreamland-inquiry-gateway'",
    "service:'dreamland-inquiry-client-config'",
    "transport:'web3forms-direct'",
    'access_key:accessKey',
    'submit_url:providerUrl',
    'env.WEB3FORMS_ACCESS_KEY',
    'function validatePayload(',
    'function assertSameOrigin(',
    'function enforceSubmissionRate(',
    "response_type:'web3forms-gateway'"
  ]){
    if(!inquiryApi.includes(marker)){
      fail(`Inquiry Gateway is missing: ${marker}`);
    }
  }

  const build=read('scripts/build-pages.mjs');

  if(
    !build.includes(
      "const RELEASE='b7-00b4j-r3-v129';"
    )||
    !build.includes(
      "const PWA='dreamland-pwa-v129';"
    )
  ){
    fail('Production Builder release convergence failed.');
  }

  const sw=read('sw.js');

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v129';"
    )
  ){
    fail('PWA cache did not converge on v125.');
  }

  const packageJson=json('package.json');

  if(
    packageJson.scripts
      ?.['conversion-route:gateway']!==
    'node scripts/validate-b7-conversion-route-submission-gateway.mjs && npm run mpa-inquiry:closure'
  ){
    fail('package.json conversion-route:gateway script is missing.');
  }

  const validate=String(
    packageJson.scripts?.validate||''
  );

  if(
    !validate.includes(
      'npm run public-route:migration && npm run conversion-route:gateway && npm run desktop:home'
    )
  ){
    fail('R3 validator is not in the expected validation position.');
  }

  const desktopCatalogGate=
    'npm run desktop:catalog';

  const desktopCatalogIndex=
    validate.lastIndexOf(
      desktopCatalogGate
    );

  if(desktopCatalogIndex<0){
    fail(
      'desktop:catalog aggregate gate is missing.'
    );
  }else{
    const afterDesktopCatalog=
      validate.slice(
        desktopCatalogIndex+
        desktopCatalogGate.length
      );

    if(
      /npm run desktop:[a-z0-9:-]+/i
        .test(
          afterDesktopCatalog
        )
    ){
      fail(
        'desktop:catalog must remain the final Desktop aggregate gate.'
      );
    }
  }
}catch(error){
  fail(
    'R3 conversion/gateway validation crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R3 Conversion Route + Submission Gateway: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R3 Conversion Route + Submission Gateway: PASS'
);
console.log(
  'Custom / Inquiry route guards / DREAMLAND /api/risk / browser-direct Web3Forms transport / dormant /api/inquiry gateway fallback / release v129 verified.'
);
console.log('');

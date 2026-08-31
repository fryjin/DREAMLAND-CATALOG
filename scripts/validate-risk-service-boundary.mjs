#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
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

try{
  const runtimePath=path.join(
    ROOT,
    'src/services/risk/runtime-risk.js'
  );

  delete globalThis.DreamlandRisk;
  delete globalThis.hcaptcha;

  await import(
    `${pathToFileURL(runtimePath).href}?b402-r3=${Date.now()}`
  );

  const service=globalThis.DreamlandRisk;

  if(!service||service.version!=='B4-02'){
    fail('DreamlandRisk B4-02 runtime was not exposed.');
  }else{
    for(const method of [
      'configure',
      'snapshot',
      'ready',
      'markFormStart',
      'recordInteraction',
      'bindInteractionTracking',
      'unbindInteractionTracking',
      'recentAttempts',
      'recordAttempt',
      'buildContext',
      'assess',
      'preloadCaptcha',
      'renderCaptcha',
      'captchaToken',
      'ensureCaptcha',
      'resetCaptcha'
    ]){
      if(typeof service[method]!=='function'){
        fail(`DreamlandRisk.${method} is missing.`);
      }
    }

    const memory=new Map();
    const storage={
      getItem(key){
        return memory.get(key)||null;
      },
      setItem(key,value){
        memory.set(key,String(value));
      }
    };

    const requests=[];

    service.configure({
      endpoint:'https://example.test/api/risk',
      storage,
      fetchImpl:async (url,options)=>{
        requests.push({url,options});
        return {
          ok:true,
          status:200,
          async json(){
            return {
              success:true,
              captcha_required:false,
              risk_score:1,
              reasons:['fixture'],
              site_key:'',
              risk_store_read:true,
              risk_recorded:true
            };
          }
        };
      },
      hcaptcha:{
        enabled:true,
        loadTimeoutMs:12000
      }
    });

    const result=await service.assess(
      {inquiry_id:'INQ-12345678'},
      {
        language:'en',
        viewport:'390x844',
        website:''
      }
    );

    const requestBody=JSON.parse(
      requests[0]?.options?.body||'{}'
    );

    if(
      requests[0]?.url!=='https://example.test/api/risk'||
      requestBody.action!=='assess'||
      requestBody.payload?.inquiry_id!=='INQ-12345678'||
      result.riskScore!==1
    ){
      fail('Risk assessment /api/risk transport contract failed.');
    }
  }
}catch(error){
  fail(`Risk runtime execution failed: ${error.message}`);
}

try{
  const runtime=read('src/services/risk/runtime-risk.js');

  if(
    !/const\s+DEFAULT_ENDPOINT\s*=\s*['"]\/api\/risk['"]\s*;/
      .test(runtime)
  ){
    fail('Risk runtime default endpoint must be /api/risk.');
  }

  const index=read('index.html').replace(/\s+/g,'');

  for(const marker of [
    'appConfig.riskEndpoint',
    "riskService.configure({",
    'riskService.assess('
  ]){
    if(!index.includes(marker.replace(/\s+/g,''))){
      fail(`index.html is missing Risk R3 integration: ${marker}`);
    }
  }

  const config=JSON.parse(
    read('data/app-config.json')
  );

  if(
    config.riskEndpoint!=='/api/risk'||
    config.submissionEndpoint!=='/api/risk'
  ){
    fail('app-config Risk endpoints must converge on /api/risk.');
  }

  const server=read('functions/api/risk.js');

  for(const marker of [
    "body.action!=='assess'",
    'function validatePayload(',
    'function evaluateRisk(',
    'async function readPersistentRisk(',
    'async function recordPersistentRisk(',
    'env.RISK_STORE',
    'captcha_required'
  ]){
    if(!server.replace(/\s+/g,'').includes(marker.replace(/\s+/g,''))){
      fail(`functions/api/risk.js is missing: ${marker}`);
    }
  }

  if(!fs.existsSync(path.join(ROOT,'functions/api/submit.js'))){
    fail('Legacy /api/submit compatibility function must remain until R4.');
  }
}catch(error){
  fail(`Risk R3 boundary inspection failed: ${error.message}`);
}

if(errors.length){
  console.error('\nRisk service boundary validation failed:\n');
  for(const error of errors){
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  'Risk service boundary validation: PASS / /api/risk primary + legacy /api/submit compatibility.'
);

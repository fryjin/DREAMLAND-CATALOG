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
    'src/services/submission/runtime-submission.js'
  );

  delete globalThis.DreamlandSubmission;

  await import(
    `${pathToFileURL(runtimePath).href}?b403=${Date.now()}`
  );

  const service=globalThis.DreamlandSubmission;

  if(!service||service.version!=='B4-03'){
    fail('DreamlandSubmission B4-03 runtime was not exposed.');
  }else{
    for(const method of [
      'configure',
      'snapshot',
      'ready',
      'buildFormData',
      'buildGatewayBody',
      'submit'
    ]){
      if(typeof service[method]!=='function'){
        fail(`DreamlandSubmission.${method} is missing.`);
      }
    }

    const requests=[];

    service.configure({
      submitUrl:'https://example.test/api/inquiry',
      transport:'gateway',
      fetchImpl:async (url,options)=>{
        requests.push({url,options});
        return {
          ok:true,
          status:200,
          async json(){
            return {
              success:true,
              response_type:'web3forms-gateway'
            };
          }
        };
      }
    });

    if(!service.ready()){
      fail('Gateway-configured Submission service must be ready.');
    }

    const result=await service.submit(
      {inquiry_id:'INQ-12345678'},
      {captchaToken:'captcha-token'}
    );

    const body=JSON.parse(
      requests[0]?.options?.body||'{}'
    );

    if(
      result.responseType!=='web3forms-gateway'||
      requests[0]?.url!=='https://example.test/api/inquiry'||
      requests[0]?.options?.headers?.['Content-Type']!=='application/json'||
      body.payload?.inquiry_id!=='INQ-12345678'||
      body.captcha_token!=='captcha-token'
    ){
      fail('Submission Gateway transport contract failed.');
    }

    service.configure({
      submitUrl:'https://example.test/provider',
      accessKey:'fixture-key',
      transport:'web3forms-direct',
      fetchImpl:async ()=>({
        ok:true,
        status:200,
        async json(){
          return {success:true};
        }
      })
    });

    const form=service.buildFormData(
      {inquiry_id:'INQ-12345678'},
      {captchaToken:'captcha-token'}
    );

    if(
      form.get('access_key')!=='fixture-key'||
      form.get('h-captcha-response')!=='captcha-token'
    ){
      fail('Legacy direct-transport adapter compatibility failed.');
    }
  }
}catch(error){
  fail(`Submission runtime execution failed: ${error.message}`);
}

try{
  const index=read('index.html');

  for(const marker of [
    './src/services/submission/runtime-submission.js',
    'const submissionService=window.DreamlandSubmission',
    'submissionService.configure(',
    'appConfig.inquiryEndpoint',
    "transport:'gateway'"
  ]){
    if(!index.replace(/\s+/g,'').includes(marker.replace(/\s+/g,''))){
      fail(`index.html is missing Submission Gateway integration: ${marker}`);
    }
  }

  for(const forbidden of [
    'appConfig.web3formsSubmitUrl',
    'appConfig.web3formsAccessKey'
  ]){
    if(index.includes(forbidden)){
      fail(`index.html still exposes provider configuration: ${forbidden}`);
    }
  }
}catch(error){
  fail(`index.html Submission inspection failed: ${error.message}`);
}

try{
  const config=JSON.parse(
    read('data/app-config.json')
  );

  if(config.inquiryEndpoint!=='/api/inquiry'){
    fail('app-config inquiryEndpoint must be /api/inquiry.');
  }

  if(
    Object.prototype.hasOwnProperty.call(config,'web3formsAccessKey')||
    Object.prototype.hasOwnProperty.call(config,'web3formsSubmitUrl')
  ){
    fail('Provider configuration must not remain in public app-config.');
  }
}catch(error){
  fail(`app-config Submission inspection failed: ${error.message}`);
}

try{
  const gateway=read('functions/api/inquiry.js');

  for(const marker of [
    'env.WEB3FORMS_ACCESS_KEY',
    'env.WEB3FORMS_SUBMIT_URL',
    'function validatePayload(',
    'function assertSameOrigin(',
    'function enforceSubmissionRate(',
    "response_type:'web3forms-gateway'"
  ]){
    if(!gateway.includes(marker)){
      fail(`Inquiry Gateway is missing: ${marker}`);
    }
  }

  if(gateway.includes('e364fde5-')){
    fail('Inquiry Gateway must not embed the historical provider access key.');
  }
}catch(error){
  fail(`Inquiry Gateway inspection failed: ${error.message}`);
}

if(errors.length){
  console.error('\nSubmission service boundary validation failed:\n');
  for(const error of errors){
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  'Submission service boundary validation: PASS / DREAMLAND Gateway + server-owned provider credentials.'
);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relativePath){
  return fs.readFileSync(
    path.join(ROOT,relativePath),
    'utf8'
  );
}

const runtimePath=
  path.join(
    ROOT,
    'src/services/submission/runtime-submission.js'
  );

if(!fs.existsSync(runtimePath)){
  fail('Submission runtime service is missing.');
}else{
  try{
    delete globalThis.DreamlandSubmission;

    await import(
      `${pathToFileURL(runtimePath).href}?submission-validation=${Date.now()}`
    );

    const service=
      globalThis.DreamlandSubmission;

    if(!service){
      fail('runtime-submission.js did not expose DreamlandSubmission.');
    }else{
      if(service.version!=='B4-01'){
        fail(`Unexpected Submission service version: ${service.version}`);
      }

      for(const method of [
        'configure',
        'snapshot',
        'ready',
        'buildFormData',
        'submit'
      ]){
        if(typeof service[method]!=='function'){
          fail(`DreamlandSubmission.${method} is missing.`);
        }
      }

      const requests=[];
      const fakeFetch=async (url,options)=>{
        requests.push({url,options});
        return {
          ok:true,
          status:200,
          async json(){
            return {success:true,message:'ok'};
          }
        };
      };

      service.configure({
        submitUrl:'https://example.test/submit',
        accessKey:'test-key',
        fetchImpl:fakeFetch
      });

      if(service.ready()!==true){
        fail('Configured Submission service must report ready().');
      }

      const formData=service.buildFormData(
        {
          inquiry_id:'INQ-12345678',
          contact_name:'Test User'
        },
        {
          captchaToken:'captcha-token'
        }
      );

      if(formData.get('inquiry_id')!=='INQ-12345678'){
        fail('Submission FormData lost payload fields.');
      }

      if(formData.get('h-captcha-response')!=='captcha-token'){
        fail('Submission FormData lost explicit captcha token.');
      }

      if(formData.get('access_key')!=='test-key'){
        fail('Submission FormData lost configured access key.');
      }

      const result=await service.submit(
        {
          inquiry_id:'INQ-12345678'
        },
        {
          captchaToken:'captcha-token'
        }
      );

      if(
        result.success!==true||
        result.responseType!=='web3forms-direct'||
        result.status!==200||
        requests.length!==1||
        requests[0].url!=='https://example.test/submit'
      ){
        fail('Submission transport/result normalization parity failed.');
      }

      service.configure({
        submitUrl:'https://example.test/submit',
        accessKey:'test-key',
        fetchImpl:async ()=>({
          ok:false,
          status:400,
          async json(){
            return {success:false,message:'bad request'};
          }
        })
      });

      let failure=null;
      try{
        await service.submit({inquiry_id:'INQ-12345678'});
      }catch(error){
        failure=error;
      }

      if(
        failure?.name!=='SubmissionError'||
        failure?.code!=='SUBMISSION_FAILED'||
        failure?.status!==400
      ){
        fail('Submission failure normalization parity failed.');
      }
    }
  }catch(error){
    fail(`Submission runtime execution failed: ${error.message}`);
  }
}

try{
  const indexSource=read('index.html');

  for(const marker of [
    './src/services/submission/runtime-submission.js',
    'const submissionService=window.DreamlandSubmission',
    'submissionService.configure(',
    'submissionService.ready()',
    'submissionService.submit('
  ]){
    if(!indexSource.includes(marker)){
      fail(`index.html is missing Submission boundary integration: ${marker}`);
    }
  }

  for(const legacy of [
    'function web3formsSubmitUrl(',
    'function web3formsAccessKey(',
    'function web3formsReady(',
    'function buildWeb3FormsFormData('
  ]){
    if(indexSource.includes(legacy)){
      fail(`index.html still owns Submission transport helper: ${legacy}`);
    }
  }

  if(
    /fetch\s*\(\s*web3formsSubmitUrl\s*\(/.test(indexSource)||
    indexSource.includes("'access_key',\n  web3formsAccessKey()")
  ){
    fail('index.html still performs direct Web3Forms transport.');
  }

  for(const preserved of [
    'function buildWeb3FormsPayload(',
    'function submissionSnapshot(',
    'function archiveSubmission(',
    'function clearSubmittedInquiry('
  ]){
    if(!indexSource.includes(preserved)){
      fail(`B4-01 must preserve legacy ownership outside Submission transport: ${preserved}`);
    }
  }

  if(
    !/submissionService\.submit\s*\([\s\S]{0,260}captchaToken\s*:\s*hcaptchaToken\s*\(\s*\)/.test(indexSource)
  ){
    fail('submitInquiry must pass the Risk-owned captcha token explicitly into DreamlandSubmission.');
  }
}catch(error){
  fail(`index.html Submission boundary inspection failed: ${error.message}`);
}

try{
  const configSource=read('data/app-config.json');
  const config=JSON.parse(configSource);

  if(!config.web3formsSubmitUrl||!config.web3formsAccessKey){
    fail('B4-01 must preserve existing Web3Forms configuration fields.');
  }

  if(config.submissionEndpoint!=='./api/submit'){
    fail('B4-01 must not change the current risk-assessment endpoint configuration.');
  }
}catch(error){
  fail(`app-config Submission boundary inspection failed: ${error.message}`);
}

try{
  const riskSource=read('functions/api/submit.js');

  for(const marker of [
    "body.action !== 'assess'",
    'function evaluateRisk(',
    'captcha_required'
  ]){
    if(!riskSource.includes(marker)){
      fail(`B4-01 must preserve server Risk boundary: ${marker}`);
    }
  }
}catch(error){
  fail(`functions/api/submit.js Risk boundary inspection failed: ${error.message}`);
}

try{
  const contractsSource=read('src/services/contracts.js');
  const legacyMapSource=read('src/app/legacy-map.js');

  if(
    !contractsSource.includes(
      "'src/services/submission/runtime-submission.js'"
    )
  ){
    fail('Service contracts do not declare Submission runtime owner.');
  }

}catch(error){
  fail(`Architecture Submission boundary inspection failed: ${error.message}`);
}

try{
  const previousValidator=
    read('scripts/validate-inquiry-media-hook-cleanup.mjs');

  if(previousValidator.includes('dreamland-pwa-v69')){
    fail('Historical B3-03 validator still owns a fixed SW cache version.');
  }

  const swSource=read('sw.js');

  const matches=
    swSource.match(
      /'\.\/src\/services\/submission\/runtime-submission\.js'/g
    )||[];

  if(matches.length!==1){
    fail(
      `sw.js APP_SHELL must include runtime-submission.js exactly once; found ${matches.length}.`
    );
  }
}catch(error){
  fail(`SW/historical validator Submission inspection failed: ${error.message}`);
}

if(errors.length){
  console.error('\nSubmission service boundary validation failed:\n');
  for(const error of errors){
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Submission service boundary validation: PASS');

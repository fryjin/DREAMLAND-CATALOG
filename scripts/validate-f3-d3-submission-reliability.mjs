#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE=process.argv.includes('--source');
const DIST=process.argv.includes('--dist');
if(SOURCE===DIST){ console.error('Usage: node scripts/validate-f3-d3-submission-reliability.mjs --source|--dist'); process.exit(1); }

const errors=[];
const fail=m=>errors.push(m);
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8').replace(/\r\n?/g,'\n');
const json=r=>JSON.parse(read(r));
const exists=r=>fs.existsSync(path.join(ROOT,r));
const hash=r=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,r))).digest('hex');
const requireMarkers=(label,source,markers)=>markers.forEach(marker=>{if(!source.includes(marker)) fail(label+' is missing: '+marker);});
function order(label,source,markers){let cursor=-1;for(const marker of markers){const index=source.indexOf(marker);if(index<0||index<=cursor){fail(label+' order is invalid around: '+marker);return;}cursor=index;}}

if(SOURCE){
  try{
    const config=json('data/app-config.json');
    const expected={submissionRiskTimeoutMs:12000,submissionRequestTimeoutMs:20000,submissionAttemptTtlMs:45000,submissionUnknownRetryDelayMs:15000,submissionAttemptKey:'dreamlandSubmissionAttemptV1'};
    for(const [key,value] of Object.entries(expected)){if(config[key]!==value) fail('app-config D3 contract changed: '+key);}
    if(config.submissionTransport!=='web3forms-direct') fail('D3 must preserve Browser Direct transport.');
  }catch(error){fail('D3 app-config inspection failed: '+error.message);}

  try{
    const view=read('src/astro/lib/review-view-model.mjs');
    requireMarkers('D3 Review view-model',view,['submissionAttemptKey','submissionRiskTimeoutMs','submissionRequestTimeoutMs','submissionAttemptTtlMs','submissionUnknownRetryDelayMs']);
  }catch(error){fail('D3 Review view-model inspection failed: '+error.message);}

  try{
    const flow=read('src/app/runtime-inquiry-submission-flow.js');

    requireMarkers(
      'D3 Submission Flow',
      flow,
      [
        'function attemptState(',
        'function acquireAttempt(',
        "'UNKNOWN_PENDING'",
        "'SUBMISSION_TIMEOUT'",
        "attemptKey:''",
        'config.attemptKey',
        "state:'submitting'",
        "'unknown'",
        "'cooldown'",
        'persistAttemptOutcome(',
        'submissionTimeoutMs',
        'unknownRetryDelayMs',
        'attemptTtlMs'
      ]
    );

    if(
      !/attemptKey:\s*text\(\s*attemptKey\s*\)/m.test(
        flow
      )
    ){
      fail(
        'Submission Flow must normalize configured attemptKey through text(attemptKey).'
      );
    }
  }catch(error){
    fail(
      'D3 Submission Flow inspection failed: '+
      error.message
    );
  }

  try{
    const runtime=read('src/astro/runtime/review-runtime.js');
    requireMarkers('D3 Review runtime',runtime,[
      'function runWithTimeout(',
      "'RISK_TIMEOUT'",
      'function classifySubmissionError(',
      "'UNKNOWN_PENDING'",
      "'SUBMISSION_TIMEOUT'",
      "'COOLDOWN'",
      "'DUPLICATE'",
      'function refreshAttemptGate(',
      'submissionFlow.attemptState(',
      'attemptKey:',
      'submissionTimeoutMs:',
      'state.submission',
      '.riskTimeoutMs',
      'unknownRetryDelayMs:'
    ]);
    requireMarkers('D2 protection',runtime,['function conciseProductPreview(','data-review-total-quantity']);
  }catch(error){fail('D3 Review runtime inspection failed: '+error.message);}

  try{
    const service=read('src/services/submission/runtime-submission.js');
    requireMarkers('Submission service signal contract',service,["async function submitDirect(payload,{captchaToken='',signal}={})",'...(signal?{signal}:{})',"'web3forms-direct'"]);
  }catch(error){fail('D3 Submission service signal contract failed: '+error.message);}

  try{
    const pkg=json('package.json');
    if(pkg.scripts?.['r4:conversion:submission-reliability']!=='node scripts/validate-f3-d3-submission-reliability.mjs --source') fail('package.json missing source D3 gate.');
    if(pkg.scripts?.['r4:conversion:submission-reliability:dist']!=='node scripts/validate-f3-d3-submission-reliability.mjs --dist') fail('package.json missing dist D3 gate.');
    order('D3 source topology',String(pkg.scripts?.validate||''),['npm run r4:astro:review-submission','npm run r4:conversion:review-composition','npm run r4:conversion:submission-reliability','npm run r4:astro:success']);
    order('D3 dist topology',String(pkg.scripts?.build||''),['npm run r4:conversion:review-composition:dist','npm run r4:conversion:submission-reliability:dist']);
  }catch(error){fail('D3 package topology failed: '+error.message);}

  try{
    delete globalThis.DreamlandInquirySubmissionFlow;
    await import(pathToFileURL(path.join(ROOT,'src/app/runtime-inquiry-submission-flow.js')).href+'?f3-d3='+Date.now());
    const flow=globalThis.DreamlandInquirySubmissionFlow;
    class Storage{constructor(){this.map=new Map();}getItem(k){return this.map.has(k)?this.map.get(k):null;}setItem(k,v){this.map.set(k,String(v));}removeItem(k){this.map.delete(k);}}
    const deps=(storage,submit)=>({submission:{ready:()=>true,submit},risk:{recordAttempt(){}},pwa:{async probeReachability(){return true;},applyReachability(){}},inquiry:{clearItems(){},persist(){}},contact:{clearAll(){}},storage});

    const successStorage=new Storage();
    flow.configure({...deps(successStorage,async()=>({responseType:'test'})),attemptKey:'dreamlandSubmissionAttemptV1',attemptTtlMs:45000,unknownRetryDelayMs:15000,submissionTimeoutMs:20000,cooldownMs:10000});
    const success=await flow.submit({inquiryId:'DL-TEST-SUCCESS',payload:{name:'Buyer'},submissionSnapshot:{inquiryId:'DL-TEST-SUCCESS'}});
    if(!success.success||flow.attemptState('DL-TEST-SUCCESS').active) fail('Successful submission must clear persistent attempt lease.');

    const timeoutStorage=new Storage();
    const timeoutSubmit=async(_payload,{signal}={})=>new Promise((_resolve,reject)=>signal?.addEventListener?.('abort',()=>{const e=new Error('aborted');e.name='AbortError';reject(e);},{once:true}));
    flow.configure({...deps(timeoutStorage,timeoutSubmit),attemptKey:'dreamlandSubmissionAttemptV1',attemptTtlMs:1000,unknownRetryDelayMs:200,submissionTimeoutMs:20,cooldownMs:50});
    let thrown=null;try{await flow.submit({inquiryId:'DL-TEST-TIMEOUT',payload:{name:'Buyer'},submissionSnapshot:{inquiryId:'DL-TEST-TIMEOUT'}});}catch(error){thrown=error;}
    const state=flow.attemptState('DL-TEST-TIMEOUT');
    if(thrown?.code!=='SUBMISSION_TIMEOUT'||state.code!=='UNKNOWN_PENDING'||!state.active) fail('Provider timeout must enter UNKNOWN_PENDING.');

    const cooldownStorage=new Storage();
    const providerFailure=async()=>{
      const error=new Error('provider rejected');
      error.code='SUBMISSION_FAILED';
      error.status=503;
      throw error;
    };

    flow.configure({
      ...deps(
        cooldownStorage,
        providerFailure
      ),
      attemptKey:'dreamlandSubmissionAttemptV1',
      attemptTtlMs:1000,
      unknownRetryDelayMs:200,
      submissionTimeoutMs:200,
      cooldownMs:80
    });

    let providerThrown=null;

    try{
      await flow.submit({
        inquiryId:'DL-TEST-COOLDOWN',
        payload:{name:'Buyer'},
        submissionSnapshot:{
          inquiryId:'DL-TEST-COOLDOWN'
        }
      });
    }catch(error){
      providerThrown=error;
    }

    const cooldownState=
      flow.attemptState(
        'DL-TEST-COOLDOWN'
      );

    if(
      providerThrown?.code!=='SUBMISSION_FAILED'||
      cooldownState.code!=='COOLDOWN'||
      !cooldownState.active
    ){
      fail(
        'Deterministic provider failure must enter the persistent COOLDOWN state.'
      );
    }
  }catch(error){fail('D3 canonical flow execution failed: '+error.message);}
}

if(DIST){
  try{
    for(const [a,b] of [['.r4-astro-dist/inquiry/review/index.html','dist/inquiry/review/index.html'],['.r4-astro-dist/r4-review-runtime.js','dist/r4-review-runtime.js']]){
      if(!exists(a)||!exists(b)){fail('D3 artifact pair missing: '+a+' / '+b);continue;}
      if(hash(a)!==hash(b)) fail('D3 isolated/Production artifact mismatch: '+b);
    }
    for(const relative of ['.r4-astro-dist/r4-review-runtime.js','dist/r4-review-runtime.js']){
      if(!exists(relative)) continue;
      requireMarkers(relative,read(relative),['function runWithTimeout(','function classifySubmissionError(','function refreshAttemptGate(','submissionFlow.attemptState(',"'UNKNOWN_PENDING'","'SUBMISSION_TIMEOUT'",'function conciseProductPreview(']);
    }
  }catch(error){fail('D3 Production validation failed: '+error.message);}
}

if(errors.length){console.error('');console.error('DREAMLAND F3-D3 SUBMISSION RELIABILITY: FAIL');errors.forEach(e=>console.error('- '+e));console.error('');process.exit(1);}
console.log('');console.log('DREAMLAND F3-D3 SUBMISSION RELIABILITY: PASS');console.log('');

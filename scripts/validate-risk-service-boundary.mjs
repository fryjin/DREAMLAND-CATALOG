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
    'src/services/risk/runtime-risk.js'
  );

if(!fs.existsSync(runtimePath)){
  fail(
    'Risk runtime service is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandRisk;
    delete globalThis.hcaptcha;

    await import(
      `${pathToFileURL(runtimePath).href}?risk-validation=${Date.now()}`
    );

    const service=
      globalThis.DreamlandRisk;

    if(!service){
      fail(
        'runtime-risk.js did not expose DreamlandRisk.'
      );
    }else{
      if(service.version!=='B4-02'){
        fail(
          `Unexpected Risk service version: ${service.version}`
        );
      }

      for(
        const method of [
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
        ]
      ){
        if(
          typeof service[method]!==
          'function'
        ){
          fail(
            `DreamlandRisk.${method} is missing.`
          );
        }
      }

      const memory=
        new Map();

      const storage={
        getItem(key){
          return memory.has(key)
            ? memory.get(key)
            : null;
        },
        setItem(key,value){
          memory.set(
            key,
            String(value)
          );
        }
      };

      const requests=[];

      const fakeFetch=
        async (
          url,
          options
        )=>{
          requests.push({
            url,
            options
          });

          return {
            ok:true,
            status:200,
            async json(){
              return {
                success:true,
                captcha_required:true,
                risk_score:4,
                reasons:[
                  'fixture-risk'
                ],
                site_key:
                  'fixture-site-key',
                risk_store_read:true,
                risk_recorded:true
              };
            }
          };
        };

      const listeners=
        new Map();

      const fakeDocument={
        body:{
          contains(){
            return true;
          }
        },
        head:{
          querySelector(){
            return null;
          },
          appendChild(){}
        },
        createElement(){
          return {
            remove(){}
          };
        },
        getElementById(){
          return null;
        },
        addEventListener(
          type,
          handler
        ){
          listeners.set(
            type,
            handler
          );
        },
        removeEventListener(
          type
        ){
          listeners.delete(
            type
          );
        }
      };

      const fakeNavigator={
        onLine:true
      };

      service.configure({
        endpoint:
          'https://example.test/api/submit',
        storage,
        storageKey:
          'dreamlandRiskAttempts',
        repeatWindowMs:
          600000,
        hcaptcha:{
          enabled:true,
          loadTimeoutMs:12000
        },
        fetchImpl:
          fakeFetch,
        documentRef:
          fakeDocument,
        navigatorRef:
          fakeNavigator
      });

      if(service.ready()!==true){
        fail(
          'Configured Risk service must report ready().'
        );
      }

      service.markFormStart();

      service.recordInteraction({
        isTrusted:false
      });

      service.recordInteraction({
        isTrusted:true
      });

      service.bindInteractionTracking(
        fakeDocument
      );

      if(
        !listeners.has('pointerdown')||
        !listeners.has('keydown')||
        !listeners.has('input')||
        !listeners.has('change')
      ){
        fail(
          'Risk interaction tracking did not bind the expected event set.'
        );
      }

      service.recordAttempt();

      if(
        service.recentAttempts()
          .length!==1
      ){
        fail(
          'Risk local-attempt persistence parity failed.'
        );
      }

      const context=
        service.buildContext({
          language:'en',
          viewport:'390x844',
          timezoneOffset:-480
        });

      if(
        context.interaction_count!==1||
        context.local_attempt_count!==1||
        context.language!=='en'||
        context.viewport!=='390x844'||
        context.timezone_offset!==-480||
        context.form_elapsed_ms<0||
        context.session_elapsed_ms<0
      ){
        fail(
          'Risk context assembly parity failed.'
        );
      }

      const assessment=
        await service.assess(
          {
            inquiry_id:
              'INQ-12345678'
          },
          {
            website:'',
            language:'en',
            viewport:'390x844'
          }
        );

      if(
        requests.length!==1||
        requests[0].url!==
          'https://example.test/api/submit'||
        assessment.captchaRequired!==true||
        assessment.riskScore!==4||
        assessment.siteKey!==
          'fixture-site-key'||
        assessment.reasons[0]!==
          'fixture-risk'
      ){
        fail(
          'Risk assessment transport/result normalization parity failed.'
        );
      }

      const requestBody=
        JSON.parse(
          requests[0].options.body
        );

      if(
        requestBody.action!=='assess'||
        requestBody.payload.inquiry_id!==
          'INQ-12345678'||
        requestBody.risk.language!=='en'||
        requestBody.website!==''
      ){
        fail(
          'Risk assessment request contract changed.'
        );
      }

      let resetCount=0;

      globalThis.hcaptcha={
        render(
          container,
          options
        ){
          if(
            options.sitekey!==
            'fixture-site-key'||
            options.size!==
            'invisible'||
            options.recaptchacompat!==
            'off'
          ){
            throw new Error(
              'Unexpected hCaptcha render options.'
            );
          }

          return 7;
        },
        getResponse(){
          return '';
        },
        async execute(){
          return {
            response:
              'captcha-response'
          };
        },
        reset(){
          resetCount+=1;
        },
        remove(){}
      };

      const container={
        innerHTML:'loading'
      };

      await service.renderCaptcha(
        container,
        {
          siteKey:
            'fixture-site-key'
        }
      );

      const captcha=
        await service.ensureCaptcha({
          required:true
        });

      if(
        captcha!==
        'captcha-response'||
        service.captchaToken()!==
        'captcha-response'
      ){
        fail(
          'hCaptcha token/execution parity failed.'
        );
      }

      service.resetCaptcha();

      if(resetCount!==1){
        fail(
          'hCaptcha reset parity failed.'
        );
      }

      service.unbindInteractionTracking();

      if(listeners.size!==0){
        fail(
          'Risk interaction tracking did not unbind cleanly.'
        );
      }

      service.configure({
        endpoint:
          'https://example.test/api/submit',
        storage,
        fetchImpl:
          async ()=>({
            ok:false,
            status:503,
            async json(){
              return {
                success:false,
                message:
                  'risk unavailable'
              };
            }
          })
      });

      let failure=null;

      try{
        await service.assess({
          inquiry_id:
            'INQ-12345678'
        });
      }catch(error){
        failure=error;
      }

      if(
        failure?.name!==
          'RiskError'||
        failure?.code!==
          'ASSESSMENT_FAILED'||
        failure?.status!==503
      ){
        fail(
          'Risk assessment failure normalization parity failed.'
        );
      }
    }
  }catch(error){
    fail(
      `Risk runtime execution failed: ${error.message}`
    );
  }finally{
    delete globalThis.hcaptcha;
  }
}

try{
  const indexSource=
    read('index.html');

  const compactIndexSource=
    indexSource.replace(
      /\s+/g,
      ''
    );

  for(
    const marker of [
      './src/services/risk/runtime-risk.js',
      'const riskService=window.DreamlandRisk',
      'riskService.configure(',
      'riskService.bindInteractionTracking(',
      'riskService.markFormStart(',
      'riskService.preloadCaptcha(',
      'riskService.renderCaptcha(',
      'riskService.ensureCaptcha(',
      'riskService.assess(',
      'riskService.recordAttempt(',
      'riskService.resetCaptcha('
    ]
  ){
    if(
      !compactIndexSource.includes(
        marker.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `index.html is missing Risk boundary integration: ${marker}`
      );
    }
  }

  for(
    const legacy of [
      "const RISK_ATTEMPT_KEY='dreamlandRiskAttempts'",
      'const riskSessionStartedAt=Date.now()',
      'let riskFormStartedAt=0',
      'let riskInteractionCount=0',
      'let hcaptchaWidgetId=null',
      'let hcaptchaResponseToken',
      'let hcaptchaExecutionPromise',
      'let hcaptchaScriptPromise',
      'let hcaptchaScriptTimer',
      'function recentRiskAttempts(',
      'function recordRiskAttempt(',
      'function buildRiskContext(',
      'function trackRiskInteraction(',
      'function hcaptchaLoadTimeoutMs(',
      'function ensureHCaptchaConnectionHints(',
      'function resetHCaptchaScriptLoader(',
      'function loadHCaptchaScript(',
      'function preferredHCaptchaSize(',
      'function executeHCaptchaChallenge('
    ]
  ){
    if(
      indexSource.includes(
        legacy
      )
    ){
      fail(
        `index.html still owns Risk runtime primitive: ${legacy}`
      );
    }
  }

  if(
    /fetch\s*\(\s*riskAssessmentEndpoint\s*\(/.test(
      indexSource
    )
  ){
    fail(
      'index.html still performs direct risk-assessment transport.'
    );
  }

  if(
    indexSource.includes(
      'window.hcaptcha'
    )
  ){
    fail(
      'index.html still owns direct hCaptcha SDK calls.'
    );
  }

  for(
    const preserved of [
      'const RISK_COPY=',
      'function riskText(',
      'function ensureRiskHoneypot(',
      'function riskHoneypotValue(',
      'function setRiskStatus(',
      'function captchaSection(',
      'async function renderHCaptcha(',
      'async function ensureHCaptchaVerification(',
      'async function handlePrivacyConsentChange(',
      'async function assessSubmissionRisk(',
      'function buildWeb3FormsPayload('
    ]
  ){
    if(
      !indexSource.includes(
        preserved
      )
    ){
      fail(
        `B4-02 must preserve Risk UI/business orchestration: ${preserved}`
      );
    }
  }

  if(
    !/riskService\s*\.\s*assess\s*\([\s\S]{0,360}website\s*:\s*riskHoneypotValue\s*\(\s*\)/.test(
      indexSource
    )
  ){
    fail(
      'assessSubmissionRisk must pass the honeypot value explicitly into DreamlandRisk.'
    );
  }

  if(
    !/riskService\s*\.\s*ensureCaptcha\s*\(\s*\{\s*required\s*:\s*true/.test(
      indexSource
    )
  ){
    fail(
      'Inquiry flow must request hCaptcha verification through DreamlandRisk.'
    );
  }
}catch(error){
  fail(
    `index.html Risk boundary inspection failed: ${error.message}`
  );
}

try{
  const config=
    JSON.parse(
      read('data/app-config.json')
    );

  if(
    config.submissionEndpoint!==
      './api/submit'||
    config.hcaptcha?.mode!==
      'adaptive-risk'||
    !config.riskControl
  ){
    fail(
      'B4-02 must preserve existing Risk/hCaptcha configuration.'
    );
  }
}catch(error){
  fail(
    `app-config Risk boundary inspection failed: ${error.message}`
  );
}

try{
  const serverSource=
    read(
      'functions/api/submit.js'
    );

  for(
    const marker of [
      "body.action !== 'assess'",
      'function validatePayload(',
      'function evaluateRisk(',
      'async function readPersistentRisk(',
      'async function recordPersistentRisk(',
      'env.RISK_STORE',
      'captcha_required'
    ]
  ){
    if(
      !serverSource.includes(
        marker
      )
    ){
      fail(
        `B4-02 must preserve server Risk boundary: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `functions/api/submit.js server Risk inspection failed: ${error.message}`
  );
}

try{
  const contractsSource=
    read(
      'src/services/contracts.js'
    );

  const legacyMapSource=
    read(
      'src/app/legacy-map.js'
    );

  if(
    !contractsSource.includes(
      "'src/services/risk/runtime-risk.js'"
    )
  ){
    fail(
      'Service contracts do not declare Risk runtime owner.'
    );
  }

  if(
    !legacyMapSource.includes(
      "'src/services/risk/runtime-risk.js'"
    )||
    !legacyMapSource.includes(
      "'functions/api/submit.js'"
    )||
    !legacyMapSource.includes(
      "status:'partial'"
    )
  ){
    fail(
      'Legacy map does not describe the partial client/server Risk boundary.'
    );
  }
}catch(error){
  fail(
    `Architecture Risk boundary inspection failed: ${error.message}`
  );
}

try{
  const previousValidator=
    read(
      'scripts/validate-submission-service-boundary.mjs'
    );

  for(
    const historical of [
      'dreamland-pwa-v70',
      "'function buildRiskContext('",
      "legacyMapSource.includes('B4-02')"
    ]
  ){
    if(
      previousValidator.includes(
        historical
      )
    ){
      fail(
        `Historical B4-01 validator still owns removed Risk state: ${historical}`
      );
    }
  }

  const swSource=
    read('sw.js');

  const matches=
    swSource.match(
      /'\.\/src\/services\/risk\/runtime-risk\.js'/g
    )||[];

  if(matches.length!==1){
    fail(
      `sw.js APP_SHELL must include runtime-risk.js exactly once; found ${matches.length}.`
    );
  }
}catch(error){
  fail(
    `SW/historical validator Risk inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nRisk service boundary validation failed:\n'
  );

  for(
    const error of
    errors
  ){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Risk service boundary validation: PASS'
);

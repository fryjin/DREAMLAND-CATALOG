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
    path.join(
      ROOT,
      relativePath
    ),
    'utf8'
  );
}

function compact(source){
  return String(
    source||
    ''
  ).replace(
    /\s+/g,
    ''
  );
}

const contactPath=
  path.join(
    ROOT,
    'src/features/contact/runtime-contact.js'
  );

const flowPath=
  path.join(
    ROOT,
    'src/app/runtime-inquiry-submission-flow.js'
  );

if(!fs.existsSync(contactPath)){
  fail(
    'Contact Feature runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandContact;

    await import(
      `${pathToFileURL(contactPath).href}?b506-contact=${Date.now()}`
    );

    const contact=
      globalThis.DreamlandContact;

    if(
      !contact||
      contact.version!=='B5-06'
    ){
      fail(
        'DreamlandContact B5-06 runtime was not exposed.'
      );
    }else{
      for(const method of [
        'configure',
        'snapshot',
        'get',
        'replace',
        'patch',
        'clear',
        'loadDraft',
        'persistDraft',
        'scheduleDraft',
        'flushDraft',
        'clearDraft',
        'clearAll',
        'validate'
      ]){
        if(
          typeof contact[method]!==
          'function'
        ){
          fail(
            `DreamlandContact.${method} is missing.`
          );
        }
      }

      let clock=1000;

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
        },
        removeItem(key){
          memory.delete(
            key
          );
        }
      };

      contact.configure({
        storage,
        storageKey:'contact-draft',
        ttlMs:1000,
        fieldIds:[
          'name',
          'company',
          'country',
          'city',
          'email',
          'phone',
          'buyerType',
          'message'
        ],
        now:
          ()=>clock
      });

      contact.replace({
        name:' Ada ',
        company:'Dreamland',
        country:'SG',
        email:'ada@example.com',
        phone:'12345',
        buyerType:'品牌方'
      });

      if(
        contact.snapshot().name!=='Ada'||
        contact.snapshot().country!=='SG'
      ){
        fail(
          'Contact normalization/snapshot parity failed.'
        );
      }

      contact.persistDraft();

      const storedDraft=
        JSON.parse(
          memory.get(
            'contact-draft'
          )
        );

      if(
        storedDraft.savedAt!==1000||
        storedDraft.contact.name!=='Ada'
      ){
        fail(
          'Contact draft persistence parity failed.'
        );
      }

      contact.clear();
      contact.loadDraft();

      if(
        contact.snapshot().name!=='Ada'
      ){
        fail(
          'Contact draft restore parity failed.'
        );
      }

      const valid=
        contact.validate(
          contact.snapshot(),
          {
            emailValid:true
          }
        );

      if(!valid.valid){
        fail(
          'Valid Contact data did not pass validation.'
        );
      }

      const invalid=
        contact.validate(
          {
            name:'A',
            country:'',
            email:'bad',
            phone:'1'
          },
          {
            emailValid:false
          }
        );

      if(
        invalid.valid||
        invalid.errors
          .map(
            item=>item.code
          )
          .join(',')!==
          'invalidName,countryRequired,invalidEmail,invalidPhone'
      ){
        fail(
          'Contact validation error parity failed.'
        );
      }

      clock=2501;
      contact.loadDraft();

      if(
        contact.snapshot().name!==''||
        memory.has(
          'contact-draft'
        )
      ){
        fail(
          'Expired Contact draft was not cleared.'
        );
      }

      clock=3000;

      contact.scheduleDraft(
        {
          name:'Timer',
          country:'US',
          email:'timer@example.com',
          phone:'54321'
        },
        5
      );

      await new Promise(
        resolve=>
          setTimeout(
            resolve,
            15
          )
      );

      if(
        JSON.parse(
          memory.get(
            'contact-draft'
          )
        ).contact.name!==
        'Timer'
      ){
        fail(
          'Scheduled Contact draft persistence failed.'
        );
      }

      contact.clearAll();

      if(
        memory.has(
          'contact-draft'
        )||
        contact.snapshot().name!==''
      ){
        fail(
          'Contact clearAll parity failed.'
        );
      }
    }
  }catch(error){
    fail(
      `Contact runtime execution failed: ${error.message}`
    );
  }
}

if(!fs.existsSync(flowPath)){
  fail(
    'Inquiry Submission Flow runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandInquirySubmissionFlow;

    await import(
      `${pathToFileURL(flowPath).href}?b506-flow=${Date.now()}`
    );

    const flow=
      globalThis
        .DreamlandInquirySubmissionFlow;

    if(
      !flow||
      flow.version!=='B5-06'
    ){
      fail(
        'DreamlandInquirySubmissionFlow B5-06 runtime was not exposed.'
      );
    }else{
      for(const method of [
        'configure',
        'snapshot',
        'ready',
        'preflight',
        'submit'
      ]){
        if(
          typeof flow[method]!==
          'function'
        ){
          fail(
            `DreamlandInquirySubmissionFlow.${method} is missing.`
          );
        }
      }

      let clock=50000;
      let reachable=true;
      let submissionShouldFail=false;
      let recordAttemptCount=0;
      let clearItemsCount=0;
      let persistCount=0;
      let clearContactCount=0;
      const submissions=[];
      const reachability=[];

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
        },
        removeItem(key){
          memory.delete(
            key
          );
        }
      };

      memory.set(
        'pending',
        'INQ-1'
      );

      const submission={
        ready(){
          return true;
        },
        async submit(
          payload,
          options
        ){
          submissions.push({
            payload,
            options
          });

          if(submissionShouldFail){
            const error=
              new Error(
                'Fixture network failure'
              );

            error.code=
              'SUBMISSION_FAILED';

            throw error;
          }

          return Object.freeze({
            success:true,
            responseType:
              'web3forms-gateway'
          });
        }
      };

      const risk={
        recordAttempt(){
          recordAttemptCount+=1;
        }
      };

      const pwa={
        async probeReachability(){
          return reachable;
        },
        applyReachability(
          online,
          forced
        ){
          reachability.push([
            online,
            forced
          ]);
        }
      };

      const inquiry={
        clearItems(){
          clearItemsCount+=1;
        },
        persist(){
          persistCount+=1;
        }
      };

      const contact={
        clearAll(){
          clearContactCount+=1;
        }
      };

      flow.configure({
        submission,
        risk,
        pwa,
        inquiry,
        contact,
        storage,
        archiveKey:'archive',
        lastSubmissionKey:'last',
        pendingInquiryKey:'pending',
        archiveLimit:2,
        cooldownMs:1000,
        now:
          ()=>clock
      });

      if(
        !flow.ready()||
        !flow.preflight().ok
      ){
        fail(
          'Configured Inquiry Submission Flow must be ready.'
        );
      }

      const result=
        await flow.submit({
          inquiryId:'INQ-1',
          payload:{
            inquiry_id:
              'INQ-1'
          },
          submissionSnapshot:{
            inquiryId:'INQ-1',
            submittedAt:
              '2026-08-18T00:00:00.000Z',
            itemCount:1
          },
          captchaToken:
            'captcha-token'
        });

      if(
        result.success!==true||
        submissions.length!==1||
        submissions[0].options
          .captchaToken!==
          'captcha-token'||
        recordAttemptCount!==1||
        clearItemsCount!==1||
        persistCount!==1||
        clearContactCount!==1||
        memory.has('pending')
      ){
        fail(
          'Inquiry Submission Flow success orchestration parity failed.'
        );
      }

      const archived=
        JSON.parse(
          memory.get(
            'archive'
          )
        );

      const last=
        JSON.parse(
          memory.get(
            'last'
          )
        );

      if(
        archived.length!==1||
        last.inquiryId!=='INQ-1'||
        last.clientInquiryId!=='INQ-1'||
        last.duplicate!==false||
        last.submissionResponseType!==
          'web3forms-gateway'
      ){
        fail(
          'Submission archive/final record parity failed.'
        );
      }

      if(
        flow.preflight().code!==
        'COOLDOWN'
      ){
        fail(
          'Submission cooldown preflight parity failed.'
        );
      }

      /*
       * R3.2: an advisory probe false-negative must not block a real
       * Submission Gateway request.
       */
      clock+=1001;
      reachable=false;

      const advisoryResult=
        await flow.submit({
          inquiryId:'INQ-2',
          payload:{
            inquiry_id:
              'INQ-2'
          },
          submissionSnapshot:{
            inquiryId:'INQ-2'
          }
        });

      if(
        advisoryResult.success!==true||
        submissions.length!==2||
        clearItemsCount!==2||
        persistCount!==2||
        clearContactCount!==2||
        !reachability.some(
          item=>
            item[0]===true
        )
      ){
        fail(
          'Advisory reachability false-negative incorrectly blocked submission.'
        );
      }

      /*
       * A genuine Gateway/network failure must still preserve submitted state
       * and report unreachable only after the actual submission fails.
       */
      clock+=1001;
      submissionShouldFail=true;

      const clearsBeforeFailure=
        clearItemsCount;
      const persistsBeforeFailure=
        persistCount;
      const contactsBeforeFailure=
        clearContactCount;

      let offline=null;

      try{
        await flow.submit({
          inquiryId:'INQ-3',
          payload:{
            inquiry_id:
              'INQ-3'
          },
          submissionSnapshot:{
            inquiryId:'INQ-3'
          }
        });
      }catch(error){
        offline=error;
      }

      if(
        offline?.code!==
          'SUBMISSION_FAILED'||
        offline?.reachable!==
          false||
        clearItemsCount!==
          clearsBeforeFailure||
        persistCount!==
          persistsBeforeFailure||
        clearContactCount!==
          contactsBeforeFailure||
        !reachability.some(
          item=>
            item[0]===false
        )
      ){
        fail(
          'Actual Submission Gateway failure orchestration parity failed.'
        );
      }
    }
  }catch(error){
    fail(
      `Inquiry Submission Flow execution failed: ${error.message}`
    );
  }
}

try{
  const contactSource=
    read(
      'src/features/contact/runtime-contact.js'
    );

  for(const forbidden of [
    'document.',
    'querySelector(',
    'innerHTML',
    'DreamlandInquiry',
    'DreamlandSubmission',
    'DreamlandRisk',
    'DreamlandPwa'
  ]){
    if(
      contactSource.includes(
        forbidden
      )
    ){
      fail(
        `Contact Feature crossed its boundary: ${forbidden}`
      );
    }
  }

  const flowSource=
    read(
      'src/app/runtime-inquiry-submission-flow.js'
    );

  for(const forbidden of [
    'document.',
    'querySelector(',
    'innerHTML',
    'toast(',
    'ui(',
    'privacyConsent'
  ]){
    if(
      flowSource.includes(
        forbidden
      )
    ){
      fail(
        `Inquiry Submission Flow crossed its App orchestration boundary: ${forbidden}`
      );
    }
  }

  for(const required of [
    'config.submission',
    '.submit(',
    'captchaToken',
    'config.risk',
    '.recordAttempt(',
    'config.pwa',
    '.probeReachability(',
    '.applyReachability(',
    'config.inquiry',
    '.clearItems(',
    '.persist(',
    'config.contact',
    '.clearAll('
  ]){
    if(
      !compact(
        flowSource
      ).includes(
        compact(
          required
        )
      )
    ){
      fail(
        `Inquiry Submission Flow source is missing orchestration responsibility: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `B5-06 runtime source inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read(
      'index.html'
    );

  const compactIndex=
    compact(
      indexSource
    );

  for(const marker of [
    '<script src="./src/features/contact/runtime-contact.js"></script>',
    '<script src="./src/app/runtime-inquiry-submission-flow.js"></script>',
    'const contactFeature=window.DreamlandContact',
    'const submissionFlow=window.DreamlandInquirySubmissionFlow',
    'contactFeature.configure(',
    'submissionFlow.configure(',
    'contactFeature.loadDraft(',
    'contactFeature.scheduleDraft(',
    'contactFeature.flushDraft(',
    'contactFeature.validate(',
    'contactFeature.snapshot(',
    'submissionFlow.preflight(',
    'submissionFlow.submit(',
    'function resetSubmittedFormUi('
  ]){
    if(
      !compactIndex.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `index.html is missing B5-06 integration: ${marker}`
      );
    }
  }

  for(const legacy of [
    'let contactDraftTimer=',
    'let submittingInquiry=',
    'let lastSubmitAttemptAt=',
    'function readContactDraft(',
    'function archiveSubmission(',
    'function clearSubmittedInquiry(',
    'state.contact=',
    'appStorage.local.setItem(CONTACT_DRAFT_KEY',
    'appStorage.local.getItem(CONTACT_DRAFT_KEY'
  ]){
    if(
      compactIndex.includes(
        compact(
          legacy
        )
      )
    ){
      fail(
        `index.html still owns B5-06 Contact/Submission state: ${legacy}`
      );
    }
  }

  const submitStart=
    indexSource.indexOf(
      'async function submitInquiry(){'
    );

  const submitEnd=
    indexSource.indexOf(
      'function renderSuccess(){',
      submitStart
    );

  const submitSource=
    submitStart>=0&&
    submitEnd>submitStart
      ? indexSource.slice(
          submitStart,
          submitEnd
        )
      : '';

  const compactSubmit=
    compact(
      submitSource
    );

  if(!submitSource){
    fail(
      'submitInquiry() could not be isolated.'
    );
  }else{
    for(const marker of [
      'submissionFlow.preflight(',
      'submissionFlow.submit(',
      'buildWeb3FormsPayload(',
      'submissionSnapshot(',
      'hcaptchaToken()',
      'resetSubmittedFormUi()'
    ]){
      if(
        !compactSubmit.includes(
          compact(
            marker
          )
        )
      ){
        fail(
          `submitInquiry() is missing B5-06 App-flow integration: ${marker}`
        );
      }
    }

    for(const forbidden of [
      'submissionService.submit(',
      'pwaService.probeReachability(',
      'riskService.recordAttempt(',
      'archiveSubmission(',
      'clearSubmittedInquiry('
    ]){
      if(
        compactSubmit.includes(
          compact(
            forbidden
          )
        )
      ){
        fail(
          `submitInquiry() still owns submission orchestration: ${forbidden}`
        );
      }
    }
  }
}catch(error){
  fail(
    `index.html B5-06 inspection failed: ${error.message}`
  );
}

try{
  const manifest=
    (
      await import(
        pathToFileURL(
          path.join(
            ROOT,
            'src/features/manifest.js'
          )
        ).href+
        `?b506-manifest=${Date.now()}`
      )
    ).FEATURE_MANIFEST;

  const enabled=
    manifest.filter(
      item=>
        item.runtimeEnabled===true
    );

  const enabledIds=
    enabled
      .map(
        item=>item.id
      )
      .sort()
      .join(',');

  const inquiry=
  manifest.find(
    item=>
      item.id==='inquiry'
  );

const contact=
  manifest.find(
    item=>
      item.id==='contact'
  );

if(
  inquiry?.runtimeEnabled!==
    true||
  inquiry?.status!==
    'partial'||
  inquiry?.runtimeOwner!==
    'src/features/inquiry/runtime-inquiry.js'||
  contact?.runtimeEnabled!==
    true||
  contact?.status!==
    'partial'||
  contact?.runtimeOwner!==
    'src/features/contact/runtime-contact.js'
){
  fail(
    'B5-06 must preserve partial Inquiry and Contact Feature ownership.'
  );
}
}catch(error){
  fail(
    `Feature manifest B5-06 inspection failed: ${error.message}`
  );
}

try{
  const legacyMap=
    (
      await import(
        pathToFileURL(
          path.join(
            ROOT,
            'src/app/legacy-map.js'
          )
        ).href+
        `?b506-legacy=${Date.now()}`
      )
    ).LEGACY_FRONTEND_MAP;

  const contactMigration=
    legacyMap.find(
      item=>
        item.id===
        'contact'
    );

  const submissionMigration=
    legacyMap.find(
      item=>
        item.id===
        'submission'
    );

  if(
    contactMigration?.status!==
      'partial'||
    contactMigration?.runtimeMigrated!==
      false||
    !contactMigration
      ?.runtimeOwners
      ?.includes(
        'src/features/contact/runtime-contact.js'
      )
  ){
    fail(
      'Legacy map does not describe the B5-06 Contact runtime ownership.'
    );
  }

  if(
    submissionMigration?.status!==
      'partial'||
    submissionMigration?.runtimeMigrated!==
      false||
    !submissionMigration
      ?.runtimeOwners
      ?.includes(
        'src/app/runtime-inquiry-submission-flow.js'
      )
  ){
    fail(
      'Legacy map does not describe the B5-06 Inquiry Submission Flow ownership.'
    );
  }
}catch(error){
  fail(
    `Legacy map B5-06 inspection failed: ${error.message}`
  );
}

try{
  const stateValidator=
    read(
      'scripts/validate-inquiry-feature-state-boundary.mjs'
    );

  if(
    stateValidator.includes(
      "'state.contact=contact'"
    )||
    stateValidator.includes(
      'enabled.length!==1'
    )
  ){
    fail(
      'Historical B5-01 validator still owns Contact/single-Feature placement.'
    );
  }

  const pricingValidator=
    read(
      'scripts/validate-inquiry-pricing-boundary.mjs'
    );

  if(
    pricingValidator.includes(
      'enabled.length!==1'
    )
  ){
    fail(
      'Historical B5-02 validator still owns single-Feature placement.'
    );
  }

  const viewValidator=
    read(
      'scripts/validate-inquiry-view-model-boundary.mjs'
    );

  if(
    viewValidator.includes(
      'enabled.length!==1'
    )
  ){
    fail(
      'Historical B5-03 validator still owns single-Feature placement.'
    );
  }

  const submissionValidator=
    read(
      'scripts/validate-submission-service-boundary.mjs'
    );

  for(const stale of [
    "'function archiveSubmission('",
    "'function clearSubmittedInquiry('"
  ]){
    if(
      submissionValidator.includes(
        stale
      )
    ){
      fail(
        `Historical B4-01 validator still owns B5-06 App orchestration: ${stale}`
      );
    }
  }

  const riskValidator=
    read(
      'scripts/validate-risk-service-boundary.mjs'
    );

  if(
    riskValidator.includes(
      "'riskService.recordAttempt('"
    )
  ){
    fail(
      'Historical B4-02 validator still requires recordAttempt() in index.html.'
    );
  }

  const projectionValidator=
    read(
      'scripts/validate-inquiry-projection-boundary.mjs'
    );

  if(
    projectionValidator.includes(
      "'function archiveSubmission('"
    )||
    projectionValidator.includes(
      'dreamland-pwa-v76'
    )
  ){
    fail(
      'Historical B5-05 validator still owns B5-06 archive/cache placement.'
    );
  }
}catch(error){
  fail(
    `Historical validator B5-06 inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read(
      'sw.js'
    );

 

  for(const [
    label,
    pattern
  ] of [
    [
      'Contact runtime',
      /'\.\/src\/features\/contact\/runtime-contact\.js'/g
    ],
    [
      'Submission Flow runtime',
      /'\.\/src\/app\/runtime-inquiry-submission-flow\.js'/g
    ]
  ]){
    const matches=
      swSource.match(
        pattern
      )||[];

    if(matches.length!==1){
      fail(
        `sw.js must cache ${label} exactly once; found ${matches.length}.`
      );
    }
  }
}catch(error){
  fail(
    `SW B5-06 inspection failed: ${error.message}`
  );
}

try{
  const packageJson=
    JSON.parse(
      read(
        'package.json'
      )
    );

  if(
    packageJson.scripts
      ?.['contact-submission:boundary']!==
      'node scripts/validate-contact-submission-orchestration-boundary.mjs'
  ){
    fail(
      'package.json is missing contact-submission:boundary.'
    );
  }

  if(
    !String(
      packageJson.scripts
        ?.validate||
      ''
    ).includes(
      'npm run inquiry-projection:boundary && npm run contact-submission:boundary'
    )
  ){
    fail(
      'B5-06 validator must run after B5-05 Projection validation.'
    );
  }
}catch(error){
  fail(
    `package.json B5-06 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nContact / Inquiry Submission Orchestration boundary validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Contact / Inquiry Submission Orchestration boundary validation: PASS'
);

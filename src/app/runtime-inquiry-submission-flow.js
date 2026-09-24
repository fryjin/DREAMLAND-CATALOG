(function(root){
  'use strict';

  if(root.DreamlandInquirySubmissionFlow){
    return;
  }

  const VERSION='B5-06';

  let config={
    submission:null,
    risk:null,
    pwa:null,
    inquiry:null,
    contact:null,
    storage:null,

    archiveKey:
      'dreamlandInquiryArchiveV1',

    lastSubmissionKey:
      'dreamlandLastSubmissionV1',

    pendingInquiryKey:
      'dreamlandPendingInquiryIdV1',

    archiveLimit:20,
    cooldownMs:10000,
    attemptKey:'',
    attemptTtlMs:45000,
    unknownRetryDelayMs:15000,
    submissionTimeoutMs:0,
    now:
      ()=>Date.now()
  };

  let inFlight=false;
  let lastAttemptAt=0;

  function text(value){
    return String(
      value??
      ''
    ).trim();
  }

  function clone(
    value
  ){
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }

  function now(){
    return Number(
      config.now()
    )||
    Date.now();
  }

  function attemptToken(){
    const bytes=new Uint8Array(8);
    if(root.crypto?.getRandomValues){
      root.crypto.getRandomValues(bytes);
      return [...bytes].map(value=>value.toString(36).padStart(2,'0')).join('');
    }
    return now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }

  function readAttemptRecord(){
    if(!config.storage||!config.attemptKey) return null;
    try{
      const record=JSON.parse(config.storage.getItem(config.attemptKey)||'null');
      if(!record||typeof record!=='object'||Array.isArray(record)) return null;
      if(Number(record.expiresAt||0)<=now()){
        config.storage.removeItem(config.attemptKey);
        return null;
      }
      return record;
    }catch(_){return null;}
  }

  function writeAttemptRecord(record){
    if(!config.storage||!config.attemptKey) return false;
    try{config.storage.setItem(config.attemptKey,JSON.stringify(record));return true;}catch(_){return false;}
  }

  function removeAttemptRecord(token=''){
    if(!config.storage||!config.attemptKey) return false;
    const current=readAttemptRecord();
    if(token&&current?.token&&current.token!==token) return false;
    try{config.storage.removeItem(config.attemptKey);return true;}catch(_){return false;}
  }

  function attemptState(inquiryId=''){
    const reference=text(inquiryId);
    const record=readAttemptRecord();
    if(!record||(reference&&text(record.inquiryId)!==reference)){
      return Object.freeze({active:false,code:'',state:'idle',retryAfterMs:0});
    }
    const retryAfterMs=Math.max(0,Number(record.expiresAt||0)-now());
    const state=text(record.state)||'submitting';
    return Object.freeze({
      active:retryAfterMs>0,
      code:state==='unknown'?'UNKNOWN_PENDING':state==='cooldown'?'COOLDOWN':'DUPLICATE',
      state,
      retryAfterMs
    });
  }

  function acquireAttempt(inquiryId){
    const reference=text(inquiryId);
    if(!config.attemptKey||!reference) return Object.freeze({ok:true,token:''});
    const gate=attemptState(reference);
    if(gate.active) return Object.freeze({ok:false,token:'',code:gate.code,retryAfterMs:gate.retryAfterMs});
    const token=attemptToken();
    const currentTime=now();
    writeAttemptRecord({version:1,inquiryId:reference,token,state:'submitting',startedAt:currentTime,updatedAt:currentTime,expiresAt:currentTime+config.attemptTtlMs});
    const confirmed=readAttemptRecord();
    if(confirmed?.token!==token){
      const next=attemptState(reference);
      return Object.freeze({ok:false,token:'',code:next.code||'DUPLICATE',retryAfterMs:next.retryAfterMs});
    }
    return Object.freeze({ok:true,token});
  }

  function persistAttemptOutcome(inquiryId,token,state,holdMs){
    if(!token||!config.attemptKey) return false;
    const current=readAttemptRecord();
    if(current?.token!==token) return false;
    const currentTime=now();
    return writeAttemptRecord({...current,inquiryId:text(inquiryId),state,updatedAt:currentTime,expiresAt:currentTime+Math.max(0,Number(holdMs)||0)});
  }

  function ambiguousDelivery(error){
    return Boolean(error?.code==='SUBMISSION_TIMEOUT'||error?.name==='AbortError'||(error?.name==='TypeError'&&Number(error?.status||0)===0));
  }

  function submissionTimeoutContext(){
    const timeoutMs=config.submissionTimeoutMs;
    if(timeoutMs<=0||typeof root.AbortController!=='function') return Object.freeze({signal:null,timedOut:()=>false,clear(){}});
    const controller=new root.AbortController();
    let timeoutReached=false;
    const timer=setTimeout(()=>{timeoutReached=true;controller.abort();},timeoutMs);
    return Object.freeze({signal:controller.signal,timedOut:()=>timeoutReached,clear:()=>clearTimeout(timer)});
  }

  function createError(
    message,
    code,
    details={}
  ){
    const error=
      new Error(
        message||
        'Inquiry submission failed.'
      );

    error.name=
      'InquirySubmissionFlowError';

    error.code=
      code||
      'SUBMISSION_FAILED';

    Object.assign(
      error,
      details
    );

    return error;
  }

  function configure(
    {
      submission=null,
      risk=null,
      pwa=null,
      inquiry=null,
      contact=null,
      storage=null,

      archiveKey=
        'dreamlandInquiryArchiveV1',

      lastSubmissionKey=
        'dreamlandLastSubmissionV1',

      pendingInquiryKey=
        'dreamlandPendingInquiryIdV1',

      archiveLimit=20,
      cooldownMs=10000,
      attemptKey='',
      attemptTtlMs=45000,
      unknownRetryDelayMs=15000,
      submissionTimeoutMs=0,
      now:nowImpl=null
    }={}
  ){
    config={
      submission,
      risk,
      pwa,
      inquiry,
      contact,
      storage:
        storage&&
        typeof storage.getItem===
          'function'&&
        typeof storage.setItem===
          'function'&&
        typeof storage.removeItem===
          'function'
          ? storage
          : null,

      archiveKey:
        text(
          archiveKey
        )||
        'dreamlandInquiryArchiveV1',

      lastSubmissionKey:
        text(
          lastSubmissionKey
        )||
        'dreamlandLastSubmissionV1',

      pendingInquiryKey:
        text(
          pendingInquiryKey
        )||
        'dreamlandPendingInquiryIdV1',

      archiveLimit:
        Math.max(
          1,
          Math.trunc(
            Number(archiveLimit)||
            20
          )
        ),

      cooldownMs:
        Math.max(
          0,
          Number(cooldownMs)||
          0
        ),

      attemptKey:
        text(attemptKey),

      attemptTtlMs:
        Math.max(5000,Number(attemptTtlMs)||45000),

      unknownRetryDelayMs:
        Math.max(1000,Number(unknownRetryDelayMs)||15000),

      submissionTimeoutMs:
        Math.max(0,Number(submissionTimeoutMs)||0),

      now:
        typeof nowImpl==='function'
          ? nowImpl
          : ()=>Date.now()
    };

    inFlight=false;
    lastAttemptAt=0;

    return snapshot();
  }

  function dependenciesReady(){
    return Boolean(
      config.submission&&
      typeof config.submission.ready===
        'function'&&
      typeof config.submission.submit===
        'function'&&

      config.risk&&
      typeof config.risk.recordAttempt===
        'function'&&

      config.pwa&&
      typeof config.pwa.probeReachability===
        'function'&&
      typeof config.pwa.applyReachability===
        'function'&&

      config.inquiry&&
      typeof config.inquiry.clearItems===
        'function'&&
      typeof config.inquiry.persist===
        'function'&&

      config.contact&&
      typeof config.contact.clearAll===
        'function'&&

      config.storage
    );
  }

  function ready(){
    return Boolean(
      dependenciesReady()&&
      config.submission.ready()
    );
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      configured:
        dependenciesReady(),
      ready:
        ready(),
      inFlight,
      lastAttemptAt,
      cooldownMs:
        config.cooldownMs,
      attemptKey:config.attemptKey,
      attemptTtlMs:config.attemptTtlMs,
      unknownRetryDelayMs:config.unknownRetryDelayMs,
      submissionTimeoutMs:config.submissionTimeoutMs
    });
  }

  function preflight({inquiryId=''}={}){
    if(inFlight){
      return Object.freeze({
        ok:false,
        code:'DUPLICATE',
        retryAfterMs:0
      });
    }

    const persistent=attemptState(inquiryId);
    if(persistent.active){
      return Object.freeze({ok:false,code:persistent.code,retryAfterMs:persistent.retryAfterMs});
    }

    const current=
      now();

    if(
      lastAttemptAt>0&&
      current-lastAttemptAt<
        config.cooldownMs
    ){
      return Object.freeze({
        ok:false,
        code:'COOLDOWN',
        retryAfterMs:
          Math.max(
            0,
            config.cooldownMs-
              (
                current-
                lastAttemptAt
              )
          )
      });
    }

    if(
      !dependenciesReady()||
      !config.submission.ready()
    ){
      return Object.freeze({
        ok:false,
        code:'NOT_CONFIGURED',
        retryAfterMs:0
      });
    }

    return Object.freeze({
      ok:true,
      code:'',
      retryAfterMs:0
    });
  }

  function archive(
    record
  ){
    const storage=
      config.storage;

    let archive=[];

    try{
      archive=
        JSON.parse(
          storage.getItem(
            config.archiveKey
          )||
          '[]'
        );

      if(
        !Array.isArray(
          archive
        )
      ){
        archive=[];
      }
    }catch(_){
      archive=[];
    }

    archive.unshift(
      clone(
        record
      )
    );

    archive=
      archive.slice(
        0,
        config.archiveLimit
      );

    storage.setItem(
      config.archiveKey,
      JSON.stringify(
        archive
      )
    );

    storage.setItem(
      config.lastSubmissionKey,
      JSON.stringify(
        record
      )
    );

    return archive;
  }

  function clearSubmittedState(){
    config.inquiry
      .clearItems();

    config.inquiry
      .persist();

    config.contact
      .clearAll();

    config.storage
      .removeItem(
        config.pendingInquiryKey
      );

    return true;
  }

  async function failureReachability(
    error
  ){
    /*
     * B7-00B.4J R3.2
     *
     * Any HTTP response proves the server was reachable even when the
     * provider rejected the request. Do not let a second connectivity probe
     * misclassify a real 4xx/5xx Gateway response as "offline".
     */
    if(
      Number(
        error?.status||
        error?.cause?.status||
        0
      )>0
    ){
      return true;
    }

    if(
      error?.code==='OFFLINE'
    ){
      return false;
    }

    try{
      return await config.pwa
        .probeReachability(
          true
        );
    }catch(_){
      return true;
    }
  }

  async function submit(
    {
      inquiryId='',
      payload=null,
      submissionSnapshot=null,
      captchaToken=''
    }={}
  ){
    const gate=
      preflight({inquiryId});

    if(!gate.ok){
      throw createError(
        gate.code,
        gate.code,
        {
          retryAfterMs:
            gate.retryAfterMs
        }
      );
    }

    if(
      !payload||
      typeof payload!=='object'||
      Array.isArray(payload)
    ){
      throw createError(
        'Submission payload is invalid.',
        'INVALID_PAYLOAD'
      );
    }

    if(
      !submissionSnapshot||
      typeof submissionSnapshot!==
        'object'||
      Array.isArray(
        submissionSnapshot
      )
    ){
      throw createError(
        'Submission snapshot is invalid.',
        'INVALID_SNAPSHOT'
      );
    }

    const reference=text(inquiryId);
    const lease=acquireAttempt(reference);
    if(!lease.ok){
      throw createError(lease.code||'DUPLICATE',lease.code||'DUPLICATE',{retryAfterMs:lease.retryAfterMs||0});
    }

    inFlight=true;

    try{
      /*
       * B7-00B.4J R3.2 — Connectivity probe is advisory.
       *
       * A reachability probe is useful for PWA UX but must never be the
       * authority that blocks a real inquiry. Cloudflare / Service Worker /
       * browser scheduling can occasionally abort this lightweight probe
       * even while the real submission request is perfectly reachable.
       *
       * The actual submission transport request below is authoritative
       * connectivity test.
       */
      let advisoryReachable=true;

      try{
        advisoryReachable=
          await config.pwa
            .probeReachability(
              true
            );
      }catch(_){
        advisoryReachable=true;
      }

      if(advisoryReachable){
        config.pwa
          .applyReachability(
            true,
            false
          );
      }

      lastAttemptAt=
        now();

      config.risk
        .recordAttempt();

      const timeout=submissionTimeoutContext();
      let submissionResult;
      try{
        submissionResult=await config.submission.submit(payload,{captchaToken,...(timeout.signal?{signal:timeout.signal}:{})});
      }catch(error){
        if(timeout.timedOut()) throw createError('Submission request timed out.','SUBMISSION_TIMEOUT',{cause:error});
        throw error;
      }finally{
        timeout.clear();
      }

      /*
       * Successful submission delivery is definitive proof that the network and
       * server are reachable, regardless of the advisory probe result.
       */
      config.pwa
        .applyReachability(
          true,
          false
        );

      const record={
        ...clone(
          submissionSnapshot
        ),
        clientInquiryId:
          reference,
        inquiryId:
          reference,
        duplicate:false,
        submissionResponseType:
          submissionResult
            .responseType
      };

      archive(
        record
      );

      removeAttemptRecord(lease.token);
      clearSubmittedState();

      return Object.freeze({
        success:true,
        submission:
          submissionResult,
        record:
          Object.freeze(
            clone(
              record
            )
          )
      });
    }catch(error){
      const reachable=await failureReachability(error);
      if(!reachable) config.pwa.applyReachability(false,false);
      const normalized=error?.name==='InquirySubmissionFlowError'?error:createError(error?.message||'Submission failed.',error?.code||'SUBMISSION_FAILED',{reachable,cause:error});
      if(normalized.reachable===undefined) normalized.reachable=reachable;
      const ambiguous=ambiguousDelivery(normalized);
      const retryAfterMs=ambiguous?config.unknownRetryDelayMs:config.cooldownMs;
      persistAttemptOutcome(reference,lease.token,ambiguous?'unknown':'cooldown',retryAfterMs);
      normalized.retryAfterMs=Math.max(Number(normalized.retryAfterMs)||0,retryAfterMs);
      throw normalized;
    }finally{
      inFlight=false;
    }
  }

  root.DreamlandInquirySubmissionFlow=
    Object.freeze({
      version:VERSION,
      configure,
      snapshot,
      ready,
      preflight,
      attemptState,
      submit
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

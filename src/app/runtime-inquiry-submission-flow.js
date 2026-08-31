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
        config.cooldownMs
    });
  }

  function preflight(){
    if(inFlight){
      return Object.freeze({
        ok:false,
        code:'DUPLICATE',
        retryAfterMs:0
      });
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
      preflight();

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

    inFlight=true;

    try{
      /*
       * B7-00B.4J R3.2 — Connectivity probe is advisory.
       *
       * A reachability probe is useful for PWA UX but must never be the
       * authority that blocks a real inquiry. Cloudflare / Service Worker /
       * browser scheduling can occasionally abort this lightweight probe
       * even while the real /api/inquiry request is perfectly reachable.
       *
       * The actual Submission Gateway request below is the authoritative
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

      const submissionResult=
        await config.submission
          .submit(
            payload,
            {
              captchaToken
            }
          );

      /*
       * Successful Gateway delivery is definitive proof that the network and
       * server are reachable, regardless of the advisory probe result.
       */
      config.pwa
        .applyReachability(
          true,
          false
        );

      const reference=
        text(
          inquiryId
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
      const reachable=
        await failureReachability(
          error
        );

      if(!reachable){
        config.pwa
          .applyReachability(
            false,
            false
          );
      }

      if(
        error?.name===
          'InquirySubmissionFlowError'
      ){
        if(
          error.reachable===
          undefined
        ){
          error.reachable=
            reachable;
        }

        throw error;
      }

      throw createError(
        error?.message||
        'Submission failed.',
        error?.code||
        'SUBMISSION_FAILED',
        {
          reachable,
          cause:error
        }
      );
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
      submit
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

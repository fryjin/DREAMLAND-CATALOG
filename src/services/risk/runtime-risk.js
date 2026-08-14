(function(root){
  'use strict';

  if(root.DreamlandRisk){
    return;
  }

  const DEFAULT_ENDPOINT=
    './api/submit';

  const DEFAULT_STORAGE_KEY=
    'dreamlandRiskAttempts';

  const DEFAULT_REPEAT_WINDOW_MS=
    600000;

  const DEFAULT_CAPTCHA_LOAD_TIMEOUT_MS=
    12000;

  const INTERACTION_EVENTS=Object.freeze([
    'pointerdown',
    'keydown',
    'input',
    'change'
  ]);

  let config={
    endpoint:DEFAULT_ENDPOINT,
    storage:null,
    storageKey:DEFAULT_STORAGE_KEY,
    repeatWindowMs:DEFAULT_REPEAT_WINDOW_MS,
    hcaptchaEnabled:true,
    hcaptchaLoadTimeoutMs:DEFAULT_CAPTCHA_LOAD_TIMEOUT_MS,
    fetchImpl:null,
    documentRef:null,
    navigatorRef:null
  };

  const sessionStartedAt=
    Date.now();

  let formStartedAt=0;
  let interactionCount=0;
  let interactionTarget=null;
  let interactionHandler=null;

  let hcaptchaScriptPromise=null;
  let hcaptchaScriptTimer=null;
  let hcaptchaWidgetId=null;
  let hcaptchaRenderToken=0;
  let hcaptchaResponseToken='';
  let hcaptchaExecutionPromise=null;

  function text(value){
    return String(
      value??''
    ).trim();
  }

  function number(
    value,
    fallback=0
  ){
    const parsed=
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function createError(
    message,
    code,
    {
      status=0,
      data=null
    }={}
  ){
    const error=
      new Error(
        message||
        'Risk service failed'
      );

    error.name=
      'RiskError';

    error.code=
      code||
      'RISK_FAILED';

    error.status=
      number(
        status,
        0
      );

    error.data=
      data;

    return error;
  }

  function documentRef(){
    return (
      config.documentRef||
      root.document||
      null
    );
  }

  function navigatorRef(){
    return (
      config.navigatorRef||
      root.navigator||
      null
    );
  }

  function storageRef(){
    return config.storage;
  }

  function fetcher(){
    if(
      typeof config.fetchImpl===
      'function'
    ){
      return config.fetchImpl;
    }

    if(
      typeof root.fetch===
      'function'
    ){
      return root.fetch.bind(
        root
      );
    }

    return null;
  }

  function configure(
    {
      endpoint=DEFAULT_ENDPOINT,
      storage=null,
      storageKey=DEFAULT_STORAGE_KEY,
      repeatWindowMs=DEFAULT_REPEAT_WINDOW_MS,
      hcaptcha={},
      fetchImpl=null,
      documentRef:nextDocumentRef=null,
      navigatorRef:nextNavigatorRef=null
    }={}
  ){
    config={
      endpoint:
        text(endpoint)||
        DEFAULT_ENDPOINT,
      storage:
        storage&&
        typeof storage.getItem==='function'&&
        typeof storage.setItem==='function'
          ? storage
          : null,
      storageKey:
        text(storageKey)||
        DEFAULT_STORAGE_KEY,
      repeatWindowMs:
        Math.max(
          60000,
          number(
            repeatWindowMs,
            DEFAULT_REPEAT_WINDOW_MS
          )
        ),
      hcaptchaEnabled:
        hcaptcha?.enabled!==false,
      hcaptchaLoadTimeoutMs:
        Math.max(
          5000,
          number(
            hcaptcha?.loadTimeoutMs,
            DEFAULT_CAPTCHA_LOAD_TIMEOUT_MS
          )
        ),
      fetchImpl:
        typeof fetchImpl==='function'
          ? fetchImpl
          : null,
      documentRef:
        nextDocumentRef||
        null,
      navigatorRef:
        nextNavigatorRef||
        null
    };

    return snapshot();
  }

  function snapshot(){
    return Object.freeze({
      endpoint:config.endpoint,
      configured:Boolean(
        config.endpoint&&
        fetcher()
      ),
      repeatWindowMs:
        config.repeatWindowMs,
      storageKey:
        config.storageKey,
      hcaptchaEnabled:
        config.hcaptchaEnabled,
      hcaptchaLoadTimeoutMs:
        config.hcaptchaLoadTimeoutMs,
      sessionStartedAt,
      formStartedAt,
      interactionCount,
      captchaRendered:
        hcaptchaWidgetId!==null,
      captchaTokenReady:
        Boolean(
          captchaToken()
        )
    });
  }

  function ready(){
    return Boolean(
      config.endpoint&&
      fetcher()
    );
  }

  function markFormStart(){
    if(!formStartedAt){
      formStartedAt=
        Date.now();
    }

    return formStartedAt;
  }

  function recordInteraction(
    event
  ){
    if(!event?.isTrusted){
      return interactionCount;
    }

    interactionCount=
      Math.min(
        1000,
        interactionCount+1
      );

    return interactionCount;
  }

  function unbindInteractionTracking(){
    if(
      !interactionTarget||
      !interactionHandler
    ){
      interactionTarget=null;
      interactionHandler=null;
      return;
    }

    for(
      const type of
      INTERACTION_EVENTS
    ){
      interactionTarget
        .removeEventListener?.(
          type,
          interactionHandler,
          {
            capture:true
          }
        );
    }

    interactionTarget=null;
    interactionHandler=null;
  }

  function bindInteractionTracking(
    target=documentRef()
  ){
    if(
      !target||
      typeof target.addEventListener!==
      'function'
    ){
      return ()=>{
        // No-op when a DOM event target is unavailable.
      };
    }

    if(
      interactionTarget===
      target&&
      interactionHandler
    ){
      return unbindInteractionTracking;
    }

    unbindInteractionTracking();

    interactionTarget=
      target;

    interactionHandler=
      event=>{
        recordInteraction(
          event
        );
      };

    for(
      const type of
      INTERACTION_EVENTS
    ){
      target.addEventListener(
        type,
        interactionHandler,
        {
          passive:true,
          capture:true
        }
      );
    }

    return unbindInteractionTracking;
  }

  function recentAttempts(){
    const storage=
      storageRef();

    if(!storage){
      return [];
    }

    let values=[];

    try{
      values=
        JSON.parse(
          storage.getItem(
            config.storageKey
          )||
          '[]'
        );
    }catch(_){
      values=[];
    }

    if(!Array.isArray(values)){
      values=[];
    }

    const cutoff=
      Date.now()-
      config.repeatWindowMs;

    values=
      values.filter(
        value=>
          number(
            value,
            0
          )>
          cutoff
      );

    try{
      storage.setItem(
        config.storageKey,
        JSON.stringify(
          values
        )
      );
    }catch(_){}

    return values;
  }

  function recordAttempt(){
    const storage=
      storageRef();

    if(!storage){
      return 0;
    }

    const values=
      recentAttempts();

    values.push(
      Date.now()
    );

    const limited=
      values.slice(
        -10
      );

    try{
      storage.setItem(
        config.storageKey,
        JSON.stringify(
          limited
        )
      );
    }catch(_){}

    return limited.length;
  }

  function buildContext(
    {
      language='',
      viewport='',
      timezoneOffset
    }={}
  ){
    const resolvedViewport=
      text(viewport)||
      [
        number(
          root.innerWidth,
          0
        ),
        number(
          root.innerHeight,
          0
        )
      ].join('x');

    const offset=
      timezoneOffset===undefined
        ? new Date()
            .getTimezoneOffset()
        : number(
            timezoneOffset,
            0
          );

    return Object.freeze({
      session_elapsed_ms:
        Math.max(
          0,
          Date.now()-
          sessionStartedAt
        ),
      form_elapsed_ms:
        formStartedAt
          ? Math.max(
              0,
              Date.now()-
              formStartedAt
            )
          : 0,
      interaction_count:
        interactionCount,
      local_attempt_count:
        recentAttempts()
          .length,
      timezone_offset:
        offset,
      language:
        text(language),
      viewport:
        resolvedViewport
    });
  }

  function assertPayload(
    payload
  ){
    if(
      !payload||
      typeof payload!=='object'||
      Array.isArray(
        payload
      )
    ){
      throw createError(
        'Risk payload must be an object.',
        'INVALID_PAYLOAD'
      );
    }
  }

  async function assess(
    payload,
    {
      website='',
      language='',
      viewport='',
      signal
    }={}
  ){
    assertPayload(
      payload
    );

    const request=
      fetcher();

    if(
      !ready()||
      !request
    ){
      throw createError(
        'Risk service is not configured.',
        'NOT_CONFIGURED'
      );
    }

    const response=
      await request(
        config.endpoint,
        {
          method:'POST',
          headers:{
            Accept:'application/json',
            'Content-Type':
              'application/json'
          },
          body:JSON.stringify({
            action:'assess',
            payload,
            risk:buildContext({
              language,
              viewport
            }),
            website:
              text(website)
          }),
          ...(signal
            ? {signal}
            : {})
        }
      );

    let data={};

    try{
      data=
        await response.json();
    }catch(_){}

    if(
      !response.ok||
      data.success===false
    ){
      throw createError(
        data.message||
        'Risk assessment failed',
        'ASSESSMENT_FAILED',
        {
          status:
            response.status,
          data
        }
      );
    }

    return Object.freeze({
      success:true,
      filtered:
        data.filtered===true,
      captchaRequired:
        data.captcha_required===true,
      riskScore:
        number(
          data.risk_score,
          0
        ),
      reasons:
        Object.freeze(
          Array.isArray(
            data.reasons
          )
            ? [...data.reasons]
            : []
        ),
      siteKey:
        text(
          data.site_key
        ),
      riskStoreRead:
        data.risk_store_read??
        null,
      riskRecorded:
        data.risk_recorded??
        null,
      data
    });
  }

  function ensureCaptchaConnectionHints(){
    const doc=
      documentRef();

    if(
      !doc?.head||
      typeof doc.createElement!==
      'function'
    ){
      return;
    }

    for(
      const [
        rel,
        href
      ] of [
        [
          'dns-prefetch',
          'https://js.hcaptcha.com'
        ],
        [
          'preconnect',
          'https://js.hcaptcha.com'
        ],
        [
          'preconnect',
          'https://newassets.hcaptcha.com'
        ]
      ]
    ){
      if(
        doc.head.querySelector?.(
          `link[rel="${rel}"][href="${href}"]`
        )
      ){
        continue;
      }

      const link=
        doc.createElement(
          'link'
        );

      link.rel=
        rel;

      link.href=
        href;

      if(rel==='preconnect'){
        link.crossOrigin=
          'anonymous';
      }

      doc.head.appendChild(
        link
      );
    }
  }

  function resetCaptchaScriptLoader(){
    if(hcaptchaScriptTimer){
      clearTimeout(
        hcaptchaScriptTimer
      );

      hcaptchaScriptTimer=
        null;
    }

    hcaptchaScriptPromise=
      null;

    const doc=
      documentRef();

    const script=
      doc?.getElementById?.(
        'dreamlandHcaptchaSdk'
      );

    if(
      script&&
      !root.hcaptcha
    ){
      script.remove?.();
    }
  }

  function loadCaptchaScript(){
    if(
      config.hcaptchaEnabled===
      false
    ){
      return Promise.resolve(
        null
      );
    }

    if(root.hcaptcha){
      return Promise.resolve(
        root.hcaptcha
      );
    }

    if(hcaptchaScriptPromise){
      return hcaptchaScriptPromise;
    }

    const doc=
      documentRef();

    if(
      !doc?.head||
      typeof doc.createElement!==
      'function'
    ){
      return Promise.reject(
        createError(
          'hCaptcha document context is unavailable.',
          'CAPTCHA_UNAVAILABLE'
        )
      );
    }

    ensureCaptchaConnectionHints();

    hcaptchaScriptPromise=
      new Promise(
        (
          resolve,
          reject
        )=>{
          const callbackName=
            'onDreamlandHCaptchaReady';

          let settled=false;

          const finish=
            error=>{
              if(settled){
                return;
              }

              settled=true;

              if(hcaptchaScriptTimer){
                clearTimeout(
                  hcaptchaScriptTimer
                );

                hcaptchaScriptTimer=
                  null;
              }

              if(error){
                reject(
                  error
                );
              }else{
                resolve(
                  root.hcaptcha
                );
              }
            };

          root[callbackName]=()=>{
            finish(
              root.hcaptcha
                ? null
                : createError(
                    'hCaptcha SDK unavailable.',
                    'CAPTCHA_UNAVAILABLE'
                  )
            );
          };

          let script=
            doc.getElementById?.(
              'dreamlandHcaptchaSdk'
            );

          if(!script){
            script=
              doc.createElement(
                'script'
              );

            script.id=
              'dreamlandHcaptchaSdk';

            script.async=
              true;

            script.defer=
              true;

            script.src=
              'https://js.hcaptcha.com/1/api.js'+
              '?onload='+
              callbackName+
              '&render=explicit&recaptchacompat=off';

            script.onerror=()=>{
              finish(
                createError(
                  'hCaptcha script failed to load.',
                  'CAPTCHA_LOAD_FAILED'
                )
              );
            };

            doc.head.appendChild(
              script
            );
          }

          hcaptchaScriptTimer=
            setTimeout(
              ()=>{
                finish(
                  createError(
                    'hCaptcha load timeout.',
                    'CAPTCHA_LOAD_TIMEOUT'
                  )
                );
              },
              config.hcaptchaLoadTimeoutMs
            );
        }
      )
        .catch(
          error=>{
            resetCaptchaScriptLoader();
            throw error;
          }
        );

    return hcaptchaScriptPromise;
  }

  function preloadCaptcha(){
    const navigator=
      navigatorRef();

    if(
      config.hcaptchaEnabled===
        false||
      navigator?.onLine===
        false
    ){
      return Promise.resolve(
        null
      );
    }

    return loadCaptchaScript()
      .catch(
        error=>{
          console.warn(
            'hCaptcha preload failed:',
            error
          );

          return null;
        }
      );
  }

  async function renderCaptcha(
    container,
    {
      siteKey=''
    }={}
  ){
    const key=
      text(siteKey);

    if(!container){
      return null;
    }

    if(!key){
      throw createError(
        'hCaptcha site key is missing.',
        'CAPTCHA_CONFIG_MISSING'
      );
    }

    const renderToken=
      ++hcaptchaRenderToken;

    const captcha=
      await loadCaptchaScript();

    const doc=
      documentRef();

    if(
      renderToken!==
        hcaptchaRenderToken||
      (
        doc?.body?.contains&&
        !doc.body.contains(
          container
        )
      )
    ){
      return null;
    }

    if(
      hcaptchaWidgetId!==null&&
      typeof captcha?.remove===
        'function'
    ){
      try{
        captcha.remove(
          hcaptchaWidgetId
        );
      }catch(_){}

      hcaptchaWidgetId=
        null;
    }

    container.innerHTML=
      '';

    hcaptchaResponseToken=
      '';

    if(
      !captcha||
      typeof captcha.render!==
      'function'
    ){
      throw createError(
        'hCaptcha SDK is unavailable.',
        'CAPTCHA_UNAVAILABLE'
      );
    }

    hcaptchaWidgetId=
      captcha.render(
        container,
        {
          sitekey:key,
          theme:'light',
          size:'invisible',
          'recaptchacompat':'off',

          callback(token){
            hcaptchaResponseToken=
              text(token);
          },

          'expired-callback'(){
            hcaptchaResponseToken=
              '';
          },

          'error-callback'(error){
            hcaptchaResponseToken=
              '';

            console.error(
              'hCaptcha error:',
              error
            );
          }
        }
      );

    return hcaptchaWidgetId;
  }

  function captchaToken(){
    if(hcaptchaResponseToken){
      return hcaptchaResponseToken;
    }

    if(
      hcaptchaWidgetId===
      null
    ){
      return '';
    }

    try{
      return text(
        root.hcaptcha
          ?.getResponse?.(
            hcaptchaWidgetId
          )||
        ''
      );
    }catch(_){
      return '';
    }
  }

  async function ensureCaptcha(
    {
      required=true
    }={}
  ){
    if(!required){
      return '';
    }

    const existingToken=
      captchaToken();

    if(existingToken){
      return existingToken;
    }

    if(hcaptchaExecutionPromise){
      return hcaptchaExecutionPromise;
    }

    if(
      hcaptchaWidgetId===
        null||
      !root.hcaptcha
    ){
      throw createError(
        'hCaptcha is not ready.',
        'CAPTCHA_NOT_READY'
      );
    }

    hcaptchaExecutionPromise=
      Promise.resolve()
        .then(
          ()=>root.hcaptcha.execute(
            hcaptchaWidgetId,
            {
              async:true
            }
          )
        )
        .then(
          result=>{
            hcaptchaResponseToken=
              text(
                result?.response||
                root.hcaptcha
                  ?.getResponse?.(
                    hcaptchaWidgetId
                  )||
                ''
              );

            if(!hcaptchaResponseToken){
              throw createError(
                'No hCaptcha response.',
                'CAPTCHA_NO_RESPONSE'
              );
            }

            return hcaptchaResponseToken;
          }
        )
        .finally(
          ()=>{
            hcaptchaExecutionPromise=
              null;
          }
        );

    return hcaptchaExecutionPromise;
  }

  function resetCaptcha(){
    hcaptchaResponseToken=
      '';

    hcaptchaExecutionPromise=
      null;

    if(
      hcaptchaWidgetId===
      null
    ){
      return false;
    }

    try{
      root.hcaptcha
        ?.reset?.(
          hcaptchaWidgetId
        );

      return true;
    }catch(_){
      return false;
    }
  }

  root.DreamlandRisk=
    Object.freeze({
      version:'B4-02',
      configure,
      snapshot,
      ready,
      markFormStart,
      recordInteraction,
      bindInteractionTracking,
      unbindInteractionTracking,
      recentAttempts,
      recordAttempt,
      buildContext,
      assess,
      preloadCaptcha,
      renderCaptcha,
      captchaToken,
      ensureCaptcha,
      resetCaptcha
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

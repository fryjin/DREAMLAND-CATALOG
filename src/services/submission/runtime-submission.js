(function(root){
  'use strict';

  if(root.DreamlandSubmission){
    return;
  }

  const VERSION='B4-03';
  const DEFAULT_SUBMIT_URL='/api/inquiry';
  const DEFAULT_TRANSPORT='gateway';

  let config={
    submitUrl:DEFAULT_SUBMIT_URL,
    accessKey:'',
    accessKeyEndpoint:'',
    transport:DEFAULT_TRANSPORT,
    fetchImpl:null
  };

  let directConfigPromise=null;

  function text(value){
    return String(value??'').trim();
  }

  function createError(message,code,{status=0,data=null}={}){
    const error=new Error(message||'Submission failed');
    error.name='SubmissionError';
    error.code=code||'SUBMISSION_FAILED';
    error.status=Number(status)||0;
    error.data=data;
    return error;
  }

  function configure({
    submitUrl=DEFAULT_SUBMIT_URL,
    accessKey='',
    accessKeyEndpoint='',
    transport=DEFAULT_TRANSPORT,
    fetchImpl=null
  }={}){
    const nextTransport=text(transport)||DEFAULT_TRANSPORT;

    config={
      submitUrl:text(submitUrl)||DEFAULT_SUBMIT_URL,
      accessKey:text(accessKey),
      accessKeyEndpoint:
        text(accessKeyEndpoint),
      transport:
        nextTransport==='web3forms-direct'
          ? 'web3forms-direct'
          : 'gateway',
      fetchImpl:
        typeof fetchImpl==='function'
          ? fetchImpl
          : null
    };

    directConfigPromise=null;

    return snapshot();
  }

  function snapshot(){
    return Object.freeze({
      version:VERSION,
      submitUrl:config.submitUrl,
      accessKeyEndpoint:
        config.accessKeyEndpoint,
      transport:config.transport,
      configured:ready()
    });
  }

  function fetcher(){
    if(config.fetchImpl){
      return config.fetchImpl;
    }

    if(typeof root.fetch==='function'){
      return root.fetch.bind(root);
    }

    return null;
  }

  function ready(){
    const request=fetcher();

    if(!config.submitUrl||!request){
      return false;
    }

    if(config.transport==='web3forms-direct'){
      return Boolean(
        config.accessKey||
        config.accessKeyEndpoint
      );
    }

    return true;
  }

  function assertPayload(payload){
    if(!payload||typeof payload!=='object'||Array.isArray(payload)){
      throw createError(
        'Submission payload must be an object.',
        'INVALID_PAYLOAD'
      );
    }
  }

  function buildFormData(payload,{captchaToken=''}={}){
    assertPayload(payload);

    if(typeof root.FormData!=='function'){
      throw createError(
        'FormData is unavailable.',
        'FORMDATA_UNAVAILABLE'
      );
    }

    const formData=new root.FormData();

    Object.entries(payload).forEach(([key,value])=>{
      formData.append(
        key,
        value==null?'':String(value)
      );
    });

    const token=text(captchaToken);

    if(token){
      formData.append(
        'h-captcha-response',
        token
      );
    }

    if(config.accessKey){
      formData.append(
        'access_key',
        config.accessKey
      );
    }

    return formData;
  }

  function buildGatewayBody(payload,{captchaToken=''}={}){
    assertPayload(payload);

    return Object.freeze({
      payload:{...payload},
      captcha_token:text(captchaToken)
    });
  }

  async function parseResponse(response){
    let data={};

    try{
      data=await response.json();
    }catch(_){}

    return data;
  }

  async function resolveDirectProviderConfig({
    signal
  }={}){
    if(config.accessKey){
      return Object.freeze({
        submitUrl:config.submitUrl,
        accessKey:config.accessKey
      });
    }

    const endpoint=
      text(
        config.accessKeyEndpoint
      );

    if(!endpoint){
      throw createError(
        'Browser-direct submission configuration is unavailable.',
        'DIRECT_CONFIG_NOT_CONFIGURED'
      );
    }

    if(!directConfigPromise){
      directConfigPromise=
        (async()=>{
          const response=
            await fetcher()(
              endpoint,
              {
                method:'GET',
                headers:{
                  Accept:'application/json'
                },
                cache:'no-store',
                ...(signal?{signal}:{})
              }
            );

          const data=
            await parseResponse(
              response
            );

          const accessKey=
            text(
              data.access_key
            );

          const submitUrl=
            text(
              data.submit_url
            );

          if(
            !response.ok||
            data.success!==true||
            data.transport!==
              'web3forms-direct'||
            !accessKey||
            !submitUrl
          ){
            throw createError(
              data.message||
              'Browser-direct submission configuration is unavailable.',
              text(data.code)||
              'DIRECT_CONFIG_FAILED',
              {
                status:response.status,
                data
              }
            );
          }

          config={
            ...config,
            submitUrl,
            accessKey
          };

          return Object.freeze({
            submitUrl,
            accessKey
          });
        })()
          .catch(error=>{
            directConfigPromise=null;
            throw error;
          });
    }

    return directConfigPromise;
  }

  async function submitDirect(payload,{captchaToken='',signal}={}){
    await resolveDirectProviderConfig(
      {signal}
    );
    const response=await fetcher()(
      config.submitUrl,
      {
        method:'POST',
        headers:{
          Accept:'application/json'
        },
        body:buildFormData(
          payload,
          {captchaToken}
        ),
        ...(signal?{signal}:{})
      }
    );

    const data=await parseResponse(response);

    if(!response.ok||data.success!==true){
      throw createError(
        data.message||'Submission failed',
        'SUBMISSION_FAILED',
        {
          status:response.status,
          data
        }
      );
    }

    return Object.freeze({
      success:true,
      status:Number(response.status)||0,
      responseType:'web3forms-direct',
      data
    });
  }

  async function submitGateway(payload,{captchaToken='',signal}={}){
    const response=await fetcher()(
      config.submitUrl,
      {
        method:'POST',
        headers:{
          Accept:'application/json',
          'Content-Type':'application/json'
        },
        body:JSON.stringify(
          buildGatewayBody(
            payload,
            {captchaToken}
          )
        ),
        ...(signal?{signal}:{})
      }
    );

    const data=await parseResponse(response);

    if(!response.ok||data.success!==true){
      throw createError(
        data.message||
        'Inquiry gateway rejected the submission.',
        text(data.code)||'SUBMISSION_FAILED',
        {
          status:response.status,
          data
        }
      );
    }

    return Object.freeze({
      success:true,
      status:Number(response.status)||0,
      responseType:
        text(data.response_type)||
        'dreamland-inquiry-gateway',
      data
    });
  }

  async function submit(payload,options={}){
    if(!ready()){
      throw createError(
        'Submission service is not configured.',
        'NOT_CONFIGURED'
      );
    }

    assertPayload(payload);

    return config.transport==='web3forms-direct'
      ? submitDirect(payload,options)
      : submitGateway(payload,options);
  }

  root.DreamlandSubmission=Object.freeze({
    version:VERSION,
    configure,
    snapshot,
    ready,
    buildFormData,
    buildGatewayBody,
    submit
  });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

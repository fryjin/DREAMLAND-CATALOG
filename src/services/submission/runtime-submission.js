(function(root){
  'use strict';

  if(root.DreamlandSubmission){
    return;
  }

  const DEFAULT_SUBMIT_URL=
    'https://api.web3forms.com/submit';

  let config={
    submitUrl:DEFAULT_SUBMIT_URL,
    accessKey:'',
    fetchImpl:null
  };

  function text(value){
    return String(
      value??''
    ).trim();
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
        'Submission failed'
      );

    error.name=
      'SubmissionError';

    error.code=
      code||
      'SUBMISSION_FAILED';

    error.status=
      Number(status)||0;

    error.data=
      data;

    return error;
  }

  function configure(
    {
      submitUrl=DEFAULT_SUBMIT_URL,
      accessKey='',
      fetchImpl=null
    }={}
  ){
    config={
      submitUrl:
        text(submitUrl)||
        DEFAULT_SUBMIT_URL,
      accessKey:
        text(accessKey),
      fetchImpl:
        typeof fetchImpl==='function'
          ? fetchImpl
          : null
    };

    return snapshot();
  }

  function snapshot(){
    return Object.freeze({
      submitUrl:config.submitUrl,
      configured:Boolean(
        config.submitUrl&&
        config.accessKey
      )
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
    return Boolean(
      config.submitUrl&&
      config.accessKey&&
      fetcher()
    );
  }

  function assertPayload(payload){
    if(
      !payload||
      typeof payload!=='object'||
      Array.isArray(payload)
    ){
      throw createError(
        'Submission payload must be an object.',
        'INVALID_PAYLOAD'
      );
    }
  }

  function buildFormData(
    payload,
    {
      captchaToken=''
    }={}
  ){
    assertPayload(payload);

    if(
      typeof root.FormData!==
      'function'
    ){
      throw createError(
        'FormData is unavailable.',
        'FORMDATA_UNAVAILABLE'
      );
    }

    const formData=
      new root.FormData();

    Object.entries(payload)
      .forEach(
        ([key,value])=>
          formData.append(
            key,
            value==null
              ? ''
              : String(value)
          )
      );

    const token=
      text(captchaToken);

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

  async function submit(
    payload,
    {
      captchaToken='',
      signal
    }={}
  ){
    if(!ready()){
      throw createError(
        'Submission service is not configured.',
        'NOT_CONFIGURED'
      );
    }

    const response=
      await fetcher()(
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
      data.success!==true
    ){
      throw createError(
        data.message||
        'Submission failed',
        'SUBMISSION_FAILED',
        {
          status:response.status,
          data
        }
      );
    }

    return Object.freeze({
      success:true,
      status:
        Number(response.status)||
        0,
      responseType:
        'web3forms-direct',
      data
    });
  }

  root.DreamlandSubmission=
    Object.freeze({
      version:'B4-01',
      configure,
      snapshot,
      ready,
      buildFormData,
      submit
    });
})(
  typeof globalThis!=='undefined'
    ? globalThis
    : this
);

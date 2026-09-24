const DEFAULT_PROVIDER_URL=
  'https://api.web3forms.com/submit';

const SUBMIT_WINDOW_SECONDS=600;
const SUBMIT_LIMIT=5;
const DUPLICATE_WINDOW_SECONDS=60;

function json(data,status=200){
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff'
      }
    }
  );
}

function asText(value,max=10000){
  return String(value??'').trim().slice(0,max);
}

function asNumber(value,fallback=0){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:fallback;
}

function isEmail(value){
  const email=asText(value,320);
  const at=email.indexOf('@');
  const dot=email.lastIndexOf('.');
  return at>0&&dot>at+1&&dot<email.length-1;
}

function normalizeInquiryId(value){
  const inquiryId=asText(value,120);

  return /^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/.test(inquiryId)
    ? inquiryId
    : '';
}

function validatePayload(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)){
    return 'Missing payload';
  }

  if(!normalizeInquiryId(payload.inquiry_id)){
    return 'Invalid inquiry id';
  }

  if(asText(payload.contact_name,160).length<2){
    return 'Invalid contact name';
  }

  if(!asText(payload.country_or_region,160)){
    return 'Missing country or region';
  }

  if(!isEmail(payload.email_address)){
    return 'Invalid email address';
  }

  if(asText(payload.phone_or_wechat,200).length<5){
    return 'Invalid contact method';
  }

  const count=
    asNumber(payload.product_count)+
    asNumber(payload.custom_count);

  if(count<1){
    return 'Inquiry is empty';
  }

  if(asText(payload.items_summary,50000).length<5){
    return 'Inquiry summary is missing';
  }

  return '';
}

function assertSameOrigin(request){
  const origin=request.headers.get('Origin');

  if(!origin){
    return true;
  }

  try{
    return origin===new URL(request.url).origin;
  }catch(_){
    return false;
  }
}

async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);

  return [...new Uint8Array(digest)]
    .map(byte=>byte.toString(16).padStart(2,'0'))
    .join('');
}

async function submissionKeys(request,payload){
  const ip=asText(
    request.headers.get('CF-Connecting-IP')||'unknown',
    128
  );

  const email=asText(payload.email_address,320).toLowerCase();
  const summary=asText(payload.items_summary,50000);

  const [ipHash,contentHash]=await Promise.all([
    sha256(ip),
    sha256(email+'|'+summary)
  ]);

  return {
    ipKey:'submit:ip:'+ipHash,
    contentKey:'submit:content:'+contentHash
  };
}

async function assessmentDecisionKey(
  payload
){
  const inquiryId=
    normalizeInquiryId(
      payload?.inquiry_id
    );

  if(!inquiryId){
    return '';
  }

  return (
    'assessment:'+
    await sha256(
      inquiryId
    )
  );
}

async function readAssessmentDecision(
  env,
  payload
){
  const store=
    env.RISK_STORE;

  if(
    !store||
    typeof store.get!=='function'
  ){
    return null;
  }

  try{
    const key=
      await assessmentDecisionKey(
        payload
      );

    if(!key){
      return null;
    }

    const raw=
      await store.get(
        key
      );

    if(!raw){
      return null;
    }

    const value=
      JSON.parse(raw);

    return {
      captchaRequired:
        value?.captcha_required===true,
      recordedAt:
        asNumber(
          value?.recorded_at,
          0
        )
    };
  }catch(error){
    console.error(
      'Risk assessment decision read failed:',
      error
    );

    return null;
  }
}

async function enforceSubmissionRate(env,request,payload){
  const store=env.RISK_STORE;

  if(!store||typeof store.get!=='function'){
    return {
      store:null,
      keys:null,
      ipCount:0,
      duplicateCount:0
    };
  }

  try{
    const keys=await submissionKeys(request,payload);

    const [ipRaw,duplicateRaw]=await Promise.all([
      store.get(keys.ipKey),
      store.get(keys.contentKey)
    ]);

    const ipCount=asNumber(ipRaw);
    const duplicateCount=asNumber(duplicateRaw);

    if(ipCount>=SUBMIT_LIMIT){
      return {
        blocked:true,
        code:'RATE_LIMITED',
        status:429,
        store,
        keys,
        ipCount,
        duplicateCount
      };
    }

    if(duplicateCount>=1){
      return {
        blocked:true,
        code:'DUPLICATE_SUBMISSION',
        status:409,
        store,
        keys,
        ipCount,
        duplicateCount
      };
    }

    return {
      blocked:false,
      store,
      keys,
      ipCount,
      duplicateCount
    };
  }catch(error){
    console.error('Submission rate check failed:',error);

    return {
      blocked:false,
      store:null,
      keys:null,
      ipCount:0,
      duplicateCount:0
    };
  }
}

async function recordSubmissionRate(rate){
  if(
    !rate?.store||
    !rate?.keys||
    typeof rate.store.put!=='function'
  ){
    return null;
  }

  const writes=await Promise.allSettled([
    rate.store.put(
      rate.keys.ipKey,
      String(rate.ipCount+1),
      {expirationTtl:SUBMIT_WINDOW_SECONDS}
    ),
    rate.store.put(
      rate.keys.contentKey,
      '1',
      {expirationTtl:DUPLICATE_WINDOW_SECONDS}
    )
  ]);

  return writes.every(item=>item.status==='fulfilled');
}

async function verifyCaptcha(env,token,request){
  const secret=
    asText(
      env.HCAPTCHA_SECRET,
      300
    );

  const value=
    asText(
      token,
      5000
    );

  if(!secret){
    return {
      checked:false,
      success:false,
      configured:false,
      missingToken:
        !value
    };
  }

  if(!value){
    return {
      checked:false,
      success:false,
      configured:true,
      missingToken:true
    };
  }

  const form=new URLSearchParams();
  form.set('secret',secret);
  form.set('response',value);

  const ip=asText(
    request.headers.get('CF-Connecting-IP'),
    128
  );

  if(ip){
    form.set('remoteip',ip);
  }

  const response=await fetch(
    'https://api.hcaptcha.com/siteverify',
    {
      method:'POST',
      headers:{
        'Content-Type':
          'application/x-www-form-urlencoded'
      },
      body:form.toString()
    }
  );

  let data={};

  try{
    data=await response.json();
  }catch(_){}

  return {
    checked:true,
    success:
      response.ok&&
      data.success===true,
    data
  };
}

function providerFormData(payload,accessKey,captchaToken){
  const formData=new FormData();

  for(const [key,value] of Object.entries(payload)){
    formData.append(
      key,
      value==null?'':String(value)
    );
  }

  formData.append(
    'access_key',
    accessKey
  );

  if(captchaToken){
    formData.append(
      'h-captcha-response',
      captchaToken
    );
  }

  return formData;
}

export async function onRequestGet(
  context
){
  const request=
    context?.request;

  const env=
    context?.env||{};

  const accessKey=
    asText(
      env.WEB3FORMS_ACCESS_KEY,
      500
    );

  const providerUrl=
    asText(
      env.WEB3FORMS_SUBMIT_URL,
      1000
    )||
    DEFAULT_PROVIDER_URL;

  const clientConfig=
    request&&
    new URL(
      request.url
    ).searchParams.get(
      'client_config'
    )==='1';

  if(clientConfig){
    if(!accessKey){
      return json(
        {
          success:false,
          code:'PROVIDER_NOT_CONFIGURED',
          message:'Inquiry delivery service is not configured.'
        },
        503
      );
    }

    /*
     * Browser-direct Web3Forms transport requires the access key in the
     * browser request. It is a provider routing credential, not a server
     * secret. Keep hCaptcha secret / KV / other server credentials private.
     */
    return json({
      success:true,
      service:'dreamland-inquiry-client-config',
      transport:'web3forms-direct',
      submit_url:providerUrl,
      access_key:accessKey
    });
  }

  return json({
    success:true,
    service:'dreamland-inquiry-gateway',
    status:'ready',
    provider_configured:
      Boolean(
        accessKey
      ),
    hcaptcha_secret_configured:
      Boolean(
        asText(
          env.HCAPTCHA_SECRET,
          300
        )
      ),
    risk_store_configured:
      Boolean(
        env.RISK_STORE&&
        typeof env.RISK_STORE.get==='function'
      )
  });
}

export async function onRequestPost(context){
  const {request,env}=context;

  if(!assertSameOrigin(request)){
    return json(
      {
        success:false,
        code:'ORIGIN_REJECTED',
        message:'Request origin is not allowed.'
      },
      403
    );
  }

  let body;

  try{
    body=await request.json();
  }catch(_){
    return json(
      {
        success:false,
        code:'INVALID_JSON',
        message:'Invalid JSON body.'
      },
      400
    );
  }

  const payload=body?.payload;
  const captchaToken=
    asText(body?.captcha_token,5000);

  const validationError=validatePayload(payload);

  if(validationError){
    return json(
      {
        success:false,
        code:'INVALID_PAYLOAD',
        message:validationError
      },
      400
    );
  }

  const rate=await enforceSubmissionRate(
    env,
    request,
    payload
  );

  if(rate.blocked){
    return json(
      {
        success:false,
        code:rate.code,
        message:
          rate.code==='DUPLICATE_SUBMISSION'
            ? 'This inquiry was submitted very recently.'
            : 'Too many inquiry submissions. Please try again later.'
      },
      rate.status
    );
  }

  const assessment=
    await readAssessmentDecision(
      env,
      payload
    );

  if(
    assessment?.captchaRequired===true&&
    !captchaToken
  ){
    return json(
      {
        success:false,
        code:'CAPTCHA_REQUIRED',
        message:'Security verification is required.'
      },
      403
    );
  }

  if(
    assessment?.captchaRequired===true||
    captchaToken
  ){
    const captcha=
      await verifyCaptcha(
        env,
        captchaToken,
        request
      );

    if(
      captcha.configured===false
    ){
      return json(
        {
          success:false,
          code:'CAPTCHA_NOT_CONFIGURED',
          message:'Security verification service is not configured.'
        },
        503
      );
    }

    if(!captcha.success){
      return json(
        {
          success:false,
          code:'CAPTCHA_FAILED',
          message:'Security verification failed.'
        },
        403
      );
    }
  }

  const accessKey=
    asText(
      env.WEB3FORMS_ACCESS_KEY,
      500
    );

  if(!accessKey){
    return json(
      {
        success:false,
        code:'PROVIDER_NOT_CONFIGURED',
        message:'Inquiry delivery service is not configured.'
      },
      503
    );
  }

  const providerUrl=
    asText(
      env.WEB3FORMS_SUBMIT_URL,
      1000
    )||
    DEFAULT_PROVIDER_URL;

  let providerResponse;

  try{
    providerResponse=await fetch(
      providerUrl,
      {
        method:'POST',
        headers:{
          Accept:'application/json'
        },
        body:providerFormData(
          payload,
          accessKey,
          captchaToken
        )
      }
    );
  }catch(error){
    console.error('Inquiry provider request failed:',error);

    return json(
      {
        success:false,
        code:'PROVIDER_UNREACHABLE',
        message:'Inquiry delivery service is temporarily unavailable.'
      },
      502
    );
  }

  let providerData={};

  try{
    providerData=await providerResponse.json();
  }catch(_){}

  if(
    !providerResponse.ok||
    providerData.success!==true
  ){
    console.error(
      'Inquiry provider rejected request:',
      providerResponse.status,
      providerData?.message||''
    );

    return json(
      {
        success:false,
        code:'PROVIDER_REJECTED',
        message:
          providerData?.message||
          'Inquiry delivery was rejected.'
      },
      502
    );
  }

  await recordSubmissionRate(rate);

  return json({
    success:true,
    response_type:'web3forms-gateway',
    inquiry_id:
      normalizeInquiryId(
        payload.inquiry_id
      ),
    provider_status:
      Number(providerResponse.status)||200
  });
}

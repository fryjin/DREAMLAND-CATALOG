const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

const DEFAULT_RISK_THRESHOLD = 3;
const IP_WINDOW_SECONDS = 600;
const DUPLICATE_WINDOW_SECONDS = 3600;

function json(data, status = 200) {
return new Response(JSON.stringify(data), {
status,
headers: {
'Content-Type': 'application/json; charset=utf-8',
'Cache-Control': 'no-store',
'X-Content-Type-Options': 'nosniff'
}
});
}

function asNumber(value, fallback = 0) {
const parsed = Number(value);
return Number.isFinite(parsed) ? parsed : fallback;
}

function asText(value, max = 10000) {
return String(value ?? '').trim().slice(0, max);
}

function isEmail(value) {
return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(
asText(value, 320)
);
}

function countUrls(value) {
return (
asText(value, 50000).match(/https?:///gi) || []
).length;
}

async function sha256(value) {
const bytes = new TextEncoder().encode(value);
const digest = await crypto.subtle.digest(
'SHA-256',
bytes
);

return [...new Uint8Array(digest)]
.map((byte) =>
byte.toString(16).padStart(2, '0')
)
.join('');
}

function validatePayload(payload) {
if (!payload || typeof payload !== 'object') {
return 'Missing payload';
}

if (asText(payload.contact_name, 160).length < 2) {
return 'Invalid contact name';
}

if (!asText(payload.country_or_region, 160)) {
return 'Missing country or region';
}

if (!isEmail(payload.email_address)) {
return 'Invalid email address';
}

if (
asText(payload.phone_or_wechat, 200).length < 5
) {
return 'Invalid contact method';
}

const inquiryCount =
asNumber(payload.product_count) +
asNumber(payload.custom_count);

if (inquiryCount < 1) {
return 'Inquiry is empty';
}

if (
asText(payload.items_summary, 50000).length < 5
) {
return 'Inquiry summary is missing';
}

return '';
}

function evaluateRisk(request, body) {
const payload = body.payload || {};
const risk = body.risk || {};
const reasons = [];

let score = 0;

const add = (points, reason) => {
score += points;
reasons.push(reason);
};

const origin = request.headers.get('Origin');
const ownOrigin = new URL(request.url).origin;

if (origin && origin !== ownOrigin) {
add(5, 'origin_mismatch');
}

if (!request.headers.get('User-Agent')) {
add(2, 'missing_user_agent');
}

if (
asNumber(risk.session_elapsed_ms) < 15000
) {
add(2, 'very_fast_session');
}

if (
asNumber(risk.form_elapsed_ms) < 8000
) {
add(2, 'very_fast_form');
}

if (
asNumber(risk.interaction_count) < 3
) {
add(1, 'few_interactions');
}

if (
asNumber(risk.local_attempt_count) >= 2
) {
add(2, 'repeated_local_attempts');
}

if (
countUrls(payload.message) +
countUrls(payload.items_summary) >
2
) {
add(2, 'many_urls');
}

if (
JSON.stringify(payload).length > 60000
) {
add(2, 'oversized_payload');
}

return {
score,
reasons,
storage: null,
riskStoreRead: null
};
}

async function readPersistentRisk(
env,
request,
body,
result
) {
const store = env.RISK_STORE;

if (!store || typeof store.get !== 'function') {
return result;
}

try {
const ip = asText(
request.headers.get('CF-Connecting-IP') ||
'unknown',
128
);

```
const email = asText(
  body.payload?.email_address,
  320
).toLowerCase();

const signature = asText(
  body.payload?.items_summary,
  50000
);

const [ipHash, duplicateHash] =
  await Promise.all([
    sha256(ip),
    sha256(`${email}|${signature}`)
  ]);

const ipKey = `ip:${ipHash}`;
const duplicateKey = `dup:${duplicateHash}`;

const [ipRaw, duplicateRaw] =
  await Promise.all([
    store.get(ipKey),
    store.get(duplicateKey)
  ]);

const ipCount = asNumber(ipRaw);
const duplicateCount =
  asNumber(duplicateRaw);

if (ipCount >= 2) {
  result.score += 3;
  result.reasons.push('ip_rate_limit');
}

if (duplicateCount >= 1) {
  result.score += 2;
  result.reasons.push(
    'duplicate_submission'
  );
}

result.storage = {
  ipKey,
  duplicateKey,
  ipCount,
  duplicateCount
};

result.riskStoreRead = true;
```

} catch (error) {
console.error(
'RISK_STORE read failed:',
error
);

```
result.storage = null;
result.riskStoreRead = false;
```

}

return result;
}

async function recordPersistentRisk(env, result) {
const store = env.RISK_STORE;

if (
!store ||
typeof store.put !== 'function' ||
!result.storage
) {
return null;
}

const writes = await Promise.allSettled([
store.put(
result.storage.ipKey,
String(result.storage.ipCount + 1),
{
expirationTtl: IP_WINDOW_SECONDS
}
),

```
store.put(
  result.storage.duplicateKey,
  String(
    result.storage.duplicateCount + 1
  ),
  {
    expirationTtl:
      DUPLICATE_WINDOW_SECONDS
  }
)
```

]);

const failed = writes.filter(
(item) => item.status === 'rejected'
);

if (failed.length > 0) {
console.error(
'RISK_STORE write failed:',
failed.map((item) => item.reason)
);

```
return false;
```

}

return true;
}

async function verifyHCaptcha(
env,
token,
request
) {
if (
!env.HCAPTCHA_SECRET ||
!env.HCAPTCHA_SITE_KEY
) {
return {
success: false,
configurationError: true,
errors: [
'missing-server-configuration'
]
};
}

const form = new URLSearchParams({
secret: env.HCAPTCHA_SECRET,
response: token,
sitekey: env.HCAPTCHA_SITE_KEY
});

const remoteIp = request.headers.get(
'CF-Connecting-IP'
);

if (remoteIp) {
form.set('remoteip', remoteIp);
}

try {
const response = await fetch(
HCAPTCHA_VERIFY_URL,
{
method: 'POST',
headers: {
'Content-Type':
'application/x-www-form-urlencoded'
},
body: form
}
);

```
const responseText =
  await response.text();

let data = {};

try {
  data = responseText
    ? JSON.parse(responseText)
    : {};
} catch (_) {
  data = {};
}

if (!response.ok) {
  return {
    success: false,
    errors: [
      `siteverify-http-${response.status}`
    ]
  };
}

return {
  success: data.success === true,
  errors: data['error-codes'] || []
};
```

} catch (error) {
console.error(
'hCaptcha verification request failed:',
error
);

```
return {
  success: false,
  errors: ['siteverify-network-error']
};
```

}
}

async function forwardToWeb3Forms(
env,
payload
) {
if (!env.WEB3FORMS_ACCESS_KEY) {
throw new Error(
'WEB3FORMS_ACCESS_KEY is not configured'
);
}

const form = new FormData();

form.append(
'access_key',
env.WEB3FORMS_ACCESS_KEY
);

for (
const [key, value] of
Object.entries(payload)
) {
if (key === 'access_key') {
continue;
}

```
form.append(
  key,
  value &&
    typeof value === 'object'
    ? JSON.stringify(value)
    : String(value ?? '')
);
```

}

const response = await fetch(
WEB3FORMS_URL,
{
method: 'POST',
headers: {
Accept: 'application/json'
},
body: form
}
);

const responseText =
await response.text();

let data = null;

if (responseText.trim()) {
try {
data = JSON.parse(responseText);
} catch (_) {
data = null;
}
}

/*

* HTTP状态码不是2xx时，才视为上游请求失败。
  */
  if (!response.ok) {
  throw new Error(
  data?.message ||
  `Web3Forms server returned status ${response.status}`
  );
  }

/*

* Web3Forms明确返回success:false时，
* 才判定为业务失败。
*
* 2xx空响应、HTML响应或不含success字段的JSON，
* 均视为上游已经接收成功。
  */
  if (data?.success === false) {
  throw new Error(
  data.message ||
  'Web3Forms flagged submission as failed'
  );
  }

return {
accepted: true,
status: response.status,
responseType: data
? 'json'
: responseText.trim()
? 'non-json'
: 'empty'
};
}

export async function onRequestGet() {
return json({
success: true,
service: 'dreamland-submit',
status: 'ready'
});
}

export async function onRequestPost(
context
) {
const { request, env } = context;

let body;

try {
body = await request.json();
} catch (_) {
return json(
{
success: false,
message: 'Invalid JSON body'
},
400
);
}

const validationError =
validatePayload(body.payload);

if (validationError) {
return json(
{
success: false,
message: validationError
},
400
);
}

/*

* 蜜罐字段被填写时，静默过滤垃圾请求。
  */
  if (asText(body.website, 500)) {
  return json({
  success: true,
  filtered: true
  });
  }

let result = evaluateRisk(
request,
body
);

/*

* KV读取失败只会跳过服务器端风险记录，
* 不会阻止正常询盘提交。
  */
  result = await readPersistentRisk(
  env,
  request,
  body,
  result
  );

const threshold = Math.max(
1,
asNumber(
env.RISK_THRESHOLD,
DEFAULT_RISK_THRESHOLD
)
);

const captchaRequired =
result.score >= threshold;

const assessment = {
success: true,
captcha_required: captchaRequired,
risk_score: result.score,
reasons: result.reasons,
site_key: captchaRequired
? asText(
env.HCAPTCHA_SITE_KEY,
200
)
: ''
};

if (body.action === 'assess') {
return json(assessment);
}

if (body.action !== 'submit') {
return json(
{
success: false,
message: 'Unsupported action'
},
400
);
}

if (captchaRequired) {
const token = asText(
body.hcaptcha_token,
10000
);

```
if (!token) {
  return json(
    {
      ...assessment,
      success: false,
      message: 'CAPTCHA required'
    },
    428
  );
}

const verification =
  await verifyHCaptcha(
    env,
    token,
    request
  );

if (!verification.success) {
  return json(
    {
      ...assessment,
      success: false,
      message:
        verification.configurationError
          ? 'CAPTCHA server configuration is missing'
          : 'CAPTCHA verification failed',
      captcha_errors:
        verification.errors
    },
    verification.configurationError
      ? 500
      : 403
  );
}
```

}

try {
/*
* 只有Web3Forms真正失败时，
* 才向客户返回提交失败。
*/
const web3forms =
await forwardToWeb3Forms(
env,
body.payload
);

```
/*
 * KV属于辅助风控。
 * 即使记录失败，也不会改变提交成功结果。
 */
const riskRecorded =
  await recordPersistentRisk(
    env,
    result
  );

return json({
  success: true,
  captcha_used: captchaRequired,
  risk_score: result.score,
  risk_store_read:
    result.riskStoreRead,
  risk_recorded: riskRecorded,
  submission: web3forms
});
```

} catch (error) {
console.error(
'Web3Forms submission failed:',
error
);

```
return json(
  {
    success: false,
    message:
      'Submission service failed'
  },
  502
)

}
}

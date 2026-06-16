const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

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

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value, max = 10000) {
  return String(value ?? '').trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value, 320));
}

function countUrls(value) {
  return (text(value, 50000).match(/https?:\/\//gi) || []).length;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Missing payload';
  }

  if (text(payload.contact_name, 160).length < 2) {
    return 'Invalid contact name';
  }

  if (!text(payload.country_or_region, 160)) {
    return 'Missing country or region';
  }

  if (!isEmail(payload.email_address)) {
    return 'Invalid email address';
  }

  if (text(payload.phone_or_wechat, 200).length < 5) {
    return 'Invalid contact method';
  }

  if (
    number(payload.product_count) +
      number(payload.custom_count) <
    1
  ) {
    return 'Inquiry is empty';
  }

  if (text(payload.items_summary, 50000).length < 5) {
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

  if (number(risk.session_elapsed_ms) < 15000) {
    add(2, 'very_fast_session');
  }

  if (number(risk.form_elapsed_ms) < 8000) {
    add(2, 'very_fast_form');
  }

  if (number(risk.interaction_count) < 3) {
    add(1, 'few_interactions');
  }

  if (number(risk.local_attempt_count) >= 2) {
    add(2, 'repeated_local_attempts');
  }

  if (
    countUrls(payload.message) +
      countUrls(payload.items_summary) >
    2
  ) {
    add(2, 'many_urls');
  }

  if (JSON.stringify(payload).length > 60000) {
    add(2, 'oversized_payload');
  }

  return {
    score,
    reasons
  };
}

/**
 * 读取服务器端风险记录。
 *
 * KV属于辅助风控组件。
 * 即使KV暂时不可用，也不能阻止正常询盘提交。
 */
async function readPersistentRisk(env, request, body, result) {
  if (!env.RISK_STORE) {
    return result;
  }

  try {
    const ip = text(
      request.headers.get('CF-Connecting-IP') || 'unknown',
      128
    );

    const email = text(
      body.payload?.email_address || '',
      320
    ).toLowerCase();

    const signature = text(
      body.payload?.items_summary || '',
      50000
    );

    const ipKey = `ip:${await sha256(ip)}`;
    const duplicateKey = `dup:${await sha256(
      `${email}|${signature}`
    )}`;

    const ipCount = number(
      await env.RISK_STORE.get(ipKey)
    );

    const duplicateCount = number(
      await env.RISK_STORE.get(duplicateKey)
    );

    if (ipCount >= 2) {
      result.score += 3;
      result.reasons.push('ip_rate_limit');
    }

    if (duplicateCount >= 1) {
      result.score += 2;
      result.reasons.push('duplicate_submission');
    }

    result.storage = {
      ipKey,
      duplicateKey,
      ipCount,
      duplicateCount
    };

    result.riskStoreRead = true;
  } catch (error) {
    console.error('RISK_STORE read failed:', error);

    result.riskStoreRead = false;
    result.storage = null;
  }

  return result;
}

/**
 * 写入服务器端风险记录。
 *
 * 返回值：
 * true  = KV记录成功
 * false = KV写入失败
 * null  = 没有绑定KV或没有可写入的数据
 *
 * 无论结果如何，都不会抛出错误影响邮件提交。
 */
async function recordPersistentRisk(env, result) {
  if (!env.RISK_STORE || !result.storage) {
    return null;
  }

  try {
    await Promise.all([
      env.RISK_STORE.put(
        result.storage.ipKey,
        String(result.storage.ipCount + 1),
        {
          expirationTtl: 600
        }
      ),

      env.RISK_STORE.put(
        result.storage.duplicateKey,
        String(result.storage.duplicateCount + 1),
        {
          expirationTtl: 3600
        }
      )
    ]);

    return true;
  } catch (error) {
    console.error('RISK_STORE write failed:', error);
    return false;
  }
}

async function verifyHCaptcha(env, token, request) {
  if (!env.HCAPTCHA_SECRET || !env.HCAPTCHA_SITE_KEY) {
    return {
      success: false,
      configuration_error: true,
      error_codes: ['missing-server-configuration']
    };
  }

  const form = new URLSearchParams();

  form.set('secret', env.HCAPTCHA_SECRET);
  form.set('response', token);
  form.set('sitekey', env.HCAPTCHA_SITE_KEY);

  const remoteip = request.headers.get(
    'CF-Connecting-IP'
  );

  if (remoteip) {
    form.set('remoteip', remoteip);
  }

  const response = await fetch(HCAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type':
        'application/x-www-form-urlencoded'
    },
    body: form
  });

  if (!response.ok) {
    return {
      success: false,
      error_codes: [
        `siteverify-http-${response.status}`
      ]
    };
  }

  return response.json();
}

async function forwardToWeb3Forms(env, payload) {
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

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'access_key') {
      continue;
    }

    form.append(
      key,
      value && typeof value === 'object'
        ? JSON.stringify(value)
        : String(value ?? '')
    );
  }

  const response = await fetch(WEB3FORMS_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    },
    body: form
  });

  // 1. 如果 HTTP 状态码不是 2xx 成功状态，说明请求底层失败了，直接抛错
  if (!response.ok) {
    throw new Error(`Web3Forms server returned status ${response.status}`);
  }

  // 2. 先安全地以字符串形式读取响应体，防止非 JSON 格式引发崩溃
  const responseText = await response.text();
  let data = {};

  try {
    data = JSON.parse(responseText);
  } catch (_) {
    // 如果 Web3Forms 启用了重定向导致返回了 HTML 文本
    // 但既然前面 response.ok 是 true，说明 Web3Forms 已经成功收妥了表单，可以直接判为成功
    console.warn('Web3Forms response is not valid JSON, but status is OK. Assuming success.');
    return { success: true, redirected: true };
  }

  // 3. 如果成功解析了 JSON，但 Web3Forms 明确返回 success: false，则抛出对应的错误
  if (data.success === false) {
    throw new Error(data.message || 'Web3Forms flagged submission as failed');
  }

  return data;
}

export async function onRequestGet() {
  return json({
    success: true,
    service: 'dreamland-submit',
    status: 'ready'
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body = {};

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

  const validationError = validatePayload(
    body.payload
  );

  if (validationError) {
    return json(
      {
        success: false,
        message: validationError
      },
      400
    );
  }

  // 隐藏蜜罐字段被填写，按垃圾请求静默过滤。
  if (text(body.website, 500)) {
    return json({
      success: true,
      filtered: true
    });
  }

  let result = evaluateRisk(request, body);

  // KV读取失败时，只跳过服务器端重复风险判断。
  result = await readPersistentRisk(
    env,
    request,
    body,
    result
  );

  const threshold = Math.max(
    1,
    number(env.RISK_THRESHOLD, 3)
  );

  const captchaRequired =
    result.score >= threshold;

  const assessment = {
    success: true,
    captcha_required: captchaRequired,
    risk_score: result.score,
    reasons: result.reasons,
    site_key: captchaRequired
      ? text(env.HCAPTCHA_SITE_KEY, 200)
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
    const token = text(
      body.hcaptcha_token,
      10000
    );

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

    const verification = await verifyHCaptcha(
      env,
      token,
      request
    );

    if (!verification.success) {
      const status =
        verification.configuration_error
          ? 500
          : 403;

      return json(
        {
          ...assessment,

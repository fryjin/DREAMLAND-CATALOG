const DEFAULT_RISK_THRESHOLD = 3;
const IP_WINDOW_SECONDS = 600;
const CONTENT_RISK_WINDOW_SECONDS = 3600;
const RAPID_CONTENT_WINDOW_SECONDS = 60;

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
  const email = asText(value, 320);
  const atIndex = email.indexOf('@');
  const dotIndex = email.lastIndexOf('.');
  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
}

function countUrls(value) {
  const content = asText(value, 50000).toLowerCase();
  return content.split('http://').length - 1 + content.split('https://').length - 1;
}

function normalizeInquiryId(value) {
  const inquiryId = asText(value, 120);
  return /^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/.test(inquiryId) ? inquiryId : '';
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Missing payload';
  if (!normalizeInquiryId(payload.inquiry_id)) return 'Invalid inquiry id';
  if (asText(payload.contact_name, 160).length < 2) return 'Invalid contact name';
  if (!asText(payload.country_or_region, 160)) return 'Missing country or region';
  if (!isEmail(payload.email_address)) return 'Invalid email address';
  if (asText(payload.phone_or_wechat, 200).length < 5) return 'Invalid contact method';

  const inquiryCount =
    asNumber(payload.product_count) +
    asNumber(payload.custom_count);

  if (inquiryCount < 1) return 'Inquiry is empty';
  if (asText(payload.items_summary, 50000).length < 5) {
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

  if (origin && origin !== ownOrigin) add(5, 'origin_mismatch');
  if (!request.headers.get('User-Agent')) add(2, 'missing_user_agent');
  if (asNumber(risk.session_elapsed_ms) < 15000) add(2, 'very_fast_session');
  if (asNumber(risk.form_elapsed_ms) < 8000) add(2, 'very_fast_form');
  if (asNumber(risk.interaction_count) < 3) add(1, 'few_interactions');
  if (asNumber(risk.local_attempt_count) >= 2) add(2, 'repeated_local_attempts');

  const urlCount =
    countUrls(payload.message) +
    countUrls(payload.items_summary);

  if (urlCount > 2) add(2, 'many_urls');
  if (JSON.stringify(payload).length > 60000) add(2, 'oversized_payload');

  return {
    score,
    reasons,
    storage: null,
    riskStoreRead: null
  };
}

function buildContentSignature(payload) {
  return [
    asText(payload?.email_address, 320).toLowerCase(),
    asText(payload?.items_summary, 50000),
    asText(payload?.message, 10000),
    asText(payload?.product_count, 50),
    asText(payload?.custom_count, 50)
  ].join('|');
}

async function readPersistentRisk(env, request, body, result) {
  const store = env.RISK_STORE;
  if (!store || typeof store.get !== 'function') return result;

  try {
    const ip = asText(request.headers.get('CF-Connecting-IP') || 'unknown', 128);
    const signature = buildContentSignature(body.payload);
    const [ipHash, contentHash] = await Promise.all([
      sha256(ip),
      sha256(signature)
    ]);

    const ipKey = 'ip:' + ipHash;
    const contentKey = 'content:' + contentHash;
    const rapidContentKey = 'rapid:' + contentHash;

    const [ipRaw, contentRaw, rapidRaw] = await Promise.all([
      store.get(ipKey),
      store.get(contentKey),
      store.get(rapidContentKey)
    ]);

    const ipCount = asNumber(ipRaw);
    const contentCount = asNumber(contentRaw);
    const rapidContentCount = asNumber(rapidRaw);

    if (ipCount >= 2) {
      result.score += 3;
      result.reasons.push('ip_rate_limit');
    }
    if (contentCount >= 1) {
      result.score += 1;
      result.reasons.push('repeated_content');
    }
    if (rapidContentCount >= 1) {
      result.score += 2;
      result.reasons.push('rapid_repeated_content');
    }

    result.storage = {
      ipKey,
      contentKey,
      rapidContentKey,
      ipCount,
      contentCount,
      rapidContentCount
    };
    result.riskStoreRead = true;
  } catch (error) {
    console.error('RISK_STORE read failed:', error);
    result.storage = null;
    result.riskStoreRead = false;
  }

  return result;
}

async function recordPersistentRisk(env, result) {
  const store = env.RISK_STORE;
  if (!store || typeof store.put !== 'function' || !result.storage) return null;

  const writes = await Promise.allSettled([
    store.put(
      result.storage.ipKey,
      String(result.storage.ipCount + 1),
      { expirationTtl: IP_WINDOW_SECONDS }
    ),
    store.put(
      result.storage.contentKey,
      String(result.storage.contentCount + 1),
      { expirationTtl: CONTENT_RISK_WINDOW_SECONDS }
    ),
    store.put(
      result.storage.rapidContentKey,
      String(result.storage.rapidContentCount + 1),
      { expirationTtl: RAPID_CONTENT_WINDOW_SECONDS }
    )
  ]);

  const failed = writes.filter((item) => item.status === 'rejected');
  if (failed.length) {
    console.error(
      'RISK_STORE write failed:',
      failed.map((item) => item.reason)
    );
    return false;
  }
  return true;
}

export async function onRequestGet() {
  return json({
    success: true,
    service: 'dreamland-risk-assessment',
    status: 'ready'
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ success: false, message: 'Invalid JSON body' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return json({ success: false, message: 'Invalid request body' }, 400);
  }

  if (body.action !== 'assess') {
    return json({ success: false, message: 'Unsupported action' }, 400);
  }

  if (asText(body.website, 500)) {
    return json({
      success: true,
      filtered: true,
      captcha_required: false,
      risk_score: 0,
      reasons: ['honeypot']
    });
  }

  const validationError = validatePayload(body.payload);
  if (validationError) {
    return json({ success: false, message: validationError }, 400);
  }

  let result = evaluateRisk(request, body);
  result = await readPersistentRisk(env, request, body, result);

  const threshold = Math.max(
    1,
    asNumber(env.RISK_THRESHOLD, DEFAULT_RISK_THRESHOLD)
  );

  const riskRecorded = await recordPersistentRisk(env, result);
  const captchaRequired = result.score >= threshold;

  return json({
    success: true,
    captcha_required: captchaRequired,
    risk_score: result.score,
    reasons: result.reasons,
    site_key: captchaRequired ? asText(env.HCAPTCHA_SITE_KEY, 200) : '',
    risk_store_read: result.riskStoreRead,
    risk_recorded: riskRecorded
  });
}

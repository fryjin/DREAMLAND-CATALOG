const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

const DEFAULT_RISK_THRESHOLD = 3;
const IP_WINDOW_SECONDS = 600;
const CONTENT_RISK_WINDOW_SECONDS = 3600;
const RAPID_CONTENT_WINDOW_SECONDS = 60;
const IDEMPOTENCY_WINDOW_SECONDS = 86400;

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

  return (
    atIndex > 0 &&
    dotIndex > atIndex + 1 &&
    dotIndex < email.length - 1
  );
}

function countUrls(value) {
  const content = asText(value, 50000).toLowerCase();
  const httpCount = content.split('http://').length - 1;
  const httpsCount = content.split('https://').length - 1;

  return httpCount + httpsCount;
}

function normalizeInquiryId(value) {
  const inquiryId = asText(value, 120);

  if (
    !/^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/.test(inquiryId)
  ) {
    return '';
  }

  return inquiryId;
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

async function buildInquiryReference(inquiryId) {
  const sourceId = normalizeInquiryId(inquiryId);
  const match = /^DL-(\d{8})-/i.exec(sourceId);

  const date = match
    ? match[1]
    : new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll('-', '');

  const hash = await sha256(sourceId);

  return (
    'INQ-' +
    date +
    '-' +
    hash.slice(0, 8).toUpperCase()
  );
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Missing payload';
  }

  if (!normalizeInquiryId(payload.inquiry_id)) {
    return 'Invalid inquiry id';
  }

  if (
    asText(payload.contact_name, 160).length < 2
  ) {
    return 'Invalid contact name';
  }

  if (
    !asText(payload.country_or_region, 160)
  ) {
    return 'Missing country or region';
  }

  if (!isEmail(payload.email_address)) {
    return 'Invalid email address';
  }

  if (
    asText(payload.phone_or_wechat, 200)
      .length < 5
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
    asText(payload.items_summary, 50000)
      .length < 5
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

  const origin =
    request.headers.get('Origin');

  const ownOrigin =
    new URL(request.url).origin;

  if (origin && origin !== ownOrigin) {
    add(5, 'origin_mismatch');
  }

  if (
    !request.headers.get('User-Agent')
  ) {
    add(2, 'missing_user_agent');
  }

  if (
    asNumber(risk.session_elapsed_ms) <
    15000
  ) {
    add(2, 'very_fast_session');
  }

  if (
    asNumber(risk.form_elapsed_ms) <
    8000
  ) {
    add(2, 'very_fast_form');
  }

  if (
    asNumber(risk.interaction_count) <
    3
  ) {
    add(1, 'few_interactions');
  }

  if (
    asNumber(risk.local_attempt_count) >=
    2
  ) {
    add(2, 'repeated_local_attempts');
  }

  const urlCount =
    countUrls(payload.message) +
    countUrls(payload.items_summary);

  if (urlCount > 2) {
    add(2, 'many_urls');
  }

  if (
    JSON.stringify(payload).length >
    60000
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

function buildContentSignature(payload) {
  return [
    asText(
      payload?.email_address,
      320
    ).toLowerCase(),
    asText(
      payload?.items_summary,
      50000
    ),
    asText(
      payload?.message,
      10000
    ),
    asText(
      payload?.product_count,
      50
    ),
    asText(
      payload?.custom_count,
      50
    )
  ].join('|');
}

function parseIdempotencyRecord(value) {
  if (!value) {
    return null;
  }

  try {
    const record = JSON.parse(value);

    if (
      !record ||
      typeof record !== 'object' ||
      !asText(record.reference, 100)
    ) {
      return null;
    }

    return {
      reference: asText(
        record.reference,
        100
      ),
      submittedAt: asText(
        record.submittedAt,
        100
      )
    };
  } catch (_) {
    return null;
  }
}

async function readPersistentRisk(
  env,
  request,
  body,
  result
) {
  const store = env.RISK_STORE;

  if (
    !store ||
    typeof store.get !== 'function'
  ) {
    return result;
  }

  try {
    const ip = asText(
      request.headers.get(
        'CF-Connecting-IP'
      ) || 'unknown',
      128
    );

    const inquiryId =
      normalizeInquiryId(
        body.payload?.inquiry_id
      );

    const contentSignature =
      buildContentSignature(
        body.payload
      );

    const hashes = await Promise.all([
      sha256(ip),
      sha256(contentSignature),
      sha256(inquiryId)
    ]);

    const ipKey =
      'ip:' + hashes[0];

    const contentKey =
      'content:' + hashes[1];

    const rapidContentKey =
      'rapid:' + hashes[1];

    const idempotencyKey =
      'idem:' + hashes[2];

    const values = await Promise.all([
      store.get(ipKey),
      store.get(contentKey),
      store.get(rapidContentKey),
      store.get(idempotencyKey)
    ]);

    const ipCount =
      asNumber(values[0]);

    const contentCount =
      asNumber(values[1]);

    const rapidContentCount =
      asNumber(values[2]);

    const idempotencyRecord =
      parseIdempotencyRecord(values[3]);

    if (ipCount >= 2) {
      result.score += 3;
      result.reasons.push(
        'ip_rate_limit'
      );
    }

    if (contentCount >= 1) {
      result.score += 1;
      result.reasons.push(
        'repeated_content'
      );
    }

    if (rapidContentCount >= 1) {
      result.score += 2;
      result.reasons.push(
        'rapid_repeated_content'
      );
    }

    result.storage = {
      ipKey,
      contentKey,
      rapidContentKey,
      idempotencyKey,
      ipCount,
      contentCount,
      rapidContentCount,
      idempotencyRecord
    };

    result.riskStoreRead = true;
  } catch (error) {
    console.error(
      'RISK_STORE read failed:',
      error
    );

    result.storage = null;
    result.riskStoreRead = false;
  }

  return result;
}

async function recordPersistentRisk(
  env,
  result
) {
  const store = env.RISK_STORE;

  if (
    !store ||
    typeof store.put !== 'function' ||
    !result.storage
  ) {
    return null;
  }

  const writes =
    await Promise.allSettled([
      store.put(
        result.storage.ipKey,
        String(
          result.storage.ipCount + 1
        ),
        {
          expirationTtl:
            IP_WINDOW_SECONDS
        }
      ),
      store.put(
        result.storage.contentKey,
        String(
          result.storage.contentCount + 1
        ),
        {
          expirationTtl:
            CONTENT_RISK_WINDOW_SECONDS
        }
      ),
      store.put(
        result.storage.rapidContentKey,
        String(
          result.storage
            .rapidContentCount + 1
        ),
        {
          expirationTtl:
            RAPID_CONTENT_WINDOW_SECONDS
        }
      )
    ]);

  const failed = writes.filter(
    (item) =>
      item.status === 'rejected'
  );

  if (failed.length > 0) {
    console.error(
      'RISK_STORE write failed:',
      failed.map(
        (item) => item.reason
      )
    );

    return false;
  }

  return true;
}

async function recordIdempotencySuccess(
  env,
  result,
  inquiryReference
) {
  const store = env.RISK_STORE;

  if (
    !store ||
    typeof store.put !== 'function' ||
    !result.storage?.idempotencyKey
  ) {
    return null;
  }

  try {
    await store.put(
      result.storage.idempotencyKey,
      JSON.stringify({
        reference:
          inquiryReference,
        submittedAt:
          new Date().toISOString()
      }),
      {
        expirationTtl:
          IDEMPOTENCY_WINDOW_SECONDS
      }
    );

    return true;
  } catch (error) {
    console.error(
      'RISK_STORE idempotency write failed:',
      error
    );

    return false;
  }
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

  const form =
    new URLSearchParams({
      secret:
        env.HCAPTCHA_SECRET,
      response:
        token,
      sitekey:
        env.HCAPTCHA_SITE_KEY
    });

  const remoteIp =
    request.headers.get(
      'CF-Connecting-IP'
    );

  if (remoteIp) {
    form.set(
      'remoteip',
      remoteIp
    );
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
          'siteverify-http-' +
            response.status
        ]
      };
    }

    return {
      success:
        data.success === true,
      errors:
        data['error-codes'] || []
    };
  } catch (error) {
    console.error(
      'hCaptcha verification request failed:',
      error
    );

    return {
      success: false,
      errors: [
        'siteverify-network-error'
      ]
    };
  }
}

async function forwardToWeb3Forms(
  env,
  payload
) {
  if (
    !env.WEB3FORMS_ACCESS_KEY
  ) {
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

    const normalizedValue =
      value &&
      typeof value === 'object'
        ? JSON.stringify(value)
        : String(value ?? '');

    form.append(
      key,
      normalizedValue
    );
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
      data =
        JSON.parse(responseText);
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      'Web3Forms server returned status ' +
        response.status
    );
  }

  if (
    data?.success === false
  ) {
    throw new Error(
      data.message ||
      'Web3Forms flagged submission as failed'
    );
  }

  let responseType = 'empty';

  if (data) {
    responseType = 'json';
  } else if (
    responseText.trim()
  ) {
    responseType = 'non-json';
  }

  return {
    accepted: true,
    status: response.status,
    responseType
  };
}

export async function onRequestGet() {
  return json({
    success: true,
    service:
      'dreamland-submit',
    status: 'ready'
  });
}

export async function onRequestPost(
  context
) {
  const { request, env } =
    context;

  let body;

  try {
    body =
      await request.json();
  } catch (_) {
    return json(
      {
        success: false,
        message:
          'Invalid JSON body'
      },
      400
    );
  }

  if (
    !body ||
    typeof body !== 'object'
  ) {
    return json(
      {
        success: false,
        message:
          'Invalid request body'
      },
      400
    );
  }

  if (
    asText(body.website, 500)
  ) {
    return json({
      success: true,
      filtered: true
    });
  }

  const validationError =
    validatePayload(
      body.payload
    );

  if (validationError) {
    return json(
      {
        success: false,
        message:
          validationError
      },
      400
    );
  }

  let result = evaluateRisk(
    request,
    body
  );

  result =
    await readPersistentRisk(
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

  const idempotencyRecord =
    result.storage
      ?.idempotencyRecord ||
    null;

  const idempotentReplay =
    Boolean(
      idempotencyRecord?.reference
    );

  const captchaRequired =
    !idempotentReplay &&
    result.score >= threshold;

  const assessment = {
    success: true,
    captcha_required:
      captchaRequired,
    risk_score:
      result.score,
    reasons:
      result.reasons,
    idempotent_replay:
      idempotentReplay,
    inquiry_reference:
      idempotencyRecord
        ?.reference || '',
    site_key:
      captchaRequired
        ? asText(
          env.HCAPTCHA_SITE_KEY,
          200
        )
        : ''
  };

  if (
    body.action === 'assess'
  ) {
    return json(assessment);
  }

  if (
    body.action !== 'submit'
  ) {
    return json(
      {
        success: false,
        message:
          'Unsupported action'
      },
      400
    );
  }

  if (idempotentReplay) {
    return json({
      ...assessment,
      success: true,
      duplicate: true,
      submission: {
        accepted: true,
        status: 200,
        responseType:
          'idempotency-replay'
      }
    });
  }

  if (captchaRequired) {
    const token = asText(
      body.hcaptcha_token,
      10000
    );

    if (!token) {
      return json(
        {
          ...assessment,
          success: false,
          message:
            'CAPTCHA required'
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

    if (
      !verification.success
    ) {
      const message =
        verification
          .configurationError
          ? 'CAPTCHA server configuration is missing'
          : 'CAPTCHA verification failed';

      const status =
        verification
          .configurationError
          ? 500
          : 403;

      return json(
        {
          ...assessment,
          success: false,
          message,
          captcha_errors:
            verification.errors
        },
        status
      );
    }
  }

  const inquiryId =
    normalizeInquiryId(
      body.payload?.inquiry_id
    );

  const inquiryReference =
    await buildInquiryReference(
      inquiryId
    );

  try {
    const contactName =
      asText(
        body.payload?.contact_name,
        160
      ) || 'Unknown contact';

    const submissionPayload = {
      ...body.payload,
      inquiry_reference:
        inquiryReference,
      subject:
        '[' +
        inquiryReference +
        '] DREAMLAND Inquiry - ' +
        contactName
    };

    const submission =
      await forwardToWeb3Forms(
        env,
        submissionPayload
      );

    const idempotencyRecorded =
      await recordIdempotencySuccess(
        env,
        result,
        inquiryReference
      );

    const riskRecorded =
      await recordPersistentRisk(
        env,
        result
      );

    return json({
      success: true,
      duplicate: false,
      inquiry_reference:
        inquiryReference,
      captcha_used:
        captchaRequired,
      risk_score:
        result.score,
      risk_store_read:
        result.riskStoreRead,
      risk_recorded:
        riskRecorded,
      idempotency_recorded:
        idempotencyRecorded,
      submission
    });
  } catch (error) {
    console.error(
      'Web3Forms submission failed:',
      error
    );

    return json(
      {
        success: false,
        message:
          'Submission service failed'
      },
      502
    );
  }
}

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  fileURLToPath
} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  ),
  '..'
);

if(
  !process.argv.includes(
    '--write'
  )
){
  console.error(
    'Usage: node scripts/r4-promote-astro-contact.mjs --write'
  );
  process.exit(1);
}

const SOURCE_ROOT=
  path.join(
    ROOT,
    '.r4-astro-dist'
  );

const TARGET_ROOT=
  path.join(
    ROOT,
    'dist'
  );

const FIELD_IDS=Object.freeze([
  'name',
  'company',
  'country',
  'city',
  'email',
  'phone',
  'buyerType',
  'message'
]);

function fail(message){
  console.error('');
  console.error(
    '[R4.8C Contact Promotion] FAIL'
  );
  console.error(
    '- '+
    message
  );
  console.error('');
  process.exit(1);
}

function ensureFile(
  file,
  label
){
  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      label+
      ' is missing: '+
      path.relative(
        ROOT,
        file
      )
    );
  }
}

function copyFile(
  source,
  target
){
  ensureFile(
    source,
    'Promotion source asset'
  );

  fs.mkdirSync(
    path.dirname(
      target
    ),
    {
      recursive:true
    }
  );

  fs.copyFileSync(
    source,
    target
  );
}

function hashFile(file){
  return crypto
    .createHash(
      'sha256'
    )
    .update(
      fs.readFileSync(
        file
      )
    )
    .digest(
      'hex'
    );
}

function stateText(html){
  const match=
    html.match(
      /<script[^>]*id="contactRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="contactRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  return match
    ? match[1]
    : '';
}

function runtimeState(html){
  const raw=
    stateText(
      html
    );

  if(!raw){
    fail(
      'Contact runtime state is missing.'
    );
  }

  try{
    return JSON.parse(
      raw
    );
  }catch(error){
    fail(
      'Contact runtime state JSON is invalid: '+
      error.message
    );
  }
}

const source=
  path.join(
    SOURCE_ROOT,
    'inquiry',
    'contact',
    'index.html'
  );

const target=
  path.join(
    TARGET_ROOT,
    'inquiry',
    'contact',
    'index.html'
  );

ensureFile(
  source,
  'Isolated Astro Contact'
);

ensureFile(
  target,
  'Legacy Production Contact'
);

const html=
  fs.readFileSync(
    source,
    'utf8'
  );

for(const marker of [
  'data-r4-astro-foundation="true"',
  'data-r4-astro-contact="true"',
  'data-r4-contact-static="true"',
  'data-contact-runtime-presentation',
  'name="robots" content="noindex,nofollow"',
  'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/contact/"',
  'id="contactRuntimeState"',
  'src="/r4-contact-runtime.js"',
  'data-site-language-enabled="true"',
  'href="/inquiry/"'
]){
  if(
    !html.includes(
      marker
    )
  ){
    fail(
      'Isolated Astro Contact is not promotion-ready: '+
      marker
    );
  }
}

for(const forbidden of [
  'DREAMLAND_MPA_ACTIVE',
  'runtime-desktop-experience.js',
  'runtime-desktop-contact.js',
  'runtime-desktop-review.js',
  'runtime-risk.js',
  'runtime-submission.js',
  'runtime-pwa.js',
  'runtime-inquiry-submission-flow.js',
  'hcaptcha',
  'startup-loader.js',
  'serviceWorker.register',
  'navigator.serviceWorker',
  'DreamlandRisk',
  'DreamlandSubmission',
  'DreamlandInquirySubmissionFlow'
]){
  if(
    html.includes(
      forbidden
    )
  ){
    fail(
      'Isolated Astro Contact crossed a Legacy/downstream/PWA boundary: '+
      forbidden
    );
  }
}

const executable=[
  ...html.matchAll(
    /<script\b(?![^>]*type="application\/json")[^>]*>/gi
  )
];

if(
  executable.length!==1
){
  fail(
    'Isolated Astro Contact must contain exactly one executable route runtime; found '+
    executable.length+
    '.'
  );
}

const scriptSources=[
  ...html.matchAll(
    /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi
  )
].map(
  match=>match[1]
);

if(
  scriptSources.length!==1||
  scriptSources[0]!==
    '/r4-contact-runtime.js'
){
  fail(
    'Isolated Astro Contact executable graph must contain only /r4-contact-runtime.js.'
  );
}

const state=
  runtimeState(
    html
  );

if(
  state.version!==
    'R4.8B'||
  JSON.stringify(
    state.languages
  )!==
    JSON.stringify([
      'en',
      'zh',
      'ko'
    ])||
  state.storage
    ?.languageKey!==
    'productManualLang'||
  state.storage
    ?.inquiryKey!==
    'productManualV2State'||
  state.storage
    ?.inquiryVersion!==
    2||
  state.storage
    ?.contactKey!==
    'dreamlandContactDraftV1'||
  state.storage
    ?.contactTtlMs!==
    86400000||
  JSON.stringify(
    state.storage
      ?.contactFieldIds
  )!==
    JSON.stringify(
      FIELD_IDS
    )||
  state.routes
    ?.inquiry!==
    '/inquiry/'||
  state.routes
    ?.review!==
    '/inquiry/review/'||
  state.guard!==
    'hasInquiry'
){
  fail(
    'Isolated Astro Contact runtime-state contract changed before Production promotion.'
  );
}

for(const language of [
  'en',
  'zh',
  'ko'
]){
  const locale=
    state.locales
      ?.[language];

  if(
    !locale||
    !locale.copy||
    !locale.content
      ?.navigation||
    !locale.content
      ?.footer||
    !Array.isArray(
      locale.copy
        .countryRegions
    )||
    !Array.isArray(
      locale.copy
        .buyerTypes
    )
  ){
    fail(
      'Isolated Astro Contact locale is incomplete: '+
      language
    );
  }
}

if(
  !state.seriesMeta||
  !Object.keys(
    state.seriesMeta
  ).length||
  !state.currencyMap
    ?.en||
  !state.currencyMap
    ?.zh||
  !state.currencyMap
    ?.ko
){
  fail(
    'Isolated Astro Contact pricing/currency runtime state is incomplete.'
  );
}

const legacy=
  fs.readFileSync(
    target,
    'utf8'
  );

if(
  !legacy.includes(
    'window.DREAMLAND_MPA_ACTIVE=true;'
  )
){
  fail(
    'Production /inquiry/contact/ is not the expected Legacy MPA immediately before R4.8C promotion.'
  );
}

const products=
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'data',
        'products.json'
      ),
      'utf8'
    )
  )
    .products||
  [];

const activeProducts=
  products.filter(
    product=>
      product?.status===
      'active'
  );

if(
  activeProducts.length!==89
){
  fail(
    'Expected 89 active Products for Production sentinels; found '+
    activeProducts.length+
    '.'
  );
}

const sentinelContracts=[
  {
    relative:'index.html',
    marker:
      'data-r4-production-home="true"'
  },
  {
    relative:'products/index.html',
    marker:
      'data-r4-astro-catalog="true"'
  },
  {
    relative:'custom/index.html',
    marker:
      'data-r4-astro-custom="true"'
  },
  {
    relative:'inquiry/index.html',
    marker:
      'data-r4-astro-inquiry="true"'
  },
  {
    relative:'inquiry/review/index.html',
    marker:
      'window.DREAMLAND_MPA_ACTIVE=true;'
  },
  {
    relative:'inquiry/success/index.html',
    marker:
      'window.DREAMLAND_MPA_ACTIVE=true;'
  },
  {
    relative:'sw.js',
    marker:
      "const CACHE_VERSION = 'dreamland-pwa-v129';"
  }
];

for(const product of activeProducts){
  const productId=
    String(
      product?.productId||
      product?.id||
      ''
    )
      .trim()
      .toUpperCase();

  if(!productId){
    fail(
      'Active Product is missing an ID.'
    );
  }

  sentinelContracts.push({
    relative:
      path.join(
        'products',
        productId,
        'index.html'
      ),
    marker:
      'data-r4-astro-product="true"'
  });
}

const sentinelHashes=
  new Map();

for(const contract of sentinelContracts){
  const file=
    path.join(
      TARGET_ROOT,
      contract.relative
    );

  ensureFile(
    file,
    'Production route sentinel'
  );

  const content=
    fs.readFileSync(
      file,
      'utf8'
    );

  if(
    !content.includes(
      contract.marker
    )
  ){
    fail(
      'Unexpected Production route owner before Contact promotion: '+
      contract.relative
    );
  }

  sentinelHashes.set(
    contract.relative,
    hashFile(
      file
    )
  );
}

const astroAssets=
  new Set();

for(const match of html.matchAll(
  /(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g
)){
  astroAssets.add(
    match[1]
  );
}

for(const pathname of astroAssets){
  const relative=
    pathname.replace(
      /^\/+/,
      ''
    );

  copyFile(
    path.join(
      SOURCE_ROOT,
      relative
    ),
    path.join(
      TARGET_ROOT,
      relative
    )
  );
}

copyFile(
  path.join(
    SOURCE_ROOT,
    'r4-contact-runtime.js'
  ),
  path.join(
    TARGET_ROOT,
    'r4-contact-runtime.js'
  )
);

copyFile(
  source,
  target
);

const manifestFile=
  path.join(
    TARGET_ROOT,
    'multipage-build-manifest.json'
  );

ensureFile(
  manifestFile,
  'Production build manifest'
);

const manifest=
  JSON.parse(
    fs.readFileSync(
      manifestFile,
      'utf8'
    )
  );

for(const [
  key,
  expected
] of [
  [
    'homeOwner',
    'astro'
  ],
  [
    'catalogOwner',
    'astro'
  ],
  [
    'pdpOwner',
    'astro'
  ],
  [
    'customOwner',
    'astro'
  ],
  [
    'inquiryOwner',
    'astro'
  ]
]){
  if(
    manifest[key]!==
    expected
  ){
    fail(
      'Production manifest must already own Astro Home + Catalog + PDP + Custom + Inquiry before Contact promotion: '+
      key
    );
  }
}

if(
  manifest.inquiryCutover!==
    'B7-00B.4J-R4.7C'
){
  fail(
    'Production manifest lost the committed R4.7C Inquiry cutover before Contact promotion.'
  );
}

manifest.presentationOverrides={
  ...(
    manifest.presentationOverrides||
    {}
  ),
  contact:
    'astro-r4.8c'
};

manifest.contactOwner=
  'astro';

manifest.contactCutover=
  'B7-00B.4J-R4.8C';

fs.writeFileSync(
  manifestFile,
  JSON.stringify(
    manifest,
    null,
    2
  )+
  '\n',
  'utf8'
);

for(const [
  relative,
  beforeHash
] of sentinelHashes){
  if(
    hashFile(
      path.join(
        TARGET_ROOT,
        relative
      )
    )!==
    beforeHash
  ){
    fail(
      'R4.8C modified a non-Contact Production route/asset: '+
      relative
    );
  }
}

console.log('');
console.log(
  '[R4.8C Contact Promotion] PASS'
);
console.log(
  '- Production Contact promoted: /inquiry/contact/'
);
console.log(
  '- Promoted Contact runtime: /r4-contact-runtime.js'
);
console.log(
  '- Promoted hashed Astro assets:',
  astroAssets.size
);
console.log(
  '- Home / Catalog / 89 PDPs / Custom / Inquiry / Review / Success / sw.js were unchanged.'
);
console.log('');

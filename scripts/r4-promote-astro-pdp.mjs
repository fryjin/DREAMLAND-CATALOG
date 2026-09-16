#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

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
    'Usage: node scripts/r4-promote-astro-pdp.mjs --write'
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

function fail(message){
  console.error('');
  console.error(
    '[R4.5C PDP Promotion] FAIL'
  );
  console.error(
    '- '+message
  );
  console.error('');
  process.exit(1);
}

function text(value){
  return String(
    value??
    ''
  ).trim();
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
    .digest('hex');
}

function runtimeState(
  html,
  productId
){
  const match=
    html.match(
      /<script[^>]*id="pdpRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="pdpRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  if(!match){
    fail(
      'PDP runtime state is missing: '+
      productId
    );
  }

  try{
    return JSON.parse(
      match[1]
    );
  }catch(error){
    fail(
      'PDP runtime state JSON is invalid for '+
      productId+
      ': '+
      error.message
    );
  }
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
    .products
    .filter(
      product=>
        product?.status===
        'active'
    );

if(products.length!==89){
  fail(
    'R4.5C expected 89 active products; found '+
    products.length+
    '.'
  );
}

const productIds=
  products.map(product=>
    text(
      product?.productId||
      product?.id
    )
      .toUpperCase()
  );

if(
  new Set(
    productIds
  ).size!==89||
  productIds.some(
    id=>!id
  )
){
  fail(
    'R4.5C requires 89 unique active Product IDs.'
  );
}

const sourceDocuments=
  new Map();

const astroAssets=
  new Set();

const productMedia=
  new Set();

for(const productId of productIds){
  const source=
    path.join(
      SOURCE_ROOT,
      'products',
      productId,
      'index.html'
    );

  const target=
    path.join(
      TARGET_ROOT,
      'products',
      productId,
      'index.html'
    );

  ensureFile(
    source,
    'Isolated Astro PDP'
  );

  ensureFile(
    target,
    'Legacy Production PDP'
  );

  const html=
    fs.readFileSync(
      source,
      'utf8'
    );

  const canonical=
    'rel="canonical" href="https://dreamland-catalog.pages.dev/products/'+
    encodeURIComponent(
      productId
    )+
    '/"';

  for(const marker of [
    'data-r4-astro-product="true"',
    'data-pdp-runtime-presentation',
    'data-product-id="'+
      productId+
      '"',
    'name="robots" content="index,follow"',
    canonical,
    'id="pdpRuntimeState"',
    'src="/r4-pdp-runtime.js"'
  ]){
    if(
      !html.includes(
        marker
      )
    ){
      fail(
        'Isolated Astro PDP is not promotion-ready for '+
        productId+
        ': '+
        marker
      );
    }
  }

  for(const forbidden of [
    'DREAMLAND_MPA_ACTIVE',
    'runtime-desktop-experience.js',
    'runtime-desktop-detail.js',
    'runtime-detail.js',
    'runtime-risk.js',
    'runtime-submission.js',
    'runtime-pwa.js',
    'catalog-data.js',
    'startup-loader.js'
  ]){
    if(
      html.includes(
        forbidden
      )
    ){
      fail(
        'Isolated Astro PDP still contains Legacy runtime marker for '+
        productId+
        ': '+
        forbidden
      );
    }
  }

  const executableScripts=[
    ...html.matchAll(
      /<script\b(?![^>]*type="application\/json")[^>]*>/gi
    )
  ];

  if(
    executableScripts.length!==1
  ){
    fail(
      'Isolated Astro PDP must contain exactly one executable runtime for '+
      productId+
      '; found '+
      executableScripts.length+
      '.'
    );
  }

  const state=
    runtimeState(
      html,
      productId
    );

  if(
    state.version!=='R4.5B'||
    state.product?.id!==productId
  ){
    fail(
      'Isolated Astro PDP runtime state owner mismatch for '+
      productId+
      '.'
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
    )||
    !legacy.includes(
      'data-dreamland-page="product"'
    )
  ){
    fail(
      'Production PDP is not the expected Legacy MPA immediately before R4.5C promotion: '+
      productId
    );
  }

  for(const match of html.matchAll(
    /(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g
  )){
    astroAssets.add(
      match[1]
    );
  }

  for(const match of html.matchAll(
    /(?:src|content)="(\/images\/products\/[^"]+\.(?:webp|png|jpe?g))"/gi
  )){
    productMedia.add(
      match[1]
    );
  }

  sourceDocuments.set(
    productId,
    {
      source,
      target
    }
  );
}

const sentinelContracts=[
  {
    relative:'index.html',
    marker:'data-r4-production-home="true"'
  },
  {
    relative:'products/index.html',
    marker:'data-r4-astro-catalog="true"'
  },
  {
    relative:'custom/index.html',
    marker:'window.DREAMLAND_MPA_ACTIVE=true;'
  },
  {
    relative:'inquiry/index.html',
    marker:'window.DREAMLAND_MPA_ACTIVE=true;'
  },
  {
    relative:'inquiry/contact/index.html',
    marker:'window.DREAMLAND_MPA_ACTIVE=true;'
  },
  {
    relative:'inquiry/review/index.html',
    marker:'window.DREAMLAND_MPA_ACTIVE=true;'
  }
];

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

  const html=
    fs.readFileSync(
      file,
      'utf8'
    );

  if(
    !html.includes(
      contract.marker
    )
  ){
    fail(
      'Unexpected Production route owner before PDP promotion: '+
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
    'r4-pdp-runtime.js'
  ),
  path.join(
    TARGET_ROOT,
    'r4-pdp-runtime.js'
  )
);

for(const pathname of productMedia){
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

for(const {
  source,
  target
} of sourceDocuments.values()){
  copyFile(
    source,
    target
  );
}

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

if(
  manifest.homeOwner!=='astro'||
  manifest.catalogOwner!=='astro'
){
  fail(
    'Production manifest must already own Astro Home + Catalog before PDP promotion.'
  );
}

manifest.presentationOverrides={
  ...(
    manifest.presentationOverrides||
    {}
  ),
  pdp:'astro-r4.5c'
};

manifest.pdpOwner=
  'astro';

manifest.pdpCutover=
  'B7-00B.4J-R4.5C';

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
  const file=
    path.join(
      TARGET_ROOT,
      relative
    );

  if(
    hashFile(
      file
    )!==
    beforeHash
  ){
    fail(
      'R4.5C modified a non-PDP Production route: '+
      relative
    );
  }
}

console.log('');
console.log(
  '[R4.5C PDP Promotion] PASS'
);
console.log(
  '- Production PDP documents promoted:',
  sourceDocuments.size
);
console.log(
  '- Promoted PDP runtime: /r4-pdp-runtime.js'
);
console.log(
  '- Promoted hashed Astro assets:',
  astroAssets.size
);
console.log(
  '- Promoted PDP-referenced product media:',
  productMedia.size
);
console.log(
  '- Home / Catalog / Custom / Inquiry sentinels were unchanged.'
);
console.log('');

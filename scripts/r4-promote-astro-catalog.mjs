#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

if(
  !process.argv.includes(
    '--write'
  )
){
  console.error(
    'Usage: node scripts/r4-promote-astro-catalog.mjs --write'
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

const SOURCE_CATALOG=
  path.join(
    SOURCE_ROOT,
    'products',
    'index.html'
  );

const TARGET_CATALOG=
  path.join(
    TARGET_ROOT,
    'products',
    'index.html'
  );

function fail(message){
  console.error('');
  console.error(
    '[R4.4C Catalog Promotion] FAIL'
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
    !fs.existsSync(file)
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
    path.dirname(target),
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
    .createHash('sha256')
    .update(
      fs.readFileSync(file)
    )
    .digest('hex');
}

function runtimeState(html){
  const match=
    html.match(
      /<script[^>]*id="catalogRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="catalogRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  if(!match){
    fail(
      'Catalog runtime state is missing from isolated Astro output.'
    );
  }

  try{
    return JSON.parse(
      match[1]
    );
  }catch(error){
    fail(
      'Catalog runtime state JSON is invalid: '+
      error.message
    );
  }
}

ensureFile(
  SOURCE_CATALOG,
  'Isolated Astro Catalog'
);

ensureFile(
  TARGET_CATALOG,
  'Legacy Production Catalog'
);

const sourceHtml=
  fs.readFileSync(
    SOURCE_CATALOG,
    'utf8'
  );

for(const marker of [
  'data-r4-astro-catalog="true"',
  'data-catalog-runtime-presentation',
  'name="robots" content="index,follow"',
  'rel="canonical" href="https://dreamland-catalog.pages.dev/products/"',
  'id="catalogRuntimeState"',
  'src="/r4-catalog-runtime.js"'
]){
  if(
    !sourceHtml.includes(
      marker
    )
  ){
    fail(
      'Isolated Astro Catalog is not promotion-ready: '+
      marker
    );
  }
}

for(const forbidden of [
  'DREAMLAND_MPA_ACTIVE',
  'runtime-desktop-experience.js',
  'runtime-desktop-catalog.js',
  'runtime-risk.js',
  'runtime-submission.js',
  'runtime-pwa.js',
  'catalog-data.js',
  'startup-loader.js'
]){
  if(
    sourceHtml.includes(
      forbidden
    )
  ){
    fail(
      'Isolated Astro Catalog still contains Legacy runtime marker: '+
      forbidden
    );
  }
}

const legacyCatalog=
  fs.readFileSync(
    TARGET_CATALOG,
    'utf8'
  );

if(
  !legacyCatalog.includes(
    'window.DREAMLAND_MPA_ACTIVE=true;'
  )||
  !legacyCatalog.includes(
    'data-dreamland-page="catalog"'
  )
){
  fail(
    'Production Catalog is not the expected Legacy MPA immediately before R4.4C promotion.'
  );
}

const products=
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'data/products.json'
      ),
      'utf8'
    )
  )
    .products||
  [];

const firstProduct=
  products.find(
    product=>
      product?.status===
      'active'
  );

const firstProductId=
  text(
    firstProduct
      ?.productId||
    firstProduct?.id
  )
    .toUpperCase();

if(!firstProductId){
  fail(
    'No active product is available for Production route sentinel validation.'
  );
}

const sentinelContracts=[
  {
    relative:'index.html',
    marker:'data-r4-production-home="true"'
  },
  {
    relative:path.join(
      'products',
      firstProductId,
      'index.html'
    ),
    marker:'window.DREAMLAND_MPA_ACTIVE=true;'
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
      'Unexpected Production route owner before Catalog promotion: '+
      contract.relative
    );
  }

  sentinelHashes.set(
    contract.relative,
    hashFile(file)
  );
}

const astroAssetPaths=[
  ...new Set(
    [
      ...sourceHtml.matchAll(
        /(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g
      )
    ].map(
      match=>match[1]
    )
  )
];

for(const pathname of astroAssetPaths){
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
    'r4-catalog-runtime.js'
  ),
  path.join(
    TARGET_ROOT,
    'r4-catalog-runtime.js'
  )
);

const state=
  runtimeState(
    sourceHtml
  );

const covers=[
  ...new Set(
    (
      Array.isArray(
        state?.products
      )
        ? state.products
        : []
    )
      .map(
        product=>
          text(
            product?.cover
          )
      )
      .filter(
        pathname=>
          /^\/images\/products\/[^/]+\/cover\.webp$/
            .test(
              pathname
            )
      )
  )
];

if(covers.length!==89){
  fail(
    'R4.4C expected 89 route-scoped Catalog covers; found '+
    covers.length+
    '.'
  );
}

for(const pathname of covers){
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
  SOURCE_CATALOG,
  TARGET_CATALOG
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

manifest.presentationOverrides={
  ...(
    manifest
      .presentationOverrides||
    {}
  ),
  catalog:'astro-r4.4c'
};

manifest.catalogOwner=
  'astro';

manifest.catalogCutover=
  'B7-00B.4J-R4.4C';

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
    hashFile(file)!==
    beforeHash
  ){
    fail(
      'R4.4C modified a non-Catalog Production route: '+
      relative
    );
  }
}

console.log('');
console.log(
  '[R4.4C Catalog Promotion] PASS'
);
console.log(
  '- Production /products/ now owns the Astro Catalog document.'
);
console.log(
  '- Promoted hashed Astro assets:',
  astroAssetPaths.length
);
console.log(
  '- Promoted Catalog runtime: /r4-catalog-runtime.js'
);
console.log(
  '- Promoted route-scoped Catalog covers:',
  covers.length
);
console.log(
  '- Home / PDP / Custom / Inquiry route sentinels were unchanged.'
);
console.log('');

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
    'Usage: node scripts/r4-promote-astro-home.mjs --write'
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

const SOURCE_HOME=
  path.join(
    SOURCE_ROOT,
    'index.html'
  );

const TARGET_HOME=
  path.join(
    TARGET_ROOT,
    'index.html'
  );

function fail(message){
  console.error('');
  console.error(
    '[R4.3C Home Promotion] FAIL'
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

function hashFile(file){
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(file)
    )
    .digest('hex');
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

ensureFile(
  SOURCE_HOME,
  'Isolated Astro Home'
);

ensureFile(
  TARGET_HOME,
  'Legacy Production Home'
);

const sourceHtml=
  fs.readFileSync(
    SOURCE_HOME,
    'utf8'
  );

for(const marker of [
  'data-r4-astro-home="true"',
  'data-r4-production-home="true"',
  'name="robots" content="index,follow"',
  'rel="canonical" href="https://dreamland-catalog.pages.dev/"',
  'src="/r4-home-runtime.js"'
]){
  if(
    !sourceHtml.includes(
      marker
    )
  ){
    fail(
      'Isolated Astro Home is not promotion-ready: '+
      marker
    );
  }
}

for(const forbidden of [
  'DREAMLAND_MPA_ACTIVE',
  'runtime-desktop-experience.js',
  'runtime-risk.js',
  'runtime-submission.js',
  'catalog-data.js',
  'startup-loader.js'
]){
  if(
    sourceHtml.includes(
      forbidden
    )
  ){
    fail(
      'Isolated Astro Home still contains Legacy runtime marker: '+
      forbidden
    );
  }
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

const sentinelRelatives=[
  'products/index.html',
  path.join(
    'products',
    firstProductId,
    'index.html'
  ),
  'custom/index.html',
  'inquiry/index.html',
  'inquiry/contact/index.html',
  'inquiry/review/index.html'
];

const sentinelHashes=
  new Map();

for(const relative of sentinelRelatives){
  const file=
    path.join(
      TARGET_ROOT,
      relative
    );

  ensureFile(
    file,
    'Legacy Production route sentinel'
  );

  const html=
    fs.readFileSync(
      file,
      'utf8'
    );

  if(
    !html.includes(
      'window.DREAMLAND_MPA_ACTIVE=true;'
    )
  ){
    fail(
      'Legacy route sentinel is not an active MPA document: '+
      relative
    );
  }

  sentinelHashes.set(
    relative,
    hashFile(file)
  );
}

/*
 * Only hashed Astro assets referenced by the Home document are promoted.
 * Catalog/PDP Astro proof output stays isolated.
 */
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
    'r4-home-runtime.js'
  ),
  path.join(
    TARGET_ROOT,
    'r4-home-runtime.js'
  )
);

const sourceHomeImages=
  path.join(
    SOURCE_ROOT,
    'images',
    'desktop',
    'home'
  );

const targetHomeImages=
  path.join(
    TARGET_ROOT,
    'images',
    'desktop',
    'home'
  );

if(
  !fs.existsSync(
    sourceHomeImages
  )
){
  fail(
    'Isolated Astro Home marketing assets are missing.'
  );
}

fs.rmSync(
  targetHomeImages,
  {
    recursive:true,
    force:true
  }
);

fs.mkdirSync(
  path.dirname(
    targetHomeImages
  ),
  {
    recursive:true
  }
);

fs.cpSync(
  sourceHomeImages,
  targetHomeImages,
  {
    recursive:true,
    force:true
  }
);

/*
 * Root Home is the only document replaced in R4.3C.
 */
copyFile(
  SOURCE_HOME,
  TARGET_HOME
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
  home:'astro-r4.3c'
};

manifest.homeOwner=
  'astro';

manifest.homeCutover=
  'B7-00B.4J-R4.3C';

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
      'R4.3C modified a non-Home Production route: '+
      relative
    );
  }
}

console.log('');
console.log(
  '[R4.3C Home Promotion] PASS'
);
console.log(
  '- Production / now owns the Astro Home document.'
);
console.log(
  '- Promoted hashed Astro assets:',
  astroAssetPaths.length
);
console.log(
  '- Promoted Home runtime: /r4-home-runtime.js'
);
console.log(
  '- Catalog / PDP / Custom / Inquiry route sentinels were unchanged.'
);
console.log('');

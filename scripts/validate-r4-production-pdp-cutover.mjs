#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  ),
  '..'
);

const SOURCE_MODE=
  process.argv.includes(
    '--source'
  );

const DIST_MODE=
  process.argv.includes(
    '--dist'
  );

if(
  SOURCE_MODE===
  DIST_MODE
){
  console.error(
    'Usage: node scripts/validate-r4-production-pdp-cutover.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

const EXPECTED_BUILD=
  'npm run data:build && npm run build:pages && npm run r4:astro:build && npm run r4:production:home && npm run r4:production:catalog && npm run r4:production:pdp && npm run r4:production:home:validate && npm run r4:production:catalog:validate && npm run r4:production:pdp:validate';

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function text(value){
  return String(
    value??
    ''
  ).trim();
}

function expectFile(
  root,
  relative
){
  const file=
    path.join(
      root,
      relative
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'Missing file: '+
      path.relative(
        ROOT,
        file
      )
    );
    return '';
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
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
    return null;
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
    return null;
  }
}

function validatePdpDocument(
  root,
  productId,
  label
){
  const relative=
    path.join(
      'products',
      productId,
      'index.html'
    );

  const html=
    expectFile(
      root,
      relative
    );

  if(!html){
    return;
  }

  const canonical=
    'rel="canonical" href="https://dreamland-catalog.pages.dev/products/'+
    encodeURIComponent(
      productId
    )+
    '/"';

  for(const marker of [
    'data-r4-astro-foundation="true"',
    'data-r4-astro-product="true"',
    'data-r4-pdp-static="true"',
    'data-product-id="'+
      productId+
      '"',
    'data-pdp-runtime-presentation',
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
        label+
        ' '+productId+
        ' is missing: '+
        marker
      );
    }
  }

  for(const legacy of [
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
        legacy
      )
    ){
      fail(
        label+
        ' '+productId+
        ' still contains Legacy runtime marker: '+
        legacy
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
      label+
      ' '+productId+
      ' must contain exactly one executable runtime; found '+
      executableScripts.length+
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
      '/r4-pdp-runtime.js'
  ){
    fail(
      label+
      ' '+productId+
      ' executable graph must contain only /r4-pdp-runtime.js.'
    );
  }

  const state=
    runtimeState(
      html,
      productId
    );

  if(
    state&&
    (
      state.version!=='R4.5B'||
      state.product?.id!==productId
    )
  ){
    fail(
      label+
      ' '+productId+
      ' runtime state ownership changed.'
    );
  }

  const media=[
    ...new Set(
      [
        ...html.matchAll(
          /(?:src|content)="(\/images\/products\/[^"]+\.(?:webp|png|jpe?g))"/gi
        )
      ].map(
        match=>match[1]
      )
    )
  ];

  if(!media.length){
    fail(
      label+
      ' '+productId+
      ' has no Product media references.'
    );
  }

  for(const pathname of media){
    const file=
      path.join(
        root,
        pathname.replace(
          /^\/+/,
          ''
        )
      );

    if(
      !fs.existsSync(
        file
      )
    ){
      fail(
        label+
        ' '+productId+
        ' referenced media is missing: '+
        pathname
      );
    }
  }
}

const products=
  json(
    'data/products.json'
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

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts?.build!==
    EXPECTED_BUILD
  ){
    fail(
      'Production build must promote Home + Catalog + 89 PDPs as staged route owners before final validation.'
    );
  }

  for(const [
    name,
    value
  ] of [
    [
      'r4:production:pdp',
      'node scripts/r4-promote-astro-pdp.mjs --write'
    ],
    [
      'r4:production:pdp:contract',
      'node scripts/validate-r4-production-pdp-cutover.mjs --source'
    ],
    [
      'r4:production:pdp:validate',
      'node scripts/validate-r4-production-pdp-cutover.mjs --dist && node scripts/validate-r4-production-pdp-detachment.mjs --dist'
    ]
  ]){
    if(
      pkg.scripts?.[name]!==
      value
    ){
      fail(
        'package.json is missing '+
        name+
        '.'
      );
    }
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:pdp-runtime'
    );

  const catalogDetachment=
    validate.indexOf(
      'npm run r4:production:catalog:detachment'
    );

  const pdpContract=
    validate.indexOf(
      'npm run r4:production:pdp:contract'
    );

  if(
    runtime<0||
    catalogDetachment<0||
    pdpContract<=runtime||
    pdpContract<=catalogDetachment
  ){
    fail(
      'R4.5C PDP Production contract must run after PDP Runtime and Catalog Detachment source gates.'
    );
  }
}catch(error){
  fail(
    'R4.5C package inspection failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'scripts/r4-promote-astro-pdp.mjs'
    );

  for(const marker of [
    "'.r4-astro-dist'",
    "'dist'",
    "'r4-pdp-runtime.js'",
    "pdp:'astro-r4.5c'",
    'manifest.pdpOwner=',
    'manifest.pdpCutover=',
    'sourceDocuments.size',
    'runtimeState(',
    'productMedia',
    'data-r4-production-home="true"',
    'data-r4-astro-catalog="true"',
    'window.DREAMLAND_MPA_ACTIVE=true;'
  ]){
    if(
      !source.includes(
        marker
      )
    ){
      fail(
        'PDP promotion contract is missing: '+
        marker
      );
    }
  }

  if(
    source.includes(
      'fs.cpSync(\n  SOURCE_ROOT,\n  TARGET_ROOT'
    )
  ){
    fail(
      'R4.5C PDP promotion must remain route-scoped.'
    );
  }
}catch(error){
  fail(
    'R4.5C promotion source inspection failed: '+
    error.message
  );
}

try{
  const page=
    read(
      'src/astro/pages/products/[productId].astro'
    );

  for(const marker of [
    'robots="index,follow"',
    'id="pdpRuntimeState"',
    'src="/r4-pdp-runtime.js"'
  ]){
    if(
      !page.includes(
        marker
      )
    ){
      fail(
        'Astro PDP Production source is missing: '+
        marker
      );
    }
  }

  if(
    page.includes(
      'robots="noindex,nofollow"'
    )
  ){
    fail(
      'Astro PDP source must no longer be noindex after Production cutover.'
    );
  }
}catch(error){
  fail(
    'R4.5C Astro PDP source inspection failed: '+
    error.message
  );
}

if(SOURCE_MODE){
  const root=
    path.join(
      ROOT,
      '.r4-astro-dist'
    );

  for(const productId of productIds){
    validatePdpDocument(
      root,
      productId,
      'Isolated PDP'
    );
  }

  const runtime=
    path.join(
      root,
      'r4-pdp-runtime.js'
    );

  if(
    !fs.existsSync(
      runtime
    )
  ){
    fail(
      'Isolated PDP runtime output is missing.'
    );
  }
}

if(DIST_MODE){
  const root=
    path.join(
      ROOT,
      'dist'
    );

  for(const productId of productIds){
    validatePdpDocument(
      root,
      productId,
      'Production PDP'
    );
  }

  const runtime=
    path.join(
      root,
      'r4-pdp-runtime.js'
    );

  if(
    !fs.existsSync(
      runtime
    )
  ){
    fail(
      'Production PDP runtime output is missing.'
    );
  }

  const home=
    expectFile(
      root,
      'index.html'
    );

  if(
    home&&
    (
      !home.includes(
        'data-r4-production-home="true"'
      )||
      !home.includes(
        'src="/r4-home-runtime.js"'
      )||
      home.includes(
        'DREAMLAND_MPA_ACTIVE'
      )
    )
  ){
    fail(
      'Production Home ownership changed during R4.5C.'
    );
  }

  const catalog=
    expectFile(
      root,
      'products/index.html'
    );

  if(
    catalog&&
    (
      !catalog.includes(
        'data-r4-astro-catalog="true"'
      )||
      !catalog.includes(
        'src="/r4-catalog-runtime.js"'
      )||
      catalog.includes(
        'DREAMLAND_MPA_ACTIVE'
      )
    )
  ){
    fail(
      'Production Catalog ownership changed during R4.5C.'
    );
  }

  for(const relative of [
    'custom/index.html',
    'inquiry/index.html',
    'inquiry/contact/index.html',
    'inquiry/review/index.html'
  ]){
    const html=
      expectFile(
        root,
        relative
      );

    if(
      html&&
      !html.includes(
        'window.DREAMLAND_MPA_ACTIVE=true;'
      )
    ){
      fail(
        'Production non-PDP route must remain Legacy MPA: '+
        relative
      );
    }
  }

  const manifest=
    JSON.parse(
      expectFile(
        root,
        'multipage-build-manifest.json'
      )||
      '{}'
    );

  if(
    manifest.homeOwner!=='astro'||
    manifest.homeCutover!==
      'B7-00B.4J-R4.3C'||
    manifest.presentationOverrides
      ?.home!==
      'astro-r4.3c'
  ){
    fail(
      'Production manifest lost the Astro Home ownership contract.'
    );
  }

  if(
    manifest.catalogOwner!=='astro'||
    manifest.catalogCutover!==
      'B7-00B.4J-R4.4C'||
    manifest.presentationOverrides
      ?.catalog!==
      'astro-r4.4c'
  ){
    fail(
      'Production manifest lost the Astro Catalog ownership contract.'
    );
  }

  if(
    manifest.pdpOwner!=='astro'||
    manifest.pdpCutover!==
      'B7-00B.4J-R4.5C'||
    manifest.presentationOverrides
      ?.pdp!==
      'astro-r4.5c'
  ){
    fail(
      'Production manifest is missing the Astro PDP ownership override.'
    );
  }

  if(
    !fs.existsSync(
      path.join(
        root,
        'sw.js'
      )
    )
  ){
    fail(
      'R4.5C must preserve the existing Service Worker asset until PDP detachment.'
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.5C Production PDP Cutover: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.5C Production PDP Cutover: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Production pipeline / SEO / 89-route isolated PDP promotion contract verified.'
    : 'dist/ owns Astro Home + Astro Catalog + 89 Astro PDPs while Custom/Inquiry remain Legacy MPA.'
);
console.log('');

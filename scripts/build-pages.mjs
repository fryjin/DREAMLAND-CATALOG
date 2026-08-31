#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const WRITE=process.argv.includes('--write');
const CHECK=process.argv.includes('--check');

if(!WRITE&&!CHECK){
  console.error(
    'Usage: node scripts/build-pages.mjs --write | --check'
  );
  process.exit(1);
}

const RELEASE='b7-00b4j-r3-v125';
const PWA='dreamland-pwa-v125';
const SITE_ORIGIN='https://dreamland-catalog.pages.dev';

const routes=JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      'data/page-routes.json'
    ),
    'utf8'
  )
);

const productData=JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      'data/products.json'
    ),
    'utf8'
  )
);

const sourceIndex=fs.readFileSync(
  path.join(
    ROOT,
    'index.html'
  ),
  'utf8'
);

const activeProducts=(productData.products||[])
  .filter(
    product=>
      product?.status==='active'
  );

const outputRoot=WRITE
  ? path.join(ROOT,'dist')
  : fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'dreamland-pages-'
      )
    );

function text(value){
  return String(value??'').trim();
}

function escapeHtml(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function normalizeProductId(value){
  const productId=
    text(value)
      .toUpperCase();

  if(
    !/^[A-Z0-9][A-Z0-9_-]{1,63}$/
      .test(productId)
  ){
    throw new Error(
      'Invalid product id in build data: '+
      value
    );
  }

  return productId;
}

function activeProductId(product){
  return normalizeProductId(
    product?.productId||
    product?.id
  );
}

function routePath(
  name,
  params={}
){
  const row=
    routes.routes?.[name];

  if(!row){
    throw new Error(
      'Missing page route: '+name
    );
  }

  let value=
    text(row.path);

  if(row.dynamic==='productId'){
    value=value.replace(
      '{productId}',
      normalizeProductId(
        params.productId
      )
    );
  }

  if(/\{[^}]+\}/.test(value)){
    throw new Error(
      'Missing route parameter for '+
      name
    );
  }

  return value;
}

function outputFile(route){
  if(route==='/'){
    return path.join(
      outputRoot,
      'index.html'
    );
  }

  const normalized=
    route
      .replace(/^\/+/,'')
      .replace(/\/+$/,'');

  return path.join(
    outputRoot,
    normalized,
    'index.html'
  );
}

function replaceOnce(
  source,
  before,
  after,
  label
){
  const count=
    source.split(before).length-1;

  if(count!==1){
    throw new Error(
      `Build transform expected one ${label}; found ${count}.`
    );
  }

  return source.replace(
    before,
    after
  );
}

function replaceMeta(
  html,
  attribute,
  key,
  value
){
  const pattern=
    new RegExp(
      `<meta\\s+${attribute}="${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"\\s+content="[^"]*"\\s*\\/?>`,
      'i'
    );

  if(!pattern.test(html)){
    return html;
  }

  return html.replace(
    pattern,
    `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}"/>`
  );
}

function setTitle(
  html,
  title
){
  if(!/<title>[\s\S]*?<\/title>/i.test(html)){
    return html;
  }

  return html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );
}

function setCanonical(
  html,
  pathname
){
  const url=
    SITE_ORIGIN+
    pathname;

  const canonical=
    `<link rel="canonical" href="${escapeHtml(url)}"/>`;

  if(
    /<link\s+rel="canonical"[^>]*>/i
      .test(html)
  ){
    return html.replace(
      /<link\s+rel="canonical"[^>]*>/i,
      canonical
    );
  }

  return html.replace(
    '</head>',
    canonical+'\n</head>'
  );
}

function setRobots(
  html,
  value
){
  const tag=
    `<meta name="robots" content="${escapeHtml(value)}"/>`;

  if(
    /<meta\s+name="robots"[^>]*>/i
      .test(html)
  ){
    return html.replace(
      /<meta\s+name="robots"[^>]*>/i,
      tag
    );
  }

  return html.replace(
    '</head>',
    tag+'\n</head>'
  );
}

function productCover(product){
  const source=
    text(
      product?.cover_image||
      product?.coverImage||
      product?.cover
    );

  if(source){
    return source.startsWith('/')
      ? source
      : '/'+
          source.replace(
            /^\.\//,
            ''
          );
  }

  return (
    '/images/products/'+
    activeProductId(product)+
    '/cover.webp'
  );
}

function productTitle(product){
  return (
    text(product?.names?.en)||
    text(product?.names?.zh)||
    text(product?.name)||
    activeProductId(product)
  );
}

function productDescription(product){
  return (
    text(
      product?.descriptions?.en
    )||
    text(
      product?.descriptions?.zh
    )||
    text(product?.desc)||
    'DREAMLAND hand-carved candle product detail.'
  );
}

function routeEntryScript(
  page,
  pathname,
  productId=''
){
  return (
    "window.DREAMLAND_MPA_ACTIVE=true;\n"+
    "window.DREAMLAND_PUBLIC_ROUTE_ENTRY=Object.freeze("+
    JSON.stringify({
      page,
      productId,
      pathname
    })+
    ");"
  );
}

function transformDocument({
  page,
  pathname,
  productId='',
  title,
  description,
  robots='noindex,nofollow',
  ogImage='/images/shared/share/SHARE001/cover-social.jpg'
}){
  let html=sourceIndex;

  html=replaceOnce(
    html,
    'window.DREAMLAND_MPA_ACTIVE=false;\nwindow.DREAMLAND_PUBLIC_ROUTE_ENTRY=Object.freeze({page:\'home\',productId:\'\',pathname:\'/\'});',
    routeEntryScript(
      page,
      pathname,
      productId
    ),
    'public route entry marker'
  );

  html=replaceOnce(
    html,
    '<body data-dreamland-page="home" data-product-id="">',
    `<body data-dreamland-page="${escapeHtml(page)}" data-product-id="${escapeHtml(productId)}">`,
    'body page marker'
  );

  html=setTitle(
    html,
    title
  );

  html=replaceMeta(
    html,
    'name',
    'description',
    description
  );

  html=replaceMeta(
    html,
    'property',
    'og:title',
    title
  );

  html=replaceMeta(
    html,
    'property',
    'og:description',
    description
  );

  html=replaceMeta(
    html,
    'property',
    'og:url',
    SITE_ORIGIN+
    pathname
  );

  const imageUrl=
    ogImage.startsWith('http')
      ? ogImage
      : SITE_ORIGIN+
        (
          ogImage.startsWith('/')
            ? ogImage
            : '/'+ogImage
        );

  html=replaceMeta(
    html,
    'property',
    'og:image',
    imageUrl
  );

  html=replaceMeta(
    html,
    'property',
    'og:image:secure_url',
    imageUrl
  );

  html=replaceMeta(
    html,
    'name',
    'twitter:title',
    title
  );

  html=replaceMeta(
    html,
    'name',
    'twitter:description',
    description
  );

  html=replaceMeta(
    html,
    'name',
    'twitter:image',
    imageUrl
  );

  html=setCanonical(
    html,
    pathname
  );

  html=setRobots(
    html,
    robots
  );

  return html;
}

function writeDocument(
  pathname,
  html
){
  const file=
    outputFile(pathname);

  fs.mkdirSync(
    path.dirname(file),
    {recursive:true}
  );

  fs.writeFileSync(
    file,
    html,
    'utf8'
  );

  return file;
}

function copyDirectory(
  relative
){
  const source=
    path.join(ROOT,relative);

  const target=
    path.join(
      outputRoot,
      relative
    );

  if(!fs.existsSync(source)){
    throw new Error(
      'Required production directory missing: '+
      relative
    );
  }

  fs.cpSync(
    source,
    target,
    {
      recursive:true,
      force:true
    }
  );
}

function localRootAssetPaths(){
  const values=[
    ...sourceIndex.matchAll(
      /(?:src|href)="\.\/([^"?#]+)(?:\?[^"]*)?"/g
    )
  ]
    .map(
      match=>
        text(match[1])
    )
    .filter(Boolean);

  return [
    ...new Set(values)
  ];
}

/*
 * B7-00B.4J R2.1 — Build asset ownership.
 *
 * Legacy HTML can contain historical / fallback media URLs. Missing optional
 * media must not block the Multi-Page production build.
 *
 * Executable / stylesheet assets remain strict because missing them makes the
 * generated site non-functional. Media directories themselves remain strict
 * and are copied wholesale.
 */
function isOptionalMediaAsset(relative){
  return /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/i
    .test(
      String(relative||'')
        .split('?')[0]
    );
}

function requiredRootAssetPaths(){
  return localRootAssetPaths()
    .filter(
      relative=>
        !isOptionalMediaAsset(
          relative
        )
    );
}

function verifyStaticSources(){
  for(const dir of [
    'src',
    'data',
    'images',
    'icons'
  ]){
    if(
      !fs.existsSync(
        path.join(ROOT,dir)
      )
    ){
      throw new Error(
        'Missing production directory: '+
        dir
      );
    }
  }

  for(const relative of [
    ...requiredRootAssetPaths(),
    'sw.js',
    'offline.html',
    'privacy.html',
    'manifest.webmanifest'
  ]){
    const file=
      path.join(ROOT,relative);

    if(!fs.existsSync(file)){
      throw new Error(
        'Missing required production asset: '+
        relative
      );
    }
  }
}

function copyStaticSite(){
  if(!WRITE){
    return;
  }

  for(const dir of [
    'src',
    'data',
    'images',
    'icons'
  ]){
    copyDirectory(dir);
  }

  for(const relative of [
    ...localRootAssetPaths(),
    'sw.js',
    'offline.html',
    'privacy.html',
    'manifest.webmanifest'
  ]){
    const source=
      path.join(ROOT,relative);

    if(!fs.existsSync(source)){
      continue;
    }

    const target=
      path.join(
        outputRoot,
        relative
      );

    fs.mkdirSync(
      path.dirname(target),
      {recursive:true}
    );

    fs.copyFileSync(
      source,
      target
    );
  }
}

/*
 * B7-00B.4J R2.2 — Source config / Production route boundary.
 *
 * Source app-config keeps ./privacy.html because the repository validator
 * checks that configured static targets exist in the source tree.
 *
 * Generated Multi-Page output rewrites only the dist copy to /privacy/.
 */
function rewriteProductionAppConfig(){
  if(!WRITE){
    return;
  }

  const file=
    path.join(
      outputRoot,
      'data/app-config.json'
    );

  if(!fs.existsSync(file)){
    throw new Error(
      'Generated data/app-config.json is missing.'
    );
  }

  const productionConfig=
    JSON.parse(
      fs.readFileSync(
        file,
        'utf8'
      )
    );

  productionConfig.privacyUrl=
    '/privacy/';

  fs.writeFileSync(
    file,
    JSON.stringify(
      productionConfig,
      null,
      2
    )+'\n',
    'utf8'
  );
}

function privacyDocument(){
  let html=
    fs.readFileSync(
      path.join(
        ROOT,
        'privacy.html'
      ),
      'utf8'
    );

  if(!/<base\s+href=/i.test(html)){
    html=html.replace(
      /<head>/i,
      '<head>\n<base href="/">'
    );
  }

  html=setCanonical(
    html,
    routePath('privacy')
  );

  html=setRobots(
    html,
    'index,follow'
  );

  return html;
}

function notFoundDocument(){
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/">
<title>Page not found | DREAMLAND</title>
<meta name="description" content="The requested DREAMLAND page could not be found.">
<meta name="robots" content="noindex,nofollow">
<style>
html,body{margin:0;min-height:100%;background:#fbf8f3;color:#181512;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{min-height:100vh;display:grid;place-items:center;padding:32px}
section{max-width:720px}
small{font-weight:800;letter-spacing:.14em}
h1{font-size:clamp(48px,9vw,112px);line-height:.9;margin:18px 0;letter-spacing:-.055em}
p{max-width:520px;line-height:1.65;color:#675f58}
a{display:inline-block;margin-top:24px;color:inherit;font-weight:800}
</style>
</head>
<body data-dreamland-page="notFound">
<main>
<section>
<small>DREAMLAND · 404</small>
<h1>Page not found.</h1>
<p>The page may have moved, or the product is no longer available.</p>
<a href="/products/">Back to products →</a>
</section>
</main>
</body>
</html>`;
}

function cleanOutput(){
  if(WRITE){
    fs.rmSync(
      outputRoot,
      {
        recursive:true,
        force:true
      }
    );
  }

  fs.mkdirSync(
    outputRoot,
    {recursive:true}
  );
}

function build(){
  cleanOutput();
  verifyStaticSources();

  const files=[];

  files.push(
    writeDocument(
      routePath('home'),
      transformDocument({
        page:'home',
        pathname:
          routePath('home'),
        title:
          'DREAMLAND 手工雕刻蜡烛｜批发与定制',
        description:
          '浏览 DREAMLAND 手工雕刻蜡烛系列、工艺与定制能力，提交批发或定制项目询价。',
        robots:'index,follow'
      })
    )
  );

  files.push(
    writeDocument(
      routePath('catalog'),
      transformDocument({
        page:'catalog',
        pathname:
          routePath('catalog'),
        title:
          'Products | DREAMLAND',
        description:
          'Browse DREAMLAND hand-carved candle collections, sizes, scents and wholesale configurations.',
        robots:'index,follow'
      })
    )
  );

  for(const product of activeProducts){
    const productId=
      activeProductId(product);

    const pathname=
      routePath(
        'product',
        {productId}
      );

    files.push(
      writeDocument(
        pathname,
        transformDocument({
          page:'product',
          pathname,
          productId,
          title:
            productTitle(product)+
            ' | DREAMLAND',
          description:
            productDescription(product),
          robots:'index,follow',
          ogImage:
            productCover(product)
        })
      )
    );
  }

  for(const page of [
    'custom',
    'inquiry',
    'contact',
    'review',
    'success'
  ]){
    files.push(
      writeDocument(
        routePath(page),
        transformDocument({
          page,
          pathname:
            routePath(page),
          title:
            (
              page==='custom'
                ? 'Custom Project'
                : page==='inquiry'
                  ? 'Inquiry'
                  : page==='contact'
                    ? 'Contact'
                    : page==='review'
                      ? 'Review Inquiry'
                      : 'Inquiry Received'
            )+
            ' | DREAMLAND',
          description:
            'DREAMLAND inquiry workflow.',
          robots:
            'noindex,nofollow'
        })
      )
    );
  }

  const privacyPath=
    routePath('privacy');

  files.push(
    writeDocument(
      privacyPath,
      privacyDocument()
    )
  );

  const notFoundFile=path.join(
    outputRoot,
    '404.html'
  );

  fs.writeFileSync(
    notFoundFile,
    notFoundDocument(),
    'utf8'
  );

  files.push(
    notFoundFile
  );

  files.push(
    writeDocument(
      routePath('notFound'),
      notFoundDocument()
    )
  );

  copyStaticSite();
  rewriteProductionAppConfig();

  const manifest={
    version:'B7-00B.4J-R2',
    release:RELEASE,
    pwa:PWA,
    routeContract:
      routes.version,
    fixedPages:8,
    productPages:
      activeProducts.length,
    totalPages:
      files.length,
    productIds:
      activeProducts.map(
        activeProductId
      )
  };

  fs.writeFileSync(
    path.join(
      outputRoot,
      'multipage-build-manifest.json'
    ),
    JSON.stringify(
      manifest,
      null,
      2
    )+'\n',
    'utf8'
  );

  return {
    files,
    manifest
  };
}

function verifyDocument(
  pathname,
  {
    page,
    productId='',
    indexed=false
  }={}
){
  const file=
    outputFile(pathname);

  if(!fs.existsSync(file)){
    throw new Error(
      'Generated page missing: '+
      pathname
    );
  }

  const html=
    fs.readFileSync(
      file,
      'utf8'
    );

  for(const marker of [
    '<base href="/">',
    'window.DREAMLAND_MPA_ACTIVE=true;',
    `"page":"${page}"`,
    `data-dreamland-page="${page}"`
  ]){
    if(!html.includes(marker)){
      throw new Error(
        `Generated ${pathname} is missing ${marker}`
      );
    }
  }

  if(
    productId&&
    !html.includes(
      `"productId":"${productId}"`
    )
  ){
    throw new Error(
      'Generated product entry mismatch: '+
      productId
    );
  }

  const robotMarker=
    indexed
      ? 'name="robots" content="index,follow"'
      : 'name="robots" content="noindex,nofollow"';

  if(!html.includes(robotMarker)){
    throw new Error(
      `Generated ${pathname} robots contract is incorrect.`
    );
  }
}

function verify(result){
  verifyDocument(
    routePath('home'),
    {
      page:'home',
      indexed:true
    }
  );

  verifyDocument(
    routePath('catalog'),
    {
      page:'catalog',
      indexed:true
    }
  );

  for(const product of activeProducts){
    const productId=
      activeProductId(product);

    verifyDocument(
      routePath(
        'product',
        {productId}
      ),
      {
        page:'product',
        productId,
        indexed:true
      }
    );
  }

  for(const page of [
    'custom',
    'inquiry',
    'contact',
    'review',
    'success'
  ]){
    verifyDocument(
      routePath(page),
      {
        page,
        indexed:false
      }
    );
  }

  if(
    result.manifest.productPages!==
    activeProducts.length
  ){
    throw new Error(
      'Product page count mismatch.'
    );
  }

  if(
    !fs.existsSync(
      path.join(
        outputRoot,
        '404.html'
      )
    )
  ){
    throw new Error(
      '404 page contract missing.'
    );
  }

  if(
    !fs.existsSync(
      outputFile(
        routePath('notFound')
      )
    )
  ){
    throw new Error(
      '/404/ route document missing.'
    );
  }

  if(
    WRITE&&
    !fs.existsSync(
      path.join(
        outputRoot,
        'sw.js'
      )
    )
  ){
    throw new Error(
      'Production Service Worker missing from dist.'
    );
  }

  if(WRITE){
    const productionConfig=
      JSON.parse(
        fs.readFileSync(
          path.join(
            outputRoot,
            'data/app-config.json'
          ),
          'utf8'
        )
      );

    if(
      productionConfig.privacyUrl!==
      '/privacy/'
    ){
      throw new Error(
        'Generated Production privacyUrl must be /privacy/.'
      );
    }
  }

  return true;
}

let result;

try{
  result=build();
  verify(result);

  console.log('');
  console.log(
    'DREAMLAND B7-00B.4J R2 public route build: PASS'
  );
  console.log(
    'Output mode:',
    WRITE?'write':'check'
  );
  console.log(
    'Active product pages:',
    result.manifest.productPages
  );
  console.log(
    'Legacy conversion bridges:',
    5
  );
  console.log(
    'Release:',
    RELEASE
  );
  console.log(
    'PWA:',
    PWA
  );
  console.log('');

  if(WRITE){
    console.log(
      'Output:',
      path.relative(
        ROOT,
        outputRoot
      )||
      'dist'
    );
  }
}finally{
  if(CHECK){
    fs.rmSync(
      outputRoot,
      {
        recursive:true,
        force:true
      }
    );
  }
}

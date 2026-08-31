#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function requireIncludes(source,markers,label){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(`${label} is missing: ${marker}`);
    }
  }
}

function requirePattern(source,pattern,message){
  if(!pattern.test(source)){
    fail(message);
  }
}

try{
  const index=read('index.html');

  requireIncludes(
    index,
    [
      '<title>DREAMLAND 手工雕刻蜡烛｜批发与定制</title>',
      'DREAMLAND 手工雕刻蜡烛系列，了解工艺、产品与定制能力',
      "window.DREAMLAND_RELEASE='b7-00b4j-r3-v127';",
      'dreamland-desktop-boot',
      './images/desktop/home/hero/hero-main.webp?release=b7-00b4j-r3-v127',
      'media="(min-width: 1024px)"',
      '右滑浏览产品系列',
      '<div class="page-title">产品系列</div>',
      'DREAMLAND 批发与定制询价',
      "from_name:c.name||'DREAMLAND 官网访客'"
    ],
    'index.html'
  );

  for(const forbidden of [
    'DREAMLAND 产品电子手册',
    'DREAMLAND 雕刻蜡烛产品手册',
    '右滑进入产品手册',
    '<div class="page-title">商品手册</div>'
  ]){
    if(index.includes(forbidden)){
      fail(
        `index.html still contains legacy manual copy: ${forbidden}`
      );
    }
  }

  /*
   * R6 must not contain the historical timed Desktop→Mobile fallback.
   * Ignore unrelated timers elsewhere in the file.
   */
  requirePattern(
    index,
    /dreamland-desktop-boot[\s\S]{0,900}R6:\s*Desktop never falls back to the Mobile application/m,
    'index.html is missing the R6 no-Desktop→Mobile-fallback boot contract.'
  );

  if(
    /setTimeout\s*\([\s\S]{0,500}classList[\s\S]{0,200}remove\s*\([\s\S]{0,100}dreamland-desktop-boot/m
      .test(index)
  ){
    fail(
      'index.html still contains a timed Desktop boot-guard removal.'
    );
  }
}catch(error){
  fail(`index inspection failed: ${error.message}`);
}

try{
  const startup=read('startup-loader.js');

  requireIncludes(
    startup,
    [
      "mode:'desktop-bypass'",
      "label:'DREAMLAND'",
      "preparing:'正在加载网站内容'",
      "ready:'网站内容已准备完成'"
    ],
    'startup-loader.js'
  );

  if(startup.includes("label:'产品手册'")){
    fail(
      'Mobile Startup Loader still identifies the product as 产品手册.'
    );
  }
}catch(error){
  fail(`startup loader inspection failed: ${error.message}`);
}

try{
  const home=read(
    'src/ui/desktop/home/runtime-desktop-home.js'
  );

  requireIncludes(
    home,
    [
      'function desktopMarketingAsset(',
      'function releaseAssetSource(',
      "quality:'marketing'",
      'function assetImageSignature(',
      'function scheduleAssetContractLoad()',
      'requestIdleCallback',
      "cache:'default'"
    ],
    'Desktop Home runtime'
  );

  /*
   * B7-00B.4B successor:
   * Website positioning owns the marketing-media behavior, not one frozen
   * Home implementation version. Accept the last stable owner and the 4B
   * editorial-composition successor.
   */
  const homeVersion=
    home.match(
      /const VERSION='([^']+)';/
    );

  const compatibleHomeVersions=
    new Set([
      'B7-00B.3A-R6',
      'B7-00B.4B-R1',
      'B7-00B.4B-R2',
      'B7-00B.4B-R3',
      'B7-00B.4B-R4',
      'B7-00B.4B-R4.1',
      'B7-00B.4B-R4.2',
      'B7-00B.4B-R4.2.4',
      'B7-00B.4B-R4.2.5',
      'B7-00B.4B-R4.2.6',
      'B7-00B.4H-R1'
    ]);

  if(
    !homeVersion||
    !compatibleHomeVersions.has(
      homeVersion[1]
    )
  ){
    fail(
      `Desktop Home runtime version is incompatible with the Website / Boot / Home Media contract: ${homeVersion?.[1]||'missing'}`
    );
  }

  // B7-00B.4H R1.3 — Website Home runtime compatibility.
  // The 4H Home successor keeps the existing marketing-media / boot contract.

  /*
   * Runtime source intentionally uses multiline chaining:
   *
   *   media
   *     .loadCandidates(
   *
   * Validate semantics rather than one-line formatting.
   */
  requirePattern(
    home,
    /\bmedia\s*\.\s*loadCandidates\s*\(/m,
    'Desktop Home runtime is missing the marketing-media loadCandidates bridge.'
  );

  requirePattern(
    home,
    /previousSignature\s*!==\s*nextSignature\s*&&\s*mounted/m,
    'Desktop Home asset contract must avoid re-rendering when image paths are unchanged.'
  );

  const scheduleCalls=
    (
      home.match(
        /scheduleAssetContractLoad\(\);/g
      )||
      []
    ).length;

  if(scheduleCalls!==2){
    fail(
      `Desktop Home must schedule the asset contract from configure + mount exactly twice; found ${scheduleCalls}.`
    );
  }

  const directContractCalls=
    (
      home.match(
        /loadAssetContract\(\);/g
      )||
      []
    ).length;

  if(directContractCalls!==1){
    fail(
      `Desktop Home loadAssetContract() should remain only inside the idle scheduler; found ${directContractCalls}.`
    );
  }
}catch(error){
  fail(`Desktop Home inspection failed: ${error.message}`);
}

try{
  const copy=read('copy-polish.js');

  requireIncludes(
    copy,
    [
      "docTitle:'DREAMLAND 手工雕刻蜡烛｜批发与定制'",
      "docTitle:'DREAMLAND | Hand-carved Candles for Wholesale & Custom'",
      "docTitle:'DREAMLAND | 핸드카빙 캔들 도매 · 커스텀'",
      'const META_COPY=',
      'const META_IMAGE_ALT=',
      'function updateMetaContent(',
      '\'meta[property="og:title"]\'',
      '\'meta[property="og:description"]\'',
      '\'meta[name="twitter:title"]\'',
      '\'meta[name="twitter:description"]\''
    ],
    'copy-polish.js'
  );

  /*
   * CopyPolish formats updateMetaContent() across multiple lines.
   * Validate that the helper is actually called for each SEO/social selector,
   * without locking whitespace/line breaks.
   */
  for(const selector of [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[property="og:image:alt"]'
  ]){
    const escaped=
      selector.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

    const pattern=
      new RegExp(
        `updateMetaContent\\s*\\(\\s*['"]${escaped}['"]`,
        'm'
      );

    if(!pattern.test(copy)){
      fail(
        `copy-polish.js is missing updateMetaContent() for ${selector}`
      );
    }
  }

  if(
    copy.includes(
      'DREAMLAND 手工雕刻香薰蜡烛产品手册与意向提交工具'
    )
  ){
    fail(
      'copy-polish.js still uses the legacy product-manual positioning.'
    );
  }
}catch(error){
  fail(`Copy/metadata inspection failed: ${error.message}`);
}

try{
  const manifest=JSON.parse(
    read('manifest.webmanifest')
  );

  if(
    manifest.name!==
    'DREAMLAND 手工雕刻蜡烛｜批发与定制'
  ){
    fail('manifest name is not website-positioned.');
  }

  if(
    manifest.orientation!==
    'any'
  ){
    fail(
      'manifest orientation must support the desktop website.'
    );
  }

  if(
    /手册|catalog manual/i.test(
      String(manifest.description||'')
    )
  ){
    fail(
      'manifest description still uses manual positioning.'
    );
  }
}catch(error){
  fail(`manifest inspection failed: ${error.message}`);
}

try{
  const site=JSON.parse(
    read('data/site-content.json')
  );

  if(
    site?.website?.positioning!==
    'brand-wholesale-custom'
  ){
    fail(
      'site-content.json is missing the website positioning contract.'
    );
  }

  for(const lang of ['en','zh','ko']){
    if(
      !site?.website?.meta?.[lang]?.title||
      !site?.website?.meta?.[lang]?.description
    ){
      fail(
        `site-content.json website metadata is incomplete for ${lang}.`
      );
    }
  }
}catch(error){
  fail(`site content inspection failed: ${error.message}`);
}

try{
  const pwa=read(
    'src/services/pwa/runtime-pwa.js'
  );

  const sw=read('sw.js');

  requireIncludes(
    pwa,
    ["'b7-00b4j-r3-v127'"],
    'PWA runtime'
  );

  requireIncludes(
    sw,
    [
      "const CACHE_VERSION = 'dreamland-pwa-v127';",
      "'b7-00b4j-r3-v127'"
    ],
    'Service Worker'
  );
}catch(error){
  fail(`release inspection failed: ${error.message}`);
}

try{
  const pkg=JSON.parse(
    read('package.json')
  );

  if(
    pkg?.scripts?.['desktop:website']!==
    'node scripts/validate-b7-desktop-website-positioning.mjs'
  ){
    fail(
      'package.json is missing desktop:website.'
    );
  }

  const validate=
    String(
      pkg?.scripts?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run desktop:website'
    )
  ){
    fail(
      'desktop:website is not part of the full validation chain.'
    );
  }

  if(
    !validate.endsWith(
      'npm run desktop:catalog'
    )
  ){
    fail(
      'desktop:catalog must remain the final Desktop validation gate.'
    );
  }

  if(
    !validate.includes(
      'npm run desktop:website && npm run desktop:catalog'
    )
  ){
    fail(
      'desktop:website must run immediately before the final desktop:catalog gate.'
    );
  }
}catch(error){
  fail(`package inspection failed: ${error.message}`);
}

if(errors.length){
  console.error(
    '\nB7-00B.3A Desktop Website / Boot / Home Media validation failed:\n'
  );

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  'B7-00B.3A Desktop Website / Boot / Home Media validation: PASS'
);

console.log(
  'Website positioning / no Desktop→Mobile boot fallback / Desktop marketing media fast path / no duplicate Home asset render / PWA v98 PASS.'
);

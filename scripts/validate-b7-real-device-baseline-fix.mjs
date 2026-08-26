#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

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

function readJson(relative){
  return JSON.parse(
    read(relative)
  );
}

function includesAll(
  source,
  markers,
  label
){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(
        `${label} is missing: ${marker}`
      );
    }
  }
}

/*
 * Gate 1 — Startup loader must represent actual Catalog image readiness.
 */
try{
  const startup=
    read('startup-loader.js');

  includesAll(
    startup,
    [
      "const VERSION='v63';",
      "media:'正在连接商品图片'",
      "media:'Connecting catalog images'",
      "media:'상품 이미지를 연결하고 있어요'",
      'let mediaReady=false;',
      'const preloadedProductSources=new Set();',
      "window.addEventListener(\n      'dreamland:catalog-media-ready'",
      'window.DreamlandResponsiveImages',
      '.mountResponsiveCatalog',
      'async function resolveDefaultSeries(',
      'function prioritizedCovers(',
      'preloadedProductSources.add(',
      'imagesReady()&&\n      mediaReady',
      'hasPreloaded(source)'
    ],
    'startup-loader.js'
  );

  if(
    startup.includes(
      'const covers=roundRobinCovers(rows,profile.count);'
    )
  ){
    fail(
      'Startup loader still uses the old round-robin-only preload strategy.'
    );
  }

  const css=
    read('startup-loader.css');

  if(
    css.includes(
      'backdrop-filter:blur(18px)'
    )||
    css.includes(
      'font-size:clamp(48px,14vw,64px)'
    )
  ){
    fail(
      'Startup loader still contains the retired glass-card / oversized wordmark treatment.'
    );
  }

  includesAll(
    css,
    [
      'font-size:30px;',
      'height:3px;',
      'background:#f3f4f8;'
    ],
    'startup-loader.css'
  );
}catch(error){
  fail(
    `Startup loader validation failed: ${error.message}`
  );
}

/*
 * Gate 2 — Catalog media adapter must consume Startup preload knowledge.
 */
try{
  const catalogData=
    read('catalog-data.js');

  includesAll(
    catalogData,
    [
      "'dreamland:catalog-media-ready'",
      'window.DreamlandMedia',
      'window.ImageManager',
      'window.DreamlandResponsiveImages'
    ],
    'catalog-data.js'
  );

  const imageVariants=
    read('image-variants.js');

  includesAll(
    imageVariants,
    [
      'window.DreamlandStartupLoader',
      '.hasPreloaded?.(',
      "startupPreloaded",
      "priority==='high'||"
    ],
    'image-variants.js'
  );
}catch(error){
  fail(
    `Catalog preload bridge validation failed: ${error.message}`
  );
}

/*
 * Gate 3 — Catalog responsive media execution regression.
 *
 * This catches the token-registration race that left Catalog cards
 * permanently in their skeleton state while Detail images still worked.
 */
try{
  delete globalThis.DreamlandMedia;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/services/media/runtime-media.js'
      )
    ).href+
    `?b7-device-media=${Date.now()}`
  );

  const media=
    globalThis.DreamlandMedia;

  if(
    !media||
    typeof media.loadResponsiveImage!==
      'function'
  ){
    fail(
      'DreamlandMedia.loadResponsiveImage is unavailable.'
    );
  }else{
    const classes=
      new Set();

    const frame={
      classList:{
        add(...values){
          values.forEach(
            value=>classes.add(value)
          );
        },
        remove(...values){
          values.forEach(
            value=>classes.delete(value)
          );
        }
      }
    };

    const image={
      dataset:{},
      classList:{
        add(){},
        remove(){}
      },
      complete:false,
      naturalWidth:0,
      onload:null,
      onerror:null,
      fetchPriority:'auto',
      loading:'lazy',
      decoding:'async',
      removeAttribute(){},
      closest(){
        return frame;
      },
      async decode(){},
      set src(value){
        this._src=value;
        this.naturalWidth=480;
        this.complete=true;

        queueMicrotask(
          ()=>this.onload?.()
        );
      },
      get src(){
        return this._src||'';
      }
    };

    const loaded=
      await media.loadResponsiveImage(
        image,
        './images/products/ADV001/cover.webp',
        'catalog',
        'high'
      );

    if(loaded!==true){
      fail(
        'DreamlandMedia.loadResponsiveImage cancelled a fresh Catalog image.'
      );
    }

    if(
      !classes.has(
        'is-loaded'
      )||
      classes.has(
        'is-error'
      )
    ){
      fail(
        'Successful responsive image load did not mark its frame is-loaded.'
      );
    }

    if(
      !String(
        image.src||''
      ).includes(
        '/images/generated/products/ADV001/cover-480.webp'
      )
    ){
      fail(
        'Catalog responsive media did not select the 480px generated candidate.'
      );
    }
  }
}catch(error){
  fail(
    `Responsive media execution regression failed: ${error.message}`
  );
}

/*
 * Gate 4 — Masterpiece packaging is included in base price.
 */
try{
  const series=
    readJson(
      'data/series.json'
    ).series||{};

  const masterpiece=
    series.masterpiece;

  if(!masterpiece){
    fail(
      'Masterpiece series is missing.'
    );
  }else{
    const options=
      masterpiece.packaging
        ?.options||[];

    if(
      options.length!==1||
      options[0]!=='礼品包装'
    ){
      fail(
        `Masterpiece packaging options must contain only 礼品包装; got ${JSON.stringify(options)}.`
      );
    }

    if(
      masterpiece.packaging
        ?.default!=='礼品包装'
    ){
      fail(
        'Masterpiece default packaging must be 礼品包装.'
      );
    }

    if(
      Number(
        masterpiece.packaging
          ?.surchargesCny
          ?.['礼品包装']
      )!==0
    ){
      fail(
        'Masterpiece 礼品包装 surcharge must be 0 because it is included in base price.'
      );
    }
  }

  for(const id of [
    'advanced',
    'classic',
    'holiday'
  ]){
    if(
      Number(
        series[id]
          ?.packaging
          ?.surchargesCny
          ?.['礼品包装']
      )!==50
    ){
      fail(
        `${id} 礼品包装 surcharge must remain 50.`
      );
    }
  }
}catch(error){
  fail(
    `Masterpiece packaging validation failed: ${error.message}`
  );
}

/*
 * Gate 5 — B7 takes the current release/cache gate without reopening B6.
 */
try{
  const sw=
    read('sw.js');

  const cacheVersion=
    sw.match(
      /const CACHE_VERSION = 'dreamland-pwa-v(\d+)';/
    );

  if(
    !cacheVersion||
    Number(cacheVersion[1])<87
  ){
    fail(
      'B7-00A requires PWA cache version v87 or later.'
    );
  }

  const b6=
    read(
      'scripts/validate-b6-exit-regression.mjs'
    );

  if(
    b6.includes(
      "endsWith(\n        'npm run b6:exit'"
    )||
    b6.includes(
      "\"const CACHE_VERSION = 'dreamland-pwa-v85';\""
    )
  ){
    fail(
      'B6 Exit still owns a fixed final-gate/cache-version lock.'
    );
  }

  const packageJson=
    readJson(
      'package.json'
    );

  if(
    packageJson.scripts
      ?.['b7:device-baseline']!==
      'node scripts/validate-b7-real-device-baseline-fix.mjs'
  ){
    fail(
      'package.json is missing b7:device-baseline.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run b6:exit'
    )||
    !validate.includes(
      'npm run b7:device-baseline'
    )
  ){
    fail(
      'npm run validate must keep the B6 Exit and B7 device baseline gates.'
    );
  }

  const index=
    read('index.html');

  /*
   * B7-00B.3A R5 keeps the same v63 Mobile Startup Loader, but the marker now
   * explicitly documents its Mobile-only ownership. Accept either historical
   * marker form while still locking the loader release to v63.
   */
  if(
    !/<!-- DREAMLAND v63 startup loader(?: — Mobile only)? -->/
      .test(
        index
      )
  ){
    fail(
      'index.html startup loader release marker must remain v63 (Mobile-only wording is allowed).'
    );
  }
}catch(error){
  fail(
    `B7 release-gate validation failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nB7-00A Real-device Baseline Fix validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'B7-00A Real-device Baseline Fix validation: PASS'
);

console.log(
  'Startup/Catalog responsive image execution PASS / Masterpiece gift packaging included / PWA >= v87.'
);

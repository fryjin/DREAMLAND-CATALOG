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

function compact(value){
  return String(value||'')
    .replace(/\s+/g,'');
}

function count(source,pattern){
  return (source.match(pattern)||[]).length;
}

try{
  const foundation=
    (
      await import(
        pathToFileURL(
          path.join(
            ROOT,
            'src/app/foundation.js'
          )
        ).href+
        `?b606=${Date.now()}`
      )
    ).FRONTEND_FOUNDATION;

  if(
    foundation?.phase!=='B6-06'||
    foundation?.runtimeIntegrated!==true||
    foundation?.runtimeIntegration!=='partial'
  ){
    fail(
      'Frontend foundation must declare B6-06 partial runtime integration.'
    );
  }
}catch(error){
  fail(
    `Cannot inspect B6-06 foundation: ${error.message}`
  );
}

try{
  const index=read('index.html');
  const source=compact(index);

  for(const forbidden of [
    'function syncDetailLegacyState(',
    'activeProduct',
    'state.items',
    'let state='
  ]){
    if(
      source.includes(
        compact(forbidden)
      )
    ){
      fail(
        `index.html still exposes compatibility state: ${forbidden}`
      );
    }
  }

  const bareLegacyConfigAccess=
    /(?<![\w$.])config\.(?:scentId|scentSeries|scent|pattern|pack|qty|size)\b/;

  const bareConfigMatch=
    index.match(
      bareLegacyConfigAccess
    );

  if(bareConfigMatch){
    fail(
      `index.html still exposes bare compatibility config access: ${bareConfigMatch[0]}`
    );
  }

  for(const required of [
    'function detailProduct(',
    'detailFeature.product(',
    'function detailConfig(',
    'detailFeature.getConfig(',
    'detailFeature.buildViewModel(',
    'inquiryFeature.items(',
    'inquiryFeature.findItem(',
    'window.PatternPreviewSwipe',
    '.openSharedOptionPreview(',
    'beforeClose?.(',
    'deactivate?.(',
    'window.DreamlandCopyPolish?.updateMeta?.()',
    'window.DreamlandCopyPolish?.decoratePreview?.()'
  ]){
    if(
      !source.includes(
        compact(required)
      )
    ){
      fail(
        `index.html is missing the B6-06 direct-owner bridge: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `index.html compatibility inspection failed: ${error.message}`
  );
}

try{
  const progressive=read('detail-progressive.js');

  if(
    /\bactiveProduct\b/.test(progressive)
  ){
    fail(
      'detail-progressive.js still reads the removed activeProduct compatibility snapshot.'
    );
  }

  for(const required of [
    'window.DreamlandDetail',
    'function detailProduct(',
    '.product'
  ]){
    if(!progressive.includes(required)){
      fail(
        `detail-progressive.js is missing direct Detail Feature access: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `detail-progressive.js compatibility inspection failed: ${error.message}`
  );
}

try{
  const preview=read('pattern-preview-swipe.js');
  const previewCompact=compact(preview);

  for(const forbidden of [
    'syncDetailLegacyState',
    "typeof config!=='undefined'",
    "typeof activeProduct!=='undefined'",
    'window.openSharedPreviewFromButton=',
    'window.closePreviewImage=',
    'window.openPreviewImage=',
    'window.openScentNotes=',
    'function installHooks('
  ]){
    if(
      previewCompact.includes(
        compact(forbidden)
      )
    ){
      fail(
        `pattern-preview-swipe.js still owns legacy compatibility behavior: ${forbidden}`
      );
    }
  }

  for(const required of [
    'window.DreamlandDetail',
    '.getConfig',
    '.product',
    '.setOption(',
    'function beforeClose(',
    'function deactivate(',
    'beforeClose,',
    'deactivate'
  ]){
    if(
      !previewCompact.includes(
        compact(required)
      )
    ){
      fail(
        `pattern-preview-swipe.js is missing B6-06 direct Feature/lifecycle routing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `pattern-preview-swipe.js compatibility inspection failed: ${error.message}`
  );
}

try{
  const manager=read('image-manager.js');
  const managerCompact=compact(manager);

  for(const forbidden of [
    'state.items',
    "typeof state===",
    'item.cover=',
    'typeof save==='
  ]){
    if(
      managerCompact.includes(
        compact(forbidden)
      )
    ){
      fail(
        `image-manager.js still uses Inquiry compatibility state: ${forbidden}`
      );
    }
  }

  for(const required of [
    'window.DreamlandInquiry',
    '.findItem',
    '.items',
    '.replaceItem',
    '.persist'
  ]){
    if(
      !managerCompact.includes(
        compact(required)
      )
    ){
      fail(
        `image-manager.js is missing direct Inquiry Feature routing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `image-manager.js compatibility inspection failed: ${error.message}`
  );
}

try{
  const copy=read('copy-polish.js');
  const copyCompact=compact(copy);

  for(const forbidden of [
    'renderPreview=function',
    'buildWeb3FormsPayload=function',
    'setLang=function',
    'function wrapPreview(',
    'function wrapPayload(',
    'function wrapSetLang(',
    "||ui('scentRecommend')"
  ]){
    if(
      copyCompact.includes(
        compact(forbidden)
      )
    ){
      fail(
        `copy-polish.js still monkey-patches App behavior: ${forbidden}`
      );
    }
  }

  for(const required of [
    'function updateMeta(',
    'function decoratePreview(',
    'window.DreamlandCopyPolish'
  ]){
    if(
      !copyCompact.includes(
        compact(required)
      )
    ){
      fail(
        `copy-polish.js lost its presentation adapter contract: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `copy-polish.js cleanup inspection failed: ${error.message}`
  );
}

try{
  const catalogData=read('catalog-data.js');

  if(
    /loadScript\(\s*['"]\.\/custom-scent-multi\.js['"]/.test(
      catalogData
    )
  ){
    fail(
      'catalog-data.js still dynamically loads custom-scent-multi.js even though index.html owns its canonical script load.'
    );
  }

  if(
    count(
      catalogData,
      /loadScript\(\s*['"]\.\/copy-polish\.js['"]/g
    )!==1
  ){
    fail(
      'catalog-data.js must dynamically load copy-polish.js exactly once.'
    );
  }
}catch(error){
  fail(
    `catalog-data.js loader inspection failed: ${error.message}`
  );
}

try{
  const detailState=
    read(
      'scripts/validate-detail-state-configuration-boundary.mjs'
    );

  if(
    detailState.includes(
      'function syncDetailLegacyState('
    )
  ){
    fail(
      'Historical B6-03 validator still requires syncDetailLegacyState.'
    );
  }

  const detailUi=
    read(
      'scripts/validate-detail-ui-renderer-boundary.mjs'
    );

  if(
    detailUi.includes(
      "'syncDetailLegacyState'"
    )||
    detailUi.includes(
      '"syncDetailLegacyState"'
    )
  ){
    fail(
      'Historical B6-04 validator still requires syncDetailLegacyState.'
    );
  }

  const custom=
    read(
      'scripts/validate-custom-request-feature-boundary.mjs'
    );

  if(
    custom.includes(
      "foundation?.phase!==\n      'B6-05'"
    )||
    custom.includes(
      'dreamland-pwa-v83'
    )
  ){
    fail(
      'Historical B6-05 validator still owns the B6-05 phase or v83 cache version.'
    );
  }

  const frontend=
    read(
      'scripts/validate-frontend-foundation.mjs'
    );

  if(
    !frontend.includes(
      "if(foundation.phase!=='B6-06')"
    )
  ){
    fail(
      'Frontend foundation validator does not require B6-06.'
    );
  }
}catch(error){
  fail(
    `Historical-validator cleanup inspection failed: ${error.message}`
  );
}

try{
  const sw=read('sw.js');

  for(const entry of [
    './detail-progressive.js',
    './pattern-preview-swipe.js',
    './image-manager.js',
    './copy-polish.js',
    './custom-scent-multi.js'
  ]){
    const escaped=
      entry.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

    const matches=
      sw.match(
        new RegExp(
          `'${escaped}'`,
          'g'
        )
      )||[];

    if(matches.length!==1){
      fail(
        `sw.js APP_SHELL must include ${entry} exactly once; found ${matches.length}.`
      );
    }
  }
}catch(error){
  fail(
    `SW B6-06 inspection failed: ${error.message}`
  );
}

try{
  const packageJson=
    JSON.parse(
      read('package.json')
    );

  if(
    packageJson.scripts?.['compatibility:cleanup']!==
      'node scripts/validate-shared-compatibility-cleanup.mjs'||
    !String(
      packageJson.scripts?.validate||''
    ).includes(
      'npm run compatibility:cleanup'
    )
  ){
    fail(
      'package.json is missing the B6-06 compatibility cleanup validator.'
    );
  }
}catch(error){
  fail(
    `package.json B6-06 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nShared / Compatibility Cleanup validation failed:\n'
  );

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  'Shared / Compatibility Cleanup validation: PASS'
);

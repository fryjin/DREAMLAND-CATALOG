#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relativePath){
  return fs.readFileSync(
    path.join(ROOT,relativePath),
    'utf8'
  );
}

try{
  const indexSource=read('index.html');

  if(
    !indexSource.includes(
      "'sharedAssets.transformCandidates'"
    )
  ){
    fail(
      'index.html is missing sharedAssets.transformCandidates extension point.'
    );
  }

  if(
    !/function\s+sharedAssetCandidates\s*\(/.test(
      indexSource
    )
  ){
    fail(
      'index.html is missing the core sharedAssetCandidates function.'
    );
  }

  if(
    !/DreamlandRuntimeHooks\s*\?\.\s*get\s*\(\s*['"]sharedAssets\.transformCandidates['"]/.test(
      indexSource
    )&&
    !/DreamlandRuntimeHooks[\s\S]{0,120}\.get\s*\(\s*['"]sharedAssets\.transformCandidates['"]/.test(
      indexSource
    )
  ){
    fail(
      'sharedAssetCandidates does not consume the explicit shared asset transform slot.'
    );
  }
}catch(error){
  fail(
    `index.html shared-asset extension inspection failed: ${error.message}`
  );
}

try{
  const variantsSource=read('image-variants.js');

  if(
    !variantsSource.includes(
      "'sharedAssets.transformCandidates'"
    )
  ){
    fail(
      'image-variants.js does not register sharedAssets.transformCandidates.'
    );
  }

  if(
    !variantsSource.includes(
      'transformSharedAssetCandidates'
    )
  ){
    fail(
      'image-variants.js is missing the shared-asset transform adapter.'
    );
  }

  for(
    const marker of [
      'sharedAssetCandidates=function',
      'originalSharedAssetCandidates',
      'installSharedAssetVariants'
    ]
  ){
    if(
      variantsSource.includes(marker)
    ){
      fail(
        `image-variants.js still monkey-patches shared assets: ${marker}`
      );
    }
  }

  if(
    !variantsSource.includes(
      "if(category==='home')"
    )
  ){
    fail(
      'Shared asset adapter must preserve the home-category bypass.'
    );
  }

  if(
    !variantsSource.includes(
      "media.responsiveWidth(\n        'shared'"
    )
  ){
    fail(
      'Shared asset adapter must preserve the shared responsive-width policy.'
    );
  }

  if(
    !variantsSource.includes(
      'media.variantPath('
    )
  ){
    fail(
      'Shared asset adapter must continue producing generated responsive variants.'
    );
  }
}catch(error){
  fail(
    `image-variants.js shared-asset cleanup inspection failed: ${error.message}`
  );
}

try{
  const patternSource=read('pattern-preview-swipe.js');

  if(
    !patternSource.includes(
      'sharedAssetCandidates('
    )
  ){
    fail(
      'pattern-preview-swipe.js must continue using the core sharedAssetCandidates pipeline.'
    );
  }
}catch(error){
  fail(
    `pattern-preview-swipe.js compatibility inspection failed: ${error.message}`
  );
}

try{
  const previousValidator=
    read('scripts/validate-media-hook-cleanup.mjs');

  if(
    previousValidator.includes(
      'sharedAssetCandidates=function'
    )
  ){
    fail(
      'Historical B3-01 validator still requires the removed sharedAssetCandidates monkey patch.'
    );
  }

  if(
    previousValidator.includes(
      'dreamland-pwa-v67'
    )
  ){
    fail(
      'Historical B3-01 validator still owns a fixed SW cache version.'
    );
  }
}catch(error){
  fail(
    `Historical hook validator compatibility inspection failed: ${error.message}`
  );
}

try{
  const swSource=read('sw.js');

  for(
    const appShellPath of [
      './src/app/runtime-hooks.js',
      './src/services/media/runtime-media.js',
      './image-variants.js',
      './pattern-preview-swipe.js'
    ]
  ){
    const escaped=
      appShellPath
        .replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

    const matches=
      swSource.match(
        new RegExp(
          `'${escaped}'`,
          'g'
        )
      )||[];

    if(matches.length!==1){
      fail(
        `sw.js APP_SHELL must include ${appShellPath} exactly once; found ${matches.length}.`
      );
    }
  }
}catch(error){
  fail(
    `sw.js B3-02 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nShared asset hook cleanup validation failed:\n'
  );

  for(const error of errors){
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  'Shared asset hook cleanup validation: PASS'
);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relativePath){
  return fs.readFileSync(
    path.join(
      ROOT,
      relativePath
    ),
    'utf8'
  );
}

const runtimePath=
  path.join(
    ROOT,
    'src/app/runtime-hooks.js'
  );

if(!fs.existsSync(runtimePath)){
  fail(
    'Runtime hook registry is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandRuntimeHooks;

    await import(
      `${pathToFileURL(runtimePath).href}?hook-validation=${Date.now()}`
    );

    const hooks=
      globalThis.DreamlandRuntimeHooks;

    if(!hooks){
      fail(
        'runtime-hooks.js did not expose DreamlandRuntimeHooks.'
      );
    }else{
      if(
        hooks.version!==
        'B3-01'
      ){
        fail(
          `Unexpected runtime hook registry version: ${hooks.version}`
        );
      }

      for(
        const method of [
          'register',
          'get',
          'ownerOf',
          'subscribe',
          'emit',
          'snapshot'
        ]
      ){
        if(
          typeof hooks[method]!==
          'function'
        ){
          fail(
            `DreamlandRuntimeHooks.${method} is missing.`
          );
        }
      }

      const calls=[];

      hooks.register(
        'fixture.slot',
        value=>value+1,
        {
          owner:'fixture'
        }
      );

      if(
        hooks.get(
          'fixture.slot'
        )?.(1)!==2
      ){
        fail(
          'Runtime slot registration/get parity failed.'
        );
      }

      if(
        hooks.ownerOf(
          'fixture.slot'
        )!=='fixture'
      ){
        fail(
          'Runtime slot owner tracking failed.'
        );
      }

      hooks.subscribe(
        'fixture.event',
        payload=>{
          calls.push(
            payload
          );
        },
        {
          owner:'fixture'
        }
      );

      if(
        hooks.emit(
          'fixture.event',
          'ok'
        )!==1||
        calls[0]!=='ok'
      ){
        fail(
          'Runtime event subscribe/emit parity failed.'
        );
      }

      let duplicateRejected=false;

      try{
        hooks.register(
          'fixture.slot',
          ()=>0,
          {
            owner:'duplicate'
          }
        );
      }catch{
        duplicateRejected=true;
      }

      if(!duplicateRejected){
        fail(
          'Runtime hook registry must reject duplicate slot ownership.'
        );
      }
    }
  }catch(error){
    fail(
      `Runtime hook registry execution failed: ${error.message}`
    );
  }
}

try{
  const catalogSource=
    read('catalog-data.js');

  const hooksMarker=
    "'./src/app/runtime-hooks.js'";

  const mediaMarker=
    "'./src/services/media/runtime-media.js'";

  const variantsMarker=
    "'./image-variants.js'";

  const detailMarker=
    "'./detail-progressive.js'";

  const hooksIndex=
    catalogSource.indexOf(
      hooksMarker
    );

  const mediaIndex=
    catalogSource.indexOf(
      mediaMarker
    );

  const variantsIndex=
    catalogSource.indexOf(
      variantsMarker
    );

  const detailIndex=
    catalogSource.indexOf(
      detailMarker
    );

  if(
    hooksIndex<0||
    mediaIndex<0||
    variantsIndex<0||
    detailIndex<0||
    !(
      hooksIndex<
      mediaIndex&&
      mediaIndex<
      variantsIndex&&
      variantsIndex<
      detailIndex
    )
  ){
    fail(
      'Runtime hook/media adapter load order is incorrect.'
    );
  }
}catch(error){
  fail(
    `catalog-data.js hook-load inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read('index.html');

  const required=[
    "'catalog.renderProductCard'",
    "'catalog.afterAppendBatch'",
    "'detail.renderMedia'",
    "'detail.startCarousel'",
    "'detail.afterSlideUpdate'"
  ];

  for(
    const marker of required
  ){
    if(
      !indexSource.includes(
        marker
      )
    ){
      fail(
        `index.html is missing explicit runtime extension point: ${marker}`
      );
    }
  }

  if(
    !/window\.DreamlandRuntimeHooks\s*\?\.\s*get\s*\(/.test(
      indexSource
    )
  ){
    fail(
      'index.html does not consume slot-based runtime hooks.'
    );
  }

  if(
    !/window\.DreamlandRuntimeHooks\s*\?\.\s*emit\s*\(/.test(
      indexSource
    )
  ){
    fail(
      'index.html does not emit runtime hook events.'
    );
  }
}catch(error){
  fail(
    `index.html extension-point inspection failed: ${error.message}`
  );
}

try{
  const variantsSource=
    read('image-variants.js');

  for(
    const marker of [
      "hooks.register(\n      'catalog.renderProductCard'",
      "hooks.subscribe(\n      'catalog.afterAppendBatch'"
    ]
  ){
    if(
      !variantsSource.includes(
        marker
      )
    ){
      fail(
        `image-variants.js is missing explicit registration: ${marker}`
      );
    }
  }

  for(
    const marker of [
      'renderProductCard=',
      'appendCatalogBatch=',
      'renderDetailMedia=',
      'updateDetailSlide=',
      'startDetailCarousel='
    ]
  ){
    if(
      variantsSource.includes(
        marker
      )
    ){
      fail(
        `image-variants.js still monkey-patches core runtime: ${marker}`
      );
    }
  }

}catch(error){
  fail(
    `image-variants.js hook cleanup inspection failed: ${error.message}`
  );
}

try{
  const detailSource=
    read('detail-progressive.js');

  for(
    const marker of [
      "hooks.register(\n      'detail.renderMedia'",
      "hooks.register(\n      'detail.startCarousel'",
      "hooks.subscribe(\n      'detail.afterSlideUpdate'"
    ]
  ){
    if(
      !detailSource.includes(
        marker
      )
    ){
      fail(
        `detail-progressive.js is missing explicit registration: ${marker}`
      );
    }
  }

  for(
    const marker of [
      'renderDetailMedia=',
      'updateDetailSlide=',
      'startDetailCarousel='
    ]
  ){
    if(
      detailSource.includes(
        marker
      )
    ){
      fail(
        `detail-progressive.js still monkey-patches core runtime: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `detail-progressive.js hook cleanup inspection failed: ${error.message}`
  );
}

try{
  const managerSource=
    read('image-manager.js');

  if(
    !managerSource.includes(
      'renderInquiry=function'
    )
  ){
    fail(
      'B3-01 must preserve the renderInquiry legacy adapter for later cleanup.'
    );
  }
}catch(error){
  fail(
    `image-manager.js scope guard inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read('sw.js');

  const matches=
    swSource.match(
      /'\.\/src\/app\/runtime-hooks\.js'/g
    )||[];

  if(matches.length!==1){
    fail(
      `sw.js APP_SHELL must include runtime-hooks.js exactly once; found ${matches.length}.`
    );
  }
}catch(error){
  fail(
    `sw.js runtime-hook app-shell inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nMedia adapter hook cleanup validation failed:\n'
  );

  for(
    const error of
    errors
  ){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Media adapter hook cleanup validation: PASS'
);

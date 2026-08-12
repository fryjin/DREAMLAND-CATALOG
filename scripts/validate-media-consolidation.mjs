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
    'src/services/media/runtime-media.js'
  );

if(
  !fs.existsSync(
    runtimePath
  )
){
  fail(
    'Media runtime service is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandMedia;

    await import(
      `${pathToFileURL(runtimePath).href}?media-validation=${Date.now()}`
    );

    const service=
      globalThis.DreamlandMedia;

    if(!service){
      fail(
        'Media runtime did not expose DreamlandMedia.'
      );
    }else{
      if(
        service.version!==
        'B2-04'
      ){
        fail(
          `Unexpected media service version: ${service.version}`
        );
      }

      const required=[
        'cleanPath',
        'unique',
        'connectionInfo',
        'isConstrainedNetwork',
        'responsiveWidth',
        'variantPath',
        'frameFor',
        'markLoading',
        'markLoaded',
        'markError',
        'configureImage',
        'loadElementSource',
        'loadCandidates',
        'loadResponsiveImage',
        'resetResponsiveImage',
        'preloadSource'
      ];

      for(
        const method of
        required
      ){
        if(
          typeof service[method]!==
          'function'
        ){
          fail(
            `DreamlandMedia.${method} is missing.`
          );
        }
      }

      const variant=
        service.variantPath(
          './images/products/CLA001/cover.webp',
          480
        );

      if(
        variant!==
        './images/generated/products/CLA001/cover-480.webp'
      ){
        fail(
          `Media variantPath parity failed: ${variant}`
        );
      }

      if(
        service.responsiveWidth(
          'catalog'
        )!==480
      ){
        fail(
          'Catalog responsive width must remain 480.'
        );
      }

      if(
        service.responsiveWidth(
          'detail'
        )!==960
      ){
        fail(
          'Detail responsive width must remain 960 on an unconstrained Node fixture.'
        );
      }
    }
  }catch(error){
    fail(
      `Media runtime execution failed: ${error.message}`
    );
  }
}

try{
  const catalogSource=
    read('catalog-data.js');

  const mediaMarker=
    "'./src/services/media/runtime-media.js'";

  const managerMarker=
    "'./image-manager.js'";

  const variantsMarker=
    "'./image-variants.js'";

  const progressiveMarker=
    "'./detail-progressive.js'";

  const mediaIndex=
    catalogSource.indexOf(
      mediaMarker
    );

  const managerIndex=
    catalogSource.indexOf(
      managerMarker
    );

  const variantsIndex=
    catalogSource.indexOf(
      variantsMarker
    );

  const progressiveIndex=
    catalogSource.indexOf(
      progressiveMarker
    );

  if(
    mediaIndex<0||
    managerIndex<0||
    variantsIndex<0||
    progressiveIndex<0||
    !(
      mediaIndex<
      managerIndex&&
      managerIndex<
      variantsIndex&&
      variantsIndex<
      progressiveIndex
    )
  ){
    fail(
      'catalog-data.js media runtime/adapters load order is incorrect.'
    );
  }
}catch(error){
  fail(
    `catalog-data.js media inspection failed: ${error.message}`
  );
}

try{
  const managerSource=
    read('image-manager.js');

  if(
    !managerSource.includes(
      'window.DreamlandMedia'
    )
  ){
    fail(
      'image-manager.js does not consume DreamlandMedia.'
    );
  }

  for(
    const marker of [
      'renderProductCard=',
      'renderDetailMedia=',
      'updateDetailSlide='
    ]
  ){
    if(
      managerSource.includes(
        marker
      )
    ){
      fail(
        `image-manager.js still installs superseded catalog/detail hook: ${marker}`
      );
    }
  }

  if(
    !managerSource.includes(
      'renderInquiry=function'
    )
  ){
    fail(
      'image-manager.js must preserve the inquiry-media adapter during B2-04.'
    );
  }
}catch(error){
  fail(
    `image-manager.js consolidation inspection failed: ${error.message}`
  );
}

try{
  const variantsSource=
    read('image-variants.js');

  if(
    !variantsSource.includes(
      'window.DreamlandMedia'
    )
  ){
    fail(
      'image-variants.js does not consume DreamlandMedia.'
    );
  }

  for(
    const marker of [
      'const CATALOG_WIDTH=',
      'const DETAIL_WIDTH=',
      'const SHARED_WIDTH=',
      'const imageStates=',
      'function variantPath(',
      'function isConstrainedNetwork(',
      'async function loadResponsiveImage('
    ]
  ){
    if(
      variantsSource.includes(
        marker
      )
    ){
      fail(
        `image-variants.js still duplicates media-core logic: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `image-variants.js consolidation inspection failed: ${error.message}`
  );
}

try{
  const progressiveSource=
    read('detail-progressive.js');

  if(
    !progressiveSource.includes(
      'window.DreamlandMedia'
    )
  ){
    fail(
      'detail-progressive.js does not consume DreamlandMedia.'
    );
  }

  for(
    const marker of [
      'window.DreamlandResponsiveImages',
      'function connectionInfo(',
      'function preloadSource(',
      'function markLoading(',
      'function markLoaded(',
      'function markError('
    ]
  ){
    if(
      progressiveSource.includes(
        marker
      )
    ){
      fail(
        `detail-progressive.js still duplicates/delegates through old media core: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `detail-progressive.js consolidation inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read('sw.js');

  if(
    !swSource.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v66';"
    )
  ){
    fail(
      'sw.js cache version must be dreamland-pwa-v66 for B2-04.'
    );
  }

  const matches=
    swSource.match(
      /'\.\/src\/services\/media\/runtime-media\.js'/g
    )||[];

  if(matches.length!==1){
    fail(
      `sw.js APP_SHELL must include runtime-media.js exactly once; found ${matches.length}.`
    );
  }
}catch(error){
  fail(
    `sw.js media app-shell inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nMedia service consolidation validation failed:\n'
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
  'Media service consolidation validation: PASS'
);

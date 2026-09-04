#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const OUT=
  path.join(
    ROOT,
    '.r4-astro-dist'
  );

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

function json(relative){
  return JSON.parse(read(relative));
}

try{
  delete globalThis
    .DreamlandHomeRuntime;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/astro/runtime/home-runtime.js'
      )
    ).href+
    '?r4-home-runtime='+
    Date.now()
  );

  const runtime=
    globalThis
      .DreamlandHomeRuntime;

  if(
    !runtime||
    runtime.version!==
      'R4.3B'||
    runtime.id!==
      'DREAMLAND_R4_HOME_RUNTIME_R4_3B'
  ){
    fail(
      'DreamlandHomeRuntime R4.3B was not exposed.'
    );
  }else{
    if(
      runtime.normalizeLanguage(
        'KO',
        'en',
        [
          'en',
          'zh',
          'ko'
        ]
      )!=='ko'||
      runtime.normalizeLanguage(
        'fr',
        'en',
        [
          'en',
          'zh',
          'ko'
        ]
      )!=='en'
    ){
      fail(
        'Home language normalization parity failed.'
      );
    }

    const count=
      runtime.inquiryCount({
        version:2,
        items:[
          {
            type:'product',
            qty:12
          },
          {
            type:'product',
            qty:5
          },
          {
            type:'custom'
          }
        ]
      });

    if(count!==18){
      fail(
        'Home Inquiry badge count must match Legacy quantity semantics.'
      );
    }

    if(
      runtime.inquiryCount(
        'not-json'
      )!==0||
      runtime.inquiryCount(
        {
          version:2,
          items:[]
        }
      )!==0
    ){
      fail(
        'Home Inquiry badge malformed/empty fallback failed.'
      );
    }
  }
}catch(error){
  fail(
    'Home minimal runtime execution failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/astro/runtime/home-runtime.js'
    );

  if(
    Buffer.byteLength(
      source,
      'utf8'
    )>
    12000
  ){
    fail(
      'Home minimal runtime exceeds the 12 KB source budget.'
    );
  }

  for(const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'serviceWorker',
    'DreamlandInquiry',
    'DreamlandDetail',
    'DreamlandCustom',
    'DreamlandRisk',
    'DreamlandSubmission',
    'DreamlandDesktopExperience',
    'runtime-desktop',
    'catalog-data.js'
  ]){
    if(
      source.includes(
        forbidden
      )
    ){
      fail(
        'Home minimal runtime crossed a forbidden boundary: '+
        forbidden
      );
    }
  }

  for(const required of [
    "const VERSION='R4.3B';",
    "const RUNTIME_ID='DREAMLAND_R4_HOME_RUNTIME_R4_3B';",
    "root.addEventListener(",
    "'pageshow'",
    "'storage'"
  ]){
    if(
      !source.includes(
        required
      )
    ){
      fail(
        'Home minimal runtime is missing: '+
        required
      );
    }

  for(const [label,pattern] of [
    [
      'state.storage.languageKey',
      /state\s*\.\s*storage\s*\.\s*languageKey/
    ],
    [
      'state.storage.inquiryKey',
      /state\s*\.\s*storage\s*\.\s*inquiryKey/
    ]
  ]){
    if(
      !pattern.test(
        source
      )
    ){
      fail(
        'Home minimal runtime is missing: '+
        label
      );
    }
  }
  }
}catch(error){
  fail(
    'Home runtime source inspection failed: '+
    error.message
  );
}

try{
  const homeFile=
    path.join(
      OUT,
      'index.html'
    );

  if(
    !fs.existsSync(
      homeFile
    )
  ){
    fail(
      'Astro Home output is missing.'
    );
  }else{
    const html=
      fs.readFileSync(
        homeFile,
        'utf8'
      );

    const stateMatch=
      html.match(
        /<script[^>]*id="homeRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
      )||
      html.match(
        /<script[^>]*type="application\/json"[^>]*id="homeRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
      );

    if(!stateMatch){
      fail(
        'Astro Home output is missing the non-executable Home runtime state.'
      );
    }else{
      try{
        const state=
          JSON.parse(
            stateMatch[1]
          );

        if(
          state.version!==
            'R4.3B'||
          state.defaultLanguage!==
            'en'||
          state.storage
            ?.languageKey!==
            'productManualLang'||
          state.storage
            ?.inquiryKey!==
            'productManualV2State'||
          state.storage
            ?.inquiryVersion!==
            2
        ){
          fail(
            'Home runtime storage/language contract changed.'
          );
        }

        const languages=
          Object.keys(
            state.languages||
            {}
          );

        for(const lang of [
          'en',
          'zh',
          'ko'
        ]){
          if(
            !languages.includes(lang)
          ){
            fail(
              'Home runtime state is missing language: '+
              lang
            );

            continue;
          }

          const view=
            state.languages[lang];

          if(
            view.collections
              ?.length!==4||
            view.featuredProducts
              ?.length!==5
          ){
            fail(
              'Home runtime state must preserve 4 collections / 5 Current Picks for '+
              lang+
              '.'
            );
          }
        }
      }catch(error){
        fail(
          'Home runtime state JSON is invalid: '+
          error.message
        );
      }
    }

    if(
      !html.includes(
        'src="/r4-home-runtime.js"'
      )
    ){
      fail(
        'Astro Home output is missing the dedicated Home runtime script.'
      );
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
        'Astro Home must contain exactly one executable client script; found '+
        executableScripts.length+
        '.'
      );
    }

    for(const marker of [
      'data-home-language-select',
      'data-home-inquiry-count',
      'data-home-bind=',
      'data-home-collection-label',
      'data-home-product-name'
    ]){
      if(
        !html.includes(
          marker
        )
      ){
        fail(
          'Astro Home runtime binding is missing: '+
          marker
        );
      }
    }
  }

  const outputRuntime=
    path.join(
      OUT,
      'r4-home-runtime.js'
    );

  if(
    !fs.existsSync(
      outputRuntime
    )
  ){
    fail(
      'Isolated Astro output is missing r4-home-runtime.js.'
    );
  }else{
    const outputSource=
      fs.readFileSync(
        outputRuntime,
        'utf8'
      );

    if(
      !outputSource.includes(
        'DREAMLAND_R4_HOME_RUNTIME_R4_3B'
      )
    ){
      fail(
        'Copied Home runtime output marker is missing.'
      );
    }
  }
}catch(error){
  fail(
    'Home runtime output inspection failed: '+
    error.message
  );
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:astro:home-runtime']!==
    'node scripts/validate-r4-astro-home-runtime.mjs'
  ){
    fail(
      'package.json is missing r4:astro:home-runtime.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const home=
    validate.indexOf(
      'npm run r4:astro:home'
    );

  const runtime=
    validate.indexOf(
      'npm run r4:astro:home-runtime'
    );

  if(
    home<0||
    runtime<=home
  ){
    fail(
      'Home runtime validation gate must run after the R4.3A Home gate.'
    );
  }

  const productionBuildSteps=
    String(
      pkg.scripts?.build||
      ''
    )
      .split(' && ')
      .map(step=>step.trim())
      .filter(Boolean);

  const historicalProductionSteps=[
    'npm run data:build',
    'npm run build:pages',
    'npm run r4:astro:build',
    'npm run r4:production:home',
    'npm run r4:production:catalog',
    'npm run r4:production:pdp',
    'npm run r4:production:custom'
  ];

  let previousProductionStep=-1;

  for(const step of historicalProductionSteps){
    const index=
      productionBuildSteps.indexOf(
        step
      );

    if(
      index<0||
      index<=previousProductionStep
    ){
      fail(
        'home-runtime must preserve the historical staged Production build order: '+
        step
      );
      break;
    }

    previousProductionStep=index;
  }
}catch(error){
  fail(
    'Home runtime package inspection failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.3B Home Minimal Runtime: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+
      error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.3B Home Minimal Runtime: PASS'
);
console.log(
  'Shared language preference / EN-ZH-KO Home content / Legacy-parity Inquiry badge / pageshow+storage refresh / single-script runtime budget verified.'
);
console.log('');

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
    'src/services/pwa/runtime-pwa.js'
  );

if(
  !fs.existsSync(
    runtimePath
  )
){
  fail(
    'PWA runtime service is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandPwa;

    await import(
      `${pathToFileURL(runtimePath).href}?pwa-validation=${Date.now()}`
    );

    const service=
      globalThis.DreamlandPwa;

    if(!service){
      fail(
        'PWA runtime service did not expose DreamlandPwa.'
      );
    }else{
      if(
        service.version!==
        'B2-03'
      ){
        fail(
          `Unexpected PWA service version: ${service.version}`
        );
      }

      const requiredMethods=[
        'configure',
        'text',
        'probeReachability',
        'applyReachability',
        'updateNetworkState',
        'refreshUi',
        'initExperience',
        'registerServiceWorker',
        'hideNetworkBanner',
        'handlePrimaryAction',
        'dismissAction',
        'openGuide',
        'closeGuide',
        'copyLink'
      ];

      for(
        const method of
        requiredMethods
      ){
        if(
          typeof service[method]!==
          'function'
        ){
          fail(
            `DreamlandPwa.${method} is missing.`
          );
        }
      }

      service.configure({
        getLanguage:()=> 'en',
        getConfig:()=>({
          installDismissDays:7
        }),
        getActiveScreen:()=> 'catalog',
        getConnectivityEndpoint:()=> './api/submit'
      });

      if(
        service.text(
          'installNow'
        )!=='Install'
      ){
        fail(
          'PWA copy localization parity failed.'
        );
      }
    }
  }catch(error){
    fail(
      `PWA runtime service execution failed: ${error.message}`
    );
  }
}

try{
  const indexSource=
    read('index.html');

  const runtimeTag=
    '<script src="./src/services/pwa/runtime-pwa.js"></script>';

  const matches=
    indexSource.match(
      /<script src="\.\/src\/services\/pwa\/runtime-pwa\.js"><\/script>/g
    )||[];

  if(matches.length!==1){
    fail(
      `index.html must load runtime-pwa.js exactly once; found ${matches.length}.`
    );
  }

  if(
    !indexSource.includes(
      'const pwaService=window.DreamlandPwa;'
    )
  ){
    fail(
      'index.html is missing the pwaService bridge.'
    );
  }

  if(
    !indexSource.includes(
      'pwaService.configure({'
    )
  ){
    fail(
      'index.html is missing DreamlandPwa dependency configuration.'
    );
  }

  const storageTag=
    '<script src="./src/services/storage/runtime-storage.js"></script>';

  const storageIndex=
    indexSource.indexOf(
      storageTag
    );

  const pwaIndex=
    indexSource.indexOf(
      runtimeTag
    );

  const bridgeIndex=
    indexSource.indexOf(
      'const pwaService=window.DreamlandPwa;'
    );

  if(
    storageIndex<0||
    pwaIndex<0||
    bridgeIndex<0||
    !(
      storageIndex<
      pwaIndex&&
      pwaIndex<
      bridgeIndex
    )
  ){
    fail(
      'PWA runtime load/bridge order is incorrect.'
    );
  }

  const forbiddenLegacyMarkers=[
    "const PWA_INSTALL_DISMISSED_KEY=",
    "const PWA_UPDATE_SESSION_KEY=",
    'const PWA_COPY=',
    'function pwaText(',
    'function probeWeb3FormsReachability(',
    'function applyPwaReachability(',
    'function registerPwaServiceWorker(',
    'function initPwaExperience(',
    "window.addEventListener('beforeinstallprompt'",
    "window.addEventListener('appinstalled'",
    "window.addEventListener('load',registerPwaServiceWorker)"
  ];

  for(
    const marker of
    forbiddenLegacyMarkers
  ){
    if(
      indexSource.includes(
        marker
      )
    ){
      fail(
        `index.html still owns legacy PWA runtime logic: ${marker}`
      );
    }
  }

  const requiredBridgeCalls=[
    'pwaService.probeReachability(true)',
    'pwaService.applyReachability(',
    "pwaService.text('offlineSubmit')",
    'pwaService.refreshUi();',
    'pwaService.initExperience();'
  ];

  for(
    const marker of
    requiredBridgeCalls
  ){
    if(
      !indexSource.includes(
        marker
      )
    ){
      fail(
        `index.html is missing PWA runtime bridge call: ${marker}`
      );
    }
  }

  const forbiddenInlineHandlers=[
    'onclick="hideNetworkBanner()"',
    'onclick="handlePwaPrimaryAction()"',
    'onclick="dismissPwaAction()"',
    'onclick="closePwaGuide()"',
    'onclick="copyPwaLink()"'
  ];

  for(
    const marker of
    forbiddenInlineHandlers
  ){
    if(
      indexSource.includes(
        marker
      )
    ){
      fail(
        `PWA markup still calls a legacy global handler: ${marker}`
      );
    }
  }
}catch(error){
  fail(
    `index.html PWA migration inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read('sw.js');

  const pwaMatches=
    swSource.match(
      /'\.\/src\/services\/pwa\/runtime-pwa\.js'/g
    )||[];

  if(
    pwaMatches.length!==1
  ){
    fail(
      `sw.js APP_SHELL must include runtime-pwa.js exactly once; found ${pwaMatches.length}.`
    );
  }

  const storageMatches=
    swSource.match(
      /'\.\/src\/services\/storage\/runtime-storage\.js'/g
    )||[];

  if(
    storageMatches.length!==1
  ){
    fail(
      `sw.js must preserve runtime-storage.js exactly once; found ${storageMatches.length}.`
    );
  }
}catch(error){
  fail(
    `sw.js PWA migration inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nPWA migration validation failed:\n'
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
  'PWA service migration validation: PASS'
);

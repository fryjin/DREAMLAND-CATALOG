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

  /*
   * B7-00B.3A R4 release convergence adds cache-busting query parameters:
   *
   *   ./src/services/pwa/runtime-pwa.js?release=...
   *
   * Script ownership and load order must therefore be validated by stable
   * pathname instead of an exact unversioned HTML tag.
   */
  function scriptTagEntries(){
    const entries=[];
    const matcher=
      /<script\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>\s*<\/script>/gi;

    let match=null;

    while(
      (
        match=
          matcher.exec(
            indexSource
          )
      )
    ){
      entries.push({
        index:match.index,
        src:String(
          match[2]||
          ''
        ),
        pathname:String(
          match[2]||
          ''
        ).replace(
          /[?#].*$/,
          ''
        )
      });
    }

    return entries;
  }

  const scripts=
    scriptTagEntries();

  function scriptEntries(pathname){
    return scripts.filter(
      entry=>
        entry.pathname===
        pathname
    );
  }

  const pwaEntries=
    scriptEntries(
      './src/services/pwa/runtime-pwa.js'
    );

  if(pwaEntries.length!==1){
    fail(
      `index.html must load runtime-pwa.js exactly once; found ${pwaEntries.length}.`
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

  const storageEntries=
    scriptEntries(
      './src/services/storage/runtime-storage.js'
    );

  const storageIndex=
    storageEntries.length===1
      ? storageEntries[0].index
      : -1;

  const pwaIndex=
    pwaEntries.length===1
      ? pwaEntries[0].index
      : -1;

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

  const requiredIndexBridgeCalls=[
    'pwaService.refreshUi();',
    'pwaService.initExperience();'
  ];

  for(
    const marker of
    requiredIndexBridgeCalls
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

  if(
    !/pwaService\.text\(\s*['"]offlineSubmit['"]\s*\)/m
      .test(
        indexSource
      )
  ){
    fail(
      'index.html is missing the PWA offline submission copy bridge.'
    );
  }

  const submissionFlowSource=
    read(
      'src/app/runtime-inquiry-submission-flow.js'
    );

  if(
    !submissionFlowSource.includes(
      '.probeReachability('
    )
  ){
    fail(
      'Inquiry Submission Flow is missing PWA reachability probing.'
    );
  }

  if(
    !submissionFlowSource.includes(
      '.applyReachability('
    )
  ){
    fail(
      'Inquiry Submission Flow is missing PWA reachability application.'
    );
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

  /*
   * APP_SHELL remains the stable unversioned contract. R4 additionally adds a
   * RELEASE_ASSETS list with versioned URLs, which must not be mistaken for a
   * duplicate APP_SHELL runtime.
   */
  const appShellStart=
    swSource.indexOf(
      'const APP_SHELL = ['
    );

  const appShellEnd=
    swSource.indexOf(
      '];',
      appShellStart
    );

  if(
    appShellStart<0||
    appShellEnd<=appShellStart
  ){
    fail(
      'sw.js APP_SHELL could not be isolated.'
    );
  }else{
    const appShell=
      swSource.slice(
        appShellStart,
        appShellEnd+2
      );

    const pwaMatches=
      appShell.match(
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
      appShell.match(
        /'\.\/src\/services\/storage\/runtime-storage\.js'/g
      )||[];

    if(
      storageMatches.length!==1
    ){
      fail(
        `sw.js must preserve runtime-storage.js exactly once; found ${storageMatches.length}.`
      );
    }

    for(const forbiddenHomeEntry of [
      "'./',",
      "'./index.html'"
    ]){
      if(
        appShell.includes(
          forbiddenHomeEntry
        )
      ){
        fail(
          'R4.3D Astro Home must not remain in the Legacy PWA APP_SHELL: '+
          forbiddenHomeEntry
        );
      }
    }
  }

  for(const marker of [
    'function isHomeNavigation(',
    'function purgeLegacyHomeEntries(',
    'function homeNetworkOnly(',
    "cache:'no-store'",
    'purgeLegacyHomeEntries()'
  ]){
    if(
      !swSource.includes(
        marker
      )
    ){
      fail(
        'R4.3D Service Worker Home isolation is missing: '+
        marker
      );
    }
  }

  for(const marker of [
    'function isCatalogNavigation(',
    'function purgeLegacyCatalogEntries(',
    'function catalogNetworkOnly(',
    'CATALOG_NAVIGATION_PATHS',
    'purgeLegacyCatalogEntries()'
  ]){
    if(
      !swSource.includes(
        marker
      )
    ){
      fail(
        'R4.4D Service Worker Catalog isolation is missing: '+
        marker
      );
    }
  }

  const catalogNavigationContract=
    /const\s+CATALOG_NAVIGATION_PATHS\s*=\s*new\s+Set\s*\(\s*\[\s*['"]\/products\/['"]\s*,\s*['"]\/products\/index\.html['"]\s*\]\s*\)/m;

  if(
    !catalogNavigationContract.test(
      swSource
    )
  ){
    fail(
      'R4.4D Catalog Service Worker ownership must match only /products/ and /products/index.html.'
    );
  }

  const catalogMatcherStart=
    swSource.search(
      /function\s+isCatalogNavigation\s*\(/
    );

  const catalogMatcherEnd=
    swSource.search(
      /async\s+function\s+purgeLegacyCatalogEntries\s*\(/
    );

  if(
    catalogMatcherStart<0||
    catalogMatcherEnd<=catalogMatcherStart
  ){
    fail(
      'R4.4D could not isolate isCatalogNavigation().'
    );
  }else{
    const catalogMatcher=
      swSource.slice(
        catalogMatcherStart,
        catalogMatcherEnd
      );

    if(
      !/CATALOG_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/
        .test(
          catalogMatcher
        )||
      catalogMatcher.includes(
        'startsWith('
      )||
      catalogMatcher.includes(
        'includes('
      )
    ){
      fail(
        'R4.4D Catalog navigation must use exact Set membership so Catalog ownership remains index-only.'
      );
    }
  }

  for(const marker of [
    'function isPdpNavigation(',
    'function purgeLegacyPdpEntries(',
    'function pdpNetworkOnly(',
    'PDP_NAVIGATION_PATTERN',
    'purgeLegacyPdpEntries()'
  ]){
    if(
      !swSource.includes(
        marker
      )
    ){
      fail(
        'R4.5D Service Worker PDP isolation is missing: '+
        marker
      );
    }
  }

  const pdpNavigationContract=
    /const\s+PDP_NAVIGATION_PATTERN\s*=\s*\/\^\\\/products\\\/\[A-Z\]\{3\}\\d\{3\}\(\?:\\\/\(\?:index\\\.html\)\?\)\?\$\/i\s*;/m;

  if(
    !pdpNavigationContract.test(
      swSource
    )
  ){
    fail(
      'R4.5D PDP Service Worker ownership must match only /products/{AAA000}, /products/{AAA000}/ and /products/{AAA000}/index.html.'
    );
  }

  const pdpMatcherStart=
    swSource.search(
      /function\s+isPdpNavigation\s*\(/
    );

  const pdpMatcherEnd=
    swSource.search(
      /async\s+function\s+purgeLegacyPdpEntries\s*\(/
    );

  if(
    pdpMatcherStart<0||
    pdpMatcherEnd<=pdpMatcherStart
  ){
    fail(
      'R4.5D could not isolate isPdpNavigation().'
    );
  }else{
    const pdpMatcher=
      swSource.slice(
        pdpMatcherStart,
        pdpMatcherEnd
      );

    if(
      !/PDP_NAVIGATION_PATTERN\s*\.\s*test\s*\(\s*url\.pathname\s*\)/
        .test(
          pdpMatcher
        )||
      pdpMatcher.includes(
        'startsWith('
      )||
      pdpMatcher.includes(
        'includes('
      )
    ){
      fail(
        'R4.5D PDP navigation must use the exact PDP route-pattern owner.'
      );
    }
  }
  for(const marker of [
    'function isCustomNavigation(',
    'function purgeLegacyCustomEntries(',
    'function customNetworkOnly(',
    'CUSTOM_NAVIGATION_PATHS',
    'purgeLegacyCustomEntries()'
  ]){
    if(
      !swSource.includes(
        marker
      )
    ){
      fail(
        'R4.6D Service Worker Custom isolation is missing: '+
        marker
      );
    }
  }

  const customNavigationContract=
    /const\s+CUSTOM_NAVIGATION_PATHS\s*=\s*new\s+Set\s*\(\s*\[\s*['"]\/custom['"]\s*,\s*['"]\/custom\/['"]\s*,\s*['"]\/custom\/index\.html['"]\s*\]\s*\)/m;

  if(
    !customNavigationContract.test(
      swSource
    )
  ){
    fail(
      'R4.6D Custom Service Worker ownership must match only /custom, /custom/ and /custom/index.html.'
    );
  }

  const customMatcherStart=
    swSource.search(
      /function\s+isCustomNavigation\s*\(/
    );

  const customMatcherEnd=
    swSource.search(
      /async\s+function\s+purgeLegacyCustomEntries\s*\(/
    );

  if(
    customMatcherStart<0||
    customMatcherEnd<=customMatcherStart
  ){
    fail(
      'R4.6D could not isolate isCustomNavigation().'
    );
  }else{
    const customMatcher=
      swSource.slice(
        customMatcherStart,
        customMatcherEnd
      );

    if(
      !/CUSTOM_NAVIGATION_PATHS\s*\.\s*has\s*\(\s*url\.pathname\s*\)/
        .test(
          customMatcher
        )||
      customMatcher.includes(
        'startsWith('
      )||
      customMatcher.includes(
        'includes('
      )
    ){
      fail(
        'R4.6D Custom navigation must use exact Set membership.'
      );
    }
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

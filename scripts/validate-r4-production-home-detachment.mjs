#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const SOURCE_MODE=
  process.argv.includes(
    '--source'
  );

const DIST_MODE=
  process.argv.includes(
    '--dist'
  );

if(
  SOURCE_MODE===
  DIST_MODE
){
  console.error(
    'Usage: node scripts/validate-r4-production-home-detachment.mjs --source | --dist'
  );
  process.exit(1);
}

const errors=[];

const BUDGETS=Object.freeze({
  htmlRaw:128*1024,
  runtimeRaw:12*1024,
  styleRaw:64*1024,
  heroRaw:256*1024,
  codeGzip:64*1024,
  criticalRaw:384*1024
});

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function bytes(file){
  return fs.statSync(file).size;
}

function gzipBytes(file){
  return zlib
    .gzipSync(
      fs.readFileSync(file),
      {
        level:9
      }
    )
    .length;
}

function kib(value){
  return (
    value/
    1024
  ).toFixed(1);
}

function appShellSlice(source){
  const start=
    source.indexOf(
      'const APP_SHELL = ['
    );

  const end=
    source.indexOf(
      '];',
      start
    );

  if(
    start<0||
    end<=start
  ){
    return '';
  }

  return source.slice(
    start,
    end+2
  );
}

function homeNavigationBranch(source){
  const start=
    source.indexOf(
      "if(request.mode==='navigate'){"
    );

  const end=
    source.indexOf(
      "if(\n    url.pathname.includes('/data/')",
      start
    );

  if(
    start<0||
    end<=start
  ){
    return '';
  }

  return source.slice(
    start,
    end
  );
}

try{
  const pkg=
    json(
      'package.json'
    );

  if(
    pkg.scripts
      ?.['r4:production:home:detachment']!==
    'node scripts/validate-r4-production-home-detachment.mjs --source'
  ){
    fail(
      'package.json is missing r4:production:home:detachment.'
    );
  }

  if(
    pkg.scripts
      ?.['r4:production:home:validate']!==
    'node scripts/validate-r4-production-home-cutover.mjs --dist && node scripts/validate-r4-production-home-detachment.mjs --dist'
  ){
    fail(
      'Final Production Home validation must include cutover + detachment hardening.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const cutover=
    validate.indexOf(
      'npm run r4:production:home:contract'
    );

  const detachment=
    validate.indexOf(
      'npm run r4:production:home:detachment'
    );

  if(
    cutover<0||
    detachment<=cutover
  ){
    fail(
      'R4.3D detachment source gate must run after the R4.3C cutover contract.'
    );
  }
}catch(error){
  fail(
    'R4.3D package inspection failed: '+
    error.message
  );
}

try{
  const sw=
    read(
      'sw.js'
    );

  const appShell=
    appShellSlice(sw);

  if(!appShell){
    fail(
      'R4.3D could not isolate sw.js APP_SHELL.'
    );
  }else{
    for(const forbidden of [
      "'./',",
      "'./index.html'"
    ]){
      if(
        appShell.includes(
          forbidden
        )
      ){
        fail(
          'Service Worker APP_SHELL still precaches the Production Home: '+
          forbidden
        );
      }
    }

    for(const required of [
      "'./offline.html'",
      "'./src/services/pwa/runtime-pwa.js'"
    ]){
      if(
        !appShell.includes(
          required
        )
      ){
        fail(
          'Legacy PWA shell lost a required non-Home asset: '+
          required
        );
      }
    }
  }

  for(const marker of [
    'function isHomeNavigation(',
    'function purgeLegacyHomeEntries(',
    'function homeNetworkOnly(',
    "cache:'no-store'",
    'purgeLegacyHomeEntries()',
    'HOME_NAVIGATION_PATHS',
    'APP_CACHE',
    'RUNTIME_CACHE'
  ]){
    if(
      !sw.includes(
        marker
      )
    ){
      fail(
        'Service Worker Home-detachment contract is missing: '+
        marker
      );
    }
  }

  const navigation=
    homeNavigationBranch(sw);

  for(const [label,pattern] of [
    [
      'isHomeNavigation(url)',
      /isHomeNavigation\s*\(\s*url\s*\)/
    ],
    [
      'homeNetworkOnly(request)',
      /homeNetworkOnly\s*\(\s*request\s*\)/
    ],
    [
      "['./offline.html']",
      /\[\s*['"]\.\/offline\.html['"]\s*\]/
    ]
  ]){
    if(
      !pattern.test(
        navigation
      )
    ){
      fail(
        'Service Worker navigation split is missing: '+
        label
      );
    }
  }

  if(
    navigation.indexOf(
      'homeNetworkOnly('
    )>
    navigation.indexOf(
      'networkFirst('
    )
  ){
    fail(
      'Home navigation must be intercepted before the Legacy networkFirst navigation branch.'
    );
  }
}catch(error){
  fail(
    'R4.3D Service Worker inspection failed: '+
    error.message
  );
}

try{
  const runtime=
    read(
      'src/astro/runtime/home-runtime.js'
    );

  for(const forbidden of [
    'serviceWorker',
    'navigator.serviceWorker',
    'registerServiceWorker',
    'runtime-pwa.js',
    'DreamlandPwa'
  ]){
    if(
      runtime.includes(
        forbidden
      )
    ){
      fail(
        'Astro Home runtime must remain detached from Service Worker bootstrap: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'R4.3D Home runtime inspection failed: '+
    error.message
  );
}

if(DIST_MODE){
  try{
    const root=
      path.join(
        ROOT,
        'dist'
      );

    const homeFile=
      path.join(
        root,
        'index.html'
      );

    if(
      !fs.existsSync(
        homeFile
      )
    ){
      fail(
        'Production Home output is missing: dist/index.html'
      );
    }else{
      const home=
        fs.readFileSync(
          homeFile,
          'utf8'
        );

      for(const marker of [
        'data-r4-astro-home="true"',
        'data-r4-production-home="true"',
        'src="/r4-home-runtime.js"',
        'fetchpriority="high"',
        '/images/desktop/home/hero/hero-main.webp'
      ]){
        if(
          !home.includes(
            marker
          )
        ){
          fail(
            'Production Home hardening marker is missing: '+
            marker
          );
        }
      }

      for(const forbidden of [
        'DREAMLAND_MPA_ACTIVE',
        'runtime-desktop-experience.js',
        'runtime-desktop-home.js',
        'runtime-risk.js',
        'runtime-submission.js',
        'runtime-pwa.js',
        'catalog-data.js',
        'startup-loader.js',
        'serviceWorker.register',
        'navigator.serviceWorker'
      ]){
        if(
          home.includes(
            forbidden
          )
        ){
          fail(
            'Production Home still contains a Legacy/PWA bootstrap reference: '+
            forbidden
          );
        }
      }

      const executableScripts=[
        ...home.matchAll(
          /<script\b(?![^>]*type="application\/json")[^>]*>/gi
        )
      ];

      if(
        executableScripts.length!==
        1
      ){
        fail(
          'Production Home must keep exactly one executable script; found '+
          executableScripts.length+
          '.'
        );
      }

      const scriptSources=[
        ...home.matchAll(
          /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi
        )
      ].map(
        match=>match[1]
      );

      if(
        scriptSources.length!==
          1||
        scriptSources[0]!==
          '/r4-home-runtime.js'
      ){
        fail(
          'Production Home executable script graph must contain only /r4-home-runtime.js.'
        );
      }

      const stylePaths=[
        ...new Set(
          [
            ...home.matchAll(
              /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi
            ),
            ...home.matchAll(
              /<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="stylesheet"[^>]*>/gi
            )
          ].map(
            match=>match[1]
          )
      )];

      if(
        stylePaths.length<1||
        stylePaths.length>2
      ){
        fail(
          'Production Home should reference 1-2 Astro stylesheet assets; found '+
          stylePaths.length+
          '.'
        );
      }

      const runtimeFile=
        path.join(
          root,
          'r4-home-runtime.js'
        );

      const heroFile=
        path.join(
          root,
          'images',
          'desktop',
          'home',
          'hero',
          'hero-main.webp'
        );

      if(!fs.existsSync(runtimeFile)){
        fail(
          'Production Home runtime output is missing.'
        );
      }

      if(!fs.existsSync(heroFile)){
        fail(
          'Production Home hero output is missing.'
        );
      }

      const styleFiles=[];

      for(const href of stylePaths){
        const pathname=
          href
            .replace(
              /[?#].*$/,
              ''
            )
            .replace(
              /^\/+/,
              ''
            );

        const file=
          path.join(
            root,
            pathname
          );

        if(!fs.existsSync(file)){
          fail(
            'Production Home stylesheet output is missing: '+
            href
          );

          continue;
        }

        styleFiles.push(file);
      }

      if(
        fs.existsSync(runtimeFile)&&
        fs.existsSync(heroFile)&&
        styleFiles.length===
          stylePaths.length
      ){
        const htmlRaw=
          bytes(homeFile);

        const runtimeRaw=
          bytes(runtimeFile);

        const styleRaw=
          styleFiles.reduce(
            (
              total,
              file
            )=>
              total+
              bytes(file),
            0
          );

        const heroRaw=
          bytes(heroFile);

        const codeGzip=
          gzipBytes(homeFile)+
          gzipBytes(runtimeFile)+
          styleFiles.reduce(
            (
              total,
              file
            )=>
              total+
              gzipBytes(file),
            0
          );

        const criticalRaw=
          htmlRaw+
          runtimeRaw+
          styleRaw+
          heroRaw;

        if(
          htmlRaw>
          BUDGETS.htmlRaw
        ){
          fail(
            'Production Home HTML exceeds '+kib(BUDGETS.htmlRaw)+' KiB: '+
            kib(htmlRaw)+' KiB.'
          );
        }

        if(
          runtimeRaw>
          BUDGETS.runtimeRaw
        ){
          fail(
            'Production Home runtime exceeds '+kib(BUDGETS.runtimeRaw)+' KiB: '+
            kib(runtimeRaw)+' KiB.'
          );
        }

        if(
          styleRaw>
          BUDGETS.styleRaw
        ){
          fail(
            'Production Home styles exceed '+kib(BUDGETS.styleRaw)+' KiB: '+
            kib(styleRaw)+' KiB.'
          );
        }

        if(
          heroRaw>
          BUDGETS.heroRaw
        ){
          fail(
            'Production Home hero exceeds '+kib(BUDGETS.heroRaw)+' KiB: '+
            kib(heroRaw)+' KiB.'
          );
        }

        if(
          codeGzip>
          BUDGETS.codeGzip
        ){
          fail(
            'Production Home HTML+JS+CSS gzip proxy exceeds '+kib(BUDGETS.codeGzip)+' KiB: '+
            kib(codeGzip)+' KiB.'
          );
        }

        if(
          criticalRaw>
          BUDGETS.criticalRaw
        ){
          fail(
            'Production Home critical raw payload exceeds '+kib(BUDGETS.criticalRaw)+' KiB: '+
            kib(criticalRaw)+' KiB.'
          );
        }

        console.log('');
        console.log(
          '[R4.3D Home Payload]'
        );
        console.log(
          '- HTML:',
          kib(htmlRaw)+' KiB raw'
        );
        console.log(
          '- Runtime:',
          kib(runtimeRaw)+' KiB raw'
        );
        console.log(
          '- Styles:',
          kib(styleRaw)+' KiB raw / '+styleFiles.length+' file(s)'
        );
        console.log(
          '- Hero:',
          kib(heroRaw)+' KiB raw'
        );
        console.log(
          '- HTML+JS+CSS gzip proxy:',
          kib(codeGzip)+' KiB'
        );
        console.log(
          '- Critical raw (HTML+JS+CSS+hero):',
          kib(criticalRaw)+' KiB'
        );
      }

      const eagerImages=[
        ...home.matchAll(
          /<img\b[^>]*\bloading="eager"[^>]*>/gi
        )
      ];

      if(
        eagerImages.length!==
        1
      ){
        fail(
          'Production Home must have exactly one eager image; found '+
          eagerImages.length+
          '.'
        );
      }
    }

    const swFile=
      path.join(
        root,
        'sw.js'
      );

    if(!fs.existsSync(swFile)){
      fail(
        'Production sw.js is missing while Legacy routes remain PWA-owned.'
      );
    }else{
      const sw=
        fs.readFileSync(
          swFile,
          'utf8'
        );

      const appShell=
        appShellSlice(sw);

      if(
        appShell.includes(
          "'./',"
        )||
        appShell.includes(
          "'./index.html'"
        )
      ){
        fail(
          'Production Service Worker still precaches the Astro Home document.'
        );
      }

      if(
        !sw.includes(
          'homeNetworkOnly('
        )||
        !sw.includes(
          'purgeLegacyHomeEntries()'
        )
      ){
        fail(
          'Production Service Worker is missing the R4.3D Home cache isolation behavior.'
        );
      }
    }
  }catch(error){
    fail(
      'R4.3D dist inspection failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.3D Home Legacy Detachment / Payload Hardening: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.3D Home Legacy Detachment / Payload Hardening: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Home/PWA ownership boundary and staged validation contract verified.'
    : 'Production Home legacy detachment, Service Worker cache isolation and payload budgets verified.'
);
console.log('');

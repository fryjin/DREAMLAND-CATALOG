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

function compact(source){
  return String(
    source||
    ''
  ).replace(
    /\s+/g,
    ''
  );
}

const runtimePath=
  path.join(
    ROOT,
    'src/features/catalog/runtime-catalog.js'
  );

if(!fs.existsSync(runtimePath)){
  fail(
    'Catalog Feature runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandCatalog;

    await import(
      `${pathToFileURL(runtimePath).href}?b601-catalog=${Date.now()}`
    );

    const catalog=
      globalThis.DreamlandCatalog;

    if(
      !catalog||
      catalog.version!=='B6-01'
    ){
      fail(
        'DreamlandCatalog B6-01 runtime was not exposed.'
      );
    }else{
      for(const method of [
        'configure',
        'snapshot',
        'ready',
        'activeSeries',
        'setActiveSeries',
        'availableSeries',
        'buildViewModel'
      ]){
        if(
          typeof catalog[method]!==
          'function'
        ){
          fail(
            `DreamlandCatalog.${method} is missing.`
          );
        }
      }

      const products=[
        {
          id:'A',
          series:'advanced',
          listSort:0,
          sortOrder:5,
          names:{
            en:'A'
          }
        },
        {
          id:'B',
          series:'advanced',
          sortOrder:5
        },
        {
          id:'TOP',
          series:'advanced',
          listSort:10,
          sortOrder:1
        },
        {
          id:'C',
          series:'classic',
          listSort:2
        }
      ];

      const seriesMeta={
        advanced:{
          label:'Advanced'
        },
        classic:{
          label:'Classic'
        }
      };

      catalog.configure({
        products,
        seriesMeta,
        defaultSeries:'advanced'
      });

      if(
        !catalog.ready()||
        catalog.activeSeries()!==
          'advanced'||
        catalog.availableSeries()
          .join(',')!==
          'advanced,classic'
      ){
        fail(
          'Catalog configuration/default-series parity failed.'
        );
      }

      const first=
        catalog.buildViewModel();

      if(
        first.empty!==false||
        first.activeSeries!==
          'advanced'||
        first.displayCount!==3||
        first.products
          .map(
            item=>item.id
          )
          .join(',')!==
          'TOP,A,B'
      ){
        fail(
          'Catalog filtering/sorting/ViewModel parity failed.'
        );
      }

      if(
        first.products[0]===
          products[2]||
        !Object.isFrozen(first)||
        !Object.isFrozen(
          first.products
        )||
        !Object.isFrozen(
          first.products[0]
        )||
        !Object.isFrozen(
          first.series
        )
      ){
        fail(
          'Catalog ViewModel must expose frozen snapshots rather than source references.'
        );
      }

      products[2].listSort=0;

      if(
        first.products[0]
          .listSort!==10
      ){
        fail(
          'Existing Catalog ViewModel snapshot changed after source mutation.'
        );
      }

      catalog.setActiveSeries(
        'classic'
      );

      const classic=
        catalog.buildViewModel();

      if(
        catalog.activeSeries()!==
          'classic'||
        classic.displayCount!==1||
        classic.products[0]?.id!==
          'C'
      ){
        fail(
          'Catalog active-series mutation parity failed.'
        );
      }

      catalog.setActiveSeries(
        'missing'
      );

      if(
        catalog.activeSeries()!==
          'classic'
      ){
        fail(
          'Invalid Catalog series must not replace the active series.'
        );
      }

      catalog.configure({
        products,
        seriesMeta,
        defaultSeries:'missing'
      });

      if(
        catalog.activeSeries()!==
          'advanced'
      ){
        fail(
          'Catalog default-series fallback parity failed.'
        );
      }

      catalog.configure({
        products:[
          {
            id:'FALLBACK',
            series:'advanced',
            listSort:1
          }
        ],
        seriesMeta:{},
        defaultSeries:'missing'
      });

      const emptyMetaFallback=
        catalog.buildViewModel();

      if(
        catalog.activeSeries()!==
          'advanced'||
        emptyMetaFallback
          .displayCount!==1||
        emptyMetaFallback
          .products[0]?.id!==
          'FALLBACK'
      ){
        fail(
          'Catalog must preserve the legacy advanced fallback when series metadata is empty.'
        );
      }
    }
  }catch(error){
    fail(
      `Catalog runtime execution failed: ${error.message}`
    );
  }
}

try{
  const runtimeSource=
    read(
      'src/features/catalog/runtime-catalog.js'
    );

  for(const forbidden of [
    'document.',
    'querySelector(',
    'innerHTML',
    'openDetail(',
    'setTimeout(',
    'requestAnimationFrame(',
    'DreamlandInquiry',
    'DreamlandContact',
    'DreamlandSubmission',
    'DreamlandRisk'
  ]){
    if(
      runtimeSource.includes(
        forbidden
      )
    ){
      fail(
        `Catalog Feature crossed its B6-01 boundary: ${forbidden}`
      );
    }
  }
}catch(error){
  fail(
    `Catalog runtime source inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read(
      'index.html'
    );

  const compactIndex=
    compact(
      indexSource
    );

  for(const marker of [
  '<script src="./src/features/catalog/runtime-catalog.js"></script>',
  'const catalogFeature=window.DreamlandCatalog',
  'catalogFeature.configure(',
  'catalogFeature.setActiveSeries(',
  'catalogFeature.buildViewModel('
]){
    if(
      !compactIndex.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `index.html is missing B6-01 Catalog integration: ${marker}`
      );
    }
  }

  for(const legacy of [
    "activeSeries='advanced'",
    'products.filter(product=>product.series===activeSeries)',
    'Number(b.listSort)||Number(b.sortOrder)||0'
  ]){
    if(
      compactIndex.includes(
        compact(
          legacy
        )
      )
    ){
      fail(
        `index.html still directly owns B6-01 Catalog state/derivation: ${legacy}`
      );
    }
  }

  for(const preserved of [
  'function renderTabs(',
  'function renderProducts(',
  'function openDetail('
]){
  if(
    !compactIndex.includes(
      compact(
        preserved
      )
    )
  ){
    fail(
      `B6-01 Catalog Feature bridge is missing: ${preserved}`
    );
  }
}
}catch(error){
  fail(
    `index.html Catalog B6-01 inspection failed: ${error.message}`
  );
}

try{
  const manifest=
    (
      await import(
        pathToFileURL(
          path.join(
            ROOT,
            'src/features/manifest.js'
          )
        ).href+
        `?b601-manifest=${Date.now()}`
      )
    ).FEATURE_MANIFEST;

  const catalog=
    manifest.find(
      item=>
        item.id==='catalog'
    );

  if(
  catalog?.runtimeEnabled!==
    true||
  catalog?.status!==
    'partial'||
  catalog?.runtimeOwner!==
    'src/features/catalog/runtime-catalog.js'
  ){
  fail(
    'B6-01 must preserve the partial Catalog Feature runtime.'
  );
  }
}catch(error){
  fail(
    `Feature manifest B6-01 inspection failed: ${error.message}`
  );
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
        `?b601-foundation=${Date.now()}`
      )
    ).FRONTEND_FOUNDATION;

  if(
  foundation?.runtimeIntegrated!==
    true||
  foundation?.runtimeIntegration!==
    'partial'
  ){
    fail(
      'Frontend foundation must declare B6-01 partial runtime integration.'
    );
  }

  const catalogMigration=
    foundation?.legacyMap
      ?.find(
        item=>
          item.id==='catalog'
      );

  if(
    catalogMigration?.status!==
      'partial'||
    catalogMigration?.runtimeMigrated!==
      false||
    !catalogMigration
      ?.runtimeOwners
      ?.includes(
        'src/features/catalog/runtime-catalog.js'
      )||
    !catalogMigration
      ?.runtimeOwners
      ?.includes(
        'index.html'
      )||
    !catalogMigration
      ?.runtimeOwners
      ?.includes(
        'catalog-data.js'
      )
  ){
    fail(
      'Legacy map does not describe the B6-01 partial Catalog ownership.'
    );
  }
}catch(error){
  fail(
    `Frontend foundation/legacy map B6-01 inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read(
      'sw.js'
    );


  const catalogMatches=
    swSource.match(
      /'\.\/src\/features\/catalog\/runtime-catalog\.js'/g
    )||[];

  if(
    catalogMatches.length!==1
  ){
    fail(
      `sw.js APP_SHELL must include runtime-catalog.js exactly once; found ${catalogMatches.length}.`
    );
  }
}catch(error){
  fail(
    `SW B6-01 inspection failed: ${error.message}`
  );
}

try{
  const packageSource=
    read(
      'package.json'
    );

  const packageJson=
    JSON.parse(
      packageSource
    );

  if(
    packageJson.scripts
      ?.['catalog-state:boundary']!==
      'node scripts/validate-catalog-state-view-model-boundary.mjs'
  ){
    fail(
      'package.json is missing catalog-state:boundary.'
    );
  }

  if(
    !String(
      packageJson.scripts
        ?.validate||
      ''
    ).includes(
      'npm run catalog-state:boundary'
    )
  ){
    fail(
      'npm run validate must include the B6-01 Catalog boundary validator.'
    );
  }
}catch(error){
  fail(
    `package.json B6-01 inspection failed: ${error.message}`
  );
}

try{
  const frontendValidator=
    read(
      'scripts/validate-frontend-foundation.mjs'
    );

  const contactValidator=
    read(
      'scripts/validate-contact-submission-orchestration-boundary.mjs'
    );

  if(
    compact(
      frontendValidator
    ).includes(
      "enabledIds!=='contact,inquiry'"
    )
  ){
    fail(
      'Historical frontend-foundation validator still locks the pre-B6 Feature set.'
    );
  }

  if(
    compact(
      contactValidator
    ).includes(
      "enabledIds!=='contact,inquiry'"
    )
  ){
    fail(
      'Historical B5-06 validator still locks the pre-B6 Feature set.'
    );
  }

  if(
    contactValidator.includes(
      'dreamland-pwa-v77'
    )
  ){
    fail(
      'Historical B5-06 validator still owns the fixed v77 cache version.'
    );
  }

  for(const historical of [
    'scripts/validate-inquiry-feature-state-boundary.mjs',
    'scripts/validate-inquiry-pricing-boundary.mjs',
    'scripts/validate-inquiry-view-model-boundary.mjs'
  ]){
    const source=
      read(
        historical
      );

    if(
      source.includes(
        'enabled.length!==1'
      )
    ){
      fail(
        `Historical Inquiry validator still locks single-Feature runtime ownership: ${historical}`
      );
    }
  }
}catch(error){
  fail(
    `Historical-validator B6-01 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nCatalog State / ViewModel boundary validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Catalog State / ViewModel boundary validation: PASS'
);

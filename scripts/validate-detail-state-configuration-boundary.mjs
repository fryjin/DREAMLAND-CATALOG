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
  return String(source||'')
    .replace(/\s+/g,'');
}

const runtimePath=
  path.join(
    ROOT,
    'src/features/detail/runtime-detail.js'
  );

if(!fs.existsSync(runtimePath)){
  fail(
    'Detail Feature runtime is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandDetail;

    await import(
      `${pathToFileURL(runtimePath).href}?b603-detail=${Date.now()}`
    );

    const detail=
      globalThis.DreamlandDetail;

    if(
      !detail||
      detail.version!=='B6-03'
    ){
      fail(
        'DreamlandDetail B6-03 runtime was not exposed.'
      );
    }else{
      for(const method of [
        'configure',
        'snapshot',
        'ready',
        'clear',
        'openProduct',
        'openItem',
        'product',
        'getConfig',
        'setOption',
        'setScent',
        'setQuantity',
        'adjustQuantity',
        'buildViewModel'
      ]){
        if(typeof detail[method]!=='function'){
          fail(
            `DreamlandDetail.${method} is missing.`
          );
        }
      }

      const products=[
        {
          id:'HOL1',
          series:'holiday',
          defaultSize:'M',
          size:'M',
          name:'Holiday'
        },
        {
          id:'CLA1',
          series:'classic',
          defaultSize:'S',
          size:'S',
          name:'Classic'
        }
      ];

      const scents=[
        {
          id:'S1',
          series:'classic',
          name:{
            en:'Rose',
            zh:'玫瑰'
          }
        },
        {
          id:'S2',
          series:'premium',
          name:{
            en:'Wood',
            zh:'木质'
          }
        }
      ];

      const scentMap=
        new Map(
          scents.map(
            scent=>[
              scent.id,
              scent
            ]
          )
        );

      const patterns={
        S:['PS'],
        M:['PM1','PM2'],
        L:['PL']
      };

      const packs={
        holiday:[
          '批发包装',
          '精品包装'
        ],
        classic:[
          '批发包装'
        ]
      };

      const configured=
        detail.configure({
          products,
          sizes:['S','M','L','XL'],
          qtyMin:1,
          qtyStep:1,
          defaultProductSize:
            product=>
              product.defaultSize||
              'S',
          initialScentSeries:
            product=>
              product.series==='holiday'
                ? 'classic'
                : '',
          patternsForSize:
            size=>
              patterns[size]||
              [],
          scentSeriesOptions:
            product=>
              product.series==='holiday'
                ? ['classic','premium']
                : [],
          availableScents:
            (
              product,
              override
            )=>
              scents.filter(
                scent=>
                  override
                    ? scent.series===override
                    : (
                        scent.series===product.series||
                        product.series==='classic'
                      )
              ),
          scentById:
            id=>
              scentMap.get(id)||
              null,
          scentDisplayText:
            value=>
              value?.en||
              '',
          defaultPack:
            series=>
              packs[series]?.[0]||
              '批发包装',
          packOptions:
            series=>
              packs[series]||
              ['批发包装'],
          maximumQuantity:
            ()=>100,
          normalizeQuantity:
            (
              value,
              min
            )=>{
              let quantity=
                Number(value);

              if(!Number.isFinite(quantity)){
                quantity=min;
              }

              return Math.min(
                100,
                Math.max(
                  min,
                  Math.trunc(quantity)
                )
              );
            },
          moqForSeriesSize:
            (
              series,
              size
            )=>(
              series==='holiday'&&
              size==='M'
                ? 20
                : 10
            ),
          pricingSeriesFor:
            item=>
              item.series==='holiday'
                ? item.scentSeries
                : item.series,
          tierUnitCny:
            (
              pricingSeries,
              size,
              quantity
            )=>(
              pricingSeries==='premium'
                ? 30
                : (
                    size==='L'
                      ? 22
                      : (
                          quantity>=50
                            ? 18
                            : 20
                        )
                  )
            ),
          packSurchargeCny:
            (
              _series,
              pack
            )=>
              pack==='精品包装'
                ? 5
                : 0,
          convertCnyToBase:
            value=>
              value/2
        });

      if(
        !detail.ready()||
        configured.configured!==true
      ){
        fail(
          'Configured Detail Feature must report ready.'
        );
      }

      const opened=
        detail.openProduct(
          'HOL1'
        );

      if(
        opened.empty||
        opened.product?.id!=='HOL1'||
        opened.config.size!=='M'||
        opened.config.scentSeries!=='classic'||
        opened.config.scentId!=='S1'||
        opened.config.scent!=='Rose'||
        opened.config.pattern!=='PM1'||
        opened.config.pack!=='批发包装'||
        opened.config.qty!==1||
        opened.pricing.moq!==20||
        opened.pricing.unitPrice!==10
      ){
        fail(
          'Detail default configuration/ViewModel parity failed.'
        );
      }

      detail.setOption(
        'size',
        'L'
      );

      const sized=
        detail.buildViewModel();

      if(
        sized.config.size!=='L'||
        sized.config.pattern!=='PL'||
        sized.pricing.moq!==10||
        sized.pricing.unitPrice!==11
      ){
        fail(
          'Detail size mutation/derived pricing parity failed.'
        );
      }

      detail.setOption(
        'scentSeries',
        'premium'
      );

      const premium=
        detail.buildViewModel();

      if(
        premium.config.scentSeries!=='premium'||
        premium.config.scentId!=='S2'||
        premium.config.scent!=='Wood'||
        premium.pricing.pricingSeries!=='premium'||
        premium.pricing.unitPrice!==15
      ){
        fail(
          'Detail scent-series mutation parity failed.'
        );
      }

      detail.setOption(
        'pack',
        '精品包装'
      );

      const packed=
        detail.buildViewModel();

      if(
        packed.config.pack!=='精品包装'||
        packed.pricing.packSurchargeCny!==5||
        packed.pricing.unitPrice!==17.5
      ){
        fail(
          'Detail packaging mutation/pricing parity failed.'
        );
      }

      const high=
        detail.setQuantity(
          150
        );

      if(
        high.aboveMax!==true||
        high.quantity!==100||
        detail.getConfig().qty!==100
      ){
        fail(
          'Detail quantity max-normalization parity failed.'
        );
      }

      const invalid=
        detail.setQuantity(
          'bad'
        );

      if(
        invalid.invalid!==true||
        invalid.quantity!==1
      ){
        fail(
          'Detail invalid quantity normalization parity failed.'
        );
      }

      detail.adjustQuantity(4);

      if(
        detail.getConfig().qty!==5
      ){
        fail(
          'Detail quantity adjustment parity failed.'
        );
      }

      const editView=
        detail.openItem({
          productId:'HOL1',
          size:'M',
          scentSeries:'premium',
          scentId:'S2',
          scent:'Wood',
          pattern:'PM2',
          pack:'精品包装',
          qty:60
        });

      if(
        !editView||
        editView.config.size!=='M'||
        editView.config.scentId!=='S2'||
        editView.config.pattern!=='PM2'||
        editView.config.pack!=='精品包装'||
        editView.config.qty!==60
      ){
        fail(
          'Detail edit hydration parity failed.'
        );
      }

      if(
        !Object.isFrozen(editView)||
        !Object.isFrozen(editView.product)||
        !Object.isFrozen(editView.config)||
        !Object.isFrozen(editView.options)||
        !Object.isFrozen(editView.pricing)
      ){
        fail(
          'Detail ViewModel must expose frozen snapshots.'
        );
      }

      if(
        detail.product()===
        products[0]
      ){
        fail(
          'Detail product() must not expose the source product reference.'
        );
      }
    }
  }catch(error){
    fail(
      `Detail runtime execution failed: ${error.message}`
    );
  }
}

try{
  const runtimeSource=
    read(
      'src/features/detail/runtime-detail.js'
    );

  for(const forbidden of [
    'document.',
    'querySelector(',
    'innerHTML',
    'localStorage',
    'sessionStorage',
    'DreamlandCatalog',
    'DreamlandInquiry',
    'DreamlandContact',
    'DreamlandSubmission',
    'DreamlandRisk',
    'DreamlandMedia',
    'DreamlandRuntimeHooks',
    'openDetail(',
    'renderDetail(',
    'toast('
  ]){
    if(runtimeSource.includes(forbidden)){
      fail(
        `Detail Feature crossed its B6-03 boundary: ${forbidden}`
      );
    }
  }
}catch(error){
  fail(
    `Detail runtime source inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read(
      'index.html'
    );

  const compactIndex=
    compact(indexSource);

  for(const marker of [
    '<script src="./src/features/detail/runtime-detail.js"></script>',
    'const detailFeature=window.DreamlandDetail',
    'detailFeature.configure(',
    'detailFeature.openProduct(',
    'detailFeature.openItem(',
    'detailFeature.setOption(',
    'detailFeature.setScent(',
    'detailFeature.setQuantity(',
    'detailFeature.adjustQuantity(',
    'detailFeature.buildViewModel('
  ]){
    if(
      !compactIndex.includes(
        compact(marker)
      )
    ){
      fail(
        `index.html is missing B6-03 Detail integration: ${marker}`
      );
    }
  }

  const legacyAssignmentPatterns=[
  /\bconfig\.scentId\s*=(?!=)/,
  /\bconfig\.scent\s*=(?!=)/,
  /\bconfig\.scentSeries\s*=(?!=)/,
  /\bconfig\.pattern\s*=(?!=)/,
  /\bconfig\.pack\s*=(?!=)/,
  /\bconfig\.qty\s*=(?!=)/,
  /\bconfig\s*\[\s*key\s*\]\s*=(?!=)/
  ];

  for(
  const pattern of
  legacyAssignmentPatterns
  ){
  if(
    pattern.test(
      indexSource
    )
  ){
    fail(
      `index.html still mutates legacy Detail config directly: ${pattern}`
    );
  }
  }

  if(
    compactIndex.includes(
      compact(
        'activeProduct=products.find('
      )
    )
  ){
    fail(
      'index.html still resolves activeProduct directly in Detail navigation.'
    );
  }

  for(const preserved of [
    'function renderDetail(',
    'function renderDetailMedia(',
    'function setDetailSlide(',
    'function startDetailCarousel(',
    'function bindDetailSwipe(',
    'function captureDetailOptionScrollState(',
    'function resetDetailScroll(',
    "'detail.renderMedia'",
    "'detail.startCarousel'",
    "'detail.afterSlideUpdate'"
  ]){
    if(
      !compactIndex.includes(
        compact(preserved)
      )
    ){
      fail(
        `B6-03 must preserve Detail Renderer/media ownership: ${preserved}`
      );
    }
  }
}catch(error){
  fail(
    `index.html Detail B6-03 inspection failed: ${error.message}`
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
        `?b603-manifest=${Date.now()}`
      )
    ).FEATURE_MANIFEST;

  const enabledIds=
    manifest
      .filter(
        item=>
          item.runtimeEnabled===true
      )
      .map(
        item=>item.id
      )
      .sort()
      .join(',');

  const detail=
    manifest.find(
      item=>
        item.id==='detail'
    );

  if(
    detail?.runtimeEnabled!==true||
    detail?.status!=='partial'||
    detail?.runtimeOwner!==
      'src/features/detail/runtime-detail.js'
  ){
    fail(
      'B6-03 Detail runtime ownership must remain enabled and partial.'
    );
  }
}catch(error){
  fail(
    `Feature manifest B6-03 inspection failed: ${error.message}`
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
        `?b603-foundation=${Date.now()}`
      )
    ).FRONTEND_FOUNDATION;

  if(
    foundation?.runtimeIntegrated!==true||
    foundation?.runtimeIntegration!=='partial'
  ){
    fail(
      'Frontend foundation must preserve partial runtime integration.'
    );
  }

  const detailMigration=
    foundation?.legacyMap
      ?.find(
        item=>
          item.id==='detail'
      );

  if(
    detailMigration?.status!=='partial'||
    detailMigration?.runtimeMigrated!==false||
    !detailMigration?.runtimeOwners?.includes(
      'src/features/detail/runtime-detail.js'
    )||
    !detailMigration?.runtimeOwners?.includes(
      'index.html'
    )||
    !detailMigration?.runtimeOwners?.includes(
      'detail-progressive.js'
    )||
    !detailMigration?.runtimeOwners?.includes(
      'pattern-preview-swipe.js'
    )
  ){
    fail(
      'Legacy map does not describe B6-03 partial Detail ownership.'
    );
  }
}catch(error){
  fail(
    `Frontend foundation/legacy map B6-03 inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read(
      'sw.js'
    );

  

  const matches=
    swSource.match(
      /'\.\/src\/features\/detail\/runtime-detail\.js'/g
    )||[];

  if(matches.length!==1){
    fail(
      `sw.js APP_SHELL must include runtime-detail.js exactly once; found ${matches.length}.`
    );
  }
}catch(error){
  fail(
    `SW B6-03 inspection failed: ${error.message}`
  );
}

try{
  const packageJson=
    JSON.parse(
      read(
        'package.json'
      )
    );

  if(
    packageJson.scripts?.['detail-state:boundary']!==
      'node scripts/validate-detail-state-configuration-boundary.mjs'
  ){
    fail(
      'package.json is missing detail-state:boundary.'
    );
  }

  if(
    !String(
      packageJson.scripts?.validate||
      ''
    ).includes(
      'npm run detail-state:boundary'
    )
  ){
    fail(
      'npm run validate must include the B6-03 Detail boundary validator.'
    );
  }
}catch(error){
  fail(
    `package.json B6-03 inspection failed: ${error.message}`
  );
}

try{
  const frontendValidator=
    read(
      'scripts/validate-frontend-foundation.mjs'
    );

  const b601=
    read(
      'scripts/validate-catalog-state-view-model-boundary.mjs'
    );

  const b602=
    read(
      'scripts/validate-catalog-ui-renderer-boundary.mjs'
    );

  if(
    compact(
      frontendValidator
    ).includes(
      "enabledIds!=='catalog,contact,inquiry'"
    )
  ){
    fail(
      'Frontend foundation validator still locks the pre-B6-03 Feature set.'
    );
  }

  if(
    compact(
      b601
    ).includes(
      "enabledIds!=='catalog,contact,inquiry'"
    )
  ){
    fail(
      'Historical B6-01 validator still locks the pre-Detail Feature set.'
    );
  }

  if(
    compact(
      b602
    ).includes(
      "foundation?.phase!=='B6-02'"
    )
  ){
    fail(
      'Historical B6-02 validator still owns the current foundation phase.'
    );
  }

  if(
    b602.includes(
      'dreamland-pwa-v79'
    )
  ){
    fail(
      'Historical B6-02 validator still owns the fixed v79 cache version.'
    );
  }
}catch(error){
  fail(
    `Historical-validator B6-03 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nDetail State / Configuration boundary validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Detail State / Configuration boundary validation: PASS'
);

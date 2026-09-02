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

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function approx(
  actual,
  expected,
  epsilon=1e-9
){
  return Math.abs(
    Number(actual)-
    Number(expected)
  )<=epsilon;
}

function functionSlice(
  source,
  name,
  nextName
){
  const start=
    source.indexOf(
      'function '+name+'('
    );

  const end=
    source.indexOf(
      'function '+nextName+'(',
      start+1
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
  delete globalThis.DreamlandPricingPolicy;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/pricing/runtime-pricing-policy.js'
      )
    ).href+
    '?r4-domain-pricing='+
    Date.now()
  );

  const policy=
    globalThis.DreamlandPricingPolicy;

  if(
    !policy||
    policy.version!=='R4.2A'
  ){
    fail(
      'DreamlandPricingPolicy R4.2A was not exposed.'
    );
  }else{
    const seriesDocument=
      json('data/series.json');

    const seriesMeta=
      seriesDocument.series||{};

    const currencyMap=
      json('data/i18n.json')
        .currencyMap||{};

    for(const method of [
      'pricingSeriesFor',
      'tierFor',
      'tierRangeLabel',
      'currentTierIndex',
      'nextTierFor',
      'tierUnitCny',
      'packOptions',
      'defaultPack',
      'packSurchargeCny',
      'moqForSeriesSize',
      'defaultProductSize',
      'productMoq',
      'cnyToBase',
      'money',
      'currencyUnit',
      'normalizeQuantity',
      'catalogUnit'
    ]){
      if(typeof policy[method]!=='function'){
        fail(
          'DreamlandPricingPolicy.'+
          method+
          ' is missing.'
        );
      }
    }

    if(
      policy.pricingSeriesFor(
        {
          series:'holiday',
          scentSeries:'advanced'
        },
        seriesMeta
      )!=='advanced'
    ){
      fail(
        'Holiday selected scent-series pricing resolution failed.'
      );
    }

    if(
      policy.pricingSeriesFor(
        {
          series:'holiday',
          scentSeries:''
        },
        seriesMeta
      )!=='classic'
    ){
      fail(
        'Holiday default scent-series pricing resolution failed.'
      );
    }

    if(
      policy.tierFor(
        'advanced',
        99,
        seriesMeta
      )?.minQty!==1||
      policy.tierFor(
        'advanced',
        100,
        seriesMeta
      )?.minQty!==100||
      policy.currentTierIndex(
        'advanced',
        350,
        seriesMeta
      )!==2||
      policy.nextTierFor(
        'advanced',
        100,
        seriesMeta
      )?.minQty!==300
    ){
      fail(
        'Tier selection parity failed.'
      );
    }

    if(
      policy.tierUnitCny(
        'advanced',
        'M',
        100,
        seriesMeta
      )!==178
    ){
      fail(
        'Advanced M/100 tier price parity failed.'
      );
    }

    if(
      policy.defaultPack(
        'advanced',
        seriesMeta
      )!=='默认包装'||
      policy.packSurchargeCny(
        'advanced',
        '礼品包装',
        seriesMeta
      )!==50
    ){
      fail(
        'Packaging policy parity failed.'
      );
    }

    if(
      policy.moqForSeriesSize(
        'advanced',
        'S',
        seriesMeta
      )!==36||
      policy.moqForSeriesSize(
        'advanced',
        'M',
        seriesMeta
      )!==24||
      policy.productMoq(
        {
          series:'advanced',
          size:'L',
          moq:99
        },
        seriesMeta
      )!==18
    ){
      fail(
        'MOQ policy parity failed.'
      );
    }

    if(
      !approx(
        policy.cnyToBase(
          72,
          currencyMap
        ),
        10
      )
    ){
      fail(
        'CNY-to-base conversion parity failed.'
      );
    }

    const enMoney=
      policy.money(
        10,
        'en',
        currencyMap
      );

    const zhMoney=
      policy.money(
        10,
        'zh',
        currencyMap
      );

    if(
      !enMoney.startsWith('USD ')||
      !enMoney.endsWith('10.00')||
      !zhMoney.startsWith('¥ ')
    ){
      fail(
        'Currency formatting parity failed.'
      );
    }

    if(
      policy.currencyUnit(
        'en',
        currencyMap
      )!=='/pc'
    ){
      fail(
        'Currency unit parity failed.'
      );
    }

    if(
      policy.normalizeQuantity(
        0,
        1,
        100
      )!==1||
      policy.normalizeQuantity(
        4.8,
        1,
        100
      )!==4||
      policy.normalizeQuantity(
        101,
        1,
        100
      )!==100
    ){
      fail(
        'Quantity normalization parity failed.'
      );
    }

    const catalogReference=
      policy.catalogUnit(
        {
          series:'advanced',
          defaultSize:'S',
          size:'S'
        },
        seriesMeta,
        currencyMap
      );

    if(
      !approx(
        catalogReference,
        158/7.2
      )
    ){
      fail(
        'Catalog reference-unit pricing parity failed.'
      );
    }
  }
}catch(error){
  fail(
    'Pricing Domain execution failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/domain/pricing/runtime-pricing-policy.js'
    );

  for(const forbidden of [
    'document.',
    'querySelector(',
    'localStorage',
    'sessionStorage',
    'fetch(',
    'DreamlandInquiry',
    'DreamlandDetail',
    'DreamlandCatalog',
    'DreamlandSubmission',
    'DreamlandRisk'
  ]){
    if(source.includes(forbidden)){
      fail(
        'Pricing Domain crossed a boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'Pricing Domain source inspection failed: '+
    error.message
  );
}

try{
  const index=
    read('index.html');

  for(const marker of [
    './src/domain/pricing/runtime-pricing-policy.js',
    'const pricingPolicy=window.DreamlandPricingPolicy;',
    'DreamlandPricingPolicy must load before pricing policy initialization.'
  ]){
    if(!index.includes(marker)){
      fail(
        'index.html Pricing Domain integration is missing: '+
        marker
      );
    }
  }

  for(const [
    name,
    nextName
  ] of [
    ['money','fromPrice'],
    ['currencyUnit','cnyToBase'],
    ['cnyToBase','seriesQty'],
    ['pricingSeriesFor','pricingGroupQty'],
    ['tierFor','tierRangeLabel'],
    ['tierRangeLabel','currentTierIndex'],
    ['currentTierIndex','nextTierFor'],
    ['nextTierFor','configPricingSeries'],
    ['tierUnitCny','packOptions'],
    ['packOptions','defaultPack'],
    ['defaultPack','packSurchargeCny'],
    ['packSurchargeCny','packSurchargeBase'],
    ['catalogUnit','refreshBudgetOptions'],
    ['moqForSeriesSize','defaultProductSize'],
    ['defaultProductSize','productMoq'],
    ['productMoq','itemMoq'],
    ['normalizeQty','generateInquiryId']
  ]){
    const slice=
      functionSlice(
        index,
        name,
        nextName
      );

    if(
      !slice||
      !/pricingPolicy\s*\./.test(
        slice
      )
    ){
      fail(
        'Legacy pricing bridge is not delegated through DreamlandPricingPolicy: '+
        name
      );
    }
  }
}catch(error){
  fail(
    'Legacy pricing bridge inspection failed: '+
    error.message
  );
}

try{
  const layers=
    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/app/layers.js'
        )
      ).href+
      '?r4-domain-layers='+
      Date.now()
    );

  if(
    !layers.FRONTEND_LAYERS
      .includes('domain')
  ){
    fail(
      'Frontend layers do not include domain.'
    );
  }

  for(const from of [
    'app',
    'features',
    'services'
  ]){
    if(
      !layers.canLayerDependOn(
        from,
        'domain'
      )
    ){
      fail(
        from+
        ' must be allowed to depend on domain.'
      );
    }
  }

  if(
    layers.canLayerDependOn(
      'ui',
      'domain'
    )||
    layers.canLayerDependOn(
      'domain',
      'data'
    )
  ){
    fail(
      'Domain dependency direction is too permissive.'
    );
  }
}catch(error){
  fail(
    'Domain layer validation failed: '+
    error.message
  );
}

try{
  const legacy=
    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/app/legacy-map.js'
        )
      ).href+
      '?r4-domain-legacy='+
      Date.now()
    );

  const pricing=
    legacy.LEGACY_FRONTEND_MAP
      .find(
        item=>
          item.id==='pricing-domain'
      );

  if(
    pricing?.targetLayer!=='domain'||
    pricing?.status!=='migrated'||
    pricing?.runtimeMigrated!==true||
    !pricing?.runtimeOwners
      ?.includes(
        'src/domain/pricing/runtime-pricing-policy.js'
      )
  ){
    fail(
      'Legacy map does not mark pricing policy as migrated to Domain.'
    );
  }
}catch(error){
  fail(
    'Pricing legacy-map validation failed: '+
    error.message
  );
}

try{
  const sw=
    read('sw.js');

  const matches=
    sw.match(
      /'\.\/src\/domain\/pricing\/runtime-pricing-policy\.js'/g
    )||[];

  if(matches.length!==1){
    fail(
      'PWA APP_SHELL must contain the Pricing Domain runtime exactly once; found '+
      matches.length+
      '.'
    );
  }
}catch(error){
  fail(
    'Pricing PWA asset validation failed: '+
    error.message
  );
}

try{
  const pkg=
    json('package.json');

  if(
    pkg.scripts?.['r4:domain:pricing']!==
    'node scripts/validate-r4-domain-pricing.mjs'
  ){
    fail(
      'package.json is missing r4:domain:pricing.'
    );
  }

  const validate=
    String(
      pkg.scripts?.validate||
      ''
    );

  if(
    !validate.includes(
      'npm run desktop:catalog && npm run r4:domain:pricing && npm run r4:astro:foundation'
    )
  ){
    fail(
      'R4 Domain pricing gate must run after the final Desktop gate and before Astro foundation.'
    );
  }
}catch(error){
  fail(
    'R4 Domain package validation failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.2A Domain Pricing: FAIL'
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
  'DREAMLAND B7-00B.4J R4.2A Domain Pricing: PASS'
);
console.log(
  'Pricing / tier / packaging / MOQ / quantity / currency policy extracted from Legacy shell with parity verified.'
);
console.log('');

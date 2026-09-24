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
  return fs
    .readFileSync(
      path.join(
        ROOT,
        relative
      ),
      'utf8'
    )
    .replace(
      /\r\n?/g,
      '\n'
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

try{
  delete globalThis.DreamlandPricingPolicy;

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/domain/pricing/runtime-pricing-policy.js'
      )
    ).href+
    '?r4-commercial-ec1='+
    Date.now()
  );

  const policy=
    globalThis
      .DreamlandPricingPolicy;

  if(
    !policy||
    typeof policy
      .commercialSnapshot!==
      'function'
  ){
    fail(
      'DreamlandPricingPolicy.commercialSnapshot() is missing.'
    );
  }else{
    const seriesMeta=
      json(
        'data/series.json'
      ).series||{};

    const currencyMap=
      json(
        'data/i18n.json'
      ).currencyMap||{};

    const masterpiece=
      policy.commercialSnapshot({
        item:{
          series:'masterpiece',
          size:'S'
        },
        size:'S',
        quantity:76,
        pack:'礼品包装',
        language:'en',
        seriesMeta,
        currencyMap
      });

    if(
      masterpiece.schemaVersion!==1||
      masterpiece.productSeries!=='masterpiece'||
      masterpiece.pricingSeries!=='masterpiece'||
      masterpiece.size!=='S'||
      masterpiece.quantity!==76||
      masterpiece.moq!==36||
      masterpiece.meetsMoq!==true||
      masterpiece.quantityToMoq!==0
    ){
      fail(
        'Masterpiece commercial identity / MOQ projection failed.'
      );
    }

    if(
      masterpiece.currentTier
        ?.rangeLabel!=='1-99'||
      masterpiece.currentTier
        ?.tierUnitCny!==258||
      masterpiece.currentTier
        ?.packageSurchargeCny!==0||
      masterpiece.currentTier
        ?.effectiveUnitCny!==258||
      masterpiece.nextTier
        ?.minQty!==100||
      masterpiece.nextTier
        ?.additionalQty!==24||
      masterpiece.nextTier
        ?.effectiveUnitCny!==248||
      masterpiece.nextTier
        ?.unitSavingCny!==10||
      masterpiece.nextTier
        ?.hasUnitSaving!==true
    ){
      fail(
        'Masterpiece current/next tier projection failed.'
      );
    }

    if(
      masterpiece.tiers.length!==5||
      masterpiece
        .tiers
        .filter(
          tier=>
            tier.isCurrent
        )
        .length!==1||
      masterpiece.isBestAvailableTier!==false||
      masterpiece.hasVolumeBreaks!==true
    ){
      fail(
        'Masterpiece tier-sheet projection failed.'
      );
    }

    if(
      !approx(
        masterpiece
          .currentTier
          ?.unitBase,
        258/7.2
      )||
      !String(
        masterpiece
          .currentTier
          ?.displayUnitPrice||
        ''
      ).startsWith('USD ')
    ){
      fail(
        'Commercial base-currency / display-price projection failed.'
      );
    }

    const belowMoq=
      policy.commercialSnapshot({
        item:{
          series:'advanced',
          size:'S'
        },
        size:'S',
        quantity:20,
        language:'en',
        seriesMeta,
        currencyMap
      });

    if(
      belowMoq.moq!==36||
      belowMoq.meetsMoq!==false||
      belowMoq.quantityToMoq!==16
    ){
      fail(
        'MOQ gap must remain independent from price-tier boundaries.'
      );
    }

    const advancedGift=
      policy.commercialSnapshot({
        item:{
          series:'advanced',
          size:'S'
        },
        size:'S',
        quantity:76,
        pack:'礼品包装',
        language:'en',
        seriesMeta,
        currencyMap
      });

    if(
      advancedGift
        .packageSurchargeCny!==50||
      advancedGift
        .currentTier
        ?.tierUnitCny!==158||
      advancedGift
        .currentTier
        ?.effectiveUnitCny!==208||
      advancedGift
        .nextTier
        ?.tierUnitCny!==148||
      advancedGift
        .nextTier
        ?.effectiveUnitCny!==198||
      advancedGift
        .nextTier
        ?.unitSavingCny!==10
    ){
      fail(
        'Package-aware tier pricing projection failed.'
      );
    }

    const holidayAdvanced=
      policy.commercialSnapshot({
        item:{
          series:'holiday',
          size:'S',
          scentSeries:'advanced'
        },
        size:'S',
        scentSeries:'advanced',
        quantity:76,
        pack:'礼品包装',
        language:'en',
        seriesMeta,
        currencyMap
      });

    if(
      holidayAdvanced
        .productSeries!=='holiday'||
      holidayAdvanced
        .pricingSeries!=='advanced'||
      holidayAdvanced
        .pricingMode!=='selectedScentSeries'||
      holidayAdvanced
        .moq!==36||
      holidayAdvanced
        .packageSurchargeCny!==50||
      holidayAdvanced
        .currentTier
        ?.effectiveUnitCny!==208||
      holidayAdvanced
        .nextTier
        ?.effectiveUnitCny!==198
    ){
      fail(
        'Holiday delegated-pricing projection failed.'
      );
    }

    const classic=
      policy.commercialSnapshot({
        item:{
          series:'classic',
          size:'S'
        },
        size:'S',
        quantity:36,
        language:'en',
        seriesMeta,
        currencyMap
      });

    if(
      classic.tiers.length!==1||
      classic.hasVolumeBreaks!==false||
      classic.nextTier!==null||
      classic.isBestAvailableTier!==true||
      classic.currentTier
        ?.rangeLabel!=='1+'
    ){
      fail(
        'Single-tier Classic commercial projection failed.'
      );
    }

    const bestTier=
      policy.commercialSnapshot({
        item:{
          series:'advanced',
          size:'S'
        },
        size:'S',
        quantity:1000,
        language:'en',
        seriesMeta,
        currencyMap
      });

    if(
      bestTier.currentTier
        ?.rangeLabel!=='1000+'||
      bestTier.nextTier!==null||
      bestTier.isBestAvailableTier!==true
    ){
      fail(
        'Best-available-tier terminal projection failed.'
      );
    }

    const zh=
      policy.commercialSnapshot({
        item:{
          series:'masterpiece',
          size:'S'
        },
        size:'S',
        quantity:76,
        pack:'礼品包装',
        language:'zh',
        seriesMeta,
        currencyMap
      });

    if(
      !String(
        zh.currentTier
          ?.displayUnitPrice||
        ''
      ).startsWith('¥ ')||
      zh.currencyUnit!=='/件'
    ){
      fail(
        'Localized commercial display projection failed.'
      );
    }
  }
}catch(error){
  fail(
    'E-C1 Commercial Pricing execution failed: '+
    error.message
  );
}

try{
  const source=
    read(
      'src/domain/pricing/runtime-pricing-policy.js'
    );

  for(const marker of [
    'function commercialSnapshot(',
    'productSeries',
    'pricingSeries',
    'quantityToMoq',
    'packageSurchargeCny',
    'displayUnitPrice',
    'additionalQty',
    'unitSavingCny',
    'hasVolumeBreaks',
    'isBestAvailableTier'
  ]){
    if(!source.includes(marker)){
      fail(
        'Commercial Pricing Foundation source is missing: '+
        marker
      );
    }
  }

  for(const forbidden of [
    'document.',
    'querySelector(',
    'localStorage',
    'sessionStorage',
    'fetch('
  ]){
    const start=
      source.indexOf(
        'function commercialSnapshot('
      );

    const end=
      source.indexOf(
        'function catalogUnit(',
        start
      );

    const slice=
      start>=0&&
      end>start
        ? source.slice(
            start,
            end
          )
        : '';

    if(
      slice.includes(
        forbidden
      )
    ){
      fail(
        'Commercial Pricing Foundation crossed Domain boundary: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'E-C1 source inspection failed: '+
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
      ?.['r4:commercial:pricing-foundation']!==
    'node scripts/validate-r4-11b4-1ec1-commercial-pricing-foundation.mjs'
  ){
    fail(
      'package.json is missing r4:commercial:pricing-foundation.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const domain=
    validate.indexOf(
      'npm run r4:domain:pricing'
    );

  const commercial=
    validate.indexOf(
      'npm run r4:commercial:pricing-foundation'
    );

  const nextDomain=
    validate.indexOf(
      'npm run r4:domain:submission-payload'
    );

  if(
    domain<0||
    commercial<=domain||
    nextDomain<=commercial
  ){
    fail(
      'E-C1 gate must run immediately after canonical Pricing Domain and before subsequent R4 Domain/Astro gates.'
    );
  }
}catch(error){
  fail(
    'E-C1 package validation failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.11B4.1E-C1 COMMERCIAL PRICING INTELLIGENCE FOUNDATION: FAIL'
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
  'DREAMLAND B7-00B.4J R4.11B4.1E-C1 COMMERCIAL PRICING INTELLIGENCE FOUNDATION: PASS'
);
console.log(
  'Canonical commercial snapshot / MOQ independence / package-aware tier projection / Holiday delegated pricing / next-break intelligence / EN-ZH display projection verified.'
);
console.log('');

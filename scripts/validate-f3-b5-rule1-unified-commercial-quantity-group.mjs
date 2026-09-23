#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
  pathToFileURL
} from 'node:url';

const ROOT=
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url
      )
    ),
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

if(SOURCE_MODE===DIST_MODE){
  console.error(
    'Usage: node scripts/validate-f3-b5-rule1-unified-commercial-quantity-group.mjs --source|--dist'
  );
  process.exit(1);
}

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
  left,
  right,
  epsilon=1e-9
){
  return Math.abs(
    Number(left)-
    Number(right)
  )<=epsilon;
}

if(SOURCE_MODE){
  try{
    const source=
      read(
        'src/features/inquiry/runtime-inquiry.js'
      );

    for(const marker of [
      'function commercialGroupKey(',
      'productMoqGroups(',
      'pricingGroupQuantity(',
      'commercialGroupKey,'
    ]){
      if(!source.includes(marker)){
        fail(
          'Unified commercial grouping owner is missing: '+
          marker
        );
      }
    }

    if(
      source.includes(
        'function pricingGroupKey('
      )
    ){
      fail(
        'Legacy pricing-only group-key owner still exists.'
      );
    }
  }catch(error){
    fail(
      'Unified group source inspection failed: '+
      error.message
    );
  }

  try{
    delete globalThis
      .DreamlandPricingPolicy;

    delete globalThis
      .DreamlandInquiry;

    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/domain/pricing/runtime-pricing-policy.js'
        )
      ).href+
      '?rule1-pricing='+
      Date.now()
    );

    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/features/inquiry/runtime-inquiry.js'
        )
      ).href+
      '?rule1-inquiry='+
      Date.now()
    );

    const pricing=
      globalThis
        .DreamlandPricingPolicy;

    const inquiry=
      globalThis
        .DreamlandInquiry;

    const seriesMeta=
      json(
        'data/series.json'
      ).series||
      {};

    const currencyMap=
      json(
        'data/i18n.json'
      ).currencyMap||
      {};

    const memory=
      new Map();

    const storage={
      getItem(key){
        return memory.has(key)
          ? memory.get(key)
          : null;
      },
      setItem(key,value){
        memory.set(
          key,
          String(value)
        );
      }
    };

    memory.set(
      'productManualV2State',
      JSON.stringify({
        version:2,
        contact:{},
        items:[
          {
            id:'adv-s-a',
            type:'product',
            productId:'ADV001',
            series:'advanced',
            size:'S',
            pack:'默认包装',
            qty:60
          },
          {
            id:'adv-s-b',
            type:'product',
            productId:'ADV002',
            series:'advanced',
            size:'S',
            pack:'默认包装',
            qty:50
          },
          {
            id:'adv-m-a',
            type:'product',
            productId:'ADV003',
            series:'advanced',
            size:'M',
            pack:'默认包装',
            qty:90
          },
          {
            id:'hol-adv-s-a',
            type:'product',
            productId:'HOL001',
            series:'holiday',
            scentSeries:'advanced',
            size:'S',
            pack:'默认包装',
            qty:20
          },
          {
            id:'hol-adv-s-b',
            type:'product',
            productId:'HOL002',
            series:'holiday',
            scentSeries:'advanced',
            size:'S',
            pack:'默认包装',
            qty:20
          },
          {
            id:'hol-mpc-s',
            type:'product',
            productId:'HOL003',
            series:'holiday',
            scentSeries:'masterpiece',
            size:'S',
            pack:'默认包装',
            qty:30
          },
          {
            id:'hol-adv-m',
            type:'product',
            productId:'HOL004',
            series:'holiday',
            scentSeries:'advanced',
            size:'M',
            pack:'默认包装',
            qty:100
          }
        ]
      })
    );

    inquiry.configure({
      storage,
      storageKey:
        'productManualV2State',
      version:2,
      normalizeQuantity:
        (
          value,
          min
        )=>
          pricing.normalizeQuantity(
            value,
            min,
            1000000
          ),
      pricingSeriesFor:
        item=>
          pricing.pricingSeriesFor(
            item,
            seriesMeta
          ),
      tierUnitCny:
        (
          series,
          size,
          quantity
        )=>
          pricing.tierUnitCny(
            series,
            size,
            quantity,
            seriesMeta
          ),
      packSurchargeCny:
        (
          series,
          pack
        )=>
          pricing.packSurchargeCny(
            series,
            pack,
            seriesMeta
          ),
      convertCnyToBase:
        value=>
          pricing.cnyToBase(
            value,
            currencyMap
          )
    });

    const expectedKeys={
      'adv-s-a':
        'advanced|S',
      'adv-s-b':
        'advanced|S',
      'adv-m-a':
        'advanced|M',
      'hol-adv-s-a':
        'holiday:advanced|S',
      'hol-adv-s-b':
        'holiday:advanced|S',
      'hol-mpc-s':
        'holiday:masterpiece|S',
      'hol-adv-m':
        'holiday:advanced|M'
    };

    for(const [
      id,
      expected
    ] of Object.entries(
      expectedKeys
    )){
      const item=
        inquiry.findItem(
          id
        );

      if(
        inquiry.commercialGroupKey(
          item
        )!==expected
      ){
        fail(
          'Commercial group key mismatch for '+
          id+
          ': expected '+
          expected+
          ', got '+
          inquiry.commercialGroupKey(
            item
          )
        );
      }
    }

    const moqGroups=
      inquiry.productMoqGroups(
        item=>
          pricing.moqForSeriesSize(
            item?.series,
            item?.size,
            seriesMeta
          )
      );

    const map=
      new Map(
        moqGroups.map(
          group=>[
            group.key,
            group
          ]
        )
      );

    const expectedQuantities={
      'advanced|S':110,
      'advanced|M':90,
      'holiday:advanced|S':40,
      'holiday:masterpiece|S':30,
      'holiday:advanced|M':100
    };

    for(const [
      key,
      quantity
    ] of Object.entries(
      expectedQuantities
    )){
      const group=
        map.get(
          key
        );

      if(
        !group||
        group.qty!==quantity
      ){
        fail(
          'MOQ group quantity mismatch for '+
          key+
          ': expected '+
          quantity+
          ', got '+
          String(
            group?.qty
          )
        );
      }
    }

    const expectedMoq={
      'advanced|S':36,
      'advanced|M':24,
      'holiday:advanced|S':36,
      'holiday:masterpiece|S':36,
      'holiday:advanced|M':24
    };

    for(const [
      key,
      moq
    ] of Object.entries(
      expectedMoq
    )){
      if(
        map.get(key)?.moq!==moq
      ){
        fail(
          'MOQ value mismatch for '+
          key+
          ': expected '+
          moq+
          ', got '+
          String(
            map.get(key)?.moq
          )
        );
      }
    }

    for(const id of Object.keys(
      expectedKeys
    )){
      const item=
        inquiry.findItem(
          id
        );

      const key=
        inquiry.commercialGroupKey(
          item
        );

      const quantity=
        inquiry.pricingGroupQuantity(
          item
        );

      if(
        quantity!==
        expectedQuantities[key]
      ){
        fail(
          'Pricing quantity must equal the same canonical commercial group quantity for '+
          id+
          '.'
        );
      }
    }

    const view=
      inquiry.buildViewModel();

    const advS=
      view.items.find(
        item=>
          item.id===
          'adv-s-a'
      );

    const advM=
      view.items.find(
        item=>
          item.id===
          'adv-m-a'
      );

    const advSSnapshot=
      pricing.commercialSnapshot({
        item:advS,
        size:advS.size,
        pack:advS.pack,
        quantity:
          inquiry.pricingGroupQuantity(
            advS
          ),
        language:'en',
        seriesMeta,
        currencyMap
      });

    const advMSnapshot=
      pricing.commercialSnapshot({
        item:advM,
        size:advM.size,
        pack:advM.pack,
        quantity:
          inquiry.pricingGroupQuantity(
            advM
          ),
        language:'en',
        seriesMeta,
        currencyMap
      });

    if(
      advSSnapshot.currentTier
        ?.rangeLabel!==
      '100-299'
    ){
      fail(
        'Advanced S 60+50 must share 110 pcs and use the 100-299 tier.'
      );
    }

    if(
      advMSnapshot.currentTier
        ?.rangeLabel!==
      '1-99'
    ){
      fail(
        'Advanced M 90 pcs must remain separate from Advanced S and use the 1-99 tier.'
      );
    }

    if(
      !approx(
        advS.unitPrice,
        advSSnapshot.currentTier
          ?.unitBase
      )||
      !approx(
        advM.unitPrice,
        advMSnapshot.currentTier
          ?.unitBase
      )
    ){
      fail(
        'Inquiry unit prices diverged from canonical group-specific commercialSnapshot tiers.'
      );
    }
  }catch(error){
    fail(
      'Unified commercial quantity execution failed: '+
      error.message
    );
  }

  try{
    const adapter=
      read(
        'src/astro/runtime/inquiry-runtime.js'
      );

    for(const marker of [
      '.commercialGroupKey(',
      'commercialGroupLabel(',
      'inquiryMoqGroup'
    ]){
      if(!adapter.includes(marker)){
        fail(
          'Inquiry MOQ presentation does not consume the unified group owner: '+
          marker
        );
      }
    }

    if(
      adapter.includes(
        'function moqGroupKey('
      )
    ){
      fail(
        'Inquiry adapter still carries a duplicate MOQ-only group-key implementation.'
      );
    }
  }catch(error){
    fail(
      'Unified Inquiry adapter contract failed: '+
      error.message
    );
  }

  try{
    const commercial=
      read(
        'src/astro/runtime/inquiry-commercial-runtime.js'
      );

    for(const marker of [
      '.commercialGroupKey(',
      '.pricingGroupQuantity(',
      'snapshot.size'
    ]){
      if(!commercial.includes(marker)){
        fail(
          'Commercial summary does not consume the unified quantity group: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'Unified Commercial projection contract failed: '+
      error.message
    );
  }

  try{
    const i18n=
      json(
        'data/i18n.json'
      );

    const expected={
      zh:
        '按同系列、同尺寸商品合计数量计算；节日系列按香型价格系列分别计算',
      en:
        'Combined by the same series and size; Holiday is separated by scent pricing series',
      ko:
        '같은 시리즈·같은 사이즈 상품 수량을 합산하며, 시즌 시리즈는 향 가격 시리즈별로 구분합니다'
    };

    for(const [
      language,
      value
    ] of Object.entries(
      expected
    )){
      if(
        i18n.ui
          ?.[language]
          ?.tierRule!==value
      ){
        fail(
          'tierRule does not document the unified grouping rule for '+
          language+
          '.'
        );
      }
    }
  }catch(error){
    fail(
      'Unified grouping localization failed: '+
      error.message
    );
  }

  try{
    const f3b2=
      read(
        'scripts/validate-f3-b2-inquiry-interaction-efficiency.mjs'
      );

    if(
      !f3b2.includes(
        'Unified commercial quantity group'
      )||
      f3b2.includes(
        'Pricing grouping remains series'
      )
    ){
      fail(
        'F3-B2 regression contract still describes the old split grouping rule.'
      );
    }

    const promotion=
      read(
        'scripts/r4-promote-astro-inquiry.mjs'
      );

    if(
      !promotion.includes(
        "'commercialGroupKey'"
      )
    ){
      fail(
        'Production Inquiry promotion does not protect the unified group owner.'
      );
    }
  }catch(error){
    fail(
      'Unified group regression/promotion contract failed: '+
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
        ?.['r4:conversion:unified-commercial-group']!==
      'node scripts/validate-f3-b5-rule1-unified-commercial-quantity-group.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:unified-commercial-group.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:unified-commercial-group:dist']!==
      'node scripts/validate-f3-b5-rule1-unified-commercial-quantity-group.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:unified-commercial-group:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    const custom=
      validate.indexOf(
        'npm run r4:conversion:custom-edit'
      );

    const unified=
      validate.indexOf(
        'npm run r4:conversion:unified-commercial-group'
      );

    const closeout=
      validate.indexOf(
        'npm run r4:conversion:interaction-closeout'
      );

    if(
      custom<0||
      unified<=custom||
      closeout<=unified
    ){
      fail(
        'Unified group source gate must run after F3-B4 and before F3-B5 closeout.'
      );
    }

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    const customDist=
      build.indexOf(
        'npm run r4:conversion:custom-edit:dist'
      );

    const unifiedDist=
      build.indexOf(
        'npm run r4:conversion:unified-commercial-group:dist'
      );

    const closeoutDist=
      build.indexOf(
        'npm run r4:conversion:interaction-closeout:dist'
      );

    if(
      customDist<0||
      unifiedDist<=customDist||
      closeoutDist<=unifiedDist
    ){
      fail(
        'Unified group Production gate must run after F3-B4 and before F3-B5 Production closeout.'
      );
    }
  }catch(error){
    fail(
      'Unified group package topology failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  try{
    for(const relative of [
      '.r4-astro-dist/r4-inquiry-runtime.js',
      'dist/r4-inquiry-runtime.js'
    ]){
      const bundle=
        read(
          relative
        );

      /*
       * Source-mode already executes the canonical owner and proves exact
       * keys such as advanced|S / advanced|M / holiday:advanced|S.
       *
       * Production bundles contain the implementation, not validator fixture
       * literals. Dist mode therefore verifies the structural implementation
       * markers instead of requiring a test-only concrete key string.
       */
      for(const marker of [
        'function commercialGroupKey(',
        '.commercialGroupKey(',
        'item?.size||',
        "'holiday:'",
        'pricingSeries('
      ]){
        if(!bundle.includes(marker)){
          fail(
            relative+
            ' is missing unified commercial grouping marker: '+
            marker
          );
        }
      }
    }
  }catch(error){
    fail(
      'Unified group Production bundle validation failed: '+
      error.message
    );
  }

  try{
    for(const relative of [
      '.r4-astro-dist/inquiry/index.html',
      'dist/inquiry/index.html'
    ]){
      const html=
        read(
          relative
        );

      for(const value of [
        '按同系列、同尺寸商品合计数量计算',
        'Combined by the same series and size',
        '같은 시리즈·같은 사이즈'
      ]){
        if(!html.includes(value)){
          fail(
            relative+
            ' runtime state is missing unified grouping copy: '+
            value
          );
        }
      }
    }
  }catch(error){
    fail(
      'Unified grouping Production localization failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-B5-RULE1 UNIFIED COMMERCIAL QUANTITY GROUP: FAIL'
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
  'DREAMLAND F3-B5-RULE1 UNIFIED COMMERCIAL QUANTITY GROUP: PASS'
);

console.log(
  SOURCE_MODE
    ? 'Same-series + same-size mixed-product aggregation now drives both MOQ and tier pricing; different sizes and Holiday pricing-series boundaries stay separate.'
    : 'Isolated Astro + Production Inquiry preserve the unified commercial quantity-group rule.'
);

console.log('');

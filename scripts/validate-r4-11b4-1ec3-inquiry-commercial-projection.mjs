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
  const page=
    read(
      'src/astro/components/inquiry/InquiryPage.astro'
    );

  for(const marker of [
    'data-inquiry-commercial-summary',
    'data-inquiry-commercial-title',
    'data-inquiry-commercial-rule',
    'data-inquiry-commercial-groups'
  ]){
    if(!page.includes(marker)){
      fail(
        'Inquiry Commercial Projection shell is missing: '+
        marker
      );
    }
  }
}catch(error){
  fail(
    'E-C3 Inquiry shell inspection failed: '+
    error.message
  );
}

try{
  const viewModel=
    read(
      'src/astro/lib/inquiry-view-model.mjs'
    );

  for(const key of [
    "'tierPriceTable'",
    "'tierRule'",
    "'currentPriceTier'",
    "'unitSaving'",
    "'nextPriceBreak'",
    "'moreToNextBreak'",
    "'bestTierReached'",
    "'noMorePriceBreaks'"
  ]){
    if(!viewModel.includes(key)){
      fail(
        'Inquiry runtime-state commercial localization is missing: '+
        key
      );
    }
  }
}catch(error){
  fail(
    'E-C3 Inquiry runtime-state inspection failed: '+
    error.message
  );
}

try{
  const i18n=
    json(
      'data/i18n.json'
    );

  for(const language of [
    'en',
    'zh',
    'ko'
  ]){
    for(const key of [
      'tierPriceTable',
      'tierRule',
      'currentPriceTier',
      'unitSaving',
      'nextPriceBreak',
      'moreToNextBreak',
      'bestTierReached',
      'noMorePriceBreaks'
    ]){
      if(
        !String(
          i18n.ui
            ?.[language]
            ?.[key]||
          ''
        ).trim()
      ){
        fail(
          'Inquiry commercial localization is missing: '+
          language+
          '.'+
          key
        );
      }
    }
  }
}catch(error){
  fail(
    'E-C3 localization validation failed: '+
    error.message
  );
}

try{
  const adapter=
    read(
      'src/astro/runtime/inquiry-runtime.js'
    );

  for(const marker of [
    "'dreamland:inquiry-render'",
    'viewModel,',
    'language'
  ]){
    if(!adapter.includes(marker)){
      fail(
        'Inquiry adapter render bridge is missing: '+
        marker
      );
    }
  }

  const bytes=
    Buffer.byteLength(
      adapter,
      'utf8'
    );

  if(bytes>48*1024){
    fail(
      'Inquiry adapter exceeds protected 48 KiB budget after E-C3: '+
      bytes+
      ' bytes.'
    );
  }
}catch(error){
  fail(
    'E-C3 Inquiry adapter validation failed: '+
    error.message
  );
}

try{
  const commercial=
    read(
      'src/astro/runtime/inquiry-commercial-runtime.js'
    );

  for(const marker of [
    "const VERSION='R4.11B4.1E-C3'",
    'DreamlandInquiryCommercialUi',
    "'dreamland:inquiry-render'",
    '.commercialSnapshot({',
    '.pricingGroupQuantity(',
    'data-inquiry-commercial-item',
    'data-inquiry-commercial-summary'
  ]){
    if(!commercial.includes(marker)){
      fail(
        'Inquiry Commercial Projection runtime is missing: '+
        marker
      );
    }
  }

  for(const forbidden of [
    '.tierFor(',
    '.tierUnitCny(',
    '.packSurchargeCny(',
    '.nextTierFor(',
    'fetch(',
    'XMLHttpRequest'
  ]){
    if(commercial.includes(forbidden)){
      fail(
        'Inquiry Commercial Projection bypassed canonical E-C1 ownership: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'E-C3 Commercial Projection runtime inspection failed: '+
    error.message
  );
}

try{
  const bundler=
    read(
      'scripts/r4-copy-astro-inquiry-assets.mjs'
    );

  const feature=
    bundler.indexOf(
      "'src/features/inquiry/runtime-inquiry.js'"
    );

  const commercial=
    bundler.indexOf(
      "'src/astro/runtime/inquiry-commercial-runtime.js'"
    );

  const adapter=
    bundler.indexOf(
      "'src/astro/runtime/inquiry-runtime.js'"
    );

  if(
    feature<0||
    commercial<=feature||
    adapter<=commercial
  ){
    fail(
      'Inquiry bundle order must be Pricing → Inquiry Feature → Commercial Projection → Adapter.'
    );
  }
}catch(error){
  fail(
    'E-C3 Inquiry bundle validation failed: '+
    error.message
  );
}

try{
  const css=
    read(
      'src/astro/styles/inquiry.css'
    );

  for(const selector of [
    '.inquiry-item__commercial {',
    '.inquiry-commercial-summary {',
    '.inquiry-commercial-group {'
  ]){
    if(!css.includes(selector)){
      fail(
        'Inquiry Commercial Projection styling is missing: '+
        selector
      );
    }
  }
}catch(error){
  fail(
    'E-C3 Inquiry CSS validation failed: '+
    error.message
  );
}

/*
 * Semantic integration proof:
 * Inquiry owns group quantity; PricingPolicy owns commercial tiers/prices.
 * Two Advanced items combine to 120 pcs and therefore share the 100–299 tier.
 * Holiday delegated pricing remains a separate pricing group.
 */
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
    '?ec3-pricing='+
    Date.now()
  );

  await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src/features/inquiry/runtime-inquiry.js'
      )
    ).href+
    '?ec3-inquiry='+
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
    ).series||{};

  const currencyMap=
    json(
      'data/i18n.json'
    ).currencyMap||{};

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
      items:[
        {
          id:'a1',
          type:'product',
          productId:'ADV001',
          series:'advanced',
          size:'S',
          pack:'批发包装',
          qty:60
        },
        {
          id:'a2',
          type:'product',
          productId:'ADV002',
          series:'advanced',
          size:'S',
          pack:'礼品包装',
          qty:60
        },
        {
          id:'h1',
          type:'product',
          productId:'HOL001',
          series:'holiday',
          scentSeries:'advanced',
          size:'S',
          pack:'礼品包装',
          qty:76
        }
      ],
      contact:{}
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
        pricing
          .normalizeQuantity(
            value,
            min,
            1000000
          ),
    pricingSeriesFor:
      item=>
        pricing
          .pricingSeriesFor(
            item,
            seriesMeta
          ),
    tierUnitCny:
      (
        series,
        size,
        quantity
      )=>
        pricing
          .tierUnitCny(
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
        pricing
          .packSurchargeCny(
            series,
            pack,
            seriesMeta
          ),
    convertCnyToBase:
      value=>
        pricing
          .cnyToBase(
            value,
            currencyMap
          )
  });

  const view=
    inquiry
      .buildViewModel();

  const a1=
    view.items.find(
      item=>
        item.id==='a1'
    );

  const a2=
    view.items.find(
      item=>
        item.id==='a2'
    );

  const h1=
    view.items.find(
      item=>
        item.id==='h1'
    );

  const advancedQty=
    inquiry
      .pricingGroupQuantity(
        a1
      );

  const holidayQty=
    inquiry
      .pricingGroupQuantity(
        h1
      );

  if(
    advancedQty!==120||
    holidayQty!==76
  ){
    fail(
      'Inquiry pricing-group aggregation is not preserving canonical Advanced/Holiday boundaries.'
    );
  }

  const a1Snapshot=
    pricing
      .commercialSnapshot({
        item:a1,
        size:a1.size,
        pack:a1.pack,
        quantity:
          advancedQty,
        language:'en',
        seriesMeta,
        currencyMap
      });

  const a2Snapshot=
    pricing
      .commercialSnapshot({
        item:a2,
        size:a2.size,
        pack:a2.pack,
        quantity:
          advancedQty,
        language:'en',
        seriesMeta,
        currencyMap
      });

  const holidaySnapshot=
    pricing
      .commercialSnapshot({
        item:h1,
        size:h1.size,
        scentSeries:
          h1.scentSeries,
        pack:h1.pack,
        quantity:
          holidayQty,
        language:'en',
        seriesMeta,
        currencyMap
      });

  if(
    a1Snapshot.currentTier
      ?.rangeLabel!=='100-299'||
    a1Snapshot.nextTier
      ?.minQty!==300||
    a1Snapshot.nextTier
      ?.additionalQty!==180
  ){
    fail(
      'Combined Advanced quantity must project into the 100–299 tier with the next break at 300.'
    );
  }

  if(
    !approx(
      a1.unitPrice,
      a1Snapshot.currentTier
        ?.unitBase
    )||
    !approx(
      a2.unitPrice,
      a2Snapshot.currentTier
        ?.unitBase
    )
  ){
    fail(
      'Inquiry current unit pricing diverged from canonical E-C1 commercialSnapshot().'
    );
  }

  if(
    holidaySnapshot
      .productSeries!=='holiday'||
    holidaySnapshot
      .pricingSeries!=='advanced'||
    holidaySnapshot
      .currentTier
      ?.rangeLabel!=='1-99'||
    holidaySnapshot
      .nextTier
      ?.additionalQty!==24
  ){
    fail(
      'Holiday delegated commercial projection drifted inside Inquiry.'
    );
  }
}catch(error){
  fail(
    'E-C3 semantic integration execution failed: '+
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
      ?.['r4:commercial:inquiry-projection']!==
    'node scripts/validate-r4-11b4-1ec3-inquiry-commercial-projection.mjs'
  ){
    fail(
      'package.json is missing r4:commercial:inquiry-projection.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const inquiry=
    validate.indexOf(
      'npm run r4:astro:inquiry-runtime'
    );

  const commercial=
    validate.indexOf(
      'npm run r4:commercial:inquiry-projection'
    );

  const contact=
    validate.indexOf(
      'npm run r4:astro:contact'
    );

  if(
    inquiry<0||
    commercial<=inquiry||
    contact<=commercial
  ){
    fail(
      'E-C3 gate must run immediately after Astro Inquiry runtime and before Contact.'
    );
  }
}catch(error){
  fail(
    'E-C3 package validation failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.11B4.1E-C3 INQUIRY COMMERCIAL PROJECTION: FAIL'
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
  'DREAMLAND B7-00B.4J R4.11B4.1E-C3 INQUIRY COMMERCIAL PROJECTION: PASS'
);
console.log(
  'Inquiry pricing-group quantity / canonical commercialSnapshot parity / per-item tier intelligence / aggregated commercial groups / Holiday delegation / EN-ZH-KO projection verified.'
);
console.log('');

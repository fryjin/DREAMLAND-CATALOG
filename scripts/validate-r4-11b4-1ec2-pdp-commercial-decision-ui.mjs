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

try{
  const page=
    read(
      'src/astro/components/product/PdpPage.astro'
    );

  for(const marker of [
    'data-pdp-commercial',
    'data-pdp-commercial-current-tier',
    'data-pdp-commercial-moq-gap',
    'data-pdp-commercial-next',
    'data-pdp-commercial-saving',
    'data-pdp-tier-sheet',
    'data-pdp-tier-rows'
  ]){
    if(!page.includes(marker)){
      fail(
        'PDP Commercial Decision shell is missing: '+
        marker
      );
    }
  }

  if(
    page.indexOf(
      'data-pdp-commercial'
    )>
    page.indexOf(
      'class="pdp-tags"'
    )
  ){
    fail(
      'Commercial Decision UI must remain directly after configuration/quantity and before product tags/actions.'
    );
  }
}catch(error){
  fail(
    'E-C2 PDP shell inspection failed: '+
    error.message
  );
}

try{
  const viewModel=
    read(
      'src/astro/lib/pdp-view-model.mjs'
    );

  for(const key of [
    "'tierPriceTable'",
    "'tierQty'",
    "'buyMorePrefix'",
    "'buyMoreSuffix'",
    "'bestTierReached'",
    "'currentPriceTier'",
    "'unitSaving'",
    "'moreToMoq'",
    "'noMorePriceBreaks'"
  ]){
    if(!viewModel.includes(key)){
      fail(
        'PDP compactUi commercial localization is missing: '+
        key
      );
    }
  }
}catch(error){
  fail(
    'E-C2 PDP runtime-state projection inspection failed: '+
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
      'viewTierPrice',
      'tierPriceTable',
      'tierQty',
      'buyMorePrefix',
      'buyMoreSuffix',
      'bestTierReached',
      'currentPriceTier',
      'unitSaving',
      'moreToMoq',
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
          'Commercial UI localization is missing: '+
          language+
          '.'+
          key
        );
      }
    }
  }
}catch(error){
  fail(
    'E-C2 localization validation failed: '+
    error.message
  );
}

try{
  const commercial=
    read(
      'src/astro/runtime/pdp-commercial-runtime.js'
    );

  for(const marker of [
    "const VERSION='R4.11B4.1E-C2'",
    'DreamlandPdpCommercialUi',
    "document.addEventListener(\n    'dreamland:pdp-render'",
    'pricing.commercialSnapshot({',
    'snapshot.nextTier',
    'snapshot.quantityToMoq',
    'snapshot.hasVolumeBreaks',
    'snapshot.currencyUnit',
    'renderTiers('
  ]){
    if(!commercial.includes(marker)){
      fail(
        'Commercial PDP runtime is missing: '+
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
    'localStorage'
  ]){
    if(commercial.includes(forbidden)){
      fail(
        'Commercial PDP UI bypassed canonical commercialSnapshot ownership: '+
        forbidden
      );
    }
  }
}catch(error){
  fail(
    'E-C2 commercial runtime inspection failed: '+
    error.message
  );
}

try{
  const adapter=
    read(
      'src/astro/runtime/pdp-runtime.js'
    );

  if(
    !adapter.includes(
      "'dreamland:pdp-render'"
    )||
    !adapter.includes(
      'language:currentLanguage'
    )
  ){
    fail(
      'PDP minimal adapter is not publishing the canonical render bridge.'
    );
  }

  const bytes=
    Buffer.byteLength(
      adapter,
      'utf8'
    );

  if(bytes>36*1024){
    fail(
      'PDP minimal adapter exceeds protected 36 KiB budget after E-C2: '+
      bytes+
      ' bytes.'
    );
  }
}catch(error){
  fail(
    'E-C2 PDP adapter validation failed: '+
    error.message
  );
}

try{
  const bundler=
    read(
      'scripts/r4-copy-astro-pdp-assets.mjs'
    );

  const commercial=
    bundler.indexOf(
      "'pdp-commercial-runtime.js'"
    );

  const adapter=
    bundler.indexOf(
      "'pdp-runtime.js'"
    );

  if(
    commercial<0||
    adapter<=commercial
  ){
    fail(
      'PDP bundle must load Commercial UI before the minimal adapter.'
    );
  }
}catch(error){
  fail(
    'E-C2 PDP bundle validation failed: '+
    error.message
  );
}

try{
  const css=
    read(
      'src/astro/styles/pdp.css'
    );

  for(const selector of [
    '.pdp-commercial {',
    '.pdp-commercial__next {',
    '.pdp-tier-sheet {',
    '.pdp-tier-row.is-current {'
  ]){
    if(!css.includes(selector)){
      fail(
        'Commercial PDP styling is missing: '+
        selector
      );
    }
  }
}catch(error){
  fail(
    'E-C2 PDP CSS validation failed: '+
    error.message
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
    '?ec2-pricing='+
    Date.now()
  );

  const policy=
    globalThis
      .DreamlandPricingPolicy;

  const seriesMeta=
    json(
      'data/series.json'
    ).series||{};

  const currencyMap=
    json(
      'data/i18n.json'
    ).currencyMap||{};

  const snapshot=
    policy
      ?.commercialSnapshot({
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
    snapshot
      ?.currentTier
      ?.rangeLabel!=='1-99'||
    snapshot
      ?.nextTier
      ?.additionalQty!==24||
    snapshot
      ?.nextTier
      ?.unitSavingCny!==10||
    snapshot
      ?.tiers
      ?.length!==5
  ){
    fail(
      'E-C2 no longer receives the expected canonical E-C1 commercial projection.'
    );
  }
}catch(error){
  fail(
    'E-C2 Pricing Foundation integration failed: '+
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
      ?.['r4:commercial:pdp-ui']!==
    'node scripts/validate-r4-11b4-1ec2-pdp-commercial-decision-ui.mjs'
  ){
    fail(
      'package.json is missing r4:commercial:pdp-ui.'
    );
  }

  const validate=
    String(
      pkg.scripts
        ?.validate||
      ''
    );

  const pdpRuntime=
    validate.indexOf(
      'npm run r4:astro:pdp-runtime'
    );

  const commercial=
    validate.indexOf(
      'npm run r4:commercial:pdp-ui'
    );

  const custom=
    validate.indexOf(
      'npm run r4:astro:custom'
    );

  if(
    pdpRuntime<0||
    commercial<=pdpRuntime||
    custom<=commercial
  ){
    fail(
      'E-C2 gate must run immediately after Astro PDP runtime and before subsequent route gates.'
    );
  }
}catch(error){
  fail(
    'E-C2 package validation failed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.11B4.1E-C2 PDP COMMERCIAL DECISION UI: FAIL'
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
  'DREAMLAND B7-00B.4J R4.11B4.1E-C2 PDP COMMERCIAL DECISION UI: PASS'
);
console.log(
  'Current tier / MOQ gap / next price break / per-unit saving / collapsible tier sheet / EN-ZH-KO projection / protected PDP adapter budget verified.'
);
console.log('');

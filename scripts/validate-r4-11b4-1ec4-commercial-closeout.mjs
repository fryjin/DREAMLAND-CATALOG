#!/usr/bin/env node
import crypto from 'node:crypto';
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

if(
  SOURCE_MODE===
  DIST_MODE
){
  console.error(
    'Usage: node scripts/validate-r4-11b4-1ec4-commercial-closeout.mjs --source|--dist'
  );
  process.exit(1);
}

const errors=[];

function fail(message){
  errors.push(message);
}

function exists(relative){
  return fs.existsSync(
    path.join(
      ROOT,
      relative
    )
  );
}

function read(relative){
  const file=
    path.join(
      ROOT,
      relative
    );

  if(!fs.existsSync(file)){
    throw new Error(
      'Missing file: '+
      relative
    );
  }

  return fs
    .readFileSync(
      file,
      'utf8'
    )
    .replace(
      /\r\n?/g,
      '\n'
    );
}

function buffer(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    )
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function hash(value){
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
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
  /*
   * Canonical owner chain:
   * E-C1 PricingPolicy
   * → E-C2 PDP projection
   * → E-C3 Inquiry aggregation/projection
   */
  try{
    const pricing=
      read(
        'src/domain/pricing/runtime-pricing-policy.js'
      );

    const pdp=
      read(
        'src/astro/runtime/pdp-commercial-runtime.js'
      );

    const inquiry=
      read(
        'src/astro/runtime/inquiry-commercial-runtime.js'
      );

    if(
      !pricing.includes(
        'function commercialSnapshot('
      )
    ){
      fail(
        'E-C1 commercialSnapshot() canonical owner is missing.'
      );
    }

    for(const [
      label,
      source
    ] of [
      [
        'PDP',
        pdp
      ],
      [
        'Inquiry',
        inquiry
      ]
    ]){
      if(
        !source.includes(
          '.commercialSnapshot({'
        )
      ){
        fail(
          label+
          ' no longer consumes canonical commercialSnapshot().'
        );
      }

      for(const forbidden of [
        '.tierFor(',
        '.tierUnitCny(',
        '.packSurchargeCny(',
        '.nextTierFor('
      ]){
        if(
          source.includes(
            forbidden
          )
        ){
          fail(
            label+
            ' Commercial UI bypassed E-C1 ownership: '+
            forbidden
          );
        }
      }
    }

    if(
      !inquiry.includes(
        '.pricingGroupQuantity('
      )
    ){
      fail(
        'Inquiry must keep canonical pricing-group aggregation ownership.'
      );
    }
  }catch(error){
    fail(
      'Commercial owner-chain inspection failed: '+
      error.message
    );
  }

  /*
   * EN / ZH / KO closeout.
   */
  try{
    const i18n=
      json(
        'data/i18n.json'
      );

    const required=[
      'viewTierPrice',
      'tierPriceTable',
      'tierQty',
      'tierRule',
      'currentPriceTier',
      'unitSaving',
      'buyMorePrefix',
      'buyMoreSuffix',
      'nextPriceBreak',
      'moreToNextBreak',
      'bestTierReached',
      'moreToMoq',
      'noMorePriceBreaks'
    ];

    for(const language of [
      'en',
      'zh',
      'ko'
    ]){
      for(const key of required){
        if(
          !String(
            i18n.ui
              ?.[language]
              ?.[key]||
            ''
          ).trim()
        ){
          fail(
            'Commercial closeout localization is missing: '+
            language+
            '.'+
            key
          );
        }
      }
    }
  }catch(error){
    fail(
      'Commercial localization closeout failed: '+
      error.message
    );
  }

  /*
   * Mobile stability closeout:
   * verify the actual specific PDP typography owner and Inquiry media reuse.
   */
  try{
    const pdpCss=
      read(
        'src/astro/styles/pdp.css'
      );

    const quantityRules=[
      ...pdpCss.matchAll(
        /\[data-pdp-quantity-field\]\s*>\s*\.pdp-quantity\s*>\s*input\s*\{([\s\S]*?)\n\s*\}/gm
      )
    ];

    const sizes=
      quantityRules
        .map(
          match=>
            match[1]
              .match(
                /font-size\s*:\s*(\d+(?:\.\d+)?)px\s*;/
              )
        )
        .filter(Boolean)
        .map(
          match=>
            Number(
              match[1]
            )
        );

    if(
      sizes.length!==1||
      sizes[0]!==16
    ){
      fail(
        'Mobile PDP effective quantity-input typography must resolve to one explicit 16px rule.'
      );
    }

    const inquiryCss=
      read(
        'src/astro/styles/inquiry.css'
      );

    if(
      !/\.inquiry-item__qty input\s*\{[\s\S]*?font-size\s*:\s*16px\s*;/m
        .test(
          inquiryCss
        )
    ){
      fail(
        'Mobile Inquiry quantity input lost the 16px focus-zoom guard.'
      );
    }

    const inquiryRuntime=
      read(
        'src/astro/runtime/inquiry-runtime.js'
      );

    for(const marker of [
      'let preserveMediaOnNextRender=false;',
      'preserveMediaOnNextRender=true;',
      'nextMedia.replaceWith(',
      'preserveMediaOnNextRender=false;'
    ]){
      if(
        !inquiryRuntime.includes(
          marker
        )
      ){
        fail(
          'Inquiry quantity render stability is missing: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'Responsive/mobile commercial closeout failed: '+
      error.message
    );
  }

  /*
   * PDP ↔ Inquiry semantic parity.
   * Same configuration + same effective quantity must resolve identically.
   * Inquiry may intentionally diverge only when its canonical group quantity
   * changes the effective pricing quantity.
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
      '?ec4-pricing='+
      Date.now()
    );

    await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/features/inquiry/runtime-inquiry.js'
        )
      ).href+
      '?ec4-inquiry='+
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
            id:'single',
            type:'product',
            productId:'ADV001',
            series:'advanced',
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

    const item=
      view.items[0];

    const inquiryQuantity=
      inquiry
        .pricingGroupQuantity(
          item
        );

    const pdpSnapshot=
      pricing
        .commercialSnapshot({
          item:{
            series:'advanced',
            size:'S'
          },
          size:'S',
          pack:'礼品包装',
          quantity:76,
          language:'en',
          seriesMeta,
          currencyMap
        });

    const inquirySnapshot=
      pricing
        .commercialSnapshot({
          item,
          size:item.size,
          pack:item.pack,
          quantity:
            inquiryQuantity,
          language:'en',
          seriesMeta,
          currencyMap
        });

    for(const field of [
      'productSeries',
      'pricingSeries',
      'moq',
      'meetsMoq',
      'quantityToMoq',
      'hasVolumeBreaks',
      'isBestAvailableTier'
    ]){
      if(
        pdpSnapshot[field]!==
        inquirySnapshot[field]
      ){
        fail(
          'PDP ↔ Inquiry commercial parity drifted at field: '+
          field
        );
      }
    }

    if(
      pdpSnapshot.currentTier
        ?.rangeLabel!==
      inquirySnapshot.currentTier
        ?.rangeLabel||
      pdpSnapshot.nextTier
        ?.minQty!==
      inquirySnapshot.nextTier
        ?.minQty||
      pdpSnapshot.nextTier
        ?.additionalQty!==
      inquirySnapshot.nextTier
        ?.additionalQty||
      !approx(
        pdpSnapshot.currentTier
          ?.unitBase,
        inquirySnapshot.currentTier
          ?.unitBase
      )||
      !approx(
        item.unitPrice,
        inquirySnapshot.currentTier
          ?.unitBase
      )
    ){
      fail(
        'PDP ↔ Inquiry same-configuration pricing parity failed.'
      );
    }
  }catch(error){
    fail(
      'PDP ↔ Inquiry semantic parity execution failed: '+
      error.message
    );
  }

  /*
   * Production promotion contracts must explicitly protect Commercial UI.
   */
  try{
    const pdpPromotion=
      read(
        'scripts/r4-promote-astro-pdp.mjs'
      );

    for(const marker of [
      "'data-pdp-commercial'",
      "'data-pdp-tier-sheet'",
      "'DreamlandPdpCommercialUi'",
      "'.commercialSnapshot({'"
    ]){
      if(
        !pdpPromotion.includes(
          marker
        )
      ){
        fail(
          'PDP Production promotion is not Commercial-aware: '+
          marker
        );
      }
    }

    const inquiryPromotion=
      read(
        'scripts/r4-promote-astro-inquiry.mjs'
      );

    for(const marker of [
      "'data-inquiry-commercial-summary'",
      "'data-inquiry-commercial-groups'",
      "'DreamlandInquiryCommercialUi'",
      "'.pricingGroupQuantity('"
    ]){
      if(
        !inquiryPromotion.includes(
          marker
        )
      ){
        fail(
          'Inquiry Production promotion is not Commercial-aware: '+
          marker
        );
      }
    }
  }catch(error){
    fail(
      'Commercial Production promotion contract inspection failed: '+
      error.message
    );
  }

  /*
   * Main gate topology.
   */
  try{
    const pkg=
      json(
        'package.json'
      );

    if(
      pkg.scripts
        ?.['r4:commercial:closeout']!==
      'node scripts/validate-r4-11b4-1ec4-commercial-closeout.mjs --source'
    ){
      fail(
        'package.json is missing r4:commercial:closeout.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:commercial:closeout:dist']!==
      'node scripts/validate-r4-11b4-1ec4-commercial-closeout.mjs --dist'
    ){
      fail(
        'package.json is missing r4:commercial:closeout:dist.'
      );
    }

    const validate=
      String(
        pkg.scripts
          ?.validate||
        ''
      );

    const stability=
      validate.indexOf(
        'npm run r4:commercial:quantity-stability'
      );

    const closeout=
      validate.indexOf(
        'npm run r4:commercial:closeout'
      );

    const contact=
      validate.indexOf(
        'npm run r4:astro:contact'
      );

    if(
      stability<0||
      closeout<=stability||
      contact<=closeout
    ){
      fail(
        'Commercial source closeout gate must run after quantity stability and before Contact.'
      );
    }

    const build=
      String(
        pkg.scripts
          ?.build||
        ''
      );

    const success=
      build.indexOf(
        'npm run r4:production:success:validate'
      );

    const distCloseout=
      build.indexOf(
        'npm run r4:commercial:closeout:dist'
      );

    if(
      success<0||
      distCloseout<=success
    ){
      fail(
        'Commercial Production closeout must run after all Production route validations.'
      );
    }
  }catch(error){
    fail(
      'Commercial closeout package topology failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  const isolatedRoot=
    '.r4-astro-dist';

  const productionRoot=
    'dist';

  try{
    const products=
      json(
        'data/products.json'
      )
        .products
        .filter(
          product=>
            product?.status===
            'active'
        );

    if(products.length!==89){
      fail(
        'Commercial Production closeout expected 89 active PDPs; found '+
        products.length+
        '.'
      );
    }

    for(const product of products){
      const id=
        String(
          product?.productId||
          product?.id||
          ''
        )
          .trim()
          .toUpperCase();

      for(const root of [
        isolatedRoot,
        productionRoot
      ]){
        const relative=
          path.join(
            root,
            'products',
            id,
            'index.html'
          );

        const html=
          read(
            relative
          );

        for(const marker of [
          'data-pdp-commercial',
          'data-pdp-commercial-current-tier',
          'data-pdp-commercial-next',
          'data-pdp-tier-sheet',
          'data-pdp-tier-rows'
        ]){
          if(
            !html.includes(
              marker
            )
          ){
            fail(
              root+
              ' PDP '+id+
              ' is missing Commercial marker: '+
              marker
            );
          }
        }
      }
    }
  }catch(error){
    fail(
      'Production PDP Commercial artifact inspection failed: '+
      error.message
    );
  }

  try{
    for(const root of [
      isolatedRoot,
      productionRoot
    ]){
      const inquiry=
        read(
          path.join(
            root,
            'inquiry',
            'index.html'
          )
        );

      for(const marker of [
        'data-inquiry-commercial-summary',
        'data-inquiry-commercial-title',
        'data-inquiry-commercial-rule',
        'data-inquiry-commercial-groups'
      ]){
        if(
          !inquiry.includes(
            marker
          )
        ){
          fail(
            root+
            ' Inquiry is missing Commercial marker: '+
            marker
          );
        }
      }
    }
  }catch(error){
    fail(
      'Production Inquiry Commercial artifact inspection failed: '+
      error.message
    );
  }

  try{
    const runtimeContracts=[
      {
        name:'PDP',
        file:'r4-pdp-runtime.js',
        markers:[
          'R4.11B4.1E-C2',
          'DreamlandPdpCommercialUi',
          '.commercialSnapshot({',
          "'dreamland:pdp-render'"
        ]
      },
      {
        name:'Inquiry',
        file:'r4-inquiry-runtime.js',
        markers:[
          'R4.11B4.1E-C3',
          'DreamlandInquiryCommercialUi',
          '.commercialSnapshot({',
          '.pricingGroupQuantity(',
          "'dreamland:inquiry-render'"
        ]
      }
    ];

    for(const contract of runtimeContracts){
      const isolated=
        buffer(
          path.join(
            isolatedRoot,
            contract.file
          )
        );

      const production=
        buffer(
          path.join(
            productionRoot,
            contract.file
          )
        );

      if(
        isolated.length!==
        production.length||
        hash(isolated)!==
        hash(production)
      ){
        fail(
          contract.name+
          ' Production runtime is not byte-identical to the isolated Astro artifact.'
        );
      }

      const text=
        production.toString(
          'utf8'
        );

      for(const marker of contract.markers){
        if(
          !text.includes(
            marker
          )
        ){
          fail(
            contract.name+
            ' Production runtime lost Commercial marker: '+
            marker
          );
        }
      }
    }
  }catch(error){
    fail(
      'Production Commercial runtime identity proof failed: '+
      error.message
    );
  }

  try{
    const manifest=
      json(
        'dist/multipage-build-manifest.json'
      );

    if(
      manifest.pdpOwner!=='astro'||
      manifest.inquiryOwner!=='astro'
    ){
      fail(
        'Production manifest must retain Astro ownership for PDP + Inquiry at Commercial closeout.'
      );
    }
  }catch(error){
    fail(
      'Production manifest Commercial closeout failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R4.11B4.1E-C4 COMMERCIAL CLOSEOUT: FAIL'
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
  'DREAMLAND B7-00B.4J R4.11B4.1E-C4 COMMERCIAL CLOSEOUT: PASS'
);

if(SOURCE_MODE){
  console.log(
    'Canonical Pricing ownership / PDP↔Inquiry semantic parity / EN-ZH-KO / mobile quantity stability / Production promotion contracts verified.'
  );
}else{
  console.log(
    '89 Production PDPs / Inquiry Commercial shells / byte-identical promoted runtimes / Production Astro ownership verified.'
  );
}

console.log('');

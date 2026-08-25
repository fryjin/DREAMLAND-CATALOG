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

function readJson(relative){
  return JSON.parse(
    read(relative)
  );
}

function compact(value){
  return String(value||'')
    .replace(/\s+/g,'');
}

function unique(values){
  return [
    ...new Set(values)
  ];
}

async function freshImport(
  relative,
  tag
){
  return import(
    pathToFileURL(
      path.join(
        ROOT,
        relative
      )
    ).href+
    `?${tag}=${Date.now()}-${Math.random()}`
  );
}

const EXPECTED_FEATURES=Object.freeze({
  catalog:{
    global:'DreamlandCatalog',
    version:'B6-01',
    owner:
      'src/features/catalog/runtime-catalog.js',
    methods:[
      'configure',
      'snapshot',
      'ready',
      'activeSeries',
      'setActiveSeries',
      'availableSeries',
      'buildViewModel'
    ]
  },
  detail:{
    global:'DreamlandDetail',
    version:'B6-03',
    owner:
      'src/features/detail/runtime-detail.js',
    methods:[
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
    ]
  },
  inquiry:{
    global:'DreamlandInquiry',
    version:'B5-05',
    owner:
      'src/features/inquiry/runtime-inquiry.js',
    methods:[
      'configure',
      'items',
      'snapshot',
      'persist',
      'findItem',
      'addOrMergeProduct',
      'replaceItem',
      'setProductQuantity',
      'removeItem',
      'clearItems',
      'addCustom',
      'buildViewModel',
      'buildProjection'
    ]
  },
  custom:{
    global:'DreamlandCustom',
    version:'B6-05',
    owner:
      'src/features/custom/runtime-custom.js',
    methods:[
      'configure',
      'snapshot',
      'ready',
      'reset',
      'availableSeries',
      'availableScents',
      'selectedSeries',
      'selectedScents',
      'selection',
      'setSeries',
      'toggleScent',
      'validateDraft',
      'buildIntent'
    ]
  },
  contact:{
    global:'DreamlandContact',
    version:'B5-06',
    owner:
      'src/features/contact/runtime-contact.js',
    methods:[
      'configure',
      'snapshot',
      'replace',
      'patch',
      'clear',
      'loadDraft',
      'persistDraft',
      'flushDraft',
      'clearDraft',
      'clearAll',
      'validate'
    ]
  }
});

/*
 * Gate 1 — B6 final architecture metadata.
 */
try{
  const foundation=
    (
      await freshImport(
        'src/app/foundation.js',
        'b6-exit-foundation'
      )
    ).FRONTEND_FOUNDATION;

  const manifest=
    (
      await freshImport(
        'src/features/manifest.js',
        'b6-exit-manifest'
      )
    ).FEATURE_MANIFEST;

  if(
    foundation?.phase!=='B6-06'||
    foundation?.runtimeIntegrated!==true||
    foundation?.runtimeIntegration!=='partial'
  ){
    fail(
      'B6 Exit requires the final B6-06 partial frontend foundation.'
    );
  }

  const enabled=
    manifest.filter(
      feature=>
        feature.runtimeEnabled===true
    );

  const enabledIds=
    enabled
      .map(feature=>feature.id)
      .sort();

  if(
    enabledIds.join(',')!==
      'catalog,contact,custom,detail,inquiry'
  ){
    fail(
      `Unexpected runtime-enabled Feature set: ${enabledIds.join(',')}`
    );
  }

  const owners=
    enabled.map(
      feature=>feature.runtimeOwner
    );

  if(
    unique(owners).length!==
      owners.length
  ){
    fail(
      'Runtime-enabled Features must have unique runtime owners.'
    );
  }

  for(
    const [
      id,
      expected
    ] of Object.entries(
      EXPECTED_FEATURES
    )
  ){
    const feature=
      manifest.find(
        item=>item.id===id
      );

    if(
      feature?.status!=='partial'||
      feature?.runtimeEnabled!==true||
      feature?.runtimeOwner!==
        expected.owner
    ){
      fail(
        `${id} Feature ownership is not in the expected B6 final state.`
      );
    }

    const legacy=
      foundation?.legacyMap
        ?.find(
          item=>item.id===
            (
              id==='custom'
                ? 'custom-request'
                : id
            )
        );

    if(
      !legacy||
      legacy.status!=='partial'||
      legacy.runtimeMigrated!==false||
      !legacy.runtimeOwners
        ?.includes(
          expected.owner
        )
    ){
      fail(
        `${id} Legacy Map ownership is inconsistent with its runtime Feature.`
      );
    }
  }
}catch(error){
  fail(
    `B6 architecture metadata inspection failed: ${error.message}`
  );
}

/*
 * Gate 2 — current product/data baseline.
 */
let products=[];
let seriesData={};
let appConfig={};
let i18n={};
let scents=[];
let contract=null;

try{
  const productsData=
    readJson(
      'data/products.json'
    );

  seriesData=
    readJson(
      'data/series.json'
    );

  appConfig=
    readJson(
      'data/app-config.json'
    );

  i18n=
    readJson(
      'data/i18n.json'
    );

  products=
    Array.isArray(
      productsData.products
    )
      ? productsData.products
      : [];

  if(products.length!==89){
    fail(
      `B6 Exit expected 89 active products, got ${products.length}.`
    );
  }

  const ids=
    products.map(
      product=>product.id
    );

  if(
    unique(ids).length!==
      ids.length
  ){
    fail(
      'data/products.json contains duplicate product IDs.'
    );
  }

  const counts=
    new Map();

  products.forEach(
    product=>{
      counts.set(
        product.series,
        (
          counts.get(
            product.series
          )||0
        )+1
      );

      if(
        product.status!=='active'
      ){
        fail(
          `${product.id} is present in products.json but is not active.`
        );
      }

      for(const lang of [
        'zh',
        'en',
        'ko'
      ]){
        if(
          !String(
            product.names?.[lang]||
            ''
          ).trim()
        ){
          fail(
            `${product.id} is missing names.${lang}.`
          );
        }
      }
    }
  );

  for(
    const [
      seriesId,
      meta
    ] of Object.entries(
      seriesData.series||{}
    )
  ){
    const actual=
      counts.get(
        seriesId
      )||0;

    if(
      Number(meta.count)!==
        actual
    ){
      fail(
        `${seriesId} series metadata count=${meta.count}, products.json count=${actual}.`
      );
    }
  }

  if(
    (
      counts.get(
        'masterpiece'
      )||0
    )!==46
  ){
    fail(
      'B6 Exit expected 46 active Masterpiece products.'
    );
  }

  if(
    Number(
      appConfig.customMoq
    )!==50||
    Number(
      appConfig.maxQuantity
    )<50
  ){
    fail(
      'Custom MOQ / maximum quantity runtime configuration is invalid.'
    );
  }

  for(const lang of [
    'zh',
    'en',
    'ko'
  ]){
    if(
      !i18n.languages
        ?.includes(lang)||
      !i18n.currencyMap?.[lang]||
      !i18n.ui?.[lang]
    ){
      fail(
        `i18n runtime contract is missing ${lang}.`
      );
      continue;
    }

    for(const key of [
      'catalogTitle',
      'detailTitle',
      'inquiryTitle',
      'customTitle',
      'contactTitle',
      'previewTitle',
      'confirmSubmit',
      'successTitle',
      'productEstimate',
      'customInquiry',
      'scentRecommend'
    ]){
      if(
        !String(
          i18n.ui[lang]?.[key]||
          ''
        ).trim()
      ){
        fail(
          `i18n.ui.${lang}.${key} is missing.`
        );
      }
    }
  }

  delete globalThis
    .DreamlandProductDataContract;

  await freshImport(
    'src/data/product-data-contract.js',
    'b6-exit-contract'
  );

  contract=
    globalThis
      .DreamlandProductDataContract;

  if(!contract){
    fail(
      'DreamlandProductDataContract failed to initialize.'
    );
  }else{
    const scentRows=
      contract.parseCsv(
        read(
          'data/scents.csv'
        ),
        {
          strict:true
        }
      );

    scents=
      scentRows
        .filter(
          row=>
            String(
              row.status||''
            )
              .trim()
              .toLowerCase()===
            'active'
        )
        .map(
          row=>({
            id:
              String(
                row.scent_id||''
              ).trim(),
            series:
              String(
                row.series||''
              ).trim(),
            status:'active',
            name:{
              zh:
                String(
                  row.name_zh||''
                ).trim(),
              en:
                String(
                  row.name_en||''
                ).trim(),
              ko:
                String(
                  row.name_ko||''
                ).trim()
            }
          })
        )
        .filter(
          scent=>
            scent.id&&
            scent.series
        );

    if(!scents.length){
      fail(
        'No active scent records were loaded for B6 Exit regression.'
      );
    }
  }
}catch(error){
  fail(
    `B6 data baseline inspection failed: ${error.message}`
  );
}

/*
 * Gate 3 — load all runtime Features and verify APIs/versions.
 */
const runtimeFiles={
  catalog:
    'src/features/catalog/runtime-catalog.js',
  detail:
    'src/features/detail/runtime-detail.js',
  inquiry:
    'src/features/inquiry/runtime-inquiry.js',
  custom:
    'src/features/custom/runtime-custom.js',
  contact:
    'src/features/contact/runtime-contact.js'
};

const runtimes={};

try{
  for(
    const [
      id,
      relative
    ] of Object.entries(
      runtimeFiles
    )
  ){
    const expected=
      EXPECTED_FEATURES[id];

    delete globalThis[
      expected.global
    ];

    await freshImport(
      relative,
      `b6-exit-${id}`
    );

    const runtime=
      globalThis[
        expected.global
      ];

    runtimes[id]=
      runtime;

    if(
      !runtime||
      runtime.version!==
        expected.version
    ){
      fail(
        `${expected.global} version mismatch; expected ${expected.version}.`
      );
      continue;
    }

    for(
      const method of
        expected.methods
    ){
      if(
        typeof runtime[method]!==
          'function'
      ){
        fail(
          `${expected.global}.${method} is missing.`
        );
      }
    }
  }
}catch(error){
  fail(
    `B6 runtime loading failed: ${error.message}`
  );
}

/*
 * Shared adapters used by the integration workflow.
 */
function list(value){
  if(Array.isArray(value)){
    return value
      .map(
        item=>
          String(
            item||''
          ).trim()
      )
      .filter(Boolean);
  }

  return String(
    value||''
  )
    .split(',')
    .map(
      item=>item.trim()
    )
    .filter(Boolean);
}

const seriesMeta=
  seriesData.series||{};

const scentMap=
  new Map(
    scents.map(
      scent=>[
        scent.id,
        scent
      ]
    )
  );

const scentsBySeries=
  new Map();

scents.forEach(
  scent=>{
    if(
      !scentsBySeries.has(
        scent.series
      )
    ){
      scentsBySeries.set(
        scent.series,
        []
      );
    }

    scentsBySeries
      .get(
        scent.series
      )
      .push(
        scent
      );
  }
);

function productScentSeries(
  product
){
  const configured=
    list(
      product?.availableScentSeries
    );

  return configured.length
    ? configured
    : [
        product?.series
      ].filter(Boolean);
}

function availableScents(
  product,
  override=''
){
  const allowed=
    override
      ? [override]
      : productScentSeries(
          product
        );

  return allowed
    .flatMap(
      series=>
        scentsBySeries.get(
          series
        )||[]
    );
}

function packOptions(
  series
){
  const values=
    seriesMeta[series]
      ?.packaging
      ?.options;

  return Array.isArray(values)&&
    values.length
      ? values
      : [
          '批发包装'
        ];
}

function defaultPack(
  series
){
  return (
    seriesMeta[series]
      ?.packaging
      ?.default||
    packOptions(
      series
    )[0]||
    '批发包装'
  );
}

function moqForSeriesSize(
  series,
  size
){
  const value=
    Number(
      seriesMeta[series]
        ?.moqBySize
        ?.[size]
    );

  return (
    Number.isFinite(value)&&
    value>0
  )
    ? value
    : 1;
}

function pricingSeriesFor(
  item
){
  if(
    item?.series==='holiday'
  ){
    return (
      item.scentSeries||
      seriesMeta.holiday
        ?.scentSeriesOptions
        ?.[0]||
      'classic'
    );
  }

  return item?.series||'';
}

function tierUnitCny(
  series,
  size,
  quantity
){
  const tiers=
    seriesMeta[series]
      ?.priceTiers||[];

  const qty=
    Number(quantity)||0;

  const tier=
    tiers.find(
      row=>{
        const min=
          Number(
            row.minQty
          )||0;

        const max=
          row.maxQty==null
            ? Infinity
            : Number(
                row.maxQty
              );

        return (
          qty>=min&&
          qty<=max
        );
      }
    )||
    tiers[
      tiers.length-1
    ]||
    null;

  return Number(
    tier
      ?.pricesCny
      ?.[size]||
    0
  );
}

function packSurchargeCny(
  series,
  pack
){
  return Number(
    seriesMeta[series]
      ?.packaging
      ?.surchargesCny
      ?.[pack]||
    0
  );
}

function maximumQuantity(){
  return Math.max(
    1,
    Number(
      appConfig.maxQuantity
    )||
    1000000
  );
}

function normalizeQuantity(
  value,
  min=1
){
  let quantity=
    Number(value);

  if(
    !Number.isFinite(
      quantity
    )
  ){
    quantity=min;
  }

  quantity=
    Math.trunc(
      quantity
    );

  return Math.min(
    maximumQuantity(),
    Math.max(
      min,
      quantity
    )
  );
}

function cnyToBase(
  value
){
  const rate=
    Number(
      i18n.currencyMap
        ?.zh
        ?.rate
    )||
    7.2;

  return (
    Number(value)||0
  )/rate;
}

function initialScentSeries(
  product
){
  if(
    product?.series===
      'holiday'
  ){
    return (
      seriesMeta.holiday
        ?.scentSeriesOptions
        ?.[0]||
      productScentSeries(
        product
      )[0]||
      ''
    );
  }

  return (
    productScentSeries(
      product
    )[0]||
    product?.series||
    ''
  );
}

/*
 * Gate 4 — actual Catalog → Detail → Inquiry → Custom → Contact → Projection
 * integration using repository data.
 */
try{
  const {
    catalog,
    detail,
    inquiry,
    custom,
    contact
  }=runtimes;

  if(
    catalog&&
    detail&&
    inquiry&&
    custom&&
    contact&&
    products.length
  ){
    catalog.configure({
      products,
      seriesMeta,
      defaultSeries:
        seriesData.defaultSeries
    });

    for(
      const seriesId of
        seriesData.seriesOrder||[]
    ){
      catalog.setActiveSeries(
        seriesId
      );

      const view=
        catalog.buildViewModel();

      const expected=
        Number(
          seriesMeta[seriesId]
            ?.count
        )||0;

      if(
        view.activeSeries!==
          seriesId||
        view.displayCount!==
          expected||
        !Object.isFrozen(view)||
        !Object.isFrozen(
          view.products
        )
      ){
        fail(
          `Catalog integration failed for ${seriesId}.`
        );
      }
    }

    const chosenProduct=
      products.find(
        product=>
          product.series===
            'advanced'
      )||
      products[0];

    detail.configure({
      products,
      sizes:
        Object.keys(
          seriesData.sizes||{}
        ),
      qtyMin:1,
      qtyStep:1,
      defaultProductSize:
        product=>
          product?.defaultSize||
          product?.size||
          'S',
      initialScentSeries,
      patternsForSize:
        size=>
          seriesData
            .patternsBySize
            ?.[size]||
          [],
      scentSeriesOptions:
        product=>
          product?.series===
            'holiday'
            ? (
                seriesMeta.holiday
                  ?.scentSeriesOptions||
                []
              )
            : [],
      availableScents,
      scentById:
        id=>
          scentMap.get(id)||
          null,
      scentDisplayText:
        names=>
          names?.en||
          names?.zh||
          '',
      defaultPack,
      packOptions,
      normalizeQuantity,
      maximumQuantity,
      moqForSeriesSize,
      pricingSeriesFor,
      tierUnitCny,
      packSurchargeCny,
      convertCnyToBase:
        cnyToBase
    });

    let detailView=
      detail.openProduct(
        chosenProduct.id
      );

    if(
      detailView.empty||
      detailView.product?.id!==
        chosenProduct.id||
      !Object.isFrozen(
        detailView
      )
    ){
      fail(
        'Detail could not open an actual Catalog product.'
      );
    }

    const productMoq=
      moqForSeriesSize(
        chosenProduct.series,
        detailView.config.size
      );

    detail.setQuantity(
      productMoq
    );

    detailView=
      detail.buildViewModel();

    if(
      detailView.pricing.moq!==
        productMoq||
      detailView.pricing
        .unitPrice<=0
    ){
      fail(
        'Detail pricing/MOQ derivation failed on repository data.'
      );
    }

    const memory=
      new Map();

    const storage={
      getItem(key){
        return memory.has(key)
          ? memory.get(key)
          : null;
      },
      setItem(
        key,
        value
      ){
        memory.set(
          key,
          String(value)
        );
      },
      removeItem(key){
        memory.delete(key);
      }
    };

    inquiry.configure({
      storage,
      storageKey:
        'b6ExitInquiry',
      version:2,
      normalizeQuantity,
      pricingSeriesFor,
      tierUnitCny,
      packSurchargeCny,
      convertCnyToBase:
        cnyToBase,
      projectionText:
        key=>
          i18n.ui
            ?.en
            ?.[key]||
          key,
      projectionProductDisplayName:
        item=>
          item?.names?.en||
          item?.name||
          item?.productId||
          item?.id||
          '',
      projectionSeriesLabel:
        series=>
          seriesMeta[series]
            ?.labels
            ?.en||
          series,
      projectionChoiceLabel:
        value=>
          String(
            value||''
          ),
      projectionQtyUnit:
        ()=>'pcs',
      projectionItemMoq:
        item=>
          moqForSeriesSize(
            item?.series,
            item?.size
          ),
      projectionItemScentLabel:
        item=>{
          if(
            item?.type===
              'custom'
          ){
            return (
              (
                Array.isArray(
                  item.scents
                )
                  ? item.scents
                      .filter(Boolean)
                      .join(' / ')
                  : ''
              )||
              item?.scent||
              i18n.ui.en
                ?.scentRecommend||
              'Scent pending'
            );
          }

          return (
            item?.scent||
            i18n.ui.en
              ?.scentRecommend||
            'Scent pending'
          );
        },
      projectionDefaultPack:
        defaultPack,
      projectionMoney:
        value=>
          `USD ${Number(value||0).toFixed(2)}`
    });

    const productItem={
      id:'B6-EXIT-P1',
      type:'product',
      productId:
        detailView.product.id,
      name:
        detailView.product.name,
      names:
        detailView.product.names,
      series:
        detailView.product.series,
      size:
        detailView.config.size,
      scentId:
        detailView.config.scentId,
      scent:
        detailView.config.scent,
      scentSeries:
        detailView.config.scentSeries,
      pattern:
        detailView.config.pattern,
      pack:
        detailView.config.pack,
      qty:
        productMoq
    };

    inquiry.addOrMergeProduct(
      productItem
    );

    inquiry.addOrMergeProduct({
      ...productItem,
      id:'B6-EXIT-P2',
      qty:productMoq
    });

    if(
      inquiry.items().length!==1||
      Number(
        inquiry.items()[0]
          ?.qty
      )!==
        productMoq*2
    ){
      fail(
        'Detail → Inquiry product merge round-trip failed.'
      );
    }

    const roundTrip=
      detail.openItem(
        inquiry.items()[0]
      );

    if(
      !roundTrip||
      roundTrip.product?.id!==
        chosenProduct.id||
      roundTrip.config.size!==
        productItem.size
    ){
      fail(
        'Inquiry → Detail edit round-trip failed.'
      );
    }

    custom.configure({
      scentsBySeries,
      seriesOrder:[
        'classic',
        'advanced',
        'masterpiece'
      ],
      defaultSeries:
        'classic',
      customMoq:
        ()=>
          Number(
            appConfig.customMoq
          )||50,
      maximumQuantity
    });

    const customSeries=
      custom.availableSeries()[0];

    const customScent=
      custom.availableScents(
        customSeries
      )[0];

    if(
      !customSeries||
      !customScent||
      custom.setSeries(
        customSeries
      )!==true||
      custom.toggleScent(
        customScent.id
      )!==true
    ){
      fail(
        'Custom actual scent selection integration failed.'
      );
    }

    const customIntent=
      custom.buildIntent(
        {
          use:
            'Brand event',
          qty:
            Number(
              appConfig.customMoq
            )||50,
          budget:
            'To be confirmed',
          date:
            '30 days',
          sizePref:
            'Recommend',
          color:
            'Brand colors',
          pack:
            'Gift box',
          branding:
            'Logo',
          note:
            'B6 exit regression'
        },
        {
          id:
            'B6-EXIT-CUSTOM'
        }
      );

    if(
      !customIntent||
      customIntent.type!==
        'custom'||
      !customIntent.scentIds
        ?.includes(
          customScent.id
        )
    ){
      fail(
        'Custom intent construction failed in the integrated flow.'
      );
    }else{
      inquiry.addCustom(
        customIntent
      );
    }

    const contactStorage=
      new Map();

    const contactStore={
      getItem(key){
        return contactStorage.has(key)
          ? contactStorage.get(key)
          : null;
      },
      setItem(
        key,
        value
      ){
        contactStorage.set(
          key,
          String(value)
        );
      },
      removeItem(key){
        contactStorage.delete(key);
      }
    };

    contact.configure({
      storage:
        contactStore,
      storageKey:
        'b6ExitContact',
      ttlMs:
        60*60*1000,
      now:
        ()=>1000000
    });

    const contactInput={
      name:'B6 Tester',
      company:'Dreamland',
      country:'Singapore',
      city:'Singapore',
      email:
        'b6@example.com',
      phone:
        '+65 8000 0000',
      buyerType:
        'Brand',
      message:
        'Regression'
    };

    const contactValidation=
      contact.validate(
        contactInput
      );

    if(
      !contactValidation.valid
    ){
      fail(
        'Contact validation failed in the integrated flow.'
      );
    }

    contact.persistDraft(
      contactInput
    );

    contact.clear();

    const restored=
      contact.loadDraft();

    if(
      restored.name!==
        contactInput.name||
      restored.email!==
        contactInput.email
    ){
      fail(
        'Contact draft persistence/restore failed.'
      );
    }

    const projection=
      inquiry.buildProjection({
        contact:
          contact.snapshot(),
        inquiryId:
          'B6-EXIT-001',
        submittedAt:
          '2026-08-25T00:00:00.000Z',
        language:'en',
        privacyVersion:
          appConfig
            .privacyVersion||
          ''
      });

    if(
      projection.itemCount!==2||
      projection.productCount!==1||
      projection.customCount!==1||
      projection.estimatedTotal<=0
    ){
      fail(
        'Integrated Inquiry projection count/pricing failed.'
      );
    }

    const customProjection=
      projection.customs[0];

    if(
      !customProjection||
      customProjection.previewValue
        .includes(
          '||ui('
        )||
      customProjection.summaryText
        .includes(
          '||ui('
        )||
      !customProjection.previewValue
        .includes(
          customIntent.scents[0]
        )
    ){
      fail(
        'Custom projection still exposes a legacy scent fallback token.'
      );
    }

    const expectedSummary=
      projection.products[0]
        .summaryText+
      '\n'+
      projection.customs[0]
        .summaryText;

    if(
      projection.itemsSummary!==
        expectedSummary
    ){
      fail(
        'Inquiry itemsSummary must delimit product/custom summaries with a newline.'
      );
    }

    if(
      projection.contact.name!==
        contactInput.name||
      !Object.isFrozen(
        projection
      )||
      !Object.isFrozen(
        projection.items
      )
    ){
      fail(
        'Projection contact/frozen snapshot contract failed.'
      );
    }

    inquiry.persist();

    if(
      !memory.has(
        'b6ExitInquiry'
      )
    ){
      fail(
        'Inquiry persistence failed in the integrated flow.'
      );
    }
  }
}catch(error){
  fail(
    `B6 integrated Feature workflow failed: ${error.message}`
  );
}

/*
 * Gate 5 — App lifecycle and removed compatibility output.
 */
try{
  const index=
    read(
      'index.html'
    );

  const resetStart=
    index.indexOf(
      'function resetSubmittedFormUi(){'
    );

  const resetEnd=
    index.indexOf(
      'function handleSubmissionGate(',
      resetStart
    );

  const resetSlice=
    (
      resetStart>=0&&
      resetEnd>resetStart
    )
      ? index.slice(
          resetStart,
          resetEnd
        )
      : '';

  if(
    !resetSlice.includes(
      'customScentUi.reset();'
    )
  ){
    fail(
      'Successful submission must reset the Custom multi-scent UI/state.'
    );
  }

  for(const forbidden of [
    'syncDetailLegacyState(',
    'state.items',
    'let activeProduct=',
    'let config='
  ]){
    if(
      compact(index).includes(
        compact(forbidden)
      )
    ){
      fail(
        `B6 Exit found retired App compatibility state: ${forbidden}`
      );
    }
  }

  for(const script of [
    './src/features/catalog/runtime-catalog.js',
    './src/features/detail/runtime-detail.js',
    './src/features/inquiry/runtime-inquiry.js',
    './src/features/custom/runtime-custom.js',
    './src/features/contact/runtime-contact.js',
    './src/ui/catalog/runtime-catalog-renderer.js',
    './src/ui/detail/runtime-detail-renderer.js',
    './src/ui/inquiry/runtime-inquiry-renderer.js'
  ]){
    const escaped=
      script.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

    const matches=
      index.match(
        new RegExp(
          `<script\\s+src=["']${escaped}["']><\\/script>`,
          'g'
        )
      )||[];

    if(matches.length!==1){
      fail(
        `index.html must load ${script} exactly once; found ${matches.length}.`
      );
    }
  }
}catch(error){
  fail(
    `B6 App lifecycle inspection failed: ${error.message}`
  );
}

/*
 * Gate 6 — Projection cleanup and historical-validator release.
 */
try{
  const inquirySource=
    read(
      'src/features/inquiry/runtime-inquiry.js'
    );

  if(
    inquirySource.includes(
      'legacyScentSuffix'
    )||
    inquirySource.includes(
      "||ui('scentRecommend')"
    )
  ){
    fail(
      'Inquiry runtime still contains the legacy Custom scent fallback token.'
    );
  }

  if(
    !inquirySource.includes(
      ".join('\\n')"
    )
  ){
    fail(
      'Inquiry projection itemsSummary is missing the B6 Exit newline delimiter.'
    );
  }

  const projectionValidator=
    read(
      'scripts/validate-inquiry-projection-boundary.mjs'
    );

  if(
    projectionValidator.includes(
      'preserve legacy B5-04 output parity'
    )||
    projectionValidator.includes(
      "scent:花香调||ui('scentRecommend')"
    )
  ){
    fail(
      'Historical Inquiry Projection validator still locks the legacy Custom scent output.'
    );
  }

  const compatibilityValidator=
    read(
      'scripts/validate-shared-compatibility-cleanup.mjs'
    );

  if(
    compatibilityValidator.includes(
      'dreamland-pwa-v84'
    )
  ){
    fail(
      'Historical B6-06 validator still owns the fixed v84 PWA cache version.'
    );
  }
}catch(error){
  fail(
    `B6 Projection/history inspection failed: ${error.message}`
  );
}

/*
 * Gate 7 — package chain and final PWA cache.
 */
try{
  const packageJson=
    readJson(
      'package.json'
    );

  if(
    packageJson.scripts
      ?.['b6:exit']!==
      'node scripts/validate-b6-exit-regression.mjs'
  ){
    fail(
      'package.json is missing the b6:exit regression command.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  const requiredStages=[
    'npm run catalog-state:boundary',
    'npm run catalog-ui:boundary',
    'npm run detail-state:boundary',
    'npm run detail-ui:boundary',
    'npm run product-data:alignment',
    'npm run custom-request:boundary',
    'npm run compatibility:cleanup',
    'npm run b6:exit'
  ];

  for(
    const stage of
      requiredStages
  ){
    if(
      !validate.includes(
        stage
      )
    ){
      fail(
        `npm run validate is missing ${stage}.`
      );
    }
  }

  if(
    !validate.trim()
      .endsWith(
        'npm run b6:exit'
      )
  ){
    fail(
      'b6:exit must remain the final npm run validate gate.'
    );
  }

  const sw=
    read(
      'sw.js'
    );

  if(
    !sw.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v85';"
    )
  ){
    fail(
      'B6 Exit runtime fixes require dreamland-pwa-v85.'
    );
  }

  const appShellStart=
    sw.indexOf(
      'const APP_SHELL = ['
    );

  const appShellEnd=
    sw.indexOf(
      '];',
      appShellStart
    );

  if(
    appShellStart<0||
    appShellEnd<=appShellStart
  ){
    fail(
      'sw.js APP_SHELL block could not be isolated.'
    );
  }else{
    const appShell=
      sw.slice(
        appShellStart,
        appShellEnd+2
      );

    for(const entry of [
      './index.html',
      './src/features/inquiry/runtime-inquiry.js',
      './src/features/custom/runtime-custom.js',
      './custom-scent-multi.js'
    ]){
      const escaped=
        entry.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

      const matches=
        appShell.match(
          new RegExp(
            `'${escaped}'`,
            'g'
          )
        )||[];

      if(matches.length!==1){
        fail(
          `sw.js APP_SHELL must include ${entry} exactly once; found ${matches.length} inside APP_SHELL.`
        );
      }
    }
  }
}catch(error){
  fail(
    `B6 package/PWA inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nB6 Exit Regression validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'B6 Exit Regression validation: PASS'
);

console.log(
  'B6 final baseline: 89 active products / 46 Masterpiece / Catalog→Detail→Inquiry→Custom→Contact→Projection PASS / PWA v85.'
);

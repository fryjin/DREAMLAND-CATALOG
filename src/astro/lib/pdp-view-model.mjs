function text(value){
  return String(
    value??
    ''
  ).trim();
}

function webPath(value){
  const source=
    text(value);

  if(!source){
    return '';
  }

  if(
    source.startsWith('/')||
    source.startsWith('http://')||
    source.startsWith('https://')
  ){
    return source;
  }

  return '/'+
    source.replace(
      /^\.\//,
      ''
    );
}

function productId(product){
  return text(
    product?.productId||
    product?.id
  )
    .toUpperCase();
}

function localizedTags(
  product,
  language
){
  const tags=
    product?.tags||
    {};

  const values=
    tags?.[language]||
    tags?.en||
    tags?.zh||
    [];

  return Array.isArray(values)
    ? values
        .map(text)
        .filter(Boolean)
    : [];
}

function seriesLabel(
  product,
  language,
  seriesMeta={}
){
  const key=
    text(
      product?.series
    );

  return (
    seriesMeta?.[key]
      ?.labels?.[language]||
    seriesMeta?.[key]
      ?.labels?.en||
    seriesMeta?.[key]
      ?.labels?.zh||
    key
  );
}

function availableSizes(
  product,
  seriesDocument={}
){
  const values=
    Array.isArray(
      product?.availableSizes
    )&&
    product.availableSizes.length
      ? product.availableSizes
      : [
          product?.defaultSize||
          product?.size
        ];

  return [
    ...new Set(
      values
        .map(
          value=>
            text(value)
              .toUpperCase()
        )
        .filter(Boolean)
    )
  ]
    .map(size=>
      Object.freeze({
        size,
        dimension:
          text(
            seriesDocument
              ?.sizes?.[size]
          )
      })
    );
}

function productGallery(product){
  const ordered=[
    product?.cover_image,
    product?.angle_image,
    product?.detail_image,
    product?.size_s_image,
    product?.size_m_image,
    product?.size_l_image,
    product?.size_xl_image,
    product?.packaging_image,
    product?.scene_image_1,
    product?.scene_image_2,
    product?.scene_image_3,
    product?.scene_image_4
  ]
    .map(webPath)
    .filter(Boolean);

  return [
    ...new Set(ordered)
  ]
    .slice(0,10)
    .map(
      (
        src,
        index
      )=>
        Object.freeze({
          src,
          primary:
            index===0,
          loading:
            index===0
              ? 'eager'
              : 'lazy',
          priority:
            index===0
              ? 'high'
              : 'auto'
        })
    );
}

function fromLabel(
  language,
  ui={}
){
  return (
    ui?.[language]
      ?.priceFrom||
    (
      language==='en'
        ? 'From'
        : language==='ko'
          ? '부터'
          : '起'
    )
  );
}

function detailCopy(
  localized={}
){
  return Object.freeze({
    ...(
      localized.detail||
      {}
    )
  });
}

function compactContent(
  localized={}
){
  return Object.freeze({
    navigation:Object.freeze({
      ...(
        localized.navigation||
        {}
      )
    }),
    footer:Object.freeze({
      ...(
        localized.footer||
        {}
      )
    }),
    detail:Object.freeze({
      ...(
        localized.detail||
        {}
      )
    })
  });
}

function compactUi(
  ui={}
){
  const keys=[
    'detailTitle',
    'detailSub',
    'addInquiry',
    'addedInquiry',
    'size',
    'scent',
    'scentSeries',
    'scentSeriesHint',
    'pattern',
    'pack',
    'quantity',
    'currentUnitPrice',
    'currentSizeMoq',
    'submitMoqCheck',
    'moq',
    'moqHint',
    'minQtyError',
    'quantityTooLarge',
    'pieces',
    'switched',
    'custom',
    'inquiry',
    'viewTierPrice',
    'tierUnavailable'
  ];

  return Object.freeze(
    Object.fromEntries(
      keys.map(
        key=>[
          key,
          text(
            ui?.[key]
          )
        ]
      )
    )
  );
}

function runtimeProduct(product){
  return Object.freeze({
    id:
      productId(
        product
      ),
    productId:
      productId(
        product
      ),
    series:
      text(
        product?.series
      ),
    status:'active',
    name:
      text(
        product?.name
      ),
    names:Object.freeze({
      ...(
        product?.names||
        {}
      )
    }),
    descriptions:Object.freeze({
      ...(
        product?.descriptions||
        {}
      )
    }),
    color:
      text(
        product?.color
      ),
    colorCode:
      text(
        product?.colorCode
      ),
    cover:
      webPath(
        product?.cover_image
      ),
    defaultSize:
      text(
        product?.defaultSize||
        product?.size
      )
        .toUpperCase(),
    size:
      text(
        product?.defaultSize||
        product?.size
      )
        .toUpperCase(),
    availableSizes:Object.freeze(
      (
        Array.isArray(
          product?.availableSizes
        )
          ? product.availableSizes
          : []
      )
        .map(
          value=>
            text(value)
              .toUpperCase()
        )
        .filter(Boolean)
    ),
    availableScentSeries:Object.freeze(
      (
        Array.isArray(
          product?.availableScentSeries
        )
          ? product.availableScentSeries
          : [
              product?.series
            ]
      )
        .map(text)
        .filter(Boolean)
    ),
    sizeImages:Object.freeze({
      S:webPath(product?.size_s_image),
      M:webPath(product?.size_m_image),
      L:webPath(product?.size_l_image),
      XL:webPath(product?.size_xl_image)
    })
  });
}

export function mapPdpScents(
  records=[]
){
  return Object.freeze(
    records
      .map(row=>
        Object.freeze({
          id:
            text(
              row?.scent_id
            ),
          series:
            text(
              row?.series
            ),
          status:
            text(
              row?.status
            )
              .toLowerCase(),
          sortOrder:
            Number(
              row?.sort_order
            )||
            999,
          name:Object.freeze({
            zh:
              text(
                row?.name_zh
              ),
            en:
              text(
                row?.name_en
              ),
            ko:
              text(
                row?.name_ko
              )
          }),
          notes:Object.freeze({
            top:Object.freeze({
              zh:text(row?.top_zh),
              en:text(row?.top_en),
              ko:text(row?.top_ko)
            }),
            heart:Object.freeze({
              zh:text(row?.heart_zh),
              en:text(row?.heart_en),
              ko:text(row?.heart_ko)
            }),
            base:Object.freeze({
              zh:text(row?.base_zh),
              en:text(row?.base_en),
              ko:text(row?.base_ko)
            })
          }),
          fragranceRatio:
            text(
              row?.fragrance_ratio
            )
        })
      )
      .filter(
        scent=>
          scent.id&&
          scent.status===
            'active'
      )
      .sort(
        (
          a,
          b
        )=>
          a.series===
          b.series
            ? (
                a.sortOrder-
                b.sortOrder
              )
            : a.series.localeCompare(
                b.series
              )
      )
  );
}

export function buildPdpViewModel({
  language='en',
  product,
  seriesDocument={},
  siteContent={},
  ui={},
  currencyMap={},
  pricingPolicy,
  localizationPolicy
}={}){
  if(
    !product||
    !pricingPolicy||
    !localizationPolicy
  ){
    throw new Error(
      'PDP ViewModel requires one product plus canonical Pricing and Localization policies.'
    );
  }

  const seriesMeta=
    seriesDocument.series||
    {};

  const localized=
    localizationPolicy
      .localizedContent(
        language,
        siteContent
      );

  const copy=
    detailCopy(
      localized
    );

  const id=
    productId(
      product
    );

  const defaultSize=
    text(
      pricingPolicy
        .defaultProductSize(
          product
        )
    )
      .toUpperCase();

  const moq=
    pricingPolicy
      .moqForSeriesSize(
        product.series,
        defaultSize,
        seriesMeta
      );

  const priceValue=
    pricingPolicy
      .catalogUnit(
        product,
        seriesMeta,
        currencyMap
      );

  const money=
    pricingPolicy
      .money(
        priceValue,
        language,
        currencyMap
      );

  const price=
    localizationPolicy
      .fromPrice(
        language,
        fromLabel(
          language,
          ui
        ),
        money
      );

  const gallery=
    productGallery(
      product
    );

  if(!gallery.length){
    throw new Error(
      'PDP product has no presentation image: '+
      id
    );
  }

  return Object.freeze({
    language,
    id,
    name:
      localizationPolicy
        .productName(
          language,
          product
        ),
    description:
      localizationPolicy
        .productDescription(
          language,
          product
        ),
    series:
      text(
        product.series
      ),
    seriesLabel:
      seriesLabel(
        product,
        language,
        seriesMeta
      ),
    colorCode:
      text(
        product?.colorCode
      ),
    defaultSize,
    sizes:Object.freeze(
      availableSizes(
        product,
        seriesDocument
      )
    ),
    moq:
      Math.max(
        1,
        Number(moq)||
        1
      ),
    price,
    tags:Object.freeze(
      localizedTags(
        product,
        language
      )
    ),
    gallery:Object.freeze(
      gallery
    ),
    copy,
    content:localized,
    routes:Object.freeze({
      collection:'/products/',
      custom:'/custom/',
      inquiry:'/inquiry/'
    })
  });
}

export function buildPdpRuntimeState({
  product,
  languages=[
    'en',
    'zh',
    'ko'
  ],
  defaultLanguage='en',
  seriesDocument={},
  siteContent={},
  ui={},
  currencyMap={},
  scents=[],
  pricingPolicy,
  localizationPolicy
}={}){
  if(
    !product||
    !pricingPolicy||
    !localizationPolicy
  ){
    throw new Error(
      'PDP Runtime State requires one product plus canonical Pricing and Localization policies.'
    );
  }

  const runtime=
    runtimeProduct(
      product
    );

  const allowedSeries=
    new Set(
      runtime
        .availableScentSeries
        .length
          ? runtime
              .availableScentSeries
          : [
              runtime.series
            ]
    );

  const runtimeScents=
    scents
      .filter(
        scent=>
          allowedSeries.has(
            scent.series
          )
      );

  const languageViews=
    Object.freeze(
      Object.fromEntries(
        languages.map(language=>{
          const localized=
            localizationPolicy
              .localizedContent(
                language,
                siteContent
              );

          return [
            language,
            Object.freeze({
              content:
                compactContent(
                  localized
                ),
              ui:
                compactUi(
                  ui?.[language]||
                  {}
                ),
              name:
                localizationPolicy
                  .productName(
                    language,
                    product
                  ),
              description:
                localizationPolicy
                  .productDescription(
                    language,
                    product
                  ),
              seriesLabel:
                seriesLabel(
                  product,
                  language,
                  seriesDocument.series||
                  {}
                )
            })
          ];
        })
      )
    );

  return Object.freeze({
    version:'R4.5B',
    defaultLanguage,
    storage:Object.freeze({
      languageKey:
        'productManualLang',
      inquiryKey:
        'productManualV2State',
      inquiryVersion:2
    }),
    quantity:Object.freeze({
      min:1,
      step:1,
      max:1000000
    }),
    product:runtime,
    sizes:Object.freeze({
      ...(
        seriesDocument.sizes||
        {}
      )
    }),
    patternsBySize:Object.freeze({
      ...(
        seriesDocument.patternsBySize||
        {}
      )
    }),
    seriesMeta:Object.freeze({
      ...(
        seriesDocument.series||
        {}
      )
    }),
    currencies:Object.freeze({
      ...currencyMap
    }),
    scents:Object.freeze(
      runtimeScents
    ),
    languages:
      languageViews
  });
}

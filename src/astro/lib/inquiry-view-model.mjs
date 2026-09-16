function text(value){
  return String(
    value??
    ''
  ).trim();
}

function rootAsset(value){
  const raw=
    text(value);

  if(!raw){
    return '';
  }

  if(raw.startsWith('./')){
    return '/'+
      raw.slice(2);
  }

  return raw.startsWith('/')
    ? raw
    : '/'+raw;
}

function compactContent(localized={}){
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
    })
  });
}

function choiceMap(custom={}){
  const map={};

  for(const key of [
    'useCases',
    'sizes',
    'packages',
    'brandingOptions'
  ]){
    const rows=
      Array.isArray(
        custom?.[key]
      )
        ? custom[key]
        : [];

    for(const row of rows){
      const value=
        text(
          row?.value
        );

      if(value){
        map[value]=
          text(
            row?.label||
            row?.value
          );
      }
    }
  }

  return Object.freeze(
    map
  );
}


function compactInquiryCopy(copy={}){
  const keys=[
    'progressLabel',
    'stepSelection',
    'stepContact',
    'stepReview',
    'kicker',
    'title',
    'body',
    'selectedProducts',
    'selectedItems',
    'totalQuantity',
    'summaryKicker',
    'summaryTitle',
    'productEstimate',
    'customProject',
    'customQuotedSeparately',
    'finalPricingNote',
    'continueContact',
    'continueExploring',
    'exploreCollection',
    'startCustom',
    'emptyTitle',
    'emptyBody',
    'size',
    'scent',
    'pattern',
    'packaging',
    'quantity',
    'moq',
    'pricing',
    'useCase',
    'fragranceCollection',
    'scents',
    'branding',
    'remove',
    'removeTitle',
    'removeBody',
    'clearAll',
    'clearBody',
    'clearConfirm',
    'cannotContinue'
  ];

  return Object.freeze(
    Object.fromEntries(
      keys.map(
        key=>[
          key,
          text(
            copy?.[key]
          )
        ]
      )
    )
  );
}

function compactUi(ui={}){
  const keys=[
    'pieces',
    'items',
    'moq',
    'currentUnitPrice',
    'amountEstimate',
    'toConfirm',
    'quotePending',
    'customInquiry',
    'removedInquiry',
    'clearedInquiry',
    'minQtyError',
    'quantityTooLarge'
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

export function mapInquiryScents(records=[]){
  return Object.freeze(
    records
      .map(
        row=>Object.freeze({
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
          })
        })
      )
      .filter(
        scent=>
          scent.id&&
          scent.status===
            'active'
      )
  );
}

export function buildInquiryStaticView({
  language='en',
  siteContent={},
  localizationPolicy,
  inquiryFeature
}={}){
  if(
    !localizationPolicy||
    !inquiryFeature
  ){
    throw new Error(
      'Inquiry Static View requires canonical Localization and Inquiry owners.'
    );
  }

  const localized=
    localizationPolicy
      .localizedContent(
        language,
        siteContent
      );

  const copy=
    localized.inquiryFlow||
    {};

  inquiryFeature.configure({
    storage:null,
    storageKey:
      'productManualV2State',
    version:2
  });

  const canonical=
    inquiryFeature
      .buildViewModel();

  if(
    !canonical?.empty||
    canonical.summary?.itemCount!==0||
    canonical.summary?.productCount!==0||
    canonical.summary?.customCount!==0||
    canonical.summary?.productQuantity!==0
  ){
    throw new Error(
      'R4.7B requires the canonical build-time Inquiry owner to preserve its honest empty fallback.'
    );
  }

  return Object.freeze({
    language,
    content:localized,
    copy:Object.freeze({
      ...copy
    }),
    empty:
      canonical.empty,
    summary:Object.freeze({
      itemCount:
        Number(
          canonical.summary
            ?.itemCount
        )||
        0,
      productCount:
        Number(
          canonical.summary
            ?.productCount
        )||
        0,
      customCount:
        Number(
          canonical.summary
            ?.customCount
        )||
        0,
      productQuantity:
        Number(
          canonical.summary
            ?.productQuantity
        )||
        0
    }),
    routes:Object.freeze({
      collection:'/products/',
      custom:'/custom/',
      contact:'/inquiry/contact/'
    })
  });
}

export function buildInquiryRuntimeState({
  languages=[
    'en',
    'zh',
    'ko'
  ],
  defaultLanguage='en',
  siteContent={},
  i18n={},
  productsDocument={},
  seriesDocument={},
  scents=[],
  appConfig={},
  localizationPolicy
}={}){
  if(!localizationPolicy){
    throw new Error(
      'Inquiry Runtime State requires canonical Localization ownership.'
    );
  }

  const supported=
    languages.filter(
      language=>
        [
          'en',
          'zh',
          'ko'
        ].includes(
          language
        )
    );

  const localeViews=
    Object.freeze(
      Object.fromEntries(
        supported.map(
          language=>{
            const localized=
              localizationPolicy
                .localizedContent(
                  language,
                  siteContent
                );

            const custom=
              localized.customProject||
              {};

            return [
              language,
              Object.freeze({
                content:
                  compactContent(
                    localized
                  ),
                copy:
                  compactInquiryCopy(
                    localized.inquiryFlow||
                    {}
                  ),
                ui:
                  compactUi(
                    i18n.ui
                      ?.[language]||
                    {}
                  ),
                choices:
                  choiceMap(
                    custom
                  )
              })
            ];
          }
        )
      )
    );

  const products=
    Object.freeze(
      (
        productsDocument.products||
        []
      )
        .filter(
          product=>
            product?.status===
            'active'
        )
        .map(
          product=>Object.freeze({
            id:
              text(
                product.productId||
                product.id
              )
                .toUpperCase(),
            series:
              text(
                product.series
              ),
            names:Object.freeze({
              zh:
                text(
                  product.names?.zh||
                  product.name
                ),
              en:
                text(
                  product.names?.en||
                  product.names?.zh||
                  product.name
                ),
              ko:
                text(
                  product.names?.ko||
                  product.names?.zh||
                  product.name
                )
            }),
            cover:
              rootAsset(
                product.cover_image
              )
          })
        )
    );

  const seriesMeta=
    Object.freeze(
      Object.fromEntries(
        Object.entries(
          seriesDocument.series||
          {}
        ).map(
          ([key,value])=>[
            key,
            Object.freeze({
              labels:Object.freeze({
                ...(
                  value?.labels||
                  {}
                )
              }),
              moqBySize:Object.freeze({
                ...(
                  value?.moqBySize||
                  {}
                )
              }),
              priceTiers:Object.freeze(
                (
                  value?.priceTiers||
                  []
                ).map(
                  tier=>Object.freeze({
                    minQty:
                      Number(
                        tier?.minQty
                      )||
                      1,
                    maxQty:
                      tier?.maxQty==
                        null
                        ? null
                        : Number(
                            tier.maxQty
                          ),
                    pricesCny:Object.freeze({
                      ...(
                        tier?.pricesCny||
                        {}
                      )
                    })
                  })
                )
              ),
              scentSeriesOptions:
                Object.freeze([
                  ...(
                    value
                      ?.scentSeriesOptions||
                    []
                  )
                ]),
              packaging:Object.freeze({
                default:
                  text(
                    value
                      ?.packaging
                      ?.default
                  ),
                surchargesCny:
                  Object.freeze({
                    ...(
                      value
                        ?.packaging
                        ?.surchargesCny||
                      {}
                    )
                  })
              })
            })
          ]
        )
      )
    );

  const currencyMap=
    Object.freeze(
      Object.fromEntries(
        supported.map(
          language=>{
            const currency=
              i18n.currencyMap
                ?.[language]||
              {};

            return [
              language,
              Object.freeze({
                label:
                  text(
                    currency.label
                  ),
                locale:
                  text(
                    currency.locale
                  ),
                prefix:
                  String(
                    currency.prefix||
                    ''
                  ),
                rate:
                  Number(
                    currency.rate
                  )||
                  1,
                digits:
                  Number.isInteger(
                    Number(
                      currency.digits
                    )
                  )
                    ? Number(
                        currency.digits
                      )
                    : 2,
                unit:
                  text(
                    currency.unit
                  )
              })
            ];
          }
        )
      )
    );

  return Object.freeze({
    version:'R4.7B',
    defaultLanguage,
    storage:Object.freeze({
      languageKey:
        'productManualLang',
      inquiryKey:
        'productManualV2State',
      inquiryVersion:2
    }),
    limits:Object.freeze({
      maxQuantity:
        Number(
          appConfig.maxQuantity
        )||
        1000000
    }),
    routes:Object.freeze({
      collection:'/products/',
      custom:'/custom/',
      contact:'/inquiry/contact/'
    }),
    products,
    scents:Object.freeze([
      ...scents
    ]),
    seriesMeta,
    currencyMap,
    languages:
      localeViews
  });
}

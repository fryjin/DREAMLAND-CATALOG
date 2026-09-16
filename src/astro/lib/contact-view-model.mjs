const FIELD_IDS=Object.freeze([
  'name',
  'company',
  'country',
  'city',
  'email',
  'phone',
  'buyerType',
  'message'
]);

const CONTACT_COPY_KEYS=Object.freeze([
  'progressLabel',
  'stepSelection',
  'stepContact',
  'stepReview',
  'contactKicker',
  'contactTitle',
  'contactBody',
  'contactDetailsKicker',
  'contactDetailsTitle',
  'contactDetailsBody',
  'contactChapterPerson',
  'contactChapterRegion',
  'contactChapterChannels',
  'contactChapterNotes',
  'requiredLabel',
  'optionalLabel',
  'selectBuyerType',
  'contactSnapshotTitle',
  'name',
  'company',
  'country',
  'city',
  'email',
  'phone',
  'buyerType',
  'message',
  'namePlaceholder',
  'companyPlaceholder',
  'countryPlaceholder',
  'cityPlaceholder',
  'emailPlaceholder',
  'phonePlaceholder',
  'messagePlaceholder',
  'backInquiry',
  'reviewInquiry',
  'selectedItems',
  'totalQuantity',
  'summaryKicker',
  'summaryTitle',
  'productEstimate',
  'customProject',
  'customQuotedSeparately',
  'whatNextKicker',
  'whatNextTitle'
]);

function text(value){
  return String(
    value??
    ''
  ).trim();
}

function frozenRows(value){
  return Object.freeze(
    (
      Array.isArray(value)
        ? value
        : []
    ).map(
      row=>Object.freeze({
        ...row
      })
    )
  );
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

function compactContactCopy(copy={}){
  const output=
    Object.fromEntries(
      CONTACT_COPY_KEYS.map(
        key=>[
          key,
          text(
            copy?.[key]
          )
        ]
      )
    );

  output.validation=
    Object.freeze({
      ...(
        copy.validation||
        {}
      )
    });

  output.countryRegions=
    frozenRows(
      copy.countryRegions
    );

  output.buyerTypes=
    frozenRows(
      copy.buyerTypes
    );

  output.whatNextSteps=
    Object.freeze(
      (
        Array.isArray(
          copy.whatNextSteps
        )
          ? copy.whatNextSteps
          : []
      ).map(text)
    );

  return Object.freeze(
    output
  );
}

export function buildContactStaticView({
  language='en',
  siteContent={},
  i18n={},
  localizationPolicy,
  contactFeature,
  inquiryFeature
}={}){
  if(
    !localizationPolicy||
    !contactFeature||
    !inquiryFeature
  ){
    throw new Error(
      'Contact Static View requires canonical Localization, Contact and Inquiry owners.'
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

  contactFeature.configure({
    storage:null,
    storageKey:
      'dreamlandContactDraftV1',
    ttlMs:
      24*60*60*1000,
    fieldIds:
      FIELD_IDS
  });

  const contact=
    contactFeature
      .snapshot();

  for(const field of FIELD_IDS){
    if(
      text(
        contact?.[field]
      )
    ){
      throw new Error(
        'R4.8A requires an honest empty build-time Contact draft: '+
        field
      );
    }
  }

  inquiryFeature.configure({
    storage:null,
    storageKey:
      'productManualV2State',
    version:2
  });

  const inquiry=
    inquiryFeature
      .buildViewModel();

  if(
    !inquiry?.empty||
    inquiry.summary?.itemCount!==0||
    inquiry.summary?.productCount!==0||
    inquiry.summary?.customCount!==0||
    inquiry.summary?.productQuantity!==0
  ){
    throw new Error(
      'R4.8A requires the canonical build-time Inquiry owner to preserve its honest empty fallback.'
    );
  }

  return Object.freeze({
    language,
    content:
      localized,
    copy:Object.freeze({
      ...copy
    }),
    fields:
      FIELD_IDS,
    contact:Object.freeze({
      ...contact
    }),
    summary:Object.freeze({
      itemCount:
        Number(
          inquiry.summary
            ?.itemCount
        )||
        0,
      productCount:
        Number(
          inquiry.summary
            ?.productCount
        )||
        0,
      customCount:
        Number(
          inquiry.summary
            ?.customCount
        )||
        0,
      productQuantity:
        Number(
          inquiry.summary
            ?.productQuantity
        )||
        0,
      estimatedTotal:
        Number(
          inquiry.summary
            ?.estimatedTotal
        )||
        0
    }),
    countryRegions:
      frozenRows(
        copy.countryRegions
      ),
    buyerTypes:
      frozenRows(
        copy.buyerTypes
      ),
    qtyUnit:
      text(
        i18n.ui
          ?.[language]
          ?.pieces
      )||
      'pcs',
    routes:Object.freeze({
      inquiry:
        '/inquiry/',
      review:
        '/inquiry/review/'
    }),
    guard:Object.freeze({
      name:
        'hasInquiry',
      satisfied:
        false
    })
  });
}

export function buildContactRuntimeState({
  languages=[
    'en',
    'zh',
    'ko'
  ],
  defaultLanguage='en',
  siteContent={},
  i18n={},
  seriesDocument={},
  localizationPolicy
}={}){
  if(!localizationPolicy){
    throw new Error(
      'Contact Runtime State requires canonical Localization ownership.'
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

  const locales=
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

            return [
              language,
              Object.freeze({
                content:
                  compactContent(
                    localized
                  ),
                copy:
                  compactContactCopy(
                    localized.inquiryFlow||
                    {}
                  ),
                ui:Object.freeze({
                  pieces:
                    text(
                      i18n.ui
                        ?.[language]
                        ?.pieces
                    )||
                    'pcs'
                })
              })
            ];
          }
        )
      )
    );

  return Object.freeze({
    version:
      'R4.8B',
    languages:
      Object.freeze([
        ...supported
      ]),
    defaultLanguage:
      supported.includes(
        defaultLanguage
      )
        ? defaultLanguage
        : (
            supported[0]||
            'en'
          ),
    storage:Object.freeze({
      languageKey:
        'productManualLang',
      inquiryKey:
        'productManualV2State',
      inquiryVersion:
        2,
      contactKey:
        'dreamlandContactDraftV1',
      contactTtlMs:
        24*60*60*1000,
      contactFieldIds:
        FIELD_IDS
    }),
    routes:Object.freeze({
      inquiry:
        '/inquiry/',
      review:
        '/inquiry/review/'
    }),
    guard:
      'hasInquiry',
    locales,
    seriesMeta:Object.freeze({
      ...(
        seriesDocument.series||
        {}
      )
    }),
    currencyMap:Object.freeze({
      ...(
        i18n.currencyMap||
        {}
      )
    })
  });
}

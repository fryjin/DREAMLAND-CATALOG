import {
  buildInquiryRuntimeState
} from './inquiry-view-model.mjs';

const CONTACT_FIELDS=Object.freeze([
  'name',
  'company',
  'buyerType',
  'country',
  'city',
  'email',
  'phone',
  'message'
]);

const REVIEW_COPY_KEYS=Object.freeze([
  'progressLabel',
  'stepSelection',
  'stepContact',
  'stepReview',
  'reviewKicker',
  'reviewTitle',
  'reviewBody',
  'contactDetailsTitle',
  'name',
  'company',
  'buyerType',
  'country',
  'city',
  'email',
  'phone',
  'message',
  'edit',
  'notProvided',
  'none',
  'selectedProducts',
  'customProject',
  'customQuotedSeparately',
  'summaryKicker',
  'reviewSummaryTitle',
  'summaryTitle',
  'inquiryNumber',
  'productEstimate',
  'beforeSubmitKicker',
  'beforeSubmitTitle',
  'beforeSubmitBody',
  'privacyPrefix',
  'privacyLink',
  'submitInquiry'
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

function compactReviewCopy(copy={}){
  const output=
    Object.fromEntries(
      REVIEW_COPY_KEYS.map(
        key=>[
          key,
          text(
            copy?.[key]
          )
        ]
      )
    );

  output.countryRegions=
    frozenRows(
      copy.countryRegions
    );

  output.buyerTypes=
    frozenRows(
      copy.buyerTypes
    );

  return Object.freeze(
    output
  );
}

export function buildReviewStaticView({
  language='en',
  siteContent={},
  localizationPolicy,
  inquiryFeature,
  contactFeature,
  pageGuards
}={}){
  if(
    !localizationPolicy||
    !inquiryFeature||
    !contactFeature||
    !pageGuards
  ){
    throw new Error(
      'Review Static View requires canonical Localization, Inquiry, Contact and PageGuards owners.'
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

  contactFeature.configure({
    storage:null,
    storageKey:
      'dreamlandContactDraftV1',
    ttlMs:
      24*60*60*1000,
    fieldIds:
      CONTACT_FIELDS
  });

  const inquiry=
    inquiryFeature
      .buildViewModel();

  const contact=
    contactFeature
      .snapshot();

  if(
    !inquiry?.empty||
    inquiry.summary?.itemCount!==0||
    inquiry.summary?.productCount!==0||
    inquiry.summary?.customCount!==0||
    inquiry.summary?.productQuantity!==0||
    inquiry.summary?.estimatedTotal!==0
  ){
    throw new Error(
      'R4.9A requires the canonical build-time Inquiry owner to preserve its honest empty fallback.'
    );
  }

  if(
    CONTACT_FIELDS.some(
      field=>
        text(
          contact?.[field]
        )
    )
  ){
    throw new Error(
      'R4.9A requires an honest empty build-time Contact draft.'
    );
  }

  const guard=
    pageGuards.evaluate(
      'review',
      {
        inquiry:
          inquiryFeature,
        contact:
          contactFeature
      }
    );

  if(
    guard.allowed!==false||
    guard.code!==
      'INQUIRY_REQUIRED'||
    guard.target!==
      '/inquiry/'
  ){
    throw new Error(
      'R4.9A build-time Review guard must honestly reject the empty Inquiry and point back to /inquiry/.'
    );
  }

  return Object.freeze({
    language,
    content:
      localized,
    copy:Object.freeze({
      ...copy
    }),
    contact:Object.freeze({
      ...contact
    }),
    contactFields:
      CONTACT_FIELDS,
    products:
      Object.freeze([]),
    customs:
      Object.freeze([]),
    summary:Object.freeze({
      itemCount:0,
      productCount:0,
      customCount:0,
      productQuantity:0,
      estimatedTotal:0
    }),
    inquiryId:'',
    estimatedTotalDisplay:'',
    guard:Object.freeze({
      name:
        'hasValidContact',
      allowed:
        false,
      code:
        guard.code,
      target:
        guard.target
    }),
    routes:Object.freeze({
      inquiry:
        '/inquiry/',
      contact:
        '/inquiry/contact/',
      success:
        '/inquiry/success/'
    })
  });
}

export function buildReviewRuntimeState({
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
      'Review Runtime State requires canonical Localization ownership.'
    );
  }

  const inquiryRuntime=
    buildInquiryRuntimeState({
      languages,
      defaultLanguage,
      siteContent,
      i18n,
      productsDocument,
      seriesDocument,
      scents,
      appConfig:{
        maxQuantity:
          appConfig.maxQuantity
      },
      localizationPolicy
    });

  const supported=
    Object.keys(
      inquiryRuntime.languages||
      {}
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

            const inquiryLocale=
              inquiryRuntime.languages
                ?.[language]||
              {};

            return [
              language,
              Object.freeze({
                content:
                  inquiryLocale.content,
                ui:Object.freeze({
                  ...(
                    i18n.ui
                      ?.[language]||
                    inquiryLocale.ui||
                    {}
                  )
                }),
                choices:Object.freeze({
                  ...(
                    i18n.choices
                      ?.[language]||
                    inquiryLocale.choices||
                    {}
                  )
                }),
                copy:
                  compactReviewCopy(
                    localized.inquiryFlow||
                    {}
                  )
              })
            ];
          }
        )
      )
    );

  return Object.freeze({
    version:
      'R4.9C',
    defaultLanguage:
      supported.includes(
        defaultLanguage
      )
        ? defaultLanguage
        : (
            supported[0]||
            'en'
          ),
    languages:
      Object.freeze([
        ...supported
      ]),
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
      pendingInquiryKey:
        'dreamlandPendingInquiryIdV1',
      contactFieldIds:
        CONTACT_FIELDS
    }),
    routes:Object.freeze({
      inquiry:
        '/inquiry/',
      contact:
        '/inquiry/contact/'
    }),
    guard:
      'hasValidContact',
    privacyVersion:
      text(
        appConfig.privacyVersion
      ),
    submission:Object.freeze({
      transport:
        text(
          appConfig.submissionTransport
        )||
        'gateway',
      inquiryEndpoint:
        text(
          appConfig.inquiryEndpoint
        )||
        '/api/inquiry',
      clientConfigEndpoint:
        text(
          appConfig.inquiryClientConfigEndpoint
        ),
      riskEndpoint:
        text(
          appConfig.riskEndpoint
        )||
        '/api/risk',
      cooldownMs:
        Number(
          appConfig.submitCooldownMs
        )||
        10000,
      archiveLimit:
        Number(
          appConfig.archiveLimit
        )||
        20,
      riskControl:Object.freeze({
        ...(
          appConfig.riskControl||
          {}
        )
      }),
      hcaptcha:Object.freeze({
        ...(
          appConfig.hcaptcha||
          {}
        )
      }),
      pwa:Object.freeze({
        ...(
          appConfig.pwa||
          {}
        )
      })
    }),
    limits:
      inquiryRuntime.limits,
    products:
      inquiryRuntime.products,
    scents:
      inquiryRuntime.scents,
    seriesMeta:
      inquiryRuntime.seriesMeta,
    currencyMap:
      inquiryRuntime.currencyMap,
    locales
  });
}

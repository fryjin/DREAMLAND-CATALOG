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

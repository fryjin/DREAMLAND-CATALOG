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

function text(value){
  return String(
    value??
    ''
  ).trim();
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

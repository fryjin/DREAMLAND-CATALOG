function text(value){
  return String(
    value??
    ''
  ).trim();
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
      'R4.7A requires the canonical build-time Inquiry owner to resolve an empty state.'
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

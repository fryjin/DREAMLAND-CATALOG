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

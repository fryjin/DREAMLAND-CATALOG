function text(value){
  return String(value??'').trim();
}

function webPath(value){
  const source=text(value);

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

  return '/'+source.replace(/^\.\//,'');
}

function activeProduct(product){
  const status=
    text(product?.status)
      .toLowerCase();

  return (
    !status||
    status==='active'
  );
}

function sortProducts(a,b){
  const order=
    (
      Number(b?.listSort)||
      Number(b?.sortOrder)||
      0
    )-
    (
      Number(a?.listSort)||
      Number(a?.sortOrder)||
      0
    );

  return (
    order||
    text(a?.id)
      .localeCompare(
        text(b?.id)
      )
  );
}

function productsForSeries(
  products,
  series
){
  return products.filter(
    product=>
      product?.series===series
  );
}

function seriesLabel(
  language,
  series,
  seriesMeta={}
){
  return (
    seriesMeta?.[series]
      ?.labels?.[language]||
    seriesMeta?.[series]
      ?.labels?.en||
    seriesMeta?.[series]
      ?.labels?.zh||
    series
  );
}

function productRoute(product){
  const id=
    text(
      product?.productId||
      product?.id
    ).toUpperCase();

  return '/products/'+id+'/';
}

function productMoq(
  product,
  pricingPolicy,
  seriesMeta
){
  const defaultSize=
    pricingPolicy
      .defaultProductSize(
        product
      );

  return pricingPolicy
    .productMoq(
      {
        ...product,
        size:
          product?.size||
          defaultSize
      },
      seriesMeta
    );
}

function productPrice(
  product,
  {
    language,
    pricingPolicy,
    localizationPolicy,
    seriesMeta,
    currencyMap
  }
){
  const unit=
    pricingPolicy
      .catalogUnit(
        product,
        seriesMeta,
        currencyMap
      );

  const money=
    pricingPolicy
      .money(
        unit,
        language,
        currencyMap
      );

  return localizationPolicy
    .fromPrice(
      language,
      language==='en'
        ? 'From'
        : language==='ko'
          ? '부터'
          : '起',
      money
    );
}

export function buildHomeViewModel({
  language='en',
  siteContent={},
  homeAssets={},
  products=[],
  seriesMeta={},
  currencyMap={},
  localizationPolicy,
  pricingPolicy
}={}){
  if(
    !localizationPolicy||
    !pricingPolicy
  ){
    throw new Error(
      'Home ViewModel requires canonical localization and pricing policies.'
    );
  }

  const content=
    localizationPolicy
      .localizedContent(
        language,
        siteContent
      );

  const homeConfig=
    siteContent?.home||
    {};

  const activeProducts=
    (
      Array.isArray(products)
        ? products
        : []
    )
      .filter(activeProduct)
      .slice()
      .sort(sortProducts);

  const collectionOrder=
    (
      Array.isArray(
        homeConfig.collectionOrder
      )&&
      homeConfig.collectionOrder.length
    )
      ? homeConfig.collectionOrder
      : Object.keys(seriesMeta);

  const collections=
    collectionOrder
      .map((series,index)=>{
        const list=
          productsForSeries(
            activeProducts,
            series
          );

        return Object.freeze({
          id:series,
          label:
            seriesLabel(
              language,
              series,
              seriesMeta
            ),
          count:list.length,
          href:
            '/products/?series='+
            encodeURIComponent(series),
          image:
            webPath(
              homeAssets
                ?.collections
                ?.[series]
                ?.image
            ),
          layout:
            index===0||
            index===3
              ? 'wide'
              : 'narrow'
        });
      })
      .filter(
        item=>
          item.count>0
      );

  const featuredSlots=
    Array.isArray(
      homeAssets?.featured
    )
      ? homeAssets.featured
      : [];

  const featuredPlan=[
    ['masterpiece',3],
    ['advanced',2]
  ];

  const used=new Set();
  const featuredProducts=[];

  for(const [
    series,
    limit
  ] of featuredPlan){
    const candidates=
      productsForSeries(
        activeProducts,
        series
      )
        .filter(product=>{
          const id=
            text(
              product?.productId||
              product?.id
            );

          return !used.has(id);
        })
        .slice(0,limit);

    for(const product of candidates){
      const index=
        featuredProducts.length;

      const slot=
        featuredSlots[index]||
        {};

      const id=
        text(
          product?.productId||
          product?.id
        ).toUpperCase();

      used.add(id);

      featuredProducts.push(
        Object.freeze({
          id,
          href:
            productRoute(product),
          name:
            localizationPolicy
              .productName(
                language,
                product
              ),
          series,
          seriesLabel:
            seriesLabel(
              language,
              series,
              seriesMeta
            ),
          image:
            webPath(
              slot?.image
            ),
          layout:
            text(slot?.layout)||
            (
              index<3
                ? 'narrow'
                : 'wide'
            ),
          price:
            productPrice(
              product,
              {
                language,
                pricingPolicy,
                localizationPolicy,
                seriesMeta,
                currencyMap
              }
            ),
          moq:
            Math.max(
              1,
              Number(
                productMoq(
                  product,
                  pricingPolicy,
                  seriesMeta
                )
              )||
              1
            )
        })
      );
    }
  }

  return Object.freeze({
    language,
    content,
    hero:Object.freeze({
      image:
        webPath(
          homeAssets?.hero?.image
        )
    }),
    story:Object.freeze({
      image:
        webPath(
          homeAssets?.story?.image||
          './images/desktop/home/r4-1/brand-story-main.jpg'
        )
    }),
    collections:Object.freeze(
      collections
    ),
    featuredProducts:Object.freeze(
      featuredProducts
    ),
    craft:Object.freeze({
      image:
        webPath(
          homeAssets?.craft?.image
        )
    }),
    custom:Object.freeze({
      image:
        webPath(
          homeAssets?.custom?.image
        )
    }),
    wholesale:Object.freeze({
      image:
        webPath(
          homeAssets?.wholesale?.image
        )
    })
  });
}

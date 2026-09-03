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


function normalizeHomeContent(
  content={}
){
  const navigation=
    content?.navigation||
    {};
  const story=
    content?.story||
    {};
  const collections=
    content?.collections||
    {};
  const featured=
    content?.featured||
    {};
  const craft=
    content?.craft||
    {};
  const custom=
    content?.custom||
    {};
  const wholesale=
    content?.wholesale||
    {};
  const cta=
    content?.cta||
    {};
  const footer=
    content?.footer||
    {};

  return Object.freeze({
    navigation:Object.freeze({
      collection:
        navigation.collection||
        'Collection',
      custom:
        navigation.custom||
        'Custom',
      inquiry:
        navigation.inquiry||
        'Inquiry',
      language:
        navigation.language||
        'Language'
    }),
    story:Object.freeze({
      kicker:
        story.eyebrow||
        story.kicker||
        '',
      title:
        story.title||
        story.mark||
        'meet DREAMLAND',
      body:
        story.body||
        '',
      note:
        story.note||
        ''
    }),
    collections:Object.freeze({
      kicker:
        collections.kicker||
        'THE COLLECTION',
      title:
        collections.title||
        'Four collections',
      body:
        collections.body||
        '',
      designSingular:
        collections.designSingular||
        collections.designPlural||
        'design',
      designPlural:
        collections.designPlural||
        collections.designSingular||
        'designs',
      explore:
        collections.explore||
        'Explore'
    }),
    featured:Object.freeze({
      kicker:
        featured.kicker||
        'CURATED NOW',
      title:
        featured.title||
        'Current Picks',
      body:
        featured.body||
        '',
      viewAll:
        featured.viewAll||
        'View all',
      viewDetails:
        featured.viewDetails||
        'View details',
      moq:
        featured.moq||
        'MOQ'
    }),
    craft:Object.freeze({
      kicker:
        craft.kicker||
        'THE CRAFT',
      title:
        craft.title||
        'Shaped while the wax is warm.',
      body:
        craft.body||
        ''
    }),
    custom:Object.freeze({
      kicker:
        custom.kicker||
        'CUSTOM MADE',
      title:
        custom.title||
        'Made for your project.',
      body:
        custom.body||
        '',
      features:Object.freeze(
        Array.isArray(
          custom.features
        )
          ? custom.features.slice()
          : []
      ),
      action:
        custom.action||
        'Start a custom project'
    }),
    wholesale:Object.freeze({
      kicker:
        wholesale.kicker||
        'WHOLESALE / PROJECT SUPPORT',
      title:
        wholesale.title||
        'From selection to delivery.',
      facts:Object.freeze(
        (
          Array.isArray(
            wholesale.facts
          )
            ? wholesale.facts
            : []
        ).map(
          fact=>
            Object.freeze({
              title:
                fact?.title||
                '',
              body:
                fact?.body||
                ''
            })
        )
      )
    }),
    cta:Object.freeze({
      kicker:
        cta.kicker||
        'YOUR NEXT PROJECT',
      title:
        cta.title||
        'Planning a new project?',
      body:
        cta.body||
        '',
      explore:
        cta.explore||
        'Explore collection',
      custom:
        cta.custom||
        'Start custom project'
    }),
    footer:Object.freeze({
      description:
        footer.description||
        'Hand-carved candles for wholesale and custom projects.',
      explore:
        footer.explore||
        'Explore',
      projects:
        footer.projects||
        'Projects',
      legal:
        footer.legal||
        'Legal',
      collection:
        footer.collection||
        'Collection',
      masterpiece:
        footer.masterpiece||
        'Masterpiece',
      advanced:
        footer.advanced||
        'Advanced',
      custom:
        footer.custom||
        'Custom',
      inquiry:
        footer.inquiry||
        'Inquiry',
      privacy:
        footer.privacy||
        'Privacy',
      copyright:
        footer.copyright||
        '© DREAMLAND'
    })
  });
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
    normalizeHomeContent(
      localizationPolicy
        .localizedContent(
          language,
          siteContent
        )
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

function runtimeView(view){
  return Object.freeze({
    content:view.content,
    collections:Object.freeze(
      view.collections.map(
        item=>
          Object.freeze({
            id:item.id,
            label:item.label,
            count:item.count
          })
      )
    ),
    featuredProducts:Object.freeze(
      view.featuredProducts.map(
        item=>
          Object.freeze({
            id:item.id,
            name:item.name,
            seriesLabel:
              item.seriesLabel,
            price:item.price,
            moq:item.moq
          })
      )
    )
  });
}

export function buildHomeRuntimeState({
  languages=[
    'en',
    'zh',
    'ko'
  ],
  defaultLanguage='en',
  siteContent={},
  homeAssets={},
  products=[],
  seriesMeta={},
  currencyMap={},
  localizationPolicy,
  pricingPolicy
}={}){
  const supported=
    Array.from(
      new Set(
        languages
          .map(
            value=>
              String(
                value||
                ''
              )
                .trim()
                .toLowerCase()
          )
          .filter(Boolean)
      )
    );

  const languageViews={};

  supported.forEach(
    language=>{
      languageViews[language]=
        runtimeView(
          buildHomeViewModel({
            language,
            siteContent,
            homeAssets,
            products,
            seriesMeta,
            currencyMap,
            localizationPolicy,
            pricingPolicy
          })
        );
    }
  );

  return Object.freeze({
    version:'R4.3B',
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
      inquiryVersion:2
    }),
    languages:Object.freeze(
      languageViews
    )
  });
}


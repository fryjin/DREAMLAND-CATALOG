function text(value){
  return String(
    value??
    ''
  ).trim();
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

function productRoute(product){
  return '/products/'+
    encodeURIComponent(
      productId(product)
    )+
    '/';
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

function configuredMoq(
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

function catalogPriceFromValue(
  value,
  {
    language,
    pricingPolicy,
    localizationPolicy,
    currencyMap
  }
){
  const money=
    pricingPolicy
      .money(
        value,
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

function catalogPrice(
  product,
  {
    language,
    pricingPolicy,
    localizationPolicy,
    seriesMeta,
    currencyMap
  }
){
  const value=
    pricingPolicy
      .catalogUnit(
        product,
        seriesMeta,
        currencyMap
      );

  return catalogPriceFromValue(
    value,
    {
      language,
      pricingPolicy,
      localizationPolicy,
      currencyMap
    }
  );
}

function normalizeCatalogContent(
  content={}
){
  const catalog=
    content?.catalog||
    {};

  return Object.freeze({
    kicker:
      catalog.kicker||
      'PRODUCT CATALOG',
    title:
      catalog.title||
      'Browse the DREAMLAND collection',
    body:
      catalog.body||
      '',
    all:
      catalog.all||
      'All',
    activeDesigns:
      catalog.activeDesigns||
      'products',
    designs:
      catalog.designs||
      'products',
    seriesNavigation:
      catalog.seriesNavigation||
      'Collection index',
    searchPlaceholder:
      catalog.searchPlaceholder||
      'Search designs or product ID',
    filters:
      catalog.filters||
      'Filter',
    size:
      catalog.size||
      'Size',
    clear:
      catalog.clear||
      'Clear',
    apply:
      catalog.apply||
      'Apply',
    sort:
      catalog.sort||
      'Sort',
    sortFeatured:
      catalog.sortFeatured||
      'Featured',
    sortName:
      catalog.sortName||
      'Name A–Z',
    sortPriceLow:
      catalog.sortPriceLow||
      'Price low to high',
    sortPriceHigh:
      catalog.sortPriceHigh||
      'Price high to low',
    sortMoq:
      catalog.sortMoq||
      'MOQ low to high',
    viewDetails:
      catalog.viewDetails||
      'View details',
    moq:
      catalog.moq||
      'MOQ',
    showing:
      catalog.showing||
      'Showing',
    of:
      catalog.of||
      'of',
    loadMore:
      catalog.loadMore||
      'Load more',
    emptyKicker:
      catalog.emptyKicker||
      'NO MATCHES',
    emptyTitle:
      catalog.emptyTitle||
      'No designs match these filters.',
    searchEmptyTitle:
      catalog.searchEmptyTitle||
      'No results for “{query}”',
    emptyBody:
      catalog.emptyBody||
      'Try another size or clear your filters.',
    clearFilters:
      catalog.clearFilters||
      'Clear filters',
    ctaKicker:
      catalog.ctaKicker||
      'YOUR INQUIRY',
    ctaEmptyTitle:
      catalog.ctaEmptyTitle||
      'Add products to an inquiry when you are ready for a quote.',
    ctaEmptyBody:
      catalog.ctaEmptyBody||
      'Choose a product, configure it, then add it to your inquiry.',
    ctaReadyTitle:
      catalog.ctaReadyTitle||
      'Review selected products.',
    ctaReadyBody:
      catalog.ctaReadyBody||
      '{count} products have been added to your inquiry.',
    reviewInquiry:
      catalog.reviewInquiry||
      'Review inquiry',
    backToTop:
      catalog.backToTop||
      'Back to top'
  });
}

function compactSiteContent(
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
    catalog:
      normalizeCatalogContent(
        localized
      )
  });
}

function languageMap(
  languages,
  resolve
){
  return Object.freeze(
    Object.fromEntries(
      languages.map(
        language=>[
          language,
          resolve(language)
        ]
      )
    )
  );
}

function normalizedSizes(product){
  const values=
    Array.isArray(
      product?.availableSizes
    )
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
  ];
}

function compactTags(value){
  if(
    !value||
    typeof value!=='object'||
    Array.isArray(value)
  ){
    return Object.freeze({});
  }

  const next={};

  Object.entries(value)
    .forEach(
      ([key,item])=>{
        if(Array.isArray(item)){
          next[key]=
            item
              .map(text)
              .filter(Boolean);
          return;
        }

        const normalized=text(item);

        if(normalized){
          next[key]=normalized;
        }
      }
    );

  return Object.freeze(next);
}

function catalogPolicyConfig({
  products,
  seriesMeta,
  batchSize,
  language,
  currencyMap,
  catalogPolicy,
  pricingPolicy,
  localizationPolicy
}){
  catalogPolicy.configure({
    products,
    seriesMeta,
    batchSize,
    productName:
      product=>
        localizationPolicy
          .productName(
            language,
            product
          ),
    productPriceValue:
      product=>
        pricingPolicy
          .catalogUnit(
            product,
            seriesMeta,
            currencyMap
          ),
    productMoq:
      product=>
        configuredMoq(
          product,
          pricingPolicy,
          seriesMeta
        )
  });
}

export function buildCatalogViewModel({
  language='en',
  products=[],
  seriesMeta={},
  siteContent={},
  currencyMap={},
  catalogPolicy,
  pricingPolicy,
  localizationPolicy,
  batchSize=24
}={}){
  if(
    !catalogPolicy||
    !pricingPolicy||
    !localizationPolicy
  ){
    throw new Error(
      'Catalog ViewModel requires Catalog ViewState plus canonical Pricing and Localization policies.'
    );
  }

  const localizedContent=
    localizationPolicy
      .localizedContent(
        language,
        siteContent
      );

  const catalogContent=
    normalizeCatalogContent(
      localizedContent
    );

  catalogPolicyConfig({
    products,
    seriesMeta,
    batchSize,
    language,
    currencyMap,
    catalogPolicy,
    pricingPolicy,
    localizationPolicy
  });

  catalogPolicy.reset({
    scope:
      catalogPolicy.allScope||
      'all'
  });

  const state=
    catalogPolicy
      .buildViewModel();

  const scopes=
    state.availableScopes
      .map(scope=>
        Object.freeze({
          id:scope,
          label:
            scope==='all'
              ? catalogContent.all
              : seriesLabel(
                  language,
                  scope,
                  seriesMeta
                ),
          count:
            scope==='all'
              ? state.allCount
              : Number(
                  state.seriesCounts
                    ?.[scope]||
                  0
                )
        })
      );

  const cards=
    state.products
      .map((product,index)=>
        Object.freeze({
          id:
            productId(
              product
            ),
          href:
            productRoute(
              product
            ),
          name:
            localizationPolicy
              .productName(
                language,
                product
              ),
          series:
            text(
              product?.series
            ),
          seriesLabel:
            seriesLabel(
              language,
              product?.series,
              seriesMeta
            ),
          cover:
            webPath(
              product?.cover_image
            ),
          price:
            catalogPrice(
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
                configuredMoq(
                  product,
                  pricingPolicy,
                  seriesMeta
                )
              )||
              1
            ),
          priority:
            index<4
              ? 'high'
              : 'auto',
          loading:
            index<4
              ? 'eager'
              : 'lazy'
        })
      );

  return Object.freeze({
    language,
    content:
      localizedContent,
    catalog:
      catalogContent,
    scope:
      state.scope,
    allCount:
      state.allCount,
    totalCount:
      state.totalCount,
    renderedCount:
      state.renderedCount,
    hasMore:
      state.hasMore,
    scopes:
      Object.freeze(
        scopes
      ),
    products:
      Object.freeze(
        cards
      )
  });
}

export function buildCatalogRuntimeState({
  languages=[
    'en',
    'zh',
    'ko'
  ],
  defaultLanguage='en',
  products=[],
  seriesMeta={},
  siteContent={},
  currencyMap={},
  catalogPolicy,
  pricingPolicy,
  localizationPolicy,
  batchSize=24
}={}){
  if(
    !catalogPolicy||
    !pricingPolicy||
    !localizationPolicy
  ){
    throw new Error(
      'Catalog Runtime State requires Catalog ViewState plus canonical Pricing and Localization policies.'
    );
  }

  const supported=
    [
      ...new Set(
        languages
          .map(
            language=>
              text(language)
                .toLowerCase()
          )
          .filter(Boolean)
      )
    ];

  const primaryLanguage=
    supported.includes(
      defaultLanguage
    )
      ? defaultLanguage
      : (
          supported[0]||
          'en'
        );

  catalogPolicyConfig({
    products,
    seriesMeta,
    batchSize,
    language:
      primaryLanguage,
    currencyMap,
    catalogPolicy,
    pricingPolicy,
    localizationPolicy
  });

  catalogPolicy.reset({
    scope:
      catalogPolicy.allScope||
      'all'
  });

  let allState=
    catalogPolicy
      .buildViewModel();

  while(allState.hasMore){
    catalogPolicy.loadMore();
    allState=
      catalogPolicy
        .buildViewModel();
  }

  const languageViews=
    Object.freeze(
      Object.fromEntries(
        supported.map(
          language=>[
            language,
            compactSiteContent(
              localizationPolicy
                .localizedContent(
                  language,
                  siteContent
                )
            )
          ]
        )
      )
    );

  const runtimeProducts=
    allState.products
      .map(product=>{
        const priceValue=
          Number(
            product
              ?.desktopCatalogPriceValue
          )||
          pricingPolicy
            .catalogUnit(
              product,
              seriesMeta,
              currencyMap
            );

        const moq=
          Math.max(
            1,
            Number(
              product
                ?.desktopCatalogMoq
            )||
            Number(
              configuredMoq(
                product,
                pricingPolicy,
                seriesMeta
              )
            )||
            1
          );

        return Object.freeze({
          id:
            productId(
              product
            ),
          productId:
            productId(
              product
            ),
          status:'active',
          series:
            text(
              product?.series
            ),
          href:
            productRoute(
              product
            ),
          cover:
            webPath(
              product?.cover_image
            ),
          availableSizes:
            Object.freeze(
              normalizedSizes(
                product
              )
            ),
          defaultSize:
            text(
              product?.defaultSize||
              product?.size
            )
              .toUpperCase(),
          listSort:
            Number(
              product?.listSort
            )||
            0,
          sortOrder:
            Number(
              product?.sortOrder
            )||
            0,
          tags:
            compactTags(
              product?.tags
            ),
          names:
            languageMap(
              supported,
              language=>
                localizationPolicy
                  .productName(
                    language,
                    product
                  )
            ),
          seriesLabels:
            languageMap(
              supported,
              language=>
                seriesLabel(
                  language,
                  product?.series,
                  seriesMeta
                )
            ),
          prices:
            languageMap(
              supported,
              language=>
                catalogPriceFromValue(
                  priceValue,
                  {
                    language,
                    pricingPolicy,
                    localizationPolicy,
                    currencyMap
                  }
                )
            ),
          priceValue,
          moq
        });
      });

  const sizeOptions=
    [
      ...new Set(
        runtimeProducts
          .flatMap(
            product=>
              product.availableSizes
          )
      )
    ];

  const scopeIds=
    Object.freeze([
      ...allState
        .availableScopes
    ]);

  return Object.freeze({
    version:'R4.4B',
    defaultLanguage:
      primaryLanguage,
    batchSize,
    storage:Object.freeze({
      languageKey:
        'productManualLang',
      inquiryKey:
        'productManualV2State',
      inquiryVersion:2
    }),
    url:Object.freeze({
      series:'series',
      query:'query',
      sizes:'sizes',
      sort:'sort',
      page:'page'
    }),
    scopeIds,
    sorts:Object.freeze([
      ...(
        catalogPolicy.sorts||
        [
          'featured',
          'name',
          'price-low',
          'price-high',
          'moq-low'
        ]
      )
    ]),
    sizeOptions:Object.freeze(
      sizeOptions
    ),
    languages:
      languageViews,
    products:Object.freeze(
      runtimeProducts
    )
  });
}

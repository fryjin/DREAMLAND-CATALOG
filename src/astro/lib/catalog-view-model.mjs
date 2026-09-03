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

function productRoute(product){
  const id=
    text(
      product?.productId||
      product?.id
    )
      .toUpperCase();

  return '/products/'+
    encodeURIComponent(id)+
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
  const base=
    pricingPolicy
      .catalogUnit(
        product,
        seriesMeta,
        currencyMap
      );

  const money=
    pricingPolicy
      .money(
        base,
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
    sort:
      catalog.sort||
      'Sort',
    sortFeatured:
      catalog.sortFeatured||
      'Featured',
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
    ctaKicker:
      catalog.ctaKicker||
      'YOUR INQUIRY',
    ctaEmptyTitle:
      catalog.ctaEmptyTitle||
      'Add products to an inquiry when you are ready for a quote.',
    ctaEmptyBody:
      catalog.ctaEmptyBody||
      'Choose a product, configure it, then add it to your inquiry.'
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
            text(
              product?.productId||
              product?.id
            )
              .toUpperCase(),
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

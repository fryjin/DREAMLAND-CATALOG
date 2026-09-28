const SUPPORTED=
  Object.freeze([
    'en',
    'zh',
    'ko'
  ]);

const HTML_LANG=
  Object.freeze({
    en:'en',
    zh:'zh-CN',
    ko:'ko-KR'
  });

const PUBLIC_DEFAULT='en';
const STORAGE_KEY='productManualLang';

function text(value){
  return String(
    value??
    ''
  ).trim();
}

function supportedLocale(value){
  const raw=
    text(value)
      .toLowerCase();

  if(!raw){
    return null;
  }

  if(
    SUPPORTED.includes(
      raw
    )
  ){
    return raw;
  }

  const primary=
    raw.split('-')[0];

  return SUPPORTED.includes(
    primary
  )
    ? primary
    : null;
}

function normalizeLocale(
  value,
  fallback=PUBLIC_DEFAULT
){
  return (
    supportedLocale(value)||
    supportedLocale(fallback)||
    PUBLIC_DEFAULT
  );
}

function htmlLangForLocale(value){
  return HTML_LANG[
    normalizeLocale(value)
  ];
}

function externalReference(value){
  const raw=text(value);

  return (
    !raw||
    raw.startsWith('#')||
    raw.startsWith('?')||
    raw.startsWith('//')||
    /^[a-z][a-z0-9+.-]*:/i.test(raw)
  );
}

function splitInternalReference(value){
  const raw=
    text(value)||
    '/';

  let beforeHash=raw;
  let hash='';

  const hashIndex=
    raw.indexOf('#');

  if(hashIndex>=0){
    beforeHash=raw.slice(0,hashIndex);
    hash=raw.slice(hashIndex);
  }

  let pathname=beforeHash;
  let search='';

  const searchIndex=
    beforeHash.indexOf('?');

  if(searchIndex>=0){
    pathname=beforeHash.slice(0,searchIndex);
    search=beforeHash.slice(searchIndex);
  }

  pathname=pathname||'/';

  if(!pathname.startsWith('/')){
    pathname='/'+pathname;
  }

  return Object.freeze({
    pathname,
    search,
    hash
  });
}

function localeFromPath(value){
  if(externalReference(value)){
    return null;
  }

  const {pathname}=
    splitInternalReference(value);

  const match=
    pathname.match(/^\/([^/]+)(?:\/|$)/);

  return supportedLocale(match?.[1]);
}

function stripLocalePathname(pathname){
  const locale=
    localeFromPath(pathname);

  if(!locale){
    return pathname;
  }

  const prefix='/'+locale;
  const rest=pathname.slice(prefix.length);

  return rest||'/';
}

function stripLocalePrefix(value){
  if(externalReference(value)){
    return text(value);
  }

  const {
    pathname,
    search,
    hash
  }=splitInternalReference(value);

  return (
    stripLocalePathname(pathname)+
    search+
    hash
  );
}

function withLocale(value,locale){
  if(externalReference(value)){
    return text(value);
  }

  const next=normalizeLocale(locale);
  const {
    pathname,
    search,
    hash
  }=splitInternalReference(value);

  const base=stripLocalePathname(pathname);
  const localized=
    base==='/'
      ? '/'+next+'/'
      : '/'+next+base;

  return localized+search+hash;
}

function isLocaleEligiblePath(value){
  if(externalReference(value)){
    return false;
  }

  const {pathname}=
    splitInternalReference(
      stripLocalePrefix(value)
    );

  return (
    pathname==='/'||
    /^\/products\/?$/.test(pathname)||
    /^\/products\/[^/]+\/?$/.test(pathname)||
    /^\/custom\/?$/.test(pathname)||
    /^\/inquiry\/?$/.test(pathname)||
    /^\/inquiry\/contact\/?$/.test(pathname)||
    /^\/inquiry\/review\/?$/.test(pathname)||
    /^\/inquiry\/success\/?$/.test(pathname)
  );
}

function localizedPublicPath(value,locale){
  return isLocaleEligiblePath(value)
    ? withLocale(value,locale)
    : text(value);
}

function resolveLocale({
  pathname='/',
  storedLocale='',
  fallback=PUBLIC_DEFAULT
}={}){
  const routeLocale=localeFromPath(pathname);

  if(routeLocale){
    return Object.freeze({
      locale:routeLocale,
      source:'route',
      localizedPath:true
    });
  }

  const persisted=supportedLocale(storedLocale);

  if(persisted){
    return Object.freeze({
      locale:persisted,
      source:'storage',
      localizedPath:false
    });
  }

  return Object.freeze({
    locale:normalizeLocale(
      fallback,
      PUBLIC_DEFAULT
    ),
    source:'default',
    localizedPath:false
  });
}

function scopedPublicPath(
  value,
  locale=''
){
  const scoped=
    supportedLocale(
      locale
    );

  return scoped
    ? localizedPublicPath(
        value,
        scoped
      )
    : text(value);
}

const PUBLIC_ROUTE_PATHS=
  Object.freeze({
    home:'/',
    catalog:'/products/',
    custom:'/custom/',
    inquiry:'/inquiry/',
    contact:'/inquiry/contact/',
    review:'/inquiry/review/',
    success:'/inquiry/success/'
  });

function localeRouteMap(locale=''){
  return Object.freeze(
    Object.fromEntries(
      Object.entries(
        PUBLIC_ROUTE_PATHS
      ).map(
        ([key,value])=>[
          key,
          scopedPublicPath(
            value,
            locale
          )
        ]
      )
    )
  );
}

function localizePresentationRoutes(
  value,
  locale=''
){
  const scoped=
    supportedLocale(
      locale
    );

  if(!scoped){
    return value;
  }

  function visit(
    item,
    key='',
    parentKey=''
  ){
    if(typeof item==='string'){
      if(
        key==='href'||
        key==='target'||
        parentKey==='routes'
      ){
        return scopedPublicPath(
          item,
          scoped
        );
      }

      return item;
    }

    if(Array.isArray(item)){
      return Object.freeze(
        item.map(
          child=>
            visit(
              child,
              '',
              key
            )
        )
      );
    }

    if(
      item&&
      typeof item==='object'
    ){
      return Object.freeze(
        Object.fromEntries(
          Object.entries(item)
            .map(
              ([childKey,child])=>[
                childKey,
                visit(
                  child,
                  childKey,
                  key
                )
              ]
            )
        )
      );
    }

    return item;
  }

  return visit(value);
}

function decorateLocaleRuntimeState(
  state,
  routeLocale=''
){
  const scoped=
    supportedLocale(
      routeLocale
    )||
    '';

  const localized=
    localizePresentationRoutes(
      state,
      scoped
    );

  return Object.freeze({
    ...localized,
    routeLocale:
      scoped,
    localeRoutes:
      localeRouteMap(
        scoped
      )
  });
}

export const SUPPORTED_LOCALES=SUPPORTED;
export const HTML_LANG_BY_LOCALE=HTML_LANG;
export const PUBLIC_DEFAULT_LOCALE=PUBLIC_DEFAULT;
export const LANGUAGE_STORAGE_KEY=STORAGE_KEY;

export {
  supportedLocale,
  normalizeLocale,
  htmlLangForLocale,
  localeFromPath,
  stripLocalePrefix,
  withLocale,
  isLocaleEligiblePath,
  localizedPublicPath,
  scopedPublicPath,
  localeRouteMap,
  localizePresentationRoutes,
  decorateLocaleRuntimeState,
  resolveLocale
};

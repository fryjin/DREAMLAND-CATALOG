const CACHE_VERSION = 'dreamland-pwa-v129';

const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PREVIEW_IMAGE_CACHE = `${CACHE_VERSION}-preview-images`;
const FULL_IMAGE_CACHE = `${CACHE_VERSION}-full-images`;
const OTHER_IMAGE_CACHE = `${CACHE_VERSION}-other-images`;

const RELEASE_TAG =
  'b7-00b4j-r3-v129';

/*
 * R4.3D / R4.4D / R4.5D / R4.6D / R4.7D / R4.8D document ownership boundary.
 *
 * The registered Service Worker remains required by the Legacy Review/Success
 * conversion routes. Production Home, Catalog, PDP, Custom, Inquiry selection
 * and Contact documents are Astro-owned and must never be served from cached
 * Legacy documents.
 */
const HOME_NAVIGATION_PATHS=
  new Set([
    '/',
    '/index.html'
  ]);

const CATALOG_NAVIGATION_PATHS=
  new Set([
    '/products/',
    '/products/index.html'
  ]);

const PDP_NAVIGATION_PATTERN=
  /^\/products\/[A-Z]{3}\d{3}(?:\/(?:index\.html)?)?$/i;

const CUSTOM_NAVIGATION_PATHS=
  new Set([
    '/custom',
    '/custom/',
    '/custom/index.html'
  ]);

/*
 * R4.7D owns only the Inquiry selection document. Contact, Review and Success
 * remain in the Legacy conversion/PWA boundary.
 */
const INQUIRY_NAVIGATION_PATHS=
  new Set([
    '/inquiry',
    '/inquiry/',
    '/inquiry/index.html'
  ]);

/*
 * R4.8D owns only the Contact document. Review and Success remain in the
 * Legacy conversion/PWA boundary.
 */
const CONTACT_NAVIGATION_PATHS=
  new Set([
    '/inquiry/contact',
    '/inquiry/contact/',
    '/inquiry/contact/index.html'
  ]);

const RELEASE_ASSETS = [
  './startup-loader.css?release=b7-00b4j-r3-v129',
  './startup-loader.js?release=b7-00b4j-r3-v129',
  './catalog-data.js?release=b7-00b4j-r3-v129',
  './src/services/pwa/runtime-pwa.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/tokens.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/primitives.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/shell.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/home.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/catalog.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/detail.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/custom.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/inquiry.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/contact.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/review.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/styles/success.css?release=b7-00b4j-r3-v129',
  './src/ui/desktop/shell/runtime-desktop-shell.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/home/runtime-desktop-home.js?release=b7-00b4j-r3-v129',
  './src/features/catalog/runtime-desktop-catalog-view.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/catalog/runtime-desktop-catalog.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/detail/runtime-desktop-detail.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/custom/runtime-desktop-custom.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/inquiry/runtime-desktop-inquiry.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/contact/runtime-desktop-contact.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/review/runtime-desktop-review.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/success/runtime-desktop-success.js?release=b7-00b4j-r3-v129',
  './src/ui/desktop/runtime-desktop-experience.js?release=b7-00b4j-r3-v129',
  './copy-polish.js?release=b7-00b4j-r3-v129',
  './src/app/runtime-hooks.js?release=b7-00b4j-r3-v129',
  './src/services/media/runtime-media.js?release=b7-00b4j-r3-v129',
  './image-manager.js?release=b7-00b4j-r3-v129',
  './image-variants.js?release=b7-00b4j-r3-v129',
  './detail-progressive.js?release=b7-00b4j-r3-v129',
  './pattern-preview-swipe.js?release=b7-00b4j-r3-v129'
];

const APP_SHELL = [
  /*
   * R4.3D: do not precache / or /index.html. The Astro Home is network-owned
   * and must not fall back to a Legacy cached document.
   */
  './startup-loader.css',
  './startup-loader.js',
  './src/ui/desktop/styles/tokens.css',
  './src/ui/desktop/styles/primitives.css',
  './src/ui/desktop/styles/shell.css',
  './src/ui/desktop/styles/home.css',
  './src/ui/desktop/styles/catalog.css',
  './src/ui/desktop/styles/detail.css',
  './src/ui/desktop/styles/custom.css',
  './src/ui/desktop/styles/inquiry.css',
  './src/ui/desktop/styles/contact.css',
  './src/ui/desktop/styles/review.css',
  './src/ui/desktop/styles/success.css',
  './src/ui/desktop/shell/runtime-desktop-shell.js',
  './src/ui/desktop/home/runtime-desktop-home.js',
  './src/ui/desktop/runtime-desktop-experience.js',
  './src/data/product-data-contract.js',
  './src/domain/pricing/runtime-pricing-policy.js',
  './src/domain/submission/runtime-submission-payload.js',
  './src/domain/localization/runtime-localization-policy.js',
  './catalog-data.js',
  './src/services/storage/runtime-storage.js',
  './src/services/pwa/runtime-pwa.js',
  './src/services/submission/runtime-submission.js',
  './src/services/risk/runtime-risk.js',
  './src/site/runtime/runtime-page-guards.js',
  './src/features/catalog/runtime-catalog.js',
  './src/features/catalog/runtime-desktop-catalog-view.js',
  './src/features/detail/runtime-detail.js',
  './src/features/inquiry/runtime-inquiry.js',
  './src/features/custom/runtime-custom.js',
  './src/features/contact/runtime-contact.js',
  './src/ui/catalog/runtime-catalog-renderer.js',
  './src/ui/desktop/catalog/runtime-desktop-catalog.js',
  './src/ui/desktop/detail/runtime-desktop-detail.js',
  './src/ui/desktop/custom/runtime-desktop-custom.js',
  './src/ui/desktop/inquiry/runtime-desktop-inquiry.js',
  './src/ui/desktop/contact/runtime-desktop-contact.js',
  './src/ui/desktop/review/runtime-desktop-review.js',
  './src/ui/desktop/success/runtime-desktop-success.js',
  './src/ui/detail/runtime-detail-renderer.js',
  './src/ui/inquiry/runtime-inquiry-renderer.js',
  './src/app/runtime-inquiry-submission-flow.js',
  './src/app/runtime-hooks.js',
  './src/services/media/runtime-media.js',
  './image-manager.js',
  './image-variants.js',
  './detail-progressive.js',
  './pattern-preview-swipe.js',
  './custom-scent-multi.js',
  './copy-polish.js',
  './manifest.webmanifest',
  './offline.html',
  './privacy.html',
  './data/products.csv',
  './data/shared-assets.csv',
  './data/scents.csv',
  './data/products.json',
  './data/series.json',
  './data/i18n.json',
  './data/app-config.json',
  './data/site-content.json',
  './data/desktop-home-assets.json',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

async function cacheAvailableAssets(
  cacheName,
  assets
){
  const cache=
    await caches.open(
      cacheName
    );

  const failed=[];

  await Promise.all(
    assets.map(
      async asset=>{
        try{
          const request=
            new Request(
              asset,
              {
                cache:'reload'
              }
            );

          const response=
            await fetch(
              request
            );

          if(
            !response||
            !response.ok
          ){
            throw new Error(
              'HTTP '+
              (
                response?.status||
                0
              )
            );
          }

          await cache.put(
            request,
            response
          );
        }catch(error){
          failed.push(
            asset
          );

          console.warn(
            '[DREAMLAND SW] preload skipped:',
            asset,
            error
          );
        }
      }
    )
  );

  return failed;
}

function isHomeNavigation(
  url
){
  return (
    url.origin===
      self.location.origin&&
    HOME_NAVIGATION_PATHS
      .has(
        url.pathname
      )
  );
}

async function purgeLegacyHomeEntries(){
  for(const cacheName of [
    APP_CACHE,
    RUNTIME_CACHE
  ]){
    const cache=
      await caches.open(
        cacheName
      );

    const requests=
      await cache.keys();

    await Promise.all(
      requests.map(
        async request=>{
          try{
            const url=
              new URL(
                request.url
              );

            if(
              url.origin===
                self.location.origin&&
              HOME_NAVIGATION_PATHS
                .has(
                  url.pathname
                )
            ){
              await cache.delete(
                request
              );
            }
          }catch(_){
          }
        }
      )
    );
  }
}

async function homeNetworkOnly(
  request
){
  try{
    return await fetch(
      request,
      {
        cache:'no-store'
      }
    );
  }catch{
    return (
      await caches.match(
        './offline.html'
      )
    )||
    new Response(
      'Offline',
      {
        status:503,
        statusText:'Offline'
      }
    );
  }
}

function isCatalogNavigation(
  url
){
  return (
    url.origin===
      self.location.origin&&
    CATALOG_NAVIGATION_PATHS
      .has(
        url.pathname
      )
  );
}

async function purgeLegacyCatalogEntries(){
  for(const cacheName of [
    APP_CACHE,
    RUNTIME_CACHE
  ]){
    const cache=
      await caches.open(
        cacheName
      );

    const requests=
      await cache.keys();

    await Promise.all(
      requests.map(
        async request=>{
          try{
            const url=
              new URL(
                request.url
              );

            if(
              url.origin===
                self.location.origin&&
              CATALOG_NAVIGATION_PATHS
                .has(
                  url.pathname
                )
            ){
              await cache.delete(
                request
              );
            }
          }catch(_){
          }
        }
      )
    );
  }
}

async function catalogNetworkOnly(
  request
){
  try{
    return await fetch(
      request,
      {
        cache:'no-store'
      }
    );
  }catch{
    return (
      await caches.match(
        './offline.html'
      )
    )||
    new Response(
      'Offline',
      {
        status:503,
        statusText:'Offline'
      }
    );
  }
}

function isPdpNavigation(
  url
){
  return (
    url.origin===
      self.location.origin&&
    PDP_NAVIGATION_PATTERN
      .test(
        url.pathname
      )
  );
}

async function purgeLegacyPdpEntries(){
  for(const cacheName of [
    APP_CACHE,
    RUNTIME_CACHE
  ]){
    const cache=
      await caches.open(
        cacheName
      );

    const requests=
      await cache.keys();

    await Promise.all(
      requests.map(
        async request=>{
          try{
            const url=
              new URL(
                request.url
              );

            if(
              isPdpNavigation(
                url
              )
            ){
              await cache.delete(
                request
              );
            }
          }catch(_){
          }
        }
      )
    );
  }
}

async function pdpNetworkOnly(
  request
){
  try{
    return await fetch(
      request,
      {
        cache:'no-store'
      }
    );
  }catch{
    return (
      await caches.match(
        './offline.html'
      )
    )||
    new Response(
      'Offline',
      {
        status:503,
        statusText:'Offline'
      }
    );
  }
}

function isCustomNavigation(
  url
){
  return (
    url.origin===
      self.location.origin&&
    CUSTOM_NAVIGATION_PATHS
      .has(
        url.pathname
      )
  );
}

async function purgeLegacyCustomEntries(){
  for(const cacheName of [
    APP_CACHE,
    RUNTIME_CACHE
  ]){
    const cache=
      await caches.open(
        cacheName
      );

    const requests=
      await cache.keys();

    await Promise.all(
      requests.map(
        async request=>{
          try{
            const url=
              new URL(
                request.url
              );

            if(
              isCustomNavigation(
                url
              )
            ){
              await cache.delete(
                request
              );
            }
          }catch(_){
          }
        }
      )
    );
  }
}

async function customNetworkOnly(
  request
){
  try{
    return await fetch(
      request,
      {
        cache:'no-store'
      }
    );
  }catch{
    return (
      await caches.match(
        './offline.html'
      )
    )||
    new Response(
      'Offline',
      {
        status:503,
        statusText:'Offline'
      }
    );
  }
}


function isInquiryNavigation(
  url
){
  return (
    url.origin===
      self.location.origin&&
    INQUIRY_NAVIGATION_PATHS
      .has(
        url.pathname
      )
  );
}

async function purgeLegacyInquiryEntries(){
  for(const cacheName of [
    APP_CACHE,
    RUNTIME_CACHE
  ]){
    const cache=
      await caches.open(
        cacheName
      );

    const requests=
      await cache.keys();

    await Promise.all(
      requests.map(
        async request=>{
          try{
            const url=
              new URL(
                request.url
              );

            if(
              isInquiryNavigation(
                url
              )
            ){
              await cache.delete(
                request
              );
            }
          }catch(_){
          }
        }
      )
    );
  }
}

async function inquiryNetworkOnly(
  request
){
  try{
    return await fetch(
      request,
      {
        cache:'no-store'
      }
    );
  }catch{
    return (
      await caches.match(
        './offline.html'
      )
    )||
    new Response(
      'Offline',
      {
        status:503,
        statusText:'Offline'
      }
    );
  }
}


function isContactNavigation(
  url
){
  return (
    url.origin===
      self.location.origin&&
    CONTACT_NAVIGATION_PATHS
      .has(
        url.pathname
      )
  );
}

async function purgeLegacyContactEntries(){
  for(const cacheName of [
    APP_CACHE,
    RUNTIME_CACHE
  ]){
    const cache=
      await caches.open(
        cacheName
      );

    const requests=
      await cache.keys();

    await Promise.all(
      requests.map(
        async request=>{
          try{
            const url=
              new URL(
                request.url
              );

            if(
              isContactNavigation(
                url
              )
            ){
              await cache.delete(
                request
              );
            }
          }catch(_){
          }
        }
      )
    );
  }
}

async function contactNetworkOnly(
  request
){
  try{
    return await fetch(
      request,
      {
        cache:'no-store'
      }
    );
  }catch{
    return (
      await caches.match(
        './offline.html'
      )
    )||
    new Response(
      'Offline',
      {
        status:503,
        statusText:'Offline'
      }
    );
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      cacheAvailableAssets(
        APP_CACHE,
        APP_SHELL
      ),
      cacheAvailableAssets(
        RUNTIME_CACHE,
        RELEASE_ASSETS
      ),
      purgeLegacyHomeEntries(),
      purgeLegacyCatalogEntries(),
      purgeLegacyPdpEntries(),
      purgeLegacyCustomEntries(),
      purgeLegacyInquiryEntries(),
      purgeLegacyContactEntries()
    ])
  );
});

self.addEventListener('activate', event => {
  const activeCaches=[
    APP_CACHE,
    RUNTIME_CACHE,
    PREVIEW_IMAGE_CACHE,
    FULL_IMAGE_CACHE,
    OTHER_IMAGE_CACHE
  ];

  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !activeCaches.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(
        ()=>Promise.all([
          purgeLegacyHomeEntries(),
          purgeLegacyCatalogEntries(),
          purgeLegacyPdpEntries(),
          purgeLegacyCustomEntries(),
          purgeLegacyInquiryEntries(),
          purgeLegacyContactEntries()
        ])
      )
      .then(
        ()=>self.clients.claim()
      )
  );
});

self.addEventListener('message', event => {
  if(event.data?.type==='SKIP_WAITING'){
    self.skipWaiting();
  }
});

async function trimCache(cacheName,maxItems){
  const cache=await caches.open(cacheName);
  const keys=await cache.keys();

  while(keys.length>maxItems){
    await cache.delete(keys.shift());
  }
}

async function networkFirst(request,fallbackPaths=[],fresh=false){
  try{
    const response=await fetch(
      request,
      fresh?{cache:'no-store'}:undefined
    );

    if(response&&response.ok){
      const cache=await caches.open(RUNTIME_CACHE);
      await cache.put(request,response.clone());
    }

    return response;
  }catch{
    const direct=await caches.match(request);
    if(direct)return direct;

    for(const path of fallbackPaths){
      const fallback=await caches.match(path);
      if(fallback)return fallback;
    }

    return new Response('Offline',{
      status:503,
      statusText:'Offline'
    });
  }
}

function cacheFirst(
  request,
  cacheName,
  maxItems,
  event
){
  const work=caches.open(cacheName).then(async cache=>{
    const cached=await cache.match(request);
    if(cached){
      return {
        response:cached,
        background:Promise.resolve()
      };
    }

    try{
      const response=await fetch(request);
      const background=response&&response.ok
        ? cache
            .put(request,response.clone())
            .then(()=>trimCache(cacheName,maxItems))
        : Promise.resolve();

      return {response,background};
    }catch{
      return {
        response:new Response('Offline',{
          status:503,
          statusText:'Offline'
        }),
        background:Promise.resolve()
      };
    }
  });

  event.waitUntil(
    work
      .then(result=>result.background)
      .catch(()=>{})
  );

  return work.then(result=>result.response);
}

async function staleWhileRevalidate(
  request,
  cacheName=RUNTIME_CACHE,
  maxItems=220
){
  const cache=await caches.open(cacheName);
  const cached=await cache.match(request);

  const network=fetch(request)
    .then(async response=>{
      if(response&&response.ok){
        await cache.put(request,response.clone());
        await trimCache(cacheName,maxItems);
      }

      return response;
    })
    .catch(()=>null);

  return cached||
    (await network)||
    new Response('Offline',{
      status:503,
      statusText:'Offline'
    });
}

self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    if(
      isHomeNavigation(
        url
      )
    ){
      event.respondWith(
        homeNetworkOnly(
          request
        )
      );
      return;
    }

    if(
      isCatalogNavigation(
        url
      )
    ){
      event.respondWith(
        catalogNetworkOnly(
          request
        )
      );
      return;
    }

    if(
      isPdpNavigation(
        url
      )
    ){
      event.respondWith(
        pdpNetworkOnly(
          request
        )
      );
      return;
    }

    if(
      isCustomNavigation(
        url
      )
    ){
      event.respondWith(
        customNetworkOnly(
          request
        )
      );
      return;
    }

    if(
      isInquiryNavigation(
        url
      )
    ){
      event.respondWith(
        inquiryNetworkOnly(
          request
        )
      );
      return;
    }

    if(
      isContactNavigation(
        url
      )
    ){
      event.respondWith(
        contactNetworkOnly(
          request
        )
      );
      return;
    }

    event.respondWith(
      networkFirst(
        request,
        ['./offline.html']
      )
    );
    return;
  }

  if(
    url.pathname.includes('/data/')&&
    (
      url.pathname.endsWith('.json')||
      url.pathname.endsWith('.csv')
    )
  ){
    event.respondWith(
      networkFirst(request,[],true)
    );
    return;
  }


  if(
    url.searchParams.get(
      'release'
    )===RELEASE_TAG
  ){
    event.respondWith(
      cacheFirst(
        request,
        RUNTIME_CACHE,
        260,
        event
      )
    );
    return;
  }

  if(
    request.destination==='image'&&
    url.pathname.includes('/images/generated/')
  ){
    const isPreview=/-480\.webp$/i.test(url.pathname);

    event.respondWith(
      cacheFirst(
        request,
        isPreview
          ? PREVIEW_IMAGE_CACHE
          : FULL_IMAGE_CACHE,
        isPreview?900:360,
        event
      )
    );
    return;
  }

  if(request.destination==='image'){
    event.respondWith(
      staleWhileRevalidate(
        request,
        OTHER_IMAGE_CACHE,
        300
      )
    );
    return;
  }

  event.respondWith(
    staleWhileRevalidate(
      request,
      RUNTIME_CACHE,
      240
    )
  );
});

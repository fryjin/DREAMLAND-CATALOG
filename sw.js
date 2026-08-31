const CACHE_VERSION = 'dreamland-pwa-v125';

const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PREVIEW_IMAGE_CACHE = `${CACHE_VERSION}-preview-images`;
const FULL_IMAGE_CACHE = `${CACHE_VERSION}-full-images`;
const OTHER_IMAGE_CACHE = `${CACHE_VERSION}-other-images`;

const RELEASE_TAG =
  'b7-00b4j-r3-v125';

const RELEASE_ASSETS = [
  './startup-loader.css?release=b7-00b4j-r3-v125',
  './startup-loader.js?release=b7-00b4j-r3-v125',
  './catalog-data.js?release=b7-00b4j-r3-v125',
  './src/services/pwa/runtime-pwa.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/tokens.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/primitives.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/shell.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/home.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/catalog.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/detail.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/custom.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/inquiry.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/contact.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/review.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/styles/success.css?release=b7-00b4j-r3-v125',
  './src/ui/desktop/shell/runtime-desktop-shell.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/home/runtime-desktop-home.js?release=b7-00b4j-r3-v125',
  './src/features/catalog/runtime-desktop-catalog-view.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/catalog/runtime-desktop-catalog.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/detail/runtime-desktop-detail.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/custom/runtime-desktop-custom.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/inquiry/runtime-desktop-inquiry.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/contact/runtime-desktop-contact.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/review/runtime-desktop-review.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/success/runtime-desktop-success.js?release=b7-00b4j-r3-v125',
  './src/ui/desktop/runtime-desktop-experience.js?release=b7-00b4j-r3-v125',
  './copy-polish.js?release=b7-00b4j-r3-v125',
  './src/app/runtime-hooks.js?release=b7-00b4j-r3-v125',
  './src/services/media/runtime-media.js?release=b7-00b4j-r3-v125',
  './image-manager.js?release=b7-00b4j-r3-v125',
  './image-variants.js?release=b7-00b4j-r3-v125',
  './detail-progressive.js?release=b7-00b4j-r3-v125',
  './pattern-preview-swipe.js?release=b7-00b4j-r3-v125'
];

const APP_SHELL = [
  './',
  './index.html',
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

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_CACHE)
        .then(
          cache=>
            cache.addAll(
              APP_SHELL
            )
        ),

      caches.open(RUNTIME_CACHE)
        .then(
          cache=>
            cache.addAll(
              RELEASE_ASSETS
            )
        )
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
      .then(() => self.clients.claim())
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

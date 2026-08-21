const CACHE_VERSION = 'dreamland-pwa-v81';

const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PREVIEW_IMAGE_CACHE = `${CACHE_VERSION}-preview-images`;
const FULL_IMAGE_CACHE = `${CACHE_VERSION}-full-images`;
const OTHER_IMAGE_CACHE = `${CACHE_VERSION}-other-images`;

const APP_SHELL = [
  './',
  './index.html',
  './startup-loader.css',
  './startup-loader.js',
  './src/data/product-data-contract.js',
  './catalog-data.js',
  './src/services/storage/runtime-storage.js',
  './src/services/pwa/runtime-pwa.js',
  './src/services/submission/runtime-submission.js',
  './src/services/risk/runtime-risk.js',
  './src/features/catalog/runtime-catalog.js',
  './src/features/detail/runtime-detail.js',
  './src/features/inquiry/runtime-inquiry.js',
  './src/features/contact/runtime-contact.js',
  './src/ui/catalog/runtime-catalog-renderer.js',
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
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
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
        ['./index.html','./offline.html']
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

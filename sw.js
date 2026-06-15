const CACHE_VERSION = 'dreamland-pwa-v6';
const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './privacy.html',
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
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![APP_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  while (keys.length > maxItems) {
    await cache.delete(keys.shift());
  }
}

async function networkFirst(request, fallbackPaths = [], fresh = false) {
  try {
    const response = await fetch(request, fresh ? { cache: 'no-store' } : undefined);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const direct = await caches.match(request);
    if (direct) return direct;
    for (const path of fallbackPaths) {
      const fallback = await caches.match(path);
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName = RUNTIME_CACHE, maxItems = 200) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async response => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        await trimCache(cacheName, maxItems);
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || new Response('Offline', { status: 503, statusText: 'Offline' });
}

async function productImageNetworkFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await trimCache(IMAGE_CACHE, 240);
    }
    return response;
  } catch {
    return (await cache.match(request)) || new Response('', { status: 504, statusText: 'Image unavailable offline' });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, ['./index.html', './offline.html']));
    return;
  }

  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, [], true));
    return;
  }

  if (request.destination === 'image' && url.pathname.includes('/images/products/')) {
    event.respondWith(productImageNetworkFirst(request));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, 240));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 220));
});

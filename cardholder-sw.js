const CACHE_NAME = 'paw-cardholder-v8';
const APP_SHELL = [
  './cardholder.html',
  './app-config.js',
  './cardholder-manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('paw-cardholder-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // API 資料需即時取得，絕不寫入快取；其餘僅使用本機 App Shell。
  if (event.request.url.includes('script.google.com')) return;
  if (new URL(event.request.url).pathname.endsWith('/app-config.js')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

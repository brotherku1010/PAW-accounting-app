const CACHE_NAME = 'accounting-app-v10';
const urlsToCache = [
  './index.html',
  './app-config.js',
  './manifest.json'
];

// 安裝 Service Worker 並快取檔案
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 清除舊版快取，讓已安裝的 PWA 取得新版介面。
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('accounting-app-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// 攔截網路請求，優先從快取讀取
self.addEventListener('fetch', event => {
    // 錢包選單必須取得最新名單，不使用任何既有 API 快取。
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') return;
    if (url.pathname.endsWith('/app-config.js')) {
      event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
      return;
    }
    if (url.searchParams.get('action') === 'getWalletsManage') return;
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

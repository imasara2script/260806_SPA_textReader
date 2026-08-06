const CACHE_NAME = 'log-viewer-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== 'shared-files') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Android共有（POSTリクエスト）の受取
  if (url.pathname.endsWith('share') && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const file = formData.get('log_file');

        if (file) {
          const text = await file.text();
          const cache = await caches.open('shared-files');
          await cache.put('shared-data.json', new Response(JSON.stringify({
            name: file.name,
            content: text,
            type: file.type
          })));
        }

        return Response.redirect('./index.html?shared=true', 303);
      })()
    );
    return;
  }

  // 2. 通常のGETリクエスト（キャッシュ優先）
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
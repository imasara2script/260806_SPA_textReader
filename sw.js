const CACHE_NAME = 'log-viewer-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./', './index.html', './manifest.json', './icon.svg']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 共有（POST）リクエストの受取処理
  if (e.request.method === 'POST' && url.pathname.endsWith('share')) {
    e.respondWith(
      (async () => {
        const formData = await e.request.formData();
        const file = formData.get('log_file');
        if (file) {
          const text = await file.text();
          const cache = await caches.open('shared-files');
          await cache.put('shared-data.json', new Response(JSON.stringify({
            name: file.name,
            content: text
          })));
        }
        return Response.redirect('./index.html?shared=true', 303);
      })()
    );
    return;
  }

  // 通常の通信処理
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
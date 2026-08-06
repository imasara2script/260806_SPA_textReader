const CACHE_NAME = 'log-viewer-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// 1. インストール時にリソースをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 2. アクティベート時に古いキャッシュを削除
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

// 3. リクエストの制御（共有POSTと通常GETの分岐）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Androidからの共有（POSTリクエスト）処理
  if (url.pathname.endsWith('/share') && event.request.method === 'POST') {
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

        const redirectUrl = new URL('./?shared=true', event.request.url);
        return Response.redirect(redirectUrl.href, 303);
      })()
    );
    return;
  }

  // 通常のGETリクエスト（キャッシュ優先＋フォールバック）
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});
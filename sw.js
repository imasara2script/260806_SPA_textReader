self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // パスの末尾が /share かどうか判断
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

        // リポジトリ名を維持した相対リダイレクトを行うため、元のURLの起点を使う
        const redirectUrl = new URL('./index.html?shared=true', event.request.url);
        return Response.redirect(redirectUrl.href, 303);
      })()
    );
  }
});
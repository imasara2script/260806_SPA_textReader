self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 共有アクション(/share)を受け取った場合
  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const file = formData.get('log_file');

        if (file) {
          const text = await file.text();
          // 受け取ったファイルデータを一時的なキャッシュに保存
          const cache = await caches.open('shared-files');
          await cache.put('/shared-data.json', new Response(JSON.stringify({
            name: file.name,
            content: text,
            type: file.type
          })));
        }

        // メイン画面へリダイレクト
        return Response.redirect('/index.html?shared=true', 303);
      })()
    );
  }
});
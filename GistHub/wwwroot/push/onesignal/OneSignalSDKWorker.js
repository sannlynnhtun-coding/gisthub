importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

self.addEventListener('push', event => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    const data = payload?.custom?.a;
    if (data?.type !== 'gisthub-update' || typeof data.version !== 'string' || data.version.length > 128) return;
    event.waitUntil((async () => {
        const cache = await caches.open('gisthub-update-state');
        await cache.put('/__gisthub_update__', new Response(JSON.stringify({ version: data.version })));
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) client.postMessage({ type: 'GISTHUB_UPDATE' });
    })());
});

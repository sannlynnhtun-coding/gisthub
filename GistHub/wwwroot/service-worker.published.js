// Caution! Be sure you understand the caveats before publishing an application with
// offline support. See https://aka.ms/blazor-offline-considerations

self.importScripts('./service-worker-assets.js');
self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));
self.addEventListener('message', event => {
    const reply = value => event.ports[0]?.postMessage(value);
    if (event.data?.type === 'GET_VERSION') reply({ version: self.assetsManifest.version });
    if (event.data?.type === 'GET_CLIENT_COUNT' || event.data?.type === 'ACTIVATE_UPDATE') {
        event.waitUntil((async () => {
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            if (event.data.type === 'GET_CLIENT_COUNT') reply({ clients: clients.length });
            else if (clients.length > 1) reply({ ok: false });
            else { await self.skipWaiting(); reply({ ok: true }); }
        })());
    }
});

const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
const offlineAssetsInclude = [ /\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.(woff2?|otf)$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.svg$/, /\.blat$/, /\.dat$/, /\.webmanifest$/ ];
const offlineAssetsExclude = [ /^service-worker\.js$/, /^index\.html$/, /^vercel\.json$/, /^push\//, /^push-config\.json$/ ];

// Replace with your base path if you are hosting on a subfolder. Ensure there is a trailing '/'.
const base = "/";
const baseUrl = new URL(base, self.origin);
const manifestUrlList = self.assetsManifest.assets.map(asset => new URL(asset.url, baseUrl).href);

async function onInstall(event) {
    console.info('Service worker: Install');

    const cache = await caches.open(cacheName);
    const assetsRequests = self.assetsManifest.assets
        .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
        .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
        .map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));
    await cache.addAll(assetsRequests);

    // The HTML shell can briefly come from a newer deployment than the generated
    // asset manifest. Cache it without SRI so that a rolling deployment does not
    // make the entire service-worker installation fail.
    await cache.add(new Request('index.html', { cache: 'no-cache' }));
}

async function onActivate(event) {
    console.info('Service worker: Activate');

    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));
    await self.clients.claim();
}

async function onFetch(event) {
    // API responses and download files must always reach the local service.
    const pathname = new URL(event.request.url).pathname;
    if (pathname.startsWith('/api/') || pathname.startsWith('/push/') || pathname === '/push-config.json') return fetch(event.request);
    let cachedResponse = null;
    if (event.request.method === 'GET') {
        const shouldServeIndexHtml = event.request.mode === 'navigate'
            && !manifestUrlList.some(url => url === event.request.url);

        const request = shouldServeIndexHtml ? 'index.html' : event.request;
        const cache = await caches.open(cacheName);
        cachedResponse = await cache.match(request);
    }

    return cachedResponse || fetch(event.request);
}

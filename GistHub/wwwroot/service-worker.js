// In development, always fetch from the network and do not enable offline support.
// This keeps local changes visible on first reload.
self.addEventListener('fetch', () => { });
self.addEventListener('message', event => {
    if (event.data?.type === 'GET_VERSION') event.ports[0]?.postMessage({ version: 'development' });
});

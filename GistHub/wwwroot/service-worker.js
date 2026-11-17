// In development, always fetch from the network and do not enable offline support.
// This keeps local changes visible on first reload.
self.addEventListener('fetch', () => { });

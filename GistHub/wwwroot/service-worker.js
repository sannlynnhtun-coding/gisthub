// In development, always fetch from the network and do not enable offline support.
// This keeps local changes visible on first reload.
// Replace any older offline worker without intercepting network requests.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

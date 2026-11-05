import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
import { manifestVersion, pushMessage } from './send-update-push.mjs';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('GistHub/wwwroot/js/appUpdates.js', root), 'utf8');
const events = new EventTarget(), document = new EventTarget();
document.body = { inert: false };
let clientCount = 1, activated = 0, reloads = 0, saved = 0, badge, configFetches = 0;
let pending = 'new';
const controller = { postMessage: (_, ports) => ports[0].postMessage({ version: 'old' }) };
const waiting = { postMessage: ({ type }, ports) => {
    if (type === 'GET_CLIENT_COUNT') ports[0].postMessage({ clients: clientCount });
    if (type === 'ACTIVATE_UPDATE') {
        activated++;
        ports[0].postMessage({ ok: true });
        setTimeout(() => events.dispatchEvent(new Event('controllerchange')), 0);
    }
} };
const registration = Object.assign(new EventTarget(), { waiting, update: async () => {} });
const serviceWorker = Object.assign(events, { controller, getRegistration: async () => registration });
const storage = new Map();
const context = vm.createContext({
    navigator: { serviceWorker }, window: {}, document, MessageChannel, setTimeout, clearTimeout,
    location: { pathname: '/tools/html-to-image', reload: () => reloads++ },
    caches: { open: async () => ({ match: async () => pending ? { json: async () => ({ version: pending }) } : undefined }) },
    fetch: async () => { configFetches++; return { ok: true, json: async () => ({ appId: '' }) }; },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
});
vm.runInContext(source.replaceAll('export ', '') + '\nglobalThis.api = { watch, applyUpdate, unwatch, registerDraftGuard, unregisterDraftGuard, loadEditorDraft, saveEditorDraft, removeEditorDraft, refreshBadge };', context);
const api = context.api;
await api.watch({ invokeMethodAsync: async (_, available) => { badge = available; } });
assert.equal(badge, true);
assert.equal(configFetches, 1, 'only startup configuration is fetched, no version polling');
registration.waiting = null; pending = 'old'; await api.refreshBadge();
assert.equal(badge, false, 'push for the running version must not show an update');
pending = 'new'; await api.refreshBadge();
assert.equal(badge, true);
await assert.rejects(api.applyUpdate(), /not ready/);
assert.equal(reloads, 0);
registration.waiting = waiting;
clientCount = 2;
await assert.rejects(api.applyUpdate(), /other GistHub tabs/);
assert.equal(activated, 0);
clientCount = 1;
api.registerDraftGuard('snippet', { invokeMethodAsync: async () => { throw new Error('Storage full'); } });
await assert.rejects(api.applyUpdate(), /Storage full/);
assert.equal(activated, 0);
assert.equal(document.body.inert, false);
const input = new Event('input');
const field = { matches: () => true, isConnected: true, closest: () => null };
Object.defineProperty(input, 'target', { value: field });
document.dispatchEvent(input);
await assert.rejects(api.applyUpdate(), /unsaved changes/);
field.isConnected = false;
await assert.rejects(api.applyUpdate(), /unsaved changes/, 'previewing or hiding a field must not lose its protection');
context.location.pathname = '/my-gists';
api.registerDraftGuard('snippet', { invokeMethodAsync: async () => { saved++; } });
await api.applyUpdate();
assert.equal(saved, 1);
assert.equal(activated, 1);
assert.equal(reloads, 1);
const draft = { description: 'secret draft', filename: 'notes.md', content: 'unsaved text', isPublic: false, isBookmarked: true };
api.saveEditorDraft('profile-a:gist-a', draft);
assert.equal(JSON.stringify(api.loadEditorDraft('profile-a:gist-a')), JSON.stringify(draft));
assert.equal(api.loadEditorDraft('profile-b:gist-a'), null);
storage.set('bad', '{}');
assert.throws(() => api.loadEditorDraft('bad'), /could not be read/);
api.removeEditorDraft('profile-a:gist-a');
assert.equal(api.loadEditorDraft('profile-a:gist-a'), null);
api.unwatch();

const listeners = {}, notifications = [], cached = [];
const workerContext = vm.createContext({
    importScripts: () => {}, Response,
    self: { addEventListener: (name, handler) => { listeners[name] = handler; },
        clients: { matchAll: async () => [{ postMessage: value => notifications.push(value) }] } },
    caches: { open: async () => ({ put: async (key, response) => cached.push([key, await response.json()]) }) }
});
vm.runInContext(await readFile(new URL('GistHub/wwwroot/push/onesignal/OneSignalSDKWorker.js', root), 'utf8'), workerContext);
let work;
listeners.push({ data: { json: () => ({ custom: { a: { type: 'other', version: 'bad' } } }) }, waitUntil: promise => { work = promise; } });
assert.equal(work, undefined, 'ignore unrelated notifications');
listeners.push({ data: { json: () => ({ custom: { a: { type: 'gisthub-update', version: 'new' } } }) }, waitUntil: promise => { work = promise; } });
await work;
assert.equal(cached[0][1].version, 'new');
assert.equal(notifications[0].type, 'GISTHUB_UPDATE');

const offlineEvents = {}, deleted = [], requests = [];
let claimed = 0, skipped = 0, windowCount = 2, downloadFails = false;
const offlineSelf = {
    origin: 'https://example.com',
    assetsManifest: { version: 'new', assets: [
        { url: '_framework/app.wasm', hash: 'sha256-test' },
        { url: 'push/onesignal/OneSignalSDKWorker.js', hash: 'sha256-push' },
        { url: 'push-config.json', hash: 'sha256-config' }
    ] },
    importScripts: () => {}, addEventListener: (name, fn) => { offlineEvents[name] = fn; },
    clients: { matchAll: async () => Array(windowCount).fill({}), claim: async () => { claimed++; } },
    skipWaiting: async () => { skipped++; }
};
vm.runInContext(await readFile(new URL('GistHub/wwwroot/service-worker.published.js', root), 'utf8'), vm.createContext({
    self: offlineSelf, URL, console,
    Request: class { constructor(url, options) { this.url = url; Object.assign(this, options); } },
    caches: {
        open: async () => ({ addAll: async values => { requests.push(...values); if (downloadFails) throw new Error('Offline'); }, add: async () => {} }),
        keys: async () => ['offline-cache-old', 'offline-cache-new', 'gisthub-update-state'],
        delete: async key => { deleted.push(key); }
    }
}));
offlineEvents.install({ waitUntil: promise => { work = promise; } });
await work;
assert.equal(requests.length, 1, 'push worker/config must not be cached with the application');
assert.equal(requests[0].integrity, 'sha256-test', 'WASM download keeps manifest integrity checks');
downloadFails = true;
offlineEvents.install({ waitUntil: promise => { work = promise; } });
await assert.rejects(work, /Offline/);
assert.equal(skipped, 0, 'a download failure cannot activate a worker');
let reply;
offlineEvents.message({ data: { type: 'ACTIVATE_UPDATE' }, ports: [{ postMessage: value => { reply = value; } }], waitUntil: promise => { work = promise; } });
await work;
assert.equal(reply.ok, false);
assert.equal(skipped, 0, 'worker must independently enforce the multiple-tab guard');
windowCount = 1;
offlineEvents.message({ data: { type: 'ACTIVATE_UPDATE' }, ports: [{ postMessage: value => { reply = value; } }], waitUntil: promise => { work = promise; } });
await work;
assert.equal(reply.ok, true);
assert.equal(skipped, 1);
offlineEvents.activate({ waitUntil: promise => { work = promise; } });
await work;
assert.deepEqual(deleted, ['offline-cache-old'], 'activation preserves push state and the new cache');
assert.equal(claimed, 1);

assert.equal(manifestVersion('self.assetsManifest = { "version": "release-1", "assets": [] };'), 'release-1');
assert.throws(() => manifestVersion('<html>fallback</html>'));
const message = pushMessage('public-app-id', 'release-1', 'https://example.com');
assert.equal(message.data.version, 'release-1');
assert.equal(message.web_url, 'https://example.com/');
assert.throws(() => pushMessage('id', 'v', 'http://example.com'));
assert.throws(() => pushMessage('id', 'v', 'https://example.com/editor'));
console.log('PASS: update badges, no polling, draft recovery, failure guards, activation, push persistence, and deployment payload.');

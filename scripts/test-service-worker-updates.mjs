import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const readAsset = name => readFile(new URL(`../GistHub/wwwroot/${name}`, import.meta.url), 'utf8');
const developmentEvents = {};
const developmentSteps = [];
runInNewContext(await readAsset('service-worker.js'), {
  self: {
    addEventListener: (name, handler) => { developmentEvents[name] = handler; },
    skipWaiting: async () => developmentSteps.push('skip waiting'),
    clients: { claim: async () => developmentSteps.push('claimed clients') },
  },
});
assert.equal(developmentEvents.fetch, undefined, 'development must not intercept fetch requests');
for (const name of ['install', 'activate']) {
  await new Promise(resolve => developmentEvents[name]({ waitUntil: resolve }));
}
assert.deepEqual(developmentSteps, ['skip waiting', 'claimed clients']);
const workerSource = await readAsset('service-worker.published.js');
const index = await readAsset('index.html');
const registration = index.match(/<script>\s*(if \('serviceWorker' in navigator\)[\s\S]*?)<\/script>/)[1];

const cacheKeys = new Set(['offline-cache-old', 'unrelated-cache']);
const workerEvents = {};
const steps = [];
const cache = {
  addAll: async () => steps.push('assets cached'),
  add: async () => steps.push('shell cached'),
};
runInNewContext(workerSource, {
  URL, console,
  self: {
    origin: 'https://example.test',
    assetsManifest: { version: 'new', assets: [] },
    importScripts() {},
    addEventListener: (name, handler) => { workerEvents[name] = handler; },
    skipWaiting: async () => steps.push('skip waiting'),
    clients: { claim: async () => steps.push('claimed clients') },
  },
  caches: {
    open: async key => { cacheKeys.add(key); return cache; },
    keys: async () => [...cacheKeys],
    delete: async key => cacheKeys.delete(key),
  },
  Request: class {
    constructor(url, options) { Object.assign(this, { url, ...options }); }
  },
});

const dispatchWorkerEvent = name => new Promise(resolve => workerEvents[name]({ waitUntil: resolve }));
await dispatchWorkerEvent('install');
assert.deepEqual(steps, ['assets cached', 'shell cached', 'skip waiting']);
await dispatchWorkerEvent('activate');
assert.deepEqual([...cacheKeys], ['unrelated-cache', 'offline-cache-new']);
assert.equal(steps.at(-1), 'claimed clients');

let reloads = 0;
let updates = 0;
const workers = new EventTarget();
workers.register = async () => ({ update: async () => { updates++; } });
const document = {
  visibilityState: 'hidden',
  addEventListener(name, handler) {
    assert.equal(name, 'visibilitychange');
    this.changeVisibility = handler;
  },
};
runInNewContext(registration, {
  navigator: { serviceWorker: workers },
  document,
  window: { location: { reload: () => { reloads++; } } },
});
workers.controller = {};
workers.dispatchEvent(new Event('controllerchange'));
assert.equal(reloads, 0, 'first install leaves the page alone');
await document.changeVisibility();
assert.equal(updates, 0);
document.visibilityState = 'visible';
await document.changeVisibility();
assert.equal(updates, 1, 'returning to the app checks for an update');
workers.controller = {};
workers.dispatchEvent(new Event('controllerchange'));
workers.dispatchEvent(new Event('controllerchange'));
assert.equal(reloads, 1, 'an updated worker reloads once');
console.log('PASS: service worker update activates, removes old asset caches, and reloads once.');

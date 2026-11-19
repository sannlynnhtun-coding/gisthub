import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const root = new URL('../GistHub/wwwroot/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
for (const size of [192, 512]) {
  const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
  const png = await readFile(new URL(icon.src, root));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [size, size]);
}

const window = new EventTarget();
const attributes = new Set();
const document = {
  documentElement: {
    toggleAttribute: name => attributes.add(name),
    removeAttribute: name => attributes.delete(name),
  },
};
runInNewContext(await readFile(new URL('js/pwaInstall.js', root), 'utf8'), { window, document, console });

let prompts = 0;
const offerInstall = () => {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = () => { prompts++; };
  window.dispatchEvent(event);
  assert.ok(event.defaultPrevented && attributes.has('data-pwa-install-available'));
};
offerInstall();
await window.gistHubInstallApp();
await window.gistHubInstallApp();
assert.equal(prompts, 1);
assert.equal(attributes.size, 0);

offerInstall();
window.dispatchEvent(new Event('appinstalled'));
await window.gistHubInstallApp();
assert.equal(prompts, 1);
assert.equal(attributes.size, 0);
console.log('PASS: manifest icon sizes and install prompt lifecycle.');

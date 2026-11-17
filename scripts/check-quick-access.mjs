import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { commandIds, validate, read, save, watchVisibility, unwatchVisibility } from '../GistHub/wwwroot/js/quickAccess.js';

const ribbon = await readFile(new URL('../GistHub/Layout/NavMenu.razor', import.meta.url), 'utf8');
assert.deepEqual([...ribbon.matchAll(/new\("([^"]+)", "[^"]+", "[^"]+"\)/g)].map(match => match[1]), commandIds,
  'Backup validation must recognize every ribbon command');
assert.equal(new Set(commandIds).size, commandIds.length);
assert.deepEqual(validate('["json-parser","unknown","json-parser",null]', false), ['json-parser']);
for (const invalid of ['{', '{}', 'null', '[null]', '["unknown"]', '["json-parser","json-parser"]', ' '.repeat(16385)]) {
  assert.throws(() => validate(invalid));
}
assert.throws(() => validate('{}', false));
let stored = null;
globalThis.localStorage = { getItem: () => stored };
globalThis.window = { gistHubBackup: { setPreference(key, value) { assert.equal(key, 'gisthub:quick-access'); stored = value; } } };
assert.deepEqual(read(), []);
save(['sound', 'json-parser']);
assert.deepEqual(read(), ['sound', 'json-parser']);
assert.throws(() => save(['unknown']));
assert.deepEqual(read(), ['sound', 'json-parser']);
window.gistHubBackup.setPreference = () => { throw new Error('Storage denied'); };
assert.throws(() => save(['appearance']), /Storage denied/);
assert.deepEqual(read(), ['sound', 'json-parser']);
const { restoreBackup } = await import('../GistHub/wwwroot/js/localSettings.js');
for (const value of ['{}', '["unknown"]', '["sound","sound"]']) {
  await assert.rejects(restoreBackup(JSON.stringify({format:'gisthub-local-settings',version:1,
    preferences:{'gisthub:quick-access':value},favorites:{},gists:[],groups:[]})), /Quick Access/);
}
console.log('PASS: Quick Access catalog, bounded validation, normalization, saved order, write failures and invalid backup rejection.');

const page = new EventTarget();
globalThis.document = page;
page.hidden = false;
let collapses = 0;
const callback = { invokeMethodAsync(name) { assert.equal(name, 'CollapseWhenInactive'); collapses++; return Promise.resolve(); } };
watchVisibility(callback);
page.dispatchEvent(new Event('visibilitychange'));
assert.equal(collapses, 0, 'An active page must keep its ribbon open');
page.hidden = true;
page.dispatchEvent(new Event('visibilitychange'));
assert.equal(collapses, 1, 'Switching away must collapse the ribbon');
watchVisibility(callback);
page.dispatchEvent(new Event('visibilitychange'));
assert.equal(collapses, 2, 'Remounting must not duplicate listeners');
unwatchVisibility();
page.dispatchEvent(new Event('visibilitychange'));
assert.equal(collapses, 2, 'Disposal must remove the visibility listener');
console.log('PASS: ribbon collapses only on inactivity, with listener replacement and cleanup.');

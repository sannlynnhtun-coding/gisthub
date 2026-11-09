import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../GistHub/wwwroot/js/appShell.js', import.meta.url), 'utf8');
const { tryFocus } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
globalThis.document = { activeElement: null };
globalThis.HTMLElement = class {
    isConnected = true;
    hidden = false;
    disabled = false;
    visible = true;
    closest() { return this.hidden; }
    matches() { return this.disabled; }
    getClientRects() { return this.visible ? [{}] : []; }
    focus() { document.activeElement = this; }
};

assert.equal(tryFocus(null), false);
assert.equal(tryFocus({}), false);
for (const properties of [{ isConnected: false }, { hidden: true }, { disabled: true }, { visible: false }]) {
    document.activeElement = null;
    assert.equal(tryFocus(Object.assign(new HTMLElement(), properties)), false);
    assert.equal(document.activeElement, null);
}
const button = new HTMLElement();
assert.equal(tryFocus(button), true);
assert.equal(document.activeElement, button);
button.focus = () => {};
document.activeElement = null;
assert.equal(tryFocus(button), false);
console.log('PASS: focus restoration skips missing, detached, hidden, inert or disabled triggers.');

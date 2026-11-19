import assert from 'node:assert/strict';
import { registerGlobalSearchShortcut, unregisterGlobalSearchShortcut } from '../GistHub/wwwroot/js/appShell.js';

let handler;
globalThis.document = { addEventListener(_, callback) { handler = callback; }, removeEventListener() {} };
const tabs = Array.from({ length: 9 }, (_, i) => ({ click() { selected = i; }, focus() { focused = i; } }));
let selected = -1, focused = -1;
const parentElement = { querySelectorAll() { return tabs; } };
for (const tab of tabs) Object.assign(tab, { parentElement, closest() { return this; } });
registerGlobalSearchShortcut();
function press(index, key, expected) {
    let prevented = false;
    handler({ target: tabs[index], key, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(selected, expected);
    assert.equal(focused, expected);
}
press(0, 'ArrowDown', 1);
press(0, 'ArrowUp', 8);
press(8, 'ArrowDown', 0);
press(3, 'Home', 0);
press(3, 'End', 8);
press(0, 'ArrowRight', 1);
press(1, 'ArrowLeft', 0);
unregisterGlobalSearchShortcut();
console.log('PASS: vertical sidebar navigation, wrapping, Home/End, and existing horizontal keys.');

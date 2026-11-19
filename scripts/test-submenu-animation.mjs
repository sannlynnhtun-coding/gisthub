import assert from 'node:assert/strict';
import { animateSubmenu } from '../GistHub/wwwroot/js/quickAccess.js';

let reduced = false, frames, options, canceled = 0;
const panel = {
    scrollHeight: 180,
    getBoundingClientRect: () => ({ height: 80 }),
    getAnimations: () => [{ cancel() { canceled++; } }],
    animate(value, timing) { frames = value; options = timing; return { finished: Promise.resolve(), cancel() { canceled++; } }; }
};
globalThis.document = { getElementById: id => id === 'menu' ? panel : null };
globalThis.matchMedia = () => ({ matches: reduced });
await animateSubmenu('menu', true);
assert.equal(panel.inert, false);
assert.equal(frames[0].height, '0px');
assert.equal(frames[1].height, '180px');
assert.equal(options.duration, 320);
assert.equal(canceled, 2, 'Opening cancels previous motion and releases its final fixed height');
await animateSubmenu('menu', false);
assert.equal(panel.inert, true);
assert.equal(frames[0].height, '80px', 'Closing starts from the visible height when interrupted');
assert.equal(frames[1].height, '0px');
reduced = true;
panel.animate = () => { throw Error('Reduced motion must not animate'); };
await animateSubmenu('menu', true);
assert.equal(panel.inert, false);
await animateSubmenu('missing', false);
reduced = false;
panel.animate = () => ({ finished: Promise.reject(Error('Interrupted')), cancel() {} });
await animateSubmenu('menu', false);
console.log('PASS: submenu dimensions, interruption cleanup, inert controls, reduced motion and missing panels.');

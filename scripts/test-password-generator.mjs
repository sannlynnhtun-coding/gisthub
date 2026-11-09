import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../GistHub/wwwroot/js/passwordGenerator.js', import.meta.url), 'utf8');
const { generate } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
for (const length of [4, 20, 128]) {
    for (let i = 0; i < 100; i++) {
        const password = generate('random', length, true, true, true, true);
        assert.equal(password.length, length);
        for (const pattern of [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/]) assert.match(password, pattern);
        assert.match(generate('pin', length, false, false, false, false), new RegExp(`^[0-9]{${length}}$`));
    }
}
for (let mask = 1; mask < 16; mask++) {
    const flags = [1, 2, 4, 8].map(bit => Boolean(mask & bit));
    const password = generate('random', 32, ...flags);
    [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].forEach((pattern, i) => assert.equal(pattern.test(password), flags[i]));
}
for (const length of [3, 129, NaN, 4.5, '20']) assert.throws(() => generate('random', length, true, true, true, true));
assert.throws(() => generate('random', 20, false, false, false, false));
assert.throws(() => generate('invalid', 20, true, true, true, true));
assert.equal(new Set(Array.from({ length: 100 }, () => generate('random', 20, true, true, true, true))).size, 100);
console.log('PASS: passwords, PINs, validation, and fresh output.');

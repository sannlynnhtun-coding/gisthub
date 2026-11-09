import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wordSource = await readFile(new URL('../GistHub/wwwroot/js/passwordWords.js', import.meta.url), 'utf8');
const wordUrl = `data:text/javascript;base64,${Buffer.from(wordSource).toString('base64')}`;
const { words } = await import(wordUrl);
const source = (await readFile(new URL('../GistHub/wwwroot/js/passwordGenerator.js', import.meta.url), 'utf8'))
    .replace("'./passwordWords.js'", JSON.stringify(wordUrl));
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
assert.equal(words.length, 7776);
assert.equal(new Set(words).size, 7776);
assert.ok(words.every(word => /^[a-z]+(?:-[a-z]+)?$/.test(word)));
for (const count of [4, 6, 10]) {
    for (const separator of [' ', '_', '.']) {
        const phrase = generate('memorable', count, false, false, false, false, separator).split(separator);
        assert.equal(phrase.length, count);
        assert.ok(phrase.every(word => words.includes(word)));
    }
}
for (const count of [3, 11, NaN, 6.5, '6']) assert.throws(() => generate('memorable', count));
assert.throws(() => generate('memorable', 6, false, false, false, false, '/'));
const originalRandom = crypto.getRandomValues;
try {
    const samples = [2 ** 32 - 1, 7775, 0, 1, 2];
    crypto.getRandomValues = array => { array[0] = samples.shift(); return array; };
    assert.equal(generate('memorable', 4), [words[7775], words[0], words[1], words[2]].join('-'));
    assert.equal(samples.length, 0, 'biased tail rejected and last word reachable');
} finally { crypto.getRandomValues = originalRandom; }
assert.equal(new Set(Array.from({ length: 100 }, () => generate('memorable', 6))).size, 100);
console.log('PASS: passwords, PINs, memorable word counts/separators, word-list integrity, unbiased selection, invalid settings, and fresh output.');

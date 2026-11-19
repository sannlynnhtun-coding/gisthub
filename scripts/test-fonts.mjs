import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync('GistHub/wwwroot/js/fonts.js', 'utf8');
const backupStateScript = readFileSync('GistHub/wwwroot/js/backupState.js', 'utf8');
const css = readFileSync('GistHub/wwwroot/css/fonts.css', 'utf8') + readFileSync('GistHub/wwwroot/css/font-library.css', 'utf8');
function boot(saved, blocked = false) {
    const storage = { 'gisthub:font': saved, theme: 'dark', 'gisthub:interface-style': 'cruip' };
    const properties = new Map();
    const root = { dataset: {}, style: {
        setProperty(key, value) { properties.set(key, value); },
        removeProperty(key) { properties.delete(key); }
    }};
    const context = { window: {}, document: { documentElement: root }, localStorage: {
        getItem(key) { if (blocked) throw Error('blocked'); return storage[key]; },
        setItem(key, value) { if (blocked) throw Error('blocked'); storage[key] = value; }
    }};
    runInNewContext(backupStateScript + '\n' + source, { ...context, crypto: globalThis.crypto });
    return { window: context.window, root, storage, properties };
}
const app = boot();
const fonts = app.window.getGistHubFonts();
assert.equal(fonts.length, 75);
assert.equal(new Set(fonts.map(f => f.id)).size, 75);
const trending = JSON.parse(readFileSync('GistHub/ThemeSources/google-fonts-trending.json', 'utf8')).fonts;
assert.equal(trending.length, 50);
assert.equal(new Set(trending.map(f => f.id)).size, 50);
assert.deepEqual(trending.map(f => f.rank), Array.from({ length: 50 }, (_, i) => i + 1));
assert.ok(trending.every(f => fonts.some(option => option.id === f.id)));
assert.equal(app.window.getGistHubFont(), 'plus-jakarta-sans');
for (const font of fonts) {
    assert.ok(css.includes(`font-family: '${font.family}'`), font.family);
    app.window.applyGistHubFont(font.id);
    assert.equal(boot(app.storage['gisthub:font']).window.getGistHubFont(), font.id);
    assert.ok(app.properties.get('--font-ui').includes('Noto Sans Myanmar Variable'));
    assert.equal(app.storage.theme, 'dark');
    assert.equal(app.storage['gisthub:interface-style'], 'cruip');
    if (font.group === 'Developer') {
        assert.ok(app.properties.get('--font-code').includes(font.family));
        assert.ok(boot(font.id).properties.get('--font-code').includes(font.family));
    } else assert.ok(!app.properties.has('--font-code'), 'Regular fonts restore the default code font');
}
assert.deepEqual(Array.from(fonts.filter(f => f.group === 'Developer'), f => f.name), [
    'developer-JetBrains Mono', 'developer-Fira Code', 'developer-Geist Mono',
    'developer-Google Sans Code', 'developer-Iosevka', 'developer-Source Code Pro'
]);
app.window.applyGistHubFont('roboto');
app.window.applyGistHubFont('developer-fira-code', false);
assert.equal(app.storage['gisthub:font'], 'roboto');
assert.ok(app.properties.get('--font-code').includes('Fira Code'));
app.window.applyGistHubFont('roboto', false);
assert.ok(!app.properties.has('--font-code'), 'Cancelling a developer preview restores the saved code font');
app.window.applyGistHubFont('lora', false);
assert.equal(app.storage['gisthub:font'], 'roboto');
assert.equal(app.window.getGistHubFont(), 'lora');
app.window.applyGistHubFont('default');
assert.ok(!app.properties.has('--style-heading-font'), 'Default restores style heading typography');
assert.equal(boot('invalid').window.getGistHubFont(), 'plus-jakarta-sans');
assert.doesNotThrow(() => boot('roboto', true).window.applyGistHubFont('lora'));
for (const [, url] of css.matchAll(/url\(([^)]+)\)/g)) {
    const path = new URL(url, new URL('../GistHub/wwwroot/css/fonts.css', import.meta.url));
    assert.ok(existsSync(path));
    assert.equal(readFileSync(path).subarray(0, 4).toString(), path.pathname.endsWith('.otf') ? 'OTTO' : 'wOF2');
}
console.log('PASS: 75 local font choices, persistence, nonpersistent preview, defaults, Burmese fallback, developer code fonts, regular-font code fallback, palette independence and valid WOFF2/OTF assets.');

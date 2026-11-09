import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync('GistHub/wwwroot/js/interface-styles.js', 'utf8');
const backupStateScript = readFileSync('GistHub/wwwroot/js/backupState.js', 'utf8');
function boot(saved, blocked = false) {
    const store = { 'gisthub:interface-style': saved, theme: 'dark' };
    const context = { window: {}, document: { documentElement: { dataset: {} } }, localStorage: {
        getItem(key) { if (blocked) throw Error(); return store[key]; },
        setItem(key, value) { if (blocked) throw Error(); store[key] = value; }
    }};
    runInNewContext(backupStateScript + '\n' + source, { ...context, crypto: globalThis.crypto });
    return { ...context.window, store };
}
assert.equal(boot().getGistHubStyle(), 'default');
assert.equal(boot('obsolete').getGistHubStyle(), 'default');
const app = boot();
assert.equal(app.getGistHubStyles().length, 66);
for (const { id } of app.getGistHubStyles()) {
    app.applyGistHubStyle(id);
    assert.equal(app.getGistHubStyle(), id);
    assert.equal(boot(app.store['gisthub:interface-style']).getGistHubStyle(), id);
    assert.equal(app.store.theme, 'dark');
}
app.applyGistHubStyle('flat');
app.applyGistHubStyle('glassmorphism', false);
assert.equal(app.getGistHubStyle(), 'glassmorphism');
assert.equal(app.store['gisthub:interface-style'], 'flat');
app.applyGistHubStyle('invalid');
assert.equal(app.getGistHubStyle(), 'default');
assert.equal(boot('glassmorphism', true).applyGistHubStyle('flat'), 'flat');
console.log('PASS: 65 styles plus original default, live changes, persistence, palette independence, invalid values and blocked storage.');

const catalogContext = { window: {} };
runInNewContext(readFileSync('GistHub/wwwroot/js/vscode-theme-catalog.js', 'utf8'), catalogContext);
const themeIds = new Set(['light', 'dark', 'boardui-light', 'boardui-dark', ...catalogContext.window.gistHubThemes.map(theme => theme.id)]);
for (const style of app.getGistHubStyles().filter(style => style.id.startsWith('kit-'))) {
    themeIds.add(`${style.id}-light`);
    themeIds.add(`${style.id}-dark`);
}
const styleIds = new Set(app.getGistHubStyles().map(style => style.id));
const pair = boot();
// The picker commit must update its saved palette before closing and rolling back previews.
const presetContext = { window: {
    commitGistHubThemePicker(root, theme) { root.savedTheme = theme; pair.store.theme = theme; }
}, document: { documentElement: { dataset: {} } }, localStorage: {
    getItem(key) { return pair.store[key]; },
    setItem(key, value) { pair.store[key] = value; }
}};
runInNewContext(backupStateScript + '\n' + source, { ...presetContext, crypto: globalThis.crypto });
const picker = { dataset: {} };
assert.equal(presetContext.window.getGistHubStylePresets().length, 27);
for (const preset of presetContext.window.getGistHubStylePresets()) {
    assert.ok(themeIds.has(preset.theme));
    assert.ok(styleIds.has(preset.style));
    presetContext.window.applyGistHubStylePreset(picker, preset.id);
    assert.equal(pair.store.theme, preset.theme);
    assert.equal(picker.dataset.savedStyle, preset.style);
    assert.equal(picker.savedTheme, preset.theme);
    assert.equal(boot(pair.store['gisthub:interface-style']).getGistHubStyle(), preset.style);
}
const lastTheme = pair.store.theme;
presetContext.window.applyGistHubStylePreset(picker, 'invalid');
assert.equal(pair.store.theme, lastTheme);
console.log('PASS: 27 valid style/theme presets save both choices and update the picker rollback target.');

const styleCss = readFileSync('GistHub/wwwroot/css/interface-styles.css', 'utf8') + readFileSync('GistHub/wwwroot/css/design-styles.css', 'utf8');
assert.equal(new Set(app.getGistHubStyles().map(s => s.id)).size, 66);
assert.equal(app.getGistHubStyles().filter(s => s.group === 'More design styles').length, 58);
for (const style of app.getGistHubStyles().filter(s => s.id !== 'default')) {
    assert.ok(styleCss.includes(`[data-interface-style="${style.id}"]`), `Missing visual rules for ${style.id}`);
    assert.ok(style.description.length > 10);
}
console.log('PASS: all catalog entries have visual rules; 58 additions have unique IDs and retain the existing styles.');

const looseleafCss = readFileSync('GistHub/wwwroot/css/looseleaf.css', 'utf8');
assert.doesNotMatch(looseleafCss, /:is\([^{}]*::/, 'Pseudo-elements cannot be placed inside :is(); notebook decorations would disappear.');
for (const weight of ['Regular', 'Bold']) {
    const filename = `KevinSans-${weight}.woff2`;
    assert.ok(looseleafCss.includes(filename));
    assert.equal(readFileSync(`GistHub/wwwroot/fonts/${filename}`).toString('ascii', 0, 4), 'wOF2');
}
assert.ok(readFileSync('GistHub/wwwroot/fonts/Looseleaf-LICENSE.txt', 'utf8').includes('MIT License'));
console.log('PASS: Looseleaf notebook decorations use valid selectors and both local Kevin Sans fonts retain their license.');

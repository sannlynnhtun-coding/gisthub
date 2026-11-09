import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { contrast, hex } from './theme-color-roles.mjs';
const script = readFileSync(new URL('../GistHub/wwwroot/js/theme.js', import.meta.url), 'utf8');
const backupStateScript = readFileSync(new URL('../GistHub/wwwroot/js/backupState.js', import.meta.url), 'utf8');
const catalogScript = readFileSync(new URL('../GistHub/wwwroot/js/vscode-theme-catalog.js', import.meta.url), 'utf8');
const figmaScript = readFileSync(new URL('../GistHub/wwwroot/js/figma-theme-catalog.js', import.meta.url), 'utf8');
const figmaCss = readFileSync(new URL('../GistHub/wwwroot/css/figma-themes.css', import.meta.url), 'utf8');
const css = readFileSync(new URL('../GistHub/wwwroot/css/vscode-themes.css', import.meta.url), 'utf8');
const snapshot = JSON.parse(readFileSync(new URL('../GistHub/ThemeSources/vscode-themes.json', import.meta.url), 'utf8'));
function boot(saved, dark = true, blocked = false, explicitChoice = null) {
    const storage = { theme: saved, 'gisthub:theme-choice': explicitChoice };
    const root = { dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle(_, value) { this.dark = value; }, contains() { return this.dark; } } };
    const window = { matchMedia: () => ({ matches: dark }) };
    const context = { window, document: { documentElement: root, querySelector: () => ({ setAttribute(_, value) { root.chrome = value; } }) },
        localStorage: { getItem(key) { if (blocked) throw Error('disabled'); return storage[key] ?? null; }, setItem(key, value) { if (blocked) throw Error('disabled'); storage[key] = value; } } };
    runInNewContext(catalogScript, context);
    runInNewContext(figmaScript, context);
    runInNewContext(backupStateScript + '\n' + script, { ...context, crypto: globalThis.crypto });
    return { window, root, saved: () => storage.theme, explicit: () => storage['gisthub:theme-choice'] };
}
const catalog = boot(null).window.getGistHubThemes();
assert.equal(catalog.length, 175);
assert.equal(new Set(catalog.map(theme => theme.id)).size, 175);
assert.equal(catalog.filter(theme => theme.id.startsWith('vscode-')).length, 100);
assert.equal(catalog.filter(theme => theme.id.startsWith('figma-') && theme.name.startsWith('Figma-')).length, 53);
assert.equal(boot(null, false).window.getGistHubTheme(), 'light');
assert.equal(boot(null, true).window.getGistHubTheme(), 'dark');
const halloween = catalog.find(theme => theme.id === 'vscode-kobber-spooky-halloween-theme-halloween').id;
for (const systemDark of [false, true]) {
    const migrated = boot(halloween, systemDark);
    assert.equal(migrated.saved(), systemDark ? 'dark' : 'light', 'Old automatic Halloween defaults must be reset');
    assert.equal(migrated.explicit(), null, 'Startup must not pretend the user selected a theme');
    migrated.window.applyGistHubTheme(halloween);
    assert.equal(boot(migrated.saved(), systemDark, false, migrated.explicit()).window.getGistHubTheme(), halloween, 'An explicit Halloween selection must persist');
}
for (const systemDark of [false, true]) {
    const app = boot(catalog.find(theme => theme.id.startsWith('vscode-')).id, systemDark);
    app.window.applyGistHubTheme(app.window.getGistHubDefaultTheme());
    assert.equal(app.saved(), systemDark ? 'dark' : 'light');
    assert.equal(boot(app.saved(), systemDark).window.getGistHubTheme(), app.saved());
}
for (const sort of ['trendingWeekly', 'installs']) {
    const themes = snapshot.themes.filter(theme => theme.sort === sort);
    assert.deepEqual(themes.map(theme => theme.rank), Array.from({ length: 50 }, (_, i) => i + 1));
    assert.ok(themes.every(theme => theme.rankingUrl === `https://vscodethemes.com/?sort=${sort}`));
}
for (const theme of catalog) {
    if (theme.id.startsWith('vscode-')) assert.ok(css.includes(`:root[data-theme="${theme.id}"]`));
    if (theme.id.startsWith('figma-')) assert.ok(figmaCss.includes(`:root[data-theme="${theme.id}"]`));
    const app = boot(theme.id, true, false, theme.id);
    assert.equal(app.window.getGistHubTheme(), theme.id);
    assert.equal(app.window.isDarkThemeActive(), theme.dark);
    assert.equal(app.root.chrome, theme.chrome);
    const next = catalog.find(other => other.id !== theme.id);
    app.window.applyGistHubTheme(next.id, false);
    assert.equal(app.saved(), theme.id, 'Preview must not change storage');
    app.window.applyGistHubTheme(next.id);
    assert.equal(boot(app.saved(), true, false, app.explicit()).window.getGistHubTheme(), next.id);
}
for (const obsolete of ['ocean', 'forest', 'rose', 'hljs-github', 'invalid']) {
    const app = boot(obsolete);
    assert.ok(catalog.some(theme => theme.id === app.saved()), 'Removed choices must migrate to a valid theme');
}
assert.equal(boot(null, false).window.isDarkThemeActive(), false);
const blocked = boot(null, true, true);
blocked.window.applyGistHubTheme(catalog[1].id);
assert.equal(blocked.window.getGistHubTheme(), catalog[1].id);
assert.ok(css.includes('.neo-code-window'));
assert.ok(css.includes('.json-token-string'));
assert.ok(!css.includes('hljs-github'));
console.log('PASS: original Light/Dark defaults, 100 VS Code and 53 Figma palettes, preview rollback, saved selections, removed-theme migration, and blocked storage.');

const libraryCss = readFileSync(new URL('../GistHub/wwwroot/css/design-styles.css', import.meta.url), 'utf8');
function hslHex(value) {
    const [h, s, l] = value.match(/[\d.]+/g).map(Number);
    const a = s / 100 * Math.min(l / 100, 1 - l / 100);
    return hex([0, 8, 4].map(n => {
        const k = (n + h / 30) % 12;
        return 255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    }));
}
const libraryThemes = catalog.filter(theme => theme.id.startsWith('kit-'));
assert.equal(libraryThemes.length, 18);
for (const theme of libraryThemes) {
    const declaration = libraryCss.split(`:root[data-theme="${theme.id}"]{`)[1]?.split('}')[0];
    assert.ok(declaration, `Missing palette for ${theme.id}`);
    const tokens = Object.fromEntries([...declaration.matchAll(/--([\w-]+):([^;]+);/g)].map(([, key, value]) => [key, value]));
    for (const [fg, bg, minimum] of [['foreground', 'background', 4.5], ['foreground', 'card', 4.5],
        ['muted-foreground', 'muted', 4.5], ['primary-foreground', 'primary', 4.5],
        ['destructive-foreground', 'destructive', 4.5], ['accent-foreground', 'accent', 4.5],
        ['ring', 'background', 3], ['input', 'card', 3]]) {
        assert.ok(contrast(hslHex(tokens[fg]), hslHex(tokens[bg])) >= minimum, `${theme.id}: ${fg}/${bg} contrast`);
    }
    assert.ok(catalog.some(other => other.id === theme.id.replace(/-(light|dark)$/, theme.dark ? '-light' : '-dark')));
}
assert.ok(libraryCss.includes('@media (prefers-reduced-motion: reduce)'));
console.log('PASS: all nine library presets have light/dark pairs, readable text, visible inputs/focus, and reduced-motion rules.');

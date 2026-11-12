const categories = ['themes', 'styles', 'presets', 'fonts'];
export function validateAppearance(json, catalogs) {
    if (new TextEncoder().encode(json).length > 256 * 1024) throw new Error('Appearance JSON must be 256 KiB or smaller.');
    const value = JSON.parse(json);
    const object = item => item !== null && typeof item === 'object' && !Array.isArray(item);
    const fields = ['format', 'version', 'theme', 'style', 'font', 'favorites'];
    if (!object(value) || fields.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !fields.includes(key)) || value.format !== 'gisthub-appearance' || value.version !== 1)
        throw new Error('Choose GistHub appearance JSON version 1.');
    const valid = (id, category) => typeof id === 'string' && id.length <= 256 && catalogs[category].some(item => item.id === id);
    for (const [key, category] of [['theme', 'themes'], ['style', 'styles'], ['font', 'fonts']])
        if (!valid(value[key], category)) throw new Error(`Unknown ${key}.`);
    if (!object(value.favorites) || Object.keys(value.favorites).some(key => !categories.includes(key))) throw new Error('Invalid appearance favorites.');
    for (const category of categories) {
        const ids = value.favorites[category];
        if (!Array.isArray(ids) || ids.length > 5000 || !ids.every(id => valid(id, category))) throw new Error(`Invalid ${category} favorites.`);
        value.favorites[category] = [...new Set(ids)];
    }
    return value;
}
function catalogs() {
    return { themes: window.getGistHubThemes(), styles: window.getGistHubStyles(), fonts: window.getGistHubFonts(), presets: window.getGistHubStylePresets() };
}
export async function exportAppearance(root) {
    const { getFavorites } = await import('./localSettings.js');
    return JSON.stringify({ format: 'gisthub-appearance', version: 1, theme: root.dataset.savedTheme,
        style: root.dataset.savedStyle, font: root.dataset.savedFont, favorites: getFavorites() }, null, 2);
}
export function commitAppearance(root, value) {
    const updates = { theme: value.theme, 'gisthub:theme-choice': value.theme,
        'gisthub:interface-style': value.style, 'gisthub:font': value.font,
        'gisthub:appearance-favorites': JSON.stringify(value.favorites) };
    const previous = Object.fromEntries(Object.keys(updates).map(key => [key, localStorage.getItem(key)]));
    const saved = { ...root.dataset };
    const render = (theme, style, font) => {
        window.applyGistHubFont(font, false);
        window.applyGistHubStyle(style, false);
        window.applyGistHubTheme(theme, false);
    };
    try {
        for (const [key, text] of Object.entries(updates)) localStorage.setItem(key, text);
        render(value.theme, value.style, value.font);
        root.dataset.savedTheme = value.theme;
        root.dataset.savedStyle = value.style;
        root.dataset.savedFont = value.font;
        root.dispatchEvent(new Event('appearance-imported'));
    } catch (error) {
        root.dataset.savedTheme = saved.savedTheme;
        root.dataset.savedStyle = saved.savedStyle;
        root.dataset.savedFont = saved.savedFont;
        let rollbackFailed = false;
        for (const [key, text] of Object.entries(previous)) {
            try { if (text === null) localStorage.removeItem(key); else localStorage.setItem(key, text); }
            catch { rollbackFailed = true; }
        }
        try { render(saved.savedTheme, saved.savedStyle, saved.savedFont); } catch { rollbackFailed = true; }
        if (rollbackFailed) throw new Error('Import failed and browser storage prevented full recovery. Check your appearance settings.');
        throw error;
    }
    // Mark preferences changed only after all writes and rendering succeed.
    if (Object.entries(updates).some(([key, text]) => previous[key] !== text)) window.gistHubBackup.changed();
    return value;
}
export function importAppearance(root, json) {
    return commitAppearance(root, validateAppearance(json, catalogs()));
}

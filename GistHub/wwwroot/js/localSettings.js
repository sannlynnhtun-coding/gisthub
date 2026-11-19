import { getAllItems, restoreLocalMetadata } from './indexedDb.js';
import { validate as validateQuickAccess } from './quickAccess.js';

const favoritesKey = 'gisthub:appearance-favorites';
const categories = ['themes', 'styles', 'presets', 'fonts'];
const preferenceKeys = ['theme', 'gisthub:theme-choice', 'gisthub:interface-style', 'gisthub:font',
    'button-sounds-enabled', 'gisthub:sidebar-visible', 'gisthub:files-blurred',
    'gisthub:profile-tools-visible', 'gisthub:markdown-cards-draft', 'gisthub:quick-access', 'gisthub:workspace-layout'];
const isPreference = key => preferenceKeys.includes(key) || /^gisthub:tool-category:tools-category-[a-z-]+$/.test(key);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.length > 0;
const isIdentifier = value => isText(value) && value.length <= 256;

function validateFavorites(value) {
    if (!isObject(value) || Object.keys(value).some(key => !categories.includes(key))) throw new Error('Invalid appearance favorites.');
    return Object.fromEntries(categories.map(category => {
        const ids = value[category] ?? [];
        if (!Array.isArray(ids) || ids.length > 5000 || !ids.every(isIdentifier)) throw new Error('Invalid appearance favorites.');
        return [category, [...new Set(ids)]];
    }));
}

export function getFavorites() {
    try { return validateFavorites(JSON.parse(localStorage.getItem(favoritesKey) || '{}')); }
    catch { return validateFavorites({}); }
}

export function toggleFavorite(category, id) {
    if (!categories.includes(category) || !isIdentifier(id)) throw new Error('Choose an appearance to favorite.');
    const favorites = getFavorites();
    favorites[category] = favorites[category].includes(id)
        ? favorites[category].filter(value => value !== id) : [...favorites[category], id];
    window.gistHubBackup.setPreference(favoritesKey, JSON.stringify(validateFavorites(favorites)));
}

function parseBackup(json) {
    if (new TextEncoder().encode(json).length > 5 * 1024 * 1024) throw new Error('Local settings backups must be 5 MB or smaller.');
    let backup;
    try { backup = JSON.parse(json); } catch { throw new Error('The backup is not valid JSON.'); }
    if (!isObject(backup) || backup.format !== 'gisthub-local-settings' || backup.version !== 1) throw new Error('Choose a supported GistHub local settings backup.');
    if (!isObject(backup.preferences)) throw new Error('The preferences are missing.');
    for (const [key, value] of Object.entries(backup.preferences)) {
        if (!isPreference(key) || typeof value !== 'string') throw new Error('The backup contains an unsupported preference.');
        if (key === 'gisthub:workspace-layout') {
            if (!['excel', 'admin'].includes(value)) throw new Error('Invalid workspace layout.');
        } else if (key === 'gisthub:quick-access') {
            validateQuickAccess(value);
        } else if (key === 'gisthub:markdown-cards-draft') {
            if (new TextEncoder().encode(value).length > 128 * 1024) throw new Error('The Markdown Cards draft is too large.');
        } else if (['theme', 'gisthub:theme-choice', 'gisthub:interface-style', 'gisthub:font'].includes(key)) {
            if (!isIdentifier(value)) throw new Error('Invalid appearance preference.');
        } else if (!['true', 'false'].includes(value)) throw new Error('Invalid local preference.');
    }
    backup.favorites = validateFavorites(backup.favorites);
    if (!Array.isArray(backup.gists) || !Array.isArray(backup.groups)) throw new Error('The bookmark or playlist settings are missing.');
    const seen = new Set();
    for (const gist of backup.gists) {
        if (!isObject(gist) || !isIdentifier(gist.id) || !/^[a-z0-9_-]+$/i.test(gist.id) ||
            typeof gist.username !== 'string' || !/^[a-z0-9-]{1,39}$/.test(gist.username) ||
            typeof gist.isBookmarked !== 'boolean' || !Number.isSafeInteger(gist.bookmarkOrder) || gist.bookmarkOrder < 0 ||
            !Array.isArray(gist.collectionNames) || !gist.collectionNames.every(name => isText(name) && name.trim() === name) ||
            !Array.isArray(gist.tags) || !gist.tags.every(isText)) throw new Error('Invalid account-scoped gist settings.');
        const key = `${gist.username}:${gist.id}`;
        if (seen.has(key)) throw new Error('The backup contains duplicate gist settings.');
        seen.add(key);
    }
    for (const group of backup.groups) {
        if (!isObject(group) || !isText(group.name) || group.name.trim() !== group.name) throw new Error('Invalid playlist settings.');
    }
    return backup;
}

export async function createBackup() {
    const preferences = {};
    for (const key of Object.keys(localStorage).filter(isPreference)) preferences[key] = localStorage.getItem(key);
    const gists = (await getAllItems('gists'))
        .filter(gist => gist.isBookmarked || gist.collectionNames?.length || gist.collectionName || gist.tags?.length)
        .sort((a, b) => (a.bookmarkOrder > 0 ? a.bookmarkOrder : Infinity) - (b.bookmarkOrder > 0 ? b.bookmarkOrder : Infinity) ||
            Date.parse(b.updated_at) - Date.parse(a.updated_at))
        .map(gist => ({ id: gist.id, username: gist.cacheOwnerUsername, isBookmarked: !!gist.isBookmarked,
            bookmarkOrder: gist.bookmarkOrder || 0,
            collectionNames: [...new Set([...(gist.collectionNames || []), gist.collectionName].filter(Boolean))], tags: gist.tags || [] }));
    const groups = (await getAllItems('groups')).map(({ name }) => ({ name }));
    const json = JSON.stringify({ format: 'gisthub-local-settings', version: 1, exportedAtUtc: new Date().toISOString(),
        preferences, favorites: getFavorites(), gists, groups }, null, 2);
    parseBackup(json);
    return json;
}

export async function inspectBackup(json) {
    const backup = parseBackup(json);
    const keys = new Set((await getAllItems('gists')).map(gist => gist.storageKey));
    return { preferences: Object.keys(backup.preferences).length,
        favorites: Object.values(backup.favorites).reduce((count, ids) => count + ids.length, 0),
        bookmarks: backup.gists.filter(gist => gist.isBookmarked).length, groups: backup.groups.length,
        missing: backup.gists.filter(gist => !keys.has(`${gist.username}:${gist.id}`)).length };
}

export async function restoreBackup(json) {
    const backup = parseBackup(json);
    const favorites = getFavorites();
    for (const category of categories) favorites[category] = [...new Set([...favorites[category], ...backup.favorites[category]])];
    const updates = { ...backup.preferences, [favoritesKey]: JSON.stringify(validateFavorites(favorites)) };
    const previous = Object.fromEntries(Object.keys(updates).map(key => [key, localStorage.getItem(key)]));
    try {
        for (const [key, value] of Object.entries(updates)) localStorage.setItem(key, value);
        const result = await restoreLocalMetadata(backup.gists, backup.groups);
        if (Object.entries(updates).some(([key, value]) => previous[key] !== value)) window.gistHubBackup.changed();
        return result;
    } catch (error) {
        for (const key of Object.keys(previous)) localStorage.removeItem(key);
        for (const [key, value] of Object.entries(previous)) if (value !== null) localStorage.setItem(key, value);
        throw error;
    }
}

export async function downloadBackup() {
    const revision = window.gistHubBackup.revision();
    const json = await createBackup();
    const filename = `gisthub-local-settings-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await window.downloadTextFile(filename, json, 'application/json');
    // shortcut: browsers cannot confirm a download was saved, use a confirmed file-save API if that guarantee is needed.
    window.gistHubBackup.downloaded(revision);
}

const reminders = new WeakMap();
export function watchReminder(element) {
    const update = () => { element.hidden = !window.gistHubBackup.pending(); };
    reminders.set(element, update);
    window.addEventListener('gisthub:backup-changed', update);
    window.addEventListener('storage', update);
    update();
    element.dataset.backupReady = 'true';
}

export function unwatchReminder(element) {
    const update = reminders.get(element);
    window.removeEventListener('gisthub:backup-changed', update);
    window.removeEventListener('storage', update);
    reminders.delete(element);
}

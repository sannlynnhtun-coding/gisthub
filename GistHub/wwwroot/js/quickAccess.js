const key = 'gisthub:quick-access';
export const commandIds = ["my-collection", "new-snippet", "playlists", "slh-collection", "discovery", "trending", "agent-skills", "tools-guide", "visual-studio-shortcuts", "password-generator", "cron-expression", "json-parser", "json-to-table", "base64", "markdown-live-preview", "markdown-to-docx", "markdown-to-cards", "markdown-converters", "markdown-to-text", "diagram-editor", "mermaid-to-image", "formula-to-image", "html-to-image", "code-image", "youtube-downloader", "local-settings", "appearance", "sound"];

export function validate(json, strict = true) {
    if (typeof json !== 'string' || new TextEncoder().encode(json).length > 16 * 1024) throw new Error('Invalid Quick Access preference.');
    const ids = JSON.parse(json);
    if (!Array.isArray(ids) || (strict && (ids.length > commandIds.length ||
        ids.some(id => !commandIds.includes(id)) || new Set(ids).size !== ids.length))) throw new Error('Invalid Quick Access commands.');
    return [...new Set(ids.filter(id => commandIds.includes(id)))];
}

export function read() {
    return validate(localStorage.getItem(key) ?? '[]', false);
}

export function save(ids) {
    const json = JSON.stringify(ids);
    validate(json);
    window.gistHubBackup.setPreference(key, json);
}

let visibilityHandler;
export function watchVisibility(callback) {
    unwatchVisibility();
    visibilityHandler = () => {
        if (document.hidden) callback.invokeMethodAsync('CollapseWhenInactive');
    };
    document.addEventListener('visibilitychange', visibilityHandler);
}

export function unwatchVisibility() {
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
}

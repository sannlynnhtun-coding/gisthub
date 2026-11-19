const key = 'gisthub:quick-access';
const retiredCommandId = 'youtube-downloader';
export const commandIds = ["home", "my-collection", "new-snippet", "playlists", "slh-collection", "discovery", "trending", "agent-skills", "tools-guide", "visual-studio-shortcuts", "password-generator", "cron-expression", "json-parser", "json-to-table", "base64", "markdown-live-preview", "markdown-to-docx", "markdown-to-cards", "markdown-converters", "markdown-to-text", "diagram-editor", "mermaid-to-image", "formula-to-image", "html-to-image", "code-image", "local-settings", "appearance", "sound"];

export function validate(json, strict = true) {
    if (typeof json !== 'string' || new TextEncoder().encode(json).length > 16 * 1024) throw new Error('Invalid Quick Access preference.');
    const ids = JSON.parse(json);
    if (!Array.isArray(ids) || (strict && (ids.length > commandIds.length + 1 ||
        ids.some(id => id !== retiredCommandId && !commandIds.includes(id)) || new Set(ids).size !== ids.length))) throw new Error('Invalid Quick Access commands.');
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

export async function animateSubmenu(id, opening) {
    const panel = document.getElementById(id);
    if (!panel) return;
    const startHeight = panel.getBoundingClientRect().height;
    for (const animation of panel.getAnimations()) animation.cancel();
    panel.inert = !opening;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = panel.animate([
        { height: `${opening ? 0 : startHeight}px`, opacity: opening ? 0 : 1 },
        { height: `${opening ? panel.scrollHeight : 0}px`, opacity: opening ? 1 : 0 }
    ], { duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
    try { await animation.finished; } catch { return; }
    if (opening) animation.cancel();
}

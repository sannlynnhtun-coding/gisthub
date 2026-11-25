import { mountToaster, toast } from './vendor/ding/index.js';

// Shared by Blazor and browser exports. Never include clipboard contents or tokens.
const theme = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light';
mountToaster({ position: 'bottom-right', theme: theme() });
toast.configure({ sound: false });
window.gistHubNotify = (type, message) => {
    try {
        (toast[type] ?? toast.info)(message, { duration: type === 'error' ? 8000 : 3000 });
    } catch (error) {
        console.debug('Notification unavailable', error);
    }
};
new MutationObserver(() => toast.configure({ theme: theme() }))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

// Observe actual clipboard promises, including image exports from utility modules.
const clipboard = navigator.clipboard;
for (const method of ['write', 'writeText', 'read', 'readText']) {
    if (!clipboard?.[method]) continue;
    const original = clipboard[method].bind(clipboard);
    try {
        clipboard[method] = async (...args) => {
            try {
                const result = await original(...args);
                window.gistHubNotify('success', method.startsWith('write') ? 'Copied to clipboard' : 'Clipboard read');
                return result;
            } catch (error) {
                window.gistHubNotify('error', 'Clipboard access failed');
                throw error;
            }
        };
    } catch { /* Some browsers expose read-only clipboard methods. */ }
}

document.addEventListener('paste', event => {
    const target = event.target;
    if (target instanceof Element && target.closest('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), [contenteditable="true"]')) {
        // Input fires after the browser or the editor has applied the pasted text.
        target.addEventListener('input', () => window.gistHubNotify('success', 'Pasted'), { once: true, signal: AbortSignal.timeout(100) });
    }
}, true);

// Programmatic exports and ordinary download links both dispatch a click.
document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[download]') : null;
    if (link) queueMicrotask(() => {
        if (!event.defaultPrevented) window.gistHubNotify('success', 'Download started');
    });
}, true);

const confirmAction = window.confirm.bind(window);
window.confirm = (...args) => {
    const confirmed = confirmAction(...args);
    window.gistHubNotify('info', confirmed ? 'Confirmed' : 'Cancelled');
    return confirmed;
};

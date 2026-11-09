let searchShortcutHandler = null;
const focusTrapHandlers = new WeakMap();

export function downloadBytes(filename, bytes) {
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function registerGlobalSearchShortcut() {
    unregisterGlobalSearchShortcut();
    searchShortcutHandler = (event) => {
        const tab = event.target.closest?.('.workspace-tabs [role="tab"]');
        if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
            const index = tabs.indexOf(tab);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
                (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next].click();
            tabs[next].focus();
            return;
        }
        if (event.repeat || event.altKey || event.shiftKey) return;
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;

        event.preventDefault();
        document.querySelector("[data-global-search-trigger]")?.click();
    };
    document.addEventListener("keydown", searchShortcutHandler, true);
}

export function unregisterGlobalSearchShortcut() {
    if (searchShortcutHandler) {
        document.removeEventListener("keydown", searchShortcutHandler, true);
    }
    searchShortcutHandler = null;
}

export function activateFocusTrap(element) {
    if (!element || focusTrapHandlers.has(element)) return;

    const handler = (event) => {
        if (event.key !== "Tab") return;

        const focusable = Array.from(element.querySelectorAll(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])'
        )).filter((candidate) => candidate.getClientRects().length > 0);

        if (focusable.length === 0) {
            event.preventDefault();
            element.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    focusTrapHandlers.set(element, handler);
    element.addEventListener("keydown", handler);
}

export function deactivateFocusTrap(element) {
    const handler = element ? focusTrapHandlers.get(element) : null;
    if (!handler) return;

    element.removeEventListener("keydown", handler);
    focusTrapHandlers.delete(element);
}

export function tryFocus(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected ||
        element.closest('[hidden], [inert]') || element.matches(':disabled') ||
        element.getClientRects().length === 0) return false;
    element.focus();
    return document.activeElement === element;
}

export function scrollElementIntoView(elementId) {
    document.getElementById(elementId)?.scrollIntoView({ block: "nearest" });
}

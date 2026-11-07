let searchShortcutHandler = null;
const focusTrapHandlers = new WeakMap();
const toolCategoryStates = new WeakMap();
const savedToolCategoryStates = new Map();
const initializedToolCategories = new WeakSet();

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

export function scrollElementIntoView(elementId) {
    document.getElementById(elementId)?.scrollIntoView({ block: "nearest" });
}

function saveToolCategoryState(category, expanded) {
    const key = `gisthub:tool-category:${category.getAttribute('aria-labelledby')}`;
    savedToolCategoryStates.set(key, expanded);
    try {
        window.gistHubBackup.setPreference(key, String(expanded));
    } catch {
        // The in-memory preference remains available when storage is blocked.
    }
}

export function setAllToolCategories(dialog, expanded) {
    for (const category of dialog.querySelectorAll('[data-tools-category]')) {
        category.open = expanded;
        // Explicit bulk choices also become the state restored after clearing search.
        if (toolCategoryStates.has(category)) toolCategoryStates.set(category, expanded);
        saveToolCategoryState(category, expanded);
    }
}

function updateToolCategoryCount(category) {
    const count = Array.from(category.querySelectorAll('.neo-toolbar-menu-item'))
        .filter(tool => !tool.hidden).length;
    const badge = category.querySelector('[data-tools-category-count]');
    badge.textContent = String(count);
    badge.setAttribute('aria-label', `${count} ${count === 1 ? 'tool' : 'tools'}`);
    return count;
}

export function restoreToolCategories(dialog) {
    for (const category of dialog.querySelectorAll('[data-tools-category]')) {
        updateToolCategoryCount(category);
        if (initializedToolCategories.has(category)) continue;
        initializedToolCategories.add(category);
        const key = `gisthub:tool-category:${category.getAttribute('aria-labelledby')}`;
        let saved = savedToolCategoryStates.get(key);
        try {
            const stored = localStorage.getItem(key);
            if (stored === 'true' || stored === 'false') saved = stored === 'true';
        } catch {
            // Keep remembering choices for this session if storage is unavailable.
        }
        if (typeof saved === 'boolean') category.open = saved;
        category.addEventListener('toggle', () => {
            // Searching expands categories temporarily without changing browsing preferences.
            if (toolCategoryStates.has(category)) return;
            saveToolCategoryState(category, category.open);
        });
    }
}

export function filterTools(dialog, query) {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const tools = Array.from(dialog.querySelectorAll('.neo-toolbar-menu-item'));
    let visible = 0;
    for (const tool of tools) {
        const text = tool.textContent.toLocaleLowerCase();
        tool.hidden = !terms.every(term => text.includes(term));
        if (!tool.hidden) visible++;
    }
    for (const category of dialog.querySelectorAll('[data-tools-category]')) {
        if (terms.length) {
            if (!toolCategoryStates.has(category)) toolCategoryStates.set(category, category.open);
            category.open = true;
        } else if (toolCategoryStates.has(category)) {
            category.open = toolCategoryStates.get(category);
            toolCategoryStates.delete(category);
        }
        category.hidden = updateToolCategoryCount(category) === 0;
    }
    dialog.querySelector('[data-tools-empty]').hidden = visible > 0;
    dialog.querySelector('#tools-search-status').textContent = terms.length
        ? `${visible} ${visible === 1 ? 'tool' : 'tools'} found`
        : '';
    dialog.querySelector('#tools-results').scrollTop = 0;
}

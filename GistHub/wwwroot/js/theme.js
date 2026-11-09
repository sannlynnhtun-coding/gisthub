// Apply before Blazor starts so reloads keep the selected page palette.
(() => {
    const catalog = [
        { id: 'light', name: 'Light', dark: false, chrome: '#FFD524', primary: '#ffd524', secondary: '#78dce8', source: 'GistHub · Default' },
        { id: 'dark', name: 'Dark', dark: true, chrome: '#24242F', primary: '#c6a344', secondary: '#609ba3', source: 'GistHub · Default' },
        { id: 'boardui-light', name: 'BoardUI Light', dark: false, chrome: '#ffffff', primary: '#2563eb', secondary: '#f7f7f7', source: 'BoardUI-inspired · boardui.com' },
        { id: 'boardui-dark', name: 'BoardUI Dark', dark: true, chrome: '#121212', primary: '#60a5fa', secondary: '#262626', source: 'BoardUI-inspired · boardui.com' },
        ...(window.gistHubThemes ?? []),
        ...(window.gistHubFigmaThemes ?? [])
    ];
    const themes = Object.fromEntries(catalog.map(entry => [entry.id, entry]));
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = systemDark ? 'dark' : 'light';
    window.getGistHubDefaultTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    window.getGistHubThemes = () => catalog;
    window.getGistHubTheme = () => document.documentElement.dataset.theme;
    window.isDarkThemeActive = () => document.documentElement.classList.contains('dark');
    window.applyGistHubTheme = (theme, persist = true) => {
        if (!Object.hasOwn(themes, theme)) theme = defaultTheme;
        if (!theme) return;
        const palette = themes[theme];
        document.documentElement.classList.add('theme-switching');
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle('dark', palette.dark);
        document.documentElement.style.colorScheme = palette.dark ? 'dark' : 'light';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.chrome);
        // Flush the palette with transitions disabled, then restore normal hover effects.
        void document.documentElement.offsetHeight;
        document.documentElement.classList.remove('theme-switching');
        if (persist) {
            try {
                window.gistHubBackup.setPreference('theme', theme);
                window.gistHubBackup.setPreference('gisthub:theme-choice', theme);
            } catch { /* Storage can be disabled. */ }
        }
    };
    let stored;
    let explicitChoice;
    try {
        stored = localStorage.getItem('theme');
        explicitChoice = localStorage.getItem('gisthub:theme-choice');
    } catch { /* Use the system preference. */ }
    // The earlier catalog saved its first entry automatically, without a user selection.
    const legacyAutoDefault = stored === 'vscode-kobber-spooky-halloween-theme-halloween' && explicitChoice !== stored;
    const initial = stored && Object.hasOwn(themes, stored) && !legacyAutoDefault ? stored : defaultTheme;
    window.applyGistHubTheme(initial, false);
    try { localStorage.setItem('theme', initial); } catch { /* Storage can be disabled. */ }
})();


window.initializeGistHubThemePicker = async (root) => {
    const { getFavorites, toggleFavorite } = await import(new URL('js/localSettings.js', document.baseURI).href);
    const panel = root.querySelector('[popover]');
    const trigger = root.querySelector('.neo-theme-trigger');
    const search = panel.querySelector('input');
    const list = panel.querySelector('[role="listbox"]');
    const tabs = [...panel.querySelectorAll('[data-appearance-tab]')];
    const allOptions = [...list.querySelectorAll('[data-appearance-kind]')];
    const favoriteButton = panel.querySelector('[data-appearance-favorite]');
    const favoritesOnly = panel.querySelector('[data-appearance-favorites-only]');
    const favoriteError = panel.querySelector('[data-appearance-error]');
    const optionId = option => option.dataset.presetOption ?? option.dataset.fontOption ?? option.dataset.styleOption ?? option.dataset.themeOption;
    const selectedOption = () => allOptions.find(option => option.dataset.appearanceKind === category &&
        (category === 'themes' ? option.dataset.themeOption === root.dataset.savedTheme :
         category === 'styles' ? option.dataset.styleOption === root.dataset.savedStyle :
         category === 'fonts' ? option.dataset.fontOption === root.dataset.savedFont :
         option.dataset.styleOption === root.dataset.savedStyle && option.dataset.themeOption === root.dataset.savedTheme));
    let category = 'themes';
    const options = () => allOptions.filter(option => !option.hidden);
    const restore = () => {
        window.applyGistHubFont(root.dataset.savedFont, false);
        window.applyGistHubStyle(root.dataset.savedStyle, false);
        window.applyGistHubTheme(root.dataset.savedTheme, false);
    };
    const filter = () => {
        const query = search.value.trim().toLocaleLowerCase();
        const favorites = getFavorites();
        allOptions.forEach(option => {
            const favorite = favorites[option.dataset.appearanceKind].includes(optionId(option));
            option.dataset.favorite = String(favorite);
            option.hidden = option.dataset.appearanceKind !== category || !option.dataset.searchText.toLocaleLowerCase().includes(query) || (favoritesOnly.checked && !favorite);
        });
        const selected = selectedOption();
        const isFavorite = !!selected && favorites[category].includes(optionId(selected));
        favoriteButton.disabled = !selected;
        favoriteButton.setAttribute('aria-pressed', String(isFavorite));
        favoriteButton.textContent = selected
            ? `${isFavorite ? '★ Unfavorite' : '☆ Favorite'} ${selected.querySelector('.neo-theme-option__name').firstChild.textContent.trim()}`
            : 'Select a preset to favorite';
        list.querySelectorAll('[data-appearance-group]').forEach(group => {
            group.hidden = ![...group.querySelectorAll('[data-appearance-kind]')].some(option => !option.hidden);
        });
        const count = options().length;
        panel.querySelector('.neo-appearance-count').textContent = `${count} ${count === 1 ? category.slice(0, -1) : category}`;
        panel.querySelector('.neo-theme-panel__empty').hidden = count !== 0;
        list.scrollTop = 0;
    };
    favoritesOnly.addEventListener('change', () => { restore(); filter(); });
    favoriteButton.addEventListener('click', () => {
        const selected = selectedOption();
        if (!selected) return;
        try {
            toggleFavorite(category, optionId(selected));
            favoriteError.hidden = true;
            filter();
        } catch {
            favoriteError.textContent = 'Favorites could not be saved. Check that browser storage is available.';
            favoriteError.hidden = false;
        }
    });
    const changeCategory = tab => {
        category = tab.dataset.appearanceTab;
        tabs.forEach(button => {
            button.setAttribute('aria-selected', String(button === tab));
            button.tabIndex = button === tab ? 0 : -1;
        });
        panel.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby', tab.id);
        search.setAttribute('aria-label', `Search ${category}`);
        search.placeholder = `Search ${category}…`;
        list.setAttribute('aria-label', `Available ${category}`);
        search.value = '';
        restore();
        filter();
    };
    tabs.forEach(tab => tab.addEventListener('click', () => {
        changeCategory(tab);
        search.focus();
    }));
    const preview = event => {
        const option = event.target.closest('[data-appearance-kind]');
        if (!option || option.hidden) return;
        window.applyGistHubFont(option.dataset.fontOption ?? root.dataset.savedFont, false);
        window.applyGistHubStyle(option.dataset.styleOption ?? root.dataset.savedStyle, false);
        window.applyGistHubTheme(option.dataset.themeOption ?? root.dataset.savedTheme, false);
    };
    panel.addEventListener('pointerover', preview);
    panel.addEventListener('focusin', preview);
    panel.addEventListener('pointerleave', restore);
    panel.addEventListener('toggle', event => {
        trigger.setAttribute('aria-expanded', String(event.newState === 'open'));
        if (event.newState === 'closed') restore();
        else {
            search.value = '';
            filter();
            search.focus({ preventScroll: true });
        }
    });
    search.addEventListener('input', () => { restore(); filter(); });
    search.addEventListener('focus', restore);
    root.addEventListener('keydown', event => {
        if (event.key === 'Escape' && panel.matches(':popover-open')) {
            event.preventDefault();
            panel.hidePopover();
            restore();
            trigger.focus();
            return;
        }
        const tab = event.target.closest('[data-appearance-tab]');
        if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const index = tabs.indexOf(tab);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
                (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            changeCategory(tabs[next]);
            tabs[next].focus();
            return;
        }
        if (event.target === trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            panel.showPopover();
            search.focus();
            return;
        }
        if (!panel.contains(event.target) || (event.target !== search && !event.target.closest('[data-appearance-kind]'))) return;
        const visible = options();
        if (event.target === search && event.key === 'Enter') {
            event.preventDefault();
            visible[0]?.click();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) &&
                   (event.target !== search || event.key.startsWith('Arrow'))) {
            event.preventDefault();
            if (!visible.length) return;
            const index = visible.indexOf(document.activeElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 :
                index < 0 ? (event.key === 'ArrowDown' ? 0 : visible.length - 1) :
                (index + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length;
            visible[next].focus();
            visible[next].scrollIntoView({ block: 'nearest' });
        }
    });
    filter();
    root.dataset.appearanceReady = 'true';
};
window.commitGistHubThemePicker = (root, theme) => {
    root.dataset.savedTheme = theme;
    window.applyGistHubFont(root.dataset.savedFont, false);
    window.applyGistHubStyle(root.dataset.savedStyle, false);
    window.applyGistHubTheme(theme);
    root.querySelector('[popover]').hidePopover();
    root.querySelector('.neo-theme-trigger').focus();
};
window.commitGistHubAppearancePicker = (root, style, theme) => {
    root.dataset.savedStyle = style;
    window.applyGistHubStyle(style);
    window.commitGistHubThemePicker(root, theme);
};
window.closeGistHubThemePicker = (root) => {
    window.applyGistHubFont(root.dataset.savedFont, false);
    window.applyGistHubStyle(root.dataset.savedStyle, false);
    window.applyGistHubTheme(root.dataset.savedTheme, false);
    root.querySelector('[popover]').hidePopover();
};

window.commitGistHubFontPicker = (root, font) => {
    root.dataset.savedFont = window.applyGistHubFont(font);
    window.commitGistHubThemePicker(root, root.dataset.savedTheme);
};

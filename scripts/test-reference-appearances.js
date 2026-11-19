async function testReferenceAppearances() {
    const root = document.querySelector('.neo-theme-picker');
    const panel = root.querySelector('[popover]');
    const saved = { ...root.dataset };
    const check = (ok, message) => { if (!ok) throw Error(message); };
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const open = () => { if (!panel.matches(':popover-open')) panel.showPopover(); };
    try {
        for (const style of ['boardui', 'kit-bencho', 'kit-beui-pro', 'kit-obsidian']) {
            for (const mode of ['light', 'dark']) {
                const id = `${style}-${mode}`;
                const preset = window.getGistHubStylePresets().find(p => p.id === id);
                open();
                root.querySelector('[data-appearance-tab="presets"]').click();
                const option = root.querySelector(`[data-preset-option="${id}"]`);
                check(option && !option.hidden, `${id} must be discoverable`);
                option.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
                check(document.documentElement.dataset.font === preset.font, `${id} previews its font`);
                window.closeGistHubThemePicker(root);
                check(document.documentElement.dataset.font === root.dataset.savedFont, `${id} cancels its font preview`);
                open();
                option.click();
                for (let frame = 0; frame < 30 && panel.matches(':popover-open'); frame++) await settle();
                check(root.dataset.savedFont === preset.font && localStorage.getItem('gisthub:font') === preset.font, `${id} commits font`);
                check(document.documentElement.dataset.theme === preset.theme && document.documentElement.dataset.interfaceStyle === preset.style, `${id} commits complete appearance`);
                check(localStorage.getItem('theme') === preset.theme && localStorage.getItem('gisthub:interface-style') === preset.style, `${id} persists choices`);
                window.commitGistHubFontPicker(root, 'roboto');
                open();
                root.querySelector('[data-appearance-tab="presets"]').click();
                check(root.querySelector('[data-appearance-favorite]').disabled, `${id} with a custom font is no longer an exact preset match`);
                check(getComputedStyle(document.body).fontFamily.includes('Roboto'), `${id} allows individual font customization`);
            }
        }
        return 'PASS: eight preset modes, coordinated previews/commit/persistence, cancellation and custom font matching.';
    } finally {
        root.dataset.savedFont = window.applyGistHubFont(saved.savedFont);
        root.dataset.savedStyle = window.applyGistHubStyle(saved.savedStyle);
        window.commitGistHubThemePicker(root, saved.savedTheme);
    }
}

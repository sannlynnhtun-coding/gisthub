async function testObsidianShell() {
    const root = document.querySelector('.neo-theme-picker');
    const preset = window.getGistHubStylePresets().find(p => p.id === 'kit-obsidian-dark');
    const check = (ok, message) => { if (!ok) throw Error(message); };
    check(preset.font === 'geist', 'Dashboard shell preset uses Geist');
    window.applyGistHubStylePreset(root, preset.id);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    check(getComputedStyle(document.body).backgroundColor === 'rgb(22, 22, 22)', 'Measured #161616 background');
    check(getComputedStyle(document.querySelector('.admin-portal')).fontFamily.includes('Geist'), 'Geist is rendered');
    if (innerWidth >= 768) {
        check(Math.abs(document.querySelector('.portal-sidebar').getBoundingClientRect().width - 200) < 1, 'Measured 200px sidebar');
        check(Math.abs(document.querySelector('.excel-topbar').getBoundingClientRect().height - 58) < 1, 'Measured 58px header');
    }
    const selected = document.querySelector('.workspace-tabs button[data-workspace-category][aria-expanded="true"]');
    check(getComputedStyle(selected).borderRadius === '0px', 'Square workspace navigation corners');
    check(selected.getBoundingClientRect().height === (matchMedia('(pointer: coarse)').matches ? 44 : 32), 'Compact rows retain accessible touch targets');
    check(document.documentElement.scrollWidth <= innerWidth, 'No document horizontal overflow');
    return 'PASS: measured Obsidian shell palette, typography, geometry, selection and overflow.';
}

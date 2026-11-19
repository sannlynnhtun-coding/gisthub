async function testWorkspaceLayouts() {
    const check = (ok, message) => { if (!ok) throw Error(message); };
    const settle = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const choose = async value => {
        const select = document.querySelector('[aria-label="Workspace layout"]');
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        for (let i = 0; i < 60 && (localStorage.getItem('gisthub:workspace-layout') !== value || !!document.querySelector('.admin-portal') !== (value === 'admin')); i++) await settle();
        check(localStorage.getItem('gisthub:workspace-layout') === value, 'Layout choice persists');
    };
    await choose('excel');
    check(document.querySelector('.excel-workspace') && document.querySelectorAll('.workspace-tabs [role="tab"]').length === 9, 'Original Excel ribbon restored');
    const setItem = Storage.prototype.setItem;
    try {
        Storage.prototype.setItem = function(key, value) { if (key === 'gisthub:workspace-layout') throw Error('Storage denied'); return setItem.call(this, key, value); };
        const select = document.querySelector('[aria-label="Workspace layout"]');
        select.value = 'admin'; select.dispatchEvent(new Event('change', { bubbles: true }));
        for (let i = 0; i < 60 && !document.querySelector('.workspace-layout-error'); i++) await settle();
        check(document.querySelector('.excel-workspace') && select.value === 'excel', 'Failed save keeps layout and chooser consistent');
        check(localStorage.getItem('gisthub:workspace-layout') === 'excel', 'Failed save preserves previous preference');
    } finally { Storage.prototype.setItem = setItem; }
    await choose('admin');
    const settings = await import('/js/localSettings.js');
    const backup = JSON.parse(await settings.createBackup());
    check(backup.preferences['gisthub:workspace-layout'] === 'admin', 'Backup includes layout');
    await settings.inspectBackup(JSON.stringify(backup));
    backup.preferences['gisthub:workspace-layout'] = 'invalid-layout';
    let rejected = false;
    try { await settings.inspectBackup(JSON.stringify(backup)); } catch (error) { rejected = error.message.includes('Invalid workspace layout'); }
    check(rejected, 'Restore rejects unsupported layouts');
    const data = document.querySelector('#workspace-tab-Data');
    data.click(); await settle();
    const group = document.getElementById(data.getAttribute('aria-controls'));
    check(!group.hidden && group.querySelector('[data-testid="json-parser-menu-item"]'), 'Data children belong below Data parent');
    check(data.nextElementSibling === group, 'Dropdown is directly after its parent');
    data.click();
    for (let i = 0; i < 60 && !group.hidden; i++) await settle();
    check(group.hidden && data.getAttribute('aria-expanded') === 'false', 'Parent toggles its dropdown closed');
    document.querySelector('#workspace-tab-Markdown').click(); await settle();
    check(document.querySelector('#workspace-submenu-Markdown [data-testid="markdown-live-preview-menu-item"]'), 'Markdown shows only related child commands');
    check(group.hidden, 'Previous parent stays closed');
    await choose('excel');
    check(document.querySelector('#workspace-commands [data-testid="markdown-live-preview-menu-item"]'), 'Switching layout preserves selected category');
    await choose('admin');
    check(document.querySelector('#workspace-submenu-Markdown [data-testid="markdown-live-preview-menu-item"]'), 'Switching back preserves dropdown contents');
    return 'PASS: Excel/Admin selection, local persistence, parent dropdowns and preserved command selection.';
}

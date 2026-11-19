async function testSidebarToggle() {
    const check = (ok, message) => { if (!ok) throw Error(message); };
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const sidebar = document.querySelector('#portal-navigation');
    const selected = sidebar.querySelector('[data-workspace-category][aria-expanded="true"]').id;
    const content = document.querySelector('.neo-canvas');
    const finishMotion = () => Promise.all([...document.querySelector('.admin-portal').getAnimations(), ...sidebar.getAnimations()].map(a => a.finished.catch(() => {})));
    const originalWidth = content.getBoundingClientRect().width;
    sidebar.querySelector('.portal-sidebar-collapse').click();
    for (let i = 0; i < 30 && !document.querySelector('.is-sidebar-collapsed'); i++) await settle();
    check(sidebar.inert, 'Hidden controls become inert immediately');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        check(document.querySelector('.admin-portal').getAnimations().some(a => a.effect.getTiming().duration === 320), 'Grid width animates for 320ms');
        check(sidebar.getAnimations().some(a => a.transitionProperty === 'transform'), 'Sidebar slides together with content resize');
    } else {
        check(document.querySelector('.admin-portal').getAnimations().length === 0 && sidebar.getAnimations().length === 0, 'Reduced motion skips animation');
    }
    await finishMotion();
    const restore = document.querySelector('.excel-workspace-title .portal-sidebar-toggle');
    check(getComputedStyle(sidebar).visibility === 'hidden', 'Sidebar hides');
    check(content.getBoundingClientRect().width > originalWidth + 190, 'Content expands into sidebar space');
    check(restore.getAttribute('aria-label') === 'Show sidebar' && restore.getAttribute('aria-expanded') === 'false', 'Visible restore control describes collapsed state');
    check(document.activeElement === restore, 'Focus leaves the hidden sidebar');
    restore.click();
    for (let i = 0; i < 30 && document.querySelector('.is-sidebar-collapsed'); i++) await settle();
    await finishMotion();
    check(getComputedStyle(sidebar).visibility === 'visible' && !sidebar.inert, 'Sidebar reopens');
    check(sidebar === document.querySelector('#portal-navigation'), 'Sidebar stays mounted');
    check(sidebar.querySelector('[data-workspace-category][aria-expanded="true"]').id === selected, 'Selected menu survives');
    check(Math.abs(content.getBoundingClientRect().width - originalWidth) < 1, 'Original content width returns');
    return 'PASS: sidebar hide/restore, expanded content, focus, labels and preserved selection.';
}

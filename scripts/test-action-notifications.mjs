import assert from 'node:assert/strict';

// Run against an isolated browser context; uses the existing UI test harness.
export async function checkActionNotifications({ evaluate, waitFor }) {
    await waitFor(`typeof window.gistHubNotify === 'function'`, 'Ding bridge');
    const result = await evaluate(`(async () => {
        const text = () => document.querySelector('.tst-viewport').textContent;
        const db = await import('./js/indexedDb.js');
        const id = crypto.randomUUID();
        await db.saveItem('groups', { id, name: 'Notification test' });
        const save = text();
        await db.deleteItem('groups', id);
        const remove = text();
        const input = document.createElement('textarea');
        document.body.append(input);
        input.dispatchEvent(new Event('paste', { bubbles: true }));
        input.value = 'test';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const paste = text();
        input.remove();
        const dark = document.documentElement.classList.contains('dark');
        document.documentElement.classList.toggle('dark', !dark);
        await new Promise(resolve => setTimeout(resolve, 50));
        const theme = document.querySelector('.tst-viewport').dataset.tstTheme;
        document.documentElement.classList.toggle('dark', dark);
        return { save, remove, paste, theme, expectedTheme: dark ? 'light' : 'dark',
            regions: document.querySelectorAll('.tst-viewport').length };
    })()`);
    assert.match(result.save, /Saved/);
    assert.match(result.remove, /Deleted/);
    assert.match(result.paste, /Pasted/);
    assert.equal(result.theme, result.expectedTheme);
    assert.equal(result.regions, 1);
    console.log('PASS: Ding local actions, paste, single mount, and app theme.');
}

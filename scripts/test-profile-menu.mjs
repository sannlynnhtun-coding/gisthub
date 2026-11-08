import assert from 'node:assert/strict';

export async function checkProfileMenu({ evaluate, send, sessionId, waitFor }) {
  await waitFor(`!!document.querySelector('.excel-topbar .profile-avatar')`, 'profile control', 60000);
  assert.equal(await evaluate(`document.querySelector('.excel-topbar .profile-avatar').getAttribute('aria-label')`), 'Sign in');
  await evaluate(`(async () => { await (await import('/js/indexedDb.js')).saveItem('profiles', {id:'profile-menu-test', name:'Full Profile Name', githubUsername:'profile-user', accessToken:'not-a-real-token', bio:''}); })()`);
  await send('Page.reload', {}, sessionId);
  await waitFor(`!!document.querySelector('[aria-label="Open profile menu"]')`, 'authenticated avatar', 60000);
  assert.equal(await evaluate(`document.querySelectorAll('.workspace-account').length`), 0);
  for (const width of [1280, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width < 600}, sessionId);
    await send('Page.bringToFront', {}, sessionId);
    await evaluate(`document.querySelector('[aria-label="Open profile menu"]').focus(); document.querySelector('[aria-label="Open profile menu"]').click()`);
    await waitFor(`document.querySelector('#profile-dropdown').matches(':popover-open')`, 'profile dropdown');
    assert.equal(await evaluate(`document.querySelector('.profile-dropdown-identity strong').textContent`), 'Full Profile Name');
    assert.equal(await evaluate(`document.querySelector('.profile-dropdown-identity span').textContent`), '@profile-user');
    assert.equal(await evaluate(`document.querySelector('.profile-dropdown > .profile-section-label').textContent`), 'Currently in');
    assert.equal(await evaluate(`document.querySelector('.profile-accounts').getAttribute('href')`), 'login');
    assert.equal(await evaluate(`document.querySelector('.profile-signout').textContent`), 'Log out');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('#profile-dropdown')).borderTopLeftRadius`), '18px');
    assert.equal(await evaluate(`Math.round(document.querySelector('.profile-current-account > img').getBoundingClientRect().width)`), 80);
    assert.ok(await evaluate(`document.querySelector('#profile-dropdown').getBoundingClientRect().right <= innerWidth`));
    assert.ok(await evaluate(`document.querySelector('.profile-avatar').getBoundingClientRect().right > innerWidth - 50`), 'avatar is at the top right');
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27}, sessionId);
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27}, sessionId);
    await waitFor(`!document.querySelector('#profile-dropdown').matches(':popover-open')`, 'Escape dismisses dropdown');
  }
  await evaluate(`document.querySelector('[aria-label="Open profile menu"]').click()`);
  await evaluate(`document.querySelector('.profile-signout').click()`);
  await waitFor(`!!document.querySelector('#logout-confirm-title') && !document.querySelector('#profile-dropdown').matches(':popover-open')`, 'existing sign-out confirmation');
  await evaluate(`Array.from(document.querySelectorAll('[aria-labelledby="logout-confirm-title"] button')).find(button => button.textContent === 'Cancel').click()`);
  await waitFor(`!document.querySelector('#logout-confirm-title') && document.activeElement?.getAttribute('aria-label') === 'Open profile menu'`, 'cancel preserves session and restores avatar focus');
  await evaluate(`document.querySelector('[aria-label="Open profile menu"]').click()`);
  await evaluate(`document.querySelector('.profile-signout').click()`);
  await waitFor(`!!document.querySelector('#logout-confirm-title')`, 'confirm sign out');
  await evaluate(`document.querySelector('[aria-labelledby="logout-confirm-title"] .btn-destructive').click()`);
  await waitFor(`location.pathname === '/login' && !!document.querySelector('.neo-login-screen')`, 'signed out');
  await waitFor(`document.querySelector('.neo-login-screen').textContent.includes('Full Profile Name')`, 'saved profile is retained');
  console.log('PASS: top-right avatar, full identity dropdown, mobile bounds, Escape, cancel focus and sign out without deleting saved profiles.');
}

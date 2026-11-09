import assert from 'node:assert/strict';

export async function checkGistCopy({ evaluate, send, sessionId, waitFor }) {
  await waitFor(`Boolean(document.querySelector('#workspace-tab-View'))`, 'app ready', 60000);
  await evaluate(`(async()=>{
    const db=await import('/js/indexedDb.js');
    await db.saveItem('profiles',{id:'copy-profile',name:'Copy Test',githubUsername:'copy-user',accessToken:'browser-test-token'});
    await db.saveItem('gists',{id:'copy-gist',storageKey:'copy-user:copy-gist',cacheOwnerUsername:'copy-user',description:'Copy test',files:{'test.txt':{filename:'test.txt',content:'Copy this text'}},created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',tags:[],collectionNames:[],isSynced:true});
  })()`);
  await send('Page.navigate', { url: new URL('/my-gists', await evaluate('location.href')).href }, sessionId);
  const button = `document.querySelector('[aria-label="Copy raw content"]')`;
  await waitFor(`Boolean(${button})`, 'gist-card copy button', 60000);
  await evaluate(`window.originalCopyIcon=${button}.querySelector('.lucide-copy');window.copyToClipboard=async text=>{window.copiedText=text;return window.copyAllowed!==false}`);
  const visible = kind => `(()=>{const icon=${button}.querySelector('.lucide-${kind}');return icon && getComputedStyle(icon).display!=='none' && icon.getBoundingClientRect().width>0 && icon.getBBox().width>0})()`;
  const liquidGlass = await evaluate(`window.getGistHubThemes().find(theme=>theme.name.startsWith('Liquid Glass')).id`);
  const copiedContrast = `(() => {
    const style = getComputedStyle(${button});
    const luminance = color => {
      const values = color.match(/[\\d.]+/g).slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
  })()`;
  const gruvbox = await evaluate(`window.getGistHubThemes().find(theme=>theme.name === 'Gruvbox Material Dark').id`);
  for (const theme of ['light', 'dark', liquidGlass, gruvbox]) {
    await evaluate(`window.applyGistHubTheme('${theme}')`);
    const position = await evaluate(`(() => { const rect = ${button}.getBoundingClientRect(); return {x:rect.x + rect.width / 2, y:rect.y + rect.height / 2}; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...position }, sessionId);
    for (let attempt = 0; attempt < 2; attempt++) {
      await evaluate(`${button}.click()`);
      await waitFor(visible('check'), 'visible copy confirmation');
      await waitFor(`${copiedContrast} >= 4.5`, 'readable copy confirmation contrast');
      assert.equal(await evaluate(visible('copy')), false);
      assert.equal(await evaluate(`window.copiedText`), 'Copy this text');
      await waitFor(visible('copy'), 'copy icon restored after feedback');
      assert.equal(await evaluate(visible('check')), false);
      assert.equal(await evaluate(`${button}.querySelector('.lucide-copy')===window.originalCopyIcon`), true, 'The original copy icon must remain mounted across feedback changes');
      assert.equal(await evaluate(`${button}.querySelector('[role="status"]').textContent`), 'Copy Raw');
    }
  }
  await evaluate(`window.copyAllowed=false;${button}.click()`);
  await waitFor(`document.body.textContent.includes('Could not copy. Focus this page')`, 'failed clipboard feedback');
  assert.equal(await evaluate(visible('copy')), true);
  assert.equal(await evaluate(visible('check')), false);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  assert.equal(await evaluate(visible('copy')), true);
  assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`), false);
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  console.log('PASS: gist-card copy/check/reset visibility and contrast while hovered, persistent SVG nodes, repeated copying in Light/Dark/Liquid Glass/Gruvbox themes, clipboard failure, and mobile layout.');
}

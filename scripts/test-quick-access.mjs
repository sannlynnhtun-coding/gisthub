import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

export async function checkQuickAccess({ evaluate, send, sessionId, waitFor }) {
  const key = 'gisthub:quick-access';
  const origin = await evaluate('location.origin');
  const tab = async name => {
    await evaluate(`if(document.querySelector('.admin-portal') && innerWidth<768 && document.querySelector('.portal-menu-toggle')?.getAttribute('aria-expanded')==='false')document.querySelector('.portal-menu-toggle').click()`);
    await waitFor(`!document.querySelector('.admin-portal') || innerWidth>=768 || document.querySelector('.portal-menu-toggle')?.getAttribute('aria-expanded')==='true'`, 'workspace navigation visible');
    await evaluate(`document.querySelector('#workspace-tab-${name}').click()`);
    await waitFor(`document.querySelector('#workspace-tab-${name}').getAttribute('aria-selected')==='true'`, name);
  };
  const ready = `document.querySelector('[data-quick-access-toggle]') && !document.querySelector('[data-quick-access-toggle]').disabled`;
  const reload = async () => {
    await send('Page.navigate', {url:origin+'/discovery'}, sessionId);
    await waitFor(ready, 'loaded ribbon preferences', 60000);
  };
  const order = () => evaluate(`JSON.parse(localStorage.getItem('${key}') || '[]')`);
  const visible = () => evaluate(`Array.from(document.querySelectorAll('.ribbon-command'),e=>e.dataset.commandId)`);
  const settled = () => waitFor(`!document.querySelector('[data-quick-access-toggle]')?.disabled`, 'preference saved');
  const toggle = async id => {
    const before = await evaluate(`localStorage.getItem('${key}')`);
    await evaluate(`document.querySelector('[data-quick-access-toggle="${id}"]').click()`);
    await waitFor(`localStorage.getItem('${key}') !== ${JSON.stringify(before)}`, 'membership saved');
    await settled();
  };
  const move = async (id, direction) => {
    const before = await evaluate(`localStorage.getItem('${key}')`);
    await evaluate(`document.querySelector('[data-command-id="${id}"] [title="Move ${direction}"]').click()`);
    await waitFor(`localStorage.getItem('${key}') !== ${JSON.stringify(before)} || document.querySelector('.quick-access-status').textContent.includes('could not be saved')`, 'reorder completed');
    await settled();
  };
  const drag = async (source, target, cancel = false) => {
    await evaluate(`document.querySelector('[data-command-id="${source}"] [draggable]').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:new DataTransfer()}))`);
    await waitFor(`document.querySelector('.workspace-ribbon').dataset.dragging==='${source}'`, 'drag started');
    if (cancel) await evaluate(`document.querySelector('[data-command-id="${source}"] [draggable]').dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:new DataTransfer()}))`);
    if (cancel) await waitFor(`!document.querySelector('.workspace-ribbon').dataset.dragging`, 'drag cancelled');
    await evaluate(`document.querySelector('[data-command-id="${target}"]').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}))`);
    await waitFor(`!document.querySelector('.workspace-ribbon').dataset.dragging`, 'drop handled');
    await settled();
  };
  const original = await evaluate(`localStorage.getItem('${key}')`);
  try {
    await evaluate(`localStorage.removeItem('${key}')`);
    await reload();
    assert.equal(await evaluate(`document.querySelector('#workspace-tab-Home').getAttribute('aria-selected')`), 'true');
    assert.equal(await evaluate(`document.querySelector('#workspace-commands').hidden`), true);
    await tab('QuickAccess');
    assert.match(await evaluate(`document.querySelector('#workspace-commands').textContent`), /Add commands/);
    await tab('Home'); await toggle('my-collection');
    await tab('Data'); await toggle('json-parser');
    await tab('Markdown'); await toggle('markdown-live-preview');
    assert.deepEqual(await order(), ['my-collection','json-parser','markdown-live-preview']);
    await tab('QuickAccess');
    assert.deepEqual(await visible(), await order());
    const target = (await send('Target.getTargetInfo', {}, sessionId)).targetInfo.targetId;
    const other = (await send('Target.createTarget', {url:'about:blank'})).targetId;
    try {
      await send('Target.activateTarget', {targetId:other});
      await waitFor(`document.hidden && document.querySelector('#workspace-commands').hidden`, 'inactive page collapses ribbon');
    } finally {
      await send('Target.closeTarget', {targetId:other});
      await send('Target.activateTarget', {targetId:target});
    }
    await waitFor(`!document.hidden`, 'original browser tab active');
    assert.equal(await evaluate(`document.querySelector('#workspace-commands').hidden`), true, 'returning stays collapsed');
    await tab('QuickAccess');
    await drag('markdown-live-preview','my-collection');
    assert.deepEqual(await order(), ['markdown-live-preview','my-collection','json-parser']);
    await drag('json-parser','json-parser');
    await drag('json-parser','markdown-live-preview',true);
    await evaluate(`document.querySelector('[data-command-id="markdown-live-preview"]').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}))`);
    assert.deepEqual(await order(), ['markdown-live-preview','my-collection','json-parser']);
    await move('json-parser','earlier');
    assert.deepEqual(await order(), ['markdown-live-preview','json-parser','my-collection']);
    await move('markdown-live-preview','later');
    assert.deepEqual(await order(), ['json-parser','markdown-live-preview','my-collection']);
    await reload(); await tab('QuickAccess');
    assert.deepEqual(await visible(), ['json-parser','markdown-live-preview','my-collection']);

    await drag('my-collection','json-parser');
    assert.deepEqual(await order(), ['my-collection','json-parser','markdown-live-preview']);

    await evaluate(`document.querySelector('[data-testid="quick-json-parser-menu-item"]').click()`);
    await waitFor(`Boolean(document.querySelector('.json-parser-overlay'))`, 'pinned overlay');
    await evaluate(`document.querySelector('.json-parser-close').click()`);
    await waitFor(`document.activeElement?.dataset.testid==='quick-json-parser-menu-item'`, 'pinned overlay focus');
    await evaluate(`document.querySelector('[data-testid="quick-markdown-live-preview-menu-item"]').click()`);
    await waitFor(`Boolean(document.querySelector('.tool-workspace-session:not([hidden]) [data-tool-name="Markdown Live Preview"]'))`, 'pinned workspace');
    await evaluate(`document.querySelector('.tool-workspace-session:not([hidden]) .tool-page-header > button').click()`);
    await waitFor(`document.activeElement?.dataset.testid==='quick-markdown-live-preview-menu-item'`, 'pinned workspace focus');

    const beforeFailure = await order();
    await evaluate(`window.quickAccessSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='${key}')throw new Error('Storage denied');return window.quickAccessSetItem.call(this,k,v)}`);
    await move('json-parser','earlier');
    assert.deepEqual(await order(), beforeFailure);
    assert.deepEqual(await visible(), beforeFailure);
    assert.match(await evaluate(`document.querySelector('.quick-access-status').textContent`), /could not be saved/);
    await evaluate(`Storage.prototype.setItem=window.quickAccessSetItem;delete window.quickAccessSetItem`);

    await toggle('json-parser');
    await waitFor(`document.activeElement?.dataset.commandId==='my-collection'`, 'focus after remove');
    assert.deepEqual(await order(), ['my-collection','markdown-live-preview']);
    await tab('Data');
    assert.equal(await evaluate(`document.querySelector('[data-quick-access-toggle="json-parser"]').getAttribute('aria-pressed')`), 'false');
    await toggle('json-parser');
    assert.deepEqual(await order(), ['my-collection','markdown-live-preview','json-parser']);

    await tab('View'); await toggle('appearance'); await toggle('sound'); await toggle('local-settings');
    await tab('QuickAccess');
    await waitFor(`document.querySelector('.neo-theme-picker')?.dataset.appearanceReady==='true'`, 'pinned appearance');
    await evaluate(`document.querySelector('.neo-theme-picker [popover]').showPopover()`);
    assert.equal(await evaluate(`document.querySelector('.neo-theme-picker [popover]').matches(':popover-open')`), true);
    await evaluate(`document.querySelector('.neo-theme-picker [popover]').hidePopover()`);
    const sound = await evaluate(`localStorage.getItem('button-sounds-enabled') !== 'false'`);
    await evaluate(`document.querySelector('[data-sound-toggle]').click()`);
    await waitFor(`localStorage.getItem('button-sounds-enabled') === '${!sound}'`, 'pinned sound');

    await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true},sessionId);
    await evaluate(`if(document.querySelector('.portal-menu-toggle')?.getAttribute('aria-expanded')==='false')document.querySelector('.portal-menu-toggle').click()`);
    assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false, 'narrow ribbon fits');
    await move('json-parser','earlier');
    await send('Emulation.clearDeviceMetricsOverride',{},sessionId);

    await send('Page.bringToFront',{},sessionId);
    await evaluate(`document.querySelector('[data-command-id="json-parser"] [title="Move earlier"]').focus()`);
    assert.equal(await evaluate(`document.activeElement?.getAttribute('aria-label')`),'Move JSON Parser earlier');
    const beforeKeyboard = await order();
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13},sessionId);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},sessionId);
    await waitFor(`localStorage.getItem('${key}') !== ${JSON.stringify(JSON.stringify(beforeKeyboard))}`, 'keyboard reorder');
    await evaluate(`document.querySelector('#workspace-tab-QuickAccess').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35},sessionId);
    await waitFor(`document.activeElement?.id==='workspace-tab-View'`, 'last tab keyboard navigation');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36},sessionId);
    await waitFor(`document.activeElement?.id==='workspace-tab-Home'`, 'first tab keyboard navigation');
    await tab('QuickAccess');
    await evaluate(`document.querySelector('[data-command-id="my-collection"] a').click()`);
    await waitFor(`location.pathname==='/my-gists' && new URL(location.href).searchParams.get('favorites')==='true'`, 'pinned navigation');

    const backup = await evaluate(`(async()=>await (await import('/js/localSettings.js')).createBackup())()`);
    const backedUp = await order();
    assert.deepEqual(JSON.parse(JSON.parse(backup).preferences[key]), backedUp);
    await evaluate(`localStorage.setItem('${key}','[]')`);
    await evaluate(`(async()=>await (await import('/js/localSettings.js')).restoreBackup(${JSON.stringify(backup)}))()`);
    await reload(); await tab('QuickAccess');
    assert.deepEqual(await visible(), backedUp);
    const oldBackup = JSON.parse(backup); delete oldBackup.preferences[key];
    await evaluate(`(async()=>await (await import('/js/localSettings.js')).restoreBackup(${JSON.stringify(JSON.stringify(oldBackup))}))()`);
    assert.deepEqual(await order(), backedUp);
    for (const invalid of ['{}','["unknown"]','["sound","sound"]']) {
      const bad = JSON.parse(backup); bad.preferences[key]=invalid;
      assert.equal(await evaluate(`(async()=>{try{await (await import('/js/localSettings.js')).restoreBackup(${JSON.stringify(JSON.stringify(bad))});return false}catch{return true}})()`),true);
      assert.deepEqual(await order(), backedUp);
    }
    await evaluate(`localStorage.setItem('${key}','["sound","unknown","sound"]')`);
    await reload(); await tab('QuickAccess');
    assert.deepEqual(await visible(), ['sound']);
    await evaluate(`localStorage.setItem('${key}','{')`);
    await reload(); await tab('QuickAccess');
    assert.deepEqual(await visible(), []);
    assert.match(await evaluate(`document.querySelector('.quick-access-status').textContent`), /could not be loaded/);
    assert.equal(await evaluate(`localStorage.getItem('${key}')`), '{', 'bad storage not overwritten on load');
    await tab('Data'); await toggle('json-parser');
    assert.deepEqual(await order(), ['json-parser']);
    await tab('Diagrams');
    await mkdir('artifacts/toolbar-preview', {recursive:true});
    for (const width of [1440, 701, 390]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:835,deviceScaleFactor:1,mobile:false},sessionId);
      await evaluate(`if(document.querySelector('.admin-portal') && innerWidth<768 && document.querySelector('.portal-menu-toggle')?.getAttribute('aria-expanded')==='false')document.querySelector('.portal-menu-toggle').click()`);
      const layout = await evaluate(`(()=>{
        const tabs=[...document.querySelectorAll('.workspace-tabs [role="tab"]')];
        const toggle=document.querySelector('.ribbon-toggle').getBoundingClientRect();
        const commands=[...document.querySelectorAll('.ribbon-command')];
        return {tops:tabs.map(t=>t.getBoundingClientRect().top), overflow:document.documentElement.scrollWidth>innerWidth,
          toggleVisible:toggle.left>=0 && toggle.right<=innerWidth,
          labelOverlap:commands.some(c=>{const b=c.querySelector('.ribbon-tool'),h=c.querySelector('.tool-help-button');return b.getBoundingClientRect().right>h.getBoundingClientRect().left+1}),
          panelHeight:document.querySelector('#workspace-commands').getBoundingClientRect().height,
          ribbonBottom:Math.ceil(document.querySelector('.workspace-ribbon').getBoundingClientRect().bottom)};
      })()`);
      assert.equal(new Set(layout.tops).size,1,'Excel categories remain on one horizontal ribbon');
      assert.equal(layout.overflow,false,`no page overflow at ${width}`);
      assert.equal(layout.toggleVisible,true,'collapse button remains visible');
      assert.equal(layout.labelOverlap,false,`command/help controls do not overlap at ${width}`);
      assert.ok(layout.panelHeight<300,`compact sidebar command panel at ${width}: ${layout.panelHeight}`);
      const screenshot=await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width,height:Math.min(835,layout.ribbonBottom+4),scale:1}},sessionId);
      await writeFile(`artifacts/toolbar-preview/toolbar-${width}.png`,Buffer.from(screenshot.data,'base64'));
    }
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1},sessionId);
    assert.equal(await evaluate(`matchMedia('(pointer: coarse)').matches && [...document.querySelectorAll('.quick-access-actions button, .tool-list-entry > .tool-help-button, .ribbon-toggle')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44 && r.height>=44})`),true,'touch actions keep 44px targets');
    await send('Emulation.setTouchEmulationEnabled',{enabled:false},sessionId);
    await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
    console.log('PASS: Quick Access membership, browser drag/drop, move buttons, persistence, focus, reusable commands, backup, mobile, malformed storage and failed saves.');
  } finally {
    await send('Emulation.setTouchEmulationEnabled',{enabled:false},sessionId);
    await evaluate(`if(window.quickAccessSetItem)Storage.prototype.setItem=window.quickAccessSetItem;${original===null ? `localStorage.removeItem('${key}')` : `localStorage.setItem('${key}',${JSON.stringify(original)})`}`);
    await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  }
}

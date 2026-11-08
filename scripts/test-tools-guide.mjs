import assert from 'node:assert/strict';

export async function checkToolsGuide({evaluate,send,sessionId,waitFor}) {
  await waitFor(`Boolean(document.querySelector('#tools-guide-title'))`, 'the Tools Guide',60000);
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false},sessionId);
  const tools=await evaluate(`Array.from(document.querySelectorAll('[aria-label="Available tools"] article')).map(card=>({name:card.querySelector('h3').textContent,description:card.querySelector('p').textContent,example:card.querySelector('p.text-sm').textContent,href:card.querySelector('a')?.getAttribute('href')||null}))`);
  assert.equal(tools.length,14);
  assert.ok(tools.every(tool=>tool.description.length>30&&tool.example.startsWith('Try it when:')));
  assert.equal(tools.filter(tool=>tool.href).length,10);
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Available tools"] article a, [aria-label="Available tools"] article button').length`),14);
  assert.ok(tools.find(tool=>tool.name==='Formula to Image').description.includes('MathML'));
  assert.ok(tools.find(tool=>tool.name==='YouTube Downloader').description.includes('Start-LocalDownloader.cmd'));
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid="tools-trigger"]').length`), 1);
  assert.equal(await evaluate(`document.querySelector('[data-testid="tools-trigger"]').getAttribute('role')`), 'tab');
  assert.equal(await evaluate(`document.querySelectorAll('#tools-menu, #tools-search').length`), 0);
  const ribbon = await evaluate(`(() => {
    const panel = getComputedStyle(document.querySelector('.workspace-commands'));
    const tab = document.querySelector('.workspace-tabs [aria-selected="true"]');
    return { background: panel.backgroundColor, radius: panel.borderTopLeftRadius,
      underline: getComputedStyle(tab, '::after').backgroundColor,
      icons: document.querySelectorAll('.workspace-command-group .ribbon-command-icon').length };
  })()`);
  assert.equal(ribbon.radius, '8px');
  assert.ok(ribbon.icons > 0, 'ribbon commands have labelled icons');
  const initialTheme = await evaluate(`window.getGistHubTheme()`);
  for (const theme of ['light', 'dark']) {
    await evaluate(`window.applyGistHubTheme('${theme}')`);
    const palette = await evaluate(`(() => {
      const sample = document.createElement('span');
      sample.style.color = 'hsl(var(--card))'; document.body.append(sample);
      const card = getComputedStyle(sample).color;
      sample.style.color = 'hsl(var(--primary))'; const primary = getComputedStyle(sample).color;
      sample.remove();
      return { card, primary, panel: getComputedStyle(document.querySelector('.workspace-commands')).backgroundColor,
        underline: getComputedStyle(document.querySelector('.workspace-tabs [aria-selected="true"]'), '::after').backgroundColor };
    })()`);
    assert.equal(palette.panel, palette.card, `${theme} ribbon follows the app card color`);
    assert.equal(palette.underline, palette.primary, `${theme} ribbon follows the app accent color`);
  }
  await evaluate(`window.applyGistHubTheme(${JSON.stringify(initialTheme)})`);
  await evaluate(`document.querySelector('[data-testid="tools-trigger"]').click()`);
  let toolCount = 0;
  for (const tab of ['Tools', 'Data', 'Markdown', 'Diagrams', 'Media']) {
    await evaluate(`document.querySelector('#workspace-tab-${tab}').click()`);
    await waitFor(`document.querySelector('#workspace-tab-${tab}').getAttribute('aria-selected') === 'true'`, 'tool category tab');
    assert.equal(await evaluate(`document.querySelectorAll('.ribbon-tool-group').length`), 1);
    toolCount += await evaluate(`document.querySelectorAll('.ribbon-tool').length`);
    assert.ok(await evaluate(`document.querySelector('.workspace-ribbon').getBoundingClientRect().height < 160`), 'compact category ribbon');
  }
  assert.equal(toolCount, 15);
  for (const [id, selector] of [
    ['json-parser-menu-item','[aria-labelledby="json-parser-title"]'],
    ['json-to-table-menu-item','.json-table-overlay'],
    ['base64-menu-item','.base64-overlay'],
    ['code-image-menu-item','.code-image-overlay']
  ]) {
    await evaluate(`document.querySelector('#workspace-tab-${id === "code-image-menu-item" ? "Media" : "Data"}').click()`);
    await waitFor(`!!document.querySelector('[data-testid="${id}"]')`, "category command");
    await evaluate(`document.querySelector('[data-testid="${id}"]').click()`);
    await waitFor(`!!document.querySelector('${selector}') && document.querySelector('.neo-app-shell').hasAttribute('inert')`, 'ribbon utility dialog');
    await evaluate(`document.querySelector('${selector}').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
    await waitFor(`!document.querySelector('${selector}') && document.activeElement === document.querySelector('[data-testid="${id}"]')`, 'ribbon utility focus return');
  }
  await evaluate(`document.querySelector('#workspace-tab-Tools').click()`);
  await waitFor(`!!document.querySelector('[data-testid="tools-guide-menu-item"]')`, "Tools category");
  await evaluate(`document.querySelector('[data-testid="tools-guide-menu-item"]').click()`);
  await waitFor(`location.pathname === '/tools'`, 'guide navigation from ribbon');
  for (const [name,selector] of [
    ['JSON Parser','[aria-labelledby="json-parser-title"]'],
    ['JSON to Table','.json-table-overlay'],
    ['Base64 Encode / Decode','.base64-overlay'],
    ['Markdown + Code Converter','.code-image-overlay']
  ]) {
    const trigger = `[aria-label="Open ${name}"]`;
    await evaluate(`document.querySelector(${JSON.stringify(trigger)}).click()`);
    await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)})) && document.querySelector('.neo-app-shell').hasAttribute('inert')`, `${name} dialog with inactive background`);
    assert.equal(await evaluate(`location.pathname`),'/tools');
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
    await waitFor(`!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector('.neo-app-shell').hasAttribute('inert') && document.activeElement === document.querySelector(${JSON.stringify(trigger)})`, `${name} close and focus restoration`);
  }
  await evaluate(`document.querySelector('[aria-label="Open JSON Parser"]').click()`);
  await waitFor(`Boolean(document.querySelector('[aria-labelledby="json-parser-title"]'))`, 'dialog before page navigation');
  await evaluate(`document.querySelector('[aria-label="Open Markdown to Text"]').click()`);
  await waitFor(`Boolean(document.querySelector('#markdown-text-title'))`, 'a tool launched from the guide');
  await evaluate(`document.querySelector('[aria-labelledby="json-parser-title"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await waitFor(`!document.querySelector('[aria-labelledby="json-parser-title"]') && document.activeElement === document.querySelector('[data-testid="tools-trigger"]')`, 'safe focus fallback after leaving the guide');
  await send('Page.navigate',{url:new URL('/tools',await evaluate(`location.href`)).href},sessionId);
  await waitFor(`Boolean(document.querySelector('#tools-guide-title'))`, 'returning to the guide');
  await evaluate(`document.querySelector('[aria-label="Open HTML to Image"]').click()`);
  await waitFor(`document.querySelector('#html-image-preview') && !document.querySelector('#html-image-download').disabled`, 'HTML tool launched from its guide button');
  await evaluate(`document.querySelector('[data-testid="tools-trigger"]').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="tools-guide-menu-item"]'))`, 'guide navigation from the HTML tool');
  await evaluate(`document.querySelector('#workspace-tab-Tools').click()`);
  await waitFor(`!!document.querySelector('[data-testid="tools-guide-menu-item"]')`, "Tools category");
  await evaluate(`document.querySelector('[data-testid="tools-guide-menu-item"]').click()`);
  await waitFor(`Boolean(document.querySelector('#tools-guide-title')) && getComputedStyle(document.querySelector('#blazor-error-ui')).display === 'none'`, 'HTML preview cleanup on navigation');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
  for (const tab of ['Home', 'Discover', 'Tools', 'Data', 'Markdown', 'Diagrams', 'Media', 'View']) {
    await evaluate(`document.querySelector('#workspace-tab-${tab}').click()`);
    await waitFor(`document.querySelector('#workspace-tab-${tab}').getAttribute('aria-selected') === 'true'`, 'mobile category');
    assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false, `${tab} fits mobile`);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.workspace-tabs, .workspace-command-area, .ribbon-tool-items')).some(element => element.scrollWidth > element.clientWidth + 1)`), false, `${tab} has no scrolling menus`);
  }
  await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  console.log('PASS: all 14 guide actions, four shared dialogs, inert background, Escape/focus restoration, direct grouped ribbon commands, page navigation, and mobile layout.');
}

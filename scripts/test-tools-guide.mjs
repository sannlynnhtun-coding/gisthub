import assert from 'node:assert/strict';

export async function checkToolsGuide({evaluate,send,sessionId,waitFor}) {
  await waitFor(`Boolean(document.querySelector('#tools-guide-title'))`, 'the Tools Guide',60000);
  const tools=await evaluate(`Array.from(document.querySelectorAll('[aria-label="Available tools"] article')).map(card=>({name:card.querySelector('h3').textContent,description:card.querySelector('p').textContent,example:card.querySelector('p.text-sm').textContent,href:card.querySelector('a')?.getAttribute('href')||null}))`);
  assert.equal(tools.length,14);
  assert.ok(tools.every(tool=>tool.description.length>30&&tool.example.startsWith('Try it when:')));
  assert.equal(tools.filter(tool=>tool.href).length,10);
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Available tools"] article a, [aria-label="Available tools"] article button').length`),14);
  assert.ok(tools.find(tool=>tool.name==='Formula to Image').description.includes('MathML'));
  assert.ok(tools.find(tool=>tool.name==='YouTube Downloader').description.includes('Start-LocalDownloader.cmd'));
  await evaluate(`document.querySelector('[data-testid="tools-trigger"]').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="tools-guide-menu-item"]'))`, 'the guide modal link');
  await waitFor(`document.activeElement === document.querySelector('#tools-search')`, 'tools search keyboard focus');
  await evaluate(`document.querySelector('[data-testid="tools-guide-menu-item"]').click()`);
  await waitFor(`!document.querySelector('#tools-menu') && location.pathname === '/tools'`, 'guide navigation with closed menu');
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
  await evaluate(`document.querySelector('[data-testid="tools-guide-menu-item"]').click()`);
  await waitFor(`Boolean(document.querySelector('#tools-guide-title')) && getComputedStyle(document.querySelector('#blazor-error-ui')).display === 'none'`, 'HTML preview cleanup on navigation');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`),false);
  await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  console.log('PASS: all 14 guide actions, four shared dialogs, inert background, Escape/focus restoration, page navigation, search focus, and mobile layout.');
}

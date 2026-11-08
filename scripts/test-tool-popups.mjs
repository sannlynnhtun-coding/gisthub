import assert from 'node:assert/strict';

export async function checkToolPopups({evaluate,send,sessionId,waitFor}) {
  const origin = await evaluate('location.origin');
  await send('Page.navigate',{url:origin+'/discovery'},sessionId);
  await waitFor(`!!document.querySelector('#workspace-tab-Tools') && !document.querySelector('.neo-app-shell').hasAttribute('inert')`, 'workspace ready',60000);
  const active = '.tool-page-backdrop:not([hidden]) .tool-page-overlay';
  const opened = async name => {
    await waitFor(`document.querySelector(${JSON.stringify(active)})?.dataset.toolName === ${JSON.stringify(name)}`, name+' popup',60000);
    assert.equal(await evaluate('location.pathname'),'/discovery','ribbon tool does not navigate away');
    assert.equal(await evaluate(`document.querySelector('.neo-app-shell').hasAttribute('inert')`),true);
    assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector(${JSON.stringify(active+' > header > h2')})).fontSize) <= 18`),'compact heading');
  };
  const open = async (tab,id,name) => {
    await evaluate(`document.querySelector('#workspace-tab-${tab}').click()`);
    await waitFor(`!!document.querySelector('[data-testid="${id}"]')`,name+' command');
    await evaluate(`document.querySelector('[data-testid="${id}"]').click()`);
    await opened(name);
  };
  const close = async () => {
    await evaluate(`document.querySelector(${JSON.stringify(active+' > header > button')}).click()`);
    await waitFor(`!document.querySelector(${JSON.stringify(active)}) && !document.querySelector('.neo-app-shell').hasAttribute('inert')`,'return to workspace');
  };
  const type = async (selector,value) => {
    await waitFor(`document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`,'editable tool',60000);
    await evaluate(`(() => {const input=document.querySelector(${JSON.stringify(selector)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  };

  // Every routed workbench uses the same popup host; each instance is created only once.
  const drafts = [
    ['Markdown','markdown-live-preview-menu-item','Markdown Live Preview','#markdown-live-source','# Live draft မြန်မာ'],
    ['Markdown','markdown-docx-menu-item','Markdown to DOCX','#docx-source','# Word draft မြန်မာ'],
    ['Markdown','markdown-text-menu-item','Markdown to Text','#markdown-text-source','# Plain draft မြန်မာ'],
    ['Markdown','markdown-cards-menu-item','Markdown to Cards','#cards-source','# Cards draft မြန်မာ'],
    ['Media','html-image-menu-item','HTML to Image','#html-image-source','<h1>Local HTML draft</h1>'],
    ['Diagrams','mermaid-image-menu-item','Mermaid to Image','#mermaid-source','graph TD; Draft-->Safe'],
    ['Diagrams','formula-image-menu-item','Formula to Image','#formula-source','x^2 + y^2']
  ];
  for (const [tab,id,name,selector,value] of drafts) {
    await open(tab,id,name); await type(selector,value); await close();
    assert.equal(await evaluate(`document.activeElement?.dataset.testid`),id,'focus returns to ribbon launcher');
  }
  for (const [tab,id,name,selector,value] of drafts) {
    await open(tab,id,name);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),value,name+' draft survives closing and switching tools');
    await close();
  }
  await open('Tools','agent-skills-menu-item','AI Tools & Skills');
  await type('#skills-search','markdown'); await close();
  await open('Tools','agent-skills-menu-item','AI Tools & Skills');
  assert.equal(await evaluate(`document.querySelector('#skills-search').value`),'markdown');
  assert.ok(await evaluate(`getComputedStyle(document.querySelector('#skills-search')).fontSize === '13px'`));
  await close();

  await open('Tools','tools-guide-menu-item','Tools Guide');
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Available tools"] article').length`),14);
  await evaluate(`document.querySelector('[aria-label="Open Markdown to DOCX"]').click()`);
  await opened('Markdown to DOCX');
  await evaluate(`document.querySelector(${JSON.stringify(active)}).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await opened('Tools Guide');
  await waitFor(`document.activeElement?.getAttribute('aria-label') === 'Open Markdown to DOCX'`,'return focus to guide');
  await evaluate(`document.querySelector('[aria-label="Open JSON Parser"]').click()`);
  await waitFor(`!!document.querySelector('[aria-labelledby="json-parser-title"]') && !document.querySelector(${JSON.stringify(active)})`,'guide launches original Data popup');
  await evaluate(`document.querySelector('[aria-labelledby="json-parser-title"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await opened('Tools Guide');
  await waitFor(`document.activeElement?.getAttribute('aria-label') === 'Open JSON Parser'`,'return from Data popup to guide');
  await close();

  await open('Diagrams','diagram-editor-menu-item','draw.io Diagram Editor');
  await waitFor(`!!document.querySelector('.diagram-frame')`,'diagram host');
  await evaluate(`window.popupDiagramHost=document.querySelector('.diagram-frame')`);
  await close();
  await open('Diagrams','diagram-editor-menu-item','draw.io Diagram Editor');
  assert.equal(await evaluate(`window.popupDiagramHost === document.querySelector('.diagram-frame')`),true,'diagram host is retained');
  await close();
  await open('Media','youtube-downloader-menu-item','YouTube Downloader'); await close();
  await evaluate(`document.querySelector('#workspace-tab-View').click()`);
  await evaluate(`document.querySelector('.workspace-command-group button').click()`);
  await opened('Local settings'); await close();

  await open('Markdown','markdown-docx-menu-item','Markdown to DOCX');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`),false);
  assert.ok(await evaluate(`document.querySelector(${JSON.stringify(active)}).getBoundingClientRect().width <= innerWidth`));
  await close();
  await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[id]')).map(element=>element.id).filter((id,index,all)=>all.indexOf(id)!==index).length`),0,'retained tools do not create duplicate IDs');
  console.log('PASS: all page tools open as compact popups, original route stays put, drafts and filters survive reopening, nested guide/Data flow, focus restoration, retained diagram host, settings and mobile layout.');
}

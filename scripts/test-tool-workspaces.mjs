import assert from 'node:assert/strict';

export async function checkToolWorkspaces({evaluate,send,sessionId,waitFor}) {
  const origin = await evaluate('location.origin');
  await send('Page.navigate',{url:origin+'/discovery'},sessionId);
  await waitFor(`!!document.querySelector('#workspace-tab-Tools') && !document.querySelector('.neo-app-shell').hasAttribute('inert')`, 'workspace ready',60000);
  const active = '.tool-workspace-session:not([hidden]) .tool-workspace';
  const opened = async name => {
    await waitFor(`document.querySelector(${JSON.stringify(active)})?.dataset.toolName === ${JSON.stringify(name)}`, name+' workspace',60000);
    assert.equal(await evaluate('location.pathname'),'/discovery','ribbon tool does not navigate away');
    assert.equal(await evaluate(`document.querySelector('.neo-app-shell').hasAttribute('inert')`),false, 'ribbon remains interactive');
    assert.ok(await evaluate(`document.querySelector('.workspace-ribbon').getClientRects().length > 0`));
    const geometry = await evaluate(`(() => {
      const tool = document.querySelector(${JSON.stringify(active)});
      const rect = tool.getBoundingClientRect();
      return {bottom:rect.bottom, width:rect.width, height:rect.height, viewport:innerHeight,
        canvasWidth:document.querySelector('.neo-canvas').clientWidth, modal:tool.getAttribute('aria-modal')};
    })()`);
    assert.equal(geometry.modal, null, 'tool is a page region, not a modal');
    assert.ok(Math.abs(geometry.bottom - geometry.viewport) < 2 && geometry.height > 0, `tool fills the remaining viewport: ${name} ${JSON.stringify(geometry)}`);
    assert.ok(Math.abs(geometry.width - geometry.canvasWidth) < 2, 'tool uses the full workspace width');
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

  // Every routed workbench uses the same workspace host; each instance is created only once.
  const drafts = [
    ['Tools','cron-expression-menu-item','Cron Expression','#cron-input','*/15 * * * *'],
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
  await open('Markdown','markdown-live-preview-menu-item','Markdown Live Preview');
  await evaluate(`document.body.classList.add('printing-markdown')`);
  await send('Emulation.setEmulatedMedia',{media:'print'},sessionId);
  assert.equal(await evaluate(`document.querySelector('.neo-content').getClientRects().length`),0,'underlying page stays hidden when printing');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.neo-canvas')).overflow`),'visible','print is not clipped');
  await send('Emulation.setEmulatedMedia',{media:''},sessionId);
  await evaluate(`document.body.classList.remove('printing-markdown')`);
  await close();
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
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Available tools"] article').length`),15);
  await evaluate(`document.querySelector('[aria-label="Open Password Generator"]').click()`);
  await opened('Password Generator');
  await waitFor(`document.querySelector('#password-result')?.value.length === 20`, 'generated password');
  const password = await evaluate(`document.querySelector('#password-result').value`);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^A-Za-z0-9]/);
  await evaluate(`document.querySelector('#password-generate').click()`);
  await waitFor(`document.querySelector('#password-result').value !== ${JSON.stringify(password)}`, 'fresh password');
  await type('#password-type', 'memorable');
  await waitFor(`!!document.querySelector('#password-words') && document.querySelector('#password-result').value.includes('-')`, 'memorable mode');
  assert.equal(await evaluate(`document.querySelector('#password-words').value`), '6');
  await type('#password-separator', ' ');
  await waitFor(`document.querySelector('#password-result').value.split(' ').length === 6`, 'six-word passphrase');
  await type('#password-words', '8');
  await waitFor(`document.querySelector('#password-result').value.split(' ').length === 8`, 'custom word count');
  await evaluate(`document.querySelector('#password-capitalize').click()`);
  await waitFor(`document.querySelector('#password-result').value.split(' ').every(word => /^[A-Z][a-z-]+$/.test(word))`, 'capitalized words');
  await evaluate(`document.querySelector('#password-include-number').click()`);
  await waitFor(`/[0-9]$/.test(document.querySelector('#password-result').value)`, 'memorable random digit');
  await evaluate(`document.querySelector('#password-capitalize').click(); document.querySelector('#password-include-number').click()`);
  await waitFor(`/^[a-z -]+$/.test(document.querySelector('#password-result').value)`, 'plain memorable words');
  await type('#password-type', 'pin');
  await waitFor(`/^[0-9]{20}$/.test(document.querySelector('#password-result').value)`, 'PIN after memorable mode');
  await type('#password-type', 'random');
  await waitFor(`document.querySelector('#password-result').value.length === 20 && /[A-Z]/.test(document.querySelector('#password-result').value)`, 'random mode retains character length');
  await evaluate(`document.querySelector(${JSON.stringify(active)}).querySelector('.tool-page-header > button').click()`);
  await opened('Tools Guide');
  await evaluate(`document.querySelector('[aria-label="Open Markdown to DOCX"]').click()`);
  await opened('Markdown to DOCX');
  await evaluate(`document.querySelector(${JSON.stringify(active)}).querySelector('.tool-page-header > button').click()`);
  await opened('Tools Guide');
  await waitFor(`document.activeElement?.getAttribute('aria-label') === 'Open Markdown to DOCX'`,'return focus to guide');
  await evaluate(`document.querySelector('[aria-label="Open JSON Parser"]').click()`);
  await waitFor(`!!document.querySelector('[aria-labelledby="json-parser-title"]') && !document.querySelector(${JSON.stringify(active)})`,'guide launches original Data popup');
  assert.equal(await evaluate(`document.querySelector('.neo-app-shell').inert`),true,'modal background is inaccessible and noninteractive');
  assert.equal(await evaluate(`document.querySelector('.neo-app-shell').hasAttribute('aria-hidden')`),false,'inert avoids hiding an ancestor before focus moves into the modal');
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
  console.log('PASS: all page tools fill the workspace with an interactive ribbon, original route stays put, drafts and filters survive reopening, nested guide/Data flow and Back navigation, focus restoration, retained diagram host, settings and mobile layout.');
}

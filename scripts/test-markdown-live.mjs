import assert from 'node:assert/strict';

export async function checkMarkdownLive({ evaluate: rawEvaluate, send, sessionId, waitFor }) {
  const evaluate = expression => rawEvaluate(`(async () => (${expression}))()`);
  await waitFor(`document.querySelector('#markdown-live-source') && !document.querySelector('#markdown-live-source').disabled`, 'Markdown editor ready', 60000);
  const setSource = async source => {
    await evaluate(`(() => { const input = document.querySelector('#markdown-live-source'); input.value = ${JSON.stringify(source)}; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await waitFor(`JSON.parse(localStorage.getItem('gisthub.markdown-live-preview.v1'))?.source === ${JSON.stringify(source)}`, 'saved draft');
  };
  const source = '# Hello မြန်မာ\n\n- [x] Done\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nconst hello = 1;\n```\n\n<script>window.markdownUnsafe = true</script>\n<img src="https://example.invalid/private" onerror="window.markdownUnsafe=true">\n[bad](javascript:alert(1))';
  await setSource(source);
  await waitFor(`document.querySelector('#markdown-live-preview h1')?.textContent === 'Hello မြန်မာ'`, 'live preview');
  assert.equal(await evaluate(`!!window.markdownUnsafe`), false);
  assert.equal(await evaluate(`document.querySelectorAll('#markdown-live-preview script, #markdown-live-preview img, #markdown-live-preview [onerror], #markdown-live-preview a[href^="javascript:"]').length`), 0);
  assert.equal(await evaluate(`document.querySelector('#markdown-live-preview input[type="checkbox"]').disabled`), true);
  assert.equal(await evaluate(`!!document.querySelector('#markdown-live-preview table') && !!document.querySelector('#markdown-live-preview .hljs')`), true);
  assert.equal(await evaluate(`new DOMParser().parseFromString((await import('/js/markdownLivePreview.js')).html(${JSON.stringify(source)}), 'text/html').querySelectorAll('script, img, [onerror], a[href^="javascript:"]').length`), 0);
  assert.equal(await evaluate(`(await import('/js/markdownLivePreview.js')).wordSource(${JSON.stringify(source)}).includes('Hello မြန်မာ')`), true);

  // The workbench is modal: Tab and Shift+Tab stay inside its active dialog.
  await evaluate(`(() => {
    const dialog = document.querySelector('.tool-page-backdrop:not([hidden]) .tool-page-overlay');
    const focusable = Array.from(dialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')).filter(element=>element.getClientRects().length);
    window.markdownLastFocus = focusable.at(-1);
    window.markdownLastFocus.focus();
    window.markdownLastFocus.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
  })()`);
  assert.equal(await evaluate(`document.activeElement?.getAttribute('aria-label')`), 'Close Markdown Live Preview');
  await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement === window.markdownLastFocus`), true);
  assert.equal(await evaluate(`location.pathname`), '/tools/markdown-live-preview');
  assert.equal(await evaluate(`document.querySelector('#markdown-live-source').value`), source);

  await send('Page.reload', {}, sessionId);
  await waitFor(`document.querySelector('#markdown-live-source')?.value === ${JSON.stringify(source)} && !document.querySelector('#markdown-live-source').disabled`, 'draft recovery', 60000);
  const imported = '# Imported Unicode မြန်မာ';
  await evaluate(`(() => { const files = new DataTransfer(); files.items.add(new File([${JSON.stringify(imported)}], 'notes.md', {type:'text/markdown'})); const input = document.querySelector('#markdown-live-file'); input.files = files.files; input.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await waitFor(`document.querySelector('#markdown-live-source').value === ${JSON.stringify(imported)}`, 'file import');
  await evaluate(`(() => { const files = new DataTransfer(); files.items.add(new File(['x'.repeat(1048577)], 'large.md')); const input = document.querySelector('#markdown-live-file'); input.files = files.files; input.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await waitFor(`document.querySelector('#markdown-live-error')?.textContent.includes('1 MB')`, 'oversized file rejection');
  assert.equal(await evaluate(`document.querySelector('#markdown-live-source').value`), imported);
  await evaluate(`(() => { const input = document.querySelector('#markdown-live-source'); input.value = 'မြ'.repeat(200000); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await waitFor(`document.querySelector('#markdown-live-error')?.textContent.includes('previous draft was kept')`, 'oversized Unicode text rejection');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('gisthub.markdown-live-preview.v1')).source`), imported);
  assert.equal(await evaluate(`document.querySelector('#markdown-live-source').value`), imported);

  // Capture the existing download helper's Blob, exercising actual export buttons without disk paths.
  await evaluate(`(() => { window.markdownDownloads = []; window.markdownCreateUrl = URL.createObjectURL; URL.createObjectURL = blob => { window.markdownDownloads.push(blob); return window.markdownCreateUrl(blob); }; })()`);
  for (const label of ['Download .md', 'Download HTML', 'Download Word']) {
    await evaluate(`Array.from(document.querySelectorAll('.markdown-live-actions button')).find(button => button.textContent === ${JSON.stringify(label)}).click()`);
    await waitFor(`document.querySelector('#markdown-live-status').textContent === 'Document downloaded.'`, label);
  }
  await waitFor(`window.markdownDownloads.length === 3`, 'three exports');
  assert.equal(await evaluate(`window.markdownDownloads[0].text()`), imported);
  assert.ok((await evaluate(`window.markdownDownloads[1].text()`)).includes('Imported Unicode'));
  assert.deepEqual(await evaluate(`Array.from(new Uint8Array(await window.markdownDownloads[2].arrayBuffer()).slice(0,2))`), [80,75]);
  await evaluate(`URL.createObjectURL = window.markdownCreateUrl`);

  await evaluate(`document.body.classList.add('printing-markdown')`);
  await send('Emulation.setEmulatedMedia', {media:'print'}, sessionId);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.neo-topbar')).display`), 'none');
  assert.equal(await evaluate(`document.querySelector('#markdown-live-source').getClientRects().length`), 0);
  assert.ok(await evaluate(`document.querySelector('#markdown-live-preview').getClientRects().length`));
  const pdf = await send('Page.printToPDF', {printBackground:true}, sessionId);
  assert.equal(Buffer.from(pdf.data, 'base64').subarray(0,5).toString(), '%PDF-');
  await send('Emulation.setEmulatedMedia', {media:''}, sessionId);
  await evaluate(`document.body.classList.remove('printing-markdown')`);

  assert.equal(await evaluate(`(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('quota'); }; return import('/js/markdownLivePreview.js').then(module => { try { return module.save('safe', 'file').includes('could not be saved'); } finally { Storage.prototype.setItem = original; } }); })()`), true);
  assert.equal(await evaluate(`(await import('/js/markdownLivePreview.js')).save('မြ'.repeat(1048576), 'large').includes('1 MB')`), true);
  await evaluate(`localStorage.setItem('gisthub.markdown-live-preview.v1', '{invalid')`);
  assert.ok(await evaluate(`(await import('/js/markdownLivePreview.js')).restore().warning`));
  await setSource('');
  await send('Page.reload', {}, sessionId);
  await waitFor(`document.querySelector('#markdown-live-source') && !document.querySelector('#markdown-live-source').disabled && document.querySelector('#markdown-live-source').value === ''`, 'empty draft recovery', 60000);

  await setSource('$$x^2$$\n\n```mermaid\ngraph TD; A-->B\n```');
  await waitFor(`document.querySelector('#markdown-live-preview math')`, 'math rendering');
  await waitFor(`document.querySelector('#markdown-live-preview svg') || document.querySelector('#markdown-live-status').textContent.includes('source is shown')`, 'diagram or offline fallback', 30000);
  assert.equal(await evaluate(`document.querySelectorAll('#markdown-live-preview svg script, #markdown-live-preview svg a, #markdown-live-preview foreignObject').length`), 0);

  for (const dark of [false, true]) {
    await evaluate(`window.applyGistHubTheme(${JSON.stringify(dark ? 'dark' : 'light')})`);
    for (const width of [390, 1280]) {
      await send('Emulation.setDeviceMetricsOverride', {width, height:844, deviceScaleFactor:1, mobile: width < 600}, sessionId);
      assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false, `overflow at ${width}, dark=${dark}`);
      assert.equal(await evaluate(`document.querySelector('.workspace-tabs').getBoundingClientRect().width > innerWidth`), false);
    }
  }
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  assert.equal(await evaluate(`document.querySelectorAll('#tools-menu, #tools-search').length`), 0);
  assert.equal(await evaluate(`document.querySelector('.tool-page-backdrop:not([hidden]) .tool-page-overlay').dataset.toolName`), 'Markdown Live Preview');
  console.log('PASS: live Markdown, safe HTML, task list/code/table, draft recovery, bounded file import, three exports, storage failures, math/diagram fallback, command tabs and responsive themes.');
}

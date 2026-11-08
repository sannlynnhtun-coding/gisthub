// Run with BROWSER_CHECK_DOCX=1 node scripts/check-browser-errors.mjs http://localhost:5187/tools/markdown-to-docx
import assert from 'node:assert/strict';

export async function checkMarkdownDocx({ evaluate, send, sessionId, waitFor }) {
  await waitFor(`Boolean(document.querySelector('#docx-source')) && !document.querySelector('button.btn-primary[disabled]')`, 'the DOCX editor', 60000);
  await evaluate(`document.querySelector('#workspace-tab-Markdown').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="markdown-docx-menu-item"]'))`, 'the Tools entry');
  assert.equal(await evaluate(`document.querySelector('[data-testid="markdown-docx-menu-item"]').tagName`), 'BUTTON');
  await evaluate(`document.querySelector('#workspace-tab-Markdown').click()`);
  const source = '# Export test\n\n**Bold** and *italic*\n\n| A | B |\n|---|---|\n| One | Two |\n\n- [x] Done\n\n![Alt](https://example.com/image.png)\n\n```mermaid\ngraph TD; A-->B\n```\n\n<script>window.docxUnsafe=true</script><a href="javascript:alert(1)" onclick="window.docxUnsafe=true">Unsafe</a>';
  await evaluate(`(() => {
    const input = document.querySelector('#docx-source'); input.value = ${JSON.stringify(source)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector('.docx-preview h1')?.textContent === 'Export test'`, 'live Markdown rendering');
  const preview = await evaluate(`(() => {
    const p = document.querySelector('.docx-preview');
    return { bold: p.querySelector('strong')?.textContent, cells: p.querySelectorAll('td').length,
      image: p.querySelector('a')?.textContent, images: p.querySelectorAll('img').length,
      unsafe: Boolean(window.docxUnsafe || p.querySelector('script,[onclick],[href^="javascript:"]')), task: p.textContent.includes('☑') };
  })()`);
  assert.deepEqual(preview, { bold: 'Bold', cells: 2, image: '[Image: Alt]', images: 0, unsafe: false, task: true });
  await evaluate(`(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = blob => { window.docxBlob = blob; return original(blob); };
    document.querySelector('#docx-name').value = 'test.docx';
    document.querySelector('#docx-name').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('button.btn-primary').click();
  })()`);
  await waitFor(`Array.from(document.querySelectorAll('[role="status"]')).some(e => e.textContent.includes('Word document downloaded'))`, 'DOCX download', 30000);
  const download = await evaluate(`(async () => { const b = new Uint8Array(await window.docxBlob.arrayBuffer()); return { signature: Array.from(b.slice(0, 4)), size: b.length }; })()`);
  assert.deepEqual(download.signature, [80, 75, 3, 4]);
  assert.ok(download.size > 1000);
  await evaluate(`(() => {
    const transfer = new DataTransfer(); transfer.items.add(new File(['# Uploaded'], 'uploaded.md', {type:'text/markdown'}));
    const input = document.querySelector('#docx-file'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles:true }));
  })()`);
  await waitFor(`document.querySelector('.docx-preview h1')?.textContent === 'Uploaded'`, 'file upload');
  assert.equal(await evaluate(`document.querySelector('#docx-name').value`), 'uploaded');
  await evaluate(`(() => {
    const transfer = new DataTransfer(); transfer.items.add(new File(['x'.repeat(1048577)], 'large.md'));
    const input = document.querySelector('#docx-file'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles:true }));
  })()`);
  await waitFor(`Array.from(document.querySelectorAll('[role="alert"]')).some(e => e.textContent.includes('1 MB'))`, 'oversize rejection');
  assert.equal(await evaluate(`document.querySelector('#docx-source').value`), '# Uploaded');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  console.log('PASS: DOCX live preview, sanitization, real ZIP download, upload, size rejection, and mobile layout.');
}

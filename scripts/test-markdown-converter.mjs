// BROWSER_CHECK_CONVERTER=1 node scripts/check-browser-errors.mjs http://localhost:5187/tools/markdown-to-docx
import assert from 'node:assert/strict';

export async function checkMarkdownConverter({ evaluate, send, sessionId, waitFor }) {
  console.log('Checking converter UI…');
  await waitFor(`Boolean(document.querySelector('#workspace-tab-Media'))`, 'the Tools menu', 60000);
  await evaluate(`document.querySelector('#workspace-tab-Media').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="code-image-menu-item"]'))`, 'the converter menu item');
  await evaluate(`document.querySelector('[data-testid="code-image-menu-item"]').click()`);
  await waitFor(`Boolean(document.querySelector('.code-image-overlay .code-image-markdown h1'))`, 'Markdown as the default mode');
  const source = '# Rich preview\n\nInline $x^2$ and block math:\n\n$$\\frac{1}{2}$$\n\n```mermaid\ngraph TD; A[Start]-->B[Done]\n```\n\n- [x] Task\n\n|A|B|\n|-|-|\n|One|Two|\n\n```js\nconst answer = 42;\n```\n\n<script>window.captureUnsafe=true</script><a href="javascript:alert(1)" onclick="window.captureUnsafe=true">Unsafe</a>';
  await evaluate(`(() => { const input = document.querySelector('.code-image-editor'); input.value = ${JSON.stringify(source)}; input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await waitFor(`document.querySelector('.code-image-overlay math') && document.querySelector('.code-image-overlay .markdown-diagram svg')`, 'rendered math and Mermaid', 30000);
  const preview = await evaluate(`(() => { const p = document.querySelector('.code-image-overlay .code-image-markdown'); return { math: p.querySelectorAll('math').length, table: Boolean(p.querySelector('table')), code: Boolean(p.querySelector('.hljs-keyword')), unsafe: Boolean(window.captureUnsafe || p.querySelector('script,[onclick],[href^="javascript:"]')) }; })()`);
  assert.deepEqual(preview, { math: 2, table: true, code: true, unsafe: false });
  const matrix = String.raw`$$\begin{matrix}a & b \\ c & d\end{matrix}$$`;
  const math = await evaluate(`(async () => { const p = document.createElement('div'); document.body.appendChild(p); try { await renderMarkdownImagePreview(p,${JSON.stringify(matrix)}); return {rows:p.querySelectorAll('mtr').length,cells:p.querySelectorAll('mtd').length}; } finally { p.remove(); } })()`);
  assert.deepEqual(math, { rows: 2, cells: 4 }, 'Markdown must preserve TeX row separators');
  console.log('Checking image encoders…');
  await evaluate(`(() => {
    window.captureOptions = {mode:'markdown',code:${JSON.stringify(source)},theme:'simple',format:'auto',fontSize:18,padding:64,title:'Converter test'};
    window.captureOriginalUrl = URL.createObjectURL;
    URL.createObjectURL = blob => { window.captureBlob = blob; return window.captureOriginalUrl(blob); };
    window.captureOriginalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() { window.captureFilename = this.download; };
  })()`);
  for (const [format, mime, extension] of [['png','image/png','png'], ['jpeg','image/jpeg','jpg'], ['webp','image/webp','webp']]) {
    const result = await evaluate(`(async () => {
      await downloadCodeImage({...window.captureOptions,outputFormat:${JSON.stringify(format)},quality:0.8});
      const blob = window.captureBlob;
      const bitmap = await createImageBitmap(blob);
      const result = {type:blob.type,size:blob.size,width:bitmap.width,height:bitmap.height,name:window.captureFilename};
      bitmap.close(); return result;
    })()`);
    assert.equal(result.type, mime);
    assert.equal(result.name, `converter-test.${extension}`);
    assert.ok(result.size > 1000 && result.width === 2400 && result.height >= 1280);
  }
  const clipboard = await evaluate(`(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator,'clipboard');
    let type;
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items => { type=(await items[0].getType('image/png')).type; }}});
    try { const copied = await copyCodeImageToClipboard({...window.captureOptions,outputFormat:'webp'}); return {copied,type}; }
    finally { if(descriptor) Object.defineProperty(navigator,'clipboard',descriptor); else delete navigator.clipboard; }
  })()`);
  assert.deepEqual(clipboard, { copied: true, type: 'image/png' });
  const code = await evaluate(`(async () => { await downloadCodeImage({...window.captureOptions,mode:'code',code:'const answer = 42;',language:'javascript',outputFormat:'jpeg'}); return window.captureBlob.type; })()`);
  assert.equal(code, 'image/jpeg', 'Code capture must keep working with the new encoders');
  const overflow = await evaluate(`(async () => { try { await downloadCodeImage({...window.captureOptions,code:'# Long\\n\\n' + 'Paragraph\\n\\n'.repeat(500),format:'square'}); return false; } catch(error) { return error.message.includes('exceeds'); } })()`);
  assert.equal(overflow, true, 'Long Markdown must not be silently cropped');
  console.log('Checking PDF print content…');
  const print = await evaluate(`(async () => {
    const originalAppend = document.body.appendChild;
    document.body.appendChild = function(node) {
      if(node.tagName === 'IFRAME') node.addEventListener('load', () => {
        node.contentWindow.print = () => { window.capturePrinted = {title:node.contentDocument.title,math:node.contentDocument.querySelectorAll('math').length,diagram:Boolean(node.contentDocument.querySelector('.markdown-diagram svg')),text:node.contentDocument.body.textContent}; node.contentWindow.dispatchEvent(new Event('afterprint')); };
      });
      return originalAppend.call(this,node);
    };
    try { await downloadCodeImage({...window.captureOptions,outputFormat:'pdf'}); return window.capturePrinted; }
    finally { document.body.appendChild = originalAppend; }
  })()`);
  assert.equal(print.title, 'Converter test');
  assert.equal(print.math, 2);
  assert.equal(print.diagram, true);
  assert.ok(print.text.includes('Rich preview'));
  const invalidDiagram = '```mermaid\ninvalid diagram\n```';
  const fallback = await evaluate(`(async () => { const element = document.createElement('div'); document.body.appendChild(element); try { await renderMarkdownImagePreview(element,${JSON.stringify(invalidDiagram)}); return element.textContent.includes('invalid diagram'); } finally { element.remove(); } })()`);
  assert.equal(fallback, true);
  await evaluate(`URL.createObjectURL = window.captureOriginalUrl; HTMLAnchorElement.prototype.click = window.captureOriginalClick`);
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true}, sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  console.log('PASS: converter math/diagrams, safe GFM, PNG/JPEG/WebP, print content, overflow rejection, and mobile layout.');
}

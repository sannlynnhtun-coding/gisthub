import assert from 'node:assert/strict';

export async function checkMarkdownCardTool({ evaluate, send, sessionId, waitFor }) {
  await waitFor(`document.querySelectorAll('[aria-label="Card previews"] img').length === 3 && !document.querySelector('#cards-zip').disabled`, 'three rendered cards', 60000);
  await evaluate(`document.querySelector('#workspace-tab-Markdown').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="markdown-cards-menu-item"]'))`, 'the Cards tool menu entry');
  assert.equal(await evaluate(`document.querySelector('[data-testid="markdown-cards-menu-item"]').tagName`), 'BUTTON');
  await evaluate(`document.querySelector('#workspace-tab-Markdown').click()`);
  await evaluate(`(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = blob => { if(blob.type === 'application/octet-stream') window.cardDownload = blob; return original(blob); };
    HTMLAnchorElement.prototype.click = function() { window.cardDownloadName = this.download; };
    document.querySelector('#cards-zip').click();
  })()`);
  await waitFor(`window.cardDownloadName === 'markdown-cards.zip'`, 'ZIP download');
  const zip = await evaluate(`(async () => {
    const bytes = new Uint8Array(await window.cardDownload.arrayBuffer()), view = new DataView(bytes.buffer), decoder = new TextDecoder();
    const previews = await Promise.all([...document.querySelectorAll('[aria-label="Card previews"] img')].map(async image => new Uint8Array(await (await fetch(image.src)).arrayBuffer())));
    let offset = 0; const files = [];
    while(view.getUint32(offset,true) === 0x04034b50) {
      const size=view.getUint32(offset+18,true), nameLength=view.getUint16(offset+26,true), extraLength=view.getUint16(offset+28,true), start=offset+30+nameLength+extraLength;
      const payload=bytes.slice(start,start+size), expected=previews[files.length];
      files.push({name:decoder.decode(bytes.slice(offset+30,offset+30+nameLength)),method:view.getUint16(offset+8,true),matches:payload.length === expected.length && payload.every((b,i) => b===expected[i])});
      offset=start+size;
    }
    return files;
  })()`);
  assert.deepEqual(zip, [1,2,3].map(i => ({name:`card-0${i}.png`,method:0,matches:true})));
  await evaluate(`document.querySelector('figcaption button').click()`);
  await waitFor(`window.cardDownloadName === 'card-01.png'`, 'individual image download');
  const source = '## Alpha\n\n**First card** with $x^2$.\n\n## Beta\n\n```md\n## Not a split\n```';
  await evaluate(`(() => { const input=document.querySelector('#cards-source'); input.value=${JSON.stringify(source)}; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await waitFor(`document.querySelector('#cards-zip').disabled`, 'stale export prevention');
  await waitFor(`localStorage.getItem('gisthub:markdown-cards-draft') === ${JSON.stringify(source)}`, 'draft autosave');
  for (const [format,mime,extension] of [['jpeg','image/jpeg','jpg'],['webp','image/webp','webp']]) {
    await evaluate(`(() => { const select=document.querySelector('#cards-format'); select.value=${JSON.stringify(format)}; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await evaluate(`document.querySelector('#cards-generate').click()`);
    await waitFor(`document.querySelectorAll('[aria-label="Card previews"] img').length === 2 && !document.querySelector('#cards-zip').disabled`, `two ${format} cards`);
    const image = await evaluate(`(async () => { const blob=await (await fetch(document.querySelector('[aria-label="Card previews"] img').src)).blob(); const bitmap=await createImageBitmap(blob); const result={type:blob.type,width:bitmap.width,height:bitmap.height}; bitmap.close(); return result; })()`);
    assert.deepEqual(image,{type:mime,width:2400,height:2400});
    await evaluate(`window.cardDownloadName=null; document.querySelector('figcaption button').click()`);
    await waitFor(`window.cardDownloadName === 'card-01.${extension}'`, `${format} filename`);
  }
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true}, sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  await send('Page.reload', {ignoreCache:true}, sessionId);
  await waitFor(`document.querySelectorAll('[aria-label="Card previews"] img').length === 2`, 'restored Markdown draft');
  assert.equal(await evaluate(`document.querySelector('#cards-source').value`), source);
  console.log('PASS: card previews, byte-identical ZIP entries, individual downloads, PNG/JPEG/WebP, draft restore, stale-export prevention, and mobile layout.');
}

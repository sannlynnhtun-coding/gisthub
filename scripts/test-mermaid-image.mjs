import assert from 'node:assert/strict';

export async function checkMermaidImage({evaluate,send,sessionId,waitFor}) {
  await waitFor(`document.querySelector('#mermaid-preview svg') && !document.querySelector('#mermaid-download').disabled`, 'a valid Mermaid preview',60000);
  await evaluate(`document.querySelector('#workspace-tab-Diagrams').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="mermaid-image-menu-item"]'))`, 'the Mermaid menu entry');
  await evaluate(`document.querySelector('#workspace-tab-Diagrams').click()`);
  const update = async (selector,value,type='input') => evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)}); el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true}));})()`);
  await update('#mermaid-source','not a diagram');
  await waitFor(`document.querySelector('#mermaid-error') && document.querySelector('#mermaid-download').disabled`, 'syntax error with export disabled');
  await update('#mermaid-source','flowchart LR\nA[Start]-->B[Finish]');
  await update('#mermaid-name','Diagram <safe & editable>');
  await waitFor(`!document.querySelector('#mermaid-download').disabled && document.querySelector('#mermaid-preview svg')?.textContent.includes('Finish')`, 'live preview recovery');
  await update('#mermaid-theme','dark','change');
  await waitFor(`document.querySelector('#mermaid-preview svg > rect')?.getAttribute('fill') === '#181825' && !document.querySelector('#mermaid-download').disabled`, 'dark theme preview');
  await evaluate(`(() => { const original=URL.createObjectURL; URL.createObjectURL=blob=>{window.diagramBlob=blob;return original(blob);}; HTMLAnchorElement.prototype.click=function(){window.diagramFilename=this.download;}; })()`);
  for(const [format,mime,extension] of [['svg','image/svg+xml','svg'],['png','image/png','png'],['jpeg','image/jpeg','jpg'],['webp','image/webp','webp']]) {
    await update('#mermaid-format',format,'change');
    await evaluate(`window.diagramFilename=null;document.querySelector('#mermaid-download').click()`);
    await waitFor(`Boolean(window.diagramFilename?.endsWith('.${extension}'))`, `${format} download`,30000);
    const result=await evaluate(`(async()=>{const blob=window.diagramBlob; if(blob.type==='image/svg+xml'){const xml=new DOMParser().parseFromString(await blob.text(),'image/svg+xml');return {type:blob.type,title:xml.querySelector('text').textContent,unsafe:Boolean(xml.querySelector('script,foreignObject,image,a,[onclick]')),diagrams:xml.querySelectorAll('svg').length};} const image=await createImageBitmap(blob);const expected=document.querySelector('#mermaid-preview svg');const result={type:blob.type,width:image.width,height:image.height,expectedWidth:Number(expected.getAttribute('width'))*2,expectedHeight:Number(expected.getAttribute('height'))*2};image.close();return result;})()`);
    assert.equal(result.type,mime);
    if(format==='svg'){ assert.equal(result.title,'Diagram <safe & editable>');assert.equal(result.unsafe,false);assert.equal(result.diagrams,2); }
    else {assert.equal(result.width,result.expectedWidth);assert.equal(result.height,result.expectedHeight);}
  }
  await evaluate(`(() => { const original=document.body.appendChild;document.body.appendChild=function(node){if(node.tagName==='IFRAME')node.addEventListener('load',()=>{node.contentWindow.print=()=>{window.diagramPrint={svg:Boolean(node.contentDocument.querySelector('svg')),title:node.contentDocument.querySelector('text')?.textContent};node.contentWindow.dispatchEvent(new Event('afterprint'));};});return original.call(this,node);};window.restoreDiagramAppend=()=>document.body.appendChild=original;})()`);
  await update('#mermaid-format','pdf','change');
  await evaluate(`document.querySelector('#mermaid-download').click()`);
  await waitFor(`Boolean(window.diagramPrint)`, 'PDF print content');
  assert.deepEqual(await evaluate(`window.diagramPrint`),{svg:true,title:'Diagram <safe & editable>'});
  await evaluate(`window.restoreDiagramAppend()`);
  for(const example of ['sequence','class']) {
    await update('#mermaid-example',example,'change');
    await waitFor(`!document.querySelector('#mermaid-download').disabled && document.querySelector('#mermaid-source').value.startsWith('${example === 'sequence' ? 'sequenceDiagram' : 'classDiagram'}') && Boolean(document.querySelector('#mermaid-preview svg'))`, `${example} diagram`);
  }
  for(const [diagram,label] of [
    ['stateDiagram-v2\n[*] --> Ready\nReady --> [*]','Ready'],
    ['erDiagram\nCUSTOMER ||--o{ ORDER : places','CUSTOMER'],
    ['gantt\ntitle Roadmap\ndateFormat YYYY-MM-DD\nsection Work\nBuild :2026-01-01, 3d','Roadmap'],
    ['---\ntitle: Frontmatter\n---\nflowchart LR\nA[Start]-->B[Finish]','Finish']
  ]) {
    await update('#mermaid-source',diagram);
    await waitFor(`!document.querySelector('#mermaid-download').disabled && document.querySelector('#mermaid-preview')?.textContent.includes(${JSON.stringify(label)})`, `${label} diagram with visible labels`);
  }
  const before=await evaluate(`document.querySelector('#mermaid-source').value`);
  await evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File(['x'.repeat(65537)],'large.mmd'));const input=document.querySelector('#mermaid-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(`document.querySelector('#mermaid-error')?.textContent.includes('64 KB')`, 'oversize import rejection');
  assert.equal(await evaluate(`document.querySelector('#mermaid-source').value`),before);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`),false);
  await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  console.log('PASS: Mermaid live preview, syntax recovery, themes, SVG/PNG/JPEG/WebP, PDF print content, examples, upload limits, and mobile layout.');
}

import assert from 'node:assert/strict';

export async function checkFormulaImage({evaluate,send,sessionId,waitFor}) {
  await waitFor(`document.querySelector('#formula-preview math') && !document.querySelector('#formula-download').disabled`, 'a rendered formula',60000);
  const update=async(selector,value,type='input')=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true}));})()`);
  await evaluate(`document.querySelector('#workspace-tab-Diagrams').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="formula-image-menu-item"]'))`, 'the Formula menu entry');
  await evaluate(`document.querySelector('#workspace-tab-Diagrams').click()`);
  await update('#formula-source',String.raw`\frac{`);
  await waitFor(`document.querySelector('#formula-error') && document.querySelector('#formula-download').disabled`, 'invalid LaTeX with disabled export');
  await update('#formula-example','matrix','change');
  await waitFor(`document.querySelectorAll('#formula-preview mtr').length === 2 && !document.querySelector('#formula-download').disabled`, 'matrix recovery');
  await update('#formula-name','Math <safe & local>');
  await evaluate(`document.querySelector('#formula-transparent').click()`);
  await waitFor(`!document.querySelector('#formula-download').disabled && document.querySelector('#formula-preview').textContent.includes('Math <safe & local>') && document.querySelector('#formula-transparent').checked`, 'transparent preview');
  await evaluate(`(()=>{const original=URL.createObjectURL;URL.createObjectURL=blob=>{window.formulaBlob=blob;return original(blob);};HTMLAnchorElement.prototype.click=function(){window.formulaFilename=this.download;};})()`);
  for(const [format,mime,extension] of [['svg','image/svg+xml','svg'],['png','image/png','png'],['webp','image/webp','webp'],['jpeg','image/jpeg','jpg']]) {
    await update('#formula-format',format,'change');
    await evaluate(`window.formulaFilename=null;document.querySelector('#formula-download').click()`);
    await waitFor(`window.formulaFilename?.endsWith('.${extension}')`, `${format} download`,30000);
    const image=await evaluate(`(async()=>{
      const blob=window.formulaBlob;
      if(blob.type==='image/svg+xml'){const doc=new DOMParser().parseFromString(await blob.text(),'image/svg+xml');return {type:blob.type,math:doc.querySelectorAll('mtr').length,title:doc.documentElement.textContent.includes('Math <safe & local>'),unsafe:Boolean(doc.querySelector('script,a,img,[onclick]'))};}
      const bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      let ink=0;for(let i=Math.floor(pixels.length/8)*4;i<pixels.length;i+=4)if(pixels[i+3]>100&&pixels[i]<100&&pixels[i+1]<100&&pixels[i+2]<100)ink++;
      const svg=document.querySelector('#formula-preview svg');return {type:blob.type,width:canvas.width,height:canvas.height,expectedWidth:Number(svg.getAttribute('width'))*2,expectedHeight:Number(svg.getAttribute('height'))*2,cornerAlpha:pixels[3],ink};
    })()`);
    assert.equal(image.type,mime);
    if(format==='svg'){assert.equal(image.math,2);assert.equal(image.title,true);assert.equal(image.unsafe,false);}
    else {assert.equal(image.width,image.expectedWidth);assert.equal(image.height,image.expectedHeight);assert.ok(image.ink>100,'The image must contain visible formula/label pixels');assert.equal(image.cornerAlpha,format==='jpeg'?255:0);}
  }
  for(const example of ['quadratic','integral','sum']) {
    await update('#formula-example',example,'change');
    await waitFor(`!document.querySelector('#formula-download').disabled && Boolean(document.querySelector('#formula-preview math'))`, `${example} preview`);
  }
  const larger=await evaluate(`document.querySelector('#formula-preview svg').getAttribute('height')`);
  await update('#formula-size','80','change');
  await waitFor(`!document.querySelector('#formula-download').disabled && Number(document.querySelector('#formula-preview svg').getAttribute('height')) > ${Number(larger)}`, 'formula size adjustment');
  const unsafe=String.raw`\href{javascript:alert(1)}{test}`;
  await update('#formula-source',unsafe);
  await waitFor(`!document.querySelector('#formula-download').disabled || Boolean(document.querySelector('#formula-error'))`, 'untrusted command handling');
  assert.equal(await evaluate(`Boolean(document.querySelector('#formula-preview a, #formula-preview script, #formula-preview [href]'))`),false);
  await update('#formula-source','x^2 + y^2 = z^2');
  await waitFor(`!document.querySelector('#formula-download').disabled`, 'valid expression');
  await evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File(['x'.repeat(16385)],'large.tex'));const input=document.querySelector('#formula-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(`document.querySelector('#formula-error')?.textContent.includes('16 KB')`, 'oversize upload rejection');
  assert.equal(await evaluate(`document.querySelector('#formula-source').value`),'x^2 + y^2 = z^2');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`),false);
  await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  console.log('PASS: formula syntax recovery, matrix/integral/sum examples, visible raster pixels, transparency, SVG/PNG/WebP/JPEG, size, safe commands, upload limit, and mobile layout.');
}

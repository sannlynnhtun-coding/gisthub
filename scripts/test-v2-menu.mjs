import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function checkV2Menu({evaluate,send,sessionId,waitFor}) {
 const source=await readFile(new URL('../specs/004-gitpulse-default-theme/references/menu-preview.html',import.meta.url));
 assert.equal(createHash('sha256').update(source).digest('hex'),'6f5e2011ab8e541e843b6424baa6c59b82ef5c9007ec14f4b41e100059f39656');
 const groups={Home:['Workspace','Collections'],Discover:['Explore'],Tools:['Resources','Utilities'],Data:['JSON','Encoding'],Markdown:['Write & preview','Export & convert'],Diagrams:['Create','Render & export'],Media:['Create images','Download'],View:['Workspace preferences']};
 await waitFor(`!!document.querySelector('#workspace-tab-Home')`,'menu',60000);
 const records=[];
 for(const width of [375,1074,1440]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:1113,deviceScaleFactor:1,mobile:width===375},sessionId);
  const ids=new Set();
  for(const [category,labels] of Object.entries(groups)) {
   await evaluate(`document.querySelector('#workspace-tab-${category}').click()`);
   await waitFor(`document.querySelector('#workspace-tab-${category}').getAttribute('aria-selected')==='true'`,'category '+category);
   const state=await evaluate(`(()=>{const root=document.querySelector('#workspace-commands');return {labels:Array.from(root.querySelectorAll('.ribbon-group-label'),e=>e.textContent),ids:Array.from(root.querySelectorAll('[data-command-id]'),e=>e.dataset.commandId),expanded:document.querySelector('.ribbon-toggle').getAttribute('aria-expanded'),overflow:document.documentElement.scrollWidth>innerWidth+1,corners:getComputedStyle(document.querySelector('#workspace-tab-${category}')).borderRadius};})()`);
   assert.deepEqual(state.labels,labels);assert.equal(state.expanded,'true');assert.equal(state.overflow,false);assert.equal(state.corners,'0px');state.ids.forEach(id=>ids.add(id));
   if(category==='Home')assert.deepEqual(state.ids.slice(0,2),['home','my-collection']);
   records.push({width,category,...state});
  }
  assert.equal(ids.size,29,'all existing commands remain');
  await evaluate(`document.querySelector('.ribbon-toggle').click()`);await waitFor(`document.querySelector('#workspace-commands').hidden`,'collapse');
  await evaluate(`document.querySelector('#workspace-tab-Home').click()`);await waitFor(`!document.querySelector('#workspace-commands').hidden`,'category reopens');
 }
 await mkdir('artifacts/gitpulse',{recursive:true});await writeFile('artifacts/gitpulse/v2-menu.json',JSON.stringify(records,null,2));
 console.log('PASS: v2 groups, 29 commands, Home/Collection order, square tabs, collapse/reopen and contained mobile ribbon.');
}

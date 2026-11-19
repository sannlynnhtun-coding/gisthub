import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';

export async function checkGitPulseAppearance({evaluate,send,sessionId,waitFor}) {
 await waitFor(`!!document.querySelector('[data-testid="home-dashboard"]')`,'GitPulse Home',60000);
 assert.deepEqual(await evaluate(`({theme:getGistHubTheme(),style:getGistHubStyle(),font:getGistHubFont()})`),{theme:'gitpulse-dark',style:'gitpulse',font:'plus-jakarta-sans'});
 const states=[];
 for (const layout of ['excel','admin']) {
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Workspace layout"]');e.value=${JSON.stringify(layout)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(`!!document.querySelector(${JSON.stringify('.'+(layout==='excel'?'excel-workspace':'admin-portal'))})`,layout);
  await send('DOM.enable',{},sessionId);await send('CSS.enable',{},sessionId);
  if(layout==='excel') {
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.workspace-commands')).borderRadius`),'12px','preview inset ribbon');
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.excel-topbar')).height`),'56px','preview header');
  }
  for(const width of [375,1074,1440]) {
   await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600},sessionId);
   const doc=await send('DOM.getDocument',{},sessionId);
   const nodes=await send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:'.workspace-tabs>button'},sessionId);
   for(const nodeId of nodes.nodeIds)await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover','focus-visible']},sessionId);
   const radii=await evaluate(`(()=>{const failures=[];for(const style of getGistHubStyles()){applyGistHubStyle(style.id,false);for(const tab of document.querySelectorAll('.workspace-tabs>button')){const c=getComputedStyle(tab);if([c.borderTopLeftRadius,c.borderTopRightRadius,c.borderBottomLeftRadius,c.borderBottomRightRadius].some(r=>r!=='0px'))failures.push(style.id+':'+tab.textContent);}}return failures;})()`);
   assert.deepEqual(radii,[],layout+' square hover/focus tabs '+width);
   for(const nodeId of nodes.nodeIds)await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]},sessionId);
   await evaluate(`applyGistHubStyle('gitpulse',false);applyGistHubFont('plus-jakarta-sans',false)`);
   for(const theme of ['gitpulse-dark','gitpulse-light']) {
    await evaluate(`applyGistHubTheme(${JSON.stringify(theme)},false)`);
    for(const view of ['Overview','Quality','Benchmarks','Cadence']) {
     await evaluate(`Array.from(document.querySelectorAll('.dashboard-tabs button')).find(e=>e.textContent.includes(${JSON.stringify(view)})).click()`);
     await waitFor(`document.querySelector('.dashboard-tabs .selected').textContent.includes(${JSON.stringify(view)})`,view);
     const state=await evaluate(`(async()=>{await document.fonts.ready;const root=document.querySelector('[data-gitpulse-view]');return {view:root.dataset.gitpulseView,width:innerWidth,theme:getGistHubTheme(),style:getGistHubStyle(),font:getComputedStyle(root).fontFamily,overflow:document.documentElement.scrollWidth>innerWidth+1,cards:Array.from(root.querySelectorAll('.bento-card'),e=>({radius:getComputedStyle(e).borderRadius,bg:getComputedStyle(e).backgroundColor,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),headings:Array.from(root.querySelectorAll('h2'),e=>e.textContent)};})()`);
     assert.equal(state.overflow,false,layout+' '+width+' '+theme+' '+view);
     assert.ok(state.cards.length >= 1,view+' regions');
     assert.ok(state.cards.every(c=>c.radius==='24px'),view+' card corners');
     assert.match(state.font,/Plus Jakarta Sans/);
     assert.equal(await evaluate(`!!document.querySelector('.gp-demo-note')`),false);
     states.push({layout,...state});

    }
   }
  }
 }
 await mkdir('artifacts/gitpulse',{recursive:true});
 await writeFile('artifacts/gitpulse/measurements.json',JSON.stringify(states,null,2));
 const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
 await writeFile('artifacts/gitpulse/final.png',Buffer.from(screenshot.data,'base64'));
 // Valid axes must remain independent when switching a different dimension.
 await evaluate(`applyGistHubTheme('light');applyGistHubStyle('default');applyGistHubFont('default')`);
 await send('Page.reload',{},sessionId);await waitFor(`!!document.querySelector('.dashboard')`,'legacy choice reload',60000);
 assert.deepEqual(await evaluate(`({theme:getGistHubTheme(),style:getGistHubStyle(),font:getGistHubFont()})`),{theme:'light',style:'default',font:'default'});
 await evaluate(`document.querySelector('#workspace-tab-View').click()`);
 await waitFor(`document.querySelector('.neo-theme-picker')?.dataset.appearanceReady==='true'`,'appearance picker');
 await evaluate(`document.querySelector('.neo-theme-picker [popover]').showPopover();Array.from(document.querySelectorAll('.neo-theme-restore')).find(e=>e.textContent==='Restore default').click()`);
 await waitFor(`getGistHubTheme()==='gitpulse-dark' && getGistHubStyle()==='gitpulse' && getGistHubFont()==='plus-jakarta-sans'`,'Restore default preset');
 await evaluate(`applyGistHubTheme('gitpulse-dark');applyGistHubStyle('gitpulse');applyGistHubFont('plus-jakarta-sans')`);
 const settings=await evaluate(`(async()=>{const s=await import('/js/localSettings.js');const b=await s.createBackup();await s.inspectBackup(b);return JSON.parse(b).preferences;})()`);
 assert.equal(settings.theme,'gitpulse-dark');assert.equal(settings['gisthub:interface-style'],'gitpulse');assert.equal(settings['gisthub:font'],'plus-jakarta-sans');
 const sharing=await evaluate(`(async()=>{const s=await import('/js/appearanceSharing.js');const catalogs={themes:getGistHubThemes(),styles:getGistHubStyles(),fonts:getGistHubFonts(),presets:getGistHubStylePresets()};return s.validateAppearance(JSON.stringify({format:'gisthub-appearance',version:1,theme:'gitpulse-dark',style:'gitpulse',font:'plus-jakarta-sans',favorites:{themes:['gitpulse-dark'],styles:['gitpulse'],presets:['gitpulse-dark'],fonts:['plus-jakarta-sans']}}),catalogs).style;})()`);
 assert.equal(sharing,'gitpulse');
 console.log('PASS: GitPulse defaults, square tabs across all styles, 48 view/theme/layout/width states, card and font styling, legacy axes and backup validation.');
}

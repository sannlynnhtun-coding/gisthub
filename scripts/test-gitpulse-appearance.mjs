import assert from 'node:assert/strict';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

export async function checkGitPulseAppearance({evaluate,send,sessionId,waitFor}) {
 await waitFor(`!!document.querySelector('[data-testid="home-dashboard"]')`,'GitPulse Home',60000);
 assert.deepEqual(await evaluate(`({theme:getGistHubTheme(),style:getGistHubStyle(),font:getGistHubFont()})`),{theme:'gitpulse-dark',style:'gitpulse',font:'plus-jakarta-sans'});
 const fixtureRows=[{id:1,name:'alpha',description:'Reference fixture repository',language:'C#',stargazers_count:10,forks_count:2,open_issues_count:3,updated_at:'2026-10-01T00:00:00Z',owner:{login:'alice'},html_url:'https://github.com/alice/alpha',license:{spdx_id:'MIT'},topics:['tools']},{id:2,name:'beta',description:'Second repository',language:'TypeScript',stargazers_count:4,forks_count:1,updated_at:'2026-10-02T00:00:00Z',owner:{login:'alice'},html_url:'https://github.com/alice/beta'},{id:3,name:'gamma',description:'Third repository',language:'Python',stargazers_count:2,forks_count:1,updated_at:'2026-10-03T00:00:00Z',owner:{login:'alice'},html_url:'https://github.com/alice/gamma'}];
 const fixtureUser={login:'alice',name:'Reference Developer',bio:'Deterministic comparison fixture',public_repos:3,followers:12,following:5};
 await evaluate(`(()=>{const original=fetch;const repos=${JSON.stringify(fixtureRows)},user=${JSON.stringify(fixtureUser)};window.fetch=async(input,options)=>{const url=typeof input==='string'?input:input.url;if(!url.includes('/users/alice'))return original(input,options);return new Response(JSON.stringify(url.includes('/repos?')?repos:user),{headers:{'Content-Type':'application/json'}});};const input=document.querySelector('#dashboard-username');input.value='alice';input.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.dashboard-load').requestSubmit();})()`);
 await waitFor(`document.querySelector('.dashboard-status').textContent.includes('for alice')`,'matched comparison fixture');
 await evaluate(`document.querySelector('[data-kb-range="week"]').click()`);
 await waitFor(`document.querySelector('#kb-total-runs').textContent==='342'`,'demo week selection');
 await evaluate(`Array.from(document.querySelectorAll('.keycap')).find(e=>e.textContent==='P').click()`);
 await waitFor(`document.querySelector('#kb-selected-desc').textContent.includes('git push')`,'demo key inspection');
 await evaluate(`document.querySelector('[data-kb-range="month"]').click();Array.from(document.querySelectorAll('.keycap')).find(e=>e.textContent==='C').click()`);
 const states=[];
 const referenceHtml=await readFile(new URL('../specs/004-gitpulse-default-theme/references/menu-preview.html',import.meta.url));
 const referenceServer=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(referenceHtml);});
 await new Promise(resolve=>referenceServer.listen(0,'127.0.0.1',resolve));referenceServer.unref();
 const referenceUrl='http://127.0.0.1:'+referenceServer.address().port+'/';
 const target=await send('Target.createTarget',{url:'about:blank'});
 const attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const referenceSession=attached.sessionId;
 const referenceEval=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},referenceSession);if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
 await send('Page.enable',{},referenceSession);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{try{localStorage.setItem('gitpulse_username','alice');}catch{}let jq;Object.defineProperty(window,'jQuery',{configurable:true,get:()=>jq,set:value=>{jq=value;const original=value.ajax;value.ajax=options=>{if(!options.url.includes('api.github.com/users/'))return original(options);const d=value.Deferred();queueMicrotask(()=>d.resolve(options.url.includes('/repos?')?${JSON.stringify(fixtureRows)}:${JSON.stringify(fixtureUser)},'success',{}));return d.promise();};}});})()`},referenceSession);
 await send('Page.navigate',{url:referenceUrl},referenceSession);
 const deadline=Date.now()+30000;
 while(Date.now()<deadline && !await referenceEval(`!!document.querySelector('#view-overview .bento-card') && typeof window.jQuery==='function'`))await new Promise(r=>setTimeout(r,100));
 assert.equal(await referenceEval(`!!document.querySelector('#view-overview .bento-card')`),true,'frozen reference must render');
 await referenceEval(`document.fonts.ready.then(()=>true)`);
 await referenceEval(`(()=>{const s=document.createElement('style');s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';document.head.append(s);})()`);
 await referenceEval(`(async()=>{const native=$.ajax;$.ajax=options=>{if(!options.url.includes('api.github.com/users/'))return native(options);const d=$.Deferred();setTimeout(()=>d.resolve(options.url.includes('/repos?')?${JSON.stringify(fixtureRows)}:${JSON.stringify(fixtureUser)},'success',{}),0);return d.promise();};$('#github-username-input').val('alice');$('#username-form').trigger('submit');await new Promise(r=>setTimeout(r,400));})()`);
 const referenceStates=[];

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
     assert.ok(state.cards.length>=2,view+' regions');
     assert.ok(state.cards.every(c=>c.radius==='24px'),view+' reference card corners');
     assert.match(state.font,/Plus Jakarta Sans/);
     if(view==='Overview')assert.ok(state.headings.includes('Active dev hours')&&state.headings.includes('Developer workflow & command pulse'));
     if(view!=='Overview')assert.equal(await evaluate(`document.querySelector('.gp-demo-note').textContent.includes('Demo')`),true);
     const contentWidth=await evaluate(`document.querySelector('.dashboard').getBoundingClientRect().width`);
     await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600},referenceSession);
     const ref=await referenceEval(`(async()=>{document.documentElement.classList.toggle('dark',${theme==='gitpulse-dark'});const main=document.querySelector('main');main.style.width=${contentWidth+(width<640?32:64)}+'px';const button=document.querySelector('[data-view="'+${JSON.stringify(state.view)}+'"]');button.click();await new Promise(r=>setTimeout(r,400));return {view:${JSON.stringify(state.view)},width:innerWidth,theme:${JSON.stringify(theme)},cards:Array.from(document.querySelectorAll('#view-'+${JSON.stringify(state.view)}+' .bento-card'),e=>({radius:getComputedStyle(e).borderRadius,bg:getComputedStyle(e).backgroundColor,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),headings:Array.from(document.querySelectorAll('#view-'+${JSON.stringify(state.view)}+' h2'),e=>e.textContent)};})()`);
     referenceStates.push({layout,...ref});
     assert.equal(state.cards.length,ref.cards.length,view+' reference region count');
     state.cards.forEach((card,i)=>assert.ok(Math.abs(card.width-ref.cards[i].width)<=1,view+' card '+i+' width matches frozen reference'));
     states.push({layout,...state});

    }
   }
  }
 }
 await mkdir('artifacts/gitpulse',{recursive:true});
 await writeFile('artifacts/gitpulse/measurements.json',JSON.stringify(states,null,2));
 await writeFile('artifacts/gitpulse/reference-measurements.json',JSON.stringify(referenceStates,null,2));
 const refShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},referenceSession);
 await writeFile('artifacts/gitpulse/reference.png',Buffer.from(refShot.data,'base64'));
 await send('Target.closeTarget',{targetId:target.targetId});
 referenceServer.close();
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
 console.log('PASS: GitPulse defaults, square tabs across all styles, 48 view/theme/layout/width states, reference card/font geometry, legacy axes and backup validation.');
}

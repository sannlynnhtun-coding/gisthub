import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const start = await readFile(new URL('../GistHub/Pages/Start.razor', import.meta.url), 'utf8');
assert.ok(start.includes('@page "/"') && !start.includes('dashboard-username'));
const nav = await readFile(new URL('../GistHub/Layout/NavMenu.razor', import.meta.url), 'utf8');
assert.ok(nav.indexOf('new("home"') < nav.indexOf('new("my-collection"'));

export async function checkHomeDashboard({ evaluate, send, sessionId, waitFor }) {
  await waitFor("!!document.querySelector('[data-testid=home-dashboard]')", 'Home dashboard', 60000);
  await evaluate(`(() => new Promise((resolve,reject) => {
    const open=indexedDB.open('GistHubDB',4);
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const db=open.result, tx=db.transaction('profiles','readwrite');
      tx.oncomplete=()=>{db.close();resolve(true)};
      tx.onerror=()=>reject(tx.error);
      tx.objectStore('profiles').put({id:'fixture',name:'Fixture',accessToken:'fixture-token',githubUsername:'fixture'});
    };
  }))()`);
  await send('Page.addScriptToEvaluateOnNewDocument', {source:`
    const originalFetch=window.fetch;
    window.dashboardRequests=[];
    const rows=Array.from({length:23},(_,i)=>({id:i+1,name:'repo-'+String(i+1).padStart(2,'0'),language:i%2?'C#':'JavaScript',
      stargazers_count:i,size:i+1,private:i===0,owner:{login:'fixture'},html_url:'https://github.com/fixture/repo-'+(i+1)}));
    window.fetch=(input,init)=>{
      const url=new URL(input?.url??input,location.href);
      if(!url.pathname.includes('/_framework/') && (url.hostname==='api.github.com'||url.pathname.startsWith('/api/github/'))){
        const resource=url.pathname.replace(/^\\/api\\/github/,'');
        const authorization=new Headers(init?.headers??input?.headers).get('Authorization');
        dashboardRequests.push({resource,authorization});
        let data=[];
        if(resource==='/user')data={login:'fixture'};
        if(resource==='/user/repos')data=rows;
        if(resource==='/search/commits')data={total_count:1,items:[{author:{login:'fixture'},commit:{author:{date:new Date().toISOString()}}}]};
        if(resource==='/search/issues')data={total_count:1,items:[{id:1,number:3,title:'Review fixture',state:'open',body:'Fixture details',
          created_at:new Date().toISOString(),user:{login:'fixture'},html_url:'https://github.com/fixture/repo-01/pull/3',pull_request:{}}]};
        if(resource.endsWith('/actions/runs'))data={workflow_runs:[{name:'CI fixture',status:'completed',conclusion:'success',created_at:'2026-11-19T00:00:00Z'}]};
        if(resource.endsWith('/releases'))data=[{tag_name:'v1.0-fixture',published_at:'2026-11-19T00:00:00Z'}];
        if(resource.endsWith('/milestones'))data=[{title:'Release fixture milestone',open_issues:2,closed_issues:3,due_on:'2026-12-01T00:00:00Z'}];
        return Promise.resolve(new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));
      }
      return originalFetch(input,init);
    };
  `},sessionId);
  await send('Page.reload',{},sessionId);
  await waitFor("document.querySelector('.gp-explorer-footer')?.textContent.includes('1–3 of 23')",'signed-in first page',60000);
  assert.equal(await evaluate("document.querySelectorAll('.dashboard-explorer tbody tr').length"),3);
  for (const width of [1074, 390]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
    const columns = await evaluate("Array.from(document.querySelectorAll('.overview-card-column'), column => column.getBoundingClientRect().x)");
    assert.equal(columns.length,2);
    assert.equal(columns[0] === columns[1],width === 390);
  }
  await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  assert.equal(await evaluate("dashboardRequests.find(r=>r.resource==='/user')?.authorization"),'Bearer fixture-token');
  assert.equal(await evaluate("dashboardRequests.find(r=>r.resource==='/user/repos')?.authorization"),'Bearer fixture-token');
  assert.equal(await evaluate("document.querySelector('.dashboard-explorer tbody tr').textContent.includes('Private')"),true);
  const selectButton = (scope, label) => evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(scope+' button')})).find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
  await selectButton('.dashboard-page-actions','Next');
  await waitFor("document.querySelector('.gp-explorer-footer').textContent.includes('4–6 of 23')",'middle page');
  for (let first = 7; first <= 22; first += 3) {
    await selectButton('.dashboard-page-actions','Next');
    await waitFor(`document.querySelector('.gp-explorer-footer').textContent.includes('${first}–${Math.min(first+2,23)} of 23')`,'repository page '+first);
  }
  assert.equal(await evaluate("document.querySelectorAll('.dashboard-explorer tbody tr').length"),2);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('.dashboard-page-actions button')).find(b=>b.textContent==='Next').disabled"),true);
  await evaluate("(()=>{const e=document.querySelector('#dashboard-sort');e.value='stars';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await waitFor("document.querySelector('.gp-explorer-footer').textContent.includes('1–3 of 23') && document.querySelector('.dashboard-explorer tbody button').textContent==='repo-23'", 'sort resets paging');
  await evaluate("document.querySelector('#inspect-23').focus();document.querySelector('#inspect-23').click()");
  await waitFor("document.querySelector('#dashboard-inspector').open",'repository inspector');
  await selectButton('#dashboard-inspector','Close');
  await waitFor("!document.querySelector('#dashboard-inspector').open && document.activeElement.id==='inspect-23'", 'inspector restores focus');
  await waitFor("document.querySelector('.dashboard-analytics').textContent.includes('Top contributors')",'analytics overview');
  assert.equal(await evaluate("document.querySelectorAll('.analytics-day').length"),7);
  assert.equal(await evaluate("document.querySelectorAll('.analytics-metric-icon svg').length"),4);
  assert.equal(await evaluate("document.querySelectorAll('.analytics-stack [data-series]').length"),1);
  assert.equal(await evaluate("document.querySelector('.analytics-legend').textContent.trim()"),'fixture');
  await evaluate("(()=>{const period=document.querySelector('.dashboard-analytics select');period.value='30';period.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await waitFor("document.querySelectorAll('.analytics-day').length===30",'chart period changes');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.analytics-stack')).animationName"),'none');
  await send('Emulation.setEmulatedMedia',{features:[]},sessionId);
  await selectButton('[aria-label="Dashboard views"]','Repos');
  await waitFor("!!document.querySelector('#analytics-repo-23')",'Repos view');
  await selectButton('[aria-label="Dashboard views"]','Overview');
  await waitFor("document.querySelector('.analytics-overview .analytics-list button')?.textContent.includes('Review fixture')",'recent pull request');
  await evaluate("document.querySelector('.analytics-overview .analytics-list button').click()");
  await waitFor("document.querySelector('[aria-label=\"Dashboard views\"] .selected')?.textContent==='Quality & Review'",'recent PR opens Quality & Review');
  await waitFor("document.querySelector('.analytics-list button')?.textContent.includes('Review fixture')",'Code Review view');
  await evaluate("document.querySelector('.analytics-list button').click()");
  await waitFor("document.querySelector('[aria-label=\"Pull request details\"]')?.textContent.includes('Fixture details')",'PR details');
  for (const label of ['Quality & Review','Benchmarks & CI','Cadence & Goals','Overview']) {
    await selectButton('[aria-label="Dashboard views"]',label);
    await waitFor(`document.querySelector('[aria-label="Dashboard views"] .selected')?.textContent===${JSON.stringify(label)}`,label);
    if (label === 'Cadence & Goals') {
      await waitFor("document.querySelector('#view-cadence')?.textContent.includes('v1.0-fixture') && document.querySelector('#view-cadence')?.textContent.includes('3 of 5 issues closed')",'GitHub releases and milestones');
    }
    if (label === 'Benchmarks & CI') {
      await waitFor("document.querySelector('#view-benchmarks .analytics-list')?.textContent.replace(/\\s+/g,' ').includes('CI fixture · success')",'GitHub Actions run and result');
      await evaluate("(()=>{const repo=document.querySelector('#view-benchmarks select');repo.value='2';repo.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await waitFor("dashboardRequests.some(r=>r.resource==='/repos/fixture/repo-02/actions/runs' && r.authorization==='Bearer fixture-token')",'repository selection uses the current token');
      await waitFor("document.querySelector('#repo-city-card button')?.id==='city-23'",'city ranks repositories by size');
      const cityColors = await evaluate(`(() => {
        const previous = document.documentElement.dataset.theme;
        const colors = ['gitpulse-dark','gitpulse-light'].map(theme => {
          window.applyGistHubTheme(theme,false);
          const card = document.querySelector('#repo-city-card');
          return [getComputedStyle(card).backgroundColor, getComputedStyle(card.querySelectorAll('.city-roof')[1]).stroke, getComputedStyle(card.querySelector('#city-light stop')).stopColor];
        });
        window.applyGistHubTheme(previous,false);
        return colors;
      })()`);
      cityColors[0].forEach((color,index)=>assert.notEqual(color,cityColors[1][index]));
      await evaluate("document.querySelector('#city-23').focus()");
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13},sessionId);
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},sessionId);
      await waitFor("document.querySelector('#dashboard-inspector').open",'city opens existing inspector');
      await selectButton('#dashboard-inspector','Close');
      await waitFor("document.activeElement.id==='city-23'",'city restores building focus');
    }
  }
  assert.equal(await evaluate("document.querySelector('.dashboard')?.textContent.includes('Demo')"),false);
  const { checkHomeDashboardAppearance } = await import('./test-home-dashboard-appearance.mjs');
  await checkHomeDashboardAppearance({evaluate,send,sessionId,waitFor});
  console.log('PASS: signed-in Home, repository paging, inspector focus, analytics views and top-level navigation.');
}

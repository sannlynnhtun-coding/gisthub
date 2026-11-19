import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const start = await readFile(new URL('../GistHub/Pages/Start.razor', import.meta.url), 'utf8');
assert.ok(start.includes('Home') && !start.includes('Navigation.NavigateTo'), 'Root must render Home instead of redirecting');
const nav = await readFile(new URL('../GistHub/Layout/NavMenu.razor', import.meta.url), 'utf8');
assert.ok(nav.indexOf('new("home"') < nav.indexOf('new("my-collection"'), 'Home must precede collection');
console.log('PASS: Home route and command ordering.');

export async function checkHomeDashboard({ evaluate, send, sessionId, waitFor }) {
  await waitFor(`!!document.querySelector('[data-testid="home-dashboard"]')`, 'Home dashboard', 60000);
  await evaluate(`(() => {
    window.dashboardRequests = [];
    window.dashboardOriginalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input.url;
      const url = new URL(requestUrl, location.href);
      if (!url.pathname.includes('/users/')) return window.dashboardOriginalFetch(input, init);
      dashboardRequests.push({url:url.pathname+url.search, method:init?.method ?? input.method ?? 'GET', authorization:new Headers(init?.headers ?? input.headers).get('Authorization')});
      const username = url.pathname.split('/users/')[1].split('/')[0];
      if (username === 'slow') await new Promise(r=>setTimeout(r,700));
      if (username === 'offline') throw new TypeError('Offline fixture');
      if (username === 'missing') return new Response(JSON.stringify({message:'User not found'}), {status:404});
      if (username === 'limited') return new Response(JSON.stringify({message:'API rate limit exceeded'}), {status:429,headers:{'X-RateLimit-Reset':'1800000000'}});
      const repos = username === 'empty' ? [] : username === 'full' ? Array.from({length:100},(_,i)=>({id:i+1,name:'repo'+i,owner:{login:username}})) : [
        {id:1,name:'alpha',description:'<script>alert(1)</script>',language:'C#',stargazers_count:10,forks_count:2,open_issues_count:3,updated_at:'2026-01-01T00:00:00Z',html_url:'https://github.com/'+username+'/alpha',owner:{login:username},license:{spdx_id:'MIT'},topics:['tools']},
        {id:2,name:'beta',description:'Second repository',language:'TypeScript',stargazers_count:2,forks_count:1,owner:{login:username},html_url:'javascript:alert(1)'},
        {id:3,name:'private',private:true,stargazers_count:9000}];
      return new Response(JSON.stringify(url.pathname.endsWith('/repos') ? repos : {login:username,name:'Developer '+username,bio:'Public fixture developer'}), {status:200,headers:{'Content-Type':'application/json'}});
    };
    window.dashboardDownloads = []; window.dashboardDownloadFails = false;
    window.dashboardOriginalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() { if (this.download) { if(window.dashboardDownloadFails) throw Error('Download fixture failure'); dashboardDownloads.push({filename:this.download,href:this.href}); return; } return dashboardOriginalClick.call(this); };
    window.dashboardCopySuccess = false; window.copyToClipboard = async () => window.dashboardCopySuccess;
  })()`);
  const input = async (selector,value) => evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}); e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const load = async username => { await input('#dashboard-username',username); await evaluate(`document.querySelector('.dashboard-load').requestSubmit()`); };
  await load('alice');
  await waitFor(`document.querySelector('.dashboard-status').textContent.includes('Loaded 2 public repositories for alice')`, 'fixture repositories');
  assert.equal(await evaluate(`document.querySelectorAll('.dashboard-explorer tbody tr').length`),2);
  assert.equal(await evaluate(`!!document.querySelector('.dashboard-explorer script')`),false);
  assert.equal(await evaluate(`dashboardRequests.every(r=>r.method==='GET' && !r.authorization)`),true);
  await input('#dashboard-search','ALPHA');
  await waitFor(`document.querySelectorAll('.dashboard-explorer tbody tr').length===1`, 'filtered rows');
  await input('#dashboard-search','not-found');
  await waitFor(`document.querySelector('.dashboard-explorer').textContent.includes('No repositories match')`, 'no matches');
  await input('#dashboard-search','');
  await input('#dashboard-language','C#');
  await waitFor(`document.querySelectorAll('.dashboard-explorer tbody tr').length===1`, 'language filter');
  await input('#dashboard-language',''); await input('#dashboard-sort','name');
  await evaluate(`document.querySelector('#inspect-1').focus();document.querySelector('#inspect-1').click()`);
  await waitFor(`document.querySelector('#dashboard-inspector').open && document.querySelector('#inspector-title')?.textContent==='alpha'`, 'repository dialog');
  await evaluate(`Array.from(document.querySelectorAll('#dashboard-inspector button')).find(e=>e.textContent.includes('Copy')).click()`);
  await waitFor(`document.querySelector('#dashboard-inspector').textContent.includes('Could not copy')`, 'copy denial feedback');
  await evaluate(`window.dashboardCopySuccess=true;Array.from(document.querySelectorAll('#dashboard-inspector button')).find(e=>e.textContent.includes('Copy')).click()`);
  await waitFor(`document.querySelector('#dashboard-inspector').textContent.includes('Clone command copied')`, 'copy success feedback');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
  await waitFor(`!document.querySelector('#dashboard-inspector').open && document.activeElement.id==='inspect-1'`, 'dialog Escape/focus restore');
  await evaluate(`document.querySelector('#dashboard-export').click()`);
  await waitFor(`dashboardDownloads.length===1`, 'CSV download');
  assert.equal(await evaluate(`dashboardDownloads[0].filename`),'alice-github-telemetry.csv');
  await evaluate(`window.dashboardDownloadFails=true;document.querySelector('#dashboard-export').click()`);
  await waitFor(`document.querySelector('[role="alert"]')?.textContent.includes('Download failed')`, 'download error feedback');
  await evaluate(`window.dashboardDownloadFails=false`);
  for (const view of ['Quality','Benchmarks','Cadence','Overview']) {
    await evaluate(`Array.from(document.querySelectorAll('.dashboard-tabs button')).find(e=>e.textContent.includes(${JSON.stringify(view)})).click()`);
    await waitFor(`document.querySelector('.dashboard-tabs .selected').textContent.includes(${JSON.stringify(view)})`,view);
    if (view==='Benchmarks' || view==='Cadence') assert.equal(await evaluate(`document.querySelector('.dashboard').innerText.includes('Demo')`),true);
  }
  for (const [username,text] of [['missing','User not found'],['limited','rate limit'],['offline','Could not load'],['empty','No public repositories'],['full','possibly incomplete']]) {
    await load(username); await waitFor(`document.querySelector('.dashboard').innerText.includes(${JSON.stringify(text)})`,username);
  }
  await load('slow'); await load('bob');
  await waitFor(`document.querySelector('.dashboard-status').textContent.includes('for bob')`, 'latest load wins');
  await evaluate(`new Promise(r=>setTimeout(r,900))`);
  assert.equal(await evaluate(`document.querySelector('.dashboard-profile').innerText.includes('@bob')`),true);
  const before = await evaluate('dashboardRequests.length'); await load('bad/user');
  await waitFor(`document.querySelector('[role="alert"]')?.textContent.includes('valid GitHub username')`, 'invalid username');
  assert.equal(await evaluate('dashboardRequests.length'),before);
  await load('alice'); await waitFor(`document.querySelector('.dashboard-status').textContent.includes('for alice')`, 'reload fixture');
  for (const layout of ['excel','admin']) {
    await evaluate(`(() => { const s=document.querySelector('[aria-label="Workspace layout"]');s.value=${JSON.stringify(layout)};s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(`!!document.querySelector(${JSON.stringify('.'+(layout==='excel'?'excel-workspace':'admin-portal'))})`,layout+' layout');
    await evaluate(`document.querySelector('#workspace-tab-Home').click()`);
    await waitFor(`!!document.querySelector('[data-command-id="home"] a')`,'Home commands');
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-command-id]')).slice(0,2).map(e=>e.dataset.commandId)`),['home','my-collection']);
    assert.equal(await evaluate(`document.querySelector('[data-command-id="my-collection"] a').getAttribute('href')`),'my-gists?favorites=true');
  }
  for (const route of ['/my-gists','/my-gists?favorites=true','/discovery','/']) {
    await evaluate(`(() => {const a=document.createElement('a');a.href=${JSON.stringify(route)};document.body.append(a);a.click();a.remove();})()`);
    await waitFor(`location.pathname===${JSON.stringify(route.split('?')[0])}`,route+' navigation');
    if(route==='/') await waitFor(`!!document.querySelector('[data-testid="home-dashboard"]')`,'Home after collection/Discovery');
  }
  await load('alice'); await waitFor(`document.querySelector('.dashboard-status').textContent.includes('for alice')`, 'data after navigation');
  const { checkHomeDashboardAppearance } = await import('./test-home-dashboard-appearance.mjs');
  await checkHomeDashboardAppearance({evaluate,send,sessionId,waitFor});
  console.log('PASS: dashboard fixtures, filtering, inspection, clipboard, export, four views, failures/races and both navigation layouts.');
}

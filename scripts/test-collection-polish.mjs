import assert from 'node:assert/strict';
export async function checkCollectionPolish({evaluate,send,sessionId,waitFor}) {
  const origin=await evaluate('location.origin');
  if (process.env.BROWSER_CHECK_COLLECTION_EDITOR_ONLY === '1') {
    const {checkCollectionEditor}=await import('./test-collection-editor.mjs');
    await checkCollectionEditor({evaluate,send,sessionId,waitFor});return;
  }

  await evaluate(`document.querySelector('[data-testid="global-search-trigger"]').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="global-search-input"]'))`, 'search dialog');
  await evaluate(`document.querySelector('[data-testid="global-search-input"]').focus()`);
  const focus=await evaluate(`(() => {const input=document.querySelector('[data-testid="global-search-input"]');const wrap=input.closest('.global-search-input-wrap');return {wrapper:getComputedStyle(wrap).outlineStyle,input:getComputedStyle(input).outlineStyle,shadow:getComputedStyle(input).boxShadow};})()`);
  assert.equal(focus.wrapper,'solid');assert.equal(focus.input,'none');assert.equal(focus.shadow,'none');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'},sessionId);
  await waitFor(`!document.querySelector('[data-testid="global-search-input"]')`,'search dismissed');
  await send('Emulation.setDeviceMetricsOverride',{width:724,height:846,deviceScaleFactor:1,mobile:true},sessionId);
  await evaluate(`document.querySelector('#workspace-tab-Home').click()`);
  const badge=await evaluate(`(() => {const b=document.querySelector('[data-quick-access-toggle]'),r=b.closest('.ribbon-command');const box=b.getBoundingClientRect(),tile=r.getBoundingClientRect();return {position:getComputedStyle(b.parentElement).position,top:box.top-tile.top,right:tile.right-box.right};})()`);
  assert.equal(badge.position,'absolute');assert.ok(badge.top>=0 && badge.top<8);assert.ok(badge.right>=0 && badge.right<8);
  await send('Emulation.clearDeviceMetricsOverride',{},sessionId);
  for(const bookmarked of [true,false]) {
    await send('Page.navigate',{url:origin+'/editor'},sessionId);
    await waitFor(`Boolean(document.querySelector('#gist-filename'))`,'authenticated editor',60000);
    await evaluate(`(() => {const original=window.fetch;window.fetch=async (url,options)=>{if(String(url).includes('api.github.com/gists') && options?.method==='POST')return new Response(JSON.stringify({id:'created-${bookmarked}',description:'Created regression',files:{'test.txt':{filename:'test.txt',content:'Created content',language:'Text'}},public:false,created_at:'2026-11-23T00:00:00Z',updated_at:'2026-11-23T00:00:00Z',owner:{login:'browser-user'}}),{status:201,headers:{'Content-Type':'application/json'}});return original(url,options);};for(const [selector,value] of [['#gist-description','Created regression'],['#gist-filename','test.txt'],['[aria-label="Gist content"]','Created content']]){const el=document.querySelector(selector);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
    if(await evaluate(`document.querySelector('.bookmark-toggle').getAttribute('aria-pressed')`) !== String(bookmarked))await evaluate(`document.querySelector('.bookmark-toggle').click()`);
    await evaluate(`document.querySelector('.neo-editor-actions button').click()`);
    await waitFor(`location.pathname==='/my-gists'`,'saved collection destination');
    assert.equal(await evaluate(`new URLSearchParams(location.search).get('favorites')==='true'`),bookmarked);
    await waitFor(`document.querySelector('[data-testid="collection-bookmarks-toggle"]')?.getAttribute('aria-pressed')==='${bookmarked}'`, 'collection filter matches saved choice');
  }
  if (process.env.BROWSER_CHECK_COLLECTION_EDITOR === '1') {
    const {checkCollectionEditor}=await import('./test-collection-editor.mjs');
    await checkCollectionEditor({evaluate,send,sessionId,waitFor});
  }
  console.log('PASS: search wrapper focus, mobile favorite badge, and mocked create bookmark destinations.');
}

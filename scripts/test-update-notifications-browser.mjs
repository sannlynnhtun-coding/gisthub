import assert from 'node:assert/strict';

export async function checkUpdateNotifications({ evaluate, send, sessionId, waitFor, url }) {
    await evaluate(`(async () => {
        const storage=await import('/js/indexedDb.js');
        await storage.saveItem('profiles',{id:'browser-profile',name:'Update Test',accessToken:'not-a-real-token',githubUsername:'browser-user',bio:''});
        await storage.saveItem('gists',{
            id:'search-gist',storageKey:'browser-user:search-gist',cacheOwnerUsername:'browser-user',
            description:'Update draft fixture',public:false,isSynced:true,
            files:{'notes.md':{filename:'notes.md',content:'Original saved text',language:'Markdown',type:'text/markdown'}}
        });
    })()`);
    await send('Page.navigate', { url: new URL('/my-gists', url).href }, sessionId);
    await waitFor(`Boolean(document.querySelector('.update-notifications button'))`, 'the notification bell', 60000);
    await waitFor(`Boolean(navigator.serviceWorker.controller)`, 'the offline worker', 60000);
    await evaluate(`(async () => {
        await (await caches.open('gisthub-update-state')).put('/__gisthub_update__', new Response(JSON.stringify({version:'browser-test-new'})));
        navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {data:{type:'GISTHUB_UPDATE'}}));
    })()`);
    await waitFor(`Boolean(document.querySelector('.update-badge'))`, 'the update badge');
    await evaluate(`document.querySelector('.update-notifications > button').click()`);
    await waitFor(`Boolean(document.querySelector('#update-notifications-panel'))`, 'the notification panel');
    await evaluate(`Array.from(document.querySelectorAll('#update-notifications-panel button')).find(b=>b.textContent==='Later').click()`);
    await waitFor(`!document.querySelector('#update-notifications-panel') && Boolean(document.querySelector('.update-badge'))`, 'Later preserving the update badge');

    await send('Page.navigate', { url: new URL('/editor/search-gist', url).href }, sessionId);
    await waitFor(`document.querySelector('textarea.neo-editor-input')?.value === 'Original saved text'`, 'the cached snippet editor');
    await waitFor(`Boolean(document.querySelector('.update-badge'))`, 'push state surviving navigation');
    await evaluate(`(() => {
        const field=document.querySelector('textarea.neo-editor-input');
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,'Draft preserved through the update reload — မြန်မာ');
        field.dispatchEvent(new Event('input',{bubbles:true}));
    })()`);
    await waitFor(`document.querySelector('.neo-editor-status')?.textContent.includes('COL 50')`, 'the editor binding to receive the unsaved text');
    // Simulate the worker handoff; real cache/activation guards are covered by test-app-updates.mjs.
    await evaluate(`(async () => {
        const r=await window.gistHubServiceWorkerReady;
        Object.defineProperty(r,'waiting',{get:()=>({postMessage:({type},ports)=>{
            ports[0].postMessage(type==='GET_CLIENT_COUNT'?{clients:1}:{ok:true});
            if(type==='ACTIVATE_UPDATE') setTimeout(()=>navigator.serviceWorker.dispatchEvent(new Event('controllerchange')),50);
        }})});
        r.update=async()=>{};
        document.querySelector('.update-notifications > button').click();
    })()`);
    await waitFor(`Boolean(document.querySelector('#update-notifications-panel .btn-primary'))`, 'update confirmation');
    await evaluate(`document.querySelector('#update-notifications-panel .btn-primary').click()`);
    await waitFor(`document.body?.innerText.includes('Your local draft was restored after updating.') && document.querySelector('textarea.neo-editor-input')?.value === 'Draft preserved through the update reload — မြန်မာ'`, 'draft restoration after a full reload', 60000);
    const content = await evaluate(`document.querySelector('textarea.neo-editor-input').value`);
    assert.equal(content, 'Draft preserved through the update reload — မြန်မာ');
    assert.equal(await evaluate(`document.body.inert`), false);
    console.log('PASS: browser update badge, Later persistence, .NET draft checkpoint, full reload, and Unicode draft restoration.');
}

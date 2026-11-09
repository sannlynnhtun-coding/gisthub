import assert from 'node:assert/strict';

export async function checkLocalSettings({ evaluate, send, sessionId, waitFor }) {
  const ready = `document.querySelector('#settings-title') && !document.querySelector('#local-settings-download').matches(':disabled') && document.querySelector('.neo-backup-reminder')?.dataset.backupReady==='true'`;
  await waitFor(ready, 'local settings page', 60000);
  assert.equal(await evaluate(`document.querySelector('.neo-backup-reminder').hidden`), true);
  await evaluate(`window.automaticDownloads=0;window.downloadTextFile=()=>{window.automaticDownloads++}`);
  const closeWorkspace = async () => {
    await evaluate(`document.querySelector('.tool-workspace-session:not([hidden]) .tool-page-header > button')?.click()`);
    await waitFor(`!document.querySelector('.tool-workspace-session:not([hidden])')`, 'workspace available');
  };
  const openPicker = async () => {
    await closeWorkspace();
    await evaluate(`document.querySelector('#workspace-tab-View').click()`);
    await waitFor(`document.querySelector('.neo-theme-picker')?.dataset.appearanceReady === 'true'`, 'View appearance controls');
    await evaluate(`document.querySelector('.neo-theme-picker [popover]').showPopover()`);
    await waitFor(`document.querySelector('.neo-theme-picker [popover]').matches(':popover-open')`, 'appearance picker');
  };
  for (const [category, attribute, id] of [['themes', 'theme', 'dark'], ['styles', 'style', 'flat'], ['presets', 'preset', 'bold-light'], ['fonts', 'font', 'roboto']]) {
    await openPicker();
    await evaluate(`document.querySelector('[data-appearance-favorites-only]').checked=false;document.querySelector('[data-appearance-tab="${category}"]').click()`);
    await evaluate(`document.querySelector('[data-appearance-kind="${category}"][data-${attribute}-option="${id}"]').click()`);
    await waitFor(`!document.querySelector('.neo-theme-picker [popover]').matches(':popover-open')`, `${category} selection`);
    await openPicker();
    await evaluate(`document.querySelector('[data-appearance-favorite]').click()`);
    await waitFor(`JSON.parse(localStorage.getItem('gisthub:appearance-favorites'))?.${category}.includes('${id}')`, `favorite ${category}`);
    await evaluate(`(()=>{const input=document.querySelector('[data-appearance-favorites-only]');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    assert.equal(await evaluate(`document.querySelectorAll('[data-appearance-kind="${category}"]:not([hidden])').length`), 1);
    assert.equal(await evaluate(`document.querySelector('[data-appearance-kind="${category}"]:not([hidden])').getAttribute('data-${attribute}-option')`), id);
    assert.equal(await evaluate(`document.querySelector('[data-appearance-favorite]').getAttribute('aria-pressed')`), 'true');
    await evaluate(`document.querySelector('.neo-theme-picker [popover]').hidePopover()`);
  }
  assert.equal(await evaluate(`document.querySelector('.neo-backup-reminder').hidden`), false);
  assert.equal(await evaluate(`window.automaticDownloads`), 0, 'Local changes must never download automatically');
  await send('Page.navigate', { url: new URL('/settings', await evaluate('location.href')).href }, sessionId);
  await waitFor(ready, 'persisted settings page', 60000);
  assert.equal(await evaluate(`document.querySelector('.neo-backup-reminder').hidden`), false, 'Reminder must survive reload');
  await openPicker();
  await evaluate(`document.querySelector('[data-appearance-tab="fonts"]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-font-option="roboto"]').dataset.favorite`), 'true');
  await evaluate(`document.querySelector('[data-appearance-favorite]').click()`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('gisthub:appearance-favorites')).fonts.includes('roboto')`), false);
  await evaluate(`document.querySelector('[data-appearance-favorite]').click();document.querySelector('.neo-theme-picker [popover]').hidePopover()`);
  await evaluate(`(async()=>{
    const db=await import('/js/indexedDb.js');
    await db.saveItem('profiles',{id:'test-profile',accessToken:'TOKEN-DO-NOT-EXPORT',githubUsername:'alice'});
    for(const username of ['alice','bob']) await db.saveItem('gists',{id:'shared',storageKey:username+':shared',cacheOwnerUsername:username,isBookmarked:username==='alice',bookmarkOrder:2,collectionNames:['Reading'],tags:['local-tag'],isSynced:false,updated_at:'2026-01-01T00:00:00Z',files:{'note.md':{content:'PRIVATE-GIST-CONTENT'}}});
    await db.saveItem('groups',{id:'reading',name:'Reading'});
    localStorage.setItem('button-sounds-enabled','false');localStorage.setItem('gisthub:files-blurred','true');
    localStorage.setItem('gisthub:markdown-cards-draft','Draft to keep');localStorage.setItem('gisthub:tool-category:tools-category-getting-started','false');
    localStorage.setItem('unknown-private-key','DO-NOT-EXPORT');
    window.downloadTextFile=(filename,text,type)=>{window.localBackupDownload={filename,text,type}};
  })()`);
  await evaluate(`document.querySelector('.workspace-command-group button').click()`);
  await waitFor(`!!document.querySelector('.tool-workspace-session:not([hidden]) [aria-labelledby="settings-title"]')`, 'settings workspace reopened');
  await evaluate(`document.querySelector('#local-settings-download').click()`);
  await waitFor(`Boolean(window.localBackupDownload)`, 'unified JSON download');
  const download = await evaluate('window.localBackupDownload');
  await waitFor(`document.querySelector('.neo-backup-reminder').hidden`, 'settings-page download clears reminder');
  assert.equal(download.type, 'application/json');assert.match(download.filename, /^gisthub-local-settings-.*\.json$/);
  assert.ok(!download.text.includes('TOKEN-DO-NOT-EXPORT') && !download.text.includes('PRIVATE-GIST-CONTENT') && !download.text.includes('DO-NOT-EXPORT'));
  const backup = JSON.parse(download.text);
  assert.equal(backup.gists.length, 2);assert.equal(backup.favorites.presets[0], 'bold-light');
  assert.equal(backup.preferences['gisthub:markdown-cards-draft'], 'Draft to keep');
  for (const invalid of ['{', JSON.stringify({ ...backup, version: 99 }), JSON.stringify({ ...backup, preferences: { accessToken: 'bad' } }),
    JSON.stringify({ ...backup, favorites: { fonts: [null] } }), JSON.stringify({ ...backup, gists: [null] }), JSON.stringify({ ...backup, gists: [...backup.gists, backup.gists[0]] })]) {
    assert.equal(await evaluate(`(async()=>{try{await (await import('/js/localSettings.js')).restoreBackup(${JSON.stringify(invalid)});return false}catch{return true}})()`), true);
  }
  await evaluate(`(async()=>{
    const db=await import('/js/indexedDb.js');await db.deleteItem('profiles','test-profile');
    const gist=(await db.getAllItems('gists')).find(g=>g.storageKey==='alice:shared');gist.isBookmarked=false;gist.collectionNames=['Keep'];gist.collectionName='Keep';gist.tags=['existing-tag'];await db.saveItem('gists',gist);
    await db.saveItem('gists',{...gist,id:'existing',storageKey:'alice:existing',isBookmarked:true,bookmarkOrder:1});
    await db.deleteItem('groups','reading');await db.saveItem('groups',{id:'reading',name:'Keep'});
    localStorage.setItem('button-sounds-enabled','true');localStorage.setItem('gisthub:appearance-favorites',JSON.stringify({themes:['light'],styles:[],presets:[],fonts:[]}));
  })()`);
  const withMissing = JSON.stringify({ ...backup, gists: [...backup.gists, { ...backup.gists[0], id: 'missing' }] });
  const preview = await evaluate(`(async()=>await (await import('/js/localSettings.js')).inspectBackup(${JSON.stringify(withMissing)}))()`);
  assert.equal(preview.missing, 1);assert.equal(preview.bookmarks, 2);
  assert.equal(await evaluate(`(async()=>{
    const original=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(stores,mode,...rest){const tx=original.call(this,stores,mode,...rest);if(mode==='readwrite'&&Array.isArray(stores)&&stores.includes('groups'))queueMicrotask(()=>tx.abort());return tx};
    try{await (await import('/js/localSettings.js')).restoreBackup(${JSON.stringify(withMissing)});return false}catch{return localStorage.getItem('button-sounds-enabled')==='true'&&!(await (await import('/js/indexedDb.js')).getAllItems('gists')).find(g=>g.storageKey==='alice:shared').isBookmarked}finally{IDBDatabase.prototype.transaction=original}
  })()`), true, 'A failed database transaction must roll back preferences and bookmarks');
  const upload = async text => evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(text)}],'settings.json',{type:'application/json'}));const input=document.querySelector('#local-settings-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await upload('{');await waitFor(`Boolean(document.querySelector('#local-settings-error'))`, 'invalid JSON error');
  assert.equal(await evaluate(`Boolean(document.querySelector('#local-settings-restore'))`), false);
  await upload(withMissing);await waitFor(`Boolean(document.querySelector('#local-settings-restore'))`, 'backup preview');
  assert.match(await evaluate(`document.querySelector('#local-settings-preview').textContent`), /1 gist settings will be skipped/);
  await evaluate(`document.querySelector('#local-settings-restore').click()`);
  await waitFor(`(${ready}) && !document.querySelector('#local-settings-preview')`, 'reload after restore', 60000);
  const result = await evaluate(`(async()=>({gists:await(await import('/js/indexedDb.js')).getAllItems('gists'),groups:await(await import('/js/indexedDb.js')).getAllItems('groups'),favorites:JSON.parse(localStorage.getItem('gisthub:appearance-favorites')),sound:localStorage.getItem('button-sounds-enabled'),draft:localStorage.getItem('gisthub:markdown-cards-draft'),other:localStorage.getItem('unknown-private-key')}))()`);
  const alice = result.gists.find(gist => gist.storageKey === 'alice:shared');
  assert.equal(alice.isBookmarked, true);assert.equal(alice.bookmarkOrder, 2);
  assert.deepEqual(alice.collectionNames, ['Keep', 'Reading']);assert.deepEqual(alice.tags, ['existing-tag', 'local-tag']);
  assert.equal(alice.isSynced, false);assert.equal(alice.files['note.md'].content, 'PRIVATE-GIST-CONTENT');
  assert.equal(result.gists.find(gist => gist.storageKey === 'bob:shared').isBookmarked, false);
  assert.deepEqual(result.groups.map(group => group.name).sort(), ['Keep', 'Reading']);assert.deepEqual(result.favorites.themes.sort(), ['dark', 'light']);
  assert.equal(result.sound, 'false');assert.equal(result.draft, 'Draft to keep');assert.equal(result.other, 'DO-NOT-EXPORT');
  await evaluate(`(async()=>await (await import('/js/localSettings.js')).restoreBackup(${JSON.stringify(withMissing)}))()`);
  assert.equal(await evaluate(`(async()=>(await(await import('/js/indexedDb.js')).getAllItems('groups')).length)()`), 2, 'Repeated restore must not duplicate playlists');
  assert.deepEqual(await evaluate(`(async()=>{const db=await import('/js/indexedDb.js');for(const gist of (await db.getAllItems('gists')).filter(g=>g.cacheOwnerUsername==='alice')){gist.bookmarkOrder=0;if(gist.id==='shared')gist.updated_at='2026-02-01T00:00:00Z';await db.saveItem('gists',gist)}return JSON.parse(await(await import('/js/localSettings.js')).createBackup()).gists.filter(g=>g.username==='alice'&&g.isBookmarked).map(g=>g.id)})()`), ['shared', 'existing'], 'Unranked bookmarks must retain the library date ordering in backups');
  await closeWorkspace();
  await evaluate(`window.reminderDownloads=0;window.downloadTextFile=()=>{window.reminderDownloads++};document.querySelector('#local-backup-reminder').click()`);
  await waitFor(`document.querySelector('.neo-backup-reminder').hidden`, 'header download clears reminder');
  assert.equal(await evaluate(`window.reminderDownloads`), 1);
  await evaluate(`(async()=>{window.applyGistHubTheme(window.getGistHubTheme(),false);window.gistHubBackup.setPreference('button-sounds-enabled',localStorage.getItem('button-sounds-enabled'));const db=await import('/js/indexedDb.js');const gist=(await db.getAllItems('gists'))[0];gist.files={'note.md':{content:'Content edit only'}};await db.saveItem('gists',gist);const group=(await db.getAllItems('groups'))[0];await db.saveItem('groups',group)})()`);
  assert.equal(await evaluate(`document.querySelector('.neo-backup-reminder').hidden`), true, 'Previews, unchanged preferences, and content-only edits need no new settings backup');
  await evaluate(`(async()=>{const db=await import('/js/indexedDb.js');const gist=(await db.getAllItems('gists')).find(g=>g.storageKey==='alice:shared');gist.isBookmarked=!gist.isBookmarked;await db.saveItem('gists',gist)})()`);
  await waitFor(`!document.querySelector('.neo-backup-reminder').hidden`, 'bookmark change reminder');
  assert.equal(await evaluate(`window.reminderDownloads`), 1, 'Bookmark writes must not download automatically');
  await evaluate(`window.downloadTextFile=()=>{throw new Error('Download blocked')};document.querySelector('#local-backup-reminder').click()`);
  await waitFor(`Boolean(document.querySelector('.neo-backup-reminder__error'))`, 'download failure alert');
  assert.equal(await evaluate(`document.querySelector('.neo-backup-reminder').hidden`), false);
  await evaluate(`window.downloadTextFile=()=>{window.gistHubBackup.setPreference('button-sounds-enabled','true')};document.querySelector('#local-backup-reminder').click()`);
  await waitFor(`!document.querySelector('#local-backup-reminder').disabled && !document.querySelector('.neo-backup-reminder__error')`, 'changed-during-download completion');
  assert.equal(await evaluate(`document.querySelector('.neo-backup-reminder').hidden`), false, 'A concurrent change must keep the reminder');
  await evaluate(`window.downloadTextFile=()=>{};document.querySelector('#local-backup-reminder').click()`);
  await waitFor(`document.querySelector('.neo-backup-reminder').hidden`, 'latest backup clears reminder');
  const ordering = await evaluate(`(async()=>{
    const db=await import('/js/indexedDb.js'),settings=await import('/js/localSettings.js');
    for(const gist of (await db.getAllItems('gists')).filter(g=>g.cacheOwnerUsername==='alice')) {
      gist.isBookmarked=true;gist.bookmarkOrder=0;gist.isSynced=true;
      gist.updated_at=gist.id==='shared'?'2026-02-01T00:00:00Z':'2026-01-01T00:00:00Z';await db.saveItem('gists',gist);
    }
    await settings.downloadBackup();
    const ids=async()=>JSON.parse(await settings.createBackup()).gists.filter(g=>g.username==='alice'&&g.isBookmarked).map(g=>g.id);
    const before=await ids(),gist=(await db.getAllItems('gists')).find(g=>g.storageKey==='alice:existing');
    await db.saveSyncedGist({...gist,updated_at:'2026-03-01T00:00:00Z'});
    const after=await ids(),unrankedReminder=!document.querySelector('.neo-backup-reminder').hidden;
    gist.bookmarkOrder=1;gist.updated_at='2026-03-01T00:00:00Z';await db.saveItem('gists',gist);await settings.downloadBackup();
    await db.saveSyncedGist({...gist,updated_at:'2026-04-01T00:00:00Z'});
    return {before,after,unrankedReminder,rankedReminder:window.gistHubBackup.pending()};
  })()`);
  assert.deepEqual(ordering, {before:['shared','existing'],after:['existing','shared'],unrankedReminder:true,rankedReminder:false}, 'Sync must remind when date-based ordering changes, while ranked content updates stay clean');
  const longNames = await evaluate(`(async()=>{
    const db=await import('/js/indexedDb.js'),settings=await import('/js/localSettings.js'),name='Playlist '+ 'x'.repeat(257),tag='t'.repeat(257);
    await db.saveItem('groups',{id:'long-name',name});
    const gist=(await db.getAllItems('gists')).find(g=>g.storageKey==='alice:existing');gist.collectionNames=[name];gist.collectionName=name;gist.tags=[tag];await db.saveItem('gists',gist);
    const json=await settings.createBackup();await settings.inspectBackup(json);
    await db.deleteItem('groups','long-name');gist.collectionNames=[];gist.collectionName=null;gist.tags=[];await db.saveItem('gists',gist);
    await settings.restoreBackup(json);
    const restored=(await db.getAllItems('gists')).find(g=>g.storageKey==='alice:existing');
    let oversizedRejected=false,identifierRejected=false;
    try{await settings.inspectBackup(json+' '.repeat(5*1024*1024))}catch{oversizedRejected=true}
    const invalid=JSON.parse(json);invalid.favorites.fonts=['x'.repeat(257)];
    try{await settings.inspectBackup(JSON.stringify(invalid))}catch{identifierRejected=true}
    return {playlist:(await db.getAllItems('groups')).some(g=>g.name===name),assignment:restored.collectionNames.includes(name),tag:restored.tags.includes(tag),oversizedRejected,identifierRejected};
  })()`);
  assert.deepEqual(longNames, {playlist:true,assignment:true,tag:true,oversizedRejected:true,identifierRejected:true}, 'Long user names and tags must round-trip without weakening file-size or identifier validation');
  await evaluate(`localStorage.setItem('gisthub:backup-revision',crypto.randomUUID());window.dispatchEvent(new StorageEvent('storage',{key:'gisthub:backup-revision'}))`);
  assert.equal(await evaluate(`document.querySelector('.neo-backup-reminder').hidden`), false, 'Other-tab changes must refresh the reminder');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  await openPicker();
  assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`), false);
  assert.equal(await evaluate(`document.querySelector('.neo-theme-panel').getBoundingClientRect().bottom<=innerHeight`), true);
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  console.log('PASS: favorites, JSON backup/restore, account isolation, validation/rollback, persistent header reminder, manual-only downloads, failure/concurrent-change handling, date-order sync reminders, long playlist/tag round-trips, and mobile layout.');
}

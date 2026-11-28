import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canonicalize, sha256, envelope, verifyRows, canAppend } from './lib/google-sync-protocol.mjs';
const fixtures = JSON.parse(await readFile(new URL('../GistHub.RegressionTests/Fixtures/GoogleSheetsSync/canonical-vectors.json', import.meta.url), 'utf8'));
for (const vector of fixtures) {
  const canonical = canonicalize(JSON.parse(vector.input));
  assert.equal(canonical, vector.canonical);
  assert.equal(await sha256(canonical), vector.sha256);
}
const twoDevices=JSON.parse(await readFile(new URL('../GistHub.RegressionTests/Fixtures/GoogleSheetsSync/two-device.json',import.meta.url),'utf8'));
assert.equal((await verifyRows(twoDevices.rows,twoDevices.scope.libraryId,twoDevices.scope.workspaceId)).size,twoDevices.expected.uniqueOperations);
assert.throws(() => canonicalize('\ud800'));
assert.throws(() => canonicalize(Infinity));
const workspaceId = '10000000-0000-4000-8000-000000000001';
const body = { opId:crypto.randomUUID(), libraryId:'9007199254740993', workspaceId,
  deviceId:crypto.randomUUID(), entityType:'collection',entityId:'reading',field:'displayName',
  kind:'set',value:'မြန်မာ 😀',parentIds:[],logicalCounter:'1' };
const first = await envelope(body);
const child = await envelope({ ...body,opId:crypto.randomUUID(),parentIds:[body.opId],value:'Renamed',logicalCounter:'2' });
assert.equal((await verifyRows([child, first, child], body.libraryId,workspaceId)).size,2);
await assert.rejects(verifyRows([child],body.libraryId,workspaceId));
await assert.rejects(verifyRows([first,[first[0],'0'.repeat(64),first[2]]],body.libraryId,workspaceId));
await assert.rejects(verifyRows([first],body.libraryId,crypto.randomUUID()));
const altered = await envelope({ ...body,value:'Other' });
await assert.rejects(verifyRows([first,altered],body.libraryId,workspaceId));
assert.equal(canAppend({ operations:19999,bodyBytes:0,rows:19999 },[first],new Map()),true);
assert.equal(canAppend({ operations:19999,bodyBytes:0,rows:19999 },[first,first],new Map()),true,'same-batch duplicates count once logically and twice physically');
assert.equal(canAppend({ operations:20000,bodyBytes:0,rows:20000 },[first],new Map()),false);
assert.equal(canAppend({ operations:19999,bodyBytes:0,rows:19999 },[first,child],new Map()),false);
assert.equal(canAppend({ operations:1,bodyBytes:0,rows:25000 },[first],new Map()),false);
assert.equal((await verifyRows([first,child],body.libraryId,workspaceId)).size,2,'overshoot does not disable reading');
console.log('PASS: shared JS/C# canonical vectors, body hashing, closure, duplicate/corruption handling and capacity admission.');

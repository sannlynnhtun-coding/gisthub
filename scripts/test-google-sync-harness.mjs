import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';

const html=await readFile(new URL('./lib/google-sync-transport.html',import.meta.url),'utf8');
const inline=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:inline,encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr);
const port=21000+Math.floor(Math.random()*10000);
const child=spawn(process.execPath,['scripts/test-google-sheets-transport.mjs'],{
  env:{...process.env,GOOGLE_SYNC_TEST_CLIENT_ID:'smoke.apps.googleusercontent.com',GOOGLE_SYNC_TEST_PORT:String(port)},
  stdio:['ignore','pipe','pipe']
});
try {
  const ready=await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Harness server exited early');}),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Harness startup timed out')),10000).unref())]);
  assert.match(String(ready[0]),/Disposable Google transport proof/);
  const base=`http://localhost:${port}`;
  const headers={Host:`localhost:${port}`};
  const page=await (await fetch(base,{headers})).text();
  const key=page.match(/const key='([^']+)'/)[1];
  assert.notEqual(key,'__SESSION_KEY__');
  async function request(path,body) {
    return fetch(base+path,{method:body?'POST':'GET',headers:{...headers,'X-Harness-Key':key,
      Origin:`http://localhost:${port}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  }
  assert.equal((await fetch(base+'/state',{headers})).status,403);
  const state=await (await request('/state')).json();
  assert.equal(state.rounds,100);
  assert.equal((await request('/join',{role:'a',spreadsheetId:'disposable-test',accountHash:'a'.repeat(64)})).status,200);
  assert.equal((await request('/join',{role:'b',accountHash:'b'.repeat(64)})).status,400);
  assert.equal((await request('/join',{role:'b',accountHash:'a'.repeat(64)})).status,200);
  assert.equal((await request('/join',{role:'a',accountHash:'a'.repeat(64),token:'never-accepted'})).status,400);
  const paired=await Promise.all([request('/barrier',{role:'a',round:0}),request('/barrier',{role:'b',round:0})]);
  for(const response of paired) assert.deepEqual(await response.json(),{go:true});
  const final=await Promise.all([request('/barrier',{role:'a',round:100}),request('/barrier',{role:'b',round:100})]);
  for(const response of final) assert.equal(response.status,200);
  assert.equal((await request('/result',{role:'a',passed:true,digest:'same',operations:200})).status,200);
  assert.equal((await request('/result',{role:'b',passed:true,digest:'same',operations:200})).status,200);
  console.log('PASS: standalone harness syntax, localhost origin/session isolation, same-account join, barriers and redacted result coordination (mock control plane only; live gate NOT run).');
} finally {
  child.kill();
  await once(child,'exit');
}

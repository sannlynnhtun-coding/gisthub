// Standalone live proof. Only this process serves the disposable harness; no app or IndexedDB edits.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const clientId = process.env.GOOGLE_SYNC_TEST_CLIENT_ID ?? '';
const port = Number(process.env.GOOGLE_SYNC_TEST_PORT ?? '5190');
if (!clientId.endsWith('.apps.googleusercontent.com') || !Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Live gate NOT RUN. Set GOOGLE_SYNC_TEST_CLIENT_ID to a Web OAuth client ID; allow http://localhost:5190 as a JavaScript origin. No token or secret is accepted by this process.');
  process.exit(2);
}
const state = { workspaceId:crypto.randomUUID(), libraryId:'9007199254740993', spreadsheetId:null,
  accountHash:null, ready:[], outcomes:{}, rounds:100 };
const barriers = new Map();
const html = fileURLToPath(new URL('./lib/google-sync-transport.html', import.meta.url));
const moduleFile = fileURLToPath(new URL('./lib/google-sync-protocol.mjs', import.meta.url));
const sessionKey = crypto.randomUUID();
function finish(res, code, data) {
  res.writeHead(code, { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req,res) => {
  try {
    if (req.headers.host !== `localhost:${port}`) return finish(res,403,{error:'Use the documented localhost origin.'});
    const url = new URL(req.url, `http://localhost:${port}`);
    if (req.method === 'GET' && ['/', '/protocol.mjs'].includes(url.pathname)) {
      const file = url.pathname === '/' ? html : moduleFile;
      res.writeHead(200, { 'Content-Type':url.pathname === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      return res.end((await readFile(file,'utf8')).replaceAll('__SESSION_KEY__',sessionKey));
    }
    if (req.headers['x-harness-key'] !== sessionKey) return finish(res,403,{error:'Invalid harness session.'});
    if (req.method === 'GET' && url.pathname === '/state') return finish(res,200,{...state,clientId});
    if (req.method !== 'POST' || req.headers.origin !== `http://localhost:${port}`) return finish(res,403,{error:'Invalid request origin.'});
    let bytes=0, body='';
    for await (const chunk of req) { bytes+=chunk.length; if(bytes>8192) throw new Error('Oversized harness message.'); body+=chunk; }
    const input=JSON.parse(body);
    // Only control/status metadata crosses this local endpoint, never a Google access token.
    const allowed = ['role','spreadsheetId','accountHash','round','digest','operations','error','passed'];
    if(Object.keys(input).some(key=>!allowed.includes(key))) return finish(res,400,{error:'Unexpected field.'});
    if(!['a','b'].includes(input.role)) return finish(res,400,{error:'Choose role a or b.'});
    if(url.pathname === '/join') {
      if(!/^[a-f0-9]{64}$/.test(input.accountHash)) throw new Error('Invalid account fingerprint.');
      if(state.accountHash && state.accountHash!==input.accountHash) throw new Error('Both profiles must authorize the same Google account.');
      state.accountHash=input.accountHash;
      if(input.role==='a') {
        if(state.spreadsheetId && state.spreadsheetId!==input.spreadsheetId) throw new Error('Restart to select another file.');
        if(!/^[\w-]+$/.test(input.spreadsheetId ?? '')) throw new Error('Invalid disposable spreadsheet ID.');
        state.spreadsheetId=input.spreadsheetId;
      }
      if(!state.ready.includes(input.role)) state.ready.push(input.role);
      return finish(res,200,state);
    }
    if(url.pathname === '/barrier') {
      if(!Number.isInteger(input.round) || input.round<0 || input.round>100) throw new Error('Invalid round.');
      const slot=barriers.get(input.round) ?? new Map();
      if(slot.has(input.role)) throw new Error('Duplicate role at barrier. Use separate profiles.');
      slot.set(input.role,res); barriers.set(input.round,slot);
      res.on('close',()=>{ if(!res.writableEnded) slot.delete(input.role); });
      if(slot.size===2) { for(const response of slot.values()) finish(response,200,{go:true}); barriers.delete(input.round); }
      else setTimeout(()=>{if(!res.writableEnded){slot.delete(input.role);finish(res,408,{error:'Other profile did not reach the barrier.'});}},120000).unref();
      return;
    }
    if(url.pathname === '/result') {
      state.outcomes[input.role]={passed:input.passed===true,digest:input.digest,operations:input.operations,
        error:input.error ? 'A browser reported failure; inspect its on-screen message.' : undefined};
      const a=state.outcomes.a,b=state.outcomes.b;
      if(a&&b) console.log(a.passed&&b.passed&&a.digest===b.digest&&a.operations===b.operations
        ? `PASS: 100 live concurrent rounds; ${a.operations} unique operations, matching final replay digest. Save the redacted browser summaries as evidence.`
        : 'FAIL: live proof did not converge. Do not proceed to T009.');
      return finish(res,200,state.outcomes);
    }
    return finish(res,404,{error:'Unknown harness route.'});
  } catch { if(!res.headersSent) finish(res,400,{error:'Harness request rejected; check setup and browser status.'}); else res.end(); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Disposable Google transport proof: http://localhost:${port}/ — open in TWO isolated profiles, roles A/B. Approximately 15–20 minutes; no tokens are logged or saved.`));

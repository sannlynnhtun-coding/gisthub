// Pure protocol helpers shared by the disposable transport proof and Node regression checks.
// This file does not access IndexedDB, app state, localStorage or Google credentials.
export function canonicalize(value) {
  function quote(value) {
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) {
        const next = value.charCodeAt(++i);
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('Invalid Unicode');
      } else if (c >= 0xdc00 && c <= 0xdfff) throw new Error('Invalid Unicode');
    }
    return JSON.stringify(value);
  }
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Nonfinite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error('Unsupported JSON value');
  return '{' + Object.keys(value).sort().map(key => quote(key) + ':' + canonicalize(value[key])).join(',') + '}';
}

export async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function envelope(body) {
  const normalized = { ...body, parentIds: [...new Set(body.parentIds)].sort() };
  const payloadJson = canonicalize(normalized);
  return [body.opId, await sha256(payloadJson), payloadJson];
}

export async function verifyRows(rows, libraryId, workspaceId) {
  const unique = new Map();
  const allowed = new Set(['opId','libraryId','workspaceId','deviceId','entityType','entityId','field','kind','value','parentIds','logicalCounter','displayTime']);
  const required=[...allowed].filter(key=>key!=='displayTime');
  const uuid=value=>typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  for (const row of rows) {
    if (row.length !== 3 || row.some(cell => typeof cell !== 'string')) throw new Error('Malformed row');
    const [id, hash, json] = row;
    const body = JSON.parse(json);
    if (!body || typeof body!=='object' || Array.isArray(body)
      || Object.keys(body).some(key => !allowed.has(key)) || required.some(key=>!Object.hasOwn(body,key))
      || !uuid(body.opId) || !uuid(body.workspaceId) || !uuid(body.deviceId)
      || typeof body.libraryId!=='string' || !/^\d+$/.test(body.libraryId)
      || typeof body.logicalCounter!=='string' || !/^\d+$/.test(body.logicalCounter)
      || !['set','delete','resolve'].includes(body.kind)
      || typeof body.entityId!=='string' || !body.entityId.trim()
      || body.opId !== id || body.libraryId !== libraryId || body.workspaceId !== workspaceId
      || !Array.isArray(body.parentIds) || body.parentIds.some(parent => !uuid(parent))
      || canonicalize(body) !== json || await sha256(json) !== hash
      || canonicalize([...new Set(body.parentIds)].sort()) !== canonicalize(body.parentIds))
      throw new Error('Schema, scope, canonicalization or digest failure');
    if (unique.has(id) && unique.get(id)[2] !== json) throw new Error('Conflicting operation ID');
    unique.set(id, row);
  }
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id) || !unique.has(id)) throw new Error('Missing parent or cycle');
    visiting.add(id);
    const body = JSON.parse(unique.get(id)[2]);
    for (const parent of body.parentIds) {
      const parentBody = unique.has(parent) && JSON.parse(unique.get(parent)[2]);
      if (!parentBody || parentBody.entityId !== body.entityId || parentBody.entityType !== body.entityType)
        throw new Error('Missing or cross-entity parent');
      visit(parent);
    }
    visiting.delete(id); visited.add(id);
  }
  for (const id of unique.keys()) visit(id);
  return unique;
}

export function canAppend(usage, rows, unique) {
  const bytes = new TextEncoder();
  const seen = new Set(unique.keys());
  let operations = usage.operations, bodyBytes = usage.bodyBytes;
  for (const [id,,json] of rows) {
    if (!seen.has(id)) { seen.add(id); operations++; bodyBytes += bytes.encode(json).length; }
  }
  return usage.operations < 20000 && usage.bodyBytes < 10 * 1024 * 1024 && usage.rows < 25000
    && operations <= 20000 && bodyBytes <= 10 * 1024 * 1024 && usage.rows + rows.length <= 25000;
}

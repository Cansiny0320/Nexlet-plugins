import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../integrations/ctool/adapter/storage.mjs';
function fixture() {
  const docs = new Map(), secrets = new Map(), errors = []; let rev = 0;
  const api = { database: {
    async query() { return [...docs.values()]; },
    async put(doc) { await new Promise(r => setTimeout(r, 2)); assert.equal(doc.rev, docs.get(doc.id)?.rev); const next = { ...doc, rev: String(++rev) }; docs.set(doc.id, next); return next; },
    async remove(id, version) { assert.equal(version, docs.get(id)?.rev); docs.delete(id); },
  }, secrets: { async get(k) { return secrets.get(k) ?? null; }, async set(k, v) { if (v === null) secrets.delete(k); else secrets.set(k, v); return { persistent: true }; } } };
  return { api, docs, secrets, errors, storage: createStorage(api, e => errors.push(e)) };
}
test('writes preserve order and snapshot values, and hydrate after reopening', async () => {
  const { api, docs, errors, storage } = fixture(); await storage.load();
  const value = { v: { input: 'first' } }; storage.set('nv_history', value); value.v.input = 'mutated';
  storage.set('nv_history', { v: { input: 'last' } }); await storage.flush();
  assert.equal(docs.get('ctool:nv_history').value.v.input, 'last'); assert.deepEqual(errors, []);
  const reopened = createStorage(api, e => { throw e; }); await reopened.load();
  assert.equal(reopened.get('nv_history').v.input, 'last'); reopened.clear(); await reopened.flush(); assert.equal(docs.size, 0);
});
test('JDoodle credentials never enter ordinary history storage', async () => {
  const { api, docs, secrets, storage } = fixture(); await storage.load();
  storage.set('nv_code_run_config', { v: { client_id: 'id', client_secret: 'secret' } }); await storage.flush();
  assert.equal(docs.size, 0); assert.ok(secrets.has('jdoodle'));
  const reopened = createStorage(api, assert.fail); await reopened.load(); assert.equal(reopened.get('nv_code_run_config').v.client_secret, 'secret');
  reopened.remove('nv_code_run_config'); await reopened.flush(); assert.equal(secrets.size, 0);
});
test('failed persistence is visible and does not block subsequent writes', async () => {
  const { api, errors, storage } = fixture();
  const put = api.database.put; let first = true;
  api.database.put = doc => { if (first) { first = false; throw new Error('quota'); } return put(doc); };
  storage.set('x', 1); storage.set('x', 2); await storage.flush();
  assert.equal(errors[0].message, 'quota'); assert.equal(storage.get('x'), 2);
});
test('launcher input is consumed once and never stored in persistent history', async () => {
  const { docs, storage } = fixture();
  storage.set('nv__temp_input_storage', { v: 'launcher text' });
  assert.equal(storage.get('nv__temp_input_storage').v, 'launcher text');
  assert.equal(storage.get('nv__temp_input_storage'), null);
  await storage.flush(); assert.equal(docs.size, 0);
});

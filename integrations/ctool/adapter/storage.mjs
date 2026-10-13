// Ctool's synchronous store is hydrated before Vue is imported. Writes are serialized.
export function createStorage(api, report) {
  const cache = new Map(), documents = new Map();
  let pending = Promise.resolve();
  const enqueue = work => { pending = pending.then(work).catch(report); };
  const secretKey = 'nv_code_run_config';
  const temporary = key => key.endsWith('_temp_input_storage');
  return {
    async load() {
      let after = '';
      for (;;) {
        const rows = await api.database.query({ prefix: 'ctool:', after, limit: 500 });
        for (const row of rows) { documents.set(row.id.slice(6), row); cache.set(row.id.slice(6), row.value); }
        if (rows.length < 500) break; after = rows.at(-1).id;
      }
      const secret = await api.secrets.get('jdoodle');
      if (secret) cache.set(secretKey, JSON.parse(secret));
    },
    get(key) {
      const value = structuredClone(cache.get(key) ?? null);
      if (temporary(key)) cache.delete(key);
      return value;
    },
    getAllKey() { return [...cache.keys()]; },
    set(key, value) {
      value = JSON.parse(JSON.stringify(value)); cache.set(key, value);
      if (temporary(key)) return;
      enqueue(async () => {
        if (key === secretKey) {
          const result = await api.secrets.set('jdoodle', JSON.stringify(value));
          if (!result.persistent) report(new Error('系统加密不可用，JDoodle 凭据仅当前会话有效'));
        } else {
          const previous = documents.get(key);
          documents.set(key, await api.database.put({ id: 'ctool:' + key, ...(previous ? { rev: previous.rev } : {}), value }));
        }
      });
    },
    remove(key) {
      cache.delete(key);
      if (temporary(key)) return;
      enqueue(async () => {
        if (key === secretKey) await api.secrets.set('jdoodle', null);
        const previous = documents.get(key);
        if (previous) { await api.database.remove(previous.id, previous.rev); documents.delete(key); }
      });
    },
    clear() { for (const key of cache.keys()) this.remove(key); },
    flush() { return pending; },
  };
}

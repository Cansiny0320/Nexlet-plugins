import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { handlers } from '../../.build/plugins/ctool/backend.cjs';

const require = createRequire(new URL('../../.build/ctool-source/packages/ctool-core/package.json', import.meta.url));
const { WebSocketServer } = require('ws');
const context = () => ({ signal: new AbortController().signal, emit() {} });
async function fixture(t, listener) {
  const server = http.createServer(listener);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
test('HTTP preserves method, body, headers, binary and HTTP errors', async t => {
  const { url } = await fixture(t, async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    res.writeHead(req.url === '/error' ? 429 : 200, { 'content-type': 'application/json', 'x-test': 'yes' });
    res.end(JSON.stringify({ method: req.method, path: req.url, body, header: req.headers['x-custom'] }));
  });
  const result = await handlers.http({ url: url + '/query?q=中文', method: 'POST', headers: { 'X-Custom': 'value' }, body: '{"x":1}' }, context());
  assert.equal(result.status, 200); assert.equal(result.headers['x-test'], 'yes');
  const data = JSON.parse(Buffer.from(result.body, 'base64').toString());
  assert.equal(data.method, 'POST'); assert.equal(data.body, '{"x":1}'); assert.equal(data.header, 'value');
  assert.equal((await handlers.http({ url: url + '/error' }, context())).status, 429);
  await assert.rejects(handlers.http({ url: 'file:///etc/hosts' }, context()), /HTTP/);
});
test('HTTP timeout and abort terminate pending requests', async t => {
  const { url } = await fixture(t, () => {});
  await assert.rejects(handlers.http({ url, timeoutMs: 30 }, context()), /time|abort/i);
  const controller = new AbortController();
  const result = handlers.http({ url }, { signal: controller.signal });
  controller.abort(); await assert.rejects(result, /abort/i);
});
test('JSON Schema validates without renderer eval and returns localized failures', () => {
  const schema = { type: 'object', properties: { count: { type: 'integer' } }, required: ['count'] };
  assert.equal(handlers.schema({ schema, value: { count: 2 }, locale: 'zh_CN' }), 'ok ^o^');
  assert.match(handlers.schema({ schema, value: { count: 'x' }, locale: 'zh_CN' }), /应当是 integer 类型/);
});
test('WebSocket negotiates protocol, exchanges messages, closes and cleans up', async t => {
  const { server, url } = await fixture(t, () => {});
  const wss = new WebSocketServer({ server }); t.after(() => wss.close());
  wss.on('connection', ws => ws.on('message', data => ws.send(data.toString())));
  const { id } = await handlers.wsOpen({ url: url.replace('http:', 'ws:'), protocols: ['ctool-test'] }, context());
  t.after(() => handlers.wsClose({ id }, context()));
  const poll = async type => {
    for (let i = 0; i < 20; i++) {
      const events = await handlers.wsPoll({ id }, context());
      const event = events.find(item => item.type === type); if (event) return event;
    }
    throw new Error('Missing ' + type);
  };
  assert.equal((await poll('open')).protocol, 'ctool-test');
  await handlers.wsSend({ id, data: '中文 echo' }, context());
  assert.equal((await poll('message')).data, '中文 echo');
  await handlers.wsClose({ id, code: 1000, reason: 'done' }, context());
  assert.equal((await poll('close')).code, 1000);
});

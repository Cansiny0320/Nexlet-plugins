import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import Ajv from 'ajv';
import localizeZh from 'ajv-i18n/localize/zh/index.js';
import localizeEn from 'ajv-i18n/localize/en/index.js';

const sockets = new Map();
const MAX_BYTES = 8 * 1024 * 1024;
function checkedUrl(value, protocols) {
  const url = new URL(value);
  if (!protocols.includes(url.protocol) || url.username || url.password) throw new Error('仅支持 HTTP(S) / WS(S) 地址，凭据请放入请求头');
  return url.href;
}
function socket(id) {
  const state = sockets.get(id);
  if (!state) throw new Error('WebSocket 已关闭');
  clearTimeout(state.lease);
  state.lease = setTimeout(() => { state.ws.terminate(); sockets.delete(id); }, 15000);
  state.lease.unref();
  return state;
}
export const handlers = {
  schema({ schema, value, locale }) {
    const ajv = new Ajv({ allErrors: true, messages: false });
    const validate = ajv.compile(schema);
    if (validate(value)) return 'ok ^o^';
    (locale === 'zh_CN' ? localizeZh : localizeEn)(validate.errors);
    return ajv.errorsText(validate.errors, { separator: '\n' });
  },
  async http(args, { signal }) {
    const url = checkedUrl(args.url, ['http:', 'https:']);
    const timeout = Math.max(1, Math.min(Number(args.timeoutMs) || 30000, 120000));
    const body = args.bodyBase64 ? Buffer.from(args.bodyBase64, 'base64') : args.body;
    if (body && Buffer.byteLength(body) > MAX_BYTES) throw new Error('请求超过 8 MB');
    const response = await fetch(url, { method: args.method || 'GET', headers: args.headers, body,
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)]), redirect: 'follow' });
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body || []) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) throw new Error('响应超过 8 MB');
      chunks.push(Buffer.from(chunk));
    }
    return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers), body: Buffer.concat(chunks).toString('base64') };
  },
  wsOpen(args) {
    if (sockets.size >= 8) throw new Error('WebSocket 连接数超过 8');
    const id = randomUUID();
    const ws = new WebSocket(checkedUrl(args.url, ['ws:', 'wss:']), args.protocols || [], { handshakeTimeout: 15000, maxPayload: MAX_BYTES });
    const state = { ws, events: [], bytes: 0, lease: null, wake: null, closed: false };
    sockets.set(id, state); socket(id);
    const push = event => {
      const size = Buffer.byteLength(JSON.stringify(event));
      if (state.bytes + size > MAX_BYTES || state.events.length >= 1000) {
        state.events = [{ type: 'error', message: '接收队列超过限制，连接已断开' }]; state.bytes = 0; ws.terminate();
      } else { state.events.push(event); state.bytes += size; }
      state.wake?.();
    };
    ws.on('open', () => push({ type: 'open', protocol: ws.protocol }));
    ws.on('message', (data, binary) => push({ type: 'message', data: binary ? data.toString('base64') : data.toString(), binary }));
    ws.on('error', error => push({ type: 'error', message: error.message }));
    ws.on('close', (code, reason) => { state.closed = true; push({ type: 'close', code, reason: reason.toString() }); });
    return { id };
  },
  async wsPoll({ id }, { signal }) {
    const state = socket(id);
    if (!state.events.length && !state.closed) await new Promise(resolve => {
      const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); state.wake = null; resolve(); };
      const timer = setTimeout(done, 500); state.wake = done; signal.addEventListener('abort', done, { once: true });
      if (signal.aborted) done();
    });
    const events = state.events.splice(0); state.bytes = 0;
    if (state.closed) { clearTimeout(state.lease); sockets.delete(id); }
    return events;
  },
  wsSend({ id, data }) {
    const { ws } = socket(id);
    if (ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket 尚未连接');
    if (typeof data !== 'string' || Buffer.byteLength(data) > MAX_BYTES) throw new Error('消息无效或超过 8 MB');
    ws.send(data); return true;
  },
  wsClose({ id, code = 1000, reason = '' }) {
    const state = sockets.get(id); if (!state) return true;
    if (state.ws.readyState === WebSocket.CONNECTING) state.ws.terminate(); else state.ws.close(code, reason);
    return true;
  },
};

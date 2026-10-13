import axios, { AxiosError, AxiosHeaders } from 'axios';

interface HttpResponse { status: number; statusText: string; headers: Record<string, string>; body: string; }
type SocketEvent = { type: 'open'; protocol: string } | { type: 'message'; data: string; binary: boolean } | { type: 'error'; message: string } | { type: 'close'; code: number; reason: string };
interface BackendResults { http: HttpResponse; schema: string; wsOpen: { id: string }; wsPoll: SocketEvent[]; wsSend: boolean; wsClose: boolean; }
export const call = async <M extends keyof BackendResults>(method: M, args: any, timeoutMs = 130000): Promise<BackendResults[M]> =>
  await window.nexlet.backend.call({ id: crypto.randomUUID(), method, args, timeoutMs }) as BackendResults[M];
export const report = (error: unknown) => {
  console.error(error);
  let banner = document.getElementById('nexlet-error');
  if (!banner) { banner = document.createElement('div'); banner.id = 'nexlet-error'; banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#8b2626;color:white;padding:10px;cursor:pointer'; banner.onclick = () => banner?.remove(); document.body.append(banner); }
  banner.textContent = String(error instanceof Error ? error.message : error);
};
export function installHttp() {
  axios.defaults.adapter = async config => {
    const url = axios.getUri(config), headers = AxiosHeaders.from(config.headers).toJSON();
    const args: any = { url, method: config.method?.toUpperCase() || 'GET', headers, timeoutMs: config.timeout || 30000 };
    if (config.data !== undefined) args.body = config.data;
    if (config.signal?.aborted) throw new AxiosError('请求已取消', 'ERR_CANCELED', config);
    let response;
    try { response = await call('http', args); }
    catch (error) { throw new AxiosError(String(error), 'ERR_NETWORK', config); }
    if (config.signal?.aborted) throw new AxiosError('请求已取消', 'ERR_CANCELED', config);
    const bytes = Uint8Array.from(atob(response.body), ch => ch.charCodeAt(0));
    const result: any = { status: response.status, statusText: response.statusText, headers: response.headers, config,
      data: config.responseType === 'arraybuffer' ? bytes.buffer : config.responseType === 'blob' ? new Blob([bytes], { type: response.headers['content-type'] }) : new TextDecoder().decode(bytes) };
    if (config.validateStatus && !config.validateStatus(result.status)) throw new AxiosError(`请求失败 (${result.status})`, 'ERR_BAD_RESPONSE', config, undefined, result);
    return result;
  };
}
const active = new Set<BridgeWebSocket>();
export class BridgeWebSocket extends EventTarget {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  readyState = 0; protocol = ''; private id = ''; private closing = false;
  constructor(public url: string, protocols?: string | string[]) {
    super(); active.add(this);
    void this.start(typeof protocols === 'string' ? [protocols] : protocols || []);
  }
  private async start(protocols: string[]) {
    try {
      this.id = (await call('wsOpen', { url: this.url, protocols })).id;
      if (this.closing) await call('wsClose', { id: this.id });
      while (this.readyState !== 3) {
        for (const event of await call('wsPoll', { id: this.id }, 15000)) {
          if (event.type === 'open') { this.readyState = 1; this.protocol = event.protocol; this.dispatchEvent(new Event('open')); }
          if (event.type === 'message') this.dispatchEvent(new MessageEvent('message', { data: event.binary ? `[binary base64] ${event.data}` : event.data }));
          if (event.type === 'error') this.dispatchEvent(new ErrorEvent('error', { message: event.message }));
          if (event.type === 'close') { this.readyState = 3; this.dispatchEvent(new CloseEvent('close', { code: event.code, reason: event.reason, wasClean: event.code === 1000 })); }
        }
      }
    } catch (error) {
      this.readyState = 3; this.dispatchEvent(new ErrorEvent('error', { message: String(error) }));
      this.dispatchEvent(new CloseEvent('close', { code: 1006, reason: String(error) }));
    } finally { active.delete(this); }
  }
  send(data: string) {
    if (this.readyState !== 1) throw new Error('WebSocket 尚未连接');
    void call('wsSend', { id: this.id, data }).catch(report);
  }
  close(code = 1000, reason = '') {
    this.closing = true;
    if (this.readyState === 3) return;
    this.readyState = 2;
    if (this.id) void call('wsClose', { id: this.id, code, reason }).catch(() => {});
  }
}
export const closeSockets = () => { for (const socket of active) socket.close(); };

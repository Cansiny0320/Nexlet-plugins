import { call, report } from './transport';
export async function download(data: Uint8Array, name: string) {
  try {
    const result = await window.nexlet.dialogs.save({ defaultPath: name });
    if (!result.canceled && result.filePath) await window.nexlet.files.write(result.filePath, data, true);
  } catch (error) { report(error); }
}
export async function readUrl(url: string) {
  if (url.startsWith('data:')) {
    const [meta, content] = [url.slice(0, url.indexOf(',')), url.slice(url.indexOf(',') + 1)];
    return meta.endsWith(';base64') ? Uint8Array.from(atob(content), c => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(content));
  }
  const response = await call('http', { url });
  if (response.status < 200 || response.status >= 300) throw new Error(`下载失败 (${response.status})`);
  return Uint8Array.from(atob(response.body), c => c.charCodeAt(0));
}

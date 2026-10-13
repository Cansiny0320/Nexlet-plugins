import type { PluginApi, PluginManifest, PluginContext } from '@nexlet/plugin-api';

const api: PluginApi = window.nexlet;
const sameApi: PluginApi = nexlet;
const manifest: PluginManifest = {
  id: 'org.nexlet.typescript', name: 'TS 示例', version: '1.0.0', apiVersion: 1,
  main: 'index.html', permissions: ['clipboard.write'],
  features: [{ code: 'note', name: 'TS 示例', keywords: ['typescript'], matches: [{ type: 'text' }] }],
};
api.onEnter((context: PluginContext) => {
  if (context.type === 'text') context.payload.toUpperCase();
  if (context.type === 'files') context.payload.forEach(resource => { void api.input.read(resource.id); });
  if (context.type === 'image') void api.input.read(context.payload.id);
  // @ts-expect-error A files/image payload is not always text.
  context.payload.toUpperCase();
});
const unsubscribe: () => void = api.onReady(async () => {});
const result: Promise<{ persistent: boolean }> = api.secrets.set('key', 'value');
const response: Promise<{ status: number; body: string }> = api.network.request({ id: 'request1', url: 'https://example.com' });
const cancelled: Promise<boolean> = api.network.cancel('request1');
// @ts-expect-error This runtime only supports GET / POST.
api.network.request({ id: 'request2', url: 'https://example.com', method: 'DELETE' });
// @ts-expect-error Plugin API is distinct from the application's HostApi.
api.call('state');
// @ts-expect-error Clipboard writes accept text, not binary data.
api.clipboard.writeText(new Uint8Array());
// @ts-expect-error Stored values must be JSON values.
api.storage.set('note', new Date());
// @ts-expect-error Plugins do not have Node.js globals.
require('node:fs');
void [sameApi, manifest, unsubscribe, result, response, cancelled];
api.ai.chat({ id: 'stream', stream: true, request: { model: 'fixture', messages: [{ role: 'user', content: 'hi' }] } }).then(value => value.content.toUpperCase());
api.ai.chat({ id: 'completion', request: { model: 'fixture', messages: [{ role: 'user', content: 'hi' }] } }).then(value => value.choices[0].message.content);
api.media.image({ id: 'image', data: new Uint8Array(), operations: [{ op: 'resize', args: [32, 32] }] }).then(value => value.info.width);
api.browser.perform({ id: 'capture', browser: 'handle', action: { type: 'screenshot' } }).then(value => value.byteLength);
// @ts-expect-error Unknown browser actions must not silently compile.
api.browser.perform({ id: 'x', browser: 'h', action: { type: 'arbitraryHostIpc' } });
// @ts-expect-error Cloud writes must carry optimistic-concurrency and idempotency fields.
api.services.syncPut({ id: 'x', key: 'state', value: {} });

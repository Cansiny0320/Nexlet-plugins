import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = path.resolve(process.env.NEXLET_HOST_DIR || path.join(root, '../Nexlet'));
const require = createRequire(path.join(host, 'package.json'));
const { _electron: electron, expect } = require('@playwright/test');
const folder = await mkdtemp(path.join(tmpdir(), 'nexlet-typescript-'));
const env = { ...process.env, NEXLET_TEST_MODE: '1', NEXLET_USER_DATA: path.join(folder, 'data') };
delete env.ELECTRON_RUN_AS_NODE;
const id = 'org.nexlet.typescript-example';
let app;
try {
  app = await electron.launch({ args: [host], cwd: host, env });
  const errors = [];
  app.context().on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await app.firstWindow();
  await expect(page.getByLabel('搜索功能、应用或快捷方式')).toBeVisible();
  const call = (action, payload) => page.evaluate(({ action, payload }) => window.nexlet.call(action, payload), { action, payload });
  const read = script => app.evaluate(async (_, { id, script }) => {
    const session = globalThis.__nexlet.plugins.runtime.sessions.get(id);
    await session.queue;
    return session.view.webContents.executeJavaScript(script);
  }, { id, script });
  await app.evaluate(({ dialog, clipboard }, bundle) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [bundle] });
    clipboard.writeText = async text => { globalThis.__tsCopied = text; };
  }, path.join(root, 'dist/typescript-example.nexlet'));
  assert.equal(await call('pluginInstall', { development: false }), true);
  const launch = payload => call('launch', { id: `plugin:${id}:note`, payload });
  await launch('来自 TypeScript 插件');
  await expect.poll(() => read('document.querySelector("#note").value')).toBe('来自 TypeScript 插件');
  assert.equal(await read('typeof require'), 'undefined');
  await read('document.querySelector("#save").click()');
  await expect.poll(() => read('document.querySelector("#status").textContent')).toBe('已保存');
  await read('document.querySelector("#copy").click()');
  await expect.poll(() => app.evaluate(() => globalThis.__tsCopied)).toBe('来自 TypeScript 插件');
  await call('window', { action: 'exitPlugin' });
  await launch('');
  await expect.poll(() => read('document.querySelector("#note").value')).toBe('来自 TypeScript 插件');
  await launch('再次带入');
  await expect.poll(() => read('document.querySelector("#note").value')).toBe('再次带入');
  assert.equal(await read('nexlet.clipboard.readText().then(() => false, error => error.message.includes("clipboard.read"))'), true);
  assert.deepEqual(errors, []);
  console.log('PASS: TS package installation, input, storage across reopen, clipboard bridge, reactivation, sandbox and permission denial.');
} finally {
  await app?.close();
  await rm(folder, { recursive: true, force: true });
}

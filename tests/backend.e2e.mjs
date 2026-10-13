import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../', import.meta.url)), host = path.resolve(root, '../Nexlet');
const { _electron: electron, expect } = createRequire(path.join(host, 'package.json'))('@playwright/test');
const directory = await mkdtemp(path.join(tmpdir(), 'nexlet-backend-example-'));
const env = { ...process.env, NEXLET_TEST_MODE: '1', NEXLET_USER_DATA: directory }; delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({ args: [host], cwd: host, env });
  const page = await app.firstWindow(); await expect(page.getByLabel('搜索功能、应用或快捷方式')).toBeVisible();
  await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, path.join(root, 'dist/backend-example.nexlet'));
  await page.evaluate(() => window.nexlet.call('pluginInstall', { development: false }));
  const launch = () => page.evaluate(() => window.nexlet.call('launch', { id: 'plugin:org.nexlet.backend-example:demo' }));
  await launch();
  const read = script => app.evaluate(async (_, script) => { const active = globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.backend-example'); await active.queue; return active.view.webContents.executeJavaScript(script); }, script);
  await read('document.querySelector("#run").click()');
  await expect.poll(() => read('document.querySelector("#status").textContent')).toContain('digest');
  const result = JSON.parse(await read('document.querySelector("#status").textContent')); assert.equal(result.length, 12); assert.match(result.digest, /^[a-f0-9]{64}$/);
  await page.evaluate(() => window.nexlet.call('window', { action: 'exitPlugin' })); await launch();
  await expect.poll(() => read('document.querySelector("#status").textContent')).toContain(result.digest);
  console.log('PASS: built TypeScript backend package, sandbox bridge, separate Node process and persisted document on reopen.');
} finally { await app?.close(); await rm(directory, { recursive: true, force: true }); }

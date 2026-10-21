import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = path.resolve(process.env.NEXLET_HOST_DIR || path.join(root, '../Nexlet'));
const require = createRequire(path.join(host, 'package.json'));
const { _electron: electron, expect } = require('@playwright/test');
const folder = await mkdtemp(path.join(tmpdir(), 'nexlet-word-count-'));
const env = { ...process.env, NEXLET_TEST_MODE: '1', NEXLET_USER_DATA: path.join(folder, 'data') };
delete env.ELECTRON_RUN_AS_NODE;
let app;
const errors = [];
try {
  app = await electron.launch({ args: [host], cwd: host, env });
  app.context().on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await app.firstWindow();
  await expect(page.getByLabel('搜索功能、应用或快捷方式')).toBeVisible();
  const call = (action, payload) => page.evaluate(({ action, payload }) => window.nexlet.call(action, payload), { action, payload });
  const plugin = script => app.evaluate(async (_, script) => {
    const current = globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.word-count');
    await current.queue;
    return current.view.webContents.executeJavaScript(script);
  }, script);
  const read = () => plugin(`Object.fromEntries(['words','chinese','english','numbers','characters','nonWhitespace','lines','paragraphs'].map(key=>[key,document.getElementById(key).textContent]))`);
  const launch = payload => call('launch', { id: 'plugin:org.nexlet.word-count:count', ...payload });

  await app.evaluate(({ dialog }, bundle) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [bundle] });
    dialog.showMessageBox = async () => ({ response: 1 });
  }, path.join(root, 'dist/word-count.nexlet'));
  assert.equal(await call('pluginInstall', { development: false }), true);
  const record = await app.evaluate(() => globalThis.__nexlet.plugins.records().find(p => p.manifest.id === 'org.nexlet.word-count'));
  assert.equal(record.development, false);
  assert.deepEqual(record.manifest.permissions, []);

  await launch();
  await expect.poll(() => plugin("document.querySelector('#status').textContent")).toBe('等待输入');
  assert.equal(await plugin('typeof require'), 'undefined');
  assert.equal((await read()).words, '0');

  const text = '你好，Nexlet world! 2026';
  const search = await call('search', { query: text });
  assert(search.matches.some(command => command.id === 'plugin:org.nexlet.word-count:count'));
  await launch({ inputId: search.input.id });
  await expect.poll(() => read()).toEqual({ words: '5', chinese: '2', english: '2', numbers: '1', characters: '21', nonWhitespace: '19', lines: '1', paragraphs: '1' });

  await plugin(`document.querySelector('#text').value='👨‍👩‍👧‍👦 hello';document.querySelector('#text').dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal((await read()).characters, '7');
  assert.equal((await read()).words, '1');
  await plugin("document.querySelector('#clear').click()");
  assert.equal(await plugin("document.querySelector('#text').value"), '');
  assert.equal((await read()).characters, '0');
  assert.equal(await plugin("document.activeElement.id"), 'text');

  // Reactivation must deliver the full input even when the legacy payload is truncated.
  const large = '中文 a\n'.repeat(100_000);
  const largeSearch = await call('search', { query: large });
  await launch({ inputId: largeSearch.input.id });
  await expect.poll(() => read()).toMatchObject({ words: '300,000', characters: '500,000', lines: '100,001' });
  // Clearing while the long-text debounce is pending must not restore stale results.
  await plugin(`document.querySelector('#text').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#clear').click();`);
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal((await read()).words, '0');

  const sample = '每一段文字，都值得认真计量。\n\nBuild something useful, one word at a time.\n今天写下 2026 个灵感，让想法慢慢成形。 ✨';
  await launch({ payload: sample });
  const beforeDetach = await read();
  const contentsId = await app.evaluate(() => globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.word-count').view.webContents.id);
  const popupPromise = app.waitForEvent('window');
  await page.getByRole('button', { name: '分离为独立窗口', exact: true }).click();
  const popup = await popupPromise;
  assert.equal(await app.evaluate(() => globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.word-count').view.webContents.id), contentsId);
  assert.deepEqual(await read(), beforeDetach);
  const png = await app.evaluate(async () => (await globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.word-count').view.webContents.capturePage()).toPNG().toString('base64'));
  await writeFile(path.join(root, 'dist/word-count-preview.png'), Buffer.from(png, 'base64'));
  await app.evaluate(() => globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.word-count').view.setBounds({ x: 0, y: 0, width: 360, height: 700 }));
  assert.equal(await plugin('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await popup.getByRole('button', { name: '关闭窗口', exact: true }).click();
  await launch();
  await expect.poll(() => plugin("document.querySelector('#text').value")).toBe('');
  assert.deepEqual(errors, []);
  console.log('PASS: packaged install, sandbox, text matching, live counts, clear, 500k input, reactivation, detach, narrow layout, no persistence.');
} finally {
  await app?.close();
  await rm(folder, { recursive: true, force: true });
}

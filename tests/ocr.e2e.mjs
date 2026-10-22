import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = path.resolve(process.env.NEXLET_HOST_DIR || path.join(root, '../Nexlet'));
const { _electron: electron, expect } = createRequire(path.join(host, 'package.json'))('@playwright/test');
const id = 'org.nexlet.ocr', market = process.argv.includes('--market');
const manifest = JSON.parse(await readFile(path.join(root, 'plugins/ocr/plugin.json'), 'utf8'));
const directory = await mkdtemp(path.join(tmpdir(), 'nexlet-ocr-market-e2e-'));
const env = { ...process.env, NEXLET_TEST_MODE: '1', NEXLET_TEST_LOCALE: 'en', NEXLET_USER_DATA: directory };
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  const executablePath = process.env.NEXLET_HOST_EXECUTABLE;
  app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: [host] }), cwd: host, env });
  if (process.env.NEXLET_EXPECT_VERSION) assert.equal(await app.evaluate(({ app }) => app.getVersion()), process.env.NEXLET_EXPECT_VERSION);
  const page = await app.firstWindow();
  await page.waitForFunction(() => !!window.nexlet);
  const call = (action, payload) => page.evaluate(({ action, payload }) => window.nexlet.call(action, payload), { action, payload });
  if (market) {
    const state = await call('marketplace', true);
    assert.equal(state.error, null);
    const entry = state.entries.find(entry => entry.id === id);
    assert.equal(entry?.version, manifest.version);
    assert.equal(entry.minHostVersion, '0.2.30');
    assert.match(entry.download, /Nexlet-plugins\/releases\/download\/org\.nexlet\.ocr-v/);
    // The real host's compatibility gate must reject an older host before download.
    await app.evaluate(({ app }) => { globalThis.__ocrVersion = app.getVersion; app.getVersion = () => '0.2.29'; });
    try { await assert.rejects(call('marketInstall', id), /0\.2\.30/); }
    finally { await app.evaluate(({ app }) => { app.getVersion = globalThis.__ocrVersion; }); }
    assert.equal(await call('marketInstall', id), true);
  } else {
    await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, path.join(root, 'dist/ocr.nexlet'));
    assert.equal(await call('pluginInstall', { development: false }), true);
  }
  const installed = await app.evaluate((_, id) => {
    const record = globalThis.__nexlet.plugins.records().find(record => record.manifest.id === id);
    return { version: record.manifest.version, source: record.source, development: record.development };
  }, id);
  assert.equal(installed.version, manifest.version); assert.equal(installed.development, false);
  if (market) assert.equal(installed.source, 'marketplace');
  console.log('PASS installation', JSON.stringify(installed));
  const read = script => app.evaluate(async (_, script) => {
    const active = globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.ocr');
    return active ? active.view.webContents.executeJavaScript(script) : null;
  }, script);
  const launch = async file => {
    const data = 'data:image/png;base64,' + (await readFile(path.join(host, 'docs/screenshots', file))).toString('base64');
    const input = await call('launchInput', { type: 'image', from: 'paste', data });
    await call('launch', { id: `plugin:${id}:recognize`, inputId: input.id });
    await expect.poll(() => read('document.querySelector("#stop")?.hidden'), { timeout: 10000 }).toBe(false);
  };
  for (const [file, expected] of [
    ['filesearch.png', ['Nexlet', '\u6587\u4ef6\u641c\u7d22', '30 B']],
    ['settings-dark.png', ['Alt+Space', '\u5168\u5c40\u5524\u8d77']],
    ['json-diff.png', ['autoSave', 'clipboard', 'scratchpad']],
  ]) {
    await launch(file);
    await expect.poll(() => read('document.querySelector("#stop").hidden'), { timeout: 60000 }).toBe(true);
    const text = await read('document.querySelector("#result").value');
    for (const part of expected) assert.ok(text.replace(/\s/g, '').includes(part.replace(/\s/g, '')), `${file}: missing ${part}; ${text}`);
    console.log('PASS recognition', file, text.length);
  }
  await launch('settings-dark.png'); await read('document.querySelector("#stop").click()');
  assert.equal(await read('document.querySelector("#stop").hidden'), true);
  assert.equal(await read('document.querySelector("#result").value'), '');
  console.log('PASS cancellation');
  await read(`document.querySelector('#result').value='OCR return 42';document.querySelector('#result').dispatchEvent(new Event('input'));document.querySelector('#search').click()`);
  await expect(page.getByRole('banner')).toContainText('OCR return 42');
  console.log('PASS return result to launcher');
  await call('launch', { id: `plugin:${id}:recognize` });
  await expect.poll(() => read('document.querySelector("#result").value')).toBe('OCR return 42');
  assert.equal(await read('document.querySelector("#stop").hidden'), true);
  console.log('PASS image and result draft restoration without rerunning recognition');
} finally {
  if (app) await app.close();
  await rm(directory, { recursive: true, force: true });
}

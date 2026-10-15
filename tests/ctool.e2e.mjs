import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url)), host = path.resolve(process.env.NEXLET_HOST_DIR || path.join(root, '../Nexlet'));
const { _electron: electron, expect } = createRequire(path.join(host, 'package.json'))('@playwright/test');
const { tools } = createRequire(import.meta.url)('../.build/ctool-source/packages/ctool-config/dist/index.js');
const { WebSocketServer } = createRequire(new URL('../.build/ctool-source/packages/ctool-core/package.json', import.meta.url))('ws');
const requests = [];
const fixture = http.createServer(async (req, res) => {
  let body = ''; for await (const part of req) body += part;
  requests.push({ url: req.url, method: req.method, body });
  res.setHeader('Content-Type', 'application/json');
  if (req.url.startsWith('/ip')) res.end(JSON.stringify([{ ip: '8.8.8.8', country: 'Nexlet Testland', organization_name: 'fixture' }]));
  else if (req.url.startsWith('/arm')) res.end(JSON.stringify({ hex: { arm64: [true, '1f2003d5'], arm: [true, '00f020e3'], thumb: [true, '00bf'] } }));
  else if (req.url.startsWith('/execute')) res.end(JSON.stringify({ output: 'Nexlet fixture output', memory: 1024, cpuTime: 0.01, statusCode: 200 }));
  else if (req.url.startsWith('/credit')) res.end(JSON.stringify({ used: 1 }));
  else { res.statusCode = 404; res.end('{}'); }
});
await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
const fixtureUrl = `http://127.0.0.1:${fixture.address().port}`;
const wss = new WebSocketServer({ server: fixture });
wss.on('connection', ws => ws.on('message', data => ws.send(data.toString())));
const directory = await mkdtemp(path.join(tmpdir(), 'nexlet-ctool-e2e-'));
const env = { ...process.env, NEXLET_TEST_MODE: '1', NEXLET_USER_DATA: directory }; delete env.ELECTRON_RUN_AS_NODE;
let app;
const errors = [], routes = [];
try {
  const executablePath = process.env.NEXLET_HOST_EXECUTABLE;
  app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: [host] }), cwd: host, env });
  if (process.env.NEXLET_EXPECT_VERSION) assert.equal(await app.evaluate(({ app }) => app.getVersion()), process.env.NEXLET_EXPECT_VERSION);
  app.context().on('page', p => { p.on('pageerror', error => errors.push(error.message)); p.on('console', message => { if (message.type() === 'error') errors.push(message.text()); }); });
  const page = await app.firstWindow(); await expect(page.getByLabel('搜索功能、应用或快捷方式')).toBeVisible();
  await app.evaluate(({ app, clipboard, dialog }) => {
    globalThis.__ctoolErrors = []; globalThis.__ctoolClipboard = '';
    clipboard.readText = () => globalThis.__ctoolClipboard;
    clipboard.writeText = value => { globalThis.__ctoolClipboard = value; };
    clipboard.writeImage = value => { globalThis.__ctoolImage = value.toPNG().length; };
    clipboard.write = async items => {
      for (const item of items) if (item.types.includes('image/png')) globalThis.__ctoolImage = (await item.getType('image/png')).size;
    };
    app.on('web-contents-created', (_, contents) => {
      contents.on('console-message', (_, level, message) => { if (typeof level === 'object' ? level.level === 'error' : level >= 2) globalThis.__ctoolErrors.push(typeof level === 'object' ? level.message : message); });
    });
  });
  await app.evaluate((_, base) => {
    globalThis.__ctoolLifecycle = [];
    const runtime = globalThis.__nexlet.plugins.runtime;
    for (const method of ['stop', 'fail', 'dispose', 'exitWindow']) {
      const original = runtime[method].bind(runtime);
      runtime[method] = (...args) => { globalThis.__ctoolLifecycle.push({ method, id: args[0]?.record?.manifest?.id || args[0]?.id || args[0], message: args[1], stack: new Error().stack }); return original(...args); };
    }
    const backends = globalThis.__nexlet.plugins.sdk.backends, call = backends.call.bind(backends);
    backends.call = (record, method, args, signal, progress) => {
      if (method === 'http') {
        const url = new URL(args.url);
        const endpoint = url.hostname === 'get.geojs.io' ? '/ip' : url.hostname === 'armconverter.com' ? '/arm' : url.pathname === '/v1/execute' ? '/execute' : url.pathname === '/v1/credit-spent' ? '/credit' : null;
        if (!endpoint) throw new Error('Unexpected test network request: ' + args.url);
        args = { ...args, url: base + endpoint + url.search };
      }
      return call(record, method, args, signal, progress);
    };
  }, fixtureUrl);
  await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, path.join(root, 'dist/ctool.nexlet'));
  await page.evaluate(() => window.nexlet.call('pluginInstall', { development: false }));
  const launch = (code, payload) => page.evaluate(({ code, payload }) => window.nexlet.call('launch', { id: `plugin:org.nexlet.ctool:${code}`, payload }), { code, payload });
  const read = script => app.evaluate(async (_, script) => {
    const active = globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.ctool');
    if (!active) return null;
    await active.queue; return active.view.webContents.executeJavaScript(script);
  }, script);
  await launch('ctool');
  await expect.poll(() => read('!!document.querySelector(".ctool-global")'), { timeout: 20000 }).toBe(true);
  let plugin = app.context().pages().find(p => p.url().startsWith('nexlet-plugin:'));
  assert.ok(plugin, 'Playwright can control plugin view');
  const navigate = async route => {
    await read(`document.querySelector('#app').__vue_app__.config.globalProperties.$router.push(${JSON.stringify(route)})`);
    await read('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await expect.poll(() => read('document.querySelectorAll(".ctool-main-tool input, .ctool-main-tool textarea, .ctool-main-tool button").length'), { timeout: 10000 }).toBeGreaterThan(0);
  };
  console.log('Ctool mounted');
  for (const tool of process.env.CTOOL_E2E_QUICK ? [] : tools) for (const feature of tool.features) {
    const route = feature.getRouter();
    await navigate(route);
    const text = await read('document.querySelector(".ctool-main-tool")?.innerText || ""');
    routes.push({ route, text: text.slice(0, 160) });
    console.log(route, text.slice(0, 60).replaceAll('\n', ' '));
  }
  await navigate('/tool/bcrypt');
  await plugin.getByPlaceholder('明文(String)', { exact: true }).fill('Nexlet bcrypt test');
  await plugin.getByRole('button', { name: '生成', exact: true }).click();
  await expect(plugin.getByPlaceholder('哈希(Hash)', { exact: true })).toHaveValue(/^\$2[aby]\$/, { timeout: 15000 });
  await plugin.getByRole('button', { name: '校验', exact: true }).click();
  await expect(plugin.getByRole('button', { name: '校验 (正确)', exact: true })).toBeVisible();
  console.log('PASS bcrypt Worker hash + verify');
  await navigate('/tool/hash');
  await plugin.locator('.ctool-main-tool textarea').first().fill('abc');
  await expect(plugin.getByPlaceholder('md5', { exact: true })).toHaveValue('900150983cd24fb0d6963f7d28e17f72');
  await expect(plugin.getByPlaceholder('sha256', { exact: true })).toHaveValue('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await navigate('/tool/url/encoder');
  await plugin.getByPlaceholder('输入', { exact: true }).fill('中文 & Nexlet');
  await expect(plugin.getByPlaceholder('输出', { exact: true })).toHaveValue('%E4%B8%AD%E6%96%87%20%26%20Nexlet');
  console.log('PASS hash + URL encoding');
  await navigate('/tool/json');
  const setEditor = async (index, value) => {
    await plugin.locator('.ctool-main-tool .monaco-editor').nth(index).locator('textarea').focus();
    await plugin.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await plugin.keyboard.press('Backspace');
    await plugin.keyboard.insertText(value);
    await expect(plugin.locator('.ctool-main-tool .monaco-editor').nth(index).locator('.view-lines')).toHaveText(value.replaceAll(' ', '\u00a0'));
  };
  await setEditor(0, '{"count":2,"name":"Nexlet"}');
  await plugin.getByRole('button', { name: '格式化', exact: true }).click();
  await expect(plugin.locator('.ctool-main-tool .view-lines').first()).toContainText('Nexlet');
  await plugin.getByRole('button', { name: 'Schema', exact: true }).click();
  await setEditor(1, '{"type":"object","properties":{"count":{"type":"integer"}},"required":["count"]}');
  await expect(plugin.locator('.ctool-main-tool .monaco-editor').nth(2)).toContainText('ok ^o^');
  console.log('PASS Monaco JSON formatting + JSON Schema backend');
  await setEditor(0, '{"items":[{"n":1},{"n":2}]}');
  await plugin.locator('.ctool-tabs-header-item > span').getByText('Path', { exact: true }).click();
  await plugin.getByRole('button', { name: 'JSONPath', exact: true }).click();
  await plugin.locator('.ctool-json-path input').fill('$.items[?(@.n > 1)].n');
  await expect(plugin.locator('.ctool-main-tool .monaco-editor').nth(1).locator('.view-lines')).toHaveText(/\[\s*2\s*\]/);
  await plugin.locator('.ctool-tabs-header-item > span').getByText('转实体类', { exact: true }).click();
  await plugin.getByRole('button', { name: 'TypeScript', exact: true }).click();
  await expect(plugin.locator('.ctool-extend-page .monaco-editor')).toContainText('export interface');
  await plugin.locator('.ctool-extend-page-close button').click();
  console.log('PASS JSONPath filter + TypeScript type generation');
  await navigate('/tool/ip');
  await plugin.locator('.ctool-main-tool input').first().fill('8.8.8.8');
  await plugin.getByRole('button', { name: '查询', exact: true }).click();
  await expect(plugin.locator('.ctool-main-tool')).toContainText('Nexlet Testland');
  assert.ok(requests.some(r => r.url === '/ip?ip=8.8.8.8'));
  await navigate('/tool/arm/armToHex');
  await plugin.locator('.ctool-main-tool textarea').first().fill('nop');
  await plugin.getByRole('button', { name: '转换', exact: true }).click();
  await expect(plugin.getByPlaceholder('ARM64', { exact: true })).toHaveValue('1f2003d5');
  assert.equal(JSON.parse(requests.find(r => r.url === '/arm').body).asm, 'nop');
  await navigate('/tool/code/run');
  await plugin.getByRole('button', { name: '设置', exact: true }).click();
  await plugin.getByText('Client ID', { exact: true }).locator('..').locator('input').fill('fixture-client');
  await plugin.getByText('Client Secret', { exact: true }).locator('..').locator('input').fill('fixture-secret');
  await plugin.locator('.ctool-extend-page-close button').click();
  await setEditor(0, '<?php echo "Nexlet fixture output"; ?>');
  await plugin.getByRole('button', { name: '运行', exact: true }).click();
  await expect(plugin.locator('.ctool-main-tool .monaco-editor').nth(1)).toContainText('Nexlet fixture output');
  const execution = JSON.parse(requests.find(r => r.url === '/execute').body);
  assert.equal(execution.clientSecret, 'fixture-secret'); assert.equal(execution.language, 'php');
  const docs = await read('nexlet.database.query({prefix:"ctool:",limit:500})');
  assert.ok(!JSON.stringify(docs).includes('fixture-secret'));
  console.log('PASS IP / ARM / JDoodle UI -> backend -> local HTTP fixture; encrypted credentials');
  await navigate('/tool/websocket');
  await plugin.locator('.ctool-main-tool input').first().fill(fixtureUrl.replace('http:', 'ws:'));
  await plugin.getByRole('button', { name: '连接', exact: true }).click();
  await expect(plugin.locator('.ctool-websocket-status-open')).toBeVisible();
  await plugin.locator('.ctool-main-tool textarea').fill('Nexlet websocket echo');
  await plugin.getByText('发送', { exact: true }).click();
  await expect(plugin.locator('.ctool-websocket-logs-type-accept').locator('..').locator('..')).toContainText('Nexlet websocket echo');
  await plugin.getByRole('button', { name: '断开', exact: true }).click();
  await expect(plugin.locator('.ctool-websocket-status-close')).toBeVisible();
  console.log('PASS WebSocket UI connect/send/echo/close');
  await navigate('/tool/qrCode/generate');
  await plugin.locator('.ctool-main-tool textarea').first().fill('https://example.com/nexlet');
  const qr = plugin.locator('.ctool-main-tool img').first();
  await expect(qr).toBeVisible();
  await qr.click();
  await expect.poll(() => app.evaluate(() => globalThis.__ctoolImage || 0)).toBeGreaterThan(100);
  const qrPath = path.join(directory, 'qr.png');
  await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }); }, qrPath);
  await plugin.getByRole('button', { name: '下载', exact: true }).click();
  await expect.poll(async () => readFile(qrPath).then(data => data.length).catch(() => 0)).toBeGreaterThan(100);
  await navigate('/tool/qrCode/parse');
  await plugin.locator('input[type=file]').setInputFiles(qrPath);
  await expect.poll(() => read('Array.from(document.querySelectorAll(".ctool-main-tool textarea")).map(x=>x.value).join("\\n")')).toContain('https://example.com/nexlet');
  console.log('PASS QR generate/copy/download/file upload/decode');
  await launch('hash', 'first activation');
  await expect(plugin.locator('.ctool-main-tool textarea').first()).toHaveValue('first activation');
  await launch('hash', 'second activation');
  await expect(plugin.locator('.ctool-main-tool textarea').first()).toHaveValue('second activation');
  await plugin.locator('.ctool-main-tool textarea').first().fill('persisted Ctool text');
  await expect(plugin.getByPlaceholder('md5', { exact: true })).toHaveValue(createHash('md5').update('persisted Ctool text').digest('hex'));
  await navigate('/tool/websocket');
  await plugin.getByRole('button', { name: '连接', exact: true }).click();
  await expect(plugin.locator('.ctool-websocket-status-open')).toBeVisible();
  await page.evaluate(() => window.nexlet.call('window', { action: 'exitPlugin' }));
  await expect.poll(() => wss.clients.size, { timeout: 20000 }).toBe(0);
  await launch('hash');
  await expect.poll(() => read('document.querySelector(".ctool-main-tool textarea")?.value'), { timeout: 15000 }).toBe('persisted Ctool text');
  plugin = app.context().pages().find(p => p.url().startsWith('nexlet-plugin:'));
  const contentsId = await app.evaluate(() => globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.ctool').view.webContents.id);
  await page.getByRole('button', { name: '分离为独立窗口', exact: true }).click();
  await expect(page.getByLabel('搜索功能、应用或快捷方式')).toBeVisible();
  assert.equal(await app.evaluate(() => globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.ctool').view.webContents.id), contentsId);
  assert.equal(await read('document.querySelector(".ctool-main-tool textarea").value'), 'persisted Ctool text');
  const png = await app.evaluate(async () => (await globalThis.__nexlet.plugins.runtime.sessions.get('org.nexlet.ctool').view.webContents.capturePage()).toPNG().toString('base64'));
  await writeFile(path.join(root, 'dist/ctool-preview.png'), Buffer.from(png, 'base64'));
  console.log('PASS reactivation / persistence / socket cleanup on exit / detach preserves session');
  errors.push(...await app.evaluate(() => globalThis.__ctoolErrors));
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await writeFile(path.join(root, 'dist/ctool-validation.json'), JSON.stringify({ tools: tools.length, routes, errors,
    checks: ['bcrypt Worker hash/verify','md5/sha256','URL Unicode encoding','Monaco JSON formatting','JSON Schema backend','JSONPath filter','TypeScript type generation','IP / ARM / JDoodle HTTP fixture','encrypted credentials','WebSocket echo / close / cleanup','QR generate / image copy / save / file upload / decode','text reactivation','history persistence','window detach'],
    networkRequests: requests.map(({ url, method }) => ({ url, method })) }, null, 2));
  assert.deepEqual(errors.filter(message => !message.includes('Electron Security Warning')), []);
  console.log(`PASS: ${tools.length} tools / ${routes.length} feature pages in packaged Nexlet plugin.`);
} catch (error) {
  if (app) {
    console.error('HOST ERRORS', await app.evaluate(() => globalThis.__ctoolErrors));
    console.error('LIFECYCLE', await app.evaluate(() => globalThis.__ctoolLifecycle));
    console.error('HOST TEXT', await app.firstWindow().then(p => p.locator('body').innerText()));
    console.error('WINDOWS', await app.evaluate(({ webContents }) => webContents.getAllWebContents().map(w => ({ url: w.getURL(), id: w.id }))));
  }
  throw error;
} finally {
  await app?.close();
  for (const client of wss.clients) client.terminate();
  wss.close(); fixture.closeAllConnections(); fixture.close();
  await rm(directory, { recursive: true, force: true });
}

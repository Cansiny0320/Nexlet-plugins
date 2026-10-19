import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = path.resolve(process.env.NEXLET_HOST_DIR || path.join(root, '../Nexlet'));
const require = createRequire(path.join(host, 'package.json'));
const { _electron: electron, expect } = require('@playwright/test');
const sharp = require('sharp');
const { saveClipboard, restoreClipboard } = await import(pathToFileURL(path.join(host, 'tests/helpers/clipboard.ts')).href);
const folder = await mkdtemp(path.join(tmpdir(), 'nexlet-text-image-'));
const env = { ...process.env, NEXLET_TEST_MODE: '1', NEXLET_TEST_LOCALE: 'zh-CN', NEXLET_USER_DATA: path.join(folder, 'data') };
delete env.ELECTRON_RUN_AS_NODE;
const id = 'org.nexlet.text-image';
const html = `<html><head><style>
td { font-family: "Microsoft YaHei"; font-size: 11pt; border: 1px solid #94a3b8; }
.xlhead { background: #dbeafe; font-size: 14pt; font-weight: bold; text-align: center; height: 34pt; }
.xlvalue { color: #15803d; text-align: right; }
.xlgroup { background-color: #f1f5f9; vertical-align: middle; }
</style></head><body><table><col width="150"><col width="200"><col width="200">
<tr><td colspan="3" class="xlhead">十月收支 · Monthly report</td></tr>
<tr><td rowspan="2" class="xlgroup">生活账户<br>合并单元格</td><td>收入 Income</td><td class="xlvalue">¥ 12,800.00</td></tr>
<tr><td>支出 Expenses</td><td>¥ 8,600.00</td></tr>
<tr><td>结余 Balance</td><td colspan="2" class="xlvalue">¥ 4,200.00</td></tr>
</table></body></html>`;
let app;
const errors = [], remoteRequests = [];
try {
  const executablePath = process.env.NEXLET_TEST_EXECUTABLE;
  app = await electron.launch({ executablePath, args: executablePath ? [] : [host], cwd: host, env });
  app.context().on('page', page => page.on('pageerror', error => errors.push(error.message)));
  app.context().on('request', request => { if (request.url().includes('invalid.example')) remoteRequests.push(request.url()); });
  const page = await app.firstWindow();
  await expect(page.locator('.launcher-input')).toBeVisible();
  const call = (action, payload) => page.evaluate(({ action, payload }) => window.nexlet.call(action, payload), { action, payload });
  await call('settings', { hideOnBlur: false, clipboardEnabled: false });
  await saveClipboard(app);
  const plugin = (script, target = id) => app.evaluate(async (_, { script, target }) => {
    const session = globalThis.__nexlet.plugins.runtime.sessions.get(target);
    await session.queue;
    return session.view.webContents.executeJavaScript(script);
  }, { script, target });
  const install = async (file, development = false) => {
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
      dialog.showMessageBox = async () => ({ response: 1 });
    }, file);
    assert.equal(await call('pluginInstall', { development }), true);
  };
  const launch = (payload = {}) => call('launch', { id: `plugin:${id}:convert`, ...payload });
  const clipboard = (text, html = null) => app.evaluate(async ({ clipboard, ClipboardItem }, { text, html }) => {
    const data = { 'text/plain': new Blob([text], { type: 'text/plain' }) };
    if (html !== null) data['text/html'] = new Blob([html], { type: 'text/html' });
    await clipboard.write([new ClipboardItem(data)]);
  }, { text, html });
  const ready = () => expect.poll(() => plugin("({error:document.querySelector('#status').dataset.error,ready:!document.querySelector('#copy').disabled,status:document.querySelector('#status').textContent})"), { timeout: 15000 }).toMatchObject({ error: 'false', ready: true });
  const paste = (text, html = '') => plugin(`(() => {const data=new DataTransfer();data.setData('text/plain',${JSON.stringify(text)});data.setData('text/html',${JSON.stringify(html)});document.querySelector('.stage').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));})()`);
  const input = value => plugin(`document.querySelector('#text').value=${JSON.stringify(value)};document.querySelector('#text').dispatchEvent(new Event('input',{bubbles:true}));`);
  const savePng = async filename => {
    await app.evaluate(({ dialog }, filename) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: filename }); }, filename);
    await plugin("document.querySelector('#save').click()");
    await expect.poll(() => plugin("document.querySelector('#status').textContent")).toBe('PNG 已保存');
    return readFile(filename);
  };

  // Exercise permission enforcement through the real bridge with an unprivileged fixture.
  const deniedFolder = path.join(folder, 'denied');
  await mkdir(deniedFolder);
  await writeFile(path.join(deniedFolder, 'plugin.json'), JSON.stringify({ id: 'org.nexlet.denied-html', name: 'Denied HTML', version: '1.0.0', apiVersion: 1, main: 'index.html', permissions: [], features: [{ code: 'check', name: 'Check', keywords: ['denied'] }] }));
  await writeFile(path.join(deniedFolder, 'index.html'), '<!doctype html><html><body>Permission fixture</body></html>');
  await install(deniedFolder, true);
  await call('launch', { id: 'plugin:org.nexlet.denied-html:check' });
  assert.equal(await plugin('nexlet.clipboard.readHTML().then(()=>false,error=>error.message.includes("clipboard.read"))', 'org.nexlet.denied-html'), true);
  await call('window', { action: 'exitPlugin' });

  await install(process.env.NEXLET_TEXT_IMAGE_BUNDLE || path.join(root, 'dist/text-image.nexlet'));
  await clipboard('你好，Nexlet！\n文字与表格，都值得清晰呈现。');
  await launch(); await ready();
  assert.equal(await plugin('typeof require'), 'undefined');
  assert.equal(await plugin('nexlet.clipboard.readHTML()'), null);
  assert.equal(await plugin("document.querySelector('#text').value"), '你好，Nexlet！\n文字与表格，都值得清晰呈现。');
  let png = await savePng(path.join(folder, 'text.png'));
  assert.equal((await sharp(png).metadata()).width, 1600);
  assert((await sharp(png).stats()).channels[0].stdev > 5, 'Text PNG must contain visible glyphs, not a blank canvas');

  // Use the real system clipboard HTML representation and the packaged UI.
  await clipboard('生活账户\t收入 Income\t¥ 12,800.00', html);
  await plugin("document.querySelector('#read').click()"); await ready();
  assert.equal(await plugin("document.querySelector('#mode').textContent"), '表格');
  assert.equal(await plugin("document.querySelector('#table-size').textContent"), '4 行 · 8 个单元格');
  png = await savePng(path.join(folder, 'table.png'));
  const dimensions = await sharp(png).metadata();
  assert.equal(dimensions.width, 1600);
  const color = await sharp(png).extract({ left: 60, top: 60, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  assert.deepEqual([...color], [219, 234, 254], 'Excel class background must survive PNG rendering');
  await writeFile(path.join(root, 'dist/text-image-sample.png'), png);
  await plugin("document.querySelector('#copy').click()");
  await expect.poll(() => plugin("document.querySelector('#status').textContent")).toBe('图片已复制，可以直接粘贴');
  const copied = await app.evaluate(async ({ clipboard, nativeImage }) => {
    for (const item of await clipboard.read()) if (item.types.includes('image/png')) return nativeImage.createFromBuffer(Buffer.from(await (await item.getType('image/png')).arrayBuffer())).getSize();
  });
  assert.deepEqual(copied, { width: dimensions.width, height: dimensions.height });
  await app.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => ({ canceled: true }); });
  await plugin("document.querySelector('#save').click()");
  await expect.poll(() => plugin("document.querySelector('#status').textContent")).toBe('已取消保存');

  // Test the same production parser/renderer functions inside the real plugin sandbox.
  const bundle = await build({ stdin: { contents: "export {htmlTable} from './plugins/text-image/src/html'; export {createArtwork,renderPng} from './plugins/text-image/src/render';", resolveDir: root }, bundle: true, write: false, format: 'iife', globalName: '__textImageTest', platform: 'browser' });
  await plugin(bundle.outputFiles[0].text);
  const unsafe = `<style>.xl { background-image:url(https://invalid.example/leak); color:#15803d; border:2px solid #123456; }</style><table onclick="window.__injected=1"><tr><td class="xl" colspan="2"><script>window.__injected=1</script><img src="https://invalid.example/img" onerror="window.__injected=1">安全<br>内容</td></tr></table>`;
  const sanitized = await plugin(`(() => {const model=__textImageTest.htmlTable(${JSON.stringify(unsafe)}); const node=__textImageTest.createArtwork(model,{width:800,fontSize:16,padding:24,background:'#ffffff'});return {model,html:node.outerHTML,injected:!!window.__injected};})()`);
  assert.equal(sanitized.model.rows[0][0].text, '安全\n内容');
  assert.equal(sanitized.model.rows[0][0].colSpan, 2);
  assert.equal(sanitized.model.rows[0][0].style.color, 'rgb(21, 128, 61)');
  assert.doesNotMatch(sanitized.html, /script|onclick|onerror|https:|url\(/i);
  assert.equal(sanitized.injected, false);
  const merged = await plugin(`__textImageTest.htmlTable(${JSON.stringify(html)}).rows[1][0]`);
  assert.equal(merged.rowSpan, 2); assert.equal(merged.text, '生活账户\n合并单元格');
  await paste('ignored', unsafe); await ready();
  assert.equal(await plugin('!!window.__injected'), false);
  assert.deepEqual(remoteRequests, []);

  await paste('项目\t说明\n金额\t"第一行\n第二行"\n'); await ready();
  assert.equal(await plugin("document.querySelector('#table-hint').textContent"), '按制表符还原为基础表格，未包含原始样式。');
  await input('x'.repeat(100001));
  await expect.poll(() => plugin("document.querySelector('#status').textContent")).toContain('100,000');
  assert.equal(await plugin("document.querySelector('#copy').disabled"), true);
  await plugin("document.querySelector('#padding').value='28';document.querySelector('#padding').dispatchEvent(new Event('input',{bubbles:true}));");
  assert.equal(await plugin("document.querySelector('#preview').hasAttribute('src')"), false);
  assert.equal(await plugin("document.querySelector('#copy').disabled"), true, 'Settings cannot export the previous source after an import error');
  await plugin("document.querySelector('#padding').value='24';document.querySelector('#padding').dispatchEvent(new Event('input',{bubbles:true}));");
  await paste('a', '<table><tr><td colspan="201">a</td></tr></table>');
  assert.equal(await plugin("document.querySelector('#status').dataset.error"), 'true');
  await paste('a', '<table><tr><td>a</td></tr></table><table><tr><td>b</td></tr></table>');
  assert.equal(await plugin("document.querySelector('#status').textContent"), '请一次复制一个表格，不支持嵌套表格。');
  await input('a\n'.repeat(1000));
  await expect.poll(() => plugin("document.querySelector('#status').textContent")).toContain('图片过大');
  assert.equal(await plugin("document.querySelector('#copy').disabled"), true);

  // Edits during SVG decoding must not restore stale images or enable export on invalid input.
  await plugin("window.__originalDecode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){const promise=window.__originalDecode.call(this);if(!window.__held){window.__held=true;return promise.then(()=>new Promise(resolve=>window.__resume=resolve));}return promise;};void 0;");
  await input('旧内容\n'.repeat(50));
  await expect.poll(() => plugin("typeof window.__resume")).toBe('function');
  await plugin("document.querySelector('#text').value='';document.querySelector('#text').dispatchEvent(new Event('input',{bubbles:true}));");
  await plugin("HTMLImageElement.prototype.decode=window.__originalDecode;window.__resume();");
  await expect.poll(() => plugin("document.querySelector('#status').textContent")).toBe('复制文字或 Excel 单元格，然后读取剪贴板。');
  assert.equal(await plugin("document.querySelector('#preview').hasAttribute('src')"), false);
  await input('最终内容'); await ready();
  await plugin("document.querySelector('#width').value='0';document.querySelector('#width').dispatchEvent(new Event('input',{bubbles:true}));");
  await expect.poll(() => plugin("document.querySelector('#status').dataset.error")).toBe('true');
  assert.equal(await plugin("document.querySelector('#copy').disabled"), true);
  await plugin("document.querySelector('#width').value='800';document.querySelector('#width').dispatchEvent(new Event('input',{bubbles:true}));"); await ready();

  // Explicit input must not be replaced by unrelated clipboard content.
  await clipboard('clipboard source', html);
  await launch({ payload: '明确指定的文字' }); await ready();
  assert.equal(await plugin("document.querySelector('#text').value"), '明确指定的文字');
  await clipboard('明确指定的文字', html);
  await launch({ payload: '明确指定的文字' }); await ready();
  assert.equal(await plugin("document.querySelector('#text').value"), '明确指定的文字', 'Explicit input cannot be replaced by a different HTML representation');
  for (const locale of ['en', 'zh-Hant', 'zh-CN']) {
    await call('settings', { language: locale });
    await expect.poll(() => plugin('document.documentElement.lang')).toBe(locale);
    assert.equal(await plugin("document.querySelector('#text').value"), '明确指定的文字');
  }

  await paste('', html); await ready();
  const pluginPage = app.context().pages().find(page => page.url().includes(`nexlet-plugin://${id}`));
  assert(pluginPage, 'Playwright must expose the plugin renderer');
  for (const theme of ['light', 'dark']) {
    await app.evaluate(({ nativeTheme }, theme) => { nativeTheme.themeSource = theme; }, theme);
    // Playwright defaults to emulating light regardless of Electron nativeTheme.
    await pluginPage.emulateMedia({ colorScheme: theme });
    await expect.poll(() => plugin("matchMedia('(prefers-color-scheme: dark)').matches")).toBe(theme === 'dark');
    await app.evaluate((_, id) => globalThis.__nexlet.plugins.runtime.sessions.get(id).view.setBounds({ x: 0, y: 0, width: 960, height: 640 }), id);
    const screenshot = await app.evaluate(async (_, id) => (await globalThis.__nexlet.plugins.runtime.sessions.get(id).view.webContents.capturePage()).toPNG().toString('base64'), id);
    await writeFile(path.join(root, `dist/text-image-${theme}.png`), Buffer.from(screenshot, 'base64'));
  }
  await app.evaluate((_, id) => globalThis.__nexlet.plugins.runtime.sessions.get(id).view.setBounds({ x: 0, y: 0, width: 360, height: 780 }), id);
  assert.equal(await plugin('document.documentElement.scrollWidth <= innerWidth'), true);
  const narrow = await app.evaluate(async (_, id) => (await globalThis.__nexlet.plugins.runtime.sessions.get(id).view.webContents.capturePage()).toPNG().toString('base64'), id);
  await writeFile(path.join(root, 'dist/text-image-narrow.png'), Buffer.from(narrow, 'base64'));

  // Run production UI with only readHTML removed from a cloned bridge. This verifies
  // the fallback without mutating the real preload or pretending to run an old binary.
  await call('window', { action: 'exitPlugin' });
  const legacyId = 'org.nexlet.text-image-legacy', legacyFolder = path.join(folder, 'legacy');
  await mkdir(legacyFolder);
  for (const name of ['index.html', 'style.css', 'icon.png']) await copyFile(path.join(root, '.build/plugins/text-image', name), path.join(legacyFolder, name));
  const manifest = JSON.parse(await readFile(path.join(root, 'plugins/text-image/plugin.json'), 'utf8'));
  await writeFile(path.join(legacyFolder, 'plugin.json'), JSON.stringify({ ...manifest, id: legacyId }));
  const legacyBundle = await build({ entryPoints: [path.join(root, 'plugins/text-image/src/main.ts')], bundle: true, write: false, platform: 'browser', format: 'iife', define: { nexlet: 'window.__legacyNexlet' } });
  await writeFile(path.join(legacyFolder, 'main.js'), 'window.__legacyNexlet={...window.nexlet,clipboard:{...window.nexlet.clipboard,readHTML:undefined}};\n' + legacyBundle.outputFiles[0].text);
  await install(legacyFolder, true);
  await clipboard('旧宿主文字', html);
  await call('launch', { id: `plugin:${legacyId}:convert` });
  await expect.poll(() => plugin("!document.querySelector('#copy').disabled", legacyId)).toBe(true);
  assert.equal(await plugin("document.querySelector('#text').value", legacyId), '旧宿主文字');
  assert.equal(await plugin("document.querySelector('#compatibility').hidden", legacyId), false);
  await plugin(`(() => {const data=new DataTransfer();data.setData('text/html',${JSON.stringify(html)});document.querySelector('.stage').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));})()`, legacyId);
  await expect.poll(() => plugin("!document.querySelector('#copy').disabled", legacyId)).toBe(true);
  assert.equal(await plugin("document.querySelector('#table-size').textContent", legacyId), '4 行 · 8 个单元格');
  assert.deepEqual(errors, []);
  console.log('PASS: packaged install; real HTML permission/clipboard; text and styled PNG pixels; merged cells; clipboard PNG; save/cancel; hostile HTML; TSV; limits; input ownership; locales; light/dark/narrow UI; missing-readHTML fallback.');
} finally {
  if (app) { await restoreClipboard(app).catch(error => console.error('Clipboard restore:', error)); await app.close(); }
  await rm(folder, { recursive: true, force: true });
}

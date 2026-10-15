import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../', import.meta.url));
const host = path.resolve(process.env.NEXLET_HOST_DIR || path.join(root, '../Nexlet'));
const { _electron: electron, expect } = createRequire(path.join(host, 'package.json'))('@playwright/test');
const directory = await mkdtemp(path.join(tmpdir(), 'nexlet-plugin-i18n-'));
const env = { ...process.env, NEXLET_TEST_MODE: '1', NEXLET_TEST_LOCALE: 'zh-CN', NEXLET_USER_DATA: directory };
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({ args: [host], cwd: host, env });
  const page = await app.firstWindow();
  await expect(page.locator('.launcher-input')).toBeVisible();
  const call = (action, payload) => page.evaluate(({action,payload}) => window.nexlet.call(action,payload), {action,payload});
  await call('settings', { hideOnBlur: false, clipboardEnabled: false });
  const errors=[];app.context().on('page', p=>p.on('pageerror',e=>errors.push(e.message)));
  for (const [name,selector,heading] of [['hello-nexlet','#note','Jot something down'],['word-count','#text','Word Count'],['translate','#input','Translate'],['ctool','textarea',null]]) {
    const directory = path.join(root, name==='ctool'?'.build/plugins/ctool':'plugins/'+name);
    const manifest = JSON.parse(await readFile(path.join(directory,'plugin.json'),'utf8'));
    await app.evaluate(({dialog},directory)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[directory]});},directory);
    assert.equal(await call('pluginInstall',{development:true}),true);
    await call('launch',{id:`plugin:${manifest.id}:${name==='ctool'?'hash':manifest.features[0].code}`});
    const plugin = script => app.evaluate(async (_,{id,script})=>{
      const session=globalThis.__nexlet.plugins.runtime.sessions.get(id);await session.queue;return session.view.webContents.executeJavaScript(script);
    },{id:manifest.id,script});
    await expect.poll(()=>plugin(`!!document.querySelector(${JSON.stringify(selector)})`)).toBe(true);
    // Use LLM to avoid Google's automatic request when adding test input.
    if(name==='translate') await plugin(`document.querySelector('#engine-llm').click()`);
    const value='Keep 用户输入 🌏 123';
    await plugin(`window.__input=document.querySelector(${JSON.stringify(selector)});window.__input.value=${JSON.stringify(value)};window.__input.dispatchEvent(new Event('input',{bubbles:true}));`);
    const systemLocale=await plugin('(async()=> (await nexlet.system.info()).locale)()');
    for(const locale of ['en','zh-Hant','zh-CN']) {
      await call('settings',{language:locale});
      if(name!=='ctool') {
        await expect.poll(()=>plugin('document.documentElement.lang')).toBe(locale);
        if(locale==='en') await expect.poll(()=>plugin('document.querySelector("h1").textContent.trim()')).toBe(heading);
      } else {
        await expect.poll(()=>plugin('document.body.innerText')).toContain(locale==='en'?'Hash':'哈希');
      }
      assert.equal(await plugin(`document.querySelector(${JSON.stringify(selector)}).value`),value,`${name}: ${locale} input`);
      assert.equal(await plugin('(async()=> (await nexlet.system.info()).locale)()'),systemLocale);
      if(name!=='ctool') assert.equal(await plugin(`document.querySelector(${JSON.stringify(selector)})===window.__input`),true);
    }
    await call('window',{action:'exitPlugin'});
    console.log(`PASS ${name}: English / Traditional / Simplified labels and input preservation`);
  }
  assert.deepEqual(errors,[]);
} finally {await app?.close();await rm(directory,{recursive:true,force:true});}

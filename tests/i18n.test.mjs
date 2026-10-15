import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { t, applyLocale } from '../plugins/translate/i18n.js';
import { buildRequest } from '../plugins/translate/translation.js';

test('translated plugin UI does not change translation payload, engine or language codes', () => {
  for (const locale of ['en', 'zh-Hant', 'zh-CN']) {
    applyLocale(locale);
    const request = buildRequest({ engine: 'google', text: '用户内容 stays unchanged', source: 'auto', target: 'zh-TW' });
    assert.equal(new URL(request.url).searchParams.get('tl'), 'zh-TW');
    assert.equal(new URL(request.url).searchParams.get('q'), '用户内容 stays unchanged');
  }
  applyLocale('en'); assert.equal(t('检测到：{{v0}}', { v0: '日本語' }), 'Detected: 日本語');
  applyLocale('zh-CN');
});
test('standalone plugin runtimes are synchronized with the shared source', async () => {
  const source = await readFile(new URL('../shared/browser-i18n.js', import.meta.url), 'utf8');
  for (const name of ['hello-nexlet', 'word-count', 'translate']) assert.equal(await readFile(new URL(`../plugins/${name}/i18n.js`, import.meta.url), 'utf8'), source);
});
test('Ctool follows the application language and falls back to Simplified Chinese for Traditional', async () => {
  const previous = globalThis.window;
  let listener, complete;
  globalThis.window = { nexlet: { i18n: { onChange: callback => { listener = callback; }, getLocale: () => new Promise(resolve => { complete = resolve; }) } } };
  try {
    const { prepareLocale, getHostLocale, onHostLocaleChange } = await import('../integrations/ctool/adapter/locale.ts');
    const seen = [], off = onHostLocaleChange(locale => seen.push(locale));
    const preparing = prepareLocale(); listener('en'); complete('zh-CN'); await preparing;
    assert.equal(getHostLocale(), 'en');
    listener('zh-Hant'); assert.equal(getHostLocale(), 'zh_CN');
    assert.deepEqual(seen, ['en', 'zh_CN']); off();
  } finally { globalThis.window = previous; }
});

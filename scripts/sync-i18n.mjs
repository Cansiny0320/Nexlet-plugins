import { readFile, writeFile } from 'node:fs/promises';
const locales = JSON.parse(await readFile(new URL('../shared/plugin-locales.json', import.meta.url), 'utf8'));
const source = await readFile(new URL('../shared/browser-i18n.js', import.meta.url));
for (const plugin of ['hello-nexlet', 'word-count', 'translate']) {
  await writeFile(new URL(`../plugins/${plugin}/i18n.js`, import.meta.url), source);
  await writeFile(new URL(`../plugins/${plugin}/locales.js`, import.meta.url), '// Generated from shared/plugin-locales.json by scripts/sync-i18n.mjs.\nexport default ' + JSON.stringify(locales, null, 2) + ';\n');
}

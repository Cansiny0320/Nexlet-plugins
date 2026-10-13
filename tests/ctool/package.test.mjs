import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, '.build/plugins/ctool');
test('all upstream tools and feature routes ship within the host package limits', async () => {
  const { tools } = createRequire(import.meta.url)(path.join(root, '.build/ctool-source/packages/ctool-config/dist/index.js'));
  const actual = JSON.parse(await readFile(path.join(output, 'tools.json'), 'utf8'));
  assert.deepEqual(actual, tools.map(tool => ({ name: tool.name, features: tool.features.map(feature => ({ name: feature.name, path: feature.getRouter() })) })));
  assert.equal(actual.length, 50); assert.equal(actual.flatMap(tool => tool.features).length, 74);
  const manifest = JSON.parse(await readFile(path.join(output, 'plugin.json'), 'utf8'));
  assert.equal(manifest.features.length, 30);
  await stat(path.join(output, manifest.main)); await stat(path.join(output, manifest.backend));
  let count = 0, total = 0;
  async function visit(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) { assert.notEqual(item.name, 'node_modules'); await visit(file); }
      else { const { size } = await stat(file); assert.ok(size <= 10 * 1024 * 1024, item.name); total += size; count++; }
    }
  }
  await visit(output); assert.ok(total <= 50 * 1024 * 1024); assert.ok(count <= 2000);
  const notices = await readFile(path.join(output, 'THIRD_PARTY_NOTICES.txt'), 'utf8');
  assert.match(notices, /Permission is hereby granted/); assert.match(notices, /monaco-editor@/); assert.match(notices, /vue@/);
});

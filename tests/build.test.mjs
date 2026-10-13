import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildPlugin } from '../scripts/build.mjs';

test('backend TypeScript bundles Node imports into the declared CommonJS entry', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'nexlet-backend-build-'));
  try {
    const source = path.join(folder, 'plugin'), output = path.join(folder, 'output');
    await mkdir(path.join(source, 'src'), { recursive: true });
    await writeFile(path.join(source, 'plugin.json'), JSON.stringify({ backend: 'backend.cjs', permissions: ['backend'] }));
    await writeFile(path.join(source, 'src/backend.ts'), 'import {createHash} from "node:crypto";export const handlers={hash:()=>createHash("sha256").update("fixture").digest("hex")};');
    await buildPlugin(source, output);
    const result = spawnSync(process.execPath, ['-e', 'console.log(require(process.argv[1]).handlers.hash())', path.join(output, 'backend.cjs')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.match(result.stdout.trim(), /^[a-f0-9]{64}$/);
    assert.deepEqual((await readdir(output)).sort(), ['backend.cjs', 'plugin.json']);
    await writeFile(path.join(source, 'plugin.json'), JSON.stringify({ backend: '../escape.cjs', permissions: ['backend'] }));
    await assert.rejects(buildPlugin(source, output), /backend/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('TypeScript builds to a loadable package without sources or development dependencies', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'nexlet-ts-build-'));
  try {
    const source = path.join(folder, 'plugin'), output = path.join(folder, 'output');
    await mkdir(path.join(source, 'src'), { recursive: true });
    await mkdir(path.join(source, 'node_modules/unused'), { recursive: true });
    await writeFile(path.join(source, 'plugin.json'), JSON.stringify({ id: 'org.nexlet.fixture', version: '1.0.0', main: 'index.html' }));
    await writeFile(path.join(source, 'index.html'), '<script type="module" src="main.js"></script>');
    await writeFile(path.join(source, 'style.css'), 'body { color: red; }');
    await writeFile(path.join(source, 'src/main.ts'), 'import { value } from "./value"; document.title = value;');
    await writeFile(path.join(source, 'src/value.ts'), 'export const value: string = "built from TypeScript";');
    await writeFile(path.join(source, 'node_modules/unused/index.js'), 'throw new Error("must not ship");');
    await buildPlugin(source, output);
    assert.match(await readFile(path.join(output, 'main.js'), 'utf8'), /built from TypeScript/);
    assert.deepEqual((await readdir(output)).sort(), ['index.html', 'main.js', 'plugin.json', 'style.css']);
    const bundle = path.join(folder, 'fixture.nexlet');
    const raw = spawnSync('python3', ['scripts/package.py', '--plugin-dir', source, '--output', bundle], { encoding: 'utf8' });
    assert.notEqual(raw.status, 0);
    assert.match(raw.stderr, /must be built first/);
    const result = spawnSync('python3', ['scripts/package.py', '--plugin-dir', output, '--output', bundle], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const contents = spawnSync('python3', ['-c', 'import zipfile,sys,json; print(json.dumps(zipfile.ZipFile(sys.argv[1]).namelist()))', bundle], { encoding: 'utf8' });
    assert.deepEqual(JSON.parse(contents.stdout), ['index.html', 'main.js', 'plugin.json', 'style.css']);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('browser builds reject Node.js imports and remove a failed build rather than leave stale output', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'nexlet-ts-invalid-'));
  try {
    const source = path.join(folder, 'plugin'), output = path.join(folder, 'output');
    await mkdir(path.join(source, 'src'), { recursive: true });
    await mkdir(output);
    await writeFile(path.join(output, 'main.js'), 'stale code');
    await writeFile(path.join(source, 'src/main.ts'), 'import fs from "node:fs"; console.log(fs);');
    await assert.rejects(buildPlugin(source, output), /node:fs/);
    await assert.rejects(readFile(path.join(output, 'main.js')), { code: 'ENOENT' });
  } finally { await rm(folder, { recursive: true, force: true }); }
});

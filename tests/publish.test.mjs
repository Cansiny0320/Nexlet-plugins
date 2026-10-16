import test from 'node:test';
import assert from 'node:assert/strict';
import { planPublication, publishPlan, ensureRelease, sourceHash, candidates } from '../scripts/publish.mjs';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const entry = { id: 'org.nexlet.demo', name: 'Demo', description: 'Demo plugin', version: '1.0.0', author: 'Nexlet', category: '开发', platforms: ['win32'], minHostVersion: '0.2.21' };
const candidate = { entry, directory: 'demo', sourceHash: 'a'.repeat(64) };
const empty = { schemaVersion: 1, plugins: [] };
const initial = () => planPublication([candidate], empty, { schemaVersion: 1, plugins: {} });

test('published catalog retains localized manifest labels through candidate generation', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'nexlet-localized-catalog-'));
  try {
    const locales = { en: { name: 'Notes' }, 'zh-Hant': { name: '便箋' } };
    const manifest = { ...entry, locales };
    for (const directory of ['plugins/demo', '.build/plugins/demo']) {
      mkdirSync(path.join(workspace, directory), { recursive: true });
      writeFileSync(path.join(workspace, directory, 'plugin.json'), JSON.stringify(manifest));
    }
    const plan = planPublication(candidates(workspace), empty, { schemaVersion: 1, plugins: {} });
    assert.deepEqual(plan.index.plugins[0].locales, locales);
    assert.match(plan.index.plugins[0].download, /org.nexlet.demo-v1.0.0/);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test('new plugin gets an immutable per-plugin download URL', () => {
  const plan = initial();
  assert.equal(plan.releases.length, 1);
  assert.match(plan.index.plugins[0].download, /org.nexlet.demo-v1.0.0\/demo.nexlet$/);
});

test('same version reuses historical URL, rejects changed source and downgrades', () => {
  const old = initial();
  old.index.plugins[0].download = 'https://github.com/Cansiny0320/Nexlet-plugins/releases/download/v1.3.0/demo.nexlet';
  assert.equal(planPublication([candidate], old.index, old.state).releases.length, 0);
  assert.equal(planPublication([candidate], old.index, old.state).index.plugins[0].download, old.index.plugins[0].download);
  assert.throws(() => planPublication([{ ...candidate, sourceHash: 'b'.repeat(64) }], old.index, old.state), /version/);
  assert.throws(() => planPublication([{ ...candidate, entry: { ...entry, version: '0.9.0' } }], old.index, old.state), /downgrade/);
  assert.throws(() => planPublication([candidate], old.index, { schemaVersion: 1, plugins: {} }), /baseline/);
});

test('higher version publishes only the changed plugin and validates candidate IDs', () => {
  const old = initial();
  const next = planPublication([{ ...candidate, entry: { ...entry, version: '1.0.1' } }], old.index, old.state);
  assert.equal(next.releases.length, 1);
  assert.throws(() => planPublication([candidate, candidate], empty, { schemaVersion: 1, plugins: {} }), /Duplicate/);
  assert.throws(() => planPublication([{ ...candidate, entry: { ...entry, version: 'bad' } }], empty, { schemaVersion: 1, plugins: {} }), /version/);
});

test('publishes and verifies every asset before committing the index', async () => {
  const events = [];
  await publishPlan(initial(), {
    assertCurrent: async () => events.push('current'),
    ensureRelease: async () => events.push('asset'),
    updateIndex: async () => events.push('index'),
  });
  assert.deepEqual(events, ['current', 'asset', 'current', 'index']);
});

test('failed upload or stale main never updates the index; retry can finish', async () => {
  let writes = 0;
  const api = { assertCurrent: async () => {}, ensureRelease: async () => { throw new Error('upload failed'); }, updateIndex: async () => writes++ };
  await assert.rejects(publishPlan(initial(), api), /upload failed/);
  assert.equal(writes, 0);
  let checks = 0;
  await assert.rejects(publishPlan(initial(), { ...api, ensureRelease: async () => {}, assertCurrent: async () => { if (++checks === 2) throw new Error('stale'); } }), /stale/);
  assert.equal(writes, 0);
  await publishPlan(initial(), { ...api, ensureRelease: async () => {} });
  assert.equal(writes, 1);
});

function releaseFixture() {
  const bytes = Buffer.from('validated plugin package'), events = [];
  const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  let remote = null;
  const transport = {
    readAsset: () => bytes,
    find: async () => remote,
    refresh: async id => { assert.equal(id, remote.id); return remote; },
    create: async data => { events.push('create'); return remote = { ...data, id: 1, assets: [] }; },
    upload: async (_, name) => { events.push('upload'); remote.assets.push({ name, state: 'uploaded', size: bytes.length, digest, browser_download_url: 'https://example.test/asset' }); },
    publish: async () => { events.push('publish'); remote.draft = false; },
    download: async () => { events.push('download'); return bytes; },
  };
  return { transport, events, remote: () => remote };
}

test('release retry verifies and reuses the immutable asset without another upload', async () => {
  const fixture = releaseFixture(), release = initial().releases[0];
  await ensureRelease(release, 'commit', fixture.transport);
  await ensureRelease(release, 'commit', fixture.transport);
  assert.deepEqual(fixture.events, ['create', 'upload', 'publish', 'download', 'download']);
});

test('post-upload verification reads the known release ID when draft tag discovery is delayed', async () => {
  const fixture = releaseFixture();
  fixture.transport.find = async () => null;
  await ensureRelease(initial().releases[0], 'commit', fixture.transport);
  assert.deepEqual(fixture.events, ['create', 'upload', 'publish', 'download']);
});

test('same-source retry reuses verified published bytes when bundler output differs', async () => {
  const fixture = releaseFixture(), release = initial().releases[0];
  await ensureRelease(release, 'first-commit', fixture.transport);
  fixture.transport.readAsset = () => Buffer.from('same source rebuilt with different chunk aliases');
  await ensureRelease(release, 'retry-commit', fixture.transport);
  assert.equal(fixture.events.filter(e => e === 'upload').length, 1);
  await assert.rejects(ensureRelease({ ...release, sourceHash: 'b'.repeat(64) }, 'retry-commit', fixture.transport), /source mismatch/);
});

test('mismatched existing bytes are never overwritten or advertised', async () => {
  const fixture = releaseFixture(), release = initial().releases[0];
  await ensureRelease(release, 'commit', fixture.transport);
  fixture.remote().assets[0].digest = 'sha256:wrong';
  await assert.rejects(ensureRelease(release, 'commit', fixture.transport), /SHA256 mismatch/);
  assert.equal(fixture.events.filter(e => e === 'upload').length, 1);
});

test('public download failure blocks publication even if GitHub metadata looks valid', async () => {
  const fixture = releaseFixture();
  fixture.transport.download = async () => Buffer.from('wrong response');
  await assert.rejects(ensureRelease(initial().releases[0], 'commit', fixture.transport), /Public download verification failed/);
});

test('public verification uses the final catalog URL, never the draft asset URL', async () => {
  const fixture = releaseFixture(), release = initial().releases[0];
  const upload = fixture.transport.upload, download = fixture.transport.download;
  fixture.transport.upload = async (...args) => {
    await upload(...args);
    fixture.remote().assets[0].browser_download_url = 'https://github.com/Cansiny0320/Nexlet-plugins/releases/download/untagged-draft/demo.nexlet';
  };
  fixture.transport.download = async url => {
    assert.equal(url, initial().index.plugins[0].download);
    return download(url);
  };
  await ensureRelease(release, 'commit', fixture.transport);
});

test('an interrupted draft upload can be retried without replacing a published asset', async () => {
  const fixture = releaseFixture(), release = initial().releases[0];
  const digest = createHash('sha256').update(fixture.transport.readAsset()).digest('hex');
  await fixture.transport.create({ draft: true, body: `Source SHA256: ${release.sourceHash}\nAsset SHA256: ${digest}\n` });
  fixture.remote().assets.push({ id: 7, name: release.asset, state: 'starter', size: 0 });
  fixture.transport.removeIncomplete = async id => { assert.equal(id, 7); fixture.remote().assets = []; };
  await ensureRelease(release, 'commit', fixture.transport);
  assert.equal(fixture.remote().draft, false);
});

test('a draft with no completed asset can record new build bytes before retrying upload', async () => {
  const fixture = releaseFixture(), release = initial().releases[0];
  await fixture.transport.create({ draft: true, body: `Source SHA256: ${release.sourceHash}\nAsset SHA256: ${'0'.repeat(64)}\n` });
  fixture.transport.updateDraft = async (_, data) => { fixture.events.push('receipt'); Object.assign(fixture.remote(), data); };
  await ensureRelease(release, 'commit', fixture.transport);
  assert.deepEqual(fixture.events, ['create', 'receipt', 'upload', 'publish', 'download']);
});

test('source baseline normalizes Windows line endings and includes compiled dependencies', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'nexlet-source-'));
  try {
    mkdirSync(path.join(workspace, 'plugins/demo/src'), { recursive: true });
    const source = path.join(workspace, 'plugins/demo/src/main.ts');
    writeFileSync(source, 'export {};\r\n');
    writeFileSync(path.join(workspace, 'plugins/demo/LICENSE'), 'MIT\r\n');
    writeFileSync(path.join(workspace, 'package-lock.json'), '{"version":1}\r\n');
    const original = sourceHash('demo', workspace);
    writeFileSync(source, 'export {};\n');
    writeFileSync(path.join(workspace, 'plugins/demo/LICENSE'), 'MIT\n');
    assert.equal(sourceHash('demo', workspace), original);
    writeFileSync(path.join(workspace, 'plugins/demo/README.md'), 'documentation');
    assert.equal(sourceHash('demo', workspace), original);
    writeFileSync(path.join(workspace, 'package-lock.json'), '{"version":2}\n');
    assert.notEqual(sourceHash('demo', workspace), original);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

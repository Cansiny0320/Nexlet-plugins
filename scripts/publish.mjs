import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const repository = 'Cansiny0320/Nexlet-plugins';
const base = `https://github.com/${repository}/releases/download/`;
const json = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const stableVersion = value => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
const compare = (a, b) => {
  const left = a.split('.').map(BigInt), right = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
};
function check(condition, message) { if (!condition) throw new Error(message); }

// Normalize text line endings so Windows checkouts and Linux CI share a baseline.
export function sourceHash(directory, workspace = root) {
  check(/^[a-zA-Z0-9_-]+$/.test(directory), 'Invalid plugin directory');
  const hash = createHash('sha256');
  const addFile = name => {
    let data = readFileSync(path.join(workspace, name));
    if (/\.(?:[cm]?[jt]s|tsx|json|html|css|md|txt|yaml|yml)$/.test(name) || /(?:^|\/)LICENSE(?:\.[^/]*)?$/.test(name)) data = Buffer.from(data.toString('utf8').replaceAll('\r\n', '\n'));
    hash.update(name).update('\0').update(sha256(data)).update('\0');
  };
  const visit = relative => {
    const absolute = path.join(workspace, relative);
    if (!existsSync(absolute)) return;
    for (const item of readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (['README.md', 'node_modules', '.git', '.build', 'dist'].includes(item.name)) continue;
      check(!item.isSymbolicLink(), 'Plugin source cannot contain symlinks');
      const name = `${relative}/${item.name}`;
      if (item.isDirectory()) visit(name);
      else addFile(name);
    }
  };
  for (const group of ['plugins', 'integrations', 'vendor']) visit(`${group}/${directory}`);
  // Compiled plugins also depend on the shared SDK, compiler and locked tools.
  if (existsSync(path.join(workspace, 'plugins', directory, 'src')) || existsSync(path.join(workspace, 'integrations', directory))) {
    visit('sdk');
    for (const file of ['scripts/build.mjs', 'package-lock.json', 'tsconfig.json', 'tsconfig.backend.json', `tsconfig.${directory}.json`]) if (existsSync(path.join(workspace, file))) addFile(file);
  }
  return hash.digest('hex');
}

export function planPublication(candidates, previous, published) {
  check(previous.schemaVersion === 1 && published.schemaVersion === 1, 'Invalid publication schema');
  const index = { schemaVersion: 1, plugins: [] }, state = structuredClone(published), releases = [], seen = new Set();
  for (const candidate of candidates) {
    const { entry, directory, sourceHash: fingerprint } = candidate;
    check(typeof entry.id === 'string' && entry.id.length <= 100 && /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(entry.id), 'Invalid plugin ID');
    check(!seen.has(entry.id), 'Duplicate plugin ID'); seen.add(entry.id);
    check(stableVersion(entry.version) && entry.version.length <= 50, 'Invalid stable plugin version');
    check(/^[a-zA-Z0-9_-]+$/.test(directory) && /^[a-f0-9]{64}$/.test(fingerprint), 'Invalid source identity');
    for (const [key, max] of [['name', 50], ['description', 500], ['author', 80], ['category', 30]]) check(typeof entry[key] === 'string' && entry[key].trim() && entry[key].length <= max, `Invalid ${key}`);
    check(Array.isArray(entry.platforms) && entry.platforms.length && entry.platforms.every(p => ['win32', 'darwin', 'linux'].includes(p)), 'Invalid platforms');
    check(!entry.minHostVersion || stableVersion(entry.minHostVersion), 'Invalid minimum host version');
    check(!entry.icon || (entry.icon.length <= 100000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(entry.icon)), 'Invalid icon');
    const old = previous.plugins.find(p => p.id === entry.id), baseline = state.plugins[entry.id];
    check(!old || (baseline && baseline.version === old.version), `Missing publication baseline: ${entry.id}`);
    if (baseline) {
      check(stableVersion(baseline.version), 'Invalid baseline version');
      check(compare(entry.version, baseline.version) >= 0, `Cannot downgrade ${entry.id}`);
      if (entry.version === baseline.version) check(fingerprint === baseline.sourceHash, `Source changed; increment plugin version: ${entry.id}`);
    }
    let download;
    if (old && entry.version === old.version) {
      check(old.download.startsWith(base) && /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\.nexlet$/.test(old.download.slice(base.length)), 'Invalid historical URL');
      download = old.download;
    } else {
      const tag = `${entry.id}-v${entry.version}`, asset = `${directory}.nexlet`;
      download = `${base}${tag}/${asset}`;
      releases.push({ id: entry.id, version: entry.version, tag, asset, sourceHash: fingerprint });
    }
    index.plugins.push({ ...entry, download });
    state.plugins[entry.id] = { version: entry.version, sourceHash: fingerprint };
  }
  return { index, state, releases };
}

export async function publishPlan(plan, services) {
  await services.assertCurrent();
  for (const release of plan.releases) await services.ensureRelease(release);
  await services.assertCurrent();
  await services.updateIndex(plan.index, plan.state);
}

function candidates() {
  const catalog = json('catalog.json');
  check(catalog.schemaVersion === 1 && Array.isArray(catalog.plugins) && catalog.plugins.length <= 200, 'Invalid catalog');
  return catalog.plugins.map(metadata => {
    const { directory, author, category, platforms, minHostVersion } = metadata;
    check(/^[a-zA-Z0-9_-]+$/.test(directory), 'Invalid catalog directory');
    const manifest = json(`plugins/${directory}/plugin.json`), built = json(`.build/plugins/${directory}/plugin.json`);
    check(JSON.stringify(manifest) === JSON.stringify(built), `Stale build: ${directory}`);
    const { id, name, description, version } = manifest;
    const entry = { id, name, description, version, author, category, platforms, ...(minHostVersion ? { minHostVersion } : {}) };
    if (manifest.icon) {
      check(/^[a-zA-Z0-9._-]+\.png$/.test(manifest.icon), 'Catalog icons must be root PNG files');
      const icon = 'data:image/png;base64,' + readFileSync(path.join(root, '.build/plugins', directory, manifest.icon)).toString('base64');
      if (icon.length <= 100000) entry.icon = icon;
    }
    return { entry, directory, sourceHash: sourceHash(directory) };
  });
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
function api(endpoint, method = 'GET', data) {
  const args = ['api', endpoint, '--method', method];
  if (data !== undefined) args.push('--input', '-');
  return JSON.parse(execFileSync('gh', args, { cwd: root, encoding: 'utf8', input: data === undefined ? undefined : JSON.stringify(data), maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }));
}
function releaseByTag(tag) {
  try { return api(`repos/${repository}/releases/tags/${tag}`); }
  catch (error) {
    if (!String(error.stderr).includes('HTTP 404')) throw error;
    // Drafts do not always resolve through the tag endpoint before a tag exists.
    for (let page = 1; ; page++) {
      const releases = api(`repos/${repository}/releases?per_page=100&page=${page}`);
      const draft = releases.find(r => r.tag_name === tag);
      if (draft) return draft;
      if (releases.length < 100) return null;
    }
  }
}

export async function ensureRelease(release, commit, transport) {
  const bytes = transport.readAsset(release.asset), digest = `sha256:${sha256(bytes)}`;
  const marker = `Source SHA256: ${release.sourceHash}`;
  let remote = await transport.find(release.tag);
  if (!remote) remote = await transport.create({ tag_name: release.tag, target_commitish: commit, name: `${release.id} ${release.version}`, draft: true, prerelease: false, body: `Automatically built from ${commit}.\n\n${marker}\nAsset SHA256: ${digest.slice(7)}\n` });
  check(remote.body?.includes(marker), `Release source mismatch: ${release.tag}`);
  let asset = remote.assets.find(a => a.name === release.asset);
  // GitHub can leave a zero-byte starter asset after an interrupted upload.
  // Only incomplete draft assets may be removed; published assets are immutable.
  if (remote.draft && asset?.state === 'starter') {
    await transport.removeIncomplete(asset.id);
    asset = undefined;
  }
  if (!asset) {
    check(remote.draft, `Published release is missing its immutable asset: ${release.tag}`);
    await transport.upload(release.tag, release.asset);
    remote = await transport.find(release.tag);
    asset = remote.assets.find(a => a.name === release.asset);
  }
  check(asset && asset.state === 'uploaded' && asset.size === bytes.length, `Incomplete asset: ${release.asset}`);
  check(asset.digest === digest, `Asset SHA256 mismatch: ${release.asset}; never overwrite a version`);
  if (remote.draft) await transport.publish(remote.id);
  // Verify the anonymous URL the existing client will actually use.
  const downloaded = await transport.download(asset.browser_download_url);
  check(downloaded.length === bytes.length && `sha256:${sha256(downloaded)}` === digest, `Public download verification failed: ${release.asset}`);
}

async function main() {
  const mode = process.argv[2];
  check(['--prepare', '--publish'].includes(mode), 'Usage: node scripts/publish.mjs --prepare|--publish');
  const plan = planPublication(candidates(), json('index.json'), json('published.json'));
  if (mode === '--prepare') {
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    writeFileSync(path.join(root, 'dist/index.json'), serialize(plan.index));
    console.log(serialize({ releases: plan.releases, plugins: plan.index.plugins.map(p => ({ id: p.id, version: p.version, download: p.download })) }));
    return;
  }
  check(process.env.GITHUB_REPOSITORY === repository && process.env.GITHUB_REF === 'refs/heads/main' && ['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME), 'Publishing is restricted to this repository main workflow');
  const commit = process.env.GITHUB_SHA;
  check(commit && git('rev-parse', 'HEAD') === commit, 'Checkout does not match workflow source');
  check(git('status', '--porcelain', '--untracked-files=no') === '', 'Publishing requires a clean checkout');
  const transport = {
    readAsset: asset => readFileSync(path.join(root, 'dist', asset)),
    find: async tag => releaseByTag(tag),
    create: async data => api(`repos/${repository}/releases`, 'POST', data),
    upload: async (tag, asset) => execFileSync('gh', ['release', 'upload', tag, path.join(root, 'dist', asset), '--repo', repository], { stdio: 'inherit' }),
    removeIncomplete: async id => execFileSync('gh', ['api', `repos/${repository}/releases/assets/${id}`, '--method', 'DELETE'], { stdio: 'inherit' }),
    publish: async id => api(`repos/${repository}/releases/${id}`, 'PATCH', { draft: false, make_latest: 'false' }),
    download: async url => {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
          check(response.ok, `Download HTTP ${response.status}`);
          return Buffer.from(await response.arrayBuffer());
        } catch (error) {
          if (attempt >= 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        }
      }
    },
  };
  await publishPlan(plan, {
    assertCurrent: async () => check(api(`repos/${repository}/git/ref/heads/main`).object.sha === commit, 'Stale source: main changed; the newer workflow will publish'),
    ensureRelease: release => ensureRelease(release, commit, transport),
    updateIndex: async (index, state) => {
      for (const [file, value] of [['index.json', index], ['published.json', state]]) writeFileSync(path.join(root, file), serialize(value));
      if (!git('diff', '--name-only', '--', 'index.json', 'published.json')) { console.log('Marketplace already up to date'); return; }
      git('add', '--', 'index.json', 'published.json');
      git('-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', 'chore: publish verified plugin catalog [skip ci]');
      // No force/rebase: a concurrent main update must reject this index commit.
      git('push', 'origin', 'HEAD:main');
      console.log('Published marketplace index');
    },
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });

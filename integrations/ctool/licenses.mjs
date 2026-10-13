import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

// Preserve license text for the locked dependency graph, including transitive packages.
export async function dependencyNotices(source) {
  const parts = [], seen = new Set();
  const directory = path.join(source, 'node_modules/.pnpm');
  async function add(directory) {
    let pkg;
    try { pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')); } catch { return; }
    const key = `${pkg.name}@${pkg.version}`; if (seen.has(key)) return; seen.add(key);
    const files = (await readdir(directory)).filter(name => /^(licen[sc]e|copying|copyright|notice)(\.|$)/i.test(name));
    const texts = await Promise.all(files.map(name => readFile(path.join(directory, name), 'utf8').catch(() => '')));
    parts.push(`\n${'='.repeat(72)}\n${key}\nLicense: ${typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license || pkg.licenses || 'See package source')}\n${texts.filter(Boolean).join('\n')}`);
  }
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules') continue;
    const modules = path.join(directory, entry.name, 'node_modules');
    for (const module of await readdir(modules, { withFileTypes: true }).catch(() => [])) {
      if (!module.isDirectory()) continue;
      const location = path.join(modules, module.name);
      if (module.name.startsWith('@')) {
        for (const scoped of await readdir(location, { withFileTypes: true })) if (scoped.isDirectory()) await add(path.join(location, scoped.name));
      } else await add(location);
    }
  }
  return parts.sort().join('\n');
}

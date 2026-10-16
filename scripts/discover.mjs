import { readdirSync, lstatSync, existsSync } from 'node:fs';
import path from 'node:path';

// Only direct child directories with a manifest are distributable plugins.
// Templates use this same directory convention but are never market candidates.
export function discoverPlugins(workspace, group = 'plugins') {
  const base = path.join(workspace, group), directories = [];
  for (const item of readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (item.isSymbolicLink()) throw Error(`Plugin directory cannot be a symlink: ${item.name}`);
    if (!item.isDirectory()) continue;
    const manifest = path.join(base, item.name, 'plugin.json');
    if (!existsSync(manifest)) continue;
    if (!/^[a-zA-Z0-9_-]+$/.test(item.name)) throw Error(`Invalid plugin directory: ${item.name}`);
    const info = lstatSync(manifest);
    if (!info.isFile() || info.isSymbolicLink()) throw Error(`Plugin manifest must be a regular file, not a symlink: ${item.name}`);
    directories.push(item.name);
  }
  if (directories.length > 200) throw Error('Too many plugins');
  return directories;
}

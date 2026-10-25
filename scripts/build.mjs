import { build } from 'esbuild';
import { watch } from 'node:fs';
import { access, mkdir, readdir, readFile, writeFile, copyFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPlugins } from './discover.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['src', 'node_modules', '.git', '.build', 'dist', 'package.json', 'package-lock.json', 'tsconfig.json', 'README.md']);
const exists = file => access(file).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });

async function copyAssets(source, output) {
  await mkdir(output, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name.startsWith('.') || /\.tsx?$/.test(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`插件资源不能为符号链接：${entry.name}`);
    const from = path.join(source, entry.name), to = path.join(output, entry.name);
    if (entry.isDirectory()) await copyAssets(from, to);
    else if (entry.isFile()) await copyFile(from, to);
  }
}

export async function buildPlugin(source, output) {
  // Outputs must be separate from source, since rebuilding clears only the output.
  source = path.resolve(source); output = path.resolve(output);
  for (const relative of [path.relative(source, output), path.relative(output, source)]) {
    if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new Error('构建目录与源码目录不能互相包含');
    }
  }
  if (source === path.join(root, 'plugins/ctool')) {
    const { buildCtool } = await import('../integrations/ctool/build.mjs');
    await buildCtool(output);
    return;
  }
  if (source === path.join(root, 'plugins/ocr')) {
    const { buildOcr } = await import('../integrations/ocr/build.mjs');
    await buildOcr(output);
    return;
  }
  await rm(output, { recursive: true, force: true });
  try {
    const entry = path.join(source, 'src/main.ts');
    const result = await exists(entry) ? await build({
      entryPoints: [entry], outfile: path.join(output, 'main.js'),
      bundle: true, platform: 'browser', format: 'iife', target: 'es2022',
      write: false, logLevel: 'silent',
    }) : null;
    let backendResult;
    const backendEntry = path.join(source, 'src/backend.ts');
    if (await exists(backendEntry)) {
      const manifest = JSON.parse(await readFile(path.join(source, 'plugin.json'), 'utf8'));
      if (typeof manifest.backend !== 'string' || !/^[a-zA-Z0-9_-]+\.cjs$/.test(manifest.backend) || !manifest.permissions?.includes('backend')) throw new Error('TS backend 需要声明根目录 .cjs 入口与 backend 权限');
      backendResult = await build({ entryPoints: [backendEntry], outfile: path.join(output, manifest.backend), bundle: true, platform: 'node', format: 'cjs', target: 'node24', write: false, logLevel: 'silent' });
    }
    await copyAssets(source, output);
    if (source === path.join(root,'plugins/pdf-tools')) {
      const pdfjs = path.join(root,'node_modules/pdfjs-dist');
      await mkdir(path.join(output,'pdfjs'),{recursive:true});
      await copyFile(path.join(pdfjs,'build/pdf.worker.mjs'),path.join(output,'pdfjs/pdf.worker.mjs'));
      for (const name of ['cmaps','standard_fonts','wasm']) await cp(path.join(pdfjs,name),path.join(output,'pdfjs',name),{recursive:true});
      await copyFile(path.join(pdfjs,'LICENSE'),path.join(output,'PDFJS-LICENSE'));
      await copyFile(path.join(root,'node_modules/pdf-lib/LICENSE.md'),path.join(output,'PDFLIB-LICENSE.md'));
    }
    for (const file of [...(result?.outputFiles ?? []), ...(backendResult?.outputFiles ?? [])]) {
      await mkdir(path.dirname(file.path), { recursive: true });
      await writeFile(file.path, file.contents);
    }
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2), watching = args.includes('--watch');
  let targets = args.filter(arg => arg !== '--watch');
  if (!targets.length) {
    if (watching) throw new Error('请指定开发目录，例如 npm run dev -- templates/typescript');
    targets = [];
    for (const group of ['plugins', 'templates']) {
      for (const directory of discoverPlugins(root, group)) targets.push(`${group}/${directory}`);
    }
  }
  if (watching && targets.length !== 1) throw new Error('watch 模式每次只处理一个插件');
  for (const target of targets) {
    if (!/^(plugins|templates)\/[a-zA-Z0-9_-]+$/.test(target)) throw new Error(`无效的插件目录：${target}`);
    const source = path.join(root, target), output = path.join(root, '.build', target);
    await readFile(path.join(source, 'plugin.json'));
    const rebuild = async () => {
      await buildPlugin(source, output);
      console.log(`Built ${target} -> ${path.relative(root, output)}`);
    };
    await rebuild();
    if (watching) {
      let timer, running = false, pending = false;
      const update = async () => {
        pending = true;
        if (running) return;
        running = true;
        try {
          while (pending) {
            pending = false;
            try { await rebuild(); } catch (error) { console.error(error.message); }
          }
        } finally { running = false; }
      };
      watch(source, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(update, 100); });
      console.log('Watching TS and static assets. 在 Nexlet 中加载输出目录，修改后退出插件再打开。类型检查请运行 npm run typecheck。');
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

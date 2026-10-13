import { readFile, writeFile, mkdir, cp, rm, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { dependencyNotices } from './licenses.mjs';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = path.join(root, '.build/ctool-source');
const core = path.join(source, 'packages/ctool-core');
const defaultOutput = path.join(root, '.build/plugins/ctool');
const run = (command, args, cwd = source) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
});
const pnpm = args => run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['exec', '--yes', '--package=pnpm@9.15.9', '--', 'pnpm', ...args]);
async function replace(relative, from, to) {
  const file = path.join(core, relative), original = await readFile(file, 'utf8');
  if (!(typeof from === 'string' ? original.includes(from) : from.test(original))) throw new Error(`上游结构变化，无法应用适配：${relative}`);
  await writeFile(file, original.replace(from, to));
}
export async function buildCtool(output = defaultOutput) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Ctool 构建需要 Node.js 24+');
  const metadata = JSON.parse(await readFile(path.join(root, 'vendor/ctool/upstream.json'), 'utf8'));
  const archive = path.join(root, 'vendor/ctool/source.tar.gz');
  if (createHash('sha256').update(await readFile(archive)).digest('hex') !== metadata.sha256) throw new Error('Ctool 上游源码校验失败');
  await mkdir(source, { recursive: true });
  await run('tar', ['-xzf', archive, '--strip-components=1', '-C', source], root);
  // Keep the upstream lockfile intact. Only the packages used by the frontend are installed.
  await pnpm(['install', '--frozen-lockfile', '--filter', 'ctool-core...', '--filter', 'ctool-config...']);
  await pnpm(['--filter', 'ctool-config', 'run', 'build']);
  await run(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', path.join(root, 'tsconfig.ctool.json')], root);
  await cp(path.join(root, 'integrations/ctool/adapter'), path.join(core, 'src/nexlet'), { recursive: true });
  await replace('src/helper/platform/runtime.ts', /import \{ runtime as web \}[\s\S]*?from "ctool-adapter-tauri";/,
    'import { runtime as web } from "@/nexlet/runtime";');
  await replace('src/helper/platform/runtime.ts', 'const platforms = [edge, chrome, firefox, utools, tauri];', 'const platforms = [web];');
  await replace('src/helper/platform/index.ts', '["tauri"].includes(this.name)', '["tauri", "nexlet"].includes(this.name)');
  await replace('src/store/action.ts', 'import { reactive, toRaw } from "vue";', 'import { reactive, toRaw, onUnmounted } from "vue";\nimport { registerSave } from "@/nexlet/state";');
  await replace('src/store/action.ts', '    // 保存历史数据', '    onUnmounted(registerSave(() => historyPush.flush()));\n\n    // 保存历史数据');
  await cp(path.join(core, 'src/nexlet/clipboard.ts'), path.join(core, 'src/helper/clipboard.ts'));
  await replace('src/helper/clipboard.ts', "from './transport'", "from '@/nexlet/transport'");
  await replace('tool.html', 'src="/src/tool.ts"', 'src="/src/nexlet/bootstrap.ts"');
  await replace('src/tools/websocket/Websocket.vue', 'import {nextTick} from "vue";', 'import {nextTick, onUnmounted} from "vue";\nimport { BridgeWebSocket as WebSocket } from "@/nexlet/transport";');
  await replace('src/tools/websocket/Websocket.vue', 'const send = () => {', 'onUnmounted(close);\n\nconst send = () => {');
  await replace('src/tools/websocket/Websocket.vue', "log('Websocket Error')", "log(event.message || 'Websocket Error')");
  // Ajv compiles schemas with new Function; run it in the existing backend, never relax CSP.
  await replace('src/tools/json/Schema.vue', /import Ajv from "ajv"[\s\S]*?import AjvZh from "ajv-i18n\/localize\/zh"/, 'import { call } from "@/nexlet/transport";');
  await replace('src/tools/json/Schema.vue', 'const ajv = new Ajv({allErrors: true, messages: false})', 'let validationSequence = 0;');
  await replace('src/tools/json/Schema.vue', '}, async ({json, current}) => {', '}, async ({json, current}) => {\n    const sequence = ++validationSequence;');
  await replace('src/tools/json/Schema.vue', /        const validate = ajv.compile[\s\S]*?        emit\('success'\)/,
    `        const result = await call('schema', { schema: Json.parse(current.exp), value: json.content(), locale: $t('main_locale') });\n        if (sequence !== validationSequence) return;\n        output = result;\n        emit('success')`);
  await replace('src/tools/json/Schema.vue', '        output = $error(e)', '        if (sequence === validationSequence) output = $error(e)');
  await replace('src/helper/text/index.ts', 'import filetype from "magic-bytes.js";', 'import { download, readUrl } from "@/nexlet/files";\nimport filetype from "magic-bytes.js";');
  await replace('src/helper/text/index.ts', /    static async fromUrl\(url: string\) \{[\s\S]*?\n    static fromUint8Array/,
    `    static async fromUrl(url: string) {\n        try { return Text.fromUint8Array(await readUrl(url)); }\n        catch (error) { return Text.fromError(String(error)); }\n    }\n\n    static fromUint8Array`);
  await replace('src/helper/text/index.ts', /    toDown\(\) \{[\s\S]*?\n    toDataUrl/,
    `    toDown() { void download(this.uint.uint8Array, this.name()); }\n\n    toDataUrl`);
  // Marketplace releases own plugin updates. Keep attribution without upstream ad/notice polling.
  await writeFile(path.join(core, 'src/block/Notice.vue'), '<template><span>Ctool · Nexlet</span></template>\n');
  await writeFile(path.join(core, 'src/block/Github.vue'), '<template><Link href="https://github.com/baiy/Ctool">Ctool</Link></template>\n');
  await writeFile(path.join(core, 'src/block/utools/Keyword.vue'), '<template><span>请在 Nexlet 中管理搜索指令</span></template>\n');
  await writeFile(path.join(core, 'src/helper/stat.ts'), 'export const report = (_data: Record<string, unknown> = {}) => {};\n');
  await replace('vite.config.ts', 'index: resolve(__dirname, "index.html"),', '');
  // Modulepreload fetch uses connect-src. Imports themselves work under the existing CSP.
  await replace('vite.config.ts', 'emptyOutDir: true,', 'emptyOutDir: true,\n        modulePreload: false,');
  await pnpm(['--filter', 'ctool-core', 'exec', 'vite', 'build']);
  await rm(output, { recursive: true, force: true });
  await cp(path.join(core, 'dist'), output, { recursive: true });
  await cp(path.join(root, 'plugins/ctool/plugin.json'), path.join(output, 'plugin.json'));
  await cp(path.join(core, 'public/icon/icon_1024.png'), path.join(output, 'icon.png'));
  await cp(path.join(root, 'vendor/ctool/upstream.json'), path.join(output, 'upstream.json'));
  await cp(path.join(root, 'plugins/ctool/README.md'), path.join(output, 'README.md'));
  await build({ entryPoints: [path.join(root, 'integrations/ctool/backend.mjs')], outfile: path.join(output, 'backend.cjs'), bundle: true, platform: 'node', format: 'cjs', target: 'node24',
    nodePaths: [path.join(core, 'node_modules')], external: ['bufferutil', 'utf-8-validate'] });
  const addition = JSON.parse(await readFile(path.join(output, 'ctool.addition.json'), 'utf8'));
  await writeFile(path.join(output, 'THIRD_PARTY_NOTICES.txt'), `Ctool ${metadata.version}\n${metadata.repository}\nCommit ${metadata.commit}\n\n${await readFile(path.join(root, 'vendor/ctool/LICENSE'), 'utf8')}\nDependencies are pinned in the vendored pnpm-lock.yaml.\n${await dependencyNotices(source)}`);
  const { tools } = createRequire(import.meta.url)(path.join(source, 'packages/ctool-config/dist/index.js'));
  await writeFile(path.join(output, 'tools.json'), JSON.stringify(tools.map(tool => ({ name: tool.name, features: tool.features.map(feature => ({ name: feature.name, path: feature.getRouter() })) })), null, 2) + '\n');
  let total = 0, count = 0;
  async function check(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await check(file);
    else { const { size } = await stat(file); if (size > 10 * 1024 * 1024) throw new Error(`插件单文件超过 10 MB: ${file}`); total += size; count++; }
  } }
  await check(output);
  if (total > 50 * 1024 * 1024 || count > 2000) throw new Error(`插件产物超过宿主限制: ${total} bytes / ${count} files`);
  console.log(`Ctool built: ${(total / 1024 / 1024).toFixed(1)} MiB, ${count} files; upstream metadata: ${Object.keys(addition).join(', ')}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildCtool().catch(error => { console.error(error); process.exitCode = 1; });

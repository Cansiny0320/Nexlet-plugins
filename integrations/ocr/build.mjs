import { build } from 'vite';
import { readFile, readdir, mkdir, cp, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = path.join(root, 'plugins/ocr');
const dependencies = fileURLToPath(new URL('./node_modules/', import.meta.url));
export async function buildOcr(output = path.join(root, '.build/plugins/ocr')) {
  output = path.resolve(output);
  const relative = path.relative(path.join(root, '.build'), output);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('OCR output must stay inside .build');
  const models = path.join(source, 'models');
  const manifest = JSON.parse(await readFile(path.join(models, 'manifest.json'), 'utf8'));
  for (const item of manifest.files) {
    const data = await readFile(path.join(models, item.file));
    if (data.length !== item.bytes || createHash('sha256').update(data).digest('hex') !== item.sha256) throw Error('OCR model missing or damaged: ' + item.file);
  }
  const engine = path.join(dependencies, '@paddleocr/paddleocr-js/dist/assets');
  const worker = (await readdir(engine)).find(name => /^worker-entry-.*\.js$/.test(name));
  if (!worker) throw Error('PaddleOCR worker entry missing');
  await build({ configFile: false, root: source, base: './', resolve: {
    conditions: ['onnxruntime-web-use-extern-wasm', 'module', 'browser', 'production'],
    alias: [
      { find: /^@paddleocr\/paddleocr-js$/, replacement: path.join(dependencies, '@paddleocr/paddleocr-js/dist/index.mjs') },
      { find: /^paddle-ocr-worker(?=\?|$)/, replacement: path.join(engine, worker) },
      { find: /^onnxruntime-web$/, replacement: path.join(dependencies, 'onnxruntime-web/dist/ort.wasm.min.mjs') }
    ]
  }, worker: { format: 'es' }, build: { outDir: output, emptyOutDir: true, rollupOptions: { input: { main: path.join(source, 'index.html'), indexer: path.join(source, 'ocr-index.html'), provider: path.join(source, 'provider.html') } } } });
  await cp(models, path.join(output, 'models'), { recursive: true });
  await copyFile(path.join(source, 'plugin.json'), path.join(output, 'plugin.json'));
  await mkdir(path.join(output, 'runtime'), { recursive: true });
  for (const ext of ['mjs', 'wasm']) await copyFile(path.join(dependencies, 'onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.' + ext), path.join(output, 'runtime/ort-wasm-simd-threaded.jsep.' + ext));
}

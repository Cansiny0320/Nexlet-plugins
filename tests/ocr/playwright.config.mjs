import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const host = path.resolve(process.env.NEXLET_HOST_DIR || path.join(root, '../Nexlet'));
const { defineConfig } = createRequire(path.join(host, 'package.json'))('@playwright/test');
process.env.NEXLET_TEST_LOCALE ||= 'zh-CN';
export default defineConfig({
  testDir: '.', testMatch: 'quality.spec.mjs', workers: 1, fullyParallel: false,
  timeout: 90000, expect: { timeout: 15000 }, reporter: 'list',
  use: { trace: 'retain-on-failure' }, outputDir: path.join(root, '.build/ocr-test-results'),
});

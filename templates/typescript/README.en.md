[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# TypeScript plugin template

Run from the **Nexlet-plugins repository root** with Node.js 24+ and Python 3:

```sh
npm ci
npm run package:example
```

Import `dist/typescript-example.nexlet` or load `.build/templates/typescript`. Requires Nexlet 0.2.6+ with text input and lifecycle APIs.

For development:

```sh
npm run dev -- templates/typescript
```

TS, HTML, CSS, and manifest changes rebuild automatically. Close and reopen in Nexlet to load output; reimport after manifest/permission changes. Watch compiles only; run `npm run typecheck` before submitting. Normal build/package checks types first.

Copy this directory into `plugins/<name>` and change manifest ID, name, and features. It uses root dependencies/tsconfig. `src/main.ts` becomes `main.js`; other runtime files are copied. HTML loads an external `<script src="main.js">`, never `.ts` or inline scripts. Browser dependencies bundle with the TS entry; Node.js modules are unavailable in the frontend sandbox.

`npm run build` writes `.build/plugins/<name>`. Packaging without a marketplace entry:

```sh
python3 scripts/package.py --plugin-dir .build/plugins/<name> --output dist/<name>.nexlet
```

After adding `index.json`, `npm run package` builds/packages it with existing plugins. The template itself is not listed or automatically published.

Both `window.nexlet` and `nexlet` have types. Import named types with `import type { PluginContext } from '@nexlet/plugin-api'`; no runtime JS is needed for declarations. For multilingual UI, feature-detect `nexlet.i18n`, subscribe to changes, and update product labels without replacing user input. See the [SDK](../../sdk/README.en.md).

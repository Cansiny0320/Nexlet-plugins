[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# @nexlet/plugin-api

Type declarations for implemented public Nexlet Plugin API v1 methods. This package contains types only; Nexlet provides `window.nexlet` at runtime.

Run `npm ci` in this repository. Independent projects can use `npm install --save-dev /absolute/path/Nexlet-plugins/sdk`, then add `"types": ["@nexlet/plugin-api"]` to `tsconfig.json`. This package is local-only, not published on npm.

```ts
import type { PluginContext } from '@nexlet/plugin-api';

nexlet.onEnter((context: PluginContext) => {
  if (context.type === 'text') console.log(context.payload);
});
```

Requests return Promises; subscriptions return unsubscribe functions. `PluginContext` is a discriminated union, narrowing payload by `type`. Storage generics provide static hints; validate persisted user data in your own logic.

Do not mix host-internal `src/shared/types.ts` into the same compilation context: `HostApi` serves host pages, not plugins. Do not add Node.js globals to browser plugins; they cannot use `require`, `process`, or a custom preload.

See [host SDK documentation](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.en.md) for permissions, quotas, and lifecycle. These types describe Nexlet, not uTools compatibility.

`extensions.d.ts` is generated from host `src/shared/plugin-api.ts`; base APIs are maintained in host `sdk/index.d.ts`. Run `node scripts/sync-plugin-sdk.mjs` in the host instead of hand-editing generated declarations. Backend, documents, windows, system, browsers, media, AI, tools/MCP, and service adapters need a matching new host build.

`nexlet.i18n.getLocale()` and `onChange()` expose application language (`zh-CN`, `zh-Hant`, `en`) without another permission. `system.info().locale` remains the OS language. Feature-detect `i18n` for older hosts and unsubscribe when no longer needed.

Marketplace discovery reads `plugins/*/plugin.json`. Published plugins require `author`, `category`, `platforms` and optional `minHostVersion`. Templates are excluded.

## Result handoff and drafts (v0.2.41)

`nexlet.results.publish(result)` accepts `{ type: 'text', text, html? }`, `{ type: 'image', data }` (a data URL), or `{ type: 'files', resources }` (file tokens held by this plugin), and returns `Promise<true>`. The host opens the launcher for the user to choose the next tool without writing the clipboard. Files are revalidated and granted to the destination; arbitrary paths are not accepted. A text `PluginContext` may include untrusted `html`, which must be sanitized before rendering. Existing `search.returnToLauncher(text)` remains supported.

`nexlet.session.read()` / `save(state)` access JSON drafts isolated by plugin, feature, and window; `readImage()` / `saveImage(Uint8Array)` provide one image slot. JSON is limited to 4 MB, each image to 20 MiB, and the total image cache to 64 MiB. Drafts last for the current run by default. User opt-in permits main-window restart restoration; detached windows are not persisted. Drafts are excluded from configuration export and must not contain API keys. Use `secrets` for credentials.

Restore on `onEnter` only when no explicit new input is present. Return the saving Promise from `onOut`; state and image saves are permitted while closing, but new tasks are not. Restoration must not automatically restart network or compute work. Guard asynchronous results with a generation check. Feature-detect `nexlet.session` and `nexlet.results` for older hosts; plugins using these APIs should declare `minHostVersion: "0.2.41"`.

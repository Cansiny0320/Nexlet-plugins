[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# Nexlet Plugins

Public catalog and source repository for [Nexlet](https://github.com/Cansiny0320/Nexlet). The desktop app reads `index.json` here and downloads packages from GitHub Releases.

## Install

Open Plugins → Marketplace in Nexlet and install a plugin. Current hosts install immediately after clicking; declared capabilities remain visible in details. You can also download `.nexlet` assets and use Installed → Import plugin package.

| Plugin | Purpose | Permissions |
| --- | --- | --- |
| Notes | Autosave local text and copy it | Clipboard write |
| Translate | Keyless Google and configurable LLM translation | Clipboard write, network, encrypted secrets |
| Word count | Chinese/English words, characters, number groups, lines, paragraphs | None |
| Ctool (local build) | All 50 tools / 74 pages, including online tools | Backend, files, clipboard, external links, secrets |

Ctool is not published to the marketplace. With Node.js 24+, run `npm run package:ctool`, then import `dist/ctool.nexlet` into a host containing the extended SDK. See [Ctool](plugins/ctool/README.en.md) for capabilities, online services, requirements, and validation.

Word count accepts typed/pasted or launcher-provided text. Words count Chinese characters + English words + number groups; punctuation and emoji count only as characters. Combined emoji count as one visible character. Blank lines separate paragraphs; soft wrapping adds no lines. Processing is local and text is not saved.

Clipboard, Scratchpad, JSON, timestamp, encoding, UUID, website shortcuts, and file search ship with Nexlet. Windows Nexlet 0.2.0 includes portable Everything without separate installation; initial indexing can take time.

## Languages

Notes, Word count, and Translate follow the host's Simplified Chinese, Traditional Chinese, or English setting without clearing input. Older hosts without `nexlet.i18n` use browser language. Ctool uses upstream English/Simplified Chinese; Traditional Chinese falls back to Simplified Chinese. These changes describe the current source and require publishing new plugin packages before marketplace users receive them.

Shared browser code is in `shared/browser-i18n.js`, messages in `shared/plugin-locales.json`. Run `node scripts/sync-i18n.mjs` after editing either; checked-in local copies let raw development directories work offline. Manifest and catalog `locales` translate labels without changing IDs or feature codes. Application language comes from `nexlet.i18n`, while `system.info().locale` remains OS information.

## Develop and contribute

1. Start with `plugins/hello-nexlet/`, the [TS template](templates/typescript/README.en.md), and [Plugin SDK](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.en.md).
2. Run `npm ci`, then `npm run build`. Load `.build/plugins/<name>` as a development directory.
3. Put source in `plugins/<name>/` and add an `index.json` entry matching the manifest ID/version.
4. Run `npm run package` and submit a pull request.

Node.js 24+ is required. `npm test` checks logic/build behavior; `npm run package` writes `dist/*.nexlet`. Import `dist/word-count.nexlet` to try it. Catalog downloads work only after the corresponding release is published. Word count uses content/lifecycle APIs and requires Nexlet 0.2.6+.

For real host validation, install/build adjacent `../Nexlet`, then run `npm run test:e2e` here (`NEXLET_HOST_DIR` overrides the path). Tests import actual packages with temporary user data and check input, reactivation, clear, detach, and large text. The screenshot is `dist/word-count-preview.png`; everyday Nexlet data is untouched.

`schemaVersion: 1` entries include ID, name, description, author, category, SemVer, platforms, minimum host version, and download URL. Optional `icon` is a PNG Data URL. Downloads are restricted to this repository's GitHub Releases; hashes are not required.

### TypeScript

TS compiles to browser JS; the host does not execute `.ts`. esbuild bundles; `tsc --noEmit` checks types separately. Local `@nexlet/plugin-api` from `sdk/` supplies globals and manifest types without importing host source. It is not published on npm.

```sh
npm ci
npm run package:example
# 导入 dist/typescript-example.nexlet，或加载 .build/templates/typescript
npm run dev -- templates/typescript
```

Copy `templates/typescript` into `plugins/<name>` and edit the manifest. `src/main.ts` becomes `main.js`; HTML/CSS/icons are copied into `.build/`. Watch handles TS and static files; close/reopen to refresh, reimport after manifest/permission changes. `npm run typecheck` runs separately and before normal build/package. Packages exclude TS source and development dependencies; existing JS plugins keep their structure.

After building the adjacent host, `npm run package:example && npm run test:ts:e2e` validates installation, input, save/reopen, clipboard bridge, reactivation, and permission rejection with temporary data and without changing the system clipboard.

## Release

Update source, versions, and catalog URLs; commit to `main`, then push a `v*` tag matching updated entries. Unchanged plugins retain their existing release URLs. A release tag must match at least one entry. CI validates/packages and uploads `.nexlet` files to a public GitHub Release. Ordinary pushes and PRs only verify and produce artifacts.

Plugin frontends run in isolated sandboxes without direct Node/network access. Declared networking uses the host bridge without per-address prompts. Data is local and retained through updates and, by default, uninstall.

## License

This repository is [MIT licensed](LICENSE). Submitted plugins should include their own license and third-party notices.

## Translate

Requires Nexlet 0.2.7+. Run `python3 scripts/package.py` and import `dist/translate.nexlet`, or load `plugins/translate`. Search Translate or supply launcher text, then choose language and engine. Google translates after 400 ms idle, including paste, launcher input, and language changes; IME composition does not send. LLM requires clicking Translate. Both support Cmd/Ctrl+Enter, cancel, and copy. Maximum input is 5,000 Unicode characters.

Google uses a keyless web endpoint. Current hosts need no extra network confirmation. It has no official stability guarantee and may rate-limit or fail; it never silently switches to LLM. Configure LLM Base URL, API key, and model in Translation settings. OpenAI-compatible non-streaming Chat Completions accepts a base such as `https://your-service/v1` or a full `/chat/completions` URL. Local HTTP services can omit keys. Save, then select LLM. Keys are encrypted when available, otherwise session-only.

Only service configuration and language preferences persist; source/translation history does not. Requests send text to the selected service; Google puts it in URL parameters. Provider retention policies apply.

Protocol tests: `node --test tests/translation.test.mjs`. In the adjacent host, build then run `npm exec -- playwright test tests/translation.spec.ts` for installation, permissions, cancel, and local LLM fixtures. `NEXLET_TRANSLATION_LIVE=1` enables the real Google test; `NEXLET_PLUGINS_DIR` overrides the plugin path. Host-only CI skips cross-repository tests when plugin source is absent. Translate 1.1.0 belongs to Release v1.3.0. Prompt behavior depends on host version; older hosts may still ask.

## Extended SDK and Node.js backends

`npm run package:backend` builds `templates/backend` into `dist/backend-example.nexlet`. The frontend remains sandboxed; backend TS becomes an independent Node.js entry requiring the `backend` permission. Contracts are synchronized between host `src/shared/plugin-api.ts` and `sdk/index.d.ts`; run `node scripts/sync-plugin-sdk.mjs` in the host. Extensions need a matching host build and are not officially released. See [backend template](templates/backend/README.en.md). New capabilities use Nexlet APIs, not unchanged uTools plugins.

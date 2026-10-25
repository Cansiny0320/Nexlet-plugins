[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# Nexlet Plugins

Public catalog and source repository for [Nexlet](https://github.com/Cansiny0320/Nexlet). The desktop app reads `index.json` here and downloads packages from GitHub Releases.

## Install

In Nexlet 0.2.47, downloads appear in a task list with progress, cancellation and retry. Select Install after validation. First installs show declared permissions; updates adding permissions or changing an existing local provider to cloud require confirmation. Installation records change only after success. Failure preserves the previous version and data; development directories are not overwritten and downgrades are not automatic. Cached catalogs remain readable offline.

| Plugin | Purpose | Permissions |
| --- | --- | --- |
| Notes | Autosave local text and copy it | Clipboard write |
| Translate | Keyless Google and configurable LLM translation | Clipboard write, network, encrypted secrets |
| Word count | Chinese/English words, characters, number groups, lines, paragraphs | None |
| Ctool | All 50 tools / 74 pages, including online tools | Backend, files, clipboard, external links, secrets |

Ctool is available in the marketplace after automatic publication and requires Nexlet 0.2.21+. With Node.js 24+, you can also run `npm run package:ctool` and import `dist/ctool.nexlet`. See [Ctool](plugins/ctool/README.en.md) for capabilities, online services, requirements, and validation.

Word count accepts typed/pasted or launcher-provided text. Words count Chinese characters + English words + number groups; punctuation and emoji count only as characters. Combined emoji count as one visible character. Blank lines separate paragraphs; soft wrapping adds no lines. Processing is local and text is not saved.

Clipboard, Scratchpad, JSON, timestamp, encoding, UUID, website shortcuts, and file search ship with Nexlet. Windows Nexlet 0.2.0 includes portable Everything without separate installation; initial indexing can take time.

## Languages

Notes, Word count, and Translate follow the host's Simplified Chinese, Traditional Chinese, or English setting without clearing input. Older hosts without `nexlet.i18n` use browser language. Ctool uses upstream English/Simplified Chinese; Traditional Chinese falls back to Simplified Chinese. These changes describe the current source and require publishing new plugin packages before marketplace users receive them.

Shared browser code is in `shared/browser-i18n.js`, messages in `shared/plugin-locales.json`. Run `node scripts/sync-i18n.mjs` after editing either; checked-in local copies let raw development directories work offline. Manifest and catalog `locales` translate labels without changing IDs or feature codes. Application language comes from `nexlet.i18n`, while `system.info().locale` remains OS information.

## Develop and contribute

1. Start with `plugins/hello-nexlet/`, the [TS template](templates/typescript/README.en.md), and [Plugin SDK](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.en.md).
2. Run `npm ci`, `npm ci --prefix integrations/ocr --ignore-scripts`, then `npm run build`. Load `.build/plugins/<name>` as a development directory.
3. Put source in `plugins/<name>/`. Its `plugin.json` supplies ID, name, description, version, author, category, platforms, optional minHostVersion and localized labels. CI discovers the directory automatically; there is no central catalog to maintain. Do not edit `index.json` or `published.json` manually.
4. Run `npm run package` and submit a pull request.

Node.js 24+ is required. `npm test` checks logic/build behavior; `npm run package` writes `dist/*.nexlet`. Import `dist/word-count.nexlet` to try it. Catalog downloads work only after the corresponding release is published. Word count uses content/lifecycle APIs and requires Nexlet 0.2.6+.

For real host validation, install/build adjacent `../Nexlet`, then run `npm run test:e2e` here (`NEXLET_HOST_DIR` overrides the path). Tests import actual packages with temporary user data and check input, reactivation, clear, detach, and large text. The screenshot is `dist/word-count-preview.png`; everyday Nexlet data is untouched.

`schemaVersion: 1` entries include ID, name, description, author, category, SemVer, platforms, minimum host version, and download URL. Optional `icon` is a PNG Data URL. Downloads are restricted to this repository's GitHub Releases; hashes are not required.

### TypeScript

TS compiles to browser JS; the host does not execute `.ts`. esbuild bundles; `tsc --noEmit` checks types separately. Local `@nexlet/plugin-api` from `sdk/` supplies globals and manifest types without importing host source. It is not published on npm.

```sh
npm ci
npm ci --prefix integrations/ocr --ignore-scripts
npm run package:example
# 导入 dist/typescript-example.nexlet，或加载 .build/templates/typescript
npm run dev -- templates/typescript
```

Copy `templates/typescript` into `plugins/<name>` and edit the manifest. `src/main.ts` becomes `main.js`; HTML/CSS/icons are copied into `.build/`. Watch handles TS and static files; close/reopen to refresh, reimport after manifest/permission changes. `npm run typecheck` runs separately and before normal build/package. Packages exclude TS source and development dependencies; existing JS plugins keep their structure.

After building the adjacent host, `npm run package:example && npm run test:ts:e2e` validates installation, input, save/reopen, clipboard bridge, reactivation, and permission rejection with temporary data and without changing the system clipboard.

## Release

Plugins publish automatically when merged into `main`; no host release or manual tag is required. PRs only validate and produce artifacts. A manual workflow run on `main` retries publication.

Increment the stable version in `plugin.json` whenever plugin source changes. Same-version source changes and downgrades are rejected. Shared SDK, dependency, or build changes that affect a plugin also require a version increase. `plugins/*/plugin.json` is the single source of plugin and market metadata; templates are excluded. `index.json` is the published catalog read by users, and `published.json` records source baselines.

CI tests and packages first, creates immutable `<plugin-id>-v<version>` releases for new versions, checks SHA-256 and anonymous downloads, then commits the catalog and publication state together. Existing assets are never overwritten. Retries reuse matching verified assets; stale runs cannot update the catalog. Failed publication retains the previous catalog.

Run `npm run package`, or `npm run publish:preview` after building, to inspect proposed releases. Preview writes only `dist/index.json` and does not contact GitHub. A catalog rollback must restore source manifests, index, and publication state consistently without deleting old releases; normal fixes should use a higher version.

Plugin frontends run in isolated sandboxes without direct Node/network access. Declared networking uses the host bridge without per-address prompts. Data is local and retained through updates and, by default, uninstall.

## License

This repository is [MIT licensed](LICENSE). Submitted plugins should include their own license and third-party notices.

## Translate

Requires Nexlet 0.2.7+. Run `python3 scripts/package.py` and import `dist/translate.nexlet`, or load `plugins/translate`. Search Translate or supply launcher text, then choose language and engine. Google translates after 400 ms idle, including paste, launcher input, and language changes; IME composition does not send. LLM requires clicking Translate. Both support Cmd/Ctrl+Enter, cancel, and copy. Maximum input is 5,000 Unicode characters.

Google uses a keyless web endpoint. Current hosts need no extra network confirmation. It has no official stability guarantee and may rate-limit or fail; it never silently switches to LLM. Configure LLM Base URL, API key, and model in Translation settings. OpenAI-compatible non-streaming Chat Completions accepts a base such as `https://your-service/v1` or a full `/chat/completions` URL. Local HTTP services can omit keys. Save, then select LLM. Keys are encrypted when available, otherwise session-only.

Only service configuration and language preferences persist; source/translation history does not. Requests send text to the selected service; Google puts it in URL parameters. Provider retention policies apply.

Protocol tests: `node --test tests/translation.test.mjs`. In the adjacent host, build then run `npm exec -- playwright test tests/translation.spec.ts` for installation, permissions, cancel, and local LLM fixtures. `NEXLET_TRANSLATION_LIVE=1` enables the real Google test; `NEXLET_PLUGINS_DIR` overrides the plugin path. Host-only CI skips cross-repository tests when plugin source is absent. Translate 1.1.0 belongs to Release v1.3.0. Prompt behavior depends on host version; older hosts may still ask.

## Extended SDK and Node.js backends

`npm run package:backend` builds `templates/backend` into `dist/backend-example.nexlet`. The frontend remains sandboxed; backend TS becomes an independent Node.js entry requiring the `backend` permission. Contracts are synchronized between host `src/shared/plugin-api.ts` and `sdk/index.d.ts`; run `node scripts/sync-plugin-sdk.mjs` in the host. The marketplace compatibility requirement for Ctool starts at Nexlet 0.2.21. See [backend template](templates/backend/README.en.md). New capabilities use Nexlet APIs, not unchanged uTools plugins.

## Offline OCR

OCR requires Nexlet 0.2.30+. Source and models live in `plugins/ocr`; locked build dependencies live in `integrations/ocr`. Run `npm run build:ocr`, then `python3 scripts/package.py --plugin-dir .build/plugins/ocr --output dist/ocr.nexlet`. A main push automatically discovers and publishes it like other plugins. Package limits are 32 MiB per file, 128 MiB extracted and 64 MiB compressed. Invalid metadata, duplicate IDs or missing builds stop publication and retain the previous index.

## New local plugins and shared services

These sources and local packages require Nexlet 0.2.47 and have not been published to the online catalog in this change.

| Plugin | Features | Package |
| --- | --- | --- |
| [PDF tools](plugins/pdf-tools/README.en.md) | Merge, split, extract, reorder, rotate, image conversion | dist/pdf-tools.nexlet |
| [Image batch](plugins/image-batch/README.en.md) | Compress, convert, resize, watermark, collage | dist/image-batch.nexlet |
| [Batch rename](plugins/batch-rename/README.en.md) | Preview, replace, number, conflict checks, journal, undo | dist/batch-rename.nexlet |

All three support Simplified Chinese, Traditional Chinese and English. Batch output uses new directories. Rename revalidates files before execution; undo refuses externally modified files. Each README documents limits and verification.

AI Actions 1.1.0 and Translation 1.4.0 can select host shared models while preserving private configuration. OCR 1.2.0 registers a local provider; Translation registers Google and shared AI providers for screenshot tools and authorized plugins. Select defaults explicitly in host settings; failures never switch local processing to cloud automatically.

Build selected sources with node scripts/build.mjs plugins/pdf-tools plugins/image-batch plugins/batch-rename plugins/ai-actions plugins/translate plugins/ocr, then package each with python scripts/package.py --plugin-dir .build/plugins/pdf-tools --output dist/pdf-tools.nexlet (substitute the plugin name). These commands do not change the published catalog. Nexlet 0.2.47 downloads and validates before installation; initial installs, new permissions and local-to-cloud updates require permission confirmation.

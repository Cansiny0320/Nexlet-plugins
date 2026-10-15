[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# TypeScript backend template

At the repository root, run `npm ci` and `npm run package:backend`. Import `dist/backend-example.nexlet` or load `.build/templates/backend`. It requires a host build with the extended SDK; no compatible official release is declared yet.

`src/main.ts` runs in the browser sandbox. `src/backend.ts` compiles to manifest entry `backend.cjs`, running in a separate Node.js utility process with full local Node privileges. Install backend plugins only from trusted sources.

Calculate and save calls backend SHA-256, storing the result in the plugin document database. Reopening reads it back. The template's `tools` / `mcp` permissions enable further extension; no listening port starts by default.

Backend `handlers` take `unknown` arguments that require validation. Context provides `signal`, `emit(value)`, and isolated `dataDirectory`. Canceling a backend task terminates the plugin backend and fails other simultaneous calls; the next call restarts it. Closing the frontend cancels its RPC; saved schedules may still start the backend. Disable, uninstall, upgrade, or host exit stops it.

esbuild bundles JavaScript dependencies and leaves Node built-ins external. Native addons and arbitrary `node_modules` are not packaged automatically; do not rely on implicit development-machine paths. Use `nexlet.media` for media processing. Language belongs to the frontend `nexlet.i18n` API; pass any required language explicitly to backend methods.

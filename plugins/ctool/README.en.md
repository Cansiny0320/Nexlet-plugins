[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# Ctool developer toolbox

Integrates all 50 tools and 74 pages from [baiy/Ctool](https://github.com/baiy/Ctool) 2.4.0 into Nexlet. It retains upstream UI, algorithms, categories, internal search, history, and settings: JSON / JSON Schema / JSONPath / type generation, hashing and cryptography, codecs, formatting, online code execution, IP lookup, WebSocket, ARM / HEX, QR/barcodes, text, time, units, and more.

## Build and use

Requires Node.js 24+, npm, Python 3, and tar. From the repository root:

```sh
npm ci
npm run package:ctool
npm run test:ctool
```

The first build uses pinned pnpm 9.15.9 through npm and the upstream lockfile; npm registry and GitHub codeload access are required. Dependencies are cached afterward. `vendor/ctool/source.tar.gz` is SHA-256 checked before building. Adapter source lives in `integrations/ctool`; `.build/ctool-source` is disposable generated output, not a place for lasting edits.

Import `dist/ctool.nexlet` through Nexlet Plugins, or load `.build/plugins/ctool`. `plugins/ctool` contains manifest/documentation and cannot run directly.

**Host requirements:** a build with extended SDK, including backend, database, files, image clipboard, file dialogs, saving database/secrets during `onOut`, and backend shutdown. Validation uses adjacent Nexlet source; released hosts with only the old basic API are not compatible. No marketplace download URL or Release has been published.

Search `ctool` for all tools or use 29 common shortcuts. The host allows 30 features per plugin; all remaining tools/subpages remain available inside Ctool. JSON matches text automatically; other entries also accept explicitly supplied text. Nexlet command management replaces uTools-specific keyword settings.

## Languages

Ctool follows the Nexlet application language using upstream English and Simplified Chinese. Traditional Chinese intentionally falls back to Simplified Chinese; this is not a complete Traditional Chinese translation. Host manifest labels have all three languages. The adapter updates language without reloading the page, preserving inputs. Upstream's independent language selector is replaced with a host-language label; set the language in Nexlet Settings. The upstream source archive remains unchanged.

## Network and local capabilities

- HTTP, binary downloads, and WebSocket run in a separate Node backend; the frontend remains sandboxed. HTTP/HTTPS, WS/WSS, and WebSocket subprotocols are supported. HTTP defaults to 30 seconds, maximum 120 seconds. Bodies/responses or individual messages are capped at 8 MiB. Leaving WebSocket or exiting cleans connections.
- IP lookup uses GeoJS, ARM/HEX uses armconverter.com, and code execution uses JDoodle. Users configure JDoodle Client ID / Secret; accounts, quotas, and availability remain provider responsibilities. Errors are displayed, not converted into simulated success.
- JDoodle credentials use Nexlet secrets; unavailable system encryption produces a session-only warning. History/settings use isolated documents (1 MiB each, 50 MiB total); save failures show a dismissible error.
- Text/images copy through the bridge. Downloads use save dialogs and only selected paths. File input keeps upstream selection/paste behavior. The declared backend has local Node privileges, not network-only access.
- Upstream MIT attribution, pinned commit, and dependency licenses are retained. Unrelated notification polling and analytics images are removed; updates ship with Nexlet plugin packages.

## Validation

```sh
# 相邻宿主先执行 npm run build
npm run test:ctool:e2e
```

E2E imports the real package with temporary data, visits all 74 pages, and checks offline calculations, Workers, Monaco, network bridges, files/images, persistence, and sessions. Clipboard mocks and local HTTP/WebSocket fixtures avoid everyday data changes. Passing JDoodle fixtures does not prove account setup or live code execution. Results go to `dist/ctool-validation.json`.

Upstream commit: `4f9255f7caa1049786c98a28fbd7bdcc1aef17dd`. See packaged `LICENSE` and `THIRD_PARTY_NOTICES.txt`.

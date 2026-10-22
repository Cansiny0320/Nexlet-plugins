[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# @nexlet/plugin-api

Nexlet Plugin API v1 的型別宣告，覆蓋當前宿主的全部公開外掛方法，不包含尚未實現的能力。只有型別，不注入或模擬執行時物件；執行時由 Nexlet 提供 `window.nexlet`。

本倉庫執行 `npm ci` 後即可使用。獨立工程可執行 `npm install --save-dev /绝对路径/Nexlet-plugins/sdk`，然後在 `tsconfig.json` 中新增 `"types": ["@nexlet/plugin-api"]`。該包目前僅本地使用，尚未釋出到 npm。

```ts
import type { PluginContext } from '@nexlet/plugin-api';

nexlet.onEnter((context: PluginContext) => {
  if (context.type === 'text') console.log(context.payload);
});
```

請求方法返回 Promise，事件訂閱返回取消訂閱函式。`PluginContext` 是可區分聯合型別，根據 `type` 可得到正確的 `payload` 型別。儲存泛型只提供靜態提示，讀取使用者資料仍需按業務驗證。

不要在同一個 TS 編譯上下文中混入宿主內部的 `src/shared/types.ts`：其中的 `HostApi` 面向主程式頁面，不是外掛介面。不要給瀏覽器外掛配置 Node.js 全域性型別；當前外掛不能使用 `require`、`process` 或自定義 preload。

完整許可權、限額、生命週期行為見 [宿主 SDK 文件](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.zh-Hant.md)。這份宣告描述 Nexlet 的實際行為，不代表 uTools API 相容或能力已全部覆蓋。

擴充套件 API 型別在 `extensions.d.ts`，由宿主 `src/shared/plugin-api.ts` 生成；基本 API 在宿主 `sdk/index.d.ts` 維護。請在宿主倉執行 `node scripts/sync-plugin-sdk.mjs` 同步，不手工修改生成檔案。新增 backend、資料庫、視窗、系統、瀏覽器、媒體、AI、工具/MCP 和 provider 服務適配，執行需要對應的新宿主構建。

`nexlet.i18n.getLocale()` / `onChange()` 無需額外許可權，返回或訂閱 `zh-CN`、`zh-Hant`、`en` 應用語言。`system.info().locale` 保持系統語言含義；相容舊宿主時先檢測 `i18n`，不再使用訂閱時呼叫取消函式。

市場自動發現讀取 `plugins/*/plugin.json`；正式外掛需填寫 `author`、`category`、`platforms` 及可選 `minHostVersion`。`templates/` 不發布。

## 結果交接與工具草稿（v0.2.41）

`nexlet.results.publish(result)` 接受 `{ type: 'text', text, html? }`、`{ type: 'image', data }`（data URL）或 `{ type: 'files', resources }`（目前外掛持有的檔案 token），回傳 `Promise<true>`。宿主返回啟動器，由使用者選下一個工具，不寫入系統剪貼簿。檔案會重新驗證並授予目的端權限，不接受任意路徑。文字 `PluginContext` 可含不可信的 `html`，顯示前必須清理。舊 `search.returnToLauncher(text)` 仍可使用。

`nexlet.session.read()` / `save(state)` 讀寫依外掛、feature 及視窗隔離的 JSON 草稿；`readImage()` / `saveImage(Uint8Array)` 提供一個圖片槽。JSON 上限 4 MB、單張圖片 20 MiB、圖片快取總量 64 MiB。預設只保留本次執行期間；使用者在宿主設定啟用後，主視窗可跨重啟恢復，獨立視窗不持久化。草稿不進入設定匯出，不可儲存 API Key；金鑰應使用 `secrets`。

`onEnter` 沒有明確新輸入時才恢復；在 `onOut` 回傳儲存的 Promise。關閉期間允許儲存狀態與圖片，但不接受新任務。恢復時不可自動重啟網路或計算工作，非同步結果應檢查請求代次。相容舊宿主須檢測 `nexlet.session` 與 `nexlet.results`；使用本節介面的外掛應宣告 `minHostVersion: "0.2.41"`。

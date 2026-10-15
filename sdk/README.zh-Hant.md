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

[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# TypeScript backend 模板

在外掛倉庫根目錄執行 `npm ci`、`npm run package:backend`，將 `dist/backend-example.nexlet` 匯入 Nexlet，或載入 `.build/templates/backend` 開發目錄。執行需要包含擴充套件 SDK 的宿主構建；尚未宣告可用的正式釋出版本。

`src/main.ts` 執行於瀏覽器沙箱。`src/backend.ts` 編譯為 manifest 指定的 `backend.cjs`，在宿主建立的獨立 Node.js utility process 中執行，具有完整本機 Node 許可權。只安裝可信來源的 backend 外掛。

點選“計算並儲存”呼叫後臺 SHA-256 計算，並將結果存入外掛文件資料庫；退出後重新開啟可讀取上次結果。模板的 `tools` / `mcp` 許可權用於繼續擴充套件工具服務，預設不會啟動監聽埠。

後臺匯出 `handlers`，引數為 `unknown`，需自行校驗。第二個引數提供 `signal`、`emit(value)` 和外掛獨立 `dataDirectory`。取消後臺任務會終止該外掛後臺程序，其他同時執行的呼叫也會失敗；後續呼叫自動啟動新程序。關閉前端時取消其 RPC，已儲存的排程仍可喚起後臺。停用、解除安裝、升級、退出宿主會停止後臺。

第三方 JavaScript 依賴會由 esbuild 合併進後臺產物；Node 內建模組保持原樣。原生 addon 和任意外部 `node_modules` 不會自動打包，不能依賴開發機器上的隱式搜尋路徑。媒體處理可直接使用 `nexlet.media`。

應用語言透過前端 `nexlet.i18n` 讀取；後臺業務需要語言時，由前端顯式作為引數傳入。

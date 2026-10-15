[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# Nexlet Plugins

[Nexlet](https://github.com/Cansiny0320/Nexlet) 的公開外掛目錄與原始碼倉庫。桌面應用從本倉庫讀取 `index.json`，從 GitHub Releases 下載外掛包。

## 安裝

在 Nexlet 中開啟「外掛管理 → 外掛市場」，選擇外掛並安裝。當前宿主點選安裝後直接執行，外掛宣告的能力可在詳情中檢視。也可以下載 Releases 中的 `.nexlet` 檔案，透過「已安裝 → 匯入外掛包」安裝。

| 外掛 | 用途 | 許可權 |
| --- | --- | --- |
| 便箋 | 在本機自動儲存一段文字，一鍵複製 | 寫入剪貼簿 |
| 翻譯 | Google 免 Key 與可配置的 LLM 翻譯 | 寫入剪貼簿、網路請求、獨立加密金鑰 |
| 字數統計 | 實時統計中英文字數、字元數、數字組、行數與段落數 | 無 |
| Ctool | 完整 50 個工具、74 個功能頁面，含聯網工具 | 後臺、檔案、剪貼簿、外部連結、加密憑據 |

Ctool 在自動釋出成功後出現在外掛市場，需要 Nexlet 0.2.21+。也可使用 Node.js 24+ 執行 `npm run package:ctool`，匯入 `dist/ctool.nexlet`。功能範圍、聯網服務、宿主要求和驗證說明見 [Ctool README](plugins/ctool/README.zh-Hant.md)。

字數統計支援直接輸入、貼上，以及啟動器傳入的文字。字數按「漢字 + 英文單詞 + 數字組」計算，標點和 emoji 只計入字元數；組合 emoji 按一個可見字元統計。空行分隔段落，自動折行不增加行數。文字僅在本機計算，不儲存。

剪貼簿、計算草稿、JSON 工具、時間戳、編碼轉換、UUID、網頁快開和 Everything 檔案搜尋隨 Nexlet 預裝，不需要從市場下載。Nexlet 0.2.0 的 Windows 版同時提供 Everything 便攜引擎，無需另行安裝；首次建立檔案索引可能需要一段時間。

## 開發與提交

1. 參考 `plugins/hello-nexlet/`、[TypeScript 模板](templates/typescript/README.zh-Hant.md) 和 [外掛 SDK](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.zh-Hant.md) 建立外掛。
2. 執行 `npm ci`、`npm run build`，在 Nexlet 中使用「載入開發目錄」選擇 `.build/plugins/<name>` 除錯。
3. 將原始碼放入 `plugins/<name>/`，在 `catalog.json` 新增目錄、作者、分類、平臺和最低宿主版本。ID、名稱、描述和版本從 `plugin.json` 讀取；不要手動編輯 `index.json` 或 `published.json`。
4. 執行 `npm run package`，提交 Pull Request。

本地驗證：使用 Node.js 24+ 執行 `npm test` 檢查外掛邏輯及構建流程，執行 `npm run package` 生成 `dist/*.nexlet`。將 `dist/word-count.nexlet` 透過「匯入外掛包」安裝即可體驗；市場條目需要對應 Release 釋出後才能下載。字數統計使用文字輸入與會話 API，最低支援 Nexlet 0.2.6。

真實宿主驗證：先在相鄰的 `../Nexlet` 安裝依賴並執行 `npm run build`，再在本倉庫執行 `npm run test:e2e`（可用 `NEXLET_HOST_DIR` 指定宿主目錄）。測試使用臨時使用者資料目錄匯入實際外掛包，驗證輸入、再次啟用、清空、分離視窗和大文字，截圖儲存到 `dist/word-count-preview.png`，不改動日常使用的 Nexlet 資料。

索引使用 `schemaVersion: 1`，條目包含 ID、名稱、描述、作者、分類、SemVer 版本、支援平臺、最低主程式版本和下載地址。可選 `icon` 是 PNG Data URL。下載地址限定本倉庫的 GitHub Releases，外掛包不要求 Hash 欄位。

### TypeScript

支援 TS 編寫外掛，打包時編譯成瀏覽器可執行的 JS；宿主不直接執行 `.ts`。共享構建使用 esbuild，`tsc --noEmit` 獨立檢查型別。`@nexlet/plugin-api` 是本倉庫 `sdk/` 提供的本地型別包，安裝依賴後可為 `nexlet`、`window.nexlet` 和 manifest 提供型別提示，不依賴宿主原始碼，也未釋出到 npm。

```sh
npm ci
npm run package:example
# 导入 dist/typescript-example.nexlet，或加载 .build/templates/typescript
npm run dev -- templates/typescript
```

把 `templates/typescript` 複製到 `plugins/<name>` 並修改 manifest 即可開始開發。約定入口是 `src/main.ts`，構建輸出 `main.js`，HTML/CSS/圖示等靜態檔案一起輸出到 `.build/`。watch 同時處理 TS 和靜態資源變化，退出外掛後重新開啟生效；manifest/許可權改變需要重新匯入。`npm run typecheck` 檢查型別，正式構建及打包會先執行該檢查。產物不含 TS 原始碼或開發依賴，已有 JS 外掛保持原有結構。

真實宿主驗證：在相鄰宿主倉庫完成 `npm run build` 後執行 `npm run package:example && npm run test:ts:e2e`。測試使用臨時使用者資料，驗證打包安裝、輸入、儲存後重新開啟、複製橋接、再次啟用和許可權拒絕；不會修改日常 Nexlet 資料或系統剪貼簿。

## 發版

外掛合入 `main` 後自動上架，不需要 Nexlet 主程式發版，也不需要手動打標籤或建立 Release。PR 只驗證和生成 artifact；在 `main` 手動執行工作流可重試釋出。

更新外掛原始碼時遞增 `plugin.json` 的穩定版本號（例如 `1.0.0` → `1.0.1`）。同版本的原始碼變更或版本倒退會被拒絕；共享 SDK、依賴或構建工具改變了外掛執行行為時，也應遞增受影響外掛的版本。`catalog.json` 是待發布清單，`index.json` 是使用者實際讀取的已釋出目錄，`published.json` 儲存原始碼版本基線。文件修改不強制更新外掛版本。

CI 先測試和打包，再為新增/升級外掛建立 `<plugin-id>-v<version>` Release，校驗資產 SHA-256 和匿名下載成功後，一次性提交市場目錄與釋出狀態。已有外掛保持原下載地址，已公開資產不可覆蓋；重複執行復用校驗一致的資產。釋出序列執行，main 已變化時舊任務停止，普通快進推送進一步防止覆蓋新提交。中途失敗時保留原市場目錄。

本地先執行 `npm run package`，或在完成構建後執行 `npm run publish:preview` 檢視候選目錄與待發布版本。預覽只寫 `dist/index.json`，不會訪問或修改 GitHub。需要回退目錄時，從歷史提交同時恢復 `index.json` 和 `published.json`，並同步恢復對應原始碼及 catalog；不要刪除舊 Release。正常修復應使用更高版本，以便已安裝使用者收到更新。

所有外掛在受限的獨立視窗執行，不能直接訪問 Node.js 或網路；宣告聯網許可權的外掛安裝後可直接使用宿主 HTTP 橋接，不再逐地址彈窗確認。外掛獨立資料儲存在使用者本機，更新不會刪除資料，解除安裝預設保留資料。

## 許可證

本倉庫以 [MIT License](LICENSE) 開源。提交的外掛應包含自己的許可證和第三方許可宣告。

## 翻譯外掛

需要 Nexlet 0.2.7+。執行 `python3 scripts/package.py` 後匯入 `dist/translate.nexlet`，或載入 `plugins/translate` 開發目錄。在啟動器搜尋「翻譯」或帶入文字，選擇語言與引擎。Google 在停止輸入 400 毫秒後自動翻譯，支援貼上、帶入文字和切換語言，輸入法組詞期間不傳送；LLM 仍需點選開始翻譯。兩種引擎均支援 Cmd/Ctrl+Enter 立即翻譯、取消和複製譯文。每次最多 5000 個 Unicode 字元。

Google 使用免 Key 網頁介面，當前宿主首次聯網也無需額外確認。該介面無官方穩定性保證，可能限流或不可用，不會自動切換到 LLM。LLM 在「翻譯設定」填寫 Base URL、API Key、模型名，支援 OpenAI-compatible Chat Completions 非流式介面；Base URL 可填寫 `https://your-service/v1` 或完整 `/chat/completions` 地址，本機 HTTP 服務可不填 Key。儲存後再切換 LLM 翻譯。Key 加密儲存，系統加密不可用時僅當前外掛會話有效。

只儲存服務配置與語言偏好，不儲存原文/譯文歷史。翻譯請求會將原文發往所選服務；Google 的網頁介面以 URL 引數傳遞文字。對方服務的資料保留規則由服務方決定。

協議測試：`node --test tests/translation.test.mjs`。在相鄰宿主目錄執行 `npm run build` 後執行 `npm exec -- playwright test tests/translation.spec.ts`，以臨時資料目錄驗證安裝、許可權、取消及本地 LLM fixture；另用 `NEXLET_TRANSLATION_LIVE=1` 啟用 Google 實網用例。外掛倉庫不在相鄰位置時設定 `NEXLET_PLUGINS_DIR`；缺少外掛原始碼的宿主單倉 CI 明確跳過這些跨倉用例。翻譯外掛 1.1.0 安裝包對應 v1.3.0 Release。免確認行為由宿主決定，舊版宿主仍可能顯示確認彈窗。

## 擴充套件 SDK 與 Node.js 後臺

當前 checkout 提供 `templates/backend`，執行 `npm run package:backend` 生成 `dist/backend-example.nexlet`。前端保持瀏覽器沙箱；後臺 TypeScript 編譯為獨立 Node.js 程序入口，需要 manifest 的 `backend` 許可權。完整合同由宿主 `src/shared/plugin-api.ts` 和 `sdk/index.d.ts` 同步，宿主倉執行 `node scripts/sync-plugin-sdk.mjs` 更新本倉型別。Ctool 的市場相容範圍從 Nexlet 0.2.21 起。

後臺模板說明見 [templates/backend/README.md](templates/backend/README.zh-Hant.md)。新能力使用 Nexlet API，不以原樣執行 uTools 外掛為目標。

## 介面語言

便箋、字數統計與翻譯跟隨宿主的簡體中文、繁體中文、English，切換不清空輸入。舊宿主沒有 `nexlet.i18n` 時回退瀏覽器語言。Ctool 複用上游中英文，繁體回退簡體。當前原始碼鬚髮布新外掛包後才會進入市場。

共用執行時位於 `shared/browser-i18n.js`、詞條位於 `shared/plugin-locales.json`；修改後執行 `node scripts/sync-i18n.mjs`，將本地副本同步到三個外掛，保持原始開發目錄可離線載入。Manifest 與索引的 `locales` 只翻譯名稱、描述和分類，不改變 ID/code。應用語言用 `nexlet.i18n`，`system.info().locale` 仍為系統資訊。

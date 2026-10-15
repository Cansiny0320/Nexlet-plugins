[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# Ctool 開發工具箱

將 [baiy/Ctool](https://github.com/baiy/Ctool) 2.4.0 的全部 50 個工具、74 個功能頁面整合到 Nexlet。保留上游介面、工具演算法、分類、內部搜尋、歷史和設定。包括 JSON / JSON Schema / JSONPath / 型別生成、雜湊和加解密、編解碼、程式碼格式化、線上程式碼執行、IP 查詢、WebSocket、ARM / HEX、二維碼、條形碼、文字、時間、單位換算等。

## 構建和使用

需要 Node.js 24+、npm、Python 3 和 tar。在外掛倉庫根目錄執行：

```sh
npm ci
npm run package:ctool
npm run test:ctool
```

第一次構建透過 npm 執行固定的 pnpm 9.15.9，按上游鎖檔案安裝依賴；需要訪問 npm registry 和 GitHub codeload。後續依賴使用本地快取。原始碼快照在 `vendor/ctool/source.tar.gz`，構建先驗證 SHA-256；適配原始檔在 `integrations/ctool`，生成目錄 `.build/ctool-source` 可刪除重建，不能在那裡修改長期程式碼。

在 Nexlet「外掛管理 → 匯入外掛包」選擇 `dist/ctool.nexlet`，或載入開發目錄 `.build/plugins/ctool`。`plugins/ctool` 是 manifest 和文件目錄，不能直接作為開發目錄執行。

**宿主要求：** 需要包含擴充套件外掛 SDK 的 Nexlet 構建，具備 `backend`、`database`、`files`、圖片剪貼簿與檔案對話方塊 API，以及 `onOut` 期間的資料庫/憑據儲存和後臺停止支援。本次以相鄰 Nexlet 原始碼構建驗收；不能將只具有舊版基本外掛 API 的已釋出宿主視為相容。尚未新增市場下載地址或釋出 Release。

搜尋 `ctool` 開啟全部工具，另提供 29 個常用入口。宿主單個外掛最多 30 個入口，其餘工具和子功能均可從 Ctool 內部分類/搜尋進入。JSON 入口接受文字匹配，其餘入口也支援宿主顯式帶入文字。原 uTools 專屬關鍵詞設定由 Nexlet 的指令管理承擔。

## 聯網和本機能力

- HTTP、二進位制下載和 WebSocket 使用獨立 Node 後臺；外掛頁面保持沙箱，不直接聯網。支援 HTTP/HTTPS、WS/WSS 與 WebSocket 子協議，HTTP 預設 30 秒超時、最高 120 秒，正文/響應或單條訊息最高 8 MiB。退出或切換 WebSocket 頁面會清理連線。
- IP 查詢使用 GeoJS；ARM/HEX 使用 armconverter.com；程式碼執行使用 JDoodle。JDoodle 的 Client ID / Client Secret 由使用者配置，服務賬戶、額度和可用性仍由第三方決定。錯誤在介面中顯示，不會偽造成功結果。
- JDoodle 憑據透過 Nexlet `secrets` 儲存；系統加密不可用時提示僅當前會話有效。歷史與設定寫入外掛獨立資料庫（單條 1 MiB、總計 50 MiB），儲存失敗會顯示可關閉的錯誤提示。
- 文字和圖片複製使用剪貼簿橋接；下載使用儲存對話方塊，僅寫入使用者選擇的路徑；檔案輸入仍使用原檔案選擇/貼上互動。宣告的 `backend` 本身具有 Node 本機許可權，並非只能聯網的受限許可權。
- 保留上游 MIT 署名、固定 commit 和依賴許可證。移除宿主無關的上游通知輪詢、統計圖片請求；更新隨 Nexlet 外掛包交付。

## 驗證

```sh
# 相邻宿主先执行 npm run build
npm run test:ctool:e2e
```

E2E 使用臨時資料匯入實際安裝包，遍歷 74 個功能頁面，並驗證離線計算、Worker、Monaco、聯網橋接、檔案和圖片、持久化及會話行為。測試使用剪貼簿 mock 和本地 HTTP / WebSocket fixture，不改日常 Nexlet 資料。JDoodle fixture 透過不代表賬戶已配置或完成實網程式碼執行。驗收記錄寫入 `dist/ctool-validation.json`。

上游原始碼：`4f9255f7caa1049786c98a28fbd7bdcc1aef17dd`。許可證見包內 `LICENSE` 和 `THIRD_PARTY_NOTICES.txt`。

## 介面語言

跟隨 Nexlet 設定，複用上游 English 與簡體中文；繁體中文明確回退簡體，並非完整繁體翻譯。宿主入口名稱提供三語。適配層更新語言時不過載頁面，保留輸入；上游獨立語言選擇改為跟隨 Nexlet 的說明，請在宿主設定中更改。上游原始碼歸檔保持不變。

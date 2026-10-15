[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# TypeScript 外掛模板

從 **Nexlet-plugins 倉庫根目錄** 執行（Node.js 24+、Python 3）：

```sh
npm ci
npm run package:example
```

將 `dist/typescript-example.nexlet` 匯入 Nexlet，或者在「載入開發目錄」中選擇 `.build/templates/typescript`。需要支援文字輸入及生命週期 API 的 Nexlet 0.2.6+。

開發時執行：

```sh
npm run dev -- templates/typescript
```

修改 TS、HTML、CSS 或 manifest 會重新構建；在 Nexlet 中退出外掛再開啟可讀取最新產物。manifest 或許可權改變後需重新匯入。watch 模式僅編譯，提交前執行 `npm run typecheck`；正式 `build` 和 `package` 都會先檢查型別。

建立新外掛時，把本目錄複製到 `plugins/<name>`，修改 `plugin.json` 的 ID、名稱和功能。專案使用根目錄的依賴及 `tsconfig.json`，`src/main.ts` 編譯為 `main.js`，其餘執行資源原樣複製。HTML 用外部 `<script src="main.js">` 載入，不要引用 `.ts` 或內聯指令碼。新增第三方瀏覽器依賴後會隨 TS 入口打入 JS；Node.js 模組不受當前沙箱支援。

`npm run build` 會生成 `.build/plugins/<name>`。不加入市場也可以打包：

```sh
python3 scripts/package.py --plugin-dir .build/plugins/<name> --output dist/<name>.nexlet
```

加入 `index.json` 後，`npm run package` 會與現有外掛一起構建並打包。模板自身不會加入市場或自動釋出。

`window.nexlet` 和全域性 `nexlet` 均有型別提示；可用 `import type { PluginContext } from '@nexlet/plugin-api'` 引入命名型別。型別包只有宣告，不需要在外掛執行時載入 JS。

多語言介面可檢測 `nexlet.i18n` 並訂閱變化，只更新產品文案、不替換使用者輸入，詳見 [SDK](../../sdk/README.zh-Hant.md)。

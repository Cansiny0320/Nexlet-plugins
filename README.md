# Nexlet Plugins

[Nexlet](https://github.com/Cansiny0320/Nexlet) 的公开插件目录与源码仓库。桌面应用从本仓库读取 `index.json`，从 GitHub Releases 下载插件包。

## 安装

在 Nexlet 中打开「插件管理 → 插件市场」，选择插件并安装。当前宿主点击安装后直接执行，插件声明的能力可在详情中查看。也可以下载 Releases 中的 `.nexlet` 文件，通过「已安装 → 导入插件包」安装。

| 插件 | 用途 | 权限 |
| --- | --- | --- |
| 便笺 | 在本机自动保存一段文字，一键复制 | 写入剪贴板 |
| 翻译 | Google 免 Key 与可配置的 LLM 翻译 | 写入剪贴板、网络请求、独立加密密钥 |
| 字数统计 | 实时统计中英文字数、字符数、数字组、行数与段落数 | 无 |
| Ctool | 完整 50 个工具、74 个功能页面，含联网工具 | 后台、文件、剪贴板、外部链接、加密凭据 |

Ctool 在自动发布成功后出现在插件市场，需要 Nexlet 0.2.21+。也可使用 Node.js 24+ 执行 `npm run package:ctool`，导入 `dist/ctool.nexlet`。功能范围、联网服务、宿主要求和验证说明见 [Ctool README](plugins/ctool/README.md)。

字数统计支持直接输入、粘贴，以及启动器传入的文本。字数按「汉字 + 英文单词 + 数字组」计算，标点和 emoji 只计入字符数；组合 emoji 按一个可见字符统计。空行分隔段落，自动折行不增加行数。文本仅在本机计算，不保存。

剪贴板、计算稿纸、JSON 工具、时间戳、编码转换、UUID、网页快开和 Everything 文件搜索随 Nexlet 预装，不需要从市场下载。Nexlet 0.2.0 的 Windows 版同时提供 Everything 便携引擎，无需另行安装；首次建立文件索引可能需要一段时间。

## 开发与提交

1. 参考 `plugins/hello-nexlet/`、[TypeScript 模板](templates/typescript/README.md) 和 [插件 SDK](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.md) 创建插件。
2. 执行 `npm ci`、`npm run build`，在 Nexlet 中使用「加载开发目录」选择 `.build/plugins/<name>` 调试。
3. 将源码放入 `plugins/<name>/`，在 `catalog.json` 添加目录、作者、分类、平台和最低宿主版本。ID、名称、描述和版本从 `plugin.json` 读取；不要手动编辑 `index.json` 或 `published.json`。
4. 运行 `npm run package`，提交 Pull Request。

本地验证：使用 Node.js 24+ 运行 `npm test` 检查插件逻辑及构建流程，运行 `npm run package` 生成 `dist/*.nexlet`。将 `dist/word-count.nexlet` 通过「导入插件包」安装即可体验；市场条目需要对应 Release 发布后才能下载。字数统计使用文本输入与会话 API，最低支持 Nexlet 0.2.6。

真实宿主验证：先在相邻的 `../Nexlet` 安装依赖并执行 `npm run build`，再在本仓库运行 `npm run test:e2e`（可用 `NEXLET_HOST_DIR` 指定宿主目录）。测试使用临时用户数据目录导入实际插件包，验证输入、再次激活、清空、分离窗口和大文本，截图保存到 `dist/word-count-preview.png`，不改动日常使用的 Nexlet 数据。

索引使用 `schemaVersion: 1`，条目包含 ID、名称、描述、作者、分类、SemVer 版本、支持平台、最低主程序版本和下载地址。可选 `icon` 是 PNG Data URL。下载地址限定本仓库的 GitHub Releases，插件包不要求 Hash 字段。

### TypeScript

支持 TS 编写插件，打包时编译成浏览器可运行的 JS；宿主不直接执行 `.ts`。共享构建使用 esbuild，`tsc --noEmit` 独立检查类型。`@nexlet/plugin-api` 是本仓库 `sdk/` 提供的本地类型包，安装依赖后可为 `nexlet`、`window.nexlet` 和 manifest 提供类型提示，不依赖宿主源码，也未发布到 npm。

```sh
npm ci
npm run package:example
# 导入 dist/typescript-example.nexlet，或加载 .build/templates/typescript
npm run dev -- templates/typescript
```

把 `templates/typescript` 复制到 `plugins/<name>` 并修改 manifest 即可开始开发。约定入口是 `src/main.ts`，构建输出 `main.js`，HTML/CSS/图标等静态文件一起输出到 `.build/`。watch 同时处理 TS 和静态资源变化，退出插件后重新打开生效；manifest/权限改变需要重新导入。`npm run typecheck` 检查类型，正式构建及打包会先执行该检查。产物不含 TS 源码或开发依赖，已有 JS 插件保持原有结构。

真实宿主验证：在相邻宿主仓库完成 `npm run build` 后运行 `npm run package:example && npm run test:ts:e2e`。测试使用临时用户数据，验证打包安装、输入、保存后重新打开、复制桥接、再次激活和权限拒绝；不会修改日常 Nexlet 数据或系统剪贴板。

## 发版

插件合入 `main` 后自动上架，不需要 Nexlet 主程序发版，也不需要手动打标签或创建 Release。PR 只验证和生成 artifact；在 `main` 手动运行工作流可重试发布。

更新插件源码时递增 `plugin.json` 的稳定版本号（例如 `1.0.0` → `1.0.1`）。同版本的源码变更或版本倒退会被拒绝；共享 SDK、依赖或构建工具改变了插件运行行为时，也应递增受影响插件的版本。`catalog.json` 是待发布清单，`index.json` 是用户实际读取的已发布目录，`published.json` 保存源码版本基线。文档修改不强制更新插件版本。

CI 先测试和打包，再为新增/升级插件创建 `<plugin-id>-v<version>` Release，校验资产 SHA-256 和匿名下载成功后，一次性提交市场目录与发布状态。已有插件保持原下载地址，已公开资产不可覆盖；重复执行复用校验一致的资产。发布串行执行，main 已变化时旧任务停止，普通快进推送进一步防止覆盖新提交。中途失败时保留原市场目录。

本地先执行 `npm run package`，或在完成构建后执行 `npm run publish:preview` 查看候选目录与待发布版本。预览只写 `dist/index.json`，不会访问或修改 GitHub。需要回退目录时，从历史提交同时恢复 `index.json` 和 `published.json`，并同步恢复对应源码及 catalog；不要删除旧 Release。正常修复应使用更高版本，以便已安装用户收到更新。

所有插件在受限的独立窗口运行，不能直接访问 Node.js 或网络；声明联网权限的插件安装后可直接使用宿主 HTTP 桥接，不再逐地址弹窗确认。插件独立数据保存在用户本机，更新不会删除数据，卸载默认保留数据。

## 许可证

本仓库以 [MIT License](LICENSE) 开源。提交的插件应包含自己的许可证和第三方许可声明。

## 翻译插件

需要 Nexlet 0.2.7+。运行 `python3 scripts/package.py` 后导入 `dist/translate.nexlet`，或加载 `plugins/translate` 开发目录。在启动器搜索「翻译」或带入文本，选择语言与引擎。Google 在停止输入 400 毫秒后自动翻译，支持粘贴、带入文本和切换语言，输入法组词期间不发送；LLM 仍需点击开始翻译。两种引擎均支持 Cmd/Ctrl+Enter 立即翻译、取消和复制译文。每次最多 5000 个 Unicode 字符。

Google 使用免 Key 网页接口，当前宿主首次联网也无需额外确认。该接口无官方稳定性保证，可能限流或不可用，不会自动切换到 LLM。LLM 在「翻译设置」填写 Base URL、API Key、模型名，支持 OpenAI-compatible Chat Completions 非流式接口；Base URL 可填写 `https://your-service/v1` 或完整 `/chat/completions` 地址，本机 HTTP 服务可不填 Key。保存后再切换 LLM 翻译。Key 加密保存，系统加密不可用时仅当前插件会话有效。

只保存服务配置与语言偏好，不保存原文/译文历史。翻译请求会将原文发往所选服务；Google 的网页接口以 URL 参数传递文字。对方服务的数据保留规则由服务方决定。

协议测试：`node --test tests/translation.test.mjs`。在相邻宿主目录执行 `npm run build` 后运行 `npm exec -- playwright test tests/translation.spec.ts`，以临时数据目录验证安装、权限、取消及本地 LLM fixture；另用 `NEXLET_TRANSLATION_LIVE=1` 启用 Google 实网用例。插件仓库不在相邻位置时设置 `NEXLET_PLUGINS_DIR`；缺少插件源码的宿主单仓 CI 明确跳过这些跨仓用例。翻译插件 1.1.0 安装包对应 v1.3.0 Release。免确认行为由宿主决定，旧版宿主仍可能显示确认弹窗。

## 扩展 SDK 与 Node.js 后台

当前 checkout 提供 `templates/backend`，运行 `npm run package:backend` 生成 `dist/backend-example.nexlet`。前端保持浏览器沙箱；后台 TypeScript 编译为独立 Node.js 进程入口，需要 manifest 的 `backend` 权限。完整合同由宿主 `src/shared/plugin-api.ts` 和 `sdk/index.d.ts` 同步，宿主仓运行 `node scripts/sync-plugin-sdk.mjs` 更新本仓类型。Ctool 的市场兼容范围从 Nexlet 0.2.21 起。

后台模板说明见 [templates/backend/README.md](templates/backend/README.md)。新能力使用 Nexlet API，不以原样运行 uTools 插件为目标。

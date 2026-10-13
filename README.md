# Nexlet Plugins

[Nexlet](https://github.com/Cansiny0320/Nexlet) 的公开插件目录与源码仓库。桌面应用从本仓库读取 `index.json`，从 GitHub Releases 下载插件包。

## 安装

在 Nexlet 中打开「插件管理 → 插件市场」，选择插件并安装。当前宿主点击安装后直接执行，插件声明的能力可在详情中查看。也可以下载 Releases 中的 `.nexlet` 文件，通过「已安装 → 导入插件包」安装。

| 插件 | 用途 | 权限 |
| --- | --- | --- |
| 便笺 | 在本机自动保存一段文字，一键复制 | 写入剪贴板 |
| 翻译 | Google 免 Key 与可配置的 LLM 翻译 | 写入剪贴板、网络请求、独立加密密钥 |
| 字数统计 | 实时统计中英文字数、字符数、数字组、行数与段落数 | 无 |

字数统计支持直接输入、粘贴，以及启动器传入的文本。字数按「汉字 + 英文单词 + 数字组」计算，标点和 emoji 只计入字符数；组合 emoji 按一个可见字符统计。空行分隔段落，自动折行不增加行数。文本仅在本机计算，不保存。

剪贴板、计算稿纸、JSON 工具、时间戳、编码转换、UUID、网页快开和 Everything 文件搜索随 Nexlet 预装，不需要从市场下载。Nexlet 0.2.0 的 Windows 版同时提供 Everything 便携引擎，无需另行安装；首次建立文件索引可能需要一段时间。

## 开发与提交

1. 参考 `plugins/hello-nexlet/` 和 [插件 SDK](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.md) 创建插件。
2. 在 Nexlet 中使用「加载开发目录」调试。
3. 将源码放入 `plugins/<name>/`，在 `index.json` 添加条目。ID、版本必须与 `plugin.json` 一致。
4. 运行 `python scripts/package.py`，提交 Pull Request。

本地验证：使用 Node.js 24+ 运行 `npm test` 检查统计逻辑，运行 `python3 scripts/package.py` 生成 `dist/*.nexlet`。将 `dist/word-count.nexlet` 通过「导入插件包」安装即可体验；市场条目需要对应 Release 发布后才能下载。字数统计使用文本输入与会话 API，最低支持 Nexlet 0.2.6。

真实宿主验证：先在相邻的 `../Nexlet` 安装依赖并执行 `npm run build`，再在本仓库运行 `npm run test:e2e`（可用 `NEXLET_HOST_DIR` 指定宿主目录）。测试使用临时用户数据目录导入实际插件包，验证输入、再次激活、清空、分离窗口和大文本，截图保存到 `dist/word-count-preview.png`，不改动日常使用的 Nexlet 数据。

索引使用 `schemaVersion: 1`，条目包含 ID、名称、描述、作者、分类、SemVer 版本、支持平台、最低主程序版本和下载地址。可选 `icon` 是 PNG Data URL。下载地址限定本仓库的 GitHub Releases，插件包不要求 Hash 字段。

## 发版

更新源码、版本和索引下载地址后，提交到 `main`，创建与本次更新条目的下载地址一致的 `v*` 标签并推送；未更新的插件保留已发布的下载地址。发布标签须至少匹配一个目录条目。CI 校验与打包后将 `.nexlet` 上传到公开 GitHub Release。普通推送与 PR 只验证和生成 artifact。

所有插件在受限的独立窗口运行，不能直接访问 Node.js 或网络；声明联网权限的插件安装后可直接使用宿主 HTTP 桥接，不再逐地址弹窗确认。插件独立数据保存在用户本机，更新不会删除数据，卸载默认保留数据。

## 许可证

本仓库以 [MIT License](LICENSE) 开源。提交的插件应包含自己的许可证和第三方许可声明。

## 翻译插件

需要 Nexlet 0.2.7+。运行 `python3 scripts/package.py` 后导入 `dist/translate.nexlet`，或加载 `plugins/translate` 开发目录。在启动器搜索「翻译」或带入文本，选择语言与引擎。Google 在停止输入 400 毫秒后自动翻译，支持粘贴、带入文本和切换语言，输入法组词期间不发送；LLM 仍需点击开始翻译。两种引擎均支持 Cmd/Ctrl+Enter 立即翻译、取消和复制译文。每次最多 5000 个 Unicode 字符。

Google 使用免 Key 网页接口，当前宿主首次联网也无需额外确认。该接口无官方稳定性保证，可能限流或不可用，不会自动切换到 LLM。LLM 在「翻译设置」填写 Base URL、API Key、模型名，支持 OpenAI-compatible Chat Completions 非流式接口；Base URL 可填写 `https://your-service/v1` 或完整 `/chat/completions` 地址，本机 HTTP 服务可不填 Key。保存后再切换 LLM 翻译。Key 加密保存，系统加密不可用时仅当前插件会话有效。

只保存服务配置与语言偏好，不保存原文/译文历史。翻译请求会将原文发往所选服务；Google 的网页接口以 URL 参数传递文字。对方服务的数据保留规则由服务方决定。

协议测试：`node --test tests/translation.test.mjs`。在相邻宿主目录执行 `npm run build` 后运行 `npm exec -- playwright test tests/translation.spec.ts`，以临时数据目录验证安装、权限、取消及本地 LLM fixture；另用 `NEXLET_TRANSLATION_LIVE=1` 启用 Google 实网用例。插件仓库不在相邻位置时设置 `NEXLET_PLUGINS_DIR`；缺少插件源码的宿主单仓 CI 明确跳过这些跨仓用例。翻译插件 1.1.0 安装包对应 v1.3.0 Release。免确认行为由宿主决定，旧版宿主仍可能显示确认弹窗。

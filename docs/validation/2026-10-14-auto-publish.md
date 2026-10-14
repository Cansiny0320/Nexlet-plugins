# 自动发布与 Ctool 上架验证

## 本地验证

- 宿主：从公开 v0.2.21 Release 下载 Windows x64 便携包并解包运行，运行时 `app.getVersion()` 为 `0.2.21`。原始 EXE 的 SHA-256 为 `0354d7422e7c8dc2ff51f950a325e1b2e119b83a11635198a1f71db4686586d3`，与 GitHub 资产摘要一致。日常安装仍为 0.2.20，未替换。
- `npm test`：30 项通过（包含 10 项自动发布测试）。覆盖不可覆盖版本、旧 URL 保留、版本倒退、失败不更新目录、过期任务、重复执行、远端摘要、匿名下载验证、未完成草稿上传重试、Windows/Linux 文本摘要一致性。
- `npm run build`：Node.js 24.19.0 完整类型检查与构建通过。修复 Windows 直接 spawn npm.cmd 的 EINVAL，改用当前 Node 启动 npm CLI。
- `npm run test:ctool`：9 项通过，包含后台 HTTP/WebSocket、JSON Schema、持久化、完整路由和包限制。
- `npm run publish:preview`：只新增 Ctool 1.0.0，三个历史插件保留原下载地址。候选目录通过宿主 `validateMarketIndex`；0.2.20 被最低版本限制，0.2.21 允许安装。
- `python3 scripts/package.py --source-root .build/plugins --index dist/index.json`：四个插件打包通过。本地 Ctool 包 SHA-256 为 `dca100f7208f40968c7d31fd37de015956620691ee5dbbc37154a25a3c6b6a5c`；这是 Windows 本地构建，不代表 Linux CI 最终资产摘要。
- `npm run test:ctool:e2e`：使用 `NEXLET_HOST_EXECUTABLE` 指向解包后的 0.2.21 正式程序，`NEXLET_EXPECT_VERSION=0.2.21`，临时用户数据。完整 50 个工具、74 个页面通过，错误列表为空。验证 Worker、哈希、Unicode、Monaco、Schema、JSONPath、类型生成、HTTP/WebSocket 桥接、加密凭据、二维码复制/下载/上传/解码、重复激活、保存恢复、退出清理及窗口分离。
- 联网业务测试使用本地 fixture；不代表 JDoodle 账户已配置或第三方服务已执行真实业务。
- `git diff --check` 和工作流 YAML 解析通过。

## 上线验收

提交后的 main 工作流必须全部成功，公开 Ctool Release 后才能提交市场目录。上线后检查 raw index、公开资产 SHA-256 和实际下载包，并再次运行宿主 E2E。任何失败不得以本地结果代替线上结果。

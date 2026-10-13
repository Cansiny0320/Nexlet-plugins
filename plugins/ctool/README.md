# Ctool 开发工具箱

将 [baiy/Ctool](https://github.com/baiy/Ctool) 2.4.0 的全部 50 个工具、74 个功能页面集成到 Nexlet。保留上游界面、工具算法、分类、内部搜索、历史和设置。包括 JSON / JSON Schema / JSONPath / 类型生成、哈希和加解密、编解码、代码格式化、在线代码运行、IP 查询、WebSocket、ARM / HEX、二维码、条形码、文本、时间、单位换算等。

## 构建和使用

需要 Node.js 24+、npm、Python 3 和 tar。在插件仓库根目录执行：

```sh
npm ci
npm run package:ctool
npm run test:ctool
```

第一次构建通过 npm 执行固定的 pnpm 9.15.9，按上游锁文件安装依赖；需要访问 npm registry 和 GitHub codeload。后续依赖使用本地缓存。源码快照在 `vendor/ctool/source.tar.gz`，构建先验证 SHA-256；适配源文件在 `integrations/ctool`，生成目录 `.build/ctool-source` 可删除重建，不能在那里修改长期代码。

在 Nexlet「插件管理 → 导入插件包」选择 `dist/ctool.nexlet`，或加载开发目录 `.build/plugins/ctool`。`plugins/ctool` 是 manifest 和文档目录，不能直接作为开发目录运行。

**宿主要求：** 需要包含扩展插件 SDK 的 Nexlet 构建，具备 `backend`、`database`、`files`、图片剪贴板与文件对话框 API，以及 `onOut` 期间的数据库/凭据保存和后台停止支持。本次以相邻 Nexlet 源码构建验收；不能将只具有旧版基本插件 API 的已发布宿主视为兼容。尚未添加市场下载地址或发布 Release。

搜索 `ctool` 打开全部工具，另提供 29 个常用入口。宿主单个插件最多 30 个入口，其余工具和子功能均可从 Ctool 内部分类/搜索进入。JSON 入口接受文本匹配，其余入口也支持宿主显式带入文本。原 uTools 专属关键词设置由 Nexlet 的指令管理承担。

## 联网和本机能力

- HTTP、二进制下载和 WebSocket 使用独立 Node 后台；插件页面保持沙箱，不直接联网。支持 HTTP/HTTPS、WS/WSS 与 WebSocket 子协议，HTTP 默认 30 秒超时、最高 120 秒，正文/响应或单条消息最高 8 MiB。退出或切换 WebSocket 页面会清理连接。
- IP 查询使用 GeoJS；ARM/HEX 使用 armconverter.com；代码运行使用 JDoodle。JDoodle 的 Client ID / Client Secret 由用户配置，服务账户、额度和可用性仍由第三方决定。错误在界面中显示，不会伪造成功结果。
- JDoodle 凭据通过 Nexlet `secrets` 保存；系统加密不可用时提示仅当前会话有效。历史与设置写入插件独立数据库（单条 1 MiB、总计 50 MiB），保存失败会显示可关闭的错误提示。
- 文本和图片复制使用剪贴板桥接；下载使用保存对话框，仅写入用户选择的路径；文件输入仍使用原文件选择/粘贴交互。声明的 `backend` 本身具有 Node 本机权限，并非只能联网的受限权限。
- 保留上游 MIT 署名、固定 commit 和依赖许可证。移除宿主无关的上游通知轮询、统计图片请求；更新随 Nexlet 插件包交付。

## 验证

```sh
# 相邻宿主先执行 npm run build
npm run test:ctool:e2e
```

E2E 使用临时数据导入实际安装包，遍历 74 个功能页面，并验证离线计算、Worker、Monaco、联网桥接、文件和图片、持久化及会话行为。测试使用剪贴板 mock 和本地 HTTP / WebSocket fixture，不改日常 Nexlet 数据。JDoodle fixture 通过不代表账户已配置或完成实网代码执行。验收记录写入 `dist/ctool-validation.json`。

上游源码：`4f9255f7caa1049786c98a28fbd7bdcc1aef17dd`。许可证见包内 `LICENSE` 和 `THIRD_PARTY_NOTICES.txt`。

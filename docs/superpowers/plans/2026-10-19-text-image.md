# 文字表格转图片实施计划

依据已批准的 [设计](../specs/2026-10-19-text-image.md)，在当前两个 checkout 中实施。

1. **宿主 HTML 读取**：修改 `D:/code/Nexlet/src/shared/plugin-api.ts`、`src/preload/plugin-sdk.ts`、`src/main/plugin-sdk/system.ts`；更新 SDK 文档和生成的 `D:/code/Nexlet-plugins/sdk/extensions.d.ts`。先补 `tests/plugin-clipboard-html.test.ts` 验证权限、空值、Unicode、大小拒绝；再实现。运行针对性 `pnpm test -- ...`，`node scripts/sync-plugin-sdk.mjs` 会写入插件 SDK 类型。
2. **插件模型和渲染**：新增 `plugins/text-image/src/`，将 TSV 解析、HTML 清理、图片生成和交互分离。补行为测试覆盖 quoted TSV、合并单元格、CSS 白名单、脚本和外链拒绝、超限。旧宿主能力检测和清晰降级。
3. **插件 UI 和交付内容**：新增 manifest、HTML、CSS、图标、README、许可证；简繁英文文案遵循现有语言 API。顶部操作、预览和侧栏；输入和导出设置变化更新 PNG，旧异步结果失效，失败清除旧预览并禁用导出。保存取消不写文件。
4. **验证和本地产物**：运行插件 `npm run typecheck`、相关 Node 测试、定向构建以及 `.nexlet` 打包；运行宿主 `pnpm check` 和 `pnpm build`。上述 build/package 会写 dist/.build；不调用发布脚本。新增 `tests/text-image.e2e.mjs` 在临时用户目录运行真实 Electron，验证 SDK、包安装、样式/安全/导出和浅深/窄屏，保存预览截图。恢复测试触碰的系统剪贴板。
5. **审阅交付**：检查两个仓库的 diff、测试结果与未验证边界，提供安装包路径、使用方式和必要的宿主兼容说明。不执行 Git 或远程写入。

失败先定位是否由本次修改引入；无关 baseline 失败仅报告。渲染风险主要为浏览器 foreignObject 可用性和 Excel 样式差异，通过真实 Electron 图片解码、像素采样和表格样例验证；若需要改变已批准范围再询问。

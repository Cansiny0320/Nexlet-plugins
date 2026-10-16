# 离线 OCR

需要 Nexlet 0.2.30+。支持图片识别、识别并复制、截图识别、截图识别并复制，界面跟随简体中文、繁体中文和 English。模型与运行时随包提供，识别不需要联网。此仓库独立维护插件，宿主主程序无需同步发版。

```sh
npm ci
npm ci --prefix integrations/ocr --ignore-scripts
npm run build:ocr
python3 scripts/package.py --plugin-dir .build/plugins/ocr --output dist/ocr.nexlet
```

开发时加载 `.build/plugins/ocr`，本地安装使用 `dist/ocr.nexlet`。`plugin.json` 同时包含市场元数据，合入 main 后由 CI 自动发现、构建、校验并更新市场。

图片支持选择、拖放、粘贴或宿主输入，上限为 20 MB、3600 万像素。可编辑、旋转、复制结果并返回主搜索；取消及 60 秒超时会终止 Worker。自动复制前检查剪贴板是否变化，避免覆盖新内容。

权限为 `runtime.compute`、`screen`、`windows`、`clipboard.read`、`clipboard.write`；不包含网络、任意文件或 Node 后台权限。`@paddleocr/paddleocr-js@0.4.2` 的 Worker 内嵌 ONNX Runtime 1.24.3，配套固定相同版本 JSEP WASM。模型清单和许可证位于 `models/`，构建先校验 SHA-256。

1.0.1 在宿主 Release 附件 1.0.0 的基础上接入独立插件仓库与自动发现，识别行为保持一致。

端到端验证使用相邻 Nexlet 仓库的 Playwright 和公开截图 fixture；可通过 `NEXLET_HOST_DIR` 指定仓库、`NEXLET_HOST_EXECUTABLE` 指定正式版宿主。`npm run test:ocr:e2e` 检查本地包安装、中文和 English 识别、取消及回填搜索；发布后运行 `npm run test:ocr:e2e -- --market`，验证实际市场下载、安装来源和最低宿主版本限制。测试使用临时用户目录，不替换日常安装。

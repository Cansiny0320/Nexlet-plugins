# 文字表格转图片

复制文字或 Excel 单元格，在 Nexlet 搜索「转图片」，预览后选择「复制图片」或「保存 PNG」。也可在插件中粘贴，普通文字可以编辑。`Ctrl/Cmd+Enter` 复制当前图片。

通过搜索输入或选区带入的文字，以带入内容为准，不混入系统剪贴板中的其他格式。需要保留 Excel 原始单元格样式时，使用「读取剪贴板」或直接在插件内粘贴。

支持图片宽度、字号（表格中按原字号比例调整）、内边距和背景色，默认白底、2 倍像素 PNG。Excel HTML 会保留支持的单元格字体、颜色、边框、对齐、宽高及合并关系；只有 TSV 时还原基础表格。图表、浮动图片、公式计算、局部富文本及完全复刻 Excel 排版不在支持范围。

内容只在内存中处理，不上传、不保存历史。`clipboard.read` 用于用户打开/读取时访问剪贴板；`clipboard.write` 用于主动复制 PNG；`files` 用于用户选择文件后保存 PNG。

## 宿主兼容

最低 Nexlet 0.2.30。复制后自动保留表格样式需要 Nexlet 0.2.36 新增的 `nexlet.clipboard.readHTML()`；旧版宿主仍能读取纯文字，并可直接粘贴 HTML 表格保留样式。缺少能力时界面会提示。

## 限制

- 最多 100,000 字符，HTML 最多 2 MiB；单表最多 5,000 个网格位置、1,000 行、200 列，不支持嵌套表格。
- 输出最长边 8192 像素、总计 2400 万像素、PNG 最多 16 MiB。超限明确报错，不截断内容。
- Excel CSS 仅保留安全的排版属性；脚本、事件、外部资源和嵌入内容被丢弃。
- 字体依赖本机安装情况，Windows、macOS、Linux 的排版可能不同。

## 本地构建与验证

在插件仓库执行：

```sh
npm run typecheck
node --test tests/text-image.test.mjs
node scripts/build.mjs plugins/text-image
python scripts/package.py --plugin-dir .build/plugins/text-image --output dist/text-image.nexlet
node tests/text-image.e2e.mjs
```

E2E 需要相邻 Nexlet 仓库完成构建，或通过 `NEXLET_HOST_DIR` 指定宿主。发布产物验证可设置 `NEXLET_TEST_EXECUTABLE` 指向解包后的宿主可执行文件，并用 `NEXLET_TEXT_IMAGE_BUNDLE` 指定下载的插件安装包。测试使用临时用户目录，并在剪贴板仍属于测试时恢复原内容。构建不发布市场，安装包生成于 `dist/text-image.nexlet`。

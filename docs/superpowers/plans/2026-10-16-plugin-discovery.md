# 实施计划

1. 自动发现与元数据迁移：新增 scripts/discover.mjs，修改 scripts/build.mjs、scripts/publish.mjs；迁移 plugins/*/plugin.json，删除 catalog.json。先添加无中央配置、新目录、排序、无效元数据、重复 ID、模板排除和过期构建测试；保留发布不可变性回归。
2. OCR 接入：新增 plugins/ocr/（源码与模型）、integrations/ocr/（锁文件和构建器）、tsconfig.ocr.json；更新 SDK 所需声明、构建入口和 CI 安装/类型检查。导入已验证的宿主 OCR 实现，接入统一 .build 输出，不依赖相邻宿主源码构建。升级既有插件 patch 版本以反映包内容变化。
3. 打包边界：修改 scripts/package.py，覆盖合法大模型、单文件/解压总量/压缩包超限以及失败保留旧包；保证不打入源码和开发依赖。更新 README 三语言和 SDK manifest 文档。
4. 本地验证：npm test、npm run build、npm run test:ctool、npm run publish:preview、python3 scripts/package.py --source-root .build/plugins --index dist/index.json；检查候选仅含五个正式插件及预期新版本。真实 v0.2.30 临时 userData 安装 OCR 并识别 fixture，校验旧版兼容提示。
5. 提交并 push 插件仓库授权范围，等待 CI 自动发布；读取公开 index.json 和独立 OCR Release，校验最终匿名下载 SHA256，并用真实 v0.2.30 的市场安装路径安装后识别。核对远端 SHA，完成交付。

副作用：npm ci 写 node_modules；build/package/preview 写 .build/dist；E2E 使用临时 userData。push 触发已授权的自动 Release 和索引写入。不会安装覆盖常用 Nexlet、改系统设置或删除历史 Release。

风险与回滚：OCR 模型较大，需检查单文件/总包限制；元数据迁移需要 patch 版本防止覆盖既有内容。失败时不公开新索引；需要回滚时用后续提交恢复对应源码、生成索引及发布收据，保留历史不可变附件，修正插件用更高版本。

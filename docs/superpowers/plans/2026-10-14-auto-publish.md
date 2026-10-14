# 实施计划

1. 新建 `catalog.json`、`published.json`，迁移三个已发布插件并加入 Ctool 1.0.0；保留 `index.json` 直到真实发布完成。
2. 增加 `scripts/publish.mjs` 和 `tests/publish.test.mjs`：元数据验证、稳定版本比较、源码摘要、版本不可覆盖、先资产后目录、重复执行、发布失败和过期提交防护。先运行新增测试确认失败，再实现。
3. 扩展 `scripts/package.py` 支持指定候选索引；更新 package scripts 和 `.github/workflows/release.yml`。PR 只验证，main 自动发布，发布任务串行且不取消进行中的任务。
4. 更新 README 和 Ctool 说明，明确自动上架、递增插件版本、失败重试和回滚。验证 `npm test`、`npm run build`、`npm run test:ctool`、本地发布预览、Ctool 真实宿主 E2E；这些命令生成 `.build/`、`dist/` 并可能下载构建依赖，E2E 使用临时数据。
5. 审查差异并提交推送本次范围；等待 GitHub CI。核对公开安装包内容、摘要、市场入口、最低宿主版本和真实运行。验证重复发布预览没有新资产。

主要风险：CI 令牌无法写入 main、构建环境差异、网络错误、并发源码提交。以保留旧索引、不可变资产、摘要校验、串行发布与普通快进 push 防护。失败修复后重试；不强推，不删除历史安装包。

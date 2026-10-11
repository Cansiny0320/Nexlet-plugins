# Nexlet Plugins

[Nexlet](https://github.com/Cansiny0320/Nexlet) 的公开插件目录与源码仓库。桌面应用从本仓库读取 `index.json`，从 GitHub Releases 下载插件包。

## 安装

在 Nexlet 中打开「插件管理 → 插件市场」，选择插件并安装。安装时会展示插件申请的权限。也可以下载 Releases 中的 `.nexlet` 文件，通过「已安装 → 导入插件包」安装。

| 插件 | 用途 | 权限 |
| --- | --- | --- |
| 便笺 | 在本机自动保存一段文字，一键复制 | 写入剪贴板 |

剪贴板、计算稿纸、JSON 工具、时间戳、编码转换、UUID、网页快开和 Everything 文件搜索随 Nexlet 预装，不需要从市场下载。Nexlet 0.2.0 的 Windows 版同时提供 Everything 便携引擎，无需另行安装；首次建立文件索引可能需要一段时间。

## 开发与提交

1. 参考 `plugins/hello-nexlet/` 和 [插件 SDK](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.md) 创建插件。
2. 在 Nexlet 中使用「加载开发目录」调试。
3. 将源码放入 `plugins/<name>/`，在 `index.json` 添加条目。ID、版本必须与 `plugin.json` 一致。
4. 运行 `python scripts/package.py`，提交 Pull Request。

索引使用 `schemaVersion: 1`，条目包含 ID、名称、描述、作者、分类、SemVer 版本、支持平台、最低主程序版本和下载地址。可选 `icon` 是 PNG Data URL。下载地址限定本仓库的 GitHub Releases，插件包不要求 Hash 字段。

## 发版

更新源码、版本和索引下载地址后，提交到 `main`，创建与下载地址一致的 `v*` 标签并推送。CI 校验与打包后将 `.nexlet` 上传到公开 GitHub Release。普通推送与 PR 只验证和生成 artifact。

所有插件在受限的独立窗口运行，不能直接访问 Node.js 或网络。插件独立数据保存在用户本机，更新不会删除数据，卸载默认保留数据。

## 许可证

本仓库以 [MIT License](LICENSE) 开源。提交的插件应包含自己的许可证和第三方许可声明。

# TypeScript backend 模板

在插件仓库根目录运行 `npm ci`、`npm run package:backend`，将 `dist/backend-example.nexlet` 导入 Nexlet，或加载 `.build/templates/backend` 开发目录。运行需要包含扩展 SDK 的宿主构建；尚未声明可用的正式发布版本。

`src/main.ts` 运行于浏览器沙箱。`src/backend.ts` 编译为 manifest 指定的 `backend.cjs`，在宿主创建的独立 Node.js utility process 中运行，具有完整本机 Node 权限。只安装可信来源的 backend 插件。

点击“计算并保存”调用后台 SHA-256 计算，并将结果存入插件文档数据库；退出后重新打开可读取上次结果。模板的 `tools` / `mcp` 权限用于继续扩展工具服务，默认不会启动监听端口。

后台导出 `handlers`，参数为 `unknown`，需自行校验。第二个参数提供 `signal`、`emit(value)` 和插件独立 `dataDirectory`。取消后台任务会终止该插件后台进程，其他同时运行的调用也会失败；后续调用自动启动新进程。关闭前端时取消其 RPC，已保存的调度仍可唤起后台。停用、卸载、升级、退出宿主会停止后台。

第三方 JavaScript 依赖会由 esbuild 合并进后台产物；Node 内置模块保持原样。原生 addon 和任意外部 `node_modules` 不会自动打包，不能依赖开发机器上的隐式搜索路径。媒体处理可直接使用 `nexlet.media`。

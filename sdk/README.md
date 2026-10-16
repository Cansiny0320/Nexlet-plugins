[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# @nexlet/plugin-api

Nexlet Plugin API v1 的类型声明，覆盖当前宿主的全部公开插件方法，不包含尚未实现的能力。只有类型，不注入或模拟运行时对象；运行时由 Nexlet 提供 `window.nexlet`。

本仓库执行 `npm ci` 后即可使用。独立工程可执行 `npm install --save-dev /绝对路径/Nexlet-plugins/sdk`，然后在 `tsconfig.json` 中添加 `"types": ["@nexlet/plugin-api"]`。该包目前仅本地使用，尚未发布到 npm。

```ts
import type { PluginContext } from '@nexlet/plugin-api';

nexlet.onEnter((context: PluginContext) => {
  if (context.type === 'text') console.log(context.payload);
});
```

请求方法返回 Promise，事件订阅返回取消订阅函数。`PluginContext` 是可区分联合类型，根据 `type` 可得到正确的 `payload` 类型。存储泛型只提供静态提示，读取用户数据仍需按业务验证。

不要在同一个 TS 编译上下文中混入宿主内部的 `src/shared/types.ts`：其中的 `HostApi` 面向主程序页面，不是插件接口。不要给浏览器插件配置 Node.js 全局类型；当前插件不能使用 `require`、`process` 或自定义 preload。

完整权限、限额、生命周期行为见 [宿主 SDK 文档](https://github.com/Cansiny0320/Nexlet/blob/main/docs/plugin-sdk.md)。这份声明描述 Nexlet 的实际行为，不代表 uTools API 兼容或能力已全部覆盖。

扩展 API 类型在 `extensions.d.ts`，由宿主 `src/shared/plugin-api.ts` 生成；基本 API 在宿主 `sdk/index.d.ts` 维护。请在宿主仓运行 `node scripts/sync-plugin-sdk.mjs` 同步，不手工修改生成文件。新增 backend、数据库、窗口、系统、浏览器、媒体、AI、工具/MCP 和 provider 服务适配，运行需要对应的新宿主构建。

`nexlet.i18n.getLocale()` / `onChange()` 无需额外权限，返回或订阅 `zh-CN`、`zh-Hant`、`en` 应用语言。`system.info().locale` 保持系统语言含义；兼容旧宿主时先检测 `i18n`，不再使用订阅时调用取消函数。

市场自动发现读取 `plugins/*/plugin.json`；正式插件需填写 `author`、`category`、`platforms` 和可选 `minHostVersion`。`templates/` 不发布。

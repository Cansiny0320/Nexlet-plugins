[简体中文](README.md) · [繁體中文](README.zh-Hant.md) · [English](README.en.md)

# TypeScript 插件模板

从 **Nexlet-plugins 仓库根目录** 执行（Node.js 24+、Python 3）：

```sh
npm ci
npm run package:example
```

将 `dist/typescript-example.nexlet` 导入 Nexlet，或者在「加载开发目录」中选择 `.build/templates/typescript`。需要支持文本输入及生命周期 API 的 Nexlet 0.2.6+。

开发时运行：

```sh
npm run dev -- templates/typescript
```

修改 TS、HTML、CSS 或 manifest 会重新构建；在 Nexlet 中退出插件再打开可读取最新产物。manifest 或权限改变后需重新导入。watch 模式仅编译，提交前执行 `npm run typecheck`；正式 `build` 和 `package` 都会先检查类型。

创建新插件时，把本目录复制到 `plugins/<name>`，修改 `plugin.json` 的 ID、名称和功能。项目使用根目录的依赖及 `tsconfig.json`，`src/main.ts` 编译为 `main.js`，其余运行资源原样复制。HTML 用外部 `<script src="main.js">` 加载，不要引用 `.ts` 或内联脚本。新增第三方浏览器依赖后会随 TS 入口打入 JS；Node.js 模块不受当前沙箱支持。

`npm run build` 会生成 `.build/plugins/<name>`。不加入市场也可以打包：

```sh
python3 scripts/package.py --plugin-dir .build/plugins/<name> --output dist/<name>.nexlet
```

加入 `index.json` 后，`npm run package` 会与现有插件一起构建并打包。模板自身不会加入市场或自动发布。

`window.nexlet` 和全局 `nexlet` 均有类型提示；可用 `import type { PluginContext } from '@nexlet/plugin-api'` 引入命名类型。类型包只有声明，不需要在插件运行时加载 JS。

多语言界面可检测 `nexlet.i18n` 并订阅变化，只更新产品文案、不替换用户输入，详见 [SDK](../../sdk/README.md)。

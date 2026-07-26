# my-blog

一个 Markdown 驱动的静态个人博客,风格克制极简。基于 Astro 构建,以 Vue 交互岛屿实现主题切换,内置全文搜索。

> 🚧 开发中。当前进度:项目脚手架已就绪,内容层与页面尚未实现。

## 技术栈

| 领域 | 选型 |
| :--- | :--- |
| 框架 | [Astro](https://astro.build)(`output: 'static'`,纯静态输出) |
| 交互 | [Vue 3](https://vuejs.org) —— 仅用于交互岛屿 |
| 样式 | [UnoCSS](https://unocss.dev)(`darkMode: 'class'`) |
| 搜索 | [Pagefind](https://pagefind.app) —— 构建期生成索引,弹层式 UI |
| 图标 | [Iconify](https://iconify.design) / Phosphor Icons |
| 规范 | ESLint([@antfu/eslint-config](https://github.com/antfu/eslint-config))+ commitlint + husky |

## 环境要求

- Node.js >= 22.12.0
- pnpm

## 快速开始

```bash
pnpm install
pnpm dev
```

开发服务器启动于 http://localhost:4321。

> 注意:搜索功能依赖构建期生成的索引,开发模式下不可用,需以 `pnpm build && pnpm preview` 验证。

## 可用命令

所有命令均在项目根目录执行:

| 命令 | 说明 |
| :--- | :--- |
| `pnpm dev` | 启动开发服务器(`localhost:4321`) |
| `pnpm build` | 构建生产站点至 `./dist/`,并生成 Pagefind 搜索索引 |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm lint` | 检查代码规范 |
| `pnpm lint:fix` | 自动修复代码规范问题 |
| `pnpm typecheck` | 类型检查(`astro check`) |

## 项目结构

```text
/
├── public/              # 静态资源,原样拷贝至产物根目录
├── src/
│   ├── pages/           # 文件路由
│   └── ...
├── astro.config.ts      # Astro 配置与集成
├── eslint.config.js     # ESLint 配置
└── commitlint.config.ts # 提交信息规范
```

## 部署

构建产物为纯静态文件,可托管于任意静态文件服务器,无需 Node 运行时:

```bash
pnpm build
npx serve dist
```

> ⚠️ 部署前请先将 `astro.config.ts` 中的 `site` 由占位值 `https://blog.example.com` 改为实际域名 —— sitemap、RSS 与 OG 图均依赖该值生成绝对 URL。

## 相关文档

- [`SPEC.md`](./SPEC.md) —— 完整技术方案与执行步骤
- [`STUDY.md`](./STUDY.md) —— 实施过程中的知识点与踩坑记录
- [`CLAUDE.md`](./CLAUDE.md) —— 项目级开发约定

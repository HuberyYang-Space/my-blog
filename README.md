# my-blog

一个 Markdown 驱动的静态个人博客,风格克制极简。基于 Astro 构建,以 Vue 交互岛屿实现主题切换,内置全文搜索。

> 🚧 开发中。当前进度:内容层、文章页、双主题、搜索、标签页、RSS、sitemap 与社交分享元信息均已跑通;
> 视觉风格待细化,评论 / 阅读时长 / i18n 尚未实现。

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
> 草稿(frontmatter 里 `draft: true`)在开发模式下可见,便于边写边预览,生产构建则完全排除。

## 写文章

在 `src/content/blog/` 下新建 `.md` 文件,frontmatter 字段如下:

```yaml
---
title: 文章标题 # 必填
description: 一句话摘要 # 必填
date: 2026-07-26 # 必填
updatedDate: 2026-07-27 # 可选
tags: [Astro, CSS] # 可选,默认 []
draft: false # 可选,默认 false
---
```

文件名即 URL 路径(`hello.md` → `/posts/hello/`)。字段写错会在构建期报错,而非渲染成空白。

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
├── public/                    # 静态资源,原样拷贝至产物根目录
├── src/
│   ├── config.ts              # 站点配置(站名/描述/域名/OG 图)的唯一真源
│   ├── content.config.ts      # Content Collection schema(根级,非 content/config.ts)
│   ├── content/blog/*.md      # 文章正文
│   ├── layouts/               # BaseLayout(含防闪烁脚本 + OG 元信息)/ PostLayout
│   ├── components/            # ThemeToggle.vue 是全站唯一的 Vue 岛屿
│   ├── pages/                 # 文件路由(含 tags/[tag]、about、404、rss.xml)
│   ├── styles/global.css      # 双主题变量 + reset + .prose
│   └── utils/posts.ts         # 文章与标签查询(草稿过滤的唯一真源)
├── astro.config.ts            # Astro 配置与集成
├── uno.config.ts              # UnoCSS 配置
├── eslint.config.js           # ESLint 配置
└── commitlint.config.ts       # 提交信息规范
```

## 部署

构建产物为纯静态文件,可托管于任意静态文件服务器,无需 Node 运行时:

```bash
pnpm build
npx serve dist
```

> ⚠️ 部署前请核对 `src/config.ts` 中的 `SITE.url` 是否为实际域名 —— canonical、sitemap、RSS 与 OG 图均依赖该值生成绝对 URL。
> `astro.config.ts` 里的构建守卫会拦下 `example.com` 这类占位值,但拦不住写错的真实域名。

站点同时输出:

- `/sitemap-index.xml` —— 由 `@astrojs/sitemap` 生成
- `/rss.xml` —— 订阅源,与站点共用同一套草稿过滤逻辑
- `/404.html` —— 静态托管平台按约定用作兜底页

## 相关文档

- [`SPEC.md`](./SPEC.md) —— 完整技术方案与执行步骤
- [`CLAUDE.md`](./CLAUDE.md) —— 项目级开发约定

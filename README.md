# my-blog

一个 Markdown 驱动的静态个人博客,风格克制极简。基于 Nuxt 4 + Nuxt Content 构建,纯静态输出,支持双主题切换。

> 🚧 开发中。当前进度:内容层、文章页、双主题、标签页、RSS、sitemap 与社交分享元信息均已跑通;
> 搜索、评论 / 阅读时长 尚未实现。

## 技术栈

| 领域 | 选型 |
| :--- | :--- |
| 框架 | [Nuxt 4](https://nuxt.com)(`nuxt generate`,纯静态输出) |
| 内容 | [Nuxt Content 3](https://content.nuxt.com) —— zod schema 校验的 Markdown 集合 |
| 样式 | [UnoCSS](https://unocss.dev)(`darkMode: 'class'`) |
| 图标 | [Iconify](https://iconify.design) / Phosphor Icons |
| 站点地图 | [@nuxtjs/sitemap](https://nuxtseo.com/sitemap) |
| OG 分享图 | [nuxt-og-image](https://nuxtseo.com/og-image)(Browser 渲染器,构建期出图) |
| 规范 | ESLint([@antfu/eslint-config](https://github.com/antfu/eslint-config))+ commitlint + husky |

## 环境要求

- Node.js >= 22.12.0
- pnpm

## 快速开始

```bash
pnpm install
pnpm dev
```

开发服务器启动于 http://localhost:3000。

> 草稿(frontmatter 里 `draft: true`)在开发模式下可见,便于边写边预览,生产构建则完全排除
> —— 既不会被预渲染成页面,也不会出现在 RSS 里。

## 写文章

在 `content/blog/` 下新建 `.md` 文件,frontmatter 字段如下:

```yaml
---
title: 文章标题 # 必填
description: 一句话摘要 # 必填
date: 2026-07-26 # 必填
updatedDate: 2026-07-27 # 可选
tags: [Nuxt, CSS] # 可选,默认 []
draft: false # 可选,默认 false
---
```

文件名即 URL 路径(`hello.md` → `/posts/hello/`)。字段写错会在构建期报错,而非渲染成空白。
下划线开头的文件(如 `_wip.md`)不会被收录。

> 正文里的中文引号请直接输入 `“”`。本项目未启用 smartypants 类插件,直引号不会被自动转换
> —— 原因见 [`CLAUDE.md`](./CLAUDE.md) 的「写文章约束」。

## 可用命令

所有命令均在项目根目录执行:

| 命令 | 说明 |
| :--- | :--- |
| `pnpm dev` | 启动开发服务器(`localhost:3000`) |
| `pnpm build` | 构建静态站点至 `.output/public/` |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm lint` | 检查代码规范 |
| `pnpm lint:fix` | 自动修复代码规范问题 |
| `pnpm typecheck` | 类型检查(`nuxt typecheck`,底层是 vue-tsc) |

## 项目结构

```text
/
├── public/                    # 静态资源,原样拷贝至产物根目录
├── content/blog/*.md          # 文章正文
├── content.config.ts          # Content collection schema(根级)
├── shared/utils/posts.ts      # app 与 server 双向自动导入 —— 草稿过滤的唯一真源
├── server/routes/rss.xml.ts   # RSS 订阅源(Nitro 路由)
├── app/
│   ├── app.vue
│   ├── error.vue              # nuxt generate 据此产出根级 404.html
│   ├── config.ts              # 站点配置(站名/描述/域名)的唯一真源
│   ├── components/OgImage/    # OG 分享图模板(Vue 组件,构建期由 Chrome 渲染)
│   ├── assets/css/global.css  # 双主题变量 + reset + .prose
│   ├── components/            # 自动导入,含 BaseLayout / PostLayout / ThemeToggle
│   ├── pages/                 # 文件路由(index、about、posts/[slug]、tags/[tag])
│   └── utils/posts.ts         # 文章与标签查询
├── nuxt.config.ts             # Nuxt 配置(含防闪烁内联脚本、Shiki 双主题)
├── uno.config.ts              # UnoCSS 配置
├── eslint.config.js           # ESLint 配置
└── commitlint.config.ts       # 提交信息规范
```

## 部署

构建产物为纯静态文件,可托管于任意静态文件服务器,无需 Node 运行时:

```bash
pnpm build
npx serve .output/public
```

> ⚠️ 部署前请核对 `app/config.ts` 中的 `SITE.url` 是否为实际域名 —— canonical、sitemap、RSS 与 OG 图
> 均依赖该值生成绝对 URL。构建期没有占位域名守卫,写错不会报错,只会让这些链接整体指向错误域名。

站点同时输出:

- `/sitemap.xml` —— 由 `@nuxtjs/sitemap` 生成
- `/rss.xml` —— 订阅源,与站点共用同一套草稿过滤逻辑
- `/404.html` —— 静态托管平台按约定用作兜底页
- `/_og/s/*.png` —— OG 分享图,构建期用 Chrome 渲染 `app/components/OgImage/` 下的模板

> 构建需要本机可用的 Chrome/Chromium(CI 环境模块会自行安装)。找不到时渲染器会静默禁用,
> 因此 `nuxt.config.ts` 里有构建期守卫:产物中若缺少 og:image 或图片文件不存在,构建直接失败。

## 相关文档

- [`CLAUDE.md`](./CLAUDE.md) —— 项目级开发约定

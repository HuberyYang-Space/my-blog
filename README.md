# my-blog

一个 Markdown 驱动的静态个人博客,风格克制极简。基于 Nuxt 4 + Nuxt Content 构建,纯静态输出,支持双主题切换。

> 🚧 开发中。当前进度:内容层、文章页、双主题、标签页、RSS、sitemap、社交分享元信息、
> 全文搜索,以及 MDC 组件与代码块增强均已跑通;评论 / 阅读时长 尚未实现。

## 技术栈

| 领域 | 选型 |
| :--- | :--- |
| 框架 | [Nuxt 4](https://nuxt.com)(`nuxt generate`,纯静态输出) |
| 内容 | [Nuxt Content 3](https://content.nuxt.com) —— zod schema 校验的 Markdown 集合 |
| 富文本 | [MDC](https://content.nuxt.com/docs/files/markdown) —— Markdown 里直接调用 Vue 组件 |
| 代码高亮 | [Shiki](https://shiki.style) 双主题 + [@shikijs/transformers](https://shiki.style/packages/transformers)(diff / 聚焦标记) |
| 样式 | [UnoCSS](https://unocss.dev)(`darkMode: 'class'`) |
| 图标 | [Iconify](https://iconify.design) / Phosphor Icons |
| 站点地图 | [@nuxtjs/sitemap](https://nuxtseo.com/sitemap) |
| 搜索 | 自建 —— 构建期出静态索引 + 客户端子串匹配,零运行时依赖(见下方说明) |
| OG 分享图 | [nuxt-og-image](https://nuxtseo.com/og-image)(Browser 渲染器,构建期出图) |
| 测试 | [Vitest](https://vitest.dev) 纯函数单测 + 自写产物断言脚本 |
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

用脚手架新建,自动填好 frontmatter、日期取当天:

```bash
pnpm new "文章标题"
pnpm new "中文标题" my-slug   # 中文标题推导不出 slug 时显式指定
```

frontmatter 字段:

```yaml
---
title: 文章标题 # 必填
description: 一句话摘要 # 必填
date: 2026-07-26 # 必填
updatedDate: 2026-07-27 # 可选
tags: [Nuxt, CSS] # 可选,默认 []
draft: false # 可选,默认 false
badges: [wip] # 可选,默认 [],最多 3 个
---
```

`badges` 是显示在标题右侧的状态徽章,只能取下表里的 key(文案与配色定义在
`app/config.ts` 的 `BADGES`,新增徽章在那里加一行):

| key | 显示 | 说明 |
| :--- | :--- | :--- |
| `draft` | 草稿 | 由 `draft: true` 自动注入,**手写会让构建失败**;且只在开发模式可见 |
| `wip` | 连载中 | 已发布但还在写 —— 想要「线上可见的未完成态」用这个,不是 `draft` |
| `translated` | 译文 | |
| `outdated` | 已过时 | |
| `featured` | 精选 | |

徽章的渲染顺序取上表的定义序,与 frontmatter 里的书写顺序无关。
`tags` 与 `badges` 分工不同:前者是分类导航(有 `/tags/<标签>` 归档页),
后者只做状态标记,不可点击、不生成页面。

文件名即 URL 路径(`hello.md` → `/posts/hello`)。字段写错会在构建期报错,而非渲染成空白。
下划线开头的文件(如 `_wip.md`)不会被收录。

> 正文里的中文引号请直接输入 `“”`。本项目未启用 smartypants 类插件,直引号不会被自动转换
> —— 原因见 [`CLAUDE.md`](./CLAUDE.md) 的「写文章约束」。

### 正文能力

`content/blog/` 下的三篇示例文章本身就是语法参考 —— 源码即文档,看写法直接看源码。

| 能力 | 写法 |
| :--- | :--- |
| 提示框 | `::note` / `::tip` / `::warning` / `::caution` |
| 交互演示 | `::demo{title="…"}` 内嵌 `:demo-counter`、`:demo-motion` |
| 带图注的插图 | `::illustration{src alt width height}` |
| 行内挂类名 | `[文字]{.highlighter}` |
| 代码块文件名 | ` ```ts [app/config.ts] ` |
| 代码块行高亮 | ` ```ts {1,3-5} ` 或行尾 `// [!code highlight]` |
| 代码块增删 | 行尾 `// [!code ++]` / `// [!code --]` |
| 代码块聚焦 | 行尾 `// [!code focus]` |

> 自定义组件放 `app/components/mdc/`,覆写内置 Prose 组件放 `app/components/content/`
> —— 两者注册方式不同,放错会静默失效,详见 [`CLAUDE.md`](./CLAUDE.md) 的「MDC 组件约定」。

### 插图

放在 `public/images/`,markdown 里用 `/images/x.webp` 引用。**图片要在提交前压好、定好尺寸**
(正文栏宽 672px,按 2x 屏取 1344px 宽,格式 WebP);项目不接图片优化模块,原因见 `CLAUDE.md`。
构建期有守卫:产物里任何 `<img src>` 指向不存在的文件都会让构建失败。

## 搜索

头部主题切换按钮左侧的入口,或按 <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> 唤起。全文搜索,
结果按文章分组、直达对应小节的锚点;<kbd>↑</kbd><kbd>↓</kbd> 选择,<kbd>↵</kbd> 打开,
<kbd>Esc</kbd> 关闭。

实现是三段式,没有引入任何搜索库或外部服务:

| 环节 | 位置 | 说明 |
| :--- | :--- | :--- |
| 索引 | `server/routes/search-index.json.ts` | 构建期预渲染成静态 JSON(当前 18KB / gzip 6.8KB),按 h2/h3 切成小节 |
| 匹配 | `app/utils/search.ts` | 纯函数:空格拆词取 AND,按 标题 > 标签 > 面包屑 > 正文 分档排序 |
| 界面 | `app/components/SearchDialog.vue` | 首次打开时才拉索引,不进首屏 |

**为什么不用现成的搜索库**:它们对中文清一色走分词,而分词切不准就会静默漏搜 ——
实测 `Intl.Segmenter` 把「高亮标注」切成「高亮 / 标 / 注」,搜「标注」直接返回空数组,
不报错也不告警。中文没有词形变化,子串匹配反而近乎完美,代价只是线性扫描 ——
而几十篇的语料全量扫一遍是 0.004ms 量级。详见 `CLAUDE.md` 的「搜索约定」。

## 可用命令

所有命令均在项目根目录执行:

| 命令 | 说明 |
| :--- | :--- |
| `pnpm new "标题" [slug]` | 新建文章(自动填 frontmatter,`date` 取当天,默认 `draft: true`) |
| `pnpm dev` | 启动开发服务器(`localhost:3000`) |
| `pnpm build` | 构建静态站点至 `.output/public/` |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm lint` | 检查代码规范 |
| `pnpm lint:fix` | 自动修复代码规范问题 |
| `pnpm typecheck` | 类型检查(`nuxt typecheck`,底层是 vue-tsc) |
| `pnpm test` | 跑纯函数单测(Vitest) |
| `pnpm test:watch` | 单测 watch 模式 |
| `pnpm verify:build` | 对 `.output/public` 单独跑一遍产物断言(构建时会自动跑) |

## 项目结构

```text
/
├── public/                    # 静态资源,原样拷贝至产物根目录
│   └── images/                # 正文插图(提交前压好、定好尺寸)
├── content/blog/*.md          # 文章正文
├── content.config.ts          # Content collection schema(根级)
├── scripts/
│   ├── new-post.ts            # pnpm new 的实现
│   ├── verify-build.ts        # 产物断言(构建期自动跑)
│   └── lib/slugify.ts         # slug 推导,供脚手架与单测共用
├── test/                      # 纯函数单测
├── vitest.config.ts
├── shared/utils/posts.ts      # app 与 server 双向自动导入 —— 草稿过滤的唯一真源
├── server/
│   ├── routes/rss.xml.ts      # RSS 订阅源(Nitro 路由)
│   ├── routes/search-index.json.ts  # 搜索索引(构建期生成的静态 JSON)
│   └── utils/xml.ts           # XML 转义(抽出来才可单测)
├── app/
│   ├── app.vue
│   ├── error.vue              # nuxt generate 据此产出根级 404.html
│   ├── config.ts              # 站点配置(站名/描述/域名)的唯一真源
│   ├── mdc.config.ts          # Shiki transformer(必须在 app/ 下,MDC 按 srcDir 扫描)
│   ├── assets/css/            # 只放"不属于任何单个组件"的样式
│   │   ├── global.css         # 入口,只做 @import 汇总
│   │   ├── tokens.css         # 双主题语义变量
│   │   ├── reset.css          # 手写 reset
│   │   ├── links.css          # 三种可点击文本样式(多组件共用)
│   │   └── prose.css          # 文章正文排版
│   ├── components/            # 自动导入;组件专属样式写在各自 SFC 的 <style> 里
│   │   ├── OgImage/           # OG 分享图模板(Vue 组件,构建期由 Chrome 渲染)
│   │   ├── content/           # 覆写内置 Prose 组件(ProsePre / ProseTable / ProseImg)
│   │   └── mdc/               # 自定义 MDC 组件(Callout / Demo / Illustration)
│   ├── pages/                 # 文件路由(index、about、posts/[slug]、tags/[tag])
│   └── utils/                 # posts.ts(取数层)、search.ts(搜索匹配)、clipboard.ts
├── nuxt.config.ts             # Nuxt 配置(含防闪烁内联脚本、Shiki 双主题)
├── uno.config.ts              # UnoCSS 配置(含跳过 SFC <style> 的自定义提取器)
├── eslint.config.js           # ESLint 配置
└── commitlint.config.ts       # 提交信息规范
```

## 部署

构建产物为纯静态文件,可托管于任意静态文件服务器,无需 Node 运行时:

```bash
pnpm build
npx serve .output/public
```

线上域名已核对为 `https://huberyyang.site:87`(`app/config.ts` 的 `SITE.url`,canonical、
sitemap、RSS 与 OG 图均依赖该值生成绝对 URL;格式约束——必须 https、无尾斜杠、无路径段——
由 `test/config.test.ts` 硬守)。push 到 `main` 后由 GitHub Actions(`.github/workflows/deploy.yml`)
自动构建部署:依次跑 lint / typecheck / test / build,全部通过才会同步到生产服务器,进度与失败
日志见仓库 Actions 页面。

站点同时输出:

- `/sitemap.xml` —— 由 `@nuxtjs/sitemap` 生成
- `/rss.xml` —— 订阅源,与站点共用同一套草稿过滤逻辑
- `/404.html` —— 静态托管平台按约定用作兜底页
- `/_og/s/*.png` —— OG 分享图,构建期用 Chrome 渲染 `app/components/OgImage/` 下的模板

> 构建需要本机可用的 Chrome/Chromium。找不到时渲染器会**静默禁用** —— 构建照样成功、
> 本地预览也看不出异常,只有别人分享链接、卡片没图时才暴露。因此构建期会跑一遍产物断言
> (`scripts/verify-build.ts`):og 图或正文图片缺失、草稿泄进订阅源、MDC 组件没渲染出来、
> 代码块覆写失效……任意一项不通过就让构建失败。也可以事后单独跑 `pnpm verify:build`。

## 相关文档

- [`CLAUDE.md`](./CLAUDE.md) —— 项目级开发约定

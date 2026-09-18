# 选型理由与已否决的方案

> 想换掉或新增一个依赖之前读。约束本身(版本要锁死、要在哪放行)在
> [`CLAUDE.md`](../CLAUDE.md)「技术栈速览」,这里是"为什么是它"。

## OG 分享图:为什么是 Browser 渲染器

`nuxt-og-image` 的模板在 [`app/components/OgImage/`](../app/components/OgImage/),走
Browser(Chrome)渲染器。

选它而非 satori / takumi,是因为后两者**不能用系统字体**:中文要另行内嵌 Noto Sans SC,
且模块文档没有 CJK 章节。走 Chrome 直接吃系统 PingFang SC,CSS 支持也完整。

## 首页标题特效:为什么是 ogl 而不是 three.js

`ogl` 是轻量 WebGL 库,约 20 KB gzip。three.js 约 170 KB gzip,是它的八倍多,为首页一个
单词不划算。

更要命的是 three 的 `TextGeometry` 那条路走不通:three 的 npm 包**不含** `examples/fonts/`
(只有 `examples/jsm/`),需要额外准备 typeface JSON 字体文件 + 一套 ttf 转换流程,转出来的
字形还和站点正文的系统字体对不上。

实现与踩过的坑见 [`hero-title.md`](hero-title.md)。

## RSS:为什么是手写 Nitro 路由

Nuxt 没有官方 RSS 模块,所以 [`server/routes/rss.xml.ts`](../server/routes/rss.xml.ts) 是手写的。
站点地图有官方方案(`@nuxtjs/sitemap`),照用。

手写带来的连带约束:转义逻辑抽进 [`server/utils/xml.ts`](../server/utils/xml.ts) 才可单测;
草稿过滤必须复用 [`shared/utils/posts.ts`](../shared/utils/posts.ts),不能在 Nitro 侧另写一遍。

## 已经评估并否决的

| 方案 | 结论 | 详见 |
| :--- | :--- | :--- |
| `@nuxt/ui` 组件库 | 不采用,已回滚 | [`nuxt-ui-evaluation.md`](nuxt-ui-evaluation.md) |
| 图片优化模块 | 刻意不接 —— 预渲染爬虫不扫 `<img src>`,产物会指向从未生成的文件且不报错 | `CLAUDE.md`「图片约定」 |
| 搜索库(FTS5 / Pagefind / MiniSearch / Fuse) | 不采用 —— 中文分词会静默漏搜 | [`search.md`](search.md) |
| `remark-smartypants` | 不启用 —— 会把中文开引号转反 | `CLAUDE.md`「写文章约束」 |
| UnoCSS 自定义 `extractorDefault` | 不写 —— 正则分不清真样式块和注释,踩中时整页工具类静默消失 | [`uno.config.ts`](../uno.config.ts) 顶部注释 |

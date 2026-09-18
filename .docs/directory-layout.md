# 目录结构

> 新增文件不确定放哪时读。约束性的五条核心原则在 [`CLAUDE.md`](../CLAUDE.md)「目录结构约定」,
> 这里只是布局与位置规则。

```
content.config.ts        # collection schema(根级)
content/blog/*.md        # 文章正文
vitest.config.ts         # 只跑 test/ 下的纯函数单测
test/                    # 单测。被测对象必须是纯函数 —— 测不了通常说明计算和取数缠在一起了
scripts/
├── new-post.ts          # pnpm new
├── verify-build.ts      # 产物断言(构建钩子调用 + pnpm verify:build 单独跑)
└── lib/slugify.ts       # 供 new-post 与单测共用(new-post 顶层有副作用,不能直接 import)
public/images/           # 正文插图(见 CLAUDE.md「图片约定」)
shared/utils/            # app 与 server 双向自动导入(草稿过滤真源放这里)
server/
├── routes/              # Nitro 路由(rss.xml.ts、search-index.json.ts)
└── utils/               # server 侧自动导入(xml.ts 的 escapeXml —— 抽出来才可单测)
app/
├── app.vue
├── error.vue            # nuxt generate 据此产出根级 404.html
├── config.ts            # 站点级常量,同时被 nuxt.config.ts 导入 → 只能放纯常量
├── mdc.config.ts        # Shiki transformer;**必须在 app/ 下**,见下方说明
├── router.options.ts    # 滚动行为
├── assets/css/          # 只放"不属于任何单个组件"的样式,见 CLAUDE.md「样式归属」
│   ├── global.css       # 入口,只做 @import 汇总,不写规则
│   ├── tokens.css       # 双主题语义变量
│   ├── reset.css        # 手写 reset
│   ├── links.css        # 三种可点击文本样式(多组件共用)
│   └── prose.css        # 正文排版,作用于 markdown 产出的 DOM
├── components/          # 自动导入,含 BaseLayout / PostLayout / SearchTrigger / SearchDialog
│   ├── OgImage/         # nuxt-og-image 的模板(Browser 渲染器)
│   ├── content/         # 覆写内置 Prose 组件(ProsePre / ProseTable / ProseImg)
│   └── mdc/             # 自定义 MDC 组件(Callout 族 / Demo 族 / Illustration)
├── pages/               # 文件路由
└── utils/               # 仅 app 侧自动导入:
                         #   posts.ts(取数层)、search.ts(搜索匹配)、badges.ts(徽章解析)、
                         #   clipboard.ts、error-copy.ts、animation.ts、
                         #   ambient-glow.ts + hero-particles.ts(首页背景)
```

## `app/mdc.config.ts` 不能放仓库根

MDC 按 `srcDir` 扫描该文件,Nuxt 4 的 srcDir 是 `app/`;放错位置**不报错**,只是配置被静默忽略
(`.nuxt/mdc-configs.mjs` 里仍是空数组),代码块照常渲染而标记语法不生效。

注意它与 [`content.config.ts`](../content.config.ts) 的位置规则**相反** —— 后者由 Content 模块
从仓库根扫描。

## 文档目录

| 目录 | 内容 |
| :--- | :--- |
| `.docs/` | 叙述性文档,索引见 [`README.md`](README.md) |
| [`docs/agents/`](../docs/agents/) | agent skill 的运行时配置。**路径被 skill 硬编码,不能挪** |

# CLAUDE.md

本文件为项目级约定,供 Claude Code 在本仓库工作时参考。全局约定见 `~/.claude/CLAUDE.md`。

## 项目概览

Markdown 驱动的静态个人博客,风格克制极简,Nuxt 4 + @nuxt/content,双主题切换。

## 技术栈速览

- 包管理器:pnpm;语言:TypeScript(strict)
- 核心:`nuxt`(4.x,`nuxt generate` 出纯静态)+ `@nuxt/content`(3.x)
- 内容层:根级 `content.config.ts` 定义 collection,zod schema;markdown 放 `content/blog/`
- 样式:`unocss` + `@unocss/nuxt`,`darkMode: 'class'`,手写 reset(不开 `injectReset`)
- 站点地图:`@nuxtjs/sitemap`;RSS:`server/routes/rss.xml.ts` 手写 Nitro 路由(Nuxt 无官方 RSS 模块)
- 站点语言的唯一真源是 `app/config.ts` 的 `SITE.locale`:`<html lang>`、日期格式化、
  RSS 的 `<language>`、标签排序的 collation 四处同源,不要再各自硬编码 `'zh-CN'`
- OG 分享图:`nuxt-og-image`,Browser(Chrome)渲染器,模板在 `app/components/OgImage/`。
  选 Browser 而非 satori/takumi 是因为后两者不能用系统字体,中文需另行内嵌 Noto Sans SC,
  且模块文档没有 CJK 章节;走 Chrome 直接吃系统 PingFang SC,CSS 支持也完整
- MDC:markdown 里可直接调用 Vue 组件(`::note`、`:demo-counter`、`[文字]{.class}`)。
  能力由 `@nuxt/content` 传递依赖的 `@nuxtjs/mdc` 提供,**无需额外模块**;`@nuxtjs/mdc` 在
  package.json 里显式声明只是为了让 `app/mdc.config.ts` 能 import 到它(pnpm 严格布局下
  传递依赖从根目录解析不到),版本必须锁死与 `@nuxt/content` 依赖的一致
- 代码块标记:`@shikijs/transformers`,在 `app/mdc.config.ts` 注册
- 代码规范:`@antfu/eslint-config` + `@unocss/eslint-plugin`
- 测试:`vitest`,只跑纯函数单测(`test/`);需要真实运行时才能验证的东西交给产物断言,见下方「守门机制」
- Git 规范:`@huberyyang/todo-scripts` 的 `commitlint-init` 接入 commitlint + husky + lint-staged。
  钩子分工:`pre-commit` 跑 lint-staged、`commit-msg` 跑 commitlint、`pre-push` 跑 typecheck + 单测。
  项目**没有 CI**,`pre-push` 是唯一自动执行的关卡
- `better-sqlite3` 是 `@nuxt/content` 的存储后端(v3 把内容层从文件改为 SQL),原生模块,
  需要在 `pnpm-workspace.yaml` 的 `allowBuilds` 里放行

## 待办提醒

- ⚠️ `app/config.ts` 的 `SITE.url` 仍是**暂定域名** `https://blog.hubery.dev`,上线前需与实际部署地址核对,
  核对完把同文件的 `urlConfirmed` 改成 `true`。在那之前每次构建都会打印告警。
  **刻意不做成构建失败** —— 域名没核对是"还没上线",不是"构建坏了",拿它挡住日常开发得不偿失;
  而格式层面的约束(必须 https、无尾斜杠、无路径段)由 `test/config.test.ts` 硬守,那些写错是真会静默出错的。
- 🔍 **搜索功能尚未实现**。两条可选路径:`@nuxt/content` 自带的 FTS5 全文搜索(与内容层同源,
  但会拉取 844KB 的 WASM SQLite + 内容 dump),或用 pagefind CLI 做 postbuild 并自写 Vue 弹层 UI。

## 目录结构约定

```
content.config.ts        # collection schema(根级)
content/blog/*.md        # 文章正文
vitest.config.ts         # 只跑 test/ 下的纯函数单测
test/                    # 单测。被测对象必须是纯函数 —— 测不了通常说明计算和取数缠在一起了
scripts/
├── new-post.ts          # pnpm new
├── verify-build.ts      # 产物断言(构建钩子调用 + pnpm verify:build 单独跑)
└── lib/slugify.ts       # 供 new-post 与单测共用(new-post 顶层有副作用,不能直接 import)
public/images/           # 正文插图(见「图片约定」)
shared/utils/            # app 与 server 双向自动导入(草稿过滤真源放这里)
server/
├── routes/              # Nitro 路由(RSS)
└── utils/               # server 侧自动导入(escapeXml —— 抽出来才可单测)
app/
├── app.vue
├── error.vue            # nuxt generate 据此产出根级 404.html
├── config.ts            # 站点级常量,同时被 nuxt.config.ts 导入 → 只能放纯常量
├── mdc.config.ts        # Shiki transformer;**必须在 app/ 下**,见下方说明
├── assets/css/          # 只放"不属于任何单个组件"的样式,见「样式归属」
│   ├── global.css       # 入口,只做 @import 汇总,不写规则
│   ├── tokens.css       # 双主题语义变量
│   ├── reset.css        # 手写 reset
│   ├── links.css        # 三种可点击文本样式(多组件共用)
│   └── prose.css        # 正文排版,作用于 markdown 产出的 DOM
├── components/          # 自动导入,含 BaseLayout / PostLayout
│   ├── content/         # 覆写内置 Prose 组件(ProsePre / ProseTable / ProseImg)
│   └── mdc/             # 自定义 MDC 组件(Callout / Demo / Illustration)
├── pages/               # 文件路由
└── utils/               # 仅 app 侧自动导入(取数层 posts.ts、clipboard.ts)
```

- `app/mdc.config.ts` **不能放仓库根**。MDC 按 `srcDir` 扫描该文件,Nuxt 4 的 srcDir 是 `app/`;
  放错位置**不报错**,只是配置被静默忽略(`.nuxt/mdc-configs.mjs` 里仍是空数组),代码块照常
  渲染而标记语法不生效。注意它与 `content.config.ts` 的位置规则相反 —— 后者由 Content 模块从仓库根扫描。

核心原则:

- **页面不直接调 `queryCollection`**。取数一律走 `app/utils/posts.ts`,页面只负责渲染。
  三处各写各的取数会让"文章数据从哪来"没有统一答案,是新人最容易迷路的地方。
- **取数函数拆成两半**:`xxx()` 碰数据库,`pureXxx()` 只做计算(排序、分组、找相邻)。
  拆开是为了纯逻辑能单测 —— 而这些恰恰是最容易写错、错了又最难一眼看出的部分(顺序反了、边界少一项)。
  **一个函数"没法单测",通常就是这两半缠在一起的信号。**
- **草稿过滤的唯一真源是 `shared/utils/posts.ts` 的 `isPublishedPost()`**。RSS 是 Nitro 路由,
  拿不到 app 侧的取数函数;若在两边各写一遍过滤条件,改动其一就会出现"站点上看不到、订阅源里却推送了"的漏网。
  同样拆成两半:`isVisiblePost(post, includeDrafts)` 是纯判定,`isPublishedPost()` 只负责把
  `import.meta.dev` 喂进去 —— 环境判断写死在判定里的话,单测永远只能覆盖到生产那一支。
- 正文容器 `.prose` 由 `ContentRenderer` 自己承担(`<ContentRenderer class="prose">`),
  **不要再在外面套一层 `<div class="prose">`** —— ContentRenderer 自带根元素,
  外面再包一层会让 `.prose > * + *` 只匹配到那个包装层,全文段落间距整体丢失。
- **路径一律不带尾斜杠**(`/about`、`/posts/<slug>`),链接、canonical、sitemap、RSS 四者对齐。
  不要为了"看起来像目录"去加尾斜杠:Nuxt 会把静态页按原生形式自动加入预渲染,爬虫又会从带斜杠的
  链接发现另一种形式,**两条路由抢写同一个 `index.html`**,产出末尾带残留字节的畸形 HTML,且不报错。
  这个坑已经踩过一次。

## MDC 组件约定

- **两个目录分工不同,不能混放**:

  | 目录 | 注册方式 | 放什么 |
  | :--- | :--- | :--- |
  | `app/components/mdc/` | MDC 模块注册,带 `global: true` | 自定义组件(`::note`、`::demo`、`::illustration`) |
  | `app/components/content/` | Content 模块注册,**不带 global** | 覆写内置 Prose 组件(`ProsePre`/`ProseTable`/`ProseImg`) |

  `MDCRenderer` 运行时走 Vue 的 `resolveComponent`,只认全局注册。自定义组件放进 `content/`
  不会报错,只会在页面上留下原样的 `::组件名`。

- **组件名不能与任何 HTML 标签重名**。MDC 解析节点时先查一遍原生标签表(`ignoreTag()`),命中的
  名字直接按元素渲染,压根不去找同名组件 —— `::figure` 会变成一个裸 `<figure>`,props 原样挂成
  属性、内容完全不渲染,**且不报错**。`figure` / `header` / `aside` / `section` / `main` / `dialog`
  / `menu` 都在表里。插图组件因此叫 `Illustration` 而非 `Figure`。

- **组件属性值里不要用转义引号**(`title="…\"x\""`)。`\"` 不会被识别成转义,整个块直接不解析、
  原样当普通文字输出,同样不报错。需要引号时换个说法绕开。

- 图标类名必须是**源码里的字面量**(`'i-ph-info'`),不能拼接(`` `i-ph-${type}` ``)。UnoCSS 靠扫描
  源码文本收集候选类名,拼接结果不在源码里,产物中就没有对应规则,图标是空的。

## 样式归属

**判断标准是使用者数量,不是样式的"重要程度"。**

| 使用者 | 写在哪 |
| :--- | :--- |
| 只有一个组件 | 该组件 SFC 的 `<style>`(**不加 `scoped`**,理由见下) |
| 多个组件,或作用于 markdown 产出的 DOM | `app/assets/css/` 下对应的全局文件 |

- 一律用 `var(--c-*)` 语义变量手写 CSS,不用 UnoCSS 工具类表达组件外观 ——
  这样样式层与工具类框架解耦,将来换框架时正文与组件外观都不用动。
- **`<style>` 不要加 `scoped`**:`scoped` 对插槽内容无效(插槽内容带的是父组件的 scope 属性),
  `.callout-body > * + *` 这类作用于 slot 的规则会直接失效。
- **跨组件边界的选择器留在全局**。`.prose pre` 横跨 `[slug].vue` 与 `ProsePre.vue`,
  归 `prose.css`;`ProsePre` 自己的外框(`.code-block*`)才写进组件。
- **UnoCSS 会扫 `<style>` 块里的 CSS 属性值当类名候选**(`backdrop-filter:` → 生成 `.backdrop-filter`,
  `animation: … ease-out` → `.ease-out`),凭空产出没人使用的规则。`uno.config.ts` 里已用自定义
  `extractorDefault` 在提取前剥掉 `<style>` 块堵住这条。注意 `content.pipeline.exclude` **不管用** ——
  那个按模块 id 过滤,而 UnoCSS 扫的是整个 `.vue` 文件,不是 Vite 拆出来的 `?vue&type=style` 子模块。
- **reset 已预置 `border-style: solid; border-width: 0`**,用边框工具类直接写 `border-b` 即可,
  不需要再补 `border-0` / `border-solid`。(CSS 的 `border-style` 初始值是 `none`,而 `none` 会把
  任何宽度折算成 0 —— 不预置的话每个用边框的地方都得踩一次,还得各写一段注释解释。)
- **链接必须挂 `.tinter` 或 `.highlighter`**。全局 `a` 规则是 `color: inherit` + 无下划线,
  且没有通用 `a:hover` —— 不挂样式的链接与周围纯文本在视觉上完全无法区分,悬停也毫无反馈。
- **不要留没有定义的类名**。`class="copy-contact"` 这种"看起来像钩子、实际零样式"的名字会误导下一个人
  去找它的定义。要么给它写样式,要么删掉。

## 图片约定

- 正文插图放 `public/images/`,markdown 里用站内绝对路径引用(`/images/x.webp`)。
- **图片在提交进仓库前就要压好、定好尺寸**:正文栏宽 672px,按 2x 屏取 1344px 宽即可,格式用 WebP。
- **刻意不接图片优化模块**。那类模块靠构建期生成各尺寸落盘,而 Nitro 的预渲染爬虫只从 `href`
  属性发现链接(`extractLinks` 里 `if (!node.attributes?.href) return`),`<img src>` 与 `srcset`
  完全不在扫描范围 —— HTML 里的地址指向从未生成的文件,构建照样成功,只有线上访问才发现图裂了。
  为一点体积收益引入一个没有兜底的静默失败,不划算。
- 产物里任何 `<img src>` 指向不存在的文件都会让构建失败,见下方「守门机制」。

## 守门机制

本项目遇到的故障有同一个形状:**构建成功、页面照常渲染、只是某块东西凭空消失**
(渲染器找不到 Chrome 就静默禁用;MDC 组件名撞 HTML 标签就被当原生元素渲染;
配置文件放错目录就被忽略)。因此分两层守:

| 层 | 位置 | 守什么 | 怎么跑 |
| :--- | :--- | :--- | :--- |
| 纯函数单测 | `test/` | 排序、分组、找相邻、转义、slug 推导、`SITE.url` 格式 | `pnpm test` |
| 产物断言 | `scripts/verify-build.ts` | og 图存在、图片存在、草稿未外泄、MDC 组件真的渲染了、无未解析的 `::语法` 残留、`ProsePre` 覆写生效、`PostNav` 接线 | 构建期自动跑;`pnpm verify:build` 单独跑 |

- **上线的是产物,不是测试里的那个副本** —— 凡是"没有兜底的静默失败"都归产物断言,不要试图用
  模拟环境在单测里复现。
- **产物断言必须逐篇核对,不能全站汇总**。汇总会让单页失效被其他页面掩盖(某篇代码块渲染坏了,
  只要别的文章还正常就查不出来)。这条检查最初写成了汇总,靠"故意弄坏一页"的演练才暴露。
- **加了守卫就要故意破坏一次,确认它真的会失败**。守卫不报错 ≠ 守卫有效。
- 校验逻辑放外部文件而非内联进 `nuxt.config.ts`:那样能单独跑,修完不必重新构建一遍才能验证。

## 注释约定

- **重构 = 不再使用旧技术栈,代码与文档里也不留它的痕迹**。迁移完成后不要写"迁移前 X 是……"
  "对齐 X 的产出"这类表述 —— 迁移动机属于 git history,`git log` 查得到,不必在代码里重复一遍。
- 但删之前必须区分两类注释,**只删前者**:

  | 类型 | 例子 | 处理 |
  | :--- | :--- | :--- |
  | 为什么迁移 | 旧方案叫什么、旧产物长什么样、当初为何换掉 | 删 |
  | 为什么这段代码现在长这样 | 当前技术栈的行为、踩过的坑、被否决的选项及原因 | **留**,但改写成不提旧技术栈的表述 |

- 判据:**把旧技术栈的名字遮住再读一遍**。剩下的句子如果仍在解释当前代码的因果(如"加尾斜杠会让两条
  路由抢写同一个 `index.html`"、"smartypants 会把 CJK 开引号转反"),就保留并改写;如果剩下的只是
  "以前不是这样",就删掉。
- 同理适用于本文件:清理代码注释时,`CLAUDE.md` 里与之冲突的规则要同步改,否则下次会话会按旧规则把
  注释加回来。

## 文档同步规则

- **README.md**:随项目推进同步更新,格式遵循社区规范(标准分节:项目简介 / 安装 / 使用 / 开发 / License 等),
  不要让它与实现脱节。

## 写文章约束

- 新建文章用 `pnpm new "标题" [slug]`,不要手写 frontmatter —— `date` 手打容易错(错一天不报错,
  只会让排序与前后篇导航悄悄错位)。中文标题推导不出 ASCII slug 时脚本会要求显式传入,不擅自音译。
- ESLint 会把 Markdown 里的 `ts` / `js` 代码块当**独立源文件**解析。贴不完整的语法片段(如裸的 `theme: { ... }`
  对象字面量)会报 `Parsing error: Expression expected`,且无法自动修复。两种解法:把片段补成语法完整的代码
  (包进 `export default defineConfig({ ... })` 之类),或换用不参与 lint 的语言标签(如 ```text)。
- **中文引号要直接打 `“”`,不要指望自动转换**。本项目不启用 `remark-smartypants` —— 它会把 `到"标题"`
  的开引号也转成收引号(`到”标题”`),方向是错的、比不转更糟。

## 视觉效果实现注意事项

- 做"参考某网站背景效果 / 全屏效果"这类需求时,背景层默认应相对**视口**铺满,不要顺手塞进内容列的窄栏容器里——放进去会被 `max-w-2xl` 之类的宽度约束死,看起来像页面中间一块孤立色块。全屏/常驻背景层优先用 `position: fixed; inset: 0`:天然相对视口定位、不参与文档流,不需要 `100vw` 破框 hack,也没有滚动条宽度导致横向滚动条的风险。前提是从该元素到视口之间的祖先节点都不能有 `transform` / `filter` / `perspective` / `contain`(这些会重新建立包含块,使 `fixed` 元素相对该祖先而非视口定位)。

## Agent skills

### Issue tracker

Issues 通过 GitHub Issues 管理(仓库 `Hub-yang/my-blog`),使用 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Domain docs

单上下文(single-context)布局:领域文档若存在,`CONTEXT.md` 与 `docs/adr/` 位于仓库根目录。两者目前均未创建,由 `/domain-modeling` 在术语或决策真正需要沉淀时惰性生成 —— 缺失属预期,不必主动补建。详见 `docs/agents/domain.md`。

# CLAUDE.md

本文件为项目级约定,供 Claude Code 在本仓库工作时参考。全局约定见 `~/.claude/CLAUDE.md`。

这里只放**约束性内容**:现役禁令、跨文件的隐式契约、踩过的坑及其理由。叙述性内容
(选型对比、目录树、评估记录、实现笔记)外放在 [`.docs/`](.docs/README.md),按索引取用。

## 每次必读

没有触发条件可挂的两件事,不要等索引提醒:

- **每次开工** → 先读本文件,再按 [`.docs/README.md`](.docs/README.md) 的索引连接项目上下文。
- **每次提交** → 走 `/commit` skill,不要手写 `git add` + `git commit` 绕过去 ——
  skill 里有本项目的具体规则,手动操作容易漏掉。

## 项目概览

Markdown 驱动的静态个人博客,风格克制极简,Nuxt 4 + @nuxt/content,双主题切换。

## 触发式索引

| 改什么之前 | 读哪份 | 不读的后果 |
| :--- | :--- | :--- |
| 改 [`app/components/HeroTitle.vue`](app/components/HeroTitle.vue) 或它的 shader | [`.docs/hero-title.md`](.docs/hero-title.md) | 把画布的 `max-width` 解除当冗余删掉(字变小并错位),或把真文本从 `<h1>` 挪进 canvas(搜索引擎拿到空标题) |
| 改徽章的预设表、解析或渲染 | [`.docs/badges.md`](.docs/badges.md) | 把拼错的 key 静默滤掉,或把 schema 的 `z.enum` 当成有效防线 —— 两者都会让构建照常绿而页面少东西 |
| 改搜索索引、匹配或分段 | [`.docs/search.md`](.docs/search.md) | 换成分词搜索库会静默漏搜中文;新增 `fetch` 出来的路由不列进预渲染会在线上 404 |
| 改 pnpm 配置、升级 pnpm,或提交钩子报错 | [`.docs/pnpm-and-hooks.md`](.docs/pnpm-and-hooks.md) | 把 `verifyDepsBeforeRun: false` 当冗余删掉,提交在无 TTY 环境下直接失败,报错还看不出跟提交有关 |
| 在浏览器里验证改动,或改完 markdown 页面没变 | [`.docs/verification-traps.md`](.docs/verification-traps.md) | 拿旧模块、旧数据库的表现当结论,或把后台标签页的环境限制当成代码缺陷去"修" —— 两种都踩过,各作废几轮"验证通过" |
| 想换掉或新增一个依赖 | [`.docs/stack-decisions.md`](.docs/stack-decisions.md) | 重新踩一遍已经评估并否决过的方案 |
| 新增文件不确定放哪 | [`.docs/directory-layout.md`](.docs/directory-layout.md) | `app/mdc.config.ts` 之类放错位置不报错,配置被静默忽略 |

## 技术栈速览

- 包管理器:pnpm;语言:TypeScript(strict)
- 核心:`nuxt`(4.x,`nuxt generate` 出纯静态)+ `@nuxt/content`(3.x)
- 内容层:根级 [`content.config.ts`](content.config.ts) 定义 collection,zod schema;markdown 放 [`content/blog/`](content/blog/)
- 样式:`unocss` + `@unocss/nuxt`,`darkMode: 'class'`,手写 reset(不开 `injectReset`)
- 站点地图:`@nuxtjs/sitemap`;RSS 是手写 Nitro 路由 [`server/routes/rss.xml.ts`](server/routes/rss.xml.ts)
- OG 分享图:`nuxt-og-image`,Browser(Chrome)渲染器,模板在 [`app/components/OgImage/`](app/components/OgImage/)
- 首页标题特效:`ogl`(轻量 WebGL 库),组件是 [`app/components/HeroTitle.vue`](app/components/HeroTitle.vue)
- MDC:markdown 里可直接调用 Vue 组件(`::note`、`:demo-counter`、`[文字]{.class}`)
- 代码块标记:`@shikijs/transformers`,在 [`app/mdc.config.ts`](app/mdc.config.ts) 注册
- 代码规范:`@antfu/eslint-config` + `@unocss/eslint-plugin`
- 测试:`vitest`,只跑纯函数单测([`test/`](test/));需要真实运行时才能验证的东西交给产物断言,见下方「守门机制」
- Git 规范:`@huberyyang/todo-scripts` 的 `commitlint-init` 接入 commitlint + husky + lint-staged

三条跨文件约束:

- **站点语言的唯一真源是 [`app/config.ts`](app/config.ts) 的 `SITE.locale`**:`<html lang>`、
  日期格式化、RSS 的 `<language>`、标签排序的 collation 四处同源,不要再各自硬编码 `'zh-CN'`。
- **MDC 能力由 `@nuxt/content` 传递依赖的 `@nuxtjs/mdc` 提供,无需额外模块**。它在
  [`package.json`](package.json) 里显式声明只是为了让 `app/mdc.config.ts` 能 import 到它
  (pnpm 严格布局下传递依赖从根目录解析不到),**版本必须锁死与 `@nuxt/content` 依赖的一致**。
- **`better-sqlite3` 要在 [`pnpm-workspace.yaml`](pnpm-workspace.yaml) 的 `allowBuilds` 里放行** ——
  它是 `@nuxt/content` 的存储后端(v3 把内容层从文件改为 SQL),原生模块。

## 目录结构约定

完整目录树与 `app/mdc.config.ts` 的位置规则见 [`.docs/directory-layout.md`](.docs/directory-layout.md)。
以下是不能破的五条:

- **页面不直接调 `queryCollection`**。取数一律走 [`app/utils/posts.ts`](app/utils/posts.ts),
  页面只负责渲染。三处各写各的取数会让"文章数据从哪来"没有统一答案,是新人最容易迷路的地方。
- **取数函数拆成两半**:`xxx()` 碰数据库,`pureXxx()` 只做计算(排序、分组、找相邻)。
  拆开是为了纯逻辑能单测 —— 而这些恰恰是最容易写错、错了又最难一眼看出的部分(顺序反了、边界少一项)。
  **一个函数"没法单测",通常就是这两半缠在一起的信号。**
- **草稿过滤的唯一真源是 [`shared/utils/posts.ts`](shared/utils/posts.ts) 的 `isPublishedPost()`**。
  RSS 是 Nitro 路由,拿不到 app 侧的取数函数;若在两边各写一遍过滤条件,改动其一就会出现
  "站点上看不到、订阅源里却推送了"的漏网。
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
  | [`app/components/mdc/`](app/components/mdc/) | MDC 模块注册,带 `global: true` | 自定义组件(`::note`、`::demo`、`::illustration`) |
  | [`app/components/content/`](app/components/content/) | Content 模块注册,**不带 global** | 覆写内置 Prose 组件(`ProsePre`/`ProseTable`/`ProseImg`) |

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
| 多个组件,或作用于 markdown 产出的 DOM | [`app/assets/css/`](app/assets/css/) 下对应的全局文件 |

- 一律用 `var(--c-*)` 语义变量手写 CSS,不用 UnoCSS 工具类表达组件外观 ——
  这样样式层与工具类框架解耦,将来换框架时正文与组件外观都不用动。
- **`<style>` 不要加 `scoped`**:`scoped` 对插槽内容无效(插槽内容带的是父组件的 scope 属性),
  `.callout-body > * + *` 这类作用于 slot 的规则会直接失效。
- **跨组件边界的选择器留在全局**。`.prose pre` 横跨
  [`app/pages/posts/[slug].vue`](app/pages/posts/[slug].vue) 与
  [`app/components/content/ProsePre.vue`](app/components/content/ProsePre.vue),
  归 [`app/assets/css/prose.css`](app/assets/css/prose.css);`ProsePre` 自己的外框
  (`.code-block*`)才写进组件。
- **UnoCSS 会扫 `<style>` 块里的 CSS 属性值当类名候选**(`position: absolute` → 生成 `.absolute`,
  `animation: … ease-out` → `.ease-out`),产物里因此固定多出 8 条没人使用的死规则:
  `absolute` / `fixed` / `ease-in-out` / `ease-out` / `flex-shrink` / `h1` / `outline` /
  `tabular-nums`。**这是刻意接受的**,合计 444 B(压缩前,占工具类 CSS 的 1.5%),且与手写 CSS、
  模板类名零碰撞。**不要为它写自定义 `extractorDefault`** —— 理由写在
  [`uno.config.ts`](uno.config.ts) 顶部,一句话是:正则分不清真样式块和注释里提到的 `<style>`,
  踩中时整页工具类静默消失,而构建成功、且只在 dev 复现。注意 `content.pipeline.exclude` 也
  **不管用** —— 那个按模块 id 过滤,而 UnoCSS 扫的是整个 `.vue` 文件,不是 Vite 拆出来的
  `?vue&type=style` 子模块。
- **reset 已预置 `border-style: solid; border-width: 0`**,用边框工具类直接写 `border-b` 即可,
  不需要再补 `border-0` / `border-solid`。(CSS 的 `border-style` 初始值是 `none`,而 `none` 会把
  任何宽度折算成 0 —— 不预置的话每个用边框的地方都得踩一次,还得各写一段注释解释。)
- **链接必须挂 `.tinter` 或 `.highlighter`**。全局 `a` 规则是 `color: inherit` + 无下划线,
  且没有通用 `a:hover` —— 不挂样式的链接与周围纯文本在视觉上完全无法区分,悬停也毫无反馈。
- **不要留没有定义的类名**。`class="copy-contact"` 这种"看起来像钩子、实际零样式"的名字会误导下一个人
  去找它的定义。要么给它写样式,要么删掉。

## 图片约定

- 正文插图放 [`public/images/`](public/images/),markdown 里用站内绝对路径引用(`/images/x.webp`)。
- **图片在提交进仓库前就要压好、定好尺寸**:正文栏宽 672px,按 2x 屏取 1344px 宽即可,格式用 WebP。
- **刻意不接图片优化模块**。那类模块靠构建期生成各尺寸落盘,而 Nitro 的预渲染爬虫只从 `href`
  属性发现链接(`extractLinks` 里 `if (!node.attributes?.href) return`),`<img src>` 与 `srcset`
  完全不在扫描范围 —— HTML 里的地址指向从未生成的文件,构建照样成功,只有线上访问才发现图裂了。
  为一点体积收益引入一个没有兜底的静默失败,不划算。
- 产物里任何 `<img src>` 指向不存在的文件都会让构建失败,见下方「守门机制」。

## 守门机制

本项目遇到的故障有同一个形状:**构建成功、页面照常渲染、只是某块东西凭空消失**
(渲染器找不到 Chrome 就静默禁用;MDC 组件名撞 HTML 标签就被当原生元素渲染;
配置文件放错目录就被忽略)。因此层层都要守。

**代码离开本机前**,husky 钩子:`pre-commit` 跑 lint-staged、`commit-msg` 跑 commitlint、
`pre-push` 跑 typecheck + 单测。

**代码进仓库后**,GitHub Actions([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):
push 到 `main` 时依次跑 lint(全量 —— `lint-staged` 只查改动文件,这里补上全量)/ typecheck /
test / build(`build` 内含 `verify-build.ts` 产物断言),全部通过才会部署到生产服务器。
它是独立于本机环境的第二道关,专挡"绕开本机钩子"的路径(网页端改文件、`--no-verify`、直接 push)。
失败只挡"部署",不挡"代码进 main"(项目不设 PR 门禁)。

**代码本身**分两层守:

| 层 | 位置 | 守什么 | 怎么跑 |
| :--- | :--- | :--- | :--- |
| 纯函数单测 | [`test/`](test/) | 排序、分组、找相邻、转义、slug 推导、`SITE.url` 格式、搜索匹配与摘要分段(含中文不漏搜回归)、徽章解析(顺序稳定、draft 注入、未知 key 抛错) | `pnpm test` |
| 产物断言 | [`scripts/verify-build.ts`](scripts/verify-build.ts) | og 图存在、图片存在、草稿未外泄、MDC 组件真的渲染了、无未解析的 `::语法` 残留、`ProsePre` 覆写生效、`PostNav` 接线、徽章真的渲染了、搜索索引存在且每条锚点在页面上真实可达、首页 `<h1>` 里的标题文字仍在、文章正文非空且标题来自 frontmatter | 构建期自动跑;`pnpm verify:build` 单独跑 |

- **两层守卫常常管的不是同一件事,别以为有一层就够**。典型例子是徽章:产物断言查 HTML 里徽章
  有没有渲染出来,而 `.post-badge-<tone>` 的 **CSS 规则**在不在它查不到 —— 删掉那条规则,
  HTML 一个字都不变,只是徽章变成一段没有底色的裸小字,那一层得由单测读源码来守。
  完整说明见 [`.docs/badges.md`](.docs/badges.md)。

- **空 markdown 照样会产出一个完整页面**。标题退化成 slug 的词首大写版
  (`hero-liquid-text` → `Hero Liquid Text`)、日期落到 1970-01-01、正文一片空白,
  而逐篇核对里每一项都不触发 —— 没有组件可查、没有代码块可查、没有徽章可查,
  那个空壳还会被算进"N 篇文章逐页核对"的计数,读起来像是核对过了。
  产物断言因此单独查两项:正文非空、页面标题来自 frontmatter。
  这条踩过一次:一条改 frontmatter 的命令把 18 KB 草稿清成 0 字节,
  而 lint / typecheck / 单测 / 构建 / 产物断言**全部绿灯**,是肉眼看产物内容才发现的。

- **上线的是产物,不是测试里的那个副本** —— 凡是"没有兜底的静默失败"都归产物断言,不要试图用
  模拟环境在单测里复现。
- **产物断言必须逐篇核对,不能全站汇总**。汇总会让单页失效被其他页面掩盖(某篇代码块渲染坏了,
  只要别的文章还正常就查不出来)。这条检查最初写成了汇总,靠"故意弄坏一页"的演练才暴露。
- **加了守卫就要故意破坏一次,确认它真的会失败**。守卫不报错 ≠ 守卫有效。
- 校验逻辑放外部文件而非内联进 [`nuxt.config.ts`](nuxt.config.ts):那样能单独跑,修完不必重新构建一遍才能验证。

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

- **[`README.md`](README.md)**:随项目推进同步更新,格式遵循社区规范(标准分节:项目简介 / 安装 /
  使用 / 开发 / License 等),不要让它与实现脱节。
- **[`.docs/`](.docs/README.md)**:外放文档的正文改了,回头检查上面「触发式索引」里那条的
  **「不读的后果」还成不成立**。后果描述过时了,索引就失去了促使人去读的作用 —— 而这不会报错。
  新增一份 `.docs/` 文档,要同时加进 [`.docs/README.md`](.docs/README.md) 的表和索引表。
- **哪些内容该往外放**:判据是时态 —— 写不成「现在要/不要做什么」的句子就外放。
  外放时**整节搬走,不要把禁令留下、理由挪走**:没有理由的禁令会被下一个会话当成疏漏"顺手改正"。
  布局本身的来龙去脉见 [`.docs/claude-md-refactor.md`](.docs/claude-md-refactor.md)。

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

Issues 通过 GitHub Issues 管理(仓库 `HuberyYang-Space/my-blog`),使用 `gh` CLI 操作。
详见 [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)。

### Domain docs

单上下文(single-context)布局:领域文档若存在,`CONTEXT.md` 与 `docs/adr/` 位于仓库根目录。
两者目前均未创建,由 `/domain-modeling` 在术语或决策真正需要沉淀时惰性生成 —— 缺失属预期,
不必主动补建。详见 [`docs/agents/domain.md`](docs/agents/domain.md)。

**`docs/agents/` 的路径被 mattpocock-skills 硬编码引用,不要挪进 `.docs/`** —— 挪走后 skill
找不到文件,且不报错,只会安静地退化。

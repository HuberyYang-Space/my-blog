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
  钩子分工:`pre-commit` 跑 lint-staged、`commit-msg` 跑 commitlint、`pre-push` 跑 typecheck + 单测,
  是代码离开本机前的第一道关。CI 用 GitHub Actions(`.github/workflows/deploy.yml`),push 到
  `main` 时依次跑 lint(全量,`lint-staged` 只查改动文件,这里补上全量)/ typecheck / test /
  build(`build` 内含 `verify-build.ts` 产物断言),全部通过才会部署到生产服务器 —— 是独立于
  本机环境的第二道关,专挡"绕开本机钩子"的路径(网页端改文件、`--no-verify`、直接 push)。
  失败只挡"部署",不挡"代码进 main"(项目不设 PR 门禁)
- `better-sqlite3` 是 `@nuxt/content` 的存储后端(v3 把内容层从文件改为 SQL),原生模块,
  需要在 `pnpm-workspace.yaml` 的 `allowBuilds` 里放行

### pnpm 配置与钩子

- **pnpm 自己的设置只认 `pnpm-workspace.yaml`,写进 `.npmrc` 不生效**(camelCase 与 kebab-case 都读不到)。
  验证办法:`pnpm config get <key>` 返回 `undefined` 就说明没读到。`.npmrc` 只留给 npm 通用的东西(如 registry、认证)。
  这条坑在于**不报错** —— 一个看起来在配置、实际零作用的文件会让人误判问题已经解决。
- **`verifyDepsBeforeRun: false` 不要删**。pnpm 默认会在 `pnpm exec` / `pnpm run` 之前检查依赖是否与
  lockfile 同步,不同步就自行跑一次 `pnpm install`。而 `pre-commit` 里跑的正是 `pnpm exec lint-staged`,
  钩子又常在**无 TTY** 的环境下运行(GitHub Desktop、各类 GUI 客户端)——那次 install 一旦需要交互确认,
  就直接以 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 失败,提交被挡下,而报错内容全是 pnpm 内部调用栈,
  看不出跟"提交"或"你改的代码"有任何关系。**依赖同步是人的职责,不该由提交钩子代劳。**
- 同理,**不要为此改用 `confirmModulesPurge: false`**:关掉自动安装之后,该设置只在你手动跑 `pnpm install`
  时才生效,而"我要删光你的 node_modules"恰恰是那个场景下你应该看见的提示。它不是保险,是把唯一有用的招呼关掉。
- 升级 pnpm 大版本后,`node_modules/.modules.yaml` 里记的 `packageManager` 与 `storeDir` 会与当前 pnpm 失配,
  下一次 install 必然要删掉 `node_modules` 重建 —— 这是正常代价,在**终端里**跑一次 `pnpm install` 确认即可。
  (该文件在 pnpm 11 起内容是 JSON,按 YAML 的行首键去 grep 会扑空。)

### 本地开发的已知限制:markdown 编辑不会热更新

- **`@nuxt/content` 3.15.2(当前最新版)在自定义 collection 下,dev 模式改 `content/blog/*.md`
  不会触发页面更新**,需要手动重启 `pnpm dev` 才能看到最新内容。这是上游未解决的问题
  ([nuxt/content#3512](https://github.com/nuxt/content/issues/3512)),不是本项目配置错误。
- 现象具体是:Vite 能侦测到文件变化(日志打出 `Vite server hmr N files`),但内容库
  `.data/content/contents.sqlite` 不会重新写入 —— 文件改了,数据库时间戳却停在旧值,
  页面自然拿不到新内容。**日志"看起来在动"不代表内容真的更新了**,判断要看数据库或页面
  实际内容,不能只看有没有 HMR 日志。
- 已实测过的 workaround 均**无效**:升级到最新版(已是最新)、加
  `experimental: { watcher: 'chokidar' }`。项目当前不在 `nuxt.config.ts` 里保留这个配置项,
  没有理由留一段不起作用的代码。
- 目前的应对方式就是手动重启:改完 markdown,`Ctrl+C` 杀掉 `pnpm dev` 再重新跑一次。
  接受这个成本,不为它引入额外的自动重启脚本。

## 待办提醒

- ⚠️ 索引里的正文**不截断**。截断能省体积,但省下来的那一截恰恰是"搜不到"的部分,
  而且搜不到不会报错 —— 看起来只是"这站没写过这个词"。当前全站索引 18KB(gzip 6.8KB),
  几十篇的量级下没有截断的必要。

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
├── routes/              # Nitro 路由(RSS、搜索索引)
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
├── components/          # 自动导入,含 BaseLayout / PostLayout / SearchTrigger / SearchDialog
│   ├── content/         # 覆写内置 Prose 组件(ProsePre / ProseTable / ProseImg)
│   └── mdc/             # 自定义 MDC 组件(Callout / Demo / Illustration)
├── pages/               # 文件路由
└── utils/               # 仅 app 侧自动导入(取数层 posts.ts、搜索匹配 search.ts、
                         #   徽章解析 badges.ts、clipboard.ts)
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

## 徽章约定

标题右侧的状态徽章。预设表在 `app/config.ts` 的 `BADGES`,解析在 `app/utils/badges.ts`,
渲染在 `app/components/PostBadges.vue`(列表项与文章页 h1 共用同一个组件)。

- **`@nuxt/content` 不会因 schema 违规让构建失败**。这条是实测出来的:给某篇文章写
  `badges: [wpi]`(非法 enum 值)后构建,内容照常入库(`sql_dump.txt` 正常产出),
  日志里**没有任何** schema / validation 相关输出,真正把构建拦下来的是 `resolveBadges()`
  里那句 throw。所以 `content.config.ts` 的 `z.enum` 只能算第一道,**凡是"写错就该停下来"
  的约束都必须在运行时再兜一遍** —— 只靠 schema 等于没守。
- **Nitro 预渲染把异常一律汇报成 `[500] Server Error`,不打印消息本身**。因此
  `PostBadges.vue` 在 rethrow 前先 `console.error` 一行(带文章路径与错误的 key)。
  拿掉那一行的话,构建失败时能看到的只有"首页 500",而首页列着全部文章,
  根本看不出是哪篇的哪个 key 拼错了。这一行是给人看的,不是给程序看的,别当冗余删掉。
- **未知 key 必须抛错,不能顺手滤掉**。`BADGE_KEYS.filter(k => new Set(post.badges).has(k))`
  这种写法很自然,但它会把拼错的 key 静默丢弃 —— 页面上少一个徽章而构建照常成功,
  正是本项目反复踩的那种形状。校验要单独写一遍循环,别和排序合并。
- **校验用 `Object.hasOwn(BADGES, key)`,不能用 `key in BADGES`**。`in` 会走原型链,
  于是 `constructor` / `toString` / `__proto__` / `valueOf` / `hasOwnProperty` 这些名字
  全部通过校验,再被后面的 filter 顺手滤掉 —— 拐了个弯回到上一条要防的静默失败。
  这条已经踩过一次:第一版写的就是 `in`,单测全绿、构建全绿,靠审查才发现。
- **数量上限只能在运行时守,而且要在注入 draft 之后算**。schema 里的 `.max()` 同样零效力
  (理由见上面第一条);而 `draft` 是自动注入的、不占 frontmatter 的名额,
  `draft: true` + 3 个 badges 会渲染出 4 个,按 frontmatter 长度算就漏了。
- **`draft` 不接受手写**。`BADGE_KEYS` 含它,但 `content.config.ts` 的 enum 用的是
  `AUTHORABLE_BADGE_KEYS`(已剔除),`resolveBadges` 见到手写的 `draft` 直接抛错。
  放行的话,一篇 `draft: false` 而 `badges: [draft]` 的文章会被判为已发布、正常上线,
  页面上却挂着「草稿」—— 恰好推翻"草稿二字线上永远不会出现"这条不变量。
- **顺序取 `BADGE_KEYS` 的定义序,不跟 frontmatter 的书写序**。否则 `[wip, translated]`
  与 `[translated, wip]` 会渲染成两种样子。`draft` 在表里居首,自动注入后天然落在最前,
  不需要额外的"draft 优先"特例。
- **`draft` 徽章是 dev-only**。`draft: true` 的文章在生产被 `isPublishedPost()` 整个过滤掉,
  「草稿」二字线上永远不会出现。想要"已发布但还在写"的线上标记是 `wip`,是另一件事。
- **`draft` 仍是可见性的唯一真源**,没有被并进 `badges`。把可见性挂到一个展示用的数组上,
  一个 typo 就会静默发布草稿 —— 展示可以出错,可见性不行。
- 徽章不进 RSS、不进搜索索引:前者会让 `wip` 摘掉时标题变化、旧条目在阅读器里重新冒成未读;
  后者是按 section 存的,文章级字段存进去会在同一篇的 N 个 section 里重复 N 遍。

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
- **UnoCSS 会扫 `<style>` 块里的 CSS 属性值当类名候选**(`position: absolute` → 生成 `.absolute`,
  `animation: … ease-out` → `.ease-out`),产物里因此固定多出 8 条没人使用的死规则:
  `absolute` / `fixed` / `ease-in-out` / `ease-out` / `flex-shrink` / `h1` / `outline` /
  `tabular-nums`。**这是刻意接受的**,合计 444 B(压缩前,占工具类 CSS 的 1.5%),且与手写 CSS、
  模板类名零碰撞。**不要为它写自定义 `extractorDefault`** —— 理由写在 `uno.config.ts` 顶部,
  一句话是:正则分不清真样式块和注释里提到的 `<style>`,踩中时整页工具类静默消失,而
  构建成功、且只在 dev 复现。注意 `content.pipeline.exclude` 也**不管用** —— 那个按模块 id
  过滤,而 UnoCSS 扫的是整个 `.vue` 文件,不是 Vite 拆出来的 `?vue&type=style` 子模块。
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

## 搜索约定

三段式:`server/routes/search-index.json.ts` 生成索引 → `app/utils/search.ts` 纯函数匹配 →
`SearchDialog.vue` 只负责渲染。与取数层同一套分法,理由也相同 —— 排序和边界要能单测。

- **中文一律用子串匹配,不要换成"正经的搜索库"**。现成方案(SQLite FTS5、Pagefind、MiniSearch、
  Fuse)对中文清一色走分词,而分词切不准就会**静默漏搜**:实测 `Intl.Segmenter` 把「高亮标注」
  切成「高亮 | 标 | 注」、「代码块」切成「代码 | 块」,搜「标注」「代码块」全部返回空数组,不报错
  也不告警。`@nuxt/content` 内置的 `useSearchCollection` 更糟 —— 它建 FTS 表时不带 tokenizer
  (`runtime/internal/search.js`),整串中文变成一个 token,只有恰好位于标点后的词才搜得到,
  且模块没暴露 tokenizer 配置入口,改不了。
  中文没有词形变化,子串匹配因此近乎完美;代价只是线性扫描,而 50 篇 × 4KB 的语料全量扫一遍是
  0.004ms 量级。`test/search.test.ts` 末尾那组「标注 / 代码块 / 块里」的回归测试就是钉这条结论的,
  想换库时先看那几条会不会红。
- **切段复用 `queryCollectionSearchSections`,不要自己按标题拆**。锚点推导规则得和 Nuxt Content
  的 rehype 插件完全一致,对不上时链接会跳到页面顶部而不是小节 —— 不报错,只是跳错地方。
  标题范围取 h2/h3,与 `PostOutline` 的过滤条件同一口径。
- **`/search-index.json` 必须显式列进 `nitro.prerender.routes`**。索引是 `fetch` 出来的,HTML 里
  没有任何指向它的 `href`,爬虫发现不了(同「图片约定」里 `extractLinks` 那条)。漏掉时 dev 模式
  照常能搜、构建照常成功,只有线上点开搜索才 404。已由产物断言守住。
- 索引是继站点页面、RSS、sitemap 之后的**第四条草稿泄露面**,过滤只认
  `shared/utils/posts.ts` 的 `isPublishedPost()`。

## 守门机制

本项目遇到的故障有同一个形状:**构建成功、页面照常渲染、只是某块东西凭空消失**
(渲染器找不到 Chrome 就静默禁用;MDC 组件名撞 HTML 标签就被当原生元素渲染;
配置文件放错目录就被忽略)。因此分两层守:

| 层 | 位置 | 守什么 | 怎么跑 |
| :--- | :--- | :--- | :--- |
| 纯函数单测 | `test/` | 排序、分组、找相邻、转义、slug 推导、`SITE.url` 格式、搜索匹配与摘要分段(含中文不漏搜回归)、徽章解析(顺序稳定、draft 注入、未知 key 抛错) | `pnpm test` |
| 产物断言 | `scripts/verify-build.ts` | og 图存在、图片存在、草稿未外泄、MDC 组件真的渲染了、无未解析的 `::语法` 残留、`ProsePre` 覆写生效、`PostNav` 接线、徽章真的渲染了、搜索索引存在且每条锚点在页面上真实可达 | 构建期自动跑;`pnpm verify:build` 单独跑 |

- **徽章的两层守卫管的不是同一件事,别以为有一层就够**。产物断言查的是 HTML —— 徽章
  有没有渲染出来(接线断了、预设 key 改了、文案改了都会红);而 `.post-badge-<tone>`
  的 **CSS 规则**在不在,产物断言查不到:删掉那条规则,HTML 里的 class 属性一个字都不变,
  只是徽章变成一段没有底色的裸小字。后者由 `test/badges.test.ts` 直接读 `PostBadges.vue`
  源码来守。两条都做过破坏演练确认会红。

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

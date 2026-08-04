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
- OG 分享图:`nuxt-og-image`,Browser(Chrome)渲染器,模板在 `app/components/OgImage/`。
  选 Browser 而非 satori/takumi 是因为后两者不能用系统字体,中文需另行内嵌 Noto Sans SC,
  且模块文档没有 CJK 章节;走 Chrome 直接吃系统 PingFang SC,CSS 支持也完整
- 代码规范:`@antfu/eslint-config` + `@unocss/eslint-plugin`
- Git 规范:`@huberyyang/todo-scripts` 的 `commitlint-init` 接入 commitlint + husky + lint-staged
- `better-sqlite3` 是 `@nuxt/content` 的存储后端(v3 把内容层从文件改为 SQL),原生模块,
  需要在 `pnpm-workspace.yaml` 的 `allowBuilds` 里放行

## 待办提醒

- ⚠️ `app/config.ts` 的 `SITE.url` 目前是**暂定域名** `https://blog.hubery.dev`,上线前需与实际部署地址核对。
  canonical / sitemap / RSS / OG 图都依赖它生成绝对 URL。构建期没有占位域名守卫,核对完全靠人工,上线前务必手动确认。
- 🔍 **搜索功能尚未实现**。两条可选路径:`@nuxt/content` 自带的 FTS5 全文搜索(与内容层同源,
  但会拉取 844KB 的 WASM SQLite + 内容 dump),或用 pagefind CLI 做 postbuild 并自写 Vue 弹层 UI。

## 目录结构约定

```
content.config.ts        # collection schema(根级)
content/blog/*.md        # 文章正文
shared/utils/            # app 与 server 双向自动导入(草稿过滤真源放这里)
server/routes/           # Nitro 路由(RSS)
app/
├── app.vue
├── error.vue            # nuxt generate 据此产出根级 404.html
├── config.ts            # 站点级常量,同时被 nuxt.config.ts 导入 → 只能放纯常量
├── assets/css/global.css
├── components/          # 自动导入,含 BaseLayout / PostLayout
├── pages/               # 文件路由
└── utils/               # 仅 app 侧自动导入
```

核心原则:

- **草稿过滤的唯一真源是 `shared/utils/posts.ts` 的 `isPublishedPost()`**。RSS 是 Nitro 路由,
  拿不到 app 侧的取数函数;若在两边各写一遍过滤条件,改动其一就会出现"站点上看不到、订阅源里却推送了"的漏网。
- 正文容器 `.prose` 由 `ContentRenderer` 自己承担(`<ContentRenderer class="prose">`),
  **不要再在外面套一层 `<div class="prose">`** —— ContentRenderer 自带根元素,
  外面再包一层会让 `.prose > * + *` 只匹配到那个包装层,全文段落间距整体丢失。
- **路径一律不带尾斜杠**(`/about`、`/posts/<slug>`),链接、canonical、sitemap、RSS 四者对齐。
  不要为了"看起来像目录"去加尾斜杠:Nuxt 会把静态页按原生形式自动加入预渲染,爬虫又会从带斜杠的
  链接发现另一种形式,**两条路由抢写同一个 `index.html`**,产出末尾带残留字节的畸形 HTML,且不报错。
  这个坑已经踩过一次。

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

# 博客技术方案(SPEC)

> 状态:方案已确认,尚未开始实施。下次会话先完成前置任务,再开始编码。

## Context

从零搭建一个 Markdown 驱动的静态个人博客,要求风格克制极简、使用 Vue 生态、包含主题切换与搜索。经过两轮并行调研(Vue 生态技术方案对比 + 极简博客设计案例)后与用户确认,锁定如下方案:

- **技术栈**:Astro(纯静态输出)+ `@astrojs/vue` 做交互岛屿 —— 在 VitePress / Astro+Vue / Valaxy / Vitesse手搓 等候选中选择 Astro+Vue,兼顾生态活跃度、性能和"泛Vue"的可接受度。
- **视觉风格**:用户选择"先看demo再定"。第一版按 antfu.me 式的克制留白 + 精细双主题变量做合理默认(区别于 sxzz.dev 式终端风、overreacted 式零装饰),后续根据反馈迭代。
- **部署**:自建/其他,只需保证 `output: 'static'` 产出可脱离 Node 运行时、用任意静态文件服务器托管。
- **本次推迟的功能**(已明确"先记录,后续再加"):RSS、评论系统、阅读时长/字数统计、多语言 i18n。但 content collection schema 和目录结构保留这些功能的扩展余地,不做成难以扩展的死结构。

方案已通过一次**真实 dry-run 验证**(在临时目录用相同版本号完整跑通 create-astro → astro add vue → 装 unocss/pagefind/eslint → astro build),确认以下关键事实成立:
- `astro-pagefind` 挂在 `astro:build:done` 钩子,`pnpm build` 一条命令即可自动生成 `dist/pagefind/` 索引,无需拼接命令。
- Content collection 的 schema 文件路径是项目根的 `src/content.config.ts`(不是 `src/content/config.ts`,后者是过时路径)。
- draft 文章在生产构建下不会生成 html、也不会被 pagefind 索引到,无需额外配置。

## 技术栈与依赖

- 包管理器:pnpm;语言:TypeScript(strict)
- 核心:`astro`(7.1.3)、`@astrojs/vue`(7.0.1)、`vue`
- 样式:`unocss` + `@unocss/astro`(66.7.5),`darkMode: 'class'`,自己手写 reset(不开 `injectReset`,该选项会因缺依赖报错)
- 搜索:`astro-pagefind`(2.0.1),弹层(modal)接入,而非独立 `/search` 页
- 图标:`@iconify-json/ph` 配合 `presetIcons()`
- 代码规范:`@antfu/eslint-config`(9.2.0)+ `eslint-plugin-astro` + `astro-eslint-parser` + `@unocss/eslint-plugin`
- Git 规范:`@huberyyang/todo-scripts` 跑一次 `commitlint-init --clear` 接入 commitlint + husky + lint-staged,跑完自动卸载自身

## 执行步骤

### 1. 初始化项目
```bash
pnpm create astro@latest . -- --template minimal --install --git --no-ai --yes
# 若报 ERR_PNPM_IGNORED_BUILDS: pnpm approve-builds esbuild
mv astro.config.mjs astro.config.ts
pnpm astro add vue --yes   # 自动改写 astro.config.ts、tsconfig.json 补 jsx 配置
pnpm add -D unocss @unocss/astro astro-pagefind @iconify-json/ph
pnpm add -D eslint @antfu/eslint-config eslint-plugin-astro astro-eslint-parser @unocss/eslint-plugin
```
先跑一次 `pnpm lint:fix`(见下方 scripts)清理脚手架自带文件的默认缩进风格,再执行最后一步接入 commitlint:
```bash
pnpm add -D @huberyyang/todo-scripts
pnpm exec hubery commitlint-init --clear   # 必须在 eslint 装好之后跑,它会联动跑一次 eslint --fix
```

### 2. 目录结构
```
src/
├── content.config.ts        # collection schema(根级,不是 src/content/config.ts)
├── content/blog/*.md        # 纯 markdown 正文
├── layouts/
│   ├── BaseLayout.astro     # html shell + 防闪烁内联脚本 + Header/Footer
│   └── PostLayout.astro     # 文章详情 prose 排版
├── components/
│   ├── ThemeToggle.vue      # 唯一的 Vue 岛屿组件(client:load)
│   ├── SearchTrigger.astro  # PagefindConfig + pagefind-modal-trigger/pagefind-modal
│   ├── Header.astro / Footer.astro / PostCard.astro
├── pages/
│   ├── index.astro          # 首页列表(过滤 draft)
│   └── posts/[...slug].astro
└── styles/global.css        # 双主题 CSS 变量 + reset + .prose
astro.config.ts / uno.config.ts / eslint.config.js
```

### 3. Content Collection schema(`src/content.config.ts`)
```ts
import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: image().optional(),           // 预留:封面图/OG图,用 image() 走 Astro 图片优化
    lang: z.string().default('zh-CN'),   // 预留:i18n
  }),
})
export const collections = { blog }
```
详情页用新版 `render()` API(不是 `entry.render()`),`getStaticPaths` 里按 `import.meta.env.PROD` 过滤 draft。

### 4. astro.config.ts —— 集成顺序 vue → UnoCSS → pagefind(pagefind 必须最后,依赖 `astro:build:done` 钩子的注册顺序)
```ts
import vue from '@astrojs/vue'
import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'
import pagefind from 'astro-pagefind'

export default defineConfig({
  site: 'https://your-domain.example', // 待用户提供实际域名
  output: 'static',
  integrations: [vue(), UnoCSS(), pagefind()],
})
```

### 5. 双主题(`src/styles/global.css` + `uno.config.ts`)
- `.dark` class 挂在 `<html>`,配合 UnoCSS `darkMode: 'class'`。
- 语义化 CSS 变量(`--c-bg`/`--c-text`/`--c-primary` 等),深色不用纯黑、浅色文字不用纯黑,各变量单独调校对比度(而非简单反色),`uno.config.ts` 的 `theme.colors` 直接引用这些变量。
- Pagefind 弹层的 `--pf-*` 变量在 `.dark` 里一并覆盖,`data-pf-theme` 属性随主题切换同步设置。

### 6. 防闪烁主题切换
- `BaseLayout.astro` 的 `<head>` 第一个子节点放同步 `<script is:inline>`,提前读 `localStorage`/`prefers-color-scheme` 设置 `<html>` 的 `.dark` class 和 `data-pf-theme`。
- `ThemeToggle.vue`(`client:load`):`onMounted` 时以 `document.documentElement.classList.contains('dark')` 作为初始状态唯一真源(不重复实现内联脚本的判断逻辑),点击时切 class + 同步 `data-pf-theme` + 写 `localStorage`。v1 只做二态(light/dark),不做"跟随系统"第三态。

### 7. 搜索 UI —— 弹层方案
`SearchTrigger.astro` 放进 `BaseLayout` 的 Header:
```astro
---
import PagefindConfig from 'astro-pagefind/components/PagefindConfig.astro'
---
<PagefindConfig />
<pagefind-modal-trigger></pagefind-modal-trigger>
<pagefind-modal></pagefind-modal>
```
开发模式下 `dist/pagefind` 不存在属正常现象,搜索功能以 `pnpm build && pnpm preview` 为准验证。

### 8. 示例文章(3篇,用于验证)
1. `hello-astro-blog.md`(published)—— 技术栈介绍,覆盖标题/段落/代码块/列表
2. `fouc-free-dark-mode.md`(published)—— 防闪烁原理,覆盖多级标题/引用块/行内代码,验证暗色排版
3. `draft-post-example.md`(`draft: true`)—— 验证草稿不出现在列表/详情页/搜索结果中

### 9. package.json scripts
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "astro check",
    "prepare": "husky"
  }
}
```
`build` 无需拼接 pagefind 命令(见上方 dry-run 结论)。

## 验证清单

1. `pnpm dev` → `localhost:4321` 首页列表 + 2 篇 published 文章详情页正常打开
2. 查看页面源码确认防闪烁 `<script is:inline>` 是 `<head>` 首个子节点,DevTools 强制切 `localStorage.theme` 后刷新无白屏闪烁
3. `pnpm build` 终端输出应含 `[pagefind] Pagefind indexed 2 pages`(draft 不计入),`dist/pagefind/` 目录生成
4. `pnpm preview` 中唤起搜索弹层,搜索能命中 2 篇 published 文章,搜不到 draft 文章
5. `pnpm lint` 0 error;`pnpm typecheck`(`astro check`)0 类型错误
6. `git commit -m "bad message"` 应被 commit-msg 钩子拒绝,`git commit -m "feat: init blog scaffold"` 应通过
7. `npx serve dist` 脱离 Astro/Node 运行时,确认首页/详情页/搜索弹层在纯静态托管下依然完全可用(对应"自建部署"要求)
8. 用浏览器截图确认亮/暗两种主题下的实际视觉效果,作为下一轮与用户对齐视觉方向的素材

## 待确认的前置任务(下次会话开始前处理)

- 仓库/环境准备(git init、Node/pnpm 版本确认、是否建 GitHub 远程仓库、.gitignore 等)
- 内容与信息架构规划(文章分类/标签体系、URL 路径规则、About 页文案、站点标题与域名等)
- 项目级 CLAUDE.md 搭建(记录本次锁定的技术选型与约定,作为后续开发的持续参照)

具体做哪些、按什么顺序,留到下次会话开始时再确定。

# CLAUDE.md

本文件为项目级约定,供 Claude Code 在本仓库工作时参考。全局约定见 `~/.claude/CLAUDE.md`。

## 项目概览

Markdown 驱动的静态个人博客,风格克制极简,Astro + Vue 交互岛屿,双主题切换 + 弹层搜索。完整技术方案、执行步骤、验证清单见 `SPEC.md`。

## 技术栈速览

- 包管理器:pnpm;语言:TypeScript(strict)
- 核心:`astro`(output: 'static')+ `@astrojs/vue`(仅 `ThemeToggle.vue` 一个岛屿组件)
- 样式:`unocss` + `@unocss/astro`,`darkMode: 'class'`,手写 reset(不开 `injectReset`)
- 搜索:`astro-pagefind`,弹层(modal)接入,非独立 `/search` 页
- Content Collection schema 路径是根级 `src/content.config.ts`(不是 `src/content/config.ts`)
- 代码规范:`@antfu/eslint-config` + `eslint-plugin-astro` + `astro-eslint-parser` + `@unocss/eslint-plugin`
- Git 规范:`@huberyyang/todo-scripts` 的 `commitlint-init` 接入 commitlint + husky + lint-staged
- `typescript` 固定在 **6.x** —— 7.x 的原生编译器尚未提供 `astro check` 依赖的 programmatic API,不要升级

## 待办提醒

- ⚠️ `src/config.ts` 的 `SITE.url` 目前是**暂定域名** `https://blog.hubery.dev`,上线前需与实际部署地址核对。canonical / sitemap / RSS / OG 图都依赖它生成绝对 URL。
  构建期已不再有占位域名守卫(`astro.config.ts` 的 `siteUrlGuard` 已移除),核对完全靠人工,上线前务必手动确认。

## 目录结构约定

详见 `SPEC.md` 目录结构一节。核心原则:`src/content.config.ts` 放根级、`ThemeToggle.vue` 是唯一 Vue 岛屿、Pagefind 必须是 `integrations` 数组的**最后一项**(它挂在 `astro:build:done` 上,要等其余集成把产物写完才能扫描 `dist/` 建索引)。

## 文档同步规则

- **README.md**:随项目推进同步更新,格式遵循社区规范(标准分节:项目简介 / 安装 / 使用 / 开发 / License 等)。首份 README.md 由 `pnpm create astro` 脚手架生成,后续按实际内容持续维护,不要让它与实现脱节。

## 写文章约束

- ESLint 会把 Markdown 里的 `ts` / `js` 代码块当**独立源文件**解析。贴不完整的语法片段(如裸的 `theme: { ... }` 对象字面量)会报 `Parsing error: Expression expected`,且无法自动修复。两种解法:把片段补成语法完整的代码(包进 `export default defineConfig({ ... })` 之类),或换用不参与 lint 的语言标签(如 ```text)。

## 视觉效果实现注意事项

- 做"参考某网站背景效果 / 全屏效果"这类需求时,背景层默认应相对**视口**铺满,不要顺手塞进内容列的窄栏容器里——放进去会被 `max-w-2xl` 之类的宽度约束死,看起来像页面中间一块孤立色块。全屏/常驻背景层优先用 `position: fixed; inset: 0`:天然相对视口定位、不参与文档流,不需要 `100vw` 破框 hack,也没有滚动条宽度导致横向滚动条的风险。前提是从该元素到视口之间的祖先节点都不能有 `transform` / `filter` / `perspective` / `contain`(这些会重新建立包含块,使 `fixed` 元素相对该祖先而非视口定位)。

## 参考文档

- `SPEC.md` —— 完整技术方案与执行步骤

## Agent skills

### Issue tracker

Issues 通过 GitHub Issues 管理(仓库 `Hub-yang/my-blog`),使用 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Domain docs

单上下文(single-context)布局:领域文档若存在,`CONTEXT.md` 与 `docs/adr/` 位于仓库根目录。两者目前均未创建,由 `/domain-modeling` 在术语或决策真正需要沉淀时惰性生成 —— 缺失属预期,不必主动补建。详见 `docs/agents/domain.md`。

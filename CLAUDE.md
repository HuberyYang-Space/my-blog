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
- `src/pages/about.astro` 的正文是占位文案,待替换为真实自我介绍;联系方式段的邮箱、微信号也是占位符,待替换为真实值。

## 目录结构约定

详见 `SPEC.md` 目录结构一节。核心原则:`src/content.config.ts` 放根级、`ThemeToggle.vue` 是唯一 Vue 岛屿、Pagefind 集成顺序必须排在 vue/UnoCSS 之后(依赖 `astro:build:done` 钩子注册顺序)。

## 文档同步规则

- **README.md**:随项目推进同步更新,格式遵循社区规范(标准分节:项目简介 / 安装 / 使用 / 开发 / License 等)。首份 README.md 由 `pnpm create astro` 脚手架生成,后续按实际内容持续维护,不要让它与实现脱节。
- **STUDY.md**:随项目推进同步更新,记录实施过程中的知识点、操作指南、踩坑记录,供项目结束后学习复盘。

## 视觉效果实现注意事项

- 做"参考某网站背景效果 / 全屏效果"这类需求时,背景层默认应相对**视口**铺满,不要顺手塞进内容列的窄栏容器里——放进去会被 `max-w-2xl` 之类的宽度约束死,看起来像页面中间一块孤立色块。全屏/常驻背景层优先用 `position: fixed; inset: 0`:天然相对视口定位、不参与文档流,不需要 `100vw` 破框 hack,也没有滚动条宽度导致横向滚动条的风险。前提是从该元素到视口之间的祖先节点都不能有 `transform` / `filter` / `perspective` / `contain`(这些会重新建立包含块,使 `fixed` 元素相对该祖先而非视口定位)。

## 参考文档

- `SPEC.md` —— 完整技术方案与执行步骤
- `STUDY.md` —— 学习/复盘笔记

## Agent skills

### Issue tracker

Issues 通过 GitHub Issues 管理(仓库 `Hub-yang/my-blog`),使用 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Domain docs

单上下文(single-context)布局,`CONTEXT.md` + `docs/adr/` 位于仓库根目录。详见 `docs/agents/domain.md`。

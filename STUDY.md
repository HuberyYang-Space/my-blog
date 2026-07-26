# 学习笔记(STUDY.md)

> 用途:记录本项目实施过程中的知识点、操作指南、方法论,供项目结束后学习复盘。随开发进度持续更新,不追求一次性写完。

## 知识点

按技术点分类记录,例如:

- Astro(静态输出、Content Collections、`render()` API)
- Vue 交互岛屿(`client:load` 等指令的选择)
- UnoCSS(`darkMode: 'class'`、语义化 CSS 变量)
- Pagefind 搜索(`astro:build:done` 钩子、draft 过滤机制)
- 防闪烁双主题实现原理

## 操作指南

常用命令、环境配置、踩坑记录。

- **`--git` flag 提醒**:仓库已在前置任务中通过 `git init` 建好,下次会话执行 `SPEC.md` 里的 `pnpm create astro@latest . -- --template minimal --install --git --no-ai --yes` 时,需要去掉 `--git`(重复 init 无意义,可能报错)。

## 方法论

调研与决策过程中总结的可复用方法。

## 待复盘问题

实施过程中遇到但未即时解决、值得深挖的问题。

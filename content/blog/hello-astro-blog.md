---
title: 用 Astro 搭一个克制的静态博客
description: 为什么选 Astro 而不是 VitePress,以及这套技术栈各部分的分工。
date: 2026-07-26
tags:
  - Astro
  - 技术选型
---

这个博客的目标很简单:**Markdown 写作,静态输出,加载够快,视觉够安静**。围绕这几条,技术栈的每一处选择都有对应的理由。

## 为什么是 Astro

候选里认真比较过 VitePress、Valaxy 和从 Vitesse 模板手搓。最终选 Astro,主要看中三点:

1. **默认零 JS**。Astro 把交互能力收敛到“岛屿”(island)里,页面其余部分是纯静态 HTML。博客这种以阅读为主的场景,绝大部分内容根本不需要运行时。
2. **框架无关**。需要 Vue 的地方用 `@astrojs/vue` 引入即可,不需要的地方不付出代价。
3. **内容层是一等公民**。Content Collections 提供了带类型校验的 frontmatter,写错字段在构建期就会报错,而不是等页面渲染出空白才发现。

## 各部分的分工

| 层 | 选型 | 职责 |
| :-- | :-- | :-- |
| 框架 | Astro | 路由、内容层、静态输出 |
| 交互 | Vue 3 | 只用于主题切换这一个岛屿 |
| 样式 | UnoCSS | 原子类 + 语义化 CSS 变量 |
| 搜索 | Pagefind | 构建期生成索引,运行时零后端 |

## 关于样式的一点取舍

主题切换没有采用 `text-black dark:text-white` 这种成对写法,而是把颜色收敛到一组语义化 CSS 变量:

```css
:root {
  --c-text: #222226;
}

.dark {
  --c-text: #d4d4d8;
}
```

然后让 UnoCSS 的 `theme.colors` 直接引用这些变量:

```ts
// uno.config.ts
export default defineConfig({
  theme: {
    colors: {
      text: 'var(--c-text)',
    },
  },
})
```

这样组件里只写 `text-text`,深浅两套配色在变量层就分流完了。好处是**配色调整只需改一处**,不必满项目搜索 `dark:` 前缀。

## 还没做的

以下功能刻意推迟,但目录结构和 schema 都预留了扩展位:

- RSS 订阅
- 评论系统
- 阅读时长 / 字数统计
- 多语言 i18n

先把核心的阅读体验做扎实,再谈这些。

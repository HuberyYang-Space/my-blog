---
title: 代码块的全部写法
description: 文件名、行高亮、增删标记、聚焦——代码块能表达的东西比"贴一段代码"多得多。
date: 2026-07-27
tags: 
  - 写作指南
draft: true
---

代码块是技术文章里信息密度最高的部分,但大多数时候它只被当成"一块等宽字体"。这篇把可用的标注手段列全 —— 它们的共同目的是**让读者知道该看哪一行**。

## 行内代码与基础代码块

行内代码用反引号:`pnpm dev`、`--shiki-default`、`isPublishedPost()`。

代码块用三个反引号加语言标识:

```ts
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

标识决定语法高亮。预置的语言有 `js` `ts` `jsx` `tsx` `vue` `json` `yaml` `css` `html` `bash` `md` `mdc`,用不带高亮的纯文本时写 `text`。

```bash
pnpm new "文章标题"
pnpm dev
```

```json
{
  "engines": {
    "node": ">=22.12.0"
  }
}
```

## 文件名标题

代码块顶部那条信息栏默认显示语言。在语言后面用方括号写文件名,它就变成文件名 —— 贴配置片段时这一条最有用,读者不用猜"这段该放哪":

````md
```ts [app/config.ts]
export const SITE = {
  title: 'Hubery',
  url: 'https://blog.hubery.dev',
} as const
```
````

渲染出来是这样:

```ts [app/config.ts]
export const SITE = {
  title: 'Hubery',
  url: 'https://blog.hubery.dev',
} as const
```

信息栏右侧那个按钮会把整段代码复制到剪贴板。它依赖浏览器的剪贴板接口,该接口只在安全上下文(HTTPS 或 localhost)存在 —— 若通过纯 http 访问,按钮会变成警告图标而不是假装成功。

## 行高亮

在语言后面用花括号指定行号,单行写 `{3}`,连续多行写 `{3-5}`,混合写 `{1,3-5}`:

````md
```ts [shared/utils/posts.ts] {5}
export function isPublishedPost(post: { draft?: boolean }): boolean {
  return import.meta.dev || post.draft !== true
}
```
````

被点名的行会有一条底色和左侧的竖线:

```ts [shared/utils/posts.ts] {2}
export function isPublishedPost(post: { draft?: boolean }): boolean {
  return import.meta.dev || post.draft !== true
}
```

也可以不数行号,直接在那一行末尾写注释标记 —— 增删代码时不用重新数:

```ts
export async function getPublishedPosts() {
  const posts = await queryCollection('blog').order('date', 'DESC').all()
  return posts.filter(isPublishedPost) // [!code highlight]
}
```

## 增删标记

用 `[!code ++]` 与 `[!code --]` 表达"改成什么样",比贴前后两段代码省事得多:

```ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/content', // [!code --]
    '@nuxt/content', // [!code ++]
    '@nuxt/image', // [!code ++]
    '@unocss/nuxt',
  ],
})
```

## 聚焦

`[!code focus]` 会把其余行淡出,只留下被标记的那几行。适合"这个长函数里只有这一句是重点"的场合 —— 鼠标移上去时其余行会恢复,读者仍能看到上下文:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/image', '@unocss/nuxt'],
  content: {
    build: {
      markdown: {
        toc: {
          depth: 3, // [!code focus]
          searchDepth: 3, // [!code focus]
        },
      },
    },
  },
})
```

## 一个写作上的坑

代码检查工具会把 markdown 里的 `ts` 与 `js` 代码块当作**独立源文件**去解析。贴一段语法不完整的片段 —— 比如一个裸的对象字面量 —— 会直接报解析错误,而且无法自动修复。

两种解法:把片段补成语法完整的代码(包进 `export default {}` 之类),或者换用不参与检查的语言标识:

```text
theme: {
  default: 'github-light',
  dark: 'github-dark',
}
```

上面这段就是用 `text` 标识贴的,它不会被当成 TypeScript 解析。

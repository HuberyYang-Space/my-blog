---
title: 消除深色模式的首屏闪烁
description: 为什么主题切换会闪一下白屏,以及内联脚本为什么必须放在 head 的最前面。
date: 2026-07-25
tags:
  - CSS
  - 前端工程
---

给站点加深色模式时,有个几乎必然会遇到的问题:**用户明明选了深色,刷新页面却会先闪一下白屏**。

## 闪烁是怎么发生的

关键在于浏览器的渲染时序。假设主题状态存在 `localStorage`,而读取它的代码放在一个普通的 `<script>`(或框架组件的 `onMounted`)里,时序就成了:

1. 浏览器解析 HTML,遇到 CSS 就开始构建渲染树
2. **首屏按默认的浅色渲染并绘制** ← 白屏在这一刻出现
3. JS 加载、执行,读到 `theme=dark`,给 `<html>` 加上 `.dark`
4. 样式重算,页面变深色

问题出在第 2 步和第 3 步之间。这段间隙可能只有几十毫秒,但足以被眼睛捕捉到 —— 而且深色模式用户往往在暗环境下使用,一次白屏闪烁相当刺眼。

## 解法:让判断发生在首次绘制之前

要消除闪烁,主题判断必须**早于浏览器的首次绘制**。做法是把这段逻辑放进 `<head>` 里的同步内联脚本:

```html
<head>
  <script is:inline>
    (function () {
      try {
        const stored = localStorage.getItem('theme')
        const isDark = stored
          ? stored === 'dark'
          : matchMedia('(prefers-color-scheme: dark)').matches
        if (isDark) {
          document.documentElement.classList.add('dark')
        }
      }
      catch {}
    })()
  </script>
  <!-- 其余 head 内容 -->
</head>
```

有几个细节值得说明:

- **必须是 `head` 的首个子节点**。同步脚本会阻塞后续解析,放在最前面才能保证 `.dark` 在任何内容渲染前就位。
- **必须是内联的**。外链脚本要走一次网络请求,那点延迟足以让白屏出现。
- **Astro 里要写 `is:inline`**。否则 Astro 会把它当作模块处理并搬运到别处,失去同步执行的语义。
- **要包 `try/catch`**。隐私模式或禁用 Cookie 的环境下访问 `localStorage` 会抛异常,不catch 会连累后续脚本。

> 阻塞渲染在这里是**特性而非缺陷**。这段脚本只有几行,执行开销可以忽略,换来的是首屏颜色的确定性。

## 组件侧不要重复判断

内联脚本跑完后,`<html>` 上的 `.dark` 已经是权威状态了。切换组件初始化时应该**读取这个既成事实**,而不是把判断逻辑再实现一遍:

```ts
onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})
```

如果组件里重新读一遍 `localStorage` 和 `prefers-color-scheme`,就出现了两份需要保持同步的判断逻辑 —— 将来改动其中一处而忘了另一处,就会产生“图标显示的状态和实际配色对不上”这类难查的 bug。

**一处判断,一处真源。** 这条原则比具体实现更值得记住。

---
title: 在 Markdown 里写 Vue 组件
description: MDC 让 markdown 直接调用 Vue 组件——从提示框到真的能点的交互演示。
date: 2026-08-03
tags:
  - 写作指南
draft: true
---

纯 markdown 的表达力有上限:它能描述结构,描述不了行为。MDC 语法把这层上限打开 —— 在正文里写 `::组件名`,渲染时它就是一个真正的 Vue 组件,有状态、能响应点击、能跑第三方库。

## 提示框

最常用的一类。四种语气各对应一个组件,直接写组件名,内容缩在两行 `::` 之间:

````mdc
::warning
删除前务必备份。
::
````

::note
说明类信息,用于补充上下文。它内部支持完整的 markdown —— **加粗**、`行内代码`、[链接](https://content.nuxt.com) 都能用。
::

::tip
经验、技巧、更省事的做法。
::

::warning
需要留意的地方,不看可能会踩坑。
::

::caution
有破坏性后果的操作,做之前想清楚。
::

这四个块名(`warning`/`note`/`tip`/`caution`)背后现在是 `@nuxt/ui` 自带的 Prose 组件族,不是本站自己写的组件 —— 装上 `@nuxt/ui` 之后它会**无条件**接管这几个块名,本站原先 `app/components/mdc/` 下同名的自定义实现已经删掉了。它没有标题栏这个概念,只有图标 + 正文,需要强调的标题自己写进正文开头,加粗即可:

````mdc
::warning
**这条已经踩过两次**:路径一律不带尾斜杠。
::
````

::warning
**这条已经踩过两次**:路径一律不带尾斜杠 —— 加了之后两条路由会抢写同一个 `index.html`,产出末尾带残留字节的畸形 HTML,而且不报错。
::

## 交互演示

提示框说到底还是"一段样式化的文字",CSS 也能做。真正只有组件能做到的是**有状态、能交互**的东西。

`::demo` 是一个画框,把演示区与正文区分开;具体演示各写各的组件塞进去。写法上,行内组件用单冒号:

````mdc
::demo{title="计数器"}
  :demo-counter
::
````

::demo{title="计数器 —— 最小的响应式状态"}
  :demo-counter
::

这个计数器点得动,说明正文里的组件确实完成了水合。它存在的意义不在于计数器本身,而在于它是个哨兵:哪天预渲染或水合出问题,这里会第一个点不动。

下面这个更进一步,它在正文里跑了动画库(和首页光标视差用的是同一个):

::demo{title="动画 —— 在正文里跑第三方运行时库"}
  :demo-motion
::

::note
两个演示都尊重系统的"减弱动效"偏好。开启该偏好时,动画不是被跳过,而是直接落到终点 —— 按钮按下去仍然有反应,只是没有补间过程。
::

## 属性语法

除了成块的组件,MDC 还能给行内文字挂类名,写法是在文字后面接花括号:

````mdc
[这段文字带了高亮底色]{.highlighter}
````

效果是这样:[这段文字带了高亮底色]{.highlighter},底色还能换成指定的品牌色 —— [Vue]{.highlighter .[--tint:var(--c-brand-vue)]}、[React]{.highlighter .[--tint:var(--c-brand-react)]}、[Nuxt]{.highlighter .[--tint:var(--c-brand-nuxt)]}。

同样的花括号也能挂到块级元素上,写在元素的下一行:

> 这个引用块被挂上了自定义类。
{.callout-body}

## 图片与图注

标准的 `![alt](src)` 语法已经够用,需要图注时才动用组件:

````mdc
::illustration{src="/images/sample-wide.webp" alt="替代文字" width="1344" height="756"}
图注正文,支持 **markdown**。
::
````

::illustration{src="/images/sample-wide.webp" alt="示例图" width="1344" height="756"}
写死宽高是为了给图片预留版位 —— 不写的话,图加载完成的瞬间下方内容会被顶下去。
::

::tip
**为什么图注不复用图片语法的 title 参数**:markdown 的独立图片会被包进一个 `<p>`,而 `<figure>` 不允许出现在 `<p>` 里 —— 浏览器解析服务端 HTML 时会自动闭合那个 `<p>`,与客户端生成的结构对不上,水合就会不一致。MDC 的块级组件本身是块级节点,不受这层包裹。
::

::warning
**属性值里不要用转义引号**:比如 `::illustration{alt="…做成 ![alt](src \"图注\")"}` 这种写法,里面的 `\"` 不会被识别成转义,整个块直接不解析、原样当普通文字输出了 —— 同样是**不报错**的那类失败。属性值里需要引号时,换个说法绕开。
::

## 组件放在哪

这一点文档里没写清楚,但两个目录的行为确实不同:

| 目录 | 用途 |
| :--- | :--- |
| `app/components/mdc/` | 自定义组件(演示、图注) |
| `app/components/content/` | 覆写内置的 Prose 组件(`ProsePre`、`ProseTable`、`ProseImg`) |

提示框(`::note`/`::tip`/`::warning`/`::caution`)不在这两个目录里 —— `@nuxt/ui` 检测到本站装了 `@nuxt/content` 就会自动注册它自己的同名 Prose 组件,而且没有开关能只关掉这几个、保留其他 Prose 组件,本站原来那份自定义实现已经删掉了,不用去找。

::caution
`app/components/mdc/` 是以**全局**方式注册的,而 MDC 在运行时靠 Vue 的 `resolveComponent` 按名字找组件 —— 只认全局注册。自定义组件放错目录不会报错,只会在页面上留下一个原样的 `::组件名`。
::

## 组件名不能撞 HTML 标签

上面那个插图组件本来叫 `Figure`,写成 `::figure`。结果它渲染出来是一个裸的 `<figure>` 元素:传进去的 `src`、`alt` 原样挂成了属性,内容一个字都没出来。

原因在于 MDC 解析节点时,**先查一遍原生 HTML 标签表**,命中的名字直接按元素处理,压根不会去找同名组件:

```ts
function ignoreTag(tag: string): boolean {
  const isCustomEl = typeof tag === 'string' ? customElements.has(tag) : false
  return isCustomEl || htmlTags.has(tag)
}
```

`figure`、`header`、`aside`、`section`、`main`、`dialog`、`menu` 这些看起来很适合当组件名的词,全都在这张表里。

::caution
这类失败**不报错**。页面照常渲染,构建照常成功,只是那一块内容凭空消失 —— 除非你正好翻到那一段,否则不会发现。给 MDC 组件起名前先确认它不是 HTML 标签。
::

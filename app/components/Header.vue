<script setup lang="ts">
const route = useRoute()
// 精确匹配而非 startsWith:后者会把将来可能出现的 /about-xxx 也点亮成"关于"
const isHome = computed(() => route.path === '/')
const isAbout = computed(() => route.path === '/about')

// 激活态用 text-text(取消弱化)+ 底部下划线常驻(border-bottom,不透明主色);
// 非激活态下划线设为透明而非移除,避免切换激活态时链接的盒模型高度发生变化。
//
// hover/focus-visible 反馈交给 .underline-sweep(见 assets/css/links.css):下划线从左往右
// 划出,移开时原路缩回(右边先收,锚点固定在左边)。激活项的 border-bottom 是
// 不透明主色,会盖住 .underline-sweep 的动画层——悬停激活项时下划线纹丝不动,
// 不会有多余的动画。
//
// 这里不能再加 UnoCSS 的 transition-colors:它和 .underline-sweep 自带的
// transition: background-size 抢同一个 transition 简写属性(选择器权重相同,
// 只能靠打包顺序决胜负),会把 background-size 的过渡整条废掉。
function navLinkClass(active: boolean) {
  return active ? 'border-primary text-text' : 'border-transparent text-text-soft'
}
</script>

<template>
  <header class="site-header">
    <nav class="mx-auto max-w-2xl w-full flex items-center justify-between gap-4 px-6 py-3">
      <div class="flex items-baseline gap-5">
        <NuxtLink
          to="/"
          class="underline-sweep border-b pb-px text-sm font-normal tracking-tight"
          :aria-current="isHome ? 'page' : undefined"
          :class="navLinkClass(isHome)"
        >
          首页
        </NuxtLink>
        <NuxtLink
          to="/about"
          class="underline-sweep border-b pb-px text-sm font-normal tracking-tight"
          :aria-current="isAbout ? 'page' : undefined"
          :class="navLinkClass(isAbout)"
        >
          关于
        </NuxtLink>
      </div>

      <div class="flex items-center gap-2">
        <SearchTrigger />
        <ThemeToggle />
      </div>
    </nav>
  </header>
</template>

<style>
/* 头部:固定在视口顶部,半透明玻璃背景随主题变量自动适配深浅色,与下方滚动的内容
   保持模糊分层 —— fixed 而非 sticky,好让内容真的滚动到头部背后,backdrop-filter
   才有意义。position 只在这里表达一次,不在模板上叠加工具类,避免两处来源打架。
   高度写死为 --header-h(见 tokens.css),不再是内容撑开的 auto 高度,与
   BaseLayout 的 .content-scroll 用同一个变量做 padding 补偿。 */
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: var(--header-h);
  /* 用 flex + align-items: center 纵向居中 nav,不依赖"nav 自身高度刚好等于
     --header-h"这种巧合 —— 内容(如按钮尺寸)以后变了也不会跑出固定高度的头部盒子。
     flex 项默认按内容收缩宽度,nav 需要显式 w-full 才能让自己的 mx-auto 生效
     (见模板),否则 max-w-2xl mx-auto 在 flex 容器里没有多余空间可居中。 */
  display: flex;
  align-items: center;
  background-color: color-mix(in srgb, var(--c-bg) 72%, transparent);
  /* 模糊必须加在这条全宽规则上,而不是内层居中的 nav —— 否则视口宽于内容列时,
     header 露出的左右留白区域只有半透明色、没有模糊,和中间的 nav 区域不一致。 */
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  /* 底部用统一细线边框,复用全站已有的 --c-border 语义(与代码块、表格等一致),
     比投影更克制、也更贴合现代扁平化的边框处理。 */
  border-bottom: 1px solid var(--c-border);
  transition: background-color 0.2s ease;
}
</style>

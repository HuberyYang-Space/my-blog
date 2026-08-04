<script setup lang="ts">
import { SITE } from '~/config'

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
  <header class="site-header sticky top-0 z-50">
    <nav class="mx-auto max-w-2xl flex items-center justify-between gap-4 px-6 py-3">
      <div class="flex items-baseline gap-5">
        <NuxtLink
          to="/"
          class="underline-sweep border-b pb-px text-base font-semibold tracking-tight"
          :aria-current="isHome ? 'page' : undefined"
          :class="navLinkClass(isHome)"
        >
          {{ SITE.title }}
        </NuxtLink>
        <NuxtLink
          to="/about"
          class="underline-sweep border-b pb-px text-sm"
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
/* 头部:半透明玻璃背景,随主题变量自动适配深浅色,与下方内容保持模糊分层。
   工具类无法干净表达 color-mix(),单独具名一条规则。 */
.site-header {
  position: relative;
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

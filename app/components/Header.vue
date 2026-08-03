<script setup lang="ts">
import { SITE } from '~/config'

const route = useRoute()
const isHome = computed(() => route.path === '/')
const isAbout = computed(() => route.path.startsWith('/about'))

// 激活态用 text-text(取消弱化)+ 底部下划线常驻(border-bottom,不透明主色);
// 非激活态下划线设为透明而非移除,避免切换激活态时链接的盒模型高度发生变化。
//
// hover/focus-visible 反馈交给 .underline-sweep(见 global.css):下划线从左往右
// 划出,移开时原路缩回(右边先收,锚点固定在左边)。激活项的 border-bottom 是
// 不透明主色,会盖住 .underline-sweep 的动画层——悬停激活项时下划线纹丝不动,
// 不会有多余的动画。
// 静态部分(见模板上的 class):
// border-0 先把四边宽度清零,border-solid 补上 style(项目手写 reset 没有像
// Tailwind preflight 那样预置 border-style: solid,不补的话 style 停在初始值
// none,宽度会被折算成 0),最后 border-b 单独把底边宽度改回来(1px)。
// pb-px 让下划线更贴近文字基线。
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
          class="underline-sweep border-0 border-b border-solid pb-px text-base font-semibold tracking-tight"
          :aria-current="isHome ? 'page' : undefined"
          :class="navLinkClass(isHome)"
        >
          {{ SITE.title }}
        </NuxtLink>
        <NuxtLink
          to="/about"
          class="underline-sweep border-0 border-b border-solid pb-px text-sm"
          :aria-current="isAbout ? 'page' : undefined"
          :class="navLinkClass(isAbout)"
        >
          关于
        </NuxtLink>
      </div>

      <div class="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import type { TocLink } from '@nuxt/content'

const props = defineProps<{
  links: TocLink[]
}>()

// Nuxt Content 的 toc 是嵌套结构(h3 挂在 h2 的 children 下),这里摊平成一维列表。
// 只收 h2/h3 —— h4 及以下在正文里已经很细,大纲再列进去只会变成一堵长墙。
const items = computed(() => {
  const flat: { id: string, text: string, depth: number }[] = []

  for (const link of props.links) {
    if (link.depth === 2 || link.depth === 3)
      flat.push({ id: link.id, text: link.text, depth: link.depth })

    for (const child of link.children ?? []) {
      if (child.depth === 2 || child.depth === 3)
        flat.push({ id: child.id, text: child.text, depth: child.depth })
    }
  }

  return flat
})

const activeId = ref<string>()

// 判定线 = 标题的滚动停靠位置(scrollOffset,与 router.options.ts 的锚点落点同源)
// 再往下 ACTIVE_TOLERANCE。"当前项" = 顶部已经越过这条线的最后一个标题 ——
// 用 IntersectionObserver 只当触发器(标题穿过判定线时回调),每次都用实时
// getBoundingClientRect 重新扫一遍,而不是直接信任回调传入的 entries:
// entries 只包含"这一次状态发生变化"的标题,单独用它判断会在两个标题之间
// 出现"谁都不是当前项"的空档。
//
// 不能写死成 px:停靠位置是 rem,浏览器默认字号调到 20px 时落点是 95px,
// 写死的 80px 会让刚点过的那一项不被点亮、高亮停在上一个标题上。
// 余量是因为落点有亚像素误差(实测 75.9 / 94.8),判定线与落点严丝合缝会时灵时不灵。
const ACTIVE_TOLERANCE = 4
let activeLine = 0

let observer: IntersectionObserver | undefined

function updateActive(headingEls: HTMLElement[]) {
  let current: HTMLElement | undefined
  for (const el of headingEls) {
    if (el.getBoundingClientRect().top - activeLine <= 0)
      current = el
    else
      break
  }
  activeId.value = current?.id
}

onMounted(() => {
  const headingEls = items.value
    .map(item => document.getElementById(item.id))
    .filter((el): el is HTMLElement => el !== null)

  if (headingEls.length === 0)
    return

  activeLine = scrollOffset() + ACTIVE_TOLERANCE
  observer = new IntersectionObserver(() => updateActive(headingEls), {
    rootMargin: `-${activeLine}px 0px 0px 0px`,
    threshold: 0,
  })
  headingEls.forEach(el => observer!.observe(el))
  updateActive(headingEls)
})

// 客户端路由切换时组件会卸载,必须断开观察者 —— 页面之间是软导航,
// 不会有整页重载来自动回收它。
onUnmounted(() => observer?.disconnect())

// 大纲链接是朴素的 <a href="#id">,不在这里拦截点击。滚动落点与动画统一由
// app/router.options.ts 的 scrollBehavior 决定(偏移量、等待异步渲染的标题、
// 减少动效降级都在那一处),这里多写一份只会和它抢同一次滚动。
</script>

<template>
  <nav id="post-outline" aria-label="文章大纲" class="text-xs font-mono">
    <p class="mb-3 text-text-mute">
      大纲
    </p>
    <ul class="flex flex-col list-none gap-2 border-l border-border pl-0">
      <li v-for="item in items" :key="item.id">
        <a
          :href="`#${item.id}`"
          class="block border-l-2 py-0.5 transition-colors -ml-px hover:text-text"
          :class="[
            item.depth === 3 ? 'pl-6' : 'pl-3',
            activeId === item.id ? 'border-primary text-text' : 'border-transparent text-text-mute',
          ]"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>

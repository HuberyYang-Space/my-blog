<script setup lang="ts">
import type { TocLink } from '@nuxt/content'

const props = defineProps<{
  links: TocLink[]
}>()

// Nuxt Content 的 toc 是嵌套结构(h3 挂在 h2 的 children 下),
// 这里摊平成 Astro headings 那样的一维列表。
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

// 判定线固定在吸顶头部下方 80px。"当前项" = 顶部已经越过这条线的最后一个标题 ——
// 用 IntersectionObserver 只当触发器(标题穿过判定线时回调),每次都用实时
// getBoundingClientRect 重新扫一遍,而不是直接信任回调传入的 entries:
// entries 只包含"这一次状态发生变化"的标题,单独用它判断会在两个标题之间
// 出现"谁都不是当前项"的空档。
const HEADER_OFFSET = 80

let observer: IntersectionObserver | undefined

function updateActive(headingEls: HTMLElement[]) {
  let current: HTMLElement | undefined
  for (const el of headingEls) {
    if (el.getBoundingClientRect().top - HEADER_OFFSET <= 0)
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

  observer = new IntersectionObserver(() => updateActive(headingEls), {
    rootMargin: `-${HEADER_OFFSET}px 0px 0px 0px`,
    threshold: 0,
  })
  headingEls.forEach(el => observer!.observe(el))
  updateActive(headingEls)
})

// 客户端路由切换时组件会卸载,必须断开观察者。
// (迁移前每次跳转都是整页加载,不存在这个问题)
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <nav id="post-outline" aria-label="文章大纲" class="text-xs font-mono">
    <p class="mb-3 text-text-mute">
      大纲
    </p>
    <!--
      border-0 ... border-solid:手写 reset 没有 Tailwind preflight 那样预置的
      border-style: solid,不补的话 style 停在初始值 none,宽度会被折算成 0
      (与 Header.vue 的 navLinkClass 是同一个坑)。
    -->
    <ul class="flex flex-col list-none gap-2 border-0 border-l border-border border-solid pl-0">
      <li v-for="item in items" :key="item.id">
        <a
          :href="`#${item.id}`"
          class="post-outline-link block border-0 border-l-2 border-solid py-0.5 transition-colors -ml-px hover:text-text"
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

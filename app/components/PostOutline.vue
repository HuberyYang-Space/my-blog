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

// 判定线固定在吸顶头部下方 80px。"当前项" = 顶部已经越过这条线的最后一个标题 ——
// 用 IntersectionObserver 只当触发器(标题穿过判定线时回调),每次都用实时
// getBoundingClientRect 重新扫一遍,而不是直接信任回调传入的 entries:
// entries 只包含"这一次状态发生变化"的标题,单独用它判断会在两个标题之间
// 出现"谁都不是当前项"的空档。
//
// 80px 与 tokens.css 的 --header-h(60px)是同一个物理量(头部高度)的两份独立
// 表达 —— 这里留了一点余量而非直接等于头部高度。头部改高度时记得同步这个数值。
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

// 客户端路由切换时组件会卸载,必须断开观察者 —— 页面之间是软导航,
// 不会有整页重载来自动回收它。
onUnmounted(() => observer?.disconnect())

// 大纲点击自己接管滚动,不走原生锚点跳转。原生跳转会改 route.hash,触发
// [slug].vue 里那个 watcher 对同一个标题再调一次 scrollIntoView —— 两次滚动
// 对文档中段的标题会收敛到同一个位置(无害),但对滚动范围已被夹到上限的标题
// (本站目前只有末尾的 FAQ 一节符合)会在动画中途被打断、停在错误位置,表现为
// 正文上移、底部空出一截。自己接管后 route.hash 不再变化,那个 watcher 对大纲
// 点击而言根本不会触发,不需要再去改 [slug].vue。
function onOutlineLinkClick(event: MouseEvent, id: string) {
  // 只接管普通左键点击;修饰键/中键点击(新标签页打开、复制链接等)保留原生
  // 行为,与 Vue Router 自家 RouterLink 的点击拦截规则一致。
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
    return

  event.preventDefault()
  const target = document.getElementById(id)
  if (!target)
    return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}
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
          @click="onOutlineLinkClick($event, item.id)"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>

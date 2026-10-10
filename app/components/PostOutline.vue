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

// 激活标识是一根独立的竖条,在各项之间移动,而不是每项各自的左边框换色 ——
// 只有同一个元素才能"流"过去。往下走时下沿先到、上沿延迟跟上(往上反之),
// 竖条先拉长盖住新旧两项再收拢,像水流灌进下一格;方向决定哪条边先走,见样式。
const wrapEl = useTemplateRef<HTMLElement>('wrapEl')
const indicator = ref<{ top: number, bottom: number }>()
// 隐藏时保留最后的位置:位置一撤,竖条当场塌成 0 高,淡出就看不到了
const indicatorVisible = ref(false)
const direction = ref<'down' | 'up'>('down')
// 从无到有、或布局变了重新对位时,竖条直接落位再淡入,不从上一个位置(或 0)滑过来
const instant = ref(true)

function placeIndicator(id: string | undefined, jump = false) {
  const wrap = wrapEl.value
  const link = id ? wrap?.querySelector<HTMLElement>(`a[href="#${CSS.escape(id)}"]`) : null
  if (!wrap || !link) {
    indicatorVisible.value = false
    return
  }

  const outer = wrap.getBoundingClientRect()
  const inner = link.getBoundingClientRect()
  const next = { top: inner.top - outer.top, bottom: outer.bottom - inner.bottom }

  instant.value = jump || !indicatorVisible.value
  if (indicator.value)
    direction.value = next.top >= indicator.value.top ? 'down' : 'up'
  indicator.value = next
  indicatorVisible.value = true
}

watch(activeId, id => placeIndicator(id), { flush: 'post' })

// 大纲在窄屏下是 display: none,那时量到的全是 0;展开后靠它补一次对位
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  resizeObserver = new ResizeObserver(() => placeIndicator(activeId.value, true))
  if (wrapEl.value)
    resizeObserver.observe(wrapEl.value)

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
onUnmounted(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
})

// 大纲链接是朴素的 <a href="#id">,不在这里拦截点击。滚动落点与动画统一由
// app/router.options.ts 的 scrollBehavior 决定(偏移量、等待异步渲染的标题、
// 减少动效降级都在那一处),这里多写一份只会和它抢同一次滚动。
</script>

<template>
  <nav id="post-outline" aria-label="文章大纲" class="text-xs font-mono">
    <p class="mb-3 text-text-mute">
      大纲
    </p>
    <div ref="wrapEl" class="relative">
      <ul class="flex flex-col list-none gap-2 border-l border-border pl-0">
        <li v-for="item in items" :key="item.id">
          <a
            :href="`#${item.id}`"
            class="outline-link block py-0.5 hover:text-text"
            :class="[
              item.depth === 3 ? 'pl-6' : 'pl-3',
              activeId === item.id ? 'outline-link-active text-text' : 'text-text-mute',
            ]"
          >
            {{ item.text }}
          </a>
        </li>
      </ul>
      <span
        class="outline-indicator"
        :class="{
          'outline-indicator-up': direction === 'up',
          'outline-indicator-instant': instant,
          'outline-indicator-hidden': !indicatorVisible,
        }"
        :style="indicator && { top: `${indicator.top}px`, bottom: `${indicator.bottom}px` }"
        aria-hidden="true"
      />
    </div>
  </nav>
</template>

<style>
/* 两条边各走各的过渡:领先的那条带一点回弹(控制点 y > 1,冲过目标再落回),
   跟随的那条不回弹、延迟起步。默认是往下走 —— 下沿领先;-up 时对调。 */
.outline-indicator {
  --_lead: 340ms cubic-bezier(0.34, 1.3, 0.64, 1);
  --_trail: 380ms cubic-bezier(0.65, 0, 0.35, 1) 100ms;
  --_fade: opacity 200ms linear;

  position: absolute;
  left: 0;
  width: 2px;
  border-radius: 9999px;
  background-color: var(--c-primary);
  transition:
    top var(--_trail),
    bottom var(--_lead),
    var(--_fade);
}

.outline-indicator-up {
  transition:
    top var(--_lead),
    bottom var(--_trail),
    var(--_fade);
}

.outline-indicator-instant {
  transition: var(--_fade);
}

.outline-indicator-hidden {
  opacity: 0;
}

/* 全局的减少动效规则只压时长、不压延迟,跟随边会在 100ms 后才跳过去 */
@media (prefers-reduced-motion: reduce) {
  .outline-indicator {
    transition-delay: 0s;
  }
}

/* 加粗用描边而不是 font-weight:中文回落到的字体只有几档固定字重,font-weight
   过渡会一档一档地跳;字重变了字也会变宽,可能把一行挤成两行。描边不改变排版。
   过渡的是描边颜色(透明 → 文字色)而不是宽度:实测 Chrome 155 里
   -webkit-text-stroke-width 不可动画,改了直接跳变。 */
.outline-link {
  -webkit-text-stroke: 0.35px transparent;
  transition:
    color 200ms cubic-bezier(0.4, 0, 0.2, 1),
    -webkit-text-stroke-color 260ms cubic-bezier(0.4, 0, 0.2, 1);
}

.outline-link-active {
  -webkit-text-stroke-color: currentColor;
}
</style>

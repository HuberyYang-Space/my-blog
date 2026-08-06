<script setup lang="ts">
const props = defineProps<{
  /** BaseLayout 的 .content-scroll 元素 —— 由父组件把 DOM 引用传进来,
   *  避免自己再用 document.querySelector('.content-scroll') 隐式依赖一个类名字符串。 */
  scrollTarget: HTMLElement | null
}>()

const SHOW_THRESHOLD = 400

const visible = ref(false)

// 点击回顶后,scrollTo({ smooth: true }) 会在动画过程中持续触发 scroll 事件,
// 期间 scrollTop 仍然会短暂高于阈值 —— 不加这道屏蔽的话 onScroll 会把 visible
// 重新置回 true,按钮出现"消失又重新淡入"的弹跳。用原生 scrollend(而非等
// scrollTop 归零)解除屏蔽:滚动动画如果被用户中途反向滑动打断,scrollTop
// 可能永远不会再降到 0,靠"归零"判断会让这个标志卡死在 true,之后所有滚动
// 都被忽略、按钮再也不会出现;scrollend 不管动画是正常结束还是被打断,
// 滚动一旦停下来就必定触发一次。
const scrollingToTop = ref(false)

function onScroll() {
  if (scrollingToTop.value)
    return
  visible.value = (props.scrollTarget?.scrollTop ?? 0) > SHOW_THRESHOLD
}

function onScrollEnd() {
  scrollingToTop.value = false
}

// 用 watch 而不是 onMounted 直接读 props.scrollTarget:后者依赖"父组件的模板 ref
// 一定先于子组件 onMounted 就绪"这个 Vue 内部时序细节,watch(immediate: true) 则是
// 不管值何时到位都能正确挂上监听器,不必依赖这层隐式保证。
watch(() => props.scrollTarget, (el, prevEl) => {
  prevEl?.removeEventListener('scroll', onScroll)
  prevEl?.removeEventListener('scrollend', onScrollEnd)
  el?.addEventListener('scroll', onScroll, { passive: true })
  el?.addEventListener('scrollend', onScrollEnd, { passive: true })
}, { immediate: true })

onUnmounted(() => {
  props.scrollTarget?.removeEventListener('scroll', onScroll)
  props.scrollTarget?.removeEventListener('scrollend', onScrollEnd)
})

function scrollToTop() {
  // 点击后立刻隐藏,不等滚动过程中被动越过阈值再消失 —— 否则会看到按钮
  // 一边往上飘一边消失,而不是干脆利落地收起。
  visible.value = false
  scrollingToTop.value = true

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  props.scrollTarget?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}
</script>

<template>
  <Transition name="scroll-top-fade">
    <button
      v-if="visible"
      type="button"
      class="scroll-top-button"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <span class="i-ph-arrow-up" aria-hidden="true" />
    </button>
  </Transition>
</template>

<style>
/* 悬浮在视口右下角,不参与文档流(BaseLayout 只用 v-if + class 控制展示范围,
   不再把它摆进网格,见 BaseLayout.vue)。bottom 直接写死间距,不必像最早那版
   一样跟 --footer-h 联动 —— 这个按钮现在只在文章详情页出现,而该页面恒传
   hide-footer,Footer 组件从不渲染,不存在"页脚可能占位也可能不占位"的情况。
   外观对齐 SearchTrigger 的既有语言(边框 + 6px 圆角 + 36px 见方),不用本站没有
   先例的圆形悬浮按钮形状。 */
.scroll-top-button {
  position: fixed;
  right: 2rem;
  bottom: 2.5rem;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  color: var(--c-text-mute);
  background-color: color-mix(in srgb, var(--c-bg) 85%, transparent);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.scroll-top-button:hover {
  color: var(--c-primary);
  border-color: var(--c-primary);
}

.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

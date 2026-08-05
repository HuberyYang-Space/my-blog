<script setup lang="ts">
const props = defineProps<{
  /** BaseLayout 的 .content-scroll 元素 —— 由父组件把 DOM 引用传进来,
   *  避免自己再用 document.querySelector('.content-scroll') 隐式依赖一个类名字符串。 */
  scrollTarget: HTMLElement | null
}>()

const SHOW_THRESHOLD = 400

const visible = ref(false)

function onScroll() {
  visible.value = (props.scrollTarget?.scrollTop ?? 0) > SHOW_THRESHOLD
}

// 用 watch 而不是 onMounted 直接读 props.scrollTarget:后者依赖"父组件的模板 ref
// 一定先于子组件 onMounted 就绪"这个 Vue 内部时序细节,watch(immediate: true) 则是
// 不管值何时到位都能正确挂上监听器,不必依赖这层隐式保证。
watch(() => props.scrollTarget, (el, prevEl) => {
  prevEl?.removeEventListener('scroll', onScroll)
  el?.addEventListener('scroll', onScroll, { passive: true })
}, { immediate: true })

onUnmounted(() => props.scrollTarget?.removeEventListener('scroll', onScroll))

function scrollToTop() {
  // 点击后立刻隐藏,不等滚动过程中被动越过阈值再消失 —— 否则会看到按钮
  // 一边往上飘一边消失,而不是干脆利落地收起。
  visible.value = false

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
/* 定位用 --footer-h 而不是写死数值:页脚在文章详情页会被 hideFooter 隐藏,但
   .content-scroll 的 padding-bottom 始终按这个变量预留空间(见 BaseLayout.vue),
   按钮跟着同一个变量走,不管页脚是否实际渲染都不会贴底或被遮住。
   外观对齐 SearchTrigger 的既有语言(边框 + 6px 圆角 + 36px 见方),不用本站没有
   先例的圆形悬浮按钮形状。 */
.scroll-top-button {
  position: fixed;
  right: 1.5rem;
  bottom: calc(var(--footer-h) + 1rem);
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

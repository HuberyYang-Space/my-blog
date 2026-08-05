<script setup lang="ts">
const open = ref(false)

// 挂载前不渲染快捷键符号:⌘ 还是 Ctrl 取决于平台,服务端无从得知,
// 渲染任一个都可能与实际不符。同 ThemeToggle 的处理。
const mounted = ref(false)
const isMac = ref(false)

function onKeydown(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey))
    return

  // 焦点在输入框里时不劫持 —— 让浏览器/页面自己的行为优先
  const target = event.target as HTMLElement | null
  if (target?.isContentEditable || /^(?:input|textarea|select)$/i.test(target?.tagName ?? ''))
    return

  event.preventDefault()
  open.value = true
}

onMounted(() => {
  mounted.value = true
  isMac.value = /mac|iphone|ipad|ipod/i.test(navigator.userAgent)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <button
    type="button"
    class="search-trigger"
    aria-label="搜索"
    @click="open = true"
  >
    <span class="i-ph-magnifying-glass search-trigger-icon" aria-hidden="true" />
    <span class="search-trigger-label">搜索</span>
    <!-- 宽度由按钮固定,键帽内容变化不会推动其他元素,故无需占位兜底 -->
    <kbd v-if="mounted" class="search-trigger-kbd">{{ isMac ? '⌘' : 'Ctrl ' }}K</kbd>
  </button>

  <SearchDialog v-model:open="open" />
</template>

<style>
/* 尺寸沿用 Pagefind 组件 UI 的规格:高 36px(--pf-input-height)、圆角 6px
   (--pf-border-radius);138px 是「⌕ 搜索 ⌘K」这套内容的实测宽度。

   宽度写死而不是由内容撑开:⌘ 与 Ctrl 的字宽差着好几个字符,交给内容撑的话,
   水合前后按钮宽度会变,整个头部右侧跟着跳一下。固定宽度 + 键帽右对齐,
   平台差异就被吸收在按钮内部了。 */
.search-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 138px;
  height: 36px;
  padding: 0 0.5rem 0 0.625rem;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--c-text-mute);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

/* 全站可点击元素 hover 统一变主题色(见 links.css 的 .tinter/.highlighter/
   .underline-sweep),这里补上此前唯一的例外 —— 背景色仍用中性的 --c-bg-soft,
   它和文字/边框变色是两件事,不冲突。 */
.search-trigger:hover {
  color: var(--c-primary);
  border-color: var(--c-primary);
  background-color: var(--c-bg-soft);
}

.search-trigger-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
}

.search-trigger-label {
  flex: 1;
  text-align: left;
}

.search-trigger-kbd {
  flex-shrink: 0;
  padding: 0.0625rem 0.3125rem;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--c-text-mute);
}

/* 窄屏退化成纯图标,与 ThemeToggle 同构(对应 Pagefind 的 compact 属性)。
   手机上既排不下 138px,也根本按不出 ⌘K —— 那个键帽在触屏上是纯占位。 */
@media (width < 640px) {
  .search-trigger {
    width: 36px;
    justify-content: center;
    padding: 0;
    border-color: transparent;
  }

  .search-trigger-label,
  .search-trigger-kbd {
    display: none;
  }
}
</style>

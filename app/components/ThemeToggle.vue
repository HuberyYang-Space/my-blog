<script setup lang="ts">
const isDark = ref(false)
// 挂载前不渲染图标:服务端无从得知用户主题,渲染任一图标都可能与实际配色不符
const mounted = ref(false)

onMounted(() => {
  // 以 <html> 上的 class 作为初始状态的唯一真源。
  // 该 class 由 nuxt.config.ts 注入的防闪烁内联脚本设置,此处不重复实现判断逻辑,
  // 避免出现两份需要同步维护的真源。
  isDark.value = document.documentElement.classList.contains('dark')
  mounted.value = true
})

function toggle() {
  isDark.value = !isDark.value

  const root = document.documentElement
  root.classList.toggle('dark', isDark.value)

  try {
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }
  catch {
    // 隐私模式下 localStorage 不可用,主题切换仍在本次会话内生效
  }
}
</script>

<template>
  <button
    type="button"
    class="rounded-md p-2 text-text-soft transition-colors hover:bg-bg-soft hover:text-text"
    :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'"
    :aria-pressed="isDark"
    @click="toggle"
  >
    <!-- 占位保持布局稳定,避免挂载后图标出现导致的位移 -->
    <span v-if="!mounted" class="block size-5" aria-hidden="true" />
    <span v-else-if="isDark" class="i-ph-moon-stars-duotone block size-5" aria-hidden="true" />
    <span v-else class="i-ph-sun-duotone block size-5" aria-hidden="true" />
  </button>
</template>

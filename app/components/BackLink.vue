<script setup lang="ts">
/**
 * 页面底部的"返回"链接。
 *
 * 左箭头是这个概念的固定组成部分,写死在组件内,调用方只给目标和文案。
 */
defineProps<{
  href: string
}>()
</script>

<template>
  <NuxtLink :to="href" class="tinter text-sm text-text-mute">
    ← <slot />
  </NuxtLink>
</template>

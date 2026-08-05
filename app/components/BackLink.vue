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
  <NuxtLink :to="href" class="group inline-flex items-center gap-1.5 text-sm text-text-mute">
    <span class="i-ph-arrow-left transition-transform group-hover:-translate-x-0.5" />
    <span class="tinter"><slot /></span>
  </NuxtLink>
</template>

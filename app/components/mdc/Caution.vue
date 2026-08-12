<script setup lang="ts">
// 语义包装,见 Callout.vue 的说明
defineProps<{ title?: string }>()
</script>

<template>
  <Callout type="caution" :title="title">
    <slot />
  </Callout>
</template>

<script setup lang="ts">
const props = defineProps<{
  tag: string
}>()

const to = computed(() => {
  try {
    return tagPath(props.tag)
  }
  catch (error) {
    // 预渲染把异常一律报成 `[500] Server Error`,不打印消息本身(同 PostBadges 的处理),
    // 不补这一行的话构建失败时看不出是哪个标签写错了。打完仍要 rethrow。
    console.error(`[TagLink] ${(error as Error).message}`)
    throw error
  }
})
</script>

<template>
  <NuxtLink :to="to" class="tinter">
    #{{ tag }}
  </NuxtLink>
</template>

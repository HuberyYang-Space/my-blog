<script setup lang="ts">
const props = defineProps<{
  date: Date | string
}>()

// frontmatter 的纯日期字符串经 z.coerce.date() 解析成 UTC 零点,
// 这里必须显式指定 timeZone: 'UTC',否则构建机本地时区会让日期整体偏移一天。
// Nuxt Content 经 SQLite 取回的日期是字符串,统一收敛成 Date 再格式化。
const parsed = computed(() => new Date(props.date))
const formatted = computed(() => parsed.value.toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
}))
</script>

<template>
  <!-- datetime 属性给机器读(SEO / 阅读器),可见文本给人读 -->
  <time :datetime="parsed.toISOString()">{{ formatted }}</time>
</template>

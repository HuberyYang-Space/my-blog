<script setup lang="ts">
/**
 * 404 / 错误页正文。
 *
 * 被 `error.vue`(运行时错误)与 `pages/404.vue`(为产出服务端渲染的 404.html)
 * 共用 —— 两处各写一遍 markup 迟早会漂移。
 */
const props = withDefaults(defineProps<{
  statusCode?: number
  statusMessage?: string
}>(), {
  statusCode: 404,
})

const isNotFound = computed(() => props.statusCode === 404)
const heading = computed(() => (isNotFound.value ? '页面不存在' : '出错了'))
const detail = computed(() => (
  isNotFound.value
    ? '你访问的地址可能已经变更或被移除。'
    : props.statusMessage || '服务器处理这个请求时出了问题。'
))
</script>

<template>
  <section class="py-16 text-center">
    <p class="text-4xl text-text-mute font-semibold tracking-tight">
      {{ statusCode }}
    </p>
    <h1 class="mt-4 text-xl font-semibold tracking-tight">
      {{ heading }}
    </h1>
    <p class="mt-3 text-text-soft">
      {{ detail }}
    </p>
    <!-- 用原生 a 而非 NuxtLink:错误页可能在路由未就绪时渲染,整页跳转更稳 -->
    <a
      href="/"
      class="mt-8 inline-block text-sm text-primary transition-opacity hover:opacity-80"
    >
      ← 返回首页
    </a>
  </section>
</template>

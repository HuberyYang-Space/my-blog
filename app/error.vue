<script setup lang="ts">
import type { NuxtError } from '#app'

// 运行时错误页(开发期 SSR、以及水合后由客户端路由触发的 404)。
// 静态产物里的 404.html 不由本文件产出 —— 见 pages/404.vue 与 nuxt.config 的
// nitro:build:public-assets 钩子。
const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error?.statusCode ?? 404)
const heading = computed(() => (statusCode.value === 404 ? '页面不存在' : '出错了'))
</script>

<template>
  <BaseLayout :title="heading" description="你访问的页面不存在或已被移动。">
    <NotFound :status-code="statusCode" :status-message="error?.statusMessage" />
  </BaseLayout>
</template>

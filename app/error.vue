<script setup lang="ts">
import type { NuxtError } from '#app'

// 运行时错误页(开发期 SSR、以及水合后由客户端路由触发的 404)。
// 静态产物里的 404.html 不由本文件产出 —— 见 pages/404.vue 与 nuxt.config 的
// nitro:build:public-assets 钩子。
const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error?.statusCode ?? 404)
// 与 NotFound 渲染的是同一份文案(见 app/utils/error-copy.ts)——
// 500 页面不会再顶着一句"页面不存在或已被移动"的 description。
const copy = computed(() => errorCopy(statusCode.value, props.error?.statusMessage))
</script>

<template>
  <BaseLayout :title="copy.heading" :description="copy.detail">
    <NotFound :status-code="statusCode" :status-message="error?.statusMessage" />
  </BaseLayout>
</template>

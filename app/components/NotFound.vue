<script setup lang="ts">
/**
 * 404 / 错误页正文。
 *
 * 被 `error.vue`(运行时错误)与 `pages/404.vue`(为产出服务端渲染的 404.html)
 * 共用 —— 两处各写一遍 markup 迟早会漂移。
 *
 * 文案不在这里判定:标题与说明由 `app/utils/error-copy.ts` 给出,那两处页面
 * 拿同一个函数去填 title / description,页面标签与页面正文因此不会说两种话。
 */
const props = withDefaults(defineProps<{
  statusCode?: number
  statusMessage?: string
}>(), {
  statusCode: 404,
})

const copy = computed(() => errorCopy(props.statusCode, props.statusMessage))
</script>

<template>
  <section class="py-16 text-center">
    <p class="text-4xl text-text-mute font-semibold tracking-tight">
      {{ statusCode }}
    </p>
    <h1 class="mt-4 text-xl font-semibold tracking-tight">
      {{ copy.heading }}
    </h1>
    <p class="mt-3 text-text-soft">
      {{ copy.detail }}
    </p>
    <!--
      用原生 a 而非 NuxtLink(也就没法直接复用 BackLink):错误页可能在路由未就绪时
      渲染,整页跳转更稳。观感仍对齐 BackLink —— 图标箭头 + .tinter,不另起一套
      只在这一个页面出现的链接样式。
    -->
    <a href="/" class="group mt-8 inline-flex items-center gap-1.5 text-sm text-text-mute">
      <span class="i-ph-arrow-left transition-transform group-hover:-translate-x-0.5" />
      <span class="tinter">返回首页</span>
    </a>
  </section>
</template>

<script setup lang="ts">
/**
 * 仅为产出**服务端渲染**的 404.html 而存在。
 *
 * nuxt generate 默认写出的 404.html 是 SPA 兜底空壳(<div id="__nuxt"></div>),
 * 内容要等 JS 水合才出现 —— 爬虫与禁用 JS 的访客看到的是空白页。
 *
 * 于是把本页预渲染成 /404/index.html,再由 nuxt.config 的
 * nitro:build:public-assets 钩子覆盖到根级 404.html。
 */

// 与 NotFound 渲染的是同一份文案(见 app/utils/error-copy.ts),不在这里手抄一遍
const copy = errorCopy(404)
</script>

<template>
  <BaseLayout :title="copy.heading" :description="copy.detail">
    <NotFound />
  </BaseLayout>
</template>

<script setup lang="ts">
const route = useRoute()

// 取数与相邻文章的计算都在 app/utils/posts.ts —— 页面只负责渲染。
// (全站三处取数曾各写各的,"文章数据从哪来"没有统一答案。)
const { data } = await useAsyncData(
  `post-${route.path}`,
  () => getPostWithNeighbors(route.path),
)

if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '页面不存在',
    fatal: true,
  })
}
</script>

<template>
  <PostLayout
    v-if="data"
    :post="data.post"
    :links="data.post.body?.toc?.links ?? []"
    :older-post="data.olderPost"
    :newer-post="data.newerPost"
  >
    <ContentRenderer :value="data.post" class="prose" />
  </PostLayout>
</template>

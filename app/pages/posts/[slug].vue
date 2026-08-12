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

// 锚点滚动(搜索跳转、大纲点击、直接访问带 hash 的 URL)统一由
// app/router.options.ts 的 scrollBehavior 处理,这里不再自己滚一次 ——
// 两处都滚同一个目标时,后一次会打断前一次的动画并停在错误位置。
// "目标标题还没渲染出来"这个时序问题也在那里兜底(见其中的 waitForElement)。
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

<script setup lang="ts">
const route = useRoute()

const { data } = await useAsyncData(`post-${route.path}`, async () => {
  const post = await queryCollection('blog').path(route.path).first()

  // 草稿在生产构建下不可见 → 不被预渲染 → 也就访问不到
  if (!post || !isPublishedPost(post))
    return null

  // 相邻文章只用到路径/标题/日期,select 掉正文 —— 否则每个文章页都会把
  // 全站所有文章的完整正文拉一遍,只为了算前后两篇。
  const index = (await queryCollection('blog')
    .select('path', 'title', 'date', 'draft')
    .order('date', 'DESC')
    .all()).filter(isPublishedPost)

  const i = index.findIndex(p => p.path === route.path)

  return {
    post,
    /** 较早发布的文章(按日期倒序排列,当前文章之后的一项) */
    olderPost: i >= 0 && i < index.length - 1 ? index[i + 1] : undefined,
    /** 较新发布的文章(按日期倒序排列,当前文章之前的一项) */
    newerPost: i > 0 ? index[i - 1] : undefined,
  }
})

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

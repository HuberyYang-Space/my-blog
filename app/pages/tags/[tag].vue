<script setup lang="ts">
const route = useRoute()
const tag = computed(() => decodeURIComponent(String(route.params.tag)))

const { data: posts } = await useAsyncData(`tag-${route.path}`, async () => {
  // 一次分组拿到全部标签及各自的文章列表,避免逐标签重复扫描全集合。
  const groups = await getPostsGroupedByTag()
  return groups.find(group => group.tag === tag.value)?.posts ?? null
})

if (!posts.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '标签不存在',
    fatal: true,
  })
}
</script>

<template>
  <BaseLayout
    :title="`标签:${tag}`"
    :description="`标记为 ${tag} 的全部文章,共 ${posts?.length ?? 0} 篇。`"
  >
    <section class="py-4">
      <h1 class="text-xl font-semibold tracking-tight">
        #{{ tag }}
      </h1>
      <p class="mt-2 text-sm text-text-mute">
        共 {{ posts?.length ?? 0 }} 篇
      </p>
    </section>

    <section class="mt-6">
      <PostCard v-for="post in posts" :key="post.path" :post="post" />
    </section>

    <nav class="mt-12">
      <BackLink href="/">
        返回首页
      </BackLink>
    </nav>
  </BaseLayout>
</template>

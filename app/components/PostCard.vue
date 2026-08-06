<script setup lang="ts">
import type { BlogCollectionItem } from '@nuxt/content'

defineProps<{
  post: BlogCollectionItem
}>()
</script>

<template>
  <article class="border-b border-border py-5 last:border-b-0">
    <NuxtLink :to="post.path" class="block">
      <div class="flex items-baseline justify-between gap-4">
        <!-- min-w-0 必需:标题挂多个徽章后,若不允许这一列收缩,右侧那个
             shrink-0 的日期会被推出容器。 -->
        <h2 class="min-w-0 text-base font-medium">
          <span class="tinter">{{ post.title }}</span>
          <PostBadges :post="post" />
        </h2>
        <FormattedDate :date="post.date" class="shrink-0 text-sm text-text-mute" />
      </div>
      <p class="mt-1.5 text-sm text-text-soft">
        {{ post.description }}
      </p>
    </NuxtLink>
  </article>
</template>

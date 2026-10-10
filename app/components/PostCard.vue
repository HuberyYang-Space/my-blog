<script setup lang="ts">
import type { PostListItem } from '~/utils/posts'

defineProps<{
  post: PostListItem
}>()
</script>

<template>
  <article class="border-b border-border py-5 last:border-b-0">
    <NuxtLink :to="post.path" class="block">
      <div class="flex items-baseline justify-between gap-3">
        <!-- min-w-0 必需:标题挂多个徽章后,若不允许这一列收缩,右侧那个
             shrink-0 的日期会被推出容器。
             text-wrap 覆盖 reset 给标题的 balance:balance 会把两行切成等长,
             第一行在一半处就折了,而这里要的是排满到日期跟前再折。 -->
        <h2 class="min-w-0 text-wrap text-base font-medium">
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

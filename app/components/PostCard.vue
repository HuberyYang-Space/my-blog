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
        <h2 class="text-base font-medium">
          <span class="tinter">{{ post.title }}</span>
          <span
            v-if="post.draft"
            class="ml-2 rounded bg-bg-soft px-1.5 py-0.5 align-middle text-xs text-text-mute font-normal"
          >
            草稿
          </span>
        </h2>
        <FormattedDate :date="post.date" class="shrink-0 text-sm text-text-mute" />
      </div>
      <p class="mt-1.5 text-sm text-text-soft">
        {{ post.description }}
      </p>
    </NuxtLink>
  </article>
</template>

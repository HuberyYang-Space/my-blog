<script setup lang="ts">
import type { PostSummary } from '~/utils/posts'

/**
 * 收 PostSummary(只有路径与标题)而不是整个 BlogCollectionItem —— 取数层因此
 * 能只 select 这两列,不必为翻页把全站正文拉一遍。这个"轻量文章"的形状由
 * app/utils/posts.ts 定义,组件里不再另起一个同形状的接口:两份定义早晚会
 * 各自加字段,而它们本该是同一件东西。
 */
defineProps<{
  /** 较早发布的文章(在按日期倒序的列表里排在当前文章之后) */
  older?: PostSummary
  /** 较新发布的文章(在按日期倒序的列表里排在当前文章之前) */
  newer?: PostSummary
}>()
</script>

<template>
  <nav
    v-if="older || newer"
    aria-label="文章翻页"
    class="grid grid-cols-1 mt-12 gap-3 border-t border-border pt-6 sm:grid-cols-2"
  >
    <NuxtLink
      v-if="newer"
      :to="newer.path"
      class="group border border-transparent rounded-md p-3 transition-colors hover:border-border"
    >
      <span class="flex items-center gap-1.5 text-xs text-text-mute">
        上一篇
        <span class="i-ph-arrow-left transition-transform group-hover:-translate-x-0.5" />
      </span>
      <span class="mt-1 block text-sm text-text-soft">
        <span class="transition-colors group-hover:text-text">{{ newer.title }}</span>
      </span>
    </NuxtLink>
    <NuxtLink
      v-if="older"
      :to="older.path"
      class="group border border-transparent rounded-md p-3 text-right transition-colors sm:col-start-2 hover:border-border"
    >
      <span class="flex items-center justify-end gap-1.5 text-xs text-text-mute">
        下一篇
        <span class="i-ph-arrow-right transition-transform group-hover:translate-x-0.5" />
      </span>
      <span class="mt-1 block text-sm text-text-soft">
        <span class="transition-colors group-hover:text-text">{{ older.title }}</span>
      </span>
    </NuxtLink>
  </nav>
</template>

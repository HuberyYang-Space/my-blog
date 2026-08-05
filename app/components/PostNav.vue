<script setup lang="ts">
/**
 * 只声明真正用到的字段,而不是收整个 BlogCollectionItem ——
 * 这样调用方可以只 select 路径与标题,不必为翻页拉取全文。
 */
interface AdjacentPost {
  path: string
  title: string
}

defineProps<{
  /** 较早发布的文章(在按日期倒序的列表里排在当前文章之后) */
  older?: AdjacentPost
  /** 较新发布的文章(在按日期倒序的列表里排在当前文章之前) */
  newer?: AdjacentPost
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

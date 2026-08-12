<script setup lang="ts">
import type { BlogCollectionItem, TocLink } from '@nuxt/content'
import type { PostSummary } from '~/utils/posts'

const props = defineProps<{
  post: BlogCollectionItem
  links: TocLink[]
  /** 较早发布的文章。只需路径与标题,形状见 app/utils/posts.ts 的 PostSummary */
  olderPost?: PostSummary
  /** 较新发布的文章 */
  newerPost?: PostSummary
}>()

// 大纲只在标题足够多时才有意义 —— 少于 3 个 h2 的短文放一个几乎空的框只是噪音
const showOutline = computed(() => props.links.filter(l => l.depth === 2).length >= 3)
</script>

<template>
  <BaseLayout
    :title="post.title"
    :description="post.description"
    og-type="article"
    :published-date="post.date"
    wide
  >
    <article>
      <header class="post-intro mb-10 border-b border-border pb-6 pt-6">
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          {{ post.title }}<PostBadges :post="post" />
        </h1>
        <!--
          元信息行用等宽字体,格式仿 git log / commit trailer(日期 · 标签 · 标签)——
          这是这个博客的受众(前端工程师)一眼就能认出的语汇,而非随手挑一个"数据用字体"。
        -->
        <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-mute font-mono">
          <FormattedDate :date="post.date" />
          <span v-if="post.updatedDate" class="inline-flex items-center gap-2">
            <span aria-hidden="true">·</span>
            更新于 <FormattedDate :date="post.updatedDate" />
          </span>
          <span v-for="tag in post.tags ?? []" :key="tag" class="inline-flex items-center gap-2">
            <span aria-hidden="true">·</span>
            <TagLink :tag="tag" />
          </span>
        </div>
      </header>

      <!--
        正文容器(.prose)由调用方的 ContentRenderer 直接承担,这里不再额外包一层 div。
        原因:ContentRenderer 自身会渲染一个根元素,若外面再套 <div class="prose">,
        .prose > * + * 这条相邻兄弟间距规则就只匹配到那一个包装层,全文段落间距会整体丢失。
      -->
      <slot />
    </article>

    <template v-if="showOutline" #aside>
      <PostOutline :links="links" />
    </template>

    <!-- footer 具名插槽:BaseLayout 把它放进网格第二行(见 BaseLayout.vue)。
         PostNav 与返回链接一起放进来,保持原本"翻页 → 返回列表"的阅读顺序不被拆散。 -->
    <template #footer>
      <PostNav :older="olderPost" :newer="newerPost" />

      <nav class="mt-6">
        <BackLink href="/">
          返回文章列表
        </BackLink>
      </nav>
    </template>
  </BaseLayout>
</template>

<style>
/* 头部信息块的一次性入场动效:只编排这一处,不做滚动触发的散点效果。
   prefers-reduced-motion 由 assets/css/reset.css 的全局媒体查询统一降级,这里无需重复处理。 */
@keyframes post-intro-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.post-intro {
  animation: post-intro-in 0.4s ease-out;
}
</style>

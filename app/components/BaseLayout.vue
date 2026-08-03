<script setup lang="ts">
import { SITE } from '~/config'

const props = withDefaults(defineProps<{
  title: string
  description: string
  /** 文章页传 'article',其余页面用默认的 'website' */
  ogType?: 'website' | 'article'
  /** 仅 ogType 为 'article' 时有意义,输出 article:published_time */
  publishedDate?: Date | string
  /** 加宽正文容器(max-w-2xl → max-w-3xl)。目前仅文章详情页需要,给代码块/表格留呼吸空间 */
  wide?: boolean
}>(), {
  ogType: 'website',
  wide: false,
})

const route = useRoute()
const canonical = computed(() => new URL(route.path, SITE.url).href)
// OG 图必须是绝对 URL —— 抓取方(微信/Twitter/Slack)不在本站上下文中解析相对路径
const ogImage = new URL(SITE.ogImage, SITE.url).href

useSeoMeta({
  title: () => props.title,
  description: () => props.description,
  ogType: () => props.ogType,
  ogSiteName: SITE.title,
  ogTitle: () => props.title,
  ogDescription: () => props.description,
  ogUrl: () => canonical.value,
  ogImage,
  articlePublishedTime: () => (
    props.ogType === 'article' && props.publishedDate
      ? new Date(props.publishedDate).toISOString()
      : undefined
  ),
  twitterCard: 'summary_large_image',
  twitterTitle: () => props.title,
  twitterDescription: () => props.description,
  twitterImage: ogImage,
})

useHead({
  link: [{ rel: 'canonical', href: () => canonical.value }],
})

// aside 具名插槽承载文章大纲。只有传入内容时才腾出右侧 sticky 列,
// 其余页面(首页/about/标签页)不受影响,不会凭空多出空白列。
const slots = useSlots()
const hasAside = computed(() => Boolean(slots.aside))
const contentWidth = computed(() => (props.wide ? 'max-w-3xl' : 'max-w-2xl'))
</script>

<template>
  <div>
    <Header />
    <div
      class="mx-auto min-h-screen flex flex-col px-6"
      :class="hasAside ? 'post-shell' : contentWidth"
    >
      <main class="flex-1" :class="hasAside ? 'post-grid lg:grid lg:items-start lg:gap-x-10' : ''">
        <div class="mx-auto w-full" :class="[contentWidth, hasAside ? 'lg:col-start-2' : '']">
          <slot />
        </div>
        <aside
          v-if="hasAside"
          class="hidden lg:sticky lg:top-20 lg:col-start-3 lg:block lg:w-56 lg:justify-self-end lg:pt-6"
        >
          <slot name="aside" />
        </aside>
      </main>
      <div class="w-full" :class="hasAside ? `${contentWidth} mx-auto` : ''">
        <Footer />
      </div>
    </div>
  </div>
</template>

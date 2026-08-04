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

// OG 图必须是绝对 URL —— 抓取方(微信/Twitter/Slack)不在本站上下文中解析相对路径。
// 图片文件由根路由的 defineOgImage 生成(见 app/pages/index.vue),这里只负责让
// 每个页面都指向它;不在 BaseLayout 里调 defineOgImage,否则每条路由都会产出一张
// 字节相同的冗余 PNG。
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

<style>
/* 文章详情页(有大纲时)的外层容器:两侧留白 + 正文 48rem + 大纲 14rem + 两道 2.5rem
   间距,推出的完整宽度是 84rem —— 超过 Tailwind/Wind3 预设的最大关键字 7xl(80rem),
   所以单独定一个精确值,而不是拿一个偏窄的关键字将就。 */
.post-shell {
  max-width: 84rem;
}

/* 三栏网格,左右两栏用完全相同的 minmax(14rem, 1fr):正文居中依赖两栏"对称",
   而不是两栏"都是 1fr"——如果大纲那栏有下限、留白那栏没有,空间不够时网格会优先
   保住有下限的大纲栏,把差额全部从留白栏扣掉,正文就会明显偏左(曾用真实视口验证过)。
   两栏下限相同,才能保证无论怎么挤压,留白和大纲宽度始终相等、正文真正居中。
   工具类写不出这种 minmax() 组合值,项目里也没有任意值方括号语法的先例,
   跟 .site-header 的 color-mix() 一样单独具名一条规则。 */
.post-grid {
  grid-template-columns: minmax(14rem, 1fr) minmax(0, 48rem) minmax(14rem, 1fr);
}
</style>

<script setup lang="ts">
import { SITE } from '~/config'

const props = withDefaults(defineProps<{
  title: string
  description: string
  /** 文章页传 'article',其余页面用默认的 'website' */
  ogType?: 'website' | 'article'
  /** 仅 ogType 为 'article' 时有意义,输出 article:published_time */
  publishedDate?: Date | string
  modifiedDate?: Date | string
}>(), {
  ogType: 'website',
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
  articleModifiedTime: () => (
    props.ogType === 'article' && props.publishedDate
      ? articleModifiedTime(props.publishedDate, props.modifiedDate)
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

// aside 具名插槽承载文章大纲。只有传入内容时才渲染右侧浮层,
// 其余页面(首页/about/标签页)不受影响,阅读列宽度也不会跟着变化
// (大纲是 fixed 定位的独立浮层,不参与阅读列的宽度计算,见下方 .toc-aside)。
const slots = useSlots()
const hasAside = computed(() => Boolean(slots.aside))
const hasFooter = computed(() => Boolean(slots.footer))
</script>

<template>
  <!-- 页面滚动的是 document 本身(见 assets/css/reset.css),这里不再有自定义滚动
       容器。min-h-dvh + flex 列:内容不足一屏时 .page-main 的 flex-1 把页脚顶到
       视口底部,内容超过一屏时页脚自然跟在内容后面随页面滚走。 -->
  <div class="flex flex-col min-h-dvh">
    <Header />
    <!-- 头部是 fixed 的,不占文档流高度,这里用 padding-top 补偿被它遮住的空间 -->
    <div class="page-main flex-1">
      <div class="site-column">
        <main>
          <slot />
          <div v-if="hasFooter">
            <slot name="footer" />
          </div>
        </main>
      </div>
    </div>
    <Footer />
    <!-- 大纲是 fixed 定位的独立浮层,刻意不放进上面的居中容器 —— 阅读列的宽度和
         位置不应该因为这个可选功能存在与否而改变。定位见下方 .toc-aside。 -->
    <aside v-if="hasAside" class="toc-aside">
      <slot name="aside" />
    </aside>
    <!-- fixed 定位,不参与文档流,展示范围靠 v-if(仅文章详情页有大纲时)+ 下方
         .scroll-top-button-visible 断点,而不是让它出现在所有页面。断点必须和
         .toc-aside 一致,否则两者的显示区间对不上,会出现"大纲不见了但回顶按钮
         还占着它的位置"这类错位。 -->
    <ScrollToTopButton v-if="hasAside" class="scroll-top-button-visible" />
  </div>
</template>

<style>
/* 头部是 fixed 的(见 Header.vue),不占文档流高度,内容会从视口顶端开始排布并被
   它盖住 —— 用与它同源的 --header-h 做 padding 补偿。页脚已经是正常流里的普通
   元素,不需要对应的 padding-bottom。 */
.page-main {
  padding-top: var(--header-h);
}

/* 从内容列右边界扣除内边距后，以一级条目缩进量定位大纲边框。
   右侧留出回顶按钮的占位（2rem + 36px）和 1.25rem 净空。 */
.toc-aside {
  display: none;
  position: fixed;
  top: var(--scroll-offset);
  left: calc(50% + var(--site-column-width) / 2 - var(--site-column-padding) + var(--toc-gap));
  right: calc(3.25rem + 36px);
  max-width: 16rem;
  max-height: calc(100vh - var(--scroll-offset) - 2.5rem);
  overflow-y: auto;
}

/* 回顶按钮只在有大纲时才渲染(见模板),可见区间必须和 .toc-aside 完全一致,
   否则会出现"大纲消失了、按钮还占着位置"的错位。用两个类名的复合选择器
   (而非单独 .scroll-top-button)是为了让这条规则的权重稳赢
   ScrollToTopButton.vue 自己的 .scroll-top-button { display: flex }——
   两条单类选择器权重相同的话,谁生效只能看两个 SFC 的样式打包顺序,
   属于本项目明确要避免的那种"打包顺序决胜负"。 */
.scroll-top-button.scroll-top-button-visible {
  display: none;
}

/* 86rem 时大纲有约 15rem 的可用宽度（按 16px 根字号、未扣滚动条计算）。 */
@media (min-width: 86rem) {
  .toc-aside {
    display: block;
  }

  .scroll-top-button.scroll-top-button-visible {
    display: flex;
  }
}
</style>

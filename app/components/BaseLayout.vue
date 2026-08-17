<script setup lang="ts">
import { SITE } from '~/config'

const props = withDefaults(defineProps<{
  title: string
  description: string
  /** 文章页传 'article',其余页面用默认的 'website' */
  ogType?: 'website' | 'article'
  /** 仅 ogType 为 'article' 时有意义,输出 article:published_time */
  publishedDate?: Date | string
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
      <!-- 阅读列宽度的唯一真源:max-w-3xl,与 Header.vue 的导航条完全同源同宽,
           首页/about/标签页/文章页(无论是否有大纲)不再有第二个宽度值。 -->
      <div class="mx-auto max-w-3xl w-full px-6">
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

/* 大纲(TOC)浮层。定位在阅读列右边界之外的"多余空间"里,阅读列本身(max-w-3xl,
   半宽 24rem)完全不知道它的存在,不会因为大纲出现/消失而改变宽度或位置。
   left 的计算:50%(视口中点)+ 24rem(阅读列半宽,到达阅读列右边界)+ 2.5rem
   (与阅读列的间距)。
   top 与标题的滚动停靠位置同源,见 --scroll-offset(tokens.css)。
   原先挂在 grid 单元格里的 position: sticky 有"内容太多就被推走"的自然退路,
   改成 fixed 后失去这条退路,因此显式加 max-height + overflow-y 让超长大纲
   在自己内部滚动,而不是在视口底部被截断且无法触达。
   默认 display: none,显示断点见下方 @media —— 值不落在 UnoCSS/Wind3 预设的
   xl(1280px)/2xl(1536px)关键字上,沿用 .post-shell 的先例手写精确值,
   而不是硬套一个不够用或过度保守的关键字。 */
.toc-aside {
  display: none;
  position: fixed;
  top: var(--scroll-offset);
  left: calc(50% + 24rem + 2.5rem);
  width: 14rem;
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

/* 断点算式必须把 ScrollToTopButton 自己的footprint 算进去,不能只留一个笼统的
   "安全边距"——两者是两套不同的定位参照系(大纲相对阅读列中心,按钮相对视口
   右边缘),边距不够时大纲右边界会反过来越过按钮左边界。用真实浏览器量出来的
   数字反推(ScrollToTopButton.vue:right 2rem + width 36px = 2.25rem):

     大纲右边界(距视口左侧) = 50vw + 24rem 阅读列半宽 + 2.5rem 间距 + 14rem 大纲宽
     按钮左边界(距视口左侧) = 100vw - 2rem - 2.25rem
     两者之间留 1.25rem 净空 → 解出 vw ≥ 92rem(1472px)

   同样卡在 xl(1280px)/2xl(1536px)两个关键字中间,沿用 .post-shell 的先例
   手写精确值。1472px 已用真实浏览器核对过:两者之间净空 20px,不会重叠。 */
@media (min-width: 92rem) {
  .toc-aside {
    display: block;
  }

  .scroll-top-button.scroll-top-button-visible {
    display: flex;
  }
}
</style>

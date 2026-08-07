import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig> {
  scrollBehavior(to) {
    // window/html 永远不滚动(见 assets/css/reset.css),.content-scroll 才是
    // 唯一视口。Nuxt 默认实现假设 window 是视口,对 hash 目标会另外滚一次
    // window——这次滚动跟浏览器原生锚点跳转(或 pages/posts/[slug].vue 里自己
    // 触发的 scrollIntoView)对同一个目标算出几乎相同的位移,叠加后把
    // .content-scroll 整体顶出视口,页面看起来像内容消失了。返回 false 让
    // vue-router 到此为止,永远不要自己碰 window。
    //
    // 没有 hash 的普通路由切换(比如 PostNav 的上一篇/下一篇)也要接管:
    // .content-scroll 是 BaseLayout 持有的常驻 DOM,不会随路由切换重新挂载,
    // 不主动归零的话,切到新文章会停留在旧文章滚动到的位置。behavior 显式写
    // 'instant' 而不是依赖 .content-scroll 上的 CSS scroll-behavior: smooth——
    // 实测程序化滚动一旦走平滑动画,在某些调用时机下会静默卡在起点不动
    // (细节见 pages/posts/[slug].vue 里 scrollIntoView 的同类说明)。
    if (!to.hash)
      document.querySelector('.content-scroll')?.scrollTo({ top: 0, behavior: 'instant' })

    return false
  },
}

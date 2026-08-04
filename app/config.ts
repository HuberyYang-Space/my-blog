/**
 * 站点级配置的唯一真源。
 *
 * 页面组件、BaseLayout 的 SEO 标签、Nitro 的 RSS 路由、以及 `nuxt.config.ts`
 * 的 `site.url` 都从这里取值 —— 站名之类的字符串一旦散落在多个组件里,
 * 改名时漏掉一处不会报错,只会静默不一致。
 *
 * 注意本文件同时被 `nuxt.config.ts`(构建配置,Node 侧)和运行时代码导入,
 * 因此只能放纯常量:不能引用 Nuxt 自动导入的组合式函数、`#imports` 别名,
 * 或任何浏览器 API。
 */
export const SITE = {
  title: 'Hubery',
  /** 首页 hero 可见文案、首页 meta description、RSS 频道描述,三处同源 */
  description: '勤靡余劳，心有常闲。',
  author: 'Hubery Yang',
  /**
   * 站点根 URL,末尾不带斜杠。
   *
   * ⚠️ 暂定域名,上线前需与实际部署地址核对。canonical / sitemap / RSS / OG 图
   * 均依赖它生成绝对 URL,填错不报错,只会让这些链接整体指向错误域名(静默失败)。
   */
  url: 'https://blog.hubery.dev',

  /**
   * OG 分享图路径,相对站点根。
   *
   * 由 nuxt-og-image 在构建期生成,文件名规则是 `c_<模板组件名>.png` ——
   * 模板见 `app/components/OgImage/Hubery.browser.vue`,重命名模板必须同步改这里。
   * 之所以能写死:文件名只由组件名决定,不含内容哈希;且 `nuxt.config.ts` 的构建期
   * 守卫会核对每个页面的 og:image 是否真的存在于产物中,对不上就让构建失败,
   * 不会静默指向一个 404。
   */
  ogImage: '/_og/s/c_Hubery.browser.png',
} as const

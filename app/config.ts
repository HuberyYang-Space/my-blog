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
   * 站点语言标签(BCP 47)。
   *
   * <html lang>、日期格式化、RSS 的 <language>、以及标签排序的 collation
   * 四处同源。它们曾各自硬编码 'zh-CN',是同一个事实的四份副本 ——
   * 改语言时要改四处,漏一处不报错,只会让某一处静默地按另一种语言呈现。
   */
  locale: 'zh-CN',
  /**
   * 站点根 URL,末尾不带斜杠。
   *
   * canonical / sitemap / RSS / OG 图均依赖它生成绝对 URL。格式约束由
   * `test/config.test.ts` 守住(必须 https、无尾斜杠、无路径段)——
   * 这些写错都不会报错,只会让全站外链整体指向错误的地方。
   *
   * 但"格式对"不等于"域名对":是否与实际部署地址一致,机器无从判断。
   * 见下方 urlConfirmed。
   */
  url: 'https://blog.hubery.dev',

  /**
   * 上述域名是否已与实际部署地址核对过。
   *
   * 仍为 false 时,每次构建都会打印告警(见 scripts/verify-build.ts)。
   * 核对完把它改成 true —— 这一步只能由人来做,所以做成显式确认而不是
   * 让机器去猜哪些域名"看起来像占位符"。
   *
   * 刻意不做成构建失败:域名没核对是"还没上线",不是"构建坏了",
   * 拿它挡住日常开发得不偿失。
   */
  urlConfirmed: false,

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

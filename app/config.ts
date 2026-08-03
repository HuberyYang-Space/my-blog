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
  description: '记录前端工程实践与技术思考。',
  author: 'Hubery Yang',

  /**
   * 站点根 URL,末尾不带斜杠。
   *
   * ⚠️ 待确认:目前填的是暂定域名,上线前需与实际部署地址核对。
   * canonical / sitemap / RSS / OG 图全部依赖它生成绝对 URL,填错不会报错、
   * 只会让这些链接整体指向错误域名(静默失败)。
   */
  url: 'https://blog.hubery.dev',

  /** OG 分享图,相对站点根的路径,存放于 public/ */
  ogImage: '/og.png',
} as const

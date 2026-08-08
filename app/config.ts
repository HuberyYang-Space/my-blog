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
  url: 'https://huberyyang.site:87',

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
  urlConfirmed: true,

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

/**
 * 文章徽章预设表 —— 标题右侧那些小色块的唯一真源。
 *
 * frontmatter 里只写 key(`badges: [wip, translated]`),文案与配色一律从这里取。
 * 允许每篇内联写 `{ label, tone }` 的话,同一个徽章会散成 N 份副本:改文案要翻遍
 * 全站,而「连载中」与「连载中 」这种差一个空格的写法不报错,只会静默变成两个徽章。
 *
 * 新增徽章 = 在这里加一行。key 经 `content.config.ts` 的 z.enum 进入 schema,
 * 拼错拦在构建期(为什么还要第二道兜底,见 `app/utils/badges.ts`)。
 *
 * ⚠️ draft 是 dev-only。`draft: true` 的文章在生产被 `isPublishedPost()` 整个过滤掉
 * (不进列表、不预渲染、不进 RSS 与搜索索引),所以「草稿」二字线上永远不会出现 ——
 * 它留在表里是为了让开发期那个徽章与其余徽章共用同一套渲染,而不是硬编码在模板里。
 * 想要「已发布但还在写」的线上标记请用 wip,那是另一件事,改 draft 实现不了。
 *
 * tone 落到 tokens.css 的语气色,映射写在 `app/components/PostBadges.vue` 的 CSS 里。
 */
export const BADGES = {
  draft: { label: '草稿', tone: 'mute' },
  wip: { label: '连载中', tone: 'warning' },
  translated: { label: '译文', tone: 'info' },
  outdated: { label: '已过时', tone: 'danger' },
  featured: { label: '精选', tone: 'success' },
} as const

export type BadgeKey = keyof typeof BADGES
export type BadgeTone = typeof BADGES[BadgeKey]['tone']

/**
 * 徽章的渲染顺序 —— 取上面的定义序,不跟 frontmatter 的书写序走。
 *
 * 跟着书写序的话,`[wip, translated]` 与 `[translated, wip]` 会渲染成两种样子,
 * 同一组徽章在不同文章里位置飘忽。定义序还顺带解决了 draft 的排位:它在表里居首,
 * 自动注入后天然落在最前,不需要再写一条「draft 优先」的特例。
 */
export const BADGE_KEYS = Object.keys(BADGES) as BadgeKey[]

/**
 * 作者可以在 frontmatter 里手写的 key —— 不含 draft。
 *
 * draft 只接受由 `draft: true` 自动注入。允许手写的话,一篇 `draft: false` 而
 * `badges: [draft]` 的文章会被判定为已发布、正常上线,页面上却挂着「草稿」二字 ——
 * 恰好推翻上面那条「线上永远不会出现」。想标记"已发布但还在写"用 wip。
 */
export const AUTHORABLE_BADGE_KEYS = BADGE_KEYS.filter(key => key !== 'draft')

/**
 * 单篇文章的徽章数量上限。列表项右侧还杵着日期,超过这个数标题行会被挤散。
 *
 * 强制在 `app/utils/badges.ts` 做,不在 schema —— `content.config.ts` 里那个
 * `.max()` 不拦任何东西,理由见 CLAUDE.md 的「徽章约定」。
 */
export const MAX_BADGES = 3

import type { BadgeKey, BadgeTone } from '~/config'
import { AUTHORABLE_BADGE_KEYS, BADGE_KEYS, BADGES, MAX_BADGES } from '~/config'

export interface ResolvedBadge {
  key: BadgeKey
  label: string
  tone: BadgeTone
}

/** resolveBadges 只需要这几个字段,不必接整个文章对象 —— 单测里也就不用造一篇假文章 */
export interface BadgeSource {
  draft?: boolean
  badges?: readonly string[]
  /** 仅用于出错时指认是哪篇文章,判定本身用不到 */
  path?: string
}

/**
 * 把 frontmatter 的 badges 解析成可渲染的徽章列表。纯函数。
 *
 * 未知 key 直接抛错,不静默跳过。**不要**图省事写成
 * `BADGE_KEYS.filter(k => new Set(post.badges).has(k))` —— 那样拼错的 key 会被
 * 顺手滤掉,页面上少一个徽章而构建照常成功、控制台无报错,正是本项目反复踩过的
 * 那种「构建成功、只是某块东西凭空消失」的形状。
 *
 * 这道校验与 `content.config.ts` 的 z.enum 是双保险,不是冗余:schema 违规时
 * @nuxt/content 究竟让构建失败、还是打条 warn 后跳过该文档,是模块内部行为,
 * 后者会让整篇文章无声消失。抛错发生在预渲染期间,能确保构建停下来。
 *
 * draft 不写进 frontmatter 的 badges,由可见性开关自动注入:作者写了 `draft: true`
 * 就该得到草稿徽章,再手抄一遍 `badges: [draft]` 只会制造两处早晚对不上的事实。
 */
export function resolveBadges(post: BadgeSource): ResolvedBadge[] {
  const where = post.path ?? '(未知路径)'

  for (const key of post.badges ?? []) {
    // 用 Object.hasOwn 而不是 `key in BADGES`:in 会走原型链,于是 'constructor'
    // 'toString' '__proto__' 'valueOf' 这些名字全部通过校验,再被下面的 filter
    // 顺手滤掉 —— 页面上凭空少一个徽章而构建照常成功,正是本函数存在的意义所在。
    if (!Object.hasOwn(BADGES, key)) {
      throw new Error(
        `${where} 的 badges 里有未知徽章 "${key}"。`
        + `可选:${AUTHORABLE_BADGE_KEYS.join(' / ')} —— 预设表在 app/config.ts 的 BADGES`,
      )
    }

    // draft 只接受自动注入。手写的 `badges: [draft]` 挂在一篇 draft: false 的文章上
    // 会照常上线,页面上出现「草稿」二字 —— 而它本该是 dev-only 的。
    if (key === 'draft') {
      throw new Error(
        `${where} 的 badges 里不能手写 "draft" —— 它由 frontmatter 的 draft: true 自动注入。`
        + `想标记「已发布但还在写」请用 "wip"`,
      )
    }
  }

  const keys = new Set<string>(post.badges ?? [])
  if (post.draft)
    keys.add('draft')

  // 上限在注入之后算:draft 不占 frontmatter 的名额,但它一样要挤进标题行,
  // 于是 `draft: true` + 3 个 badges 会渲染出 4 个。
  // 这里是唯一的关卡 —— schema 里那个 .max() 拦不住任何东西(见 content.config.ts)。
  if (keys.size > MAX_BADGES) {
    throw new Error(
      `${where} 有 ${keys.size} 个徽章,超过上限 ${MAX_BADGES}`
      + `${post.draft ? '(其中「草稿」由 draft: true 自动注入,同样占位)' : ''}`
      + ` —— 列表项右侧还有日期,再多会把标题行挤散`,
    )
  }

  // 按 BADGE_KEYS 的定义序输出,与 frontmatter 的书写序无关(理由见 app/config.ts)
  return BADGE_KEYS
    .filter(key => keys.has(key))
    .map(key => ({ key, ...BADGES[key] }))
}

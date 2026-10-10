import type { BadgeKey } from './app/config'
import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { AUTHORABLE_BADGE_KEYS, MAX_BADGES, TAG_FORBIDDEN_CHARS } from './app/config'

const blog = defineCollection({
  type: 'page',
  source: {
    include: '**/*.md',
    exclude: ['**/_*.md'],
    cwd: './content/blog',
    prefix: '/posts',
  },
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // trim 避免空白导致的重复标签。保留字符的约束同 badges 一样运行时零效力,
    // 真正的关卡是 app/utils/posts.ts 的 tagPath()
    tags: z.array(z.string().trim().min(1).refine(tag => !TAG_FORBIDDEN_CHARS.test(tag), '标签不能含 / # ? %')).default([]),
    draft: z.boolean().default(false),
    // 只收预设表里可手写的 key(不含 draft),文案与配色见 app/config.ts 的 BADGES。
    //
    // ⚠️ 这两条约束**运行时零效力** —— @nuxt/content 不对 frontmatter 跑 schema 校验,
    // 它只拿 schema 推导 SQL 列与 TS 类型。写错 key 或写超 3 个都不会让构建停下来。
    // 真正的关卡在 `app/utils/badges.ts`,那里逐条抛错。留着这段是为了产出正确的
    // TS 类型与列定义,不要因为"看起来已经校验过了"就把那边的检查删掉。
    //
    // z.enum 要求非空元组,断言只是补上「至少一项」这条 TS 看不出来的信息。
    badges: z
      .array(z.enum(AUTHORABLE_BADGE_KEYS as [BadgeKey, ...BadgeKey[]]))
      .max(MAX_BADGES)
      .default([]),
  }),
})

export default defineContentConfig({
  collections: { blog },
})

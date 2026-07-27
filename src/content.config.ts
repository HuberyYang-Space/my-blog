import { glob } from 'astro/loaders'
// z 直接从 zod 取:`astro:content` 转出的那份已标记废弃。
import { defineCollection } from 'astro:content'
import { z } from 'zod'

const blog = defineCollection({
  // `[^_]*` 让下划线开头的文件成为草稿约定之外的另一层排除手段(如 _draft.md 不会被收录)
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // trim 避免空白导致的重复标签,regex 避免 '/' 破坏 /tags/[tag]/ 路由
    tags: z.array(z.string().trim().min(1).regex(/^[^/]+$/, '标签不能包含 /')).default([]),
    draft: z.boolean().default(false),
    // 预留:封面图 / OG 图,用 image() 走 Astro 的图片优化
    cover: image().optional(),
    // 预留:i18n
    lang: z.string().default('zh-CN'),
  }),
})

export const collections = { blog }

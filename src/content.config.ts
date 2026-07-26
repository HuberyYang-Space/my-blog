import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
  // `[^_]*` 让下划线开头的文件成为草稿约定之外的另一层排除手段(如 _draft.md 不会被收录)
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // 预留:封面图 / OG 图,用 image() 走 Astro 的图片优化
    cover: image().optional(),
    // 预留:i18n
    lang: z.string().default('zh-CN'),
  }),
})

export const collections = { blog }

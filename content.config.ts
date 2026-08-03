import { defineCollection, defineContentConfig, z } from '@nuxt/content'

const blog = defineCollection({
  type: 'page',
  source: {
    include: '**/*.md',
    // 对应原 Astro glob 的 `**/[^_]*.md`:下划线开头的文件不收录
    exclude: ['**/_*.md'],
    cwd: './content/blog',
    // 文章路由是 /posts/<slug>/,与迁移前保持一致
    prefix: '/posts',
  },
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // trim 避免空白导致的重复标签,regex 避免 '/' 破坏 /tags/[tag]/ 路由
    tags: z.array(z.string().trim().min(1).regex(/^[^/]+$/, '标签不能包含 /')).default([]),
    draft: z.boolean().default(false),
    // 预留:封面图 / OG 图。Nuxt Content 无 Astro 的 image() helper,存路径字符串
    cover: z.string().optional(),
    // 预留:i18n
    lang: z.string().default('zh-CN'),
  }),
})

export default defineContentConfig({
  collections: { blog },
})

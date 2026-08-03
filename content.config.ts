import { defineCollection, defineContentConfig, z } from '@nuxt/content'

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
    // trim 避免空白导致的重复标签,regex 避免 '/' 破坏 /tags/[tag]/ 路由
    tags: z.array(z.string().trim().min(1).regex(/^[^/]+$/, '标签不能包含 /')).default([]),
    draft: z.boolean().default(false),
  }),
})

export default defineContentConfig({
  collections: { blog },
})

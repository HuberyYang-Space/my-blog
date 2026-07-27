import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'

/**
 * 取用于展示的文章列表,按日期倒序。
 *
 * 草稿过滤是**唯一真源**:列表页与详情页都必须经由此函数取数据,
 * 否则两处各写一遍过滤条件,改动其一便会出现"列表里没有但能直接访问"这类漏网。
 *
 * 开发模式保留草稿以便边写边预览,生产构建则排除 —— 于是草稿既不会生成
 * 静态页面,也不会被 Pagefind 索引(它只扫描构建产物)。
 */
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true
  })

  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

/**
 * 取全部标签及其文章数,按文章数倒序、同数按标签名排序。
 *
 * 走 getPublishedPosts() 而非直接 getCollection —— 草稿里的标签不该出现在标签页,
 * 也不该凭空生成一个 /tags/xxx 路由。
 */
export async function getAllTags(): Promise<{ tag: string, count: number }[]> {
  const posts = await getPublishedPosts()
  const counts = new Map<string, number>()

  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'))
}

/** 取某个标签下的全部文章,顺序沿用 getPublishedPosts 的日期倒序。 */
export async function getPostsByTag(tag: string): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getPublishedPosts()
  return posts.filter(post => post.data.tags.includes(tag))
}

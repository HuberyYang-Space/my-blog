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
 * 按标签分组文章,按文章数倒序、同数按标签名排序;组内顺序沿用日期倒序。
 *
 * 只调用一次 getPublishedPosts() 并在内存里分组 —— 避免每个标签各自重新
 * getCollection + 排序一遍(标签数越多,重复扫描的浪费越大)。
 */
export async function getPostsGroupedByTag(): Promise<{ tag: string, posts: CollectionEntry<'blog'>[] }[]> {
  const posts = await getPublishedPosts()
  const groups = new Map<string, CollectionEntry<'blog'>[]>()

  for (const post of posts) {
    for (const tag of post.data.tags) {
      const group = groups.get(tag)
      if (group)
        group.push(post)
      else
        groups.set(tag, [post])
    }
  }

  return [...groups.entries()]
    .map(([tag, tagPosts]) => ({ tag, posts: tagPosts }))
    .sort((a, b) => b.posts.length - a.posts.length || a.tag.localeCompare(b.tag, 'zh-CN'))
}

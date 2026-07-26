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

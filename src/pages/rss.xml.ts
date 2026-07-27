import type { APIRoute } from 'astro'
import rss from '@astrojs/rss'
import { SITE } from '../config'
import { getPublishedPosts } from '../utils/posts'

/**
 * RSS 订阅源。
 *
 * 复用 getPublishedPosts() 而非自行调 getCollection —— 草稿过滤和排序只应存在一处,
 * 否则会出现"站点上看不到、订阅源里却推送了"这类漏网。
 */
export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts()

  return rss({
    title: SITE.title,
    description: SITE.description,
    // context.site 由 astro.config.ts 的 site 提供,已在构建守卫处校验过
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: [...post.data.tags],
      link: `/posts/${post.id}/`,
    })),
    customData: '<language>zh-CN</language>',
  })
}

import type { BlogCollectionItem } from '@nuxt/content'

/**
 * 取用于展示的文章列表,按日期倒序。
 *
 * 草稿过滤本身由 `shared/utils/posts.ts` 的 isPublishedPost() 定义 ——
 * 它是全站唯一真源,RSS 那条 Nitro 路由用的是同一个判定。
 */
export async function getPublishedPosts(): Promise<BlogCollectionItem[]> {
  const posts = await queryCollection('blog').order('date', 'DESC').all()
  return posts.filter(isPublishedPost)
}

/**
 * 按标签分组文章,按文章数倒序、同数按标签名排序;组内顺序沿用日期倒序。
 *
 * 只调用一次 getPublishedPosts() 并在内存里分组 —— 避免每个标签各自重新
 * 查询 + 排序一遍(标签数越多,重复扫描的浪费越大)。
 */
export async function getPostsGroupedByTag(): Promise<{ tag: string, posts: BlogCollectionItem[] }[]> {
  const posts = await getPublishedPosts()
  const groups = new Map<string, BlogCollectionItem[]>()

  for (const post of posts) {
    for (const tag of post.tags ?? []) {
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

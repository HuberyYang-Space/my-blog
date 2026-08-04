import type { BlogCollectionItem } from '@nuxt/content'
import { SITE } from '~/config'

/**
 * 文章取数层 —— 页面不直接碰 `queryCollection`。
 *
 * 每个导出的取数函数都拆成两半:
 * - `xxx()` 负责取数(碰数据库,只能在 Nuxt 运行时里跑)
 * - `pureXxx()` 负责计算(纯函数,可单测)
 *
 * 拆开是因为排序、分组、找相邻这类逻辑一旦和数据库调用缠在一起就没法测,
 * 而它们恰恰是最容易写错、错了又最难一眼看出的部分(顺序反了、边界少一项)。
 */

/** 排序与相邻计算只需要这几个字段,不必拉全文 */
export interface PostSummary {
  path: string
  title: string
}

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
 * 按标签分组并排序 —— 纯函数部分。
 *
 * 排序规则:文章数倒序,同数按标签名排序;组内顺序沿用传入顺序(即日期倒序)。
 * collation 用站点语言 —— 中文标签按拼音排,不指定的话会退化成码位序。
 */
export function groupPostsByTag<T extends { tags?: string[] }>(
  posts: T[],
): { tag: string, posts: T[] }[] {
  const groups = new Map<string, T[]>()

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
    .sort((a, b) => b.posts.length - a.posts.length || a.tag.localeCompare(b.tag, SITE.locale))
}

/**
 * 按标签分组文章。
 *
 * 只调用一次 getPublishedPosts() 并在内存里分组 —— 避免每个标签各自重新
 * 查询 + 排序一遍(标签数越多,重复扫描的浪费越大)。
 */
export async function getPostsGroupedByTag(): Promise<{ tag: string, posts: BlogCollectionItem[] }[]> {
  return groupPostsByTag(await getPublishedPosts())
}

/**
 * 在按日期倒序的列表里找出某篇文章的前后篇 —— 纯函数部分。
 *
 * 命名以"发布时间"为准而非"列表位置":列表是倒序的,位置靠后反而更早,
 * 直接说 prev/next 每次读都要在脑子里翻译一遍。
 *
 * 找不到该路径时两侧都返回 undefined,由调用方决定是 404 还是不显示导航。
 */
export function findNeighbors<T extends PostSummary>(
  orderedPosts: T[],
  path: string,
): { olderPost?: T, newerPost?: T } {
  const index = orderedPosts.findIndex(post => post.path === path)
  if (index === -1)
    return {}

  return {
    olderPost: index < orderedPosts.length - 1 ? orderedPosts[index + 1] : undefined,
    newerPost: index > 0 ? orderedPosts[index - 1] : undefined,
  }
}

/**
 * 取单篇文章及其前后篇。文章不存在或不该公开时返回 null,由页面抛 404。
 *
 * 相邻文章只 select 路径/标题/日期,不带正文 —— 否则每个文章页都会把全站
 * 所有文章的完整正文拉一遍,只为了算前后两篇。
 */
export async function getPostWithNeighbors(path: string): Promise<{
  post: BlogCollectionItem
  olderPost?: PostSummary
  newerPost?: PostSummary
} | null> {
  const post = await queryCollection('blog').path(path).first()

  // 草稿在生产构建下不可见 → 不被预渲染 → 也就访问不到
  if (!post || !isPublishedPost(post))
    return null

  const index = (await queryCollection('blog')
    .select('path', 'title', 'date', 'draft')
    .order('date', 'DESC')
    .all()).filter(isPublishedPost)

  return { post, ...findNeighbors(index, path) }
}

import { queryCollectionSearchSections } from '@nuxt/content/server'

/**
 * 搜索索引 —— 构建期生成的静态 JSON,客户端首次打开搜索时拉一次。
 *
 * 切段不自己写:`queryCollectionSearchSections` 按标题把正文拆成小节,
 * 顺带给出锚点 id 与上级标题面包屑。自己实现一遍的话,锚点推导规则要和
 * Nuxt Content 的 rehype 插件保持一致,而那条规则一旦对不上,链接会跳到
 * 页面顶部而不是小节 —— 不报错,只是跳错地方。
 *
 * 标题范围收成 h2/h3,与 `app/components/PostOutline.vue` 的过滤条件一致:
 * 大纲里没有的层级,搜索结果也不该单独成条。
 *
 * 草稿过滤复用 `shared/utils/posts.ts` 的 isPublishedPost() —— 索引是继站点
 * 页面、RSS、sitemap 之后的**第四条草稿泄露面**,在这里另写一遍条件就会出现
 * "站点上看不到、搜索里却搜得到"。
 */

export default defineEventHandler(async (event) => {
  const sections = await queryCollectionSearchSections(event, 'blog', {
    // 匹配与排序需要 tags / date;draft 仅用于过滤,不进产物
    extraFields: ['tags', 'draft', 'date'],
    minHeading: 'h2',
    maxHeading: 'h3',
  })

  // 只留下匹配层真正会读的字段。文章路径与文章标题刻意不单独存 ——
  // 它们能从 id 与 titles 推导出来(见 app/utils/search.ts 的 postPathOf/
  // postTitleOf),存进来就成了同一事实的第二份副本。
  return sections.filter(isPublishedPost).map(section => ({
    id: section.id,
    title: section.title,
    titles: section.titles,
    content: section.content,
    tags: section.tags ?? [],
    date: section.date,
    level: section.level,
  }))
})

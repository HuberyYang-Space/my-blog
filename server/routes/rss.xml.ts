import { queryCollection } from '@nuxt/content/server'
import { SITE } from '../../app/config'

/**
 * RSS 订阅源。
 *
 * 迁移前用的是 @astrojs/rss,Nuxt 无对应官方模块,改为 Nitro 路由手写。
 * 草稿过滤复用 shared/utils/posts.ts 的 isPublishedPost() —— 与站点页面同一个
 * 真源,不在这里另写一遍条件。
 */

/** XML 文本节点转义,避免标题/摘要里的 & < > 破坏文档结构 */
function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const all = await queryCollection(event, 'blog').order('date', 'DESC').all()
  const posts = all.filter(isPublishedPost)

  const items = posts.map((post) => {
    const link = new URL(post.path, SITE.url).href
    const categories = (post.tags ?? [])
      .map(tag => `<category>${escapeXml(tag)}</category>`)
      .join('')

    return [
      '<item>',
      `<title>${escapeXml(post.title)}</title>`,
      `<description>${escapeXml(post.description)}</description>`,
      `<pubDate>${new Date(post.date).toUTCString()}</pubDate>`,
      categories,
      `<link>${escapeXml(link)}</link>`,
      `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
      '</item>',
    ].join('')
  }).join('')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    `<title>${escapeXml(SITE.title)}</title>`,
    `<description>${escapeXml(SITE.description)}</description>`,
    `<link>${escapeXml(SITE.url)}</link>`,
    '<language>zh-CN</language>',
    items,
    '</channel>',
    '</rss>',
  ].join('')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})

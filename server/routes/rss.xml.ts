import { queryCollection } from '@nuxt/content/server'
import { SITE } from '../../app/config'

/**
 * RSS 订阅源。
 *
 * Nuxt 无官方 RSS 模块,这里用 Nitro 路由手写。
 * 草稿过滤复用 shared/utils/posts.ts 的 isPublishedPost() —— 与站点页面同一个
 * 真源,不在这里另写一遍条件。
 */

export default defineEventHandler(async (event) => {
  const all = await queryCollection(event, 'blog').order('date', 'DESC').all()
  const posts = all.filter(isPublishedPost)
  const feedUrl = new URL('/rss.xml', SITE.url).href

  // 取文章自身的最后改动时间而不是构建时刻:后者让每次部署都像"有更新",内容没变也一样
  const lastBuildDate = posts.length > 0
    ? new Date(Math.max(...posts.map(post => new Date(post.updatedDate ?? post.date).getTime())))
    : undefined

  const items = posts.map((post) => {
    const link = new URL(post.path, SITE.url).href
    const categories = (post.tags ?? [])
      .map(tag => `<category>${escapeXml(tag)}</category>`)
      .join('')

    return [
      '<item>',
      `<title>${escapeXml(post.title)}</title>`,
      `<description>${escapeXml(post.description)}</description>`,
      // 整段 HTML 走 escapeXml 而不是 CDATA:CDATA 还得另外处理正文里出现的 `]]>`
      `<content:encoded>${escapeXml(renderFeedHtml(post.body, link))}</content:encoded>`,
      `<pubDate>${new Date(post.date).toUTCString()}</pubDate>`,
      categories,
      `<link>${escapeXml(link)}</link>`,
      `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
      '</item>',
    ].join('')
  }).join('')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '<channel>',
    `<title>${escapeXml(SITE.title)}</title>`,
    `<description>${escapeXml(SITE.description)}</description>`,
    `<link>${escapeXml(SITE.url)}</link>`,
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    `<language>${SITE.locale}</language>`,
    lastBuildDate ? `<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>` : '',
    items,
    '</channel>',
    '</rss>',
  ].join('')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})

import { createHash } from 'node:crypto'
import { readFile, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { load } from 'cheerio'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export interface SearchSnapshot {
  version: 1
  origin: string
  pages: Record<string, string>
}

export function assertPageUrl(value: string, origin: string): URL {
  const url = new URL(value)
  const segments = url.pathname.split('/').filter(Boolean).map(part => decodeURIComponent(part))
  if (url.origin !== origin || url.href !== value || url.username || url.password || url.search || url.hash
    || (url.pathname !== '/' && url.pathname.endsWith('/'))
    || ['/robots.txt', '/rss.xml', '/sitemap.xml', '/search-index.json'].includes(url.pathname)
    || segments.some(part => part === '.' || part === '..' || /[/\\]/.test(part))) {
    throw new Error('页面 URL 非规范或不属于本站')
  }
  return url
}

export function parseSitemapEntries(xml: string, origin: string): { url: string, lastmod?: string }[] {
  if (XMLValidator.validate(xml) !== true || /<!DOCTYPE/i.test(xml))
    throw new Error('sitemap XML 无效')
  const data = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml)
  if (!data.urlset || data.sitemapindex)
    throw new Error('必须使用平面 urlset sitemap')
  const entries = [data.urlset.url].flat().filter(Boolean)
  if (entries.length === 0)
    throw new Error('sitemap 缺少页面')
  const seen = new Set<string>()
  return entries.map((entry) => {
    if (typeof entry.loc !== 'string')
      throw new Error('sitemap loc 无效')
    assertPageUrl(entry.loc, origin)
    if (seen.has(entry.loc))
      throw new Error('sitemap URL 重复')
    seen.add(entry.loc)
    return { url: entry.loc, lastmod: typeof entry.lastmod === 'string' ? entry.lastmod : undefined }
  })
}

export function parseSitemapUrls(xml: string, origin: string): string[] {
  return parseSitemapEntries(xml, origin).map(entry => entry.url)
}

export function fingerprintPage(html: string, canonical: string): string {
  const $ = load(html)
  const links = $('head link[rel="canonical"]')
  if (links.length !== 1 || links.attr('href') !== canonical || $('main').length !== 1)
    throw new Error('页面 canonical 不一致或缺少唯一 main')
  $('main script, main style').remove()
  const main = $('main')
  for (const element of main.find('*').addBack().toArray()) {
    if (!('attribs' in element))
      continue
    for (const name of Object.keys(element.attribs)) {
      if (name === 'class' || name === 'style' || /^data-(?:v-|nuxt)/.test(name))
        $(element).removeAttr(name)
    }
    element.attribs = Object.fromEntries(Object.entries(element.attribs).sort(([a], [b]) => a.localeCompare(b)))
  }
  const removeComments = (nodes: ReturnType<typeof main.contents>) => {
    for (const node of nodes.toArray()) {
      if (node.type === 'comment')
        $(node).remove()
      else
        removeComments($(node).contents())
    }
  }
  removeComments(main.contents())
  const metadata = [
    canonical,
    $('head title').text(),
    $('head meta[name="description"]').attr('content') ?? '',
    ...['article:published_time', 'article:modified_time'].map(name => $(`head meta[property="${name}"]`).attr('content') ?? ''),
  ]
  return createHash('sha256').update(JSON.stringify([metadata, $.html(main)])).digest('hex')
}

export function validateSnapshot(value: unknown, origin: string): SearchSnapshot {
  if (!value || typeof value !== 'object')
    throw new Error('快照无效')
  const data = value as SearchSnapshot
  if (data.version !== 1 || data.origin !== origin || !data.pages || typeof data.pages !== 'object' || Array.isArray(data.pages) || Object.keys(data.pages).length === 0)
    throw new Error('快照版本、origin 或页面表无效')
  for (const [url, hash] of Object.entries(data.pages)) {
    assertPageUrl(url, origin)
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
      throw new Error('快照指纹无效')
  }
  return data
}

export function pageFile(publicDir: string, canonical: string, origin: string): string {
  const url = assertPageUrl(canonical, origin)
  return join(publicDir, ...url.pathname.split('/').filter(Boolean).map(part => decodeURIComponent(part)), 'index.html')
}

export async function collectSearchSnapshot(publicDir: string, origin: string): Promise<SearchSnapshot> {
  const urls = parseSitemapUrls(await readFile(join(publicDir, 'sitemap.xml'), 'utf8'), origin)
  const root = await realpath(publicDir)
  const pages = Object.fromEntries(await Promise.all(urls.map(async (url) => {
    const path = await realpath(pageFile(publicDir, url, origin))
    const local = relative(root, path)
    if (local.startsWith('..') || isAbsolute(local))
      throw new Error('页面文件越出公开目录')
    return [url, fingerprintPage(await readFile(path, 'utf8'), url)]
  })))
  return { version: 1, origin, pages }
}

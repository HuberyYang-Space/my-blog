import { describe, expect, it } from 'vitest'
import { fingerprintPage, parseSitemapUrls, validateSnapshot } from '../scripts/lib/search-snapshot'

const origin = 'https://example.com:91'
const url = `${origin}/posts/one`
const sitemap = (urls: string[]) => `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(loc => `<url><loc>${loc}</loc></url>`).join('')}</urlset>`
const page = (body = '<h1>中文标题</h1><p>正文 <a href="/about">关于</a><img src="/a.webp" alt="图片"></p><pre>  const a = 1</pre>') => `<html><head><title>标题</title><meta name="description" content="说明"><link rel="canonical" href="${url}"><meta property="article:modified_time" content="2026-11-03"></head><body><main>${body}</main></body></html>`

describe('真实 sitemap 的 URL 边界', () => {
  it('保留端口和根路由', () => expect(parseSitemapUrls(sitemap([`${origin}/`, url]), origin)).toEqual([`${origin}/`, url]))
  it.each([
    '<urlset><url></urlset>',
    '<sitemapindex><sitemap/></sitemapindex>',
    '<urlset/>',
    sitemap([url, url]),
    sitemap(['https://example.com/posts/one']),
    sitemap([`${url}/`]),
    sitemap([`${url}?page=1`]),
    sitemap([`${url}#a`]),
    sitemap([`${origin}/rss.xml`]),
    sitemap([`${origin}/%2e%2e/secret`]),
    sitemap([`${origin}/tags/a%2Fb`]),
  ])('拒绝损坏、重复、跨 origin 或非规范页面地址 %#', xml => expect(() => parseSitemapUrls(xml, origin)).toThrow())
})

describe('内容指纹', () => {
  it('忽略样式、脚本、注释和框架属性', () => {
    const before = page()
    const after = page().replace('<h1>', '<h1 class="new" style="color:red" data-v-abc="">').replace('</main>', '<script src="/_nuxt/new-id.js"></script><style>p{color:red}</style><!--build--></main>')
    expect(fingerprintPage(after, url)).toBe(fingerprintPage(before, url))
  })
  it.each([
    ['正文', '更新'],
    ['<h1>', '<h2>'],
    ['href="/about"', 'href="/other"'],
    ['src="/a.webp"', 'src="/b.webp"'],
    ['alt="图片"', 'alt="新图"'],
    ['  const a', ' const a'],
    ['<title>标题', '<title>新标题'],
    ['content="说明"', 'content="新说明"'],
    ['2026-11-03', '2026-11-04'],
  ])('保留有意义的变化 %s', (from, to) => expect(fingerprintPage(page().replace(from, to), url)).not.toBe(fingerprintPage(page(), url)))
  it('属性顺序不触发更新', () => expect(fingerprintPage(page('<img alt="图" src="/a">'), url)).toBe(fingerprintPage(page('<img src="/a" alt="图">'), url)))
  it.each([page().replace(url, `${origin}/other`), page().replace('<main>', '<div>').replace('</main>', '</div>'), page().replace('</head>', `<link rel="canonical" href="${url}"></head>`)])('拒绝 canonical 异常或缺正文 %#', html => expect(() => fingerprintPage(html, url)).toThrow())
})

it('快照版本、origin 与指纹必须合法', () => {
  const good = { version: 1, origin, pages: { [url]: 'a'.repeat(64) } }
  expect(validateSnapshot(good, origin)).toEqual(good)
  for (const bad of [{ ...good, version: 2 }, { ...good, origin: 'https://other.com' }, { ...good, pages: { [url]: 'bad' } }, { ...good, pages: [] }])
    expect(() => validateSnapshot(bad, origin)).toThrow()
})

it('允许项目已有标签模型中的 Vue.js 和 Node.js 路径', () => {
  const urls = [`${origin}/tags/Vue.js`, `${origin}/tags/Node.js`]
  expect(parseSitemapUrls(sitemap(urls), origin)).toEqual(urls)
})

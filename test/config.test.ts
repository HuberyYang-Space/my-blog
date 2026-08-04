import { describe, expect, it } from 'vitest'
import { SITE } from '../app/config'

/**
 * SITE.url 的结构性约束。
 *
 * canonical / sitemap / RSS / OG 图都用 `new URL(path, SITE.url)` 拼绝对地址,
 * 而 URL 拼接对格式的容错是"看起来能用但结果不对":末尾多一个斜杠、协议写成
 * http、或者漏掉协议,都不会抛错,只会让全站外链整体指向错误的地方。
 * 这类错误没有任何运行时反馈,只能靠断言守住。
 */
describe('站点 URL 的结构性约束', () => {
  it('是绝对 URL', () => {
    expect(() => new URL(SITE.url)).not.toThrow()
  })

  it('用 https —— OG 抓取方与订阅器对 http 的处理各不相同', () => {
    expect(new URL(SITE.url).protocol).toBe('https:')
  })

  it('末尾不带斜杠', () => {
    // 带斜杠时 new URL('/posts/x', 'https://a.com/') 仍然正确,
    // 但字符串拼接场景(如 RSS 里的 <link>)会拼出 https://a.com//posts/x
    expect(SITE.url.endsWith('/')).toBe(false)
  })

  it('不含路径段 —— 站点部署在子路径时要改的是 app.baseURL,不是这里', () => {
    expect(new URL(SITE.url).pathname).toBe('/')
  })
})

describe('站点语言标签', () => {
  it('是合法的 BCP 47 标签,能被 Intl 接受', () => {
    expect(() => new Intl.DateTimeFormat(SITE.locale)).not.toThrow()
  })
})

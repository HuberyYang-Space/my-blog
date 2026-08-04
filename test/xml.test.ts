import { describe, expect, it } from 'vitest'
import { escapeXml } from '../server/utils/xml'

describe('escapeXml', () => {
  it('转义会破坏文档结构的五个字符', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;')
  })

  it('& 先于其他字符转义,不产生双重转义', () => {
    // 顺序写反的话 `<` 会先变成 `&lt;`,那个 `&` 再被转成 `&amp;lt;`
    expect(escapeXml('<')).toBe('&lt;')
    expect(escapeXml('&lt;')).toBe('&amp;lt;')
  })

  it('一次调用转义全部出现,不只是第一个', () => {
    expect(escapeXml('a & b & c')).toBe('a &amp; b &amp; c')
  })

  it('不改动普通文本与中文', () => {
    expect(escapeXml('消除深色模式的首屏闪烁')).toBe('消除深色模式的首屏闪烁')
  })

  it('真实场景:标题里的尖括号不会截断订阅源', () => {
    const title = '为什么 <script> 必须放在 head 最前面'
    expect(escapeXml(title)).not.toContain('<script>')
    expect(escapeXml(title)).toBe('为什么 &lt;script&gt; 必须放在 head 最前面')
  })
})

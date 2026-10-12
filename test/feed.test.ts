import type { MinimarkNode } from '../server/utils/feed'
import { describe, expect, it } from 'vitest'
import { CALLOUT_LABELS } from '../app/config'
import { renderFeedHtml } from '../server/utils/feed'

const POST_URL = 'https://example.com/posts/demo'

function render(...value: MinimarkNode[]): string {
  return renderFeedHtml({ type: 'minimark', value }, POST_URL)
}

describe('renderFeedHtml', () => {
  it('普通段落与行内元素原样输出', () => {
    expect(render(['p', {}, '你好 ', ['strong', {}, '世界']])).toBe('<p>你好 <strong>世界</strong></p>')
  })

  it('文本里的尖括号被转义,不会变成真标签', () => {
    expect(render(['p', {}, '为什么 <script> 要放在 head'])).toBe('<p>为什么 &#x3C;script> 要放在 head</p>')
  })

  it('丢弃 shiki 附在正文末尾的主题样式', () => {
    expect(render(['p', {}, 'a'], ['style', {}, '.shiki span{color:red}'])).toBe('<p>a</p>')
  })

  it('代码块重建为纯文本 pre > code,不带逐行 span 与内联样式', () => {
    const html = render(['pre', { className: 'language-ts shiki', code: 'const a = 1 < 2\n', language: 'ts', style: 'color:red' }, ['code', { __ignoreMap: '' }, ['span', { class: 'line', line: 1 }, ['span', {}, 'const a = 1 < 2']]]])
    expect(html).toBe('<pre><code class="language-ts">const a = 1 &#x3C; 2\n</code></pre>')
  })

  it('没有语言的代码块不挂 class', () => {
    expect(render(['pre', { code: 'x' }])).toBe('<pre><code>x</code></pre>')
  })

  it('提示框转为 blockquote,标题取自定义 title', () => {
    expect(render(['warning', { title: '小心' }, ['p', {}, '正文']]))
      .toBe('<blockquote><p><strong>小心</strong></p><p>正文</p></blockquote>')
  })

  it.each(Object.entries(CALLOUT_LABELS))('提示框 %s 没写 title 时用默认名「%s」', (type, label) => {
    expect(render([type, {}, ['p', {}, '正文']])).toContain(`<strong>${label}</strong>`)
  })

  it('插图转为 figure,src 绝对化,图注进 figcaption', () => {
    expect(render(['illustration', { src: '/images/a.webp', alt: '示意', width: '1344', height: '700' }, ['p', {}, '图注']]))
      .toBe('<figure><img src="https://example.com/images/a.webp" alt="示意" width="1344" height="700"><figcaption><p>图注</p></figcaption></figure>')
  })

  it('交互演示整块替换为指向原文的提示,内部组件不外泄', () => {
    const html = render(['demo', { title: '划过试试' }, ['demo-liquid-text', { text: 'Hubery' }]])
    expect(html).not.toContain('demo-liquid-text')
    expect(html).toContain(`href="${POST_URL}"`)
  })

  it('站内绝对路径、页内锚点与图片地址都绝对化', () => {
    const html = render(['p', {}, ['a', { href: '/posts/other' }, 'a'], ['a', { href: '#user-content-fn-1' }, 'b'], ['img', { src: '/images/x.webp', alt: '' }]])
    expect(html).toContain('href="https://example.com/posts/other"')
    expect(html).toContain(`href="${POST_URL}#user-content-fn-1"`)
    expect(html).toContain('src="https://example.com/images/x.webp"')
  })

  it('外链保持原样', () => {
    expect(render(['p', {}, ['a', { href: 'https://github.com/x', rel: ['nofollow'] }, 'gh']]))
      .toBe('<p><a href="https://github.com/x" rel="nofollow">gh</a></p>')
  })

  it('丢弃以 __ 开头的内部属性', () => {
    expect(render(['p', {}, ['code', { __ignoreMap: '' }, 'x']])).toBe('<p><code>x</code></p>')
  })

  it('className 字符串与数组都能正确输出', () => {
    expect(render(['span', { className: 'a b' }, 'x'], ['span', { className: ['c', 'd'] }, 'y']))
      .toBe('<span class="a b">x</span><span class="c d">y</span>')
  })
})

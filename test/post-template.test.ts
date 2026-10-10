import { describe, expect, it } from 'vitest'
import { postTemplate } from '../scripts/lib/post-template'

/** 取出 frontmatter 里 title 那一行的值部分 */
function titleValue(template: string): string {
  return template.match(/^title: (.*)$/m)?.[1] ?? ''
}

describe('postTemplate', () => {
  // YAML 1.2 是 JSON 的超集:值部分能被 JSON.parse 原样读回标题,就说明 YAML 解析器
  // 也会读出同一个字符串。裸写的话 `: ` 会被当成嵌套映射、` #` 后面会被当成注释截掉,
  // 前者构建报错,后者标题静默变短。
  it.each([
    'Vue: 入门',
    '标题 #1 版本',
    '[草稿] 记录',
    '"引号"开头',
    '普通标题',
  ])('标题原样保留:%s', (title) => {
    expect(JSON.parse(titleValue(postTemplate(title, '2026-10-10')))).toBe(title)
  })

  it('写入日期并默认为草稿', () => {
    const template = postTemplate('x', '2026-10-10')
    expect(template).toMatch(/^date: 2026-10-10$/m)
    expect(template).toMatch(/^draft: true$/m)
  })
})

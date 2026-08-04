import type { SearchSection } from '../app/utils/search'
import { describe, expect, it } from 'vitest'
import {
  excerptSegments,
  groupHitsByPost,
  matchSection,
  postPathOf,
  postTitleOf,
  searchSections,
  splitQuery,
} from '../app/utils/search'

function section(partial: Partial<SearchSection> & { id: string }): SearchSection {
  return {
    title: '',
    titles: [],
    content: '',
    tags: [],
    date: '2026-01-01',
    level: 2,
    ...partial,
  }
}

describe('splitQuery', () => {
  it('按空白拆词并转小写', () => {
    expect(splitQuery('  Nuxt   代码块 ')).toEqual(['nuxt', '代码块'])
  })

  it('空查询拆不出词', () => {
    expect(splitQuery('   ')).toEqual([])
  })
})

describe('postPathOf / postTitleOf', () => {
  it('文章路径取锚点之前的部分', () => {
    expect(postPathOf(section({ id: '/posts/a#标题' }))).toBe('/posts/a')
    expect(postPathOf(section({ id: '/posts/a' }))).toBe('/posts/a')
  })

  it('level 1 的标题就是文章标题,小节则取面包屑首位', () => {
    expect(postTitleOf(section({ id: '/posts/a', title: '文章', level: 1 }))).toBe('文章')
    expect(postTitleOf(section({ id: '/posts/a#x', title: '小节', titles: ['文章'] }))).toBe('文章')
  })
})

describe('matchSection', () => {
  const target = section({
    id: '/posts/a#x',
    title: 'Shiki 高亮',
    titles: ['代码块标注'],
    content: '正文里提到了 transformers。',
    tags: ['Nuxt'],
  })

  it('按 title > tags > titles > content 取最高档', () => {
    expect(matchSection(target, ['shiki'])).toBe('title')
    expect(matchSection(target, ['nuxt'])).toBe('tags')
    expect(matchSection(target, ['代码块'])).toBe('titles')
    expect(matchSection(target, ['transformers'])).toBe('content')
  })

  it('多个词取其中最高的那一档', () => {
    expect(matchSection(target, ['transformers', 'shiki'])).toBe('title')
  })

  it('全词都要命中(AND):任一词落空则整条不命中', () => {
    expect(matchSection(target, ['shiki', '不存在的词'])).toBeNull()
  })

  it('跨字段也算命中:词分别落在标题与正文里', () => {
    expect(matchSection(target, ['shiki', 'transformers'])).toBe('title')
  })

  it('大小写不敏感', () => {
    expect(matchSection(target, ['SHIKI'])).toBe('title')
  })

  it('空词表不命中', () => {
    expect(matchSection(target, [])).toBeNull()
  })
})

describe('excerptSegments', () => {
  it('把命中处切成高亮段,拼回去等于原文窗口', () => {
    const segments = excerptSegments('abc标注def', ['标注'], 40)
    expect(segments.map(s => s.text).join('')).toBe('abc标注def')
    expect(segments.filter(s => s.hit).map(s => s.text)).toEqual(['标注'])
  })

  it('命中在开头时前面不加省略号', () => {
    const segments = excerptSegments('标注在最前面', ['标注'], 40)
    expect(segments[0]?.text.startsWith('…')).toBe(false)
  })

  it('长文本只截命中处前后各 around 字,两端补省略号', () => {
    const text = `${'甲'.repeat(100)}标注${'乙'.repeat(100)}`
    const segments = excerptSegments(text, ['标注'], 10)
    const joined = segments.map(s => s.text).join('')

    expect(joined.startsWith('…')).toBe(true)
    expect(joined.endsWith('…')).toBe(true)
    // 命中 2 字 + 两侧各 10 字 + 两个省略号
    expect(joined.length).toBe(2 + 20 + 2)
    expect(segments.filter(s => s.hit).map(s => s.text)).toEqual(['标注'])
  })

  it('同一窗口内的多次命中都高亮', () => {
    const segments = excerptSegments('标注与标注之间', ['标注'], 40)
    expect(segments.filter(s => s.hit)).toHaveLength(2)
  })

  it('重叠的命中区间合并成一段,不重复输出文字', () => {
    const segments = excerptSegments('abcd', ['abc', 'bcd'], 40)
    expect(segments.map(s => s.text).join('')).toBe('abcd')
    expect(segments.filter(s => s.hit).map(s => s.text)).toEqual(['abcd'])
  })

  it('该字段没命中时退化成开头一截,不返回空数组', () => {
    const segments = excerptSegments('一段没有命中的正文', ['不存在'], 40)
    expect(segments).toHaveLength(1)
    expect(segments[0]?.hit).toBe(false)
    expect(segments[0]?.text).toBe('一段没有命中的正文')
  })

  it('空正文不炸', () => {
    expect(excerptSegments('', ['标注'], 40)).toEqual([{ text: '', hit: false }])
  })
})

describe('searchSections', () => {
  const sections = [
    section({ id: '/posts/old#a', title: '正文提到 Shiki', content: '', date: '2020-01-01' }),
    section({ id: '/posts/new#a', content: '正文提到 Shiki', date: '2026-01-01' }),
    section({ id: '/posts/new#b', title: 'Shiki 配色', date: '2026-01-01' }),
  ]

  it('标题命中排在正文命中之前,跨越日期', () => {
    // /posts/old#a 更旧,但它是标题命中,仍应排在更新的正文命中之前
    expect(searchSections(sections, 'shiki').map(h => h.section.id))
      .toEqual(['/posts/new#b', '/posts/old#a', '/posts/new#a'])
  })

  it('同档按文章日期倒序', () => {
    const hits = searchSections(sections, 'shiki').filter(h => h.field === 'title')
    expect(hits.map(h => h.section.date)).toEqual(['2026-01-01', '2020-01-01'])
  })

  it('空查询返回空结果,不返回全部', () => {
    expect(searchSections(sections, '  ')).toEqual([])
  })

  it('标题命中时标题本身也切出高亮段', () => {
    const [hit] = searchSections([section({ id: '/posts/a#x', title: 'Shiki 配色' })], 'shiki')
    expect(hit?.titleSegments.filter(s => s.hit).map(s => s.text)).toEqual(['Shiki'])
  })

  it('limit 生效', () => {
    expect(searchSections(sections, 'shiki', 1)).toHaveLength(1)
  })

  it('多打一个词是收窄范围而不是扩大', () => {
    expect(searchSections(sections, 'shiki 配色').map(h => h.section.id))
      .toEqual(['/posts/new#b'])
  })
})

describe('groupHitsByPost', () => {
  it('同一篇的多个小节聚成一组,组间顺序沿用相关度', () => {
    const hits = searchSections([
      section({ id: '/posts/a#1', title: 'Shiki 一' }),
      section({ id: '/posts/b#1', title: 'Shiki 二' }),
      section({ id: '/posts/a#2', title: 'Shiki 三' }),
    ], 'shiki')

    const groups = groupHitsByPost(hits)
    expect(groups.map(g => g.path)).toEqual(['/posts/a', '/posts/b'])
    expect(groups[0]?.hits).toHaveLength(2)
  })
})

/**
 * 选型结论的回归测试。
 *
 * 这几个词正是分词派会漏掉的:`Intl.Segmenter` 把「高亮标注」切成
 * 「高亮 | 标 | 注」、「代码块」切成「代码 | 块」,于是搜「标注」「代码块」
 * 「块里」在 Pagefind / MiniSearch / FTS5 上全部返回空。
 *
 * 把它们钉在这里,是为了将来有人想"换个正经搜索库"时,先看见这三条会红。
 */
describe('中文不漏搜(选型结论回归)', () => {
  const real = section({
    id: '/posts/code-blocks#x',
    title: '代码块标注',
    content: '本文介绍如何在代码块里使用 Shiki transformers 做高亮标注。',
  })

  it.each(['标注', '代码块', '块里', '高亮', '块'])('搜「%s」必须命中', (term) => {
    expect(matchSection(real, [term])).not.toBeNull()
  })
})

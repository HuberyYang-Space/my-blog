/**
 * 搜索匹配层 —— 纯函数,不碰网络也不碰 DOM。
 *
 * 取数(拉 /search-index.json)在 SearchDialog 里,计算全在这里,理由同
 * `app/utils/posts.ts`:排序与边界是最容易写错、错了又最难一眼看出的部分。
 *
 * ## 为什么是子串匹配,而不是分词 + 倒排索引
 *
 * 现成的搜索库(SQLite FTS5、Pagefind、MiniSearch、Fuse)对中文清一色走分词:
 * 先把正文切成词建索引,查询词必须与切出来的词对齐。而中文分词切不准就会
 * **静默漏搜** —— 实测 `Intl.Segmenter` 把「高亮标注」切成「高亮 | 标 | 注」、
 * 「代码块」切成「代码 | 块」,于是搜「标注」「代码块」一个都搜不到,不报错、
 * 不告警,只是返回空数组。@nuxt/content 内置的 FTS5 更糟:它建表时不带
 * tokenizer,整串中文会变成一个 token,只有恰好位于标点后的词才搜得到。
 *
 * 中文没有词形变化(不像英文有复数、时态),子串匹配因此近乎完美 —— 代价只是
 * 线性扫描。而本站规模下这个代价可以忽略:50 篇 × 4KB 的语料全量扫一遍是
 * 0.004ms 量级,任何索引结构都是过度设计。
 */

/** 索引里的一条 —— 与 `server/routes/search-index.json.ts` 的产出一一对应 */
export interface SearchSection {
  /** `/posts/<slug>` 或 `/posts/<slug>#<锚点>` */
  id: string
  /** 小节标题;level 为 1 时是文章标题 */
  title: string
  /** 面包屑,`[文章标题, ...上级标题]`;level 为 1 时为空 */
  titles: string[]
  content: string
  tags: string[]
  date: string
  level: number
}

/** 摘要的一段。`hit` 为 true 的段在界面上高亮 */
export interface ExcerptSegment {
  text: string
  hit: boolean
}

/** 命中档位,数组顺序即优先级(越靠前越优先) */
export const HIT_FIELDS = ['title', 'tags', 'titles', 'content'] as const
export type HitField = typeof HIT_FIELDS[number]

export interface SearchHit {
  section: SearchSection
  /** 该条命中的最高档字段,决定排序 */
  field: HitField
  /** 正文摘要的分段 */
  segments: ExcerptSegment[]
  /**
   * 小节标题的分段。
   *
   * 标题也要能高亮:命中发生在标题或标签上时,正文摘要里一个高亮都没有 ——
   * 结果看起来像是凭空冒出来的,读者无从判断它为什么被搜到。
   */
  titleSegments: ExcerptSegment[]
}

export interface SearchGroup {
  /** 文章路径,不带锚点 */
  path: string
  postTitle: string
  hits: SearchHit[]
}

/** 文章路径 —— 锚点之前的部分 */
export function postPathOf(section: SearchSection): string {
  return section.id.split('#')[0] ?? section.id
}

/**
 * 文章标题。
 *
 * level 1 那条本身就是文章,标题直接可用;小节那几条的文章标题在面包屑首位。
 * 单独抽出来是因为这条推导规则在分组、排序、渲染三处都要用,写散了就会出现
 * 某一处忘了处理 level 1 的分支。
 */
export function postTitleOf(section: SearchSection): string {
  return section.level === 1 ? section.title : (section.titles[0] ?? section.title)
}

/**
 * 拆查询词。
 *
 * 中文直接敲一串就是单词子串匹配;敲了空格则每个词都要命中(AND),
 * 让「多打一个词」的效果是收窄范围而不是扩大 —— 与人的直觉一致。
 */
export function splitQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * 词表归一化 —— 小写 + 去空。
 *
 * `matchSection` 与 `excerptSegments` 各自调一次,而不是指望调用方先跑
 * `splitQuery`:两个函数都是公开导出的,谁都可能直接拿它们跑一个手写词表,
 * 而"忘了小写"的后果是**静默漏搜**(搜 Shiki 搜不到 shiki),不会报错。
 * 归一化本身是幂等的,重复跑一次不会有任何副作用。
 */
function normalizeTerms(terms: string[]): string[] {
  return terms.map(term => term.toLowerCase()).filter(Boolean)
}

/** 某一档字段的可搜文本 */
function fieldText(section: SearchSection, field: HitField): string {
  switch (field) {
    case 'title':
      return section.title
    case 'tags':
      return section.tags.join(' ')
    case 'titles':
      return section.titles.join(' ')
    case 'content':
      return section.content
  }
}

/**
 * 判定一条索引是否命中,并给出它的排序档位。
 *
 * AND 是跨字段的:搜「nuxt 代码块」时,只要两个词都出现在这一条里就算命中,
 * 不要求出现在同一个字段。档位取所有命中里最高的那一档 —— 有一个词命中标题,
 * 这条就该排在纯正文命中的前面。
 *
 * 任一词一个字段都没命中 → 整条不命中,返回 null。
 */
export function matchSection(section: SearchSection, terms: string[]): HitField | null {
  const needles = normalizeTerms(terms)
  if (needles.length === 0)
    return null

  const texts = HIT_FIELDS.map(field => fieldText(section, field).toLowerCase())
  // 显式标 number:HIT_FIELDS 是 as const 元组,不标的话 length 会被收窄成字面量 4,
  // 后面赋更小的档位序号就成了类型错误
  let best: number = HIT_FIELDS.length

  for (const term of needles) {
    const rank = texts.findIndex(text => text.includes(term))
    if (rank === -1)
      return null
    if (rank < best)
      best = rank
  }

  return HIT_FIELDS[best] ?? null
}

/** 把词在文本里的所有出现位置收成区间,重叠的合并 */
function hitRanges(lowerText: string, terms: string[]): [number, number][] {
  const ranges: [number, number][] = []

  for (const term of terms) {
    let from = 0
    while (from <= lowerText.length) {
      const index = lowerText.indexOf(term, from)
      if (index === -1)
        break
      ranges.push([index, index + term.length])
      // 从本次命中的末尾继续找,避免同一个词在自身内部反复匹配
      from = index + term.length
    }
  }

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1])
      last[1] = Math.max(last[1], range[1])
    else
      merged.push([range[0], range[1]])
  }

  return merged
}

/**
 * 把一段文本裁成"命中处前后各 around 字"的摘要,并切成高亮/非高亮交替的段。
 *
 * 刻意返回分段数组而不是拼好 `<mark>` 的 HTML 字符串:那样调用方必须用
 * v-html 渲染,就得自己记得转义正文里的 `<`,漏一次就是一个注入面。
 * 分段交给模板渲染,既没有转义问题,这段裁剪逻辑本身也能直接单测。
 */
export function excerptSegments(
  text: string,
  terms: string[],
  around = 40,
): ExcerptSegment[] {
  const lower = text.toLowerCase()
  const ranges = hitRanges(lower, normalizeTerms(terms))

  // 这一档字段没命中(比如词全在标题里)——退化成开头一截,让结果仍有上下文
  if (ranges.length === 0) {
    const head = text.slice(0, around * 2)
    return [{ text: head + (text.length > head.length ? '…' : ''), hit: false }]
  }

  const first = ranges[0]!
  const start = Math.max(0, first[0] - around)
  const end = Math.min(text.length, first[1] + around)

  const segments: ExcerptSegment[] = []
  let cursor = start

  for (const [rangeStart, rangeEnd] of ranges) {
    // 只渲染落在窗口内的命中
    if (rangeEnd <= start || rangeStart >= end)
      continue
    if (rangeStart > cursor)
      segments.push({ text: text.slice(cursor, rangeStart), hit: false })
    segments.push({ text: text.slice(Math.max(rangeStart, start), Math.min(rangeEnd, end)), hit: true })
    cursor = Math.min(rangeEnd, end)
  }

  if (cursor < end)
    segments.push({ text: text.slice(cursor, end), hit: false })

  // 省略号加在首尾段上,而不是单独成段 —— 单独成段会在模板里多出一个空的高亮位
  if (start > 0 && segments[0])
    segments[0] = { ...segments[0], text: `…${segments[0].text}` }
  if (end < text.length) {
    const last = segments[segments.length - 1]
    if (last)
      segments[segments.length - 1] = { ...last, text: `${last.text}…` }
  }

  return segments
}

/**
 * 主入口:过滤 → 分档加权排序。
 *
 * 排序三级:命中档位升序 → 文章日期倒序 → id 升序。
 * 第三级不是可有可无的:前两级相等时(同一篇文章的多个小节),没有第三级的话
 * 顺序取决于 Array.prototype.sort 的实现细节,同样的输入可能给出不同的结果,
 * 单测也就无从断言。
 */
export function searchSections(
  sections: SearchSection[],
  query: string,
  limit = 30,
): SearchHit[] {
  const terms = splitQuery(query)
  if (terms.length === 0)
    return []

  const hits: SearchHit[] = []

  for (const section of sections) {
    const field = matchSection(section, terms)
    if (!field)
      continue
    hits.push({
      section,
      field,
      segments: excerptSegments(section.content, terms),
      titleSegments: excerptSegments(section.title, terms),
    })
  }

  hits.sort((a, b) => {
    const rank = HIT_FIELDS.indexOf(a.field) - HIT_FIELDS.indexOf(b.field)
    if (rank !== 0)
      return rank

    const date = (b.section.date ?? '').localeCompare(a.section.date ?? '')
    if (date !== 0)
      return date

    return a.section.id.localeCompare(b.section.id)
  })

  return hits.slice(0, limit)
}

/**
 * 按文章把命中聚拢,组间顺序沿用传入顺序(即已排好的相关度)。
 *
 * 不聚拢的话,一篇长文里命中五个小节就会把整个结果列表占满,
 * 其他文章被挤出可视区 —— 看起来像"只搜到一篇"。
 */
export function groupHitsByPost(hits: SearchHit[]): SearchGroup[] {
  const groups = new Map<string, SearchGroup>()

  for (const hit of hits) {
    const path = postPathOf(hit.section)
    const group = groups.get(path)
    if (group) {
      group.hits.push(hit)
    }
    else {
      groups.set(path, {
        path,
        postTitle: postTitleOf(hit.section),
        hits: [hit],
      })
    }
  }

  return [...groups.values()]
}

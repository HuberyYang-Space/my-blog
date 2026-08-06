import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { AUTHORABLE_BADGE_KEYS, BADGE_KEYS, BADGES, MAX_BADGES } from '../app/config'
import { resolveBadges } from '../app/utils/badges'

describe('resolveBadges', () => {
  it('没有徽章也没有草稿标记时返回空数组', () => {
    expect(resolveBadges({})).toEqual([])
    expect(resolveBadges({ draft: false, badges: [] })).toEqual([])
  })

  it('把 key 解析成文案与配色', () => {
    expect(resolveBadges({ badges: ['wip'] })).toEqual([
      { key: 'wip', label: '连载中', tone: 'warning' },
    ])
  })

  it('draft: true 自动注入草稿徽章,无需在 frontmatter 里手写', () => {
    expect(resolveBadges({ draft: true }).map(b => b.key)).toEqual(['draft'])
  })

  // 手写 draft 必须抛错,不能"去重后当无事发生"。放行的话,一篇 draft: false 而
  // badges: [draft] 的文章会被判定为已发布、正常上线,页面上却挂着「草稿」二字。
  it('拒绝手写 draft —— 它只能由 draft: true 自动注入', () => {
    expect(() => resolveBadges({ badges: ['draft'] })).toThrow(/不能手写 "draft"/)
    expect(() => resolveBadges({ draft: true, badges: ['draft'] })).toThrow(/不能手写 "draft"/)
  })

  it('拒绝手写 draft 时指路到 wip', () => {
    expect(() => resolveBadges({ badges: ['draft'] })).toThrow(/wip/)
  })

  it('自动注入的草稿徽章排在最前', () => {
    expect(resolveBadges({ draft: true, badges: ['outdated', 'wip'] }).map(b => b.key))
      .toEqual(['draft', 'wip', 'outdated'])
  })

  // 这条是本文件的核心:顺序若跟着书写序走,同一组徽章在不同文章里会长得不一样。
  it('顺序取预设表定义序,与 frontmatter 书写序无关', () => {
    const a = resolveBadges({ badges: ['translated', 'wip'] })
    const b = resolveBadges({ badges: ['wip', 'translated'] })
    expect(a).toEqual(b)
    expect(a.map(x => x.key)).toEqual(['wip', 'translated'])
  })

  // 静默跳过未知 key 会让页面上凭空少一个徽章而构建照常成功 —— 必须抛错。
  it('未知 key 抛错,而不是悄悄跳过', () => {
    expect(() => resolveBadges({ badges: ['wpi'] })).toThrow(/未知徽章 "wpi"/)
  })

  it('未知 key 混在合法 key 里同样抛错', () => {
    expect(() => resolveBadges({ badges: ['wip', 'nope'] })).toThrow(/未知徽章 "nope"/)
  })

  // `key in BADGES` 会走原型链,让这些名字全部通过校验、再被排序时的 filter 顺手
  // 滤掉 —— 页面上凭空少一个徽章而构建照常成功。必须用 Object.hasOwn。
  it.each(['constructor', 'toString', '__proto__', 'valueOf', 'hasOwnProperty'])(
    '原型链上的 %s 也算未知 key,不能静默丢弃',
    (key) => {
      expect(() => resolveBadges({ badges: [key] })).toThrow(/未知徽章/)
    },
  )

  it('报错信息带上文章路径,否则构建失败时不知道是哪篇', () => {
    expect(() => resolveBadges({ path: '/posts/foo', badges: ['wpi'] }))
      .toThrow(/\/posts\/foo/)
  })

  it('报错信息列出全部可手写的值,不用去翻源码', () => {
    AUTHORABLE_BADGE_KEYS.forEach((key) => {
      expect(() => resolveBadges({ badges: ['x'] })).toThrow(new RegExp(key))
    })
  })

  it('报错信息不把 draft 列成可选值 —— 它不接受手写', () => {
    expect(() => resolveBadges({ badges: ['x'] })).not.toThrow(/可选:[^—]*\bdraft\b/)
  })
})

describe('resolveBadges 数量上限', () => {
  const overLimit = Array.from({ length: MAX_BADGES + 1 }, (_, i) => AUTHORABLE_BADGE_KEYS[i]!)

  it(`超过 ${MAX_BADGES} 个抛错 —— schema 的 .max() 运行时不生效,这里是唯一关卡`, () => {
    expect(() => resolveBadges({ badges: overLimit })).toThrow(/超过上限/)
  })

  it('刚好等于上限时放行', () => {
    const atLimit = AUTHORABLE_BADGE_KEYS.slice(0, MAX_BADGES)
    expect(resolveBadges({ badges: atLimit })).toHaveLength(MAX_BADGES)
  })

  // draft 不占 frontmatter 的名额,却一样要挤进标题行 —— 上限必须在注入之后算
  it('自动注入的 draft 计入上限', () => {
    const atLimit = AUTHORABLE_BADGE_KEYS.slice(0, MAX_BADGES)
    expect(() => resolveBadges({ draft: false, badges: atLimit })).not.toThrow()
    expect(() => resolveBadges({ draft: true, badges: atLimit })).toThrow(/超过上限/)
  })

  it('因 draft 超限时,报错说明它是自动注入的', () => {
    const atLimit = AUTHORABLE_BADGE_KEYS.slice(0, MAX_BADGES)
    expect(() => resolveBadges({ draft: true, badges: atLimit })).toThrow(/自动注入/)
  })
})

describe('badges 预设表', () => {
  it('导出的 key 列表与预设表同步', () => {
    expect(BADGE_KEYS).toEqual(Object.keys(BADGES))
    expect(BADGE_KEYS.length).toBeGreaterThan(0)
  })

  it('draft 排在首位 —— 自动注入的排位靠的是它,不是额外的特例分支', () => {
    expect(BADGE_KEYS[0]).toBe('draft')
  })

  // 真去读组件源码,不跟硬编码数组比对。比对数组只能证明"我抄了两遍同样的字",
  // 删掉 PostBadges.vue 里的 .post-badge-info 它照样绿 —— 而那会让「译文」徽章
  // 的 --_tone 落空,color 与 color-mix 双双失效,变成一段没有底色的裸小字。
  it('每个 tone 在 PostBadges.vue 里都有对应的 CSS 类', () => {
    const sfc = readFileSync(
      fileURLToPath(new URL('../app/components/PostBadges.vue', import.meta.url)),
      'utf8',
    )
    for (const tone of new Set(Object.values(BADGES).map(b => b.tone)))
      expect(sfc, `缺少 .post-badge-${tone} 规则`).toMatch(new RegExp(`\\.post-badge-${tone}\\s*\\{`))
  })

  it('组件里没有多余的 tone 类,不留没人用的死规则', () => {
    const sfc = readFileSync(
      fileURLToPath(new URL('../app/components/PostBadges.vue', import.meta.url)),
      'utf8',
    )
    const declared = [...sfc.matchAll(/\.post-badge-([a-z]+)\s*\{/g)].map(m => m[1])
    const used = new Set<string>(Object.values(BADGES).map(b => b.tone))
    expect(declared.filter(tone => !used.has(tone!))).toEqual([])
  })

  it('文案不重复,否则两个徽章在页面上无法区分', () => {
    const labels = Object.values(BADGES).map(b => b.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('数量上限留有余地,但不至于挤散标题行', () => {
    expect(MAX_BADGES).toBeGreaterThanOrEqual(1)
    expect(MAX_BADGES).toBeLessThanOrEqual(BADGE_KEYS.length)
  })
})

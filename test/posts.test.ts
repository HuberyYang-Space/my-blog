import { describe, expect, it } from 'vitest'
import { findNeighbors, groupPostsByTag } from '../app/utils/posts'
import { isVisiblePost } from '../shared/utils/posts'

describe('isVisiblePost', () => {
  it('生产模式下排除草稿', () => {
    expect(isVisiblePost({ draft: true }, false)).toBe(false)
    expect(isVisiblePost({ draft: false }, false)).toBe(true)
  })

  it('开发模式下保留草稿,便于边写边预览', () => {
    expect(isVisiblePost({ draft: true }, true)).toBe(true)
  })

  it('缺省 draft 字段视为已发布', () => {
    expect(isVisiblePost({}, false)).toBe(true)
  })
})

describe('groupPostsByTag', () => {
  const posts = [
    { path: '/a', tags: ['Vue', 'CSS'] },
    { path: '/b', tags: ['Vue'] },
    { path: '/c', tags: ['CSS', 'Vue'] },
    { path: '/d', tags: [] },
  ]

  it('按文章数倒序排列标签', () => {
    expect(groupPostsByTag(posts).map(g => g.tag)).toEqual(['Vue', 'CSS'])
  })

  it('组内顺序沿用传入顺序(即日期倒序)', () => {
    const vue = groupPostsByTag(posts).find(g => g.tag === 'Vue')
    expect(vue?.posts.map(p => p.path)).toEqual(['/a', '/b', '/c'])
  })

  it('无标签的文章不产生分组', () => {
    expect(groupPostsByTag(posts).flatMap(g => g.posts.map(p => p.path))).not.toContain('/d')
  })

  it('文章数相同时按标签名排序', () => {
    // 都是 1 篇,只能靠标签名定序 —— 否则顺序取决于 Map 的插入次序,
    // 会随文章增删无声地跳动
    const tied = [{ path: '/x', tags: ['b'] }, { path: '/y', tags: ['a'] }]
    expect(groupPostsByTag(tied).map(g => g.tag)).toEqual(['a', 'b'])
  })

  it('缺省 tags 字段不会抛错', () => {
    expect(() => groupPostsByTag([{ path: '/z' }])).not.toThrow()
  })
})

describe('findNeighbors', () => {
  // 列表按日期倒序:越靠前越新
  const ordered = [
    { path: '/new', title: '最新' },
    { path: '/mid', title: '中间' },
    { path: '/old', title: '最早' },
  ]

  it('中间的文章两侧都有', () => {
    const { olderPost, newerPost } = findNeighbors(ordered, '/mid')
    expect(newerPost?.path).toBe('/new')
    expect(olderPost?.path).toBe('/old')
  })

  it('最新的一篇没有更新的邻居', () => {
    const { olderPost, newerPost } = findNeighbors(ordered, '/new')
    expect(newerPost).toBeUndefined()
    expect(olderPost?.path).toBe('/mid')
  })

  it('最早的一篇没有更早的邻居', () => {
    const { olderPost, newerPost } = findNeighbors(ordered, '/old')
    expect(newerPost?.path).toBe('/mid')
    expect(olderPost).toBeUndefined()
  })

  it('路径不在列表里时两侧都为空', () => {
    expect(findNeighbors(ordered, '/nope')).toEqual({})
  })

  it('只有一篇文章时两侧都为空', () => {
    expect(findNeighbors([{ path: '/only', title: '唯一' }], '/only')).toEqual({
      olderPost: undefined,
      newerPost: undefined,
    })
  })
})

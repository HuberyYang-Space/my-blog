import { describe, expect, it } from 'vitest'
import { slugify } from '../scripts/lib/slugify'

describe('slugify', () => {
  it('小写并用连字符连接单词', () => {
    expect(slugify('Hello Nuxt World')).toBe('hello-nuxt-world')
  })

  it('连续的非字母数字压成一个连字符', () => {
    expect(slugify('a  --  b')).toBe('a-b')
  })

  it('去掉首尾连字符,不产出 /posts/-foo- 这种路径', () => {
    expect(slugify('  Hello!  ')).toBe('hello')
  })

  it('保留数字,中文被并进分隔符', () => {
    // 中英混排时中文会连同空格一起压成一个连字符,ASCII 部分原样保留
    expect(slugify('Vue 3 与 Nuxt 4')).toBe('vue-3-nuxt-4')
  })

  it('纯中文标题推导不出 slug,返回空串交给调用方要求显式指定', () => {
    // 不擅自音译 —— 机器猜的 slug 往往还不如自己起的,且会静默产生难看的 URL
    expect(slugify('消除深色模式的首屏闪烁')).toBe('')
  })
})

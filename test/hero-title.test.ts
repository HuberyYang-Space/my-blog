import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

/**
 * 这一组守的是 CSS 规则本身,不是渲染结果 —— 产物断言查 HTML,查不到样式的计算结果,
 * 而这里的失败形状恰恰是「HTML 一个字都不变,只是画布被悄悄压扁」。
 * 同 test/badges.test.ts 直接读 SFC 源码的做法。
 */
describe('首页标题画布的尺寸不被 reset 压缩', () => {
  it('reset 确实把 canvas 纳入了 max-width 约束(本测试的前提)', () => {
    // 前提没了这条测试就失去意义,所以先钉住前提本身:
    // 哪天 reset 不再约束 canvas,下面那条就该跟着重新评估,而不是继续绿着
    expect(read('app/assets/css/reset.css')).toMatch(/canvas,[\s\S]{0,40}\{[^}]*max-width:\s*100%/)
  })

  it('画布解除了 max-width —— 它刻意比容器宽,被压回去就会横向压扁', () => {
    const sfc = read('app/components/HeroTitle.vue')
    const rule = sfc.match(/\.hero-title canvas\s*\{([^}]*)\}/)?.[1]

    expect(rule, '找不到 .hero-title canvas 的样式规则').toBeDefined()
    expect(rule).toMatch(/max-width:\s*none/)
  })
})

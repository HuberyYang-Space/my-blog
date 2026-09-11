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

/**
 * 这一组守的是「颜色什么时候读」,同样查不到渲染结果 —— 失败时 HTML 一个字不变、
 * 构建全绿,只是主题切换后标题停在上一个主题的颜色上,刷新才恢复。
 */
describe('主题切换后标题颜色不会停在旧主题', () => {
  const sfc = read('app/components/HeroTitle.vue')

  it('前提:页面文字颜色带过渡 —— 这正是"切换那一刻读不到新颜色"的来源', () => {
    // 前提没了这组测试就失去意义:哪天 body 不再对 color 做过渡,
    // 切换瞬间就能读到终值,下面两条该重新评估而不是继续绿着
    expect(read('app/assets/css/reset.css')).toMatch(/body\s*\{[^}]*transition:[^}]*\bcolor\b/)
  })

  it('颜色逐帧同步,不是只在纹理重建时读一次', () => {
    const frame = sfc.match(/function frame\([\s\S]*?requestAnimationFrame\(frame\)/)?.[0]

    expect(frame, '找不到渲染循环 frame()').toBeDefined()
    expect(frame).toMatch(/syncColors\(\)/)
  })

  it('纹理构建不兼管颜色 —— 绑在一起就等于把颜色钉死在"只有重建时才更新"', () => {
    const build = sfc.match(/function buildTexture\(\)[\s\S]*?\n {2}\}/)?.[0]

    expect(build, '找不到 buildTexture()').toBeDefined()
    expect(build).not.toMatch(/uColor\.value|uAccent\.value/)
  })
})

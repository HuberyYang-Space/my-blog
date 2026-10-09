import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('../app/assets/css/reset.css', import.meta.url)),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')

const body = css.match(/(?:^|\})\s*::selection\s*\{([^}]*)\}/)?.[1]

describe('选中文本背景色', () => {
  it('reset.css 里有作用于全站的 ::selection 规则', () => {
    expect(body).toBeDefined()
  })

  it('底色从 --c-primary 现算,跟着主题切换', () => {
    expect(body).toMatch(/background-color\s*:[^;]*var\(--c-primary\)/)
  })

  it('不设文字色,否则首页标题被框选时透明的真文字会显形', () => {
    expect(body).not.toMatch(/(?:^|[;{\s])color\s*:/)
  })
})

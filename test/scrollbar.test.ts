import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(ROOT, 'app/assets/css/reset.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

const SUPPORTS_BLOCK = /@supports not selector\(::-webkit-scrollbar\)\s*\{[\s\S]*?\}\s*\}/

/**
 * Chrome(121 起)只要元素上设了标准的 scrollbar-width / scrollbar-color,就不再应用
 * ::-webkit-scrollbar 伪元素。浏览器实测(Chrome 155):站点现状下滚动条宽 0(系统浮层),
 * 去掉标准属性后才是设计的 6px —— 直角与悬停光晕在 Chrome 里从未生效,而且不报错。
 * 标准属性因此只能留给不认 webkit 伪元素的浏览器(Firefox)。
 */
describe('自定义滚动条在 Chrome 里不被标准属性顶掉', () => {
  it('webkit 伪元素规则存在(本测试的前提)', () => {
    expect(css).toMatch(/\*::-webkit-scrollbar\s*\{[^}]*width:\s*6px/)
  })

  it('标准滚动条属性只出现在 @supports not selector(::-webkit-scrollbar) 里', () => {
    const block = css.match(SUPPORTS_BLOCK)?.[0]

    expect(block, '找不到 @supports not selector(::-webkit-scrollbar) 块').toBeDefined()
    expect(block).toMatch(/\*\s*\{[^}]*scrollbar-width:\s*thin/)
    expect(css.replace(SUPPORTS_BLOCK, '')).not.toMatch(/scrollbar-(?:width|color)\s*:/)
  })
})

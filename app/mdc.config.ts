import { defineConfig } from '@nuxtjs/mdc/config'
import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers'

/**
 * Shiki 的代码块转换器 —— 让正文能用注释标记表达"这几行是重点"。
 *
 * 转换器只往 DOM 上加类名(`.diff.add` / `.highlighted` / `.focused`),
 * 具体样式在 global.css 里定义;两边的类名必须对上,改一处要改另一处。
 *
 * 两个坑:
 *
 * 1. 本文件必须放在 `app/` 而非仓库根 —— MDC 是按 `srcDir` 扫描 mdc.config.ts 的,
 *    Nuxt 4 的 srcDir 是 app/。放错位置不会报错,只是配置被静默忽略:
 *    `.nuxt/mdc-configs.mjs` 里仍是空数组,代码块照常渲染、标记语法却不生效。
 *    (与 content.config.ts 不同 —— 那个由 Content 模块从仓库根扫描。)
 * 2. `@nuxtjs/mdc` 在 pnpm 严格布局下从根目录解析不到(它是 @nuxt/content 的
 *    传递依赖),故在 package.json 里显式声明,版本锁死与 @nuxt/content 一致 ——
 *    写成 ^ 区间会装出第二份实例,配置就注册不到实际渲染用的那份上。
 */
export default defineConfig({
  shiki: {
    transformers: [
      // ```ts 里写 `// [!code ++]` / `// [!code --]` 标出增删行
      transformerNotationDiff(),
      // `// [!code highlight]` 标出重点行
      transformerNotationHighlight(),
      // `// [!code focus]` 聚焦某几行,其余淡出
      transformerNotationFocus(),
    ],
  },
})

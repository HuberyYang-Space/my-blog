import antfu from '@antfu/eslint-config'

export default antfu({
  // 项目使用 Astro + Vue 岛屿 + UnoCSS,逐项开启对应规则集
  astro: true,
  vue: true,
  unocss: true,
  typescript: true,
})

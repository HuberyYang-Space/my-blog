import antfu from '@antfu/eslint-config'

export default antfu({
  // 项目使用 Nuxt(Vue SFC)+ UnoCSS,逐项开启对应规则集
  vue: true,
  unocss: true,
  typescript: true,
  ignores: ['.nuxt', '.output', 'dist'],
})

import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  unocss: true,
  typescript: true,
  formatters: {
    css: true,
  },
  ignores: ['.nuxt', '.output', 'dist'],
})

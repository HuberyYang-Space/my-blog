import { defineConfig, extractorSplit, presetIcons, presetWind3 } from 'unocss'

export default defineConfig({
  /**
   * 提取类名前剥掉SFC的<style>块
   */
  extractorDefault: {
    name: 'split-ignoring-sfc-style',
    order: 0,
    extract(ctx) {
      if (ctx.id?.includes('.vue'))
        ctx.code = ctx.code.replace(/<style[\s\S]*?<\/style>/g, '')
      return extractorSplit?.extract?.(ctx)
    },
  },

  presets: [
    presetWind3({ dark: 'class' }),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  theme: {
    // 引用global.css的变量,主题切换由变量层完成
    colors: {
      'bg': 'var(--c-bg)',
      'bg-soft': 'var(--c-bg-soft)',
      'text': 'var(--c-text)',
      'text-soft': 'var(--c-text-soft)',
      'text-mute': 'var(--c-text-mute)',
      'border': 'var(--c-border)',
      'primary': 'var(--c-primary)',
    },
  },
})

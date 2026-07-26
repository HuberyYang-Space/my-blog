import { defineConfig, presetIcons, presetWind3 } from 'unocss'

export default defineConfig({
  presets: [
    // dark: 'class' —— 深色由 <html> 上的 .dark class 驱动,与防闪烁内联脚本配合
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
    // 直接引用 global.css 里的语义化变量,主题切换由变量层完成,
    // 工具类无需写成 `text-black dark:text-white` 这种成对形式
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

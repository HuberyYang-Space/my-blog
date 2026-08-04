import { defineConfig, extractorSplit, presetIcons, presetWind3 } from 'unocss'

export default defineConfig({
  /**
   * 提取类名前先剥掉 SFC 的 <style> 块。
   *
   * 默认提取器是按分隔符切词,并不区分"这是模板里的 class"还是"这是 CSS 声明
   * 里的值"。组件样式写进 <style> 之后,`backdrop-filter:`、`animation: … ease-out`、
   * `font-variant-numeric: tabular-nums` 这些都会被当成类名候选,凭空生成
   * .backdrop-filter / .ease-out / .tabular-nums 之类没人使用的规则
   * (实测多出 11 条、约 1.2KB,且会随组件样式增长)。
   *
   * 不能用 content.pipeline.exclude 排除 —— 那个按模块 id 过滤,而 UnoCSS 扫的是
   * 整个 .vue 文件,不是 Vite 拆出来的 ?vue&type=style 子模块。
   */
  extractorDefault: {
    name: 'split-ignoring-sfc-style',
    order: 0,
    extract(ctx) {
      if (ctx.id?.includes('.vue'))
        ctx.code = ctx.code.replace(/<style[\s\S]*?<\/style>/g, '')
      return extractorSplit.extract(ctx)
    },
  },

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

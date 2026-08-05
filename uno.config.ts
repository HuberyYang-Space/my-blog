import { defineConfig, presetIcons, presetWind3 } from 'unocss'

/**
 * 用原生提取器,不要自定义 extractorDefault。
 *
 * 提取器拿到的是 .vue 原文(插件 enforce: 'pre',早于 Vue 编译),所以 <style>
 * 块里的 CSS 属性值也会被当成类名候选,凭空产出 8 条没人使用的死规则:
 * absolute / fixed / ease-in-out / ease-out / flex-shrink / h1 / outline /
 * tabular-nums。已核对过它们与手写 CSS、模板类名零碰撞,合计 444 B(压缩前,
 * 占工具类 CSS 的 1.5%)——刻意不治理。
 *
 * 被否决的做法:在提取前用正则剥掉 <style> 块。正则分不清"真正的样式块"和
 * "注释里提到的 <style>",一旦某个 .vue 的脚本或模板注释里写了这个词,匹配就会
 * 从那里一路吃到文件末尾的 </style>,把整个 <template> 一起吞掉。后果是那一页的
 * 工具类全部消失,而构建成功、控制台无报错;更隐蔽的是 build 模式下 template 会
 * 作为独立子模块再过一次提取,于是产物正常、只有 dev 复现——已经这样踩过一次。
 * 为 444 B 换一个这种形状的静默失败不划算。
 *
 * 另注:content.pipeline.exclude 不管用,它按模块 id 过滤,而提取器扫的是整个
 * .vue 文件,不是 Vite 拆出来的 ?vue&type=style 子模块。
 */
export default defineConfig({
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

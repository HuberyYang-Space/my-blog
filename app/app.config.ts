export default defineAppConfig({
  ui: {
    // Callout 家族(note/tip/warning/caution)默认用 lucide 图标集,本站全站
    // 图标语言统一是 Phosphor(@iconify-json/ph)——覆盖成 ph,不引入第二套
    // 图标集。离线打包这几个图标见 nuxt.config.ts 的 icon.clientBundle.icons,
    // ph 不在 @nuxt/ui 默认信任的图标集合里,不手动列出来会静默退化成运行时
    // 向 api.iconify.design 发请求。
    icons: {
      info: 'i-ph-info',
      tip: 'i-ph-lightbulb',
      warning: 'i-ph-warning',
      caution: 'i-ph-fire',
    },
  },
})

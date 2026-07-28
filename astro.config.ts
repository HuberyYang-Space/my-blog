import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import UnoCSS from '@unocss/astro'
import pagefind from 'astro-pagefind'
import { defineConfig } from 'astro/config'
import { SITE } from './src/config'

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  // 显式声明静态输出:产物需可脱离 Node 运行时,由任意静态文件服务器托管。
  output: 'static',
  // 顺序有意义:pagefind 必须排在最后 —— 它挂在 astro:build:done 钩子上,
  // 需要等其余集成把产物写完才能扫描 dist/ 生成索引。
  integrations: [vue(), UnoCSS(), sitemap(), pagefind()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      // 关闭默认色输出:Shiki 改为在每个 token 上同时吐出 --shiki-light /
      // --shiki-dark 两组 CSS 变量,由 global.css 按 .dark 选择器切换。
      // 若保留默认色,Shiki 会把单一主题的颜色写成内联样式,代码块无法跟随主题。
      defaultColor: false,
    },
  },
})

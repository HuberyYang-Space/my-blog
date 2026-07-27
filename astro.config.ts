import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import UnoCSS from '@unocss/astro'
import pagefind from 'astro-pagefind'
import { defineConfig } from 'astro/config'
import { SITE } from './src/config'

/**
 * 占位域名守卫。
 *
 * site 填错是典型的静默失败:构建照常成功,但 canonical / sitemap / RSS / OG
 * 里的绝对 URL 会整体指向不存在的域名,通常要等被人分享出去才发现。
 * 挂在 astro:build:start 上,只拦生产构建,不打扰 `astro dev`。
 */
function siteUrlGuard() {
  return {
    name: 'site-url-guard',
    hooks: {
      'astro:build:start': () => {
        if (SITE.url.includes('example.com')) {
          throw new Error(
            'src/config.ts 的 SITE.url 仍是占位域名,部署前必须替换为实际域名。',
          )
        }
      },
    },
  }
}

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  // 显式声明静态输出:产物需可脱离 Node 运行时,由任意静态文件服务器托管。
  output: 'static',
  // 顺序有意义:pagefind 必须排在最后 —— 它挂在 astro:build:done 钩子上,
  // 需要等其余集成把产物写完才能扫描 dist/ 生成索引。
  integrations: [siteUrlGuard(), vue(), UnoCSS(), sitemap(), pagefind()],
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

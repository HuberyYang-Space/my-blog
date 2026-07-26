import vue from '@astrojs/vue'
import UnoCSS from '@unocss/astro'
import pagefind from 'astro-pagefind'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  // TODO: 占位域名,部署前必须替换为实际域名。
  // sitemap / RSS / OG 图均依赖此值生成绝对 URL,填错会导致这些链接全部指向错误域名。
  site: 'https://blog.example.com',
  // 显式声明静态输出:产物需可脱离 Node 运行时,由任意静态文件服务器托管。
  output: 'static',
  // 顺序有意义:pagefind 必须排在最后 —— 它挂在 astro:build:done 钩子上,
  // 需要等其余集成把产物写完才能扫描 dist/ 生成索引。
  integrations: [vue(), UnoCSS(), pagefind()],
})

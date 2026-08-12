import { SITE } from './app/config'

// 防闪烁脚本:必须在浏览器首次绘制前同步把 .dark 落到 <html> 上,
// 否则深色用户会先看到一帧浅色。写成字符串由 app.head.script 内联注入,
// tagPriority: 'critical' 保证它排在 head 其余标签之前。
const themeInitScript = `(function () {
  try {
    const stored = localStorage.getItem('theme')
    const isDark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }
  catch {
    // 隐私模式下 localStorage 不可用,回退到浅色
  }
})()`

export default defineNuxtConfig({
  modules: ['@nuxt/content', '@unocss/nuxt', '@nuxtjs/sitemap', 'nuxt-og-image'],

  // 纯静态输出:产物需可脱离 Node 运行时,由任意静态文件服务器托管。
  ssr: true,

  // 路径一律用 Nuxt 原生的无尾斜杠形式(/about、/posts/<slug>),链接、canonical、
  // sitemap、RSS 四者据此对齐。
  //
  // 不要改成带尾斜杠:Nuxt 会把静态页按原生形式(/about)自动加入预渲染,爬虫又从
  // <NuxtLink to="/about/"> 发现带斜杠的形式,两条路由抢写同一个 about/index.html,
  // 产出末尾带残留字节的畸形 HTML,且不报错。
  // 产物文件名两种写法都是 about/index.html,静态托管行为不受影响,故取原生形式。
  site: { url: SITE.url },

  sitemap: {
    // /404 是为了产出服务端渲染的 404.html 才预渲染的(见 app/pages/404.vue),
    // 它不是内容页,不能进 sitemap。
    exclude: ['/404'],
  },

  ogImage: {
    // 渲染器不在这里配 —— 它由模板的文件名后缀决定,见
    // app/components/OgImage/Hubery.browser.vue。`defaults` 的类型显式排除了
    // renderer 字段,写在这里能通过构建但过不了 typecheck。
    //
    // 选 Chrome 而非 satori/takumi:后两者不能用系统字体,中文要另行内嵌
    // Noto Sans SC(全字重十几 MB),而模块文档没有 CJK 章节。走浏览器则直接吃
    // 系统 PingFang SC,且 CSS 支持完整。
    // 已知短板"每次请求都要开浏览器"只影响运行时按需生成;本站全静态预渲染,
    // 构建期渲染完就结束,产物里没有任何运行时开销。
    defaults: {
      width: 1200,
      height: 630,
    },
  },

  css: ['~/assets/css/global.css'],

  app: {
    head: {
      htmlAttrs: { lang: SITE.locale },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.ico' },
        { rel: 'alternate', type: 'application/rss+xml', title: SITE.title, href: '/rss.xml' },
      ],
      script: [{ innerHTML: themeInitScript, tagPriority: 'critical' }],
    },
  },

  content: {
    renderer: {
      // Nuxt Content 默认给 h2/h3/h4 套一层锚点 <a>,不关掉的话标题会继承
      // .prose a 的下划线样式。正文要的是裸标题。
      anchorLinks: false,
    },
    build: {
      markdown: {
        // 不接 remark-smartypants:它会把 到"标题" 里的开引号也转成收引号
        // (”标题”),方向是错的、比不转更糟。中文引号改为在 markdown 源码里直接写。
        toc: {
          // 大纲要收 h2/h3,与 PostOutline 的过滤条件一致
          depth: 3,
          searchDepth: 3,
        },
        highlight: {
          // Nuxt Content 用 default 作为浅色键名,于是 Shiki 输出的变量是
          // --shiki-default / --shiki-dark,global.css 按 .dark 选择器二选一取用。
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
        },
      },
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      // 首页/RSS 作为爬虫入口;标签页与文章页都能从首页的链接爬到。
      // /404 是给下面那个钩子备料的,见 app/pages/404.vue 的说明。
      //
      // /search-index.json 必须显式列在这里:爬虫只从 href 属性发现链接
      // (extractLinks 里 `if (!node.attributes?.href) return`),而这个索引是
      // 搜索弹层用 fetch 取的,HTML 里没有任何指向它的 href。漏掉不会报错 ——
      // dev 模式照常能搜、构建照常成功,只有线上点开搜索才 404。
      routes: ['/', '/rss.xml', '/404', '/search-index.json'],
    },
  },

  hooks: {
    // nuxt generate 写出的根级 404.html 是 SPA 兜底空壳,内容要等 JS 水合才出现。
    // 这里用预渲染好的 /404/index.html(完整服务端渲染)覆盖它,让爬虫与禁用 JS
    // 的访客也能看到 404 内容。
    'nitro:build:public-assets': async (nitro) => {
      const { join } = await import('node:path')
      const { copyFile, access } = await import('node:fs/promises')
      const dir = nitro.options.output.publicDir
      const src = join(dir, '404', 'index.html')

      try {
        await access(src)
      }
      catch {
        // /404 未被预渲染(例如改了 prerender.routes)——保持 Nuxt 默认产物,不静默造假
        console.warn('[404] 未找到预渲染的 /404/index.html,根级 404.html 仍是 SPA 空壳')
        return
      }

      await copyFile(src, join(dir, '404.html'))

      // 产物断言 —— 校验逻辑全在 scripts/verify-build.ts,这里只负责调用。
      // 放在外部文件而非内联进配置:那样能用 `pnpm verify:build` 单独跑,
      // 出问题时不必每次重新构建一遍才能验证修复。
      const { verifyBuildOutput } = await import('./scripts/verify-build')
      await verifyBuildOutput(dir)
    },
  },

  compatibilityDate: '2026-08-03',

  devtools: {
    enabled: true,
  },
})

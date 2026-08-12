#!/usr/bin/env node
import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { BADGES, SITE } from '../app/config.ts'

/**
 * 产物断言 —— 构建成功之后再问一遍"产物里真的有那些东西吗"。
 *
 * 为什么需要这一层:本项目遇到的几次故障有同一个形状 —— **构建成功、页面照常
 * 渲染、只是某块东西凭空消失**。渲染器找不到 Chrome 就静默禁用;MDC 组件名撞了
 * HTML 标签就被当原生元素渲染,props 变属性、内容不输出;配置文件放错目录就被
 * 忽略。这些都不抛错,单测也够不着 —— 单测测的是函数,而上线的是产物。
 *
 * 因此凡是"没有兜底的静默失败"一律在这里转成构建失败。
 *
 * 两种跑法:
 * - 构建期自动跑(nuxt.config.ts 的 nitro:build:public-assets 钩子调用)
 * - 事后单独跑:`pnpm verify:build`
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** MDC 组件在产物里的指纹:用了某个组件,页面上就该出现对应的类名 */
const MDC_MARKERS: Record<string, string> = {
  note: 'callout-note',
  tip: 'callout-tip',
  warning: 'callout-warning',
  caution: 'callout-caution',
  demo: 'demo-stage',
  illustration: 'class="figure"',
}

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const found = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return htmlFiles(path)
    return entry.name.endsWith('.html') ? [path] : []
  }))
  return found.flat()
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  }
  catch {
    return false
  }
}

interface ArticleSource {
  slug: string
  isDraft: boolean
  /** 正文里真正调用了的 MDC 组件(已排除代码块里的示例) */
  components: Set<string>
  /** 正文里有围栏代码块 → 页面上就该出现代码块结构 */
  hasCodeBlock: boolean
  /** frontmatter 里写的徽章 key → 页面上就该出现对应的 .post-badge-<tone> */
  badges: string[]
}

/**
 * 逐篇读 markdown 源码,得出"这一篇的页面上应该出现什么"。
 *
 * 必须逐篇而不是全站汇总:全站汇总会让单页的失效被其他页面掩盖 ——
 * 某一篇的代码块渲染坏了,只要别的文章还正常,汇总检查就发现不了。
 * (这条检查最初就是写成汇总的,靠"故意弄坏一页"的演练才暴露出来。)
 */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/

/**
 * 剥掉围栏代码块 —— 文档里会把 `::note` 当例子贴进代码块,那不算真正的组件调用。
 *
 * 逐行扫描而不是一条正则:
 * - 正则版本要用反向引用配对起止围栏,会带来指数级回溯风险(ESLint 的
 *   regexp/no-super-linear-backtracking 会直接拦下)
 * - 而且本站文章里有**嵌套围栏**(外层 ````md 里贴 ```ts),按 CommonMark
 *   规则收尾围栏必须与开启的同字符、且不短于它;正则里表达这条既绕又易错
 */
function stripFences(markdown: string): string {
  const kept: string[] = []
  let openFence: string | null = null

  for (const line of markdown.split('\n')) {
    const marker = line.match(FENCE_RE)?.[1]

    if (openFence === null) {
      if (marker)
        openFence = marker
      else
        kept.push(line)
      continue
    }

    if (marker && marker[0] === openFence[0] && marker.length >= openFence.length)
      openFence = null
  }

  return kept.join('\n')
}

async function readContent(): Promise<ArticleSource[]> {
  const dir = join(ROOT, 'content/blog')
  const files = (await readdir(dir)).filter(name => name.endsWith('.md'))

  return Promise.all(files.map(async (name) => {
    const raw = await readFile(join(dir, name), 'utf8')
    const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
    const body = raw.slice(frontmatter.length)

    return {
      slug: name.replace(/\.md$/, ''),
      isDraft: /^draft:\s*true\s*$/m.test(frontmatter),
      // 只认行内数组写法(`badges: [wip, translated]`)—— 与 pnpm new 产出的
      // frontmatter 一致。这里不引 YAML 解析器:整个文件都在用正则读 frontmatter,
      // 为一个字段单独换一套读法,反而多一处会和其余检查不一致的地方。
      badges: (frontmatter.match(/^badges:\s*\[(.*?)\]\s*$/m)?.[1] ?? '')
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean),
      components: new Set(
        [...stripFences(body).matchAll(/^::([a-z][a-z0-9-]*)/gm)].map(m => m[1]!),
      ),
      hasCodeBlock: FENCE_RE.test(body) || /\n {0,3}(?:`{3,}|~{3,})/.test(body),
    }
  }))
}

export async function verifyBuildOutput(publicDir: string): Promise<void> {
  const problems: string[] = []
  const fail = (check: string, detail: string) => problems.push(`[${check}] ${detail}`)

  const pages = await htmlFiles(publicDir)
  const articles = await readContent()
  const drafts = articles.filter(a => a.isDraft).map(a => a.slug)

  // ---- 1. OG 分享图 ----
  // Browser 渲染器找不到 Chrome 时会静默禁用:构建照样成功,产物里却少了分享图,
  // 本地预览完全看不出异常 —— 只有别人分享链接、卡片没图时才暴露。
  let ogChecked = 0
  for (const page of pages) {
    const html = await readFile(page, 'utf8')
    const url = html.match(/property="og:image" content="([^"]+)"/)?.[1]
    // 200.html 是 SPA 兜底空壳,本就不带任何 SEO 标签,不参与校验
    if (!url)
      continue
    ogChecked++
    if (!await exists(join(publicDir, new URL(url).pathname)))
      fail('og', `${page.slice(publicDir.length)} → ${url} 不存在`)
  }
  if (ogChecked === 0)
    fail('og', '产物里没有任何 og:image —— 渲染器可能已静默禁用(检查 Chrome 是否可用)')

  // ---- 2. 正文图片 ----
  // <img src> 指向产物里不存在的文件时构建不会有任何反应,页面也照常渲染,
  // 只是那个位置留一个碎图;本地开发常因路径能从别处解析到而看不出来。
  for (const page of pages) {
    const html = await readFile(page, 'utf8')
    for (const match of html.matchAll(/<img[^>]+src="(\/[^"]*)"/g)) {
      const src = match[1]
      // 协议相对地址(//host/x.png)是外链,产物里本就没有
      if (!src || src.startsWith('//'))
        continue
      if (!await exists(join(publicDir, decodeURIComponent(src))))
        fail('img', `${page.slice(publicDir.length)} → ${src} 不存在`)
    }
  }

  // ---- 3. 草稿不外泄 ----
  // 草稿过滤散落在取数、RSS、sitemap 三条路径上,漏掉任何一条都是"站点上看不到、
  // 订阅源里却推送了"。这里从产物侧一次性验完。
  const leakSurfaces = ['rss.xml', 'sitemap.xml', 'index.html', 'search-index.json']
  for (const slug of drafts) {
    for (const surface of leakSurfaces) {
      const path = join(publicDir, surface)
      if (!await exists(path))
        continue
      if ((await readFile(path, 'utf8')).includes(slug))
        fail('draft', `${surface} 里出现了草稿 ${slug}`)
    }
    if (await exists(join(publicDir, 'posts', slug)))
      fail('draft', `草稿 ${slug} 被预渲染成了页面`)
  }

  // ---- 4~6. 逐篇核对页面产物 ----
  let checkedArticles = 0
  const allArticles: string[] = []

  for (const article of articles.filter(a => !a.isDraft)) {
    const page = join(publicDir, 'posts', article.slug, 'index.html')
    if (!await exists(page)) {
      fail('article', `${article.slug} 不是草稿,却没有生成页面`)
      continue
    }

    checkedArticles++
    const html = await readFile(page, 'utf8')
    allArticles.push(html)

    // MDC 组件真的渲染了 —— 组件名若撞上 HTML 标签(如 ::figure),MDC 会把它
    // 当原生元素处理:props 原样挂成属性、内容一个字都不输出,而且不报错。
    for (const name of article.components) {
      const marker = MDC_MARKERS[name]
      if (marker && !html.includes(marker))
        fail('mdc', `${article.slug} 用了 ::${name},页面上却找不到 ${marker} —— 组件可能没解析成功`)
    }

    // 没有未解析的 MDC 语法残留 —— 属性值里写转义引号之类的写法会让整个块
    // 不解析、原样当普通文字输出。代码块与行内代码里的 ::xxx 是文档示例,先剥掉。
    const stripped = html
      .replace(/<pre[\s\S]*?<\/pre>/g, '')
      .replace(/<code[\s\S]*?<\/code>/g, '')
    for (const [, name] of stripped.matchAll(/>\s*::([a-z][a-z0-9-]*)/g))
      fail('mdc', `${article.slug} 里出现了未解析的 ::${name} —— 该块被当成普通文字输出了`)

    // 代码块覆写生效 —— ProsePre 覆写若没注册会静默退回默认实现:
    // 代码照常高亮,只是文件名标题与复制按钮不见了。
    if (article.hasCodeBlock && !html.includes('code-block-bar'))
      fail('prose', `${article.slug} 有代码块却没有 code-block-bar —— ProsePre 覆写可能未生效`)

    // 徽章真的渲染了。失效形态和 MDC 组件同构:PostBadges 没接上、tone 类被删、
    // 预设表改了 key 而文章没跟着改 —— 三者都是构建成功、页面照常出、只是标题
    // 旁边那块东西不见了。逐篇核对而不是全站汇总,否则某篇失效会被别篇掩盖。
    for (const key of article.badges) {
      const badge = BADGES[key as keyof typeof BADGES]
      if (!badge) {
        fail('badge', `${article.slug} 的 badges 里有未知 key "${key}" —— 预设表见 app/config.ts`)
        continue
      }
      if (!html.includes(`post-badge-${badge.tone}`))
        fail('badge', `${article.slug} 写了 badges: [${key}],页面上却找不到 post-badge-${badge.tone}`)
      if (!html.includes(badge.label))
        fail('badge', `${article.slug} 写了 badges: [${key}],页面上却找不到「${badge.label}」`)
    }
  }

  // ---- 7. 前后篇导航接线正确 ----
  // 相邻计算本身有单测(findNeighbors),这里只验它确实被接到了页面上。
  const joined = allArticles.join('')
  if (checkedArticles >= 2) {
    if (!joined.includes('上一篇'))
      fail('nav', '有多篇文章却没有任何"上一篇"链接 —— PostNav 可能没接上')
    if (!joined.includes('下一篇'))
      fail('nav', '有多篇文章却没有任何"下一篇"链接 —— PostNav 可能没接上')
  }

  // ---- 8. 搜索索引 ----
  // 索引是 fetch 出来的,HTML 里没有任何指向它的 href —— 预渲染爬虫发现不了它,
  // 必须靠 nuxt.config.ts 的 prerender.routes 显式列出。漏掉不会报错:dev 模式
  // 照常能搜、构建照常成功,只有线上点开搜索才 404。
  // (草稿是否混进索引由上面第 3 节的 leakSurfaces 一并检查。)
  const indexPath = join(publicDir, 'search-index.json')
  if (!await exists(indexPath)) {
    fail('search', 'search-index.json 不存在 —— 检查 nuxt.config.ts 的 prerender.routes')
  }
  else {
    const index = JSON.parse(await readFile(indexPath, 'utf8')) as {
      id: string
      level: number
    }[]

    if (index.length === 0) {
      // 已发布文章数为 0 时索引本就该是空的 —— 这是合法的"站点还没有正式内容"状态,
      // 不是过滤逻辑出错。只有"明明有已发布文章、索引却是空的"才是取数或草稿过滤
      // 把内容错误地全部滤掉,那种情况才应该拦住构建。
      if (checkedArticles > 0) {
        fail('search', '搜索索引是空的,但存在已发布文章 —— 取数或草稿过滤可能把内容全滤掉了')
      }
      else {
        console.warn(
          '⚠ 搜索索引为空 —— 当前没有已发布文章,属于预期状态,不阻塞构建。',
        )
      }
    }

    for (const entry of index) {
      const [path, anchor] = entry.id.split('#')
      const page = join(publicDir, path ?? '', 'index.html')

      if (!await exists(page)) {
        fail('search', `索引里的 ${entry.id} 指向不存在的页面`)
        continue
      }

      // 锚点必须在页面上真实存在。对不上时浏览器不会报错,只是停在页面顶部 ——
      // 搜索结果看起来"能点开",实际每一条都跳到了同一个地方。
      if (anchor && !(await readFile(page, 'utf8')).includes(`id="${decodeURIComponent(anchor)}"`))
        fail('search', `索引里的 ${entry.id} 在页面上找不到对应锚点`)
    }
  }

  if (problems.length) {
    throw new Error(
      `产物断言未通过,共 ${problems.length} 项:\n  ${problems.join('\n  ')}`,
    )
  }

  // 域名核对是"还没上线",不是"构建坏了" —— 告警而不失败,否则会挡住日常开发。
  // 格式层面的约束(https / 无尾斜杠 / 无路径段)由 test/config.test.ts 硬守。
  if (!SITE.urlConfirmed) {
    console.warn(
      `⚠ SITE.url 尚未与实际部署地址核对(当前 ${SITE.url})。\n`
      + '  canonical / sitemap / RSS / OG 图都用它生成绝对 URL,填错不会报错,\n'
      + '  只会让全站外链整体指向错误的域名。核对后把 app/config.ts 的\n'
      + '  urlConfirmed 改成 true,这条告警就会消失。',
    )
  }

  console.log(
    `✓ 产物断言通过(${pages.length} 个页面 / ${checkedArticles} 篇文章逐页核对 / `
    + `${drafts.length} 篇草稿确认未外泄)`,
  )
}

// 直接执行时对 .output/public 跑一遍;被 import 时什么都不做
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? join(ROOT, '.output/public')
  if (!await exists(dir)) {
    console.error(`✗ 找不到产物目录 ${dir},先跑 pnpm build`)
    process.exit(1)
  }
  try {
    await verifyBuildOutput(dir)
  }
  catch (error) {
    console.error(`✗ ${(error as Error).message}`)
    process.exit(1)
  }
}

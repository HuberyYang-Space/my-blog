import type { VerificationValues } from '../../shared/utils/seo.ts'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { load } from 'cheerio'
import { articleModifiedTime, buildRobotsTxt, buildVerificationMeta } from '../../shared/utils/seo.ts'
import { collectSearchSnapshot, pageFile, parseSitemapEntries, validateSnapshot } from './search-snapshot.ts'

export interface SearchBuildOptions {
  verification: VerificationValues
  indexNowKey?: string
}

export function readSearchBuildOptions(env: Record<string, string | undefined>): SearchBuildOptions {
  const verification: VerificationValues = {}
  const variables = {
    google: 'GOOGLE_SITE_VERIFICATION',
    baidu: 'BAIDU_SITE_VERIFICATION',
    bing: 'BING_SITE_VERIFICATION',
  }
  for (const key of Object.keys(variables) as (keyof VerificationValues)[]) {
    const value = env[variables[key]]?.trim()
    if (value)
      verification[key] = value
  }

  const enabled = env.INDEXNOW_SUBMISSION_ENABLED
  if (enabled && enabled !== 'true' && enabled !== 'false')
    throw new Error('INDEXNOW_SUBMISSION_ENABLED 必须为 true 或 false')
  if (enabled !== 'true')
    return { verification }

  const key = env.INDEXNOW_KEY?.trim() ?? ''
  if (!/^[A-Z0-9-]{8,128}$/i.test(key))
    throw new Error('启用 IndexNow 后必须提供 8–128 位字母、数字或连字符组成的 Key')
  return { verification, indexNowKey: key }
}

export async function prepareSearchBuild(publicDir: string, origin: string, options: SearchBuildOptions): Promise<void> {
  if (options.indexNowKey)
    await writeFile(join(publicDir, `${options.indexNowKey}.txt`), options.indexNowKey, 'utf8')
  const snapshot = await collectSearchSnapshot(publicDir, origin)
  const privateDir = join(publicDir, '..', 'search')
  await mkdir(privateDir, { recursive: true })
  await writeFile(join(privateDir, 'snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`)
}

export function inspectVerificationTags(html: string, verification: VerificationValues): string[] {
  const $ = load(html)
  return buildVerificationMeta(verification).flatMap(({ name, content }) => {
    const tags = $(`meta[name="${name}"]`)
    return tags.length === 1 && tags.parents('head').length === 1 && tags.attr('content') === content
      ? []
      : [`首页 ${name} 必须唯一出现在 head 中且与配置一致`]
  })
}

export function inspectArticleDates(html: string): string[] {
  const $ = load(html)
  const dates = $('main article header.post-intro time[datetime]')
    .toArray()
    .map(element => $(element).attr('datetime')!)
  if (dates.length === 0)
    return ['文章头部缺少可核对的日期']

  const expected = {
    'article:published_time': dates[0]!,
    'article:modified_time': dates.at(-1)!,
  }
  return Object.entries(expected).flatMap(([property, value]) => {
    const tags = $(`head meta[property="${property}"]`)
    try {
      return tags.length === 1 && articleModifiedTime(tags.attr('content') ?? '') === articleModifiedTime(value)
        ? []
        : [`${property} 与实际文章头部日期不一致`]
    }
    catch {
      return [`${property} 缺失或日期无效`]
    }
  })
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return undefined
    throw error
  }
}

async function postPages(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return []
    throw error
  }
  const paths = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? postPages(path) : entry.isFile() && entry.name === 'index.html' ? [path] : []
  }))
  return paths.flat()
}

export async function collectSearchBuildProblems(publicDir: string, origin: string, options: SearchBuildOptions): Promise<string[]> {
  const problems: string[] = []
  const robots = await readOptional(join(publicDir, 'robots.txt'))
  if (robots !== buildRobotsTxt(origin))
    problems.push('robots.txt 缺失或 sitemap 声明与站点 origin 不一致')
  const home = await readOptional(join(publicDir, 'index.html'))
  if (home === undefined)
    problems.push('首页不存在，无法检查验证标签')
  else
    problems.push(...inspectVerificationTags(home, options.verification))

  if (options.indexNowKey) {
    const key = await readOptional(join(publicDir, `${options.indexNowKey}.txt`))
    if (key !== options.indexNowKey)
      problems.push('IndexNow 验证文件缺失或内容不一致')
  }

  for (const path of await postPages(join(publicDir, 'posts'))) {
    const html = await readFile(path, 'utf8')
    problems.push(...inspectArticleDates(html).map(problem => `${path.slice(publicDir.length)}: ${problem}`))
  }
  try {
    const entries = parseSitemapEntries(await readFile(join(publicDir, 'sitemap.xml'), 'utf8'), origin)
    for (const entry of entries) {
      if (!new URL(entry.url).pathname.startsWith('/posts/'))
        continue
      const $ = load(await readFile(pageFile(publicDir, entry.url, origin), 'utf8'))
      const modified = $('head meta[property="article:modified_time"]').attr('content')
      if (!entry.lastmod || !modified || new Date(entry.lastmod).getTime() !== new Date(modified).getTime())
        problems.push(`sitemap lastmod 与文章修改日期不一致: ${entry.url}`)
    }
    const snapshot = validateSnapshot(JSON.parse(await readFile(join(publicDir, '..', 'search', 'snapshot.json'), 'utf8')), origin)
    const actual = await collectSearchSnapshot(publicDir, origin)
    if (JSON.stringify(snapshot.pages) !== JSON.stringify(actual.pages))
      problems.push('私有快照与实际公开页面不一致')
    if (await readOptional(join(publicDir, 'snapshot.json')) !== undefined || await readOptional(join(publicDir, 'search', 'snapshot.json')) !== undefined)
      problems.push('私有快照不能进入公开目录')
  }
  catch {
    problems.push('sitemap 或私有快照无效，无法核对公开页面')
  }
  return problems
}

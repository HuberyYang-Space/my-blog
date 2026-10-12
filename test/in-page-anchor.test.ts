import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function vueFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? vueFiles(join(dir, entry.name))
      : entry.name.endsWith('.vue') ? [join(dir, entry.name)] : [],
  )
}

// 静态 href="#x"、绑定 :href="`#${id}`"、拼接 :href="'#' + id" 三种写法
const BARE_HASH_ANCHOR = /<a\s(?:[^>]*?\s)?:?href="[`']?#/

/**
 * 裸的 <a href="#x"> 由浏览器自己跳,vue-router 事后只收到一次 popstate,当成后退/前进,
 * 拿离开该锚点那一刻存下的滚动位置去还原 —— 同一个锚点第二次点击会落回上次离开的位置,
 * 表现为"点了没反应"。页内锚点必须用 NuxtLink(走 router.push)。
 * 这条只能读源码守:产物里 NuxtLink 的 "#x" 渲染出来同样是 href="#x",分不出来。
 */
describe('页内锚点经过路由', () => {
  const files = vueFiles(join(ROOT, 'app'))

  it('扫描到了组件(本测试的前提)', () => {
    expect(files.map(f => relative(ROOT, f))).toContain('app/components/PostOutline.vue')
  })

  it.each(files.map(f => [relative(ROOT, f), f]))('%s 没有裸 <a href="#…">', (_, file) => {
    const template = readFileSync(file, 'utf8').match(/<template>[\s\S]*<\/template>/)?.[0] ?? ''
    expect(template).not.toMatch(BARE_HASH_ANCHOR)
  })
})

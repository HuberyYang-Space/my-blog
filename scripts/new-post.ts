#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { slugify } from './lib/slugify.ts'

/**
 * 新建文章脚手架。
 *
 *   pnpm new "文章标题"
 *   pnpm new "文章标题" my-slug
 *
 * 手写 frontmatter 时最容易出错的是日期(打错一天不会报错,只会让排序和前后篇
 * 导航悄悄错位)与 slug(与标题对不上,事后改动要连带改链接)。这个脚本把两者
 * 固定下来,其余字段留空等着填。
 */

const BLOG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../content/blog')

/** 取本地时区的当天日期,格式 YYYY-MM-DD */
function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const [title, explicitSlug] = process.argv.slice(2)

if (!title)
  fail('缺少标题。用法:pnpm new "文章标题" [slug]')

const slug = explicitSlug ? slugify(explicitSlug) : slugify(title)

if (!slug) {
  fail(
    `无法从标题「${title}」推导出 slug(不含 ASCII 字母或数字)。\n`
    + `  请显式指定:pnpm new "${title}" your-slug`,
  )
}

const filePath = join(BLOG_DIR, `${slug}.md`)

// 先探再写 —— 覆盖一篇已有文章是不可逆的,宁可让用户换个 slug
try {
  await access(filePath)
  fail(`${filePath} 已存在,换一个 slug 或先删除原文件`)
}
catch {
  // 不存在才是期望的情况,继续
}

/**
 * draft 默认为 true:新文章不该因为一次 push 就直接上线。
 * 写完把它删掉或改成 false 即可发布。
 */
const template = `---
title: ${title}
description:
date: ${today()}
tags: []
draft: true
---

`

await mkdir(BLOG_DIR, { recursive: true })
await writeFile(filePath, template, 'utf8')

console.log(`✓ 已创建 content/blog/${slug}.md`)
console.log('  记得填 description 与 tags,发布前把 draft 去掉。')

/**
 * 新文章的 frontmatter 模板。
 *
 * 单独成文件是为了能被单测直接导入,理由同 slugify.ts。
 *
 * 标题一律写成双引号字符串(JSON.stringify 的产物在 YAML 里同样合法):裸写的话
 * `Vue: 入门` 会让 YAML 解析报错,`标题 #1` 会被当成注释静默截成「标题」。
 *
 * draft 默认为 true:新文章不该因为一次 push 就直接上线。
 * 写完把它删掉或改成 false 即可发布。
 */
export function postTemplate(title: string, date: string): string {
  return `---
title: ${JSON.stringify(title)}
description:
date: ${date}
tags: []
draft: true
---

`
}

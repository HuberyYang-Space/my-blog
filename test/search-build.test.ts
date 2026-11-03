import { describe, expect, it } from 'vitest'
import { inspectArticleDates, inspectVerificationTags } from '../scripts/lib/search-build'

const article = `<html><head>
<meta property="article:published_time" content="2026-09-01T00:00:00.000Z">
<meta property="article:modified_time" content="2026-11-02T00:00:00.000Z">
</head><body><main><article><header class="post-intro">
<time datetime="2026-09-01T00:00:00.000Z">发布</time>
<time datetime="2026-11-02T00:00:00.000Z">更新</time>
</header><p>正文</p></article></main></body></html>`

describe('实际验证标签检查', () => {
  it('检查真实 head 中的值', () => {
    expect(inspectVerificationTags('<head><meta name="google-site-verification" content="expected"></head>', { google: 'expected' })).toEqual([])
  })

  it('放进 body 的同名标签不能冒充 head 验证', () => {
    expect(inspectVerificationTags('<head></head><body><meta name="google-site-verification" content="expected"></body>', { google: 'expected' })).not.toEqual([])
  })

  it.each([
    '<head></head>',
    '<head><meta name="google-site-verification" content="wrong"></head>',
    '<head><meta name="google-site-verification" content="expected"><meta name="google-site-verification" content="other"></head>',
  ])('缺失、错误或重复验证码会失败', (html) => {
    expect(inspectVerificationTags(html, { google: 'expected' })).not.toEqual([])
  })

  it('未配置的平台不强制要求标签存在', () => {
    expect(inspectVerificationTags('<head></head>', {})).toEqual([])
  })
})

describe('文章日期接线检查', () => {
  it('metadata 与实际文章头部的发布时间和更新时间一致', () => {
    expect(inspectArticleDates(article)).toEqual([])
  })

  it('更新日期退回发布日期时会失败', () => {
    expect(inspectArticleDates(article.replace('property="article:modified_time" content="2026-11-02T00:00:00.000Z"', 'property="article:modified_time" content="2026-09-01T00:00:00.000Z"'))).not.toEqual([])
  })

  it('移除真实日期 meta 时会失败', () => {
    expect(inspectArticleDates(article.replace(/<meta property="article:modified_time"[^>]+>/, ''))).not.toEqual([])
  })

  it('正文中的额外 time 不能冒充文章头部日期', () => {
    expect(inspectArticleDates(article.replace('<p>正文</p>', '<p><time datetime="2030-01-01">正文例子</time></p>'))).toEqual([])
  })

  it('头部没有时间时不静默跳过检查', () => {
    expect(inspectArticleDates(article.replace(/<time[^>]*>[\s\S]*?<\/time>/g, ''))).not.toEqual([])
  })
})

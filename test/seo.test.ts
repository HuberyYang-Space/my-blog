import { describe, expect, it } from 'vitest'
import { readSearchBuildOptions } from '../scripts/lib/search-build'
import { articleModifiedTime, buildRobotsTxt, buildVerificationMeta } from '../shared/utils/seo'

describe('搜索引擎基础配置', () => {
  it('robots 使用实际 origin，保留非默认端口', () => {
    expect(buildRobotsTxt('https://example.com:91')).toBe('User-agent: *\nAllow: /\nSitemap: https://example.com:91/sitemap.xml\n')
  })

  it('未设置验证值时不生成空标签', () => {
    expect(buildVerificationMeta({ google: '', baidu: '  ' })).toEqual([])
  })

  it('将公开验证码映射到各平台实际识别的 meta 名称', () => {
    expect(buildVerificationMeta({ google: 'google-code', baidu: ' baidu-code ', bing: 'bing-code' })).toEqual([
      { name: 'google-site-verification', content: 'google-code' },
      { name: 'baidu-site-verification', content: 'baidu-code' },
      { name: 'msvalidate.01', content: 'bing-code' },
    ])
  })

  it('修改日期优先于发布日期', () => {
    expect(articleModifiedTime('2026-09-01', '2026-11-02')).toBe('2026-11-02T00:00:00.000Z')
  })

  it('未修改时沿用发布日期，不使用构建时间', () => {
    expect(articleModifiedTime(new Date('2026-09-01T00:00:00Z'))).toBe('2026-09-01T00:00:00.000Z')
  })

  it('拒绝无效的文章日期', () => {
    expect(() => articleModifiedTime('not-a-date')).toThrow()
  })
})

describe('搜索构建选项', () => {
  it('默认未启用 IndexNow，不要求 Key', () => {
    expect(readSearchBuildOptions({})).toEqual({ verification: {} })
  })

  it('未启用时不把已设置但未使用的 Key 带入构建', () => {
    expect(readSearchBuildOptions({ INDEXNOW_KEY: 'unused' })).toEqual({ verification: {} })
  })

  it('读取验证码，并只在明确启用时读取 IndexNow Key', () => {
    expect(readSearchBuildOptions({
      GOOGLE_SITE_VERIFICATION: 'google-code',
      BAIDU_SITE_VERIFICATION: 'baidu-code',
      BING_SITE_VERIFICATION: 'bing-code',
      INDEXNOW_SUBMISSION_ENABLED: 'true',
      INDEXNOW_KEY: 'abcdef1234567890',
    })).toEqual({
      verification: { google: 'google-code', baidu: 'baidu-code', bing: 'bing-code' },
      indexNowKey: 'abcdef1234567890',
    })
  })

  it.each(['', 'short', 'invalid/key', 'x'.repeat(129)])('启用后拒绝无效 Key %s', (key) => {
    expect(() => readSearchBuildOptions({ INDEXNOW_SUBMISSION_ENABLED: 'true', INDEXNOW_KEY: key })).toThrow()
  })

  it('拼错的启用开关会报错，不静默关闭', () => {
    expect(() => readSearchBuildOptions({ INDEXNOW_SUBMISSION_ENABLED: 'yes' })).toThrow()
  })
})

export interface VerificationValues {
  google?: string
  baidu?: string
  bing?: string
}

export function buildRobotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', siteUrl).href}\n`
}

export function buildVerificationMeta(values: VerificationValues): { name: string, content: string }[] {
  const names = {
    google: 'google-site-verification',
    baidu: 'baidu-site-verification',
    bing: 'msvalidate.01',
  }
  return (Object.keys(names) as (keyof VerificationValues)[]).flatMap((key) => {
    const content = values[key]?.trim()
    return content ? [{ name: names[key], content }] : []
  })
}

export function articleModifiedTime(published: Date | string, updated?: Date | string): string {
  return new Date(updated ?? published).toISOString()
}

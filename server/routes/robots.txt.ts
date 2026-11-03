import { SITE } from '../../app/config'
import { buildRobotsTxt } from '../../shared/utils/seo'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return buildRobotsTxt(SITE.url)
})

import type { ElementContent, Properties } from 'hast'
import type { CalloutType } from '../../app/config'
import { toHtml } from 'hast-util-to-html'
import { CALLOUT_LABELS } from '../../app/config'

/**
 * RSS 全文 —— 把 @nuxt/content 存下的正文 AST(minimark)序列化成阅读器能看的 HTML。
 *
 * 不复用站点页面的 HTML:那份是 Vue 组件渲染的,带交互 canvas、`data-v` 属性和只有
 * 站点 CSS 才撑得起来的结构。也不用 minimark 自带的 `stringify(…, { format: 'text/html' })`:
 * 它对文本节点和属性值都不转义,正文里写到 `<script>` 这种字面量会直接变成真标签。
 * 所以这里转成标准 hast,交给 hast-util-to-html 负责转义。
 *
 * 放在 server/utils/ 而不是路由文件里:纯函数,才能被单测直接导入。
 */

export type MinimarkNode = string | [string, Record<string, unknown>, ...MinimarkNode[]]

export interface MinimarkTree {
  type: 'minimark'
  value: MinimarkNode[]
}

function text(value: string): ElementContent {
  return { type: 'text', value }
}

function el(tagName: string, properties: Properties, children: ElementContent[] = []): ElementContent {
  return { type: 'element', tagName, properties, children }
}

function isCallout(tag: string): tag is CalloutType {
  return Object.hasOwn(CALLOUT_LABELS, tag)
}

/** 站内路径与页内锚点在阅读器里没有"当前站点"可依,必须补成完整地址 */
function absolute(url: unknown, postUrl: string): string {
  return new URL(String(url), postUrl).href
}

function toProperties(tag: string, props: Record<string, unknown>, postUrl: string): Properties {
  const properties: Properties = {}
  for (const [key, value] of Object.entries(props)) {
    // __ignoreMap 之类是解析器留给自己的标记,不是 HTML 属性
    if (key.startsWith('__'))
      continue
    if ((key === 'href' && tag === 'a') || (key === 'src' && tag === 'img')) {
      properties[key] = absolute(value, postUrl)
      continue
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      properties[key] = value
    else if (Array.isArray(value))
      properties[key] = value.map(String)
  }
  return properties
}

function convert(node: MinimarkNode, postUrl: string): ElementContent[] {
  if (typeof node === 'string')
    return [text(node)]

  const [tag, props, ...rest] = node
  const children = () => rest.flatMap(child => convert(child, postUrl))

  // shiki 把主题 CSS 作为一个 <style> 节点挂在正文末尾,阅读器里只会显示成一坨文字
  if (tag === 'style')
    return []

  // 高亮后的逐行 span 全靠站点 CSS 着色,阅读器里只剩噪音;props.code 是原始代码
  if (tag === 'pre') {
    const language = typeof props.language === 'string' && props.language ? props.language : undefined
    return [el('pre', {}, [el('code', language ? { className: [`language-${language}`] } : {}, [text(String(props.code ?? ''))])])]
  }

  if (isCallout(tag)) {
    const title = typeof props.title === 'string' && props.title ? props.title : CALLOUT_LABELS[tag]
    return [el('blockquote', {}, [el('p', {}, [el('strong', {}, [text(title)])]), ...children()])]
  }

  if (tag === 'illustration') {
    const image = toProperties('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }, postUrl)
    return [el('figure', {}, [el('img', image), el('figcaption', {}, children())])]
  }

  // 交互演示靠站点的 JS 运行,阅读器里注定是空白;与其留个空壳,不如明说并给出原文入口
  if (tag === 'demo') {
    const title = typeof props.title === 'string' && props.title ? `「${props.title}」` : ''
    return [el('p', {}, [el('em', {}, [text(`此处是一段交互演示${title}，`), el('a', { href: postUrl }, [text('到原文体验')])])])]
  }

  return [el(tag, toProperties(tag, props, postUrl), children())]
}

export function renderFeedHtml(body: MinimarkTree, postUrl: string): string {
  return toHtml({ type: 'root', children: body.value.flatMap(node => convert(node, postUrl)) })
}

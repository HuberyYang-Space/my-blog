/**
 * XML 文本节点转义 —— 手写 RSS 时唯一的注入防线。
 *
 * 文章标题与摘要是自由文本,里面出现 `&` `<` `>` 时会破坏 XML 文档结构,
 * 订阅器直接解析失败(而站点本身一切正常,不易发现)。
 *
 * 单独放在 `server/utils/` 而不是写在 RSS 路由文件里:它是本项目里少数
 * 有安全含义的纯函数,必须能被单测直接导入 —— 写在路由内部就没法测。
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

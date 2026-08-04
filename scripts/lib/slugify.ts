/**
 * 由标题推导文章 slug(即 URL 路径段)。
 *
 * 只处理 ASCII —— 中文标题音译成拼音需要额外的词典依赖,而机器猜出来的 slug
 * 往往还不如自己起的。推导不出结果时返回空串,由调用方要求显式指定。
 *
 * 单独成文件是为了能被单测直接导入:`scripts/new-post.ts` 在模块顶层就读
 * argv 并写文件,import 它就会产生副作用。
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

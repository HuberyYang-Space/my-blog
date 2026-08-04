/**
 * 草稿可见性判定 —— **全站唯一真源**。
 *
 * 放在 `shared/` 而非 `app/utils/`:Nuxt 会把 `shared/utils/` 同时自动导入到
 * app(页面/组件)与 server(Nitro 路由)两侧。RSS 是 Nitro 路由,拿不到 app 层的
 * 取数函数,若在那边另写一遍过滤条件,改动其一就会出现
 * "站点上看不到、订阅源里却推送了"这类漏网。
 */

/**
 * 判定规则本身 —— 纯函数,不碰环境。
 *
 * 与下面那个包装拆开是为了可测:环境判断若写死在判定里,单测中
 * `import.meta.dev` 恒为 undefined,就永远只能覆盖到生产那一支。
 */
export function isVisiblePost(post: { draft?: boolean }, includeDrafts: boolean): boolean {
  return includeDrafts || post.draft !== true
}

/**
 * 站点实际使用的判定:开发模式保留草稿以便边写边预览,生产构建则排除 ——
 * 于是草稿既不会被预渲染成静态页面,也不会出现在 RSS 里。
 */
export function isPublishedPost(post: { draft?: boolean }): boolean {
  // shared/ 同时供 app 与 server 使用,两侧的 import.meta 类型不完全一致,
  // dev 在这里是 boolean | undefined —— 显式收敛,别让判定接收 undefined。
  return isVisiblePost(post, import.meta.dev === true)
}

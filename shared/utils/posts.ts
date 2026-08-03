/**
 * 草稿可见性判定 —— **全站唯一真源**。
 *
 * 放在 `shared/` 而非 `app/utils/`:Nuxt 会把 `shared/utils/` 同时自动导入到
 * app(页面/组件)与 server(Nitro 路由)两侧。RSS 是 Nitro 路由,拿不到 app 层的
 * 取数函数,若在那边另写一遍过滤条件,改动其一就会出现
 * "站点上看不到、订阅源里却推送了"这类漏网。
 *
 * 开发模式保留草稿以便边写边预览,生产构建则排除 —— 于是草稿既不会被预渲染成
 * 静态页面,也不会出现在 RSS 里。
 */
export function isPublishedPost(post: { draft?: boolean }): boolean {
  return import.meta.dev || post.draft !== true
}

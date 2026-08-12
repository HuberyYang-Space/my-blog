import type { RouterConfig } from '@nuxt/schema'

/**
 * 固定头部遮住的高度,从 CSS 读,不在 JS 里再写一个魔法数字。
 *
 * 读的是 html 的 scroll-padding-top(见 assets/css/reset.css)而不是自定义属性
 * --scroll-offset:后者的值是 calc(var(--header-h) + 1rem),自定义属性不会被求值,
 * getPropertyValue 拿回来的是那串字面量,parseFloat 会得到 NaN。scroll-padding-top
 * 是真实 CSS 属性,getComputedStyle 保证返回解析好的 px。
 * 这样 --header-h 仍是唯一真源,JS 只是把 CSS 已经算好的结果读出来。
 */
function scrollOffset(): number {
  const raw = getComputedStyle(document.documentElement).scrollPaddingTop
  return Number.parseFloat(raw) || 0
}

/**
 * 等目标元素真正出现在 DOM 里再返回它,最多等 timeout 毫秒。
 *
 * 必要性:文章正文由 ContentRenderer 异步渲染,搜索结果跳转到"下滑较多才能看到"
 * 的小节时,scrollBehavior 触发那一刻元素还不存在。此时若直接返回 { el },
 * vue-router 找不到元素会**静默放弃**这次滚动 —— 用户停在文章顶部,没有任何提示。
 * 用 MutationObserver 等它出现,而不是猜一个固定延时;超时就放弃,避免 hash
 * 拼错时观察者永远挂着。
 */
function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
  const existing = document.querySelector(selector)
  if (existing)
    return Promise.resolve(existing)

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        clearTimeout(timer)
        resolve(el)
      }
    })

    timer = setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)

    observer.observe(document.body, { childList: true, subtree: true })
  })
}

export default <RouterConfig> {
  // 滚动逻辑的唯一真源。页面组件不再各自处理 hash —— 两处都滚同一个目标时,
  // 后一次会打断前一次的平滑动画并停在错误位置。
  async scrollBehavior(to, _from, savedPosition) {
    // 浏览器前进/后退:还原用户离开时的位置,优先级高于一切
    if (savedPosition)
      return savedPosition

    if (to.hash) {
      // CSS.escape 处理中文/数字开头的 id —— 本站标题 id 由标题文本推导,
      // 形如 #_1-申请一个只管-dns-的密钥,不转义会让 querySelector 抛错。
      const el = await waitForElement(`#${CSS.escape(decodeURIComponent(to.hash.slice(1)))}`)
      if (!el)
        return false

      // top 补偿固定头部遮住的高度 —— vue-router 内部走 window.scrollTo,
      // 不认 CSS 的 scroll-margin-top,必须在这里显式给出。
      //
      // behavior 显式写 'instant':实测长距离程序化平滑滚动会随机中途夭折
      // (落点在 0 / 166 / 目标之间漂移且不报错,详见 assets/css/reset.css 的说明),
      // 表现就是"点了大纲有时没反应"。不写这个参数会继承 CSS 的 scroll-behavior,
      // 等于把可靠性交给运气。
      return { el, top: scrollOffset(), behavior: 'instant' }
    }

    // 普通路由切换(如 PostNav 的上一篇/下一篇)回到顶部。behavior: 'instant'
    // 是刻意的:换页面时平滑滚动只会让用户盯着旧内容飞一段,没有意义。
    return { top: 0, behavior: 'instant' }
  },
}

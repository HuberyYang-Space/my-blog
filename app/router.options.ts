import type { RouterConfig } from '@nuxt/schema'
import { scrollOffset } from '~/utils/scroll-offset'

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
  async scrollBehavior(to, from, savedPosition) {
    // 浏览器前进/后退:还原用户离开时的位置,优先级高于一切。
    // 注意绕开路由的裸 <a href="#x"> 也会落进这一支(拿到的是陈旧位置),
    // 页内锚点因此一律用 NuxtLink,见 PostOutline.vue 末尾的说明。
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
      // 只有同页内跳锚点(大纲、脚注)才平滑滚动;从别的页面带 hash 进来时
      // 新页面刚渲染,从顶部飞一段没有意义,直接落位。
      const smooth = to.path === from.path
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      return { el, top: scrollOffset(), behavior: smooth ? 'smooth' : 'instant' }
    }

    // 普通路由切换(如 PostNav 的上一篇/下一篇)回到顶部。behavior: 'instant'
    // 是刻意的:换页面时平滑滚动只会让用户盯着旧内容飞一段,没有意义。
    return { top: 0, behavior: 'instant' }
  },
}

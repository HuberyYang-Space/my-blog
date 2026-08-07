<script setup lang="ts">
const route = useRoute()

// 取数与相邻文章的计算都在 app/utils/posts.ts —— 页面只负责渲染。
// (全站三处取数曾各写各的,"文章数据从哪来"没有统一答案。)
const { data } = await useAsyncData(
  `post-${route.path}`,
  () => getPostWithNeighbors(route.path),
)

if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '页面不存在',
    fatal: true,
  })
}

// 搜索跳转是真实路由切换,浏览器不会有原生锚点滚动介入(锚点跳转只在同页面
// hash 变化或整页加载时触发),得自己把 .content-scroll 滚到目标标题;
// TOC 点击虽然浏览器已经滚对了,但对一个已经在视口内的元素重复调用
// scrollIntoView 是空操作,不会造成二次位移,不需要专门跳过。
//
// 目标标题由 ContentRenderer 异步渲染 markdown 产出,flush: 'post' 只保证
// 本组件自己的渲染效果已提交,保证不了子组件树里的异步渲染也已完成 ——
// 实测搜索跳转到下滑较多才能看到的小节时,这里直接查询会扑空,滚动请求被
// 静默丢弃(用户停在文章顶部,毫无提示)。改用 MutationObserver 等元素真正
// 出现再滚,而不是猜一个延时;5 秒还没等到就放弃,避免 hash 写错时观察者
// 永远挂着。
//
// behavior 用 'instant' 而不是 'smooth':实测在 MutationObserver 回调里调用
// scrollIntoView({behavior:'smooth'}),不管是不是找到元素后立刻调用,动画都
// 静默卡在起点、scrollTop 永远不变(反复验证过,直接同步赋值 scrollTop 也是
// 同样结果,只有 'instant' 每次都生效)——这类回调运行的时机不在浏览器正常
// 的渲染节拍里,平滑滚动动画注册不上。TOC 点击时用户看到的平滑滚动来自浏览器
// 原生锚点跳转那条完全不同的路径,不受这里影响。
let hashObserver: MutationObserver | undefined

watch(() => route.hash, (hash) => {
  hashObserver?.disconnect()
  hashObserver = undefined

  if (!hash)
    return

  const id = decodeURIComponent(hash.slice(1))
  const existing = document.getElementById(id)
  if (existing) {
    existing.scrollIntoView({ behavior: 'instant', block: 'start' })
    return
  }

  hashObserver = new MutationObserver(() => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' })
      hashObserver?.disconnect()
    }
  })
  hashObserver.observe(document.body, { childList: true, subtree: true })
  setTimeout(() => hashObserver?.disconnect(), 5000)
}, { immediate: true, flush: 'post' })

onUnmounted(() => hashObserver?.disconnect())
</script>

<template>
  <PostLayout
    v-if="data"
    :post="data.post"
    :links="data.post.body?.toc?.links ?? []"
    :older-post="data.olderPost"
    :newer-post="data.newerPost"
  >
    <ContentRenderer :value="data.post" class="prose" />
  </PostLayout>
</template>

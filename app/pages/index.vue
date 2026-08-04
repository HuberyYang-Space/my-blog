<script setup lang="ts">
import { animate } from 'motion'
import { SITE } from '~/config'

// 全站唯一一次 defineOgImage:模块按路由生成图片,在 BaseLayout 里调用会让每条
// 路由都产出一张字节相同的 PNG(文章越多冗余越大),而模块没有"全站单图"开关。
// 只在根路由调用 → 只产出一个文件,且文件名不带路由段(见 SITE.ogImage 的说明)。
// 其余页面的 og:image 由 BaseLayout 指向同一个 URL。
defineOgImage('Hubery.browser')

const { data: posts } = await useAsyncData('posts', () => getPublishedPosts())
// 复用标签归档页现成的排序规则(文章数倒序、同数按标签名排序),不新增工具函数。
const { data: tags } = await useAsyncData('home-tags', async () => {
  return (await getPostsGroupedByTag()).map(group => group.tag)
})

// 氛围光背景的鼠标视差。
// .glow-core 的自动漂移(外层 transform)、呼吸缩放(scale)与这里的视差
// transform 分属不同节点/属性,互不覆盖,详见 global.css 顶部的说明。
const coreA = ref<HTMLElement>()
const coreB = ref<HTMLElement>()

onMounted(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const cores = [coreA.value, coreB.value].filter((el): el is HTMLElement => Boolean(el))

  if (prefersReducedMotion || cores.length === 0)
    return

  // 每个光斑的视差强度(px)与方向,数值差异营造出前后景的深度感
  const depths = [34, -20]
  let latestEvent: MouseEvent | undefined
  let pending = false

  function applyParallax() {
    pending = false
    if (!latestEvent)
      return

    const relX = latestEvent.clientX / window.innerWidth - 0.5
    const relY = latestEvent.clientY / window.innerHeight - 0.5

    cores.forEach((core, index) => {
      const depth = depths[index] ?? 24
      animate(core, { x: relX * depth, y: relY * depth }, {
        type: 'spring',
        stiffness: 55,
        damping: 18,
        mass: 0.7,
      })
    })
  }

  function onMouseMove(event: MouseEvent) {
    latestEvent = event
    if (!pending) {
      pending = true
      requestAnimationFrame(applyParallax)
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  // 客户端路由离开首页时摘掉监听,避免其他页面继续跑视差计算
  onUnmounted(() => window.removeEventListener('mousemove', onMouseMove))
})
</script>

<template>
  <BaseLayout :title="SITE.title" :description="SITE.description">
    <div class="ambient-glow" aria-hidden="true">
      <span class="glow-a"><i ref="coreA" class="glow-core glow-core-a" /></span>
      <span class="glow-b"><i ref="coreB" class="glow-core glow-core-b" /></span>
    </div>

    <section class="hero">
      <div class="hero-heading">
        <img
          src="/avatar.png"
          :alt="SITE.author"
          width="44"
          height="44"
          class="hero-avatar"
          loading="eager"
          decoding="async"
        >
        <h1>{{ SITE.title }}<span class="hero-cursor" aria-hidden="true">_</span></h1>
      </div>
      <p class="text-text-soft">
        {{ SITE.description }}
      </p>
    </section>

    <nav
      v-if="tags?.length"
      aria-label="标签导航"
      class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-mute font-mono"
    >
      <TagLink v-for="tag in tags" :key="tag" :tag="tag" />
    </nav>

    <section class="mt-2">
      <p v-if="!posts?.length" class="py-8 text-text-mute">
        还没有文章。
      </p>
      <PostCard v-for="post in posts" v-else :key="post.path" :post="post" />
    </section>
  </BaseLayout>
</template>

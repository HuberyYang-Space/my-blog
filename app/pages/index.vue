<script setup lang="ts">
import { animate } from 'motion'
import { SITE } from '~/config'

// 全站唯一一次 defineOgImage:模块按路由生成图片,在 BaseLayout 里调用会让每条
// 路由都产出一张字节相同的 PNG(文章越多冗余越大),而模块没有"全站单图"开关。
// 只在根路由调用 → 只产出一个文件,且文件名不带路由段(见 SITE.ogImage 的说明)。
// 其余页面的 og:image 由 BaseLayout 指向同一个 URL。
defineOgImage('Hubery.browser')

const { data: posts } = await useAsyncData('posts', () => getPublishedPosts())

// 标签直接从上面这份数据算。复用的是纯函数 groupPostsByTag(排序规则与标签归档页
// 同一套:文章数倒序、同数按标签名排序),而不是取数函数 getPostsGroupedByTag() ——
// 后者内部会再查一遍全站文章并重新排序,只为了取一列标签名。
const tags = computed(() => groupPostsByTag(posts.value ?? []).map(group => group.tag))

// 氛围光背景的鼠标视差。
// .glow-core 的自动漂移(外层 transform)、呼吸缩放(scale)与这里的视差
// transform 分属不同节点/属性,互不覆盖,详见本文件 <style> 块顶部的说明。
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
      v-if="tags.length"
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

<style>
/* ==========================================================================
   首页:全站常驻氛围光背景
   position: fixed 让光斑相对视口铺满,不受内容列 max-w-2xl 窄栏的宽度限制,
   也不需要 100vw 破框 hack——不会有滚动条宽度引发横向滚动条的风险。
   只需祖先节点(BaseLayout/Header)都没有 transform/filter/perspective/contain,
   fixed 定位就会一直相对浏览器视口本身,已核对过没有这类属性。

   每个光斑拆成两层节点:
   - 外层(.glow-a/.glow-b)只负责自动漂移的位置(transform: translate 关键帧)
   - 内层(.glow-core)负责实际视觉(渐变+模糊)+ 呼吸缩放(scale 关键帧)+
     首页脚本驱动的鼠标视差(直接写 transform)
   三者分别落在 transform / scale / filter 等不同 CSS 属性或不同节点上,
   不会互相覆盖。呼吸用独立的 scale 属性(CSS Transforms Level 2)而不是
   transform: scale(),这样才能和视差脚本写入的 transform 位移共存。

   两个圆各自走独立的多点闭环路径("视差漂浮"),百分比停靠点、时长、相位都
   刻意错开,避免看起来像 from/to 两点式的直线来回("乒乓")那样机械。
   ========================================================================== */

.ambient-glow {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.hero {
  padding: 2rem 0;
}

.hero-heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hero-avatar {
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--c-border);
}

.hero h1 {
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero p {
  margin-top: 0.75rem;
  font-size: 1.05rem;
}

.hero-cursor {
  display: inline-block;
  margin-left: 0.05em;
  font-weight: 300;
  animation: hero-cursor-breathe 1.5s ease-in-out infinite;
}

@keyframes hero-cursor-breathe {
  0%,
  100% {
    opacity: 0;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-cursor {
    animation: none;
    opacity: 1;
  }
}

.glow-a,
.glow-b {
  position: absolute;
  border-radius: 50%;
}

.glow-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  animation: glow-breathe 11s ease-in-out infinite;
}

/* 右上角,冷色调 —— 刻意避开左上角的 <h1> 标题,窄屏下内容列几乎顶到视口边缘,
   光斑堆在标题背后会拉低文字对比度。 */
.glow-a {
  top: -14rem;
  right: -10rem;
  width: 34rem;
  height: 34rem;
  animation: ambient-drift-a 24s ease-in-out infinite;
}

/* 左下角,暖色调,与 glow-a 对角分布 */
.glow-b {
  bottom: -16rem;
  left: -12rem;
  width: 32rem;
  height: 32rem;
  animation: ambient-drift-b 30s ease-in-out infinite;
  animation-delay: -12s;
}

.glow-core-a {
  background: radial-gradient(circle, rgb(var(--c-glow-1) / var(--c-glow-alpha-1)), transparent 70%);
  filter: blur(90px);
}

.glow-core-b {
  background: radial-gradient(circle, rgb(var(--c-glow-2) / var(--c-glow-alpha-2)), transparent 70%);
  /* 11s 呼吸周期的一半,让两个光斑的呼吸相位彻底错开 */
  animation-delay: -5.5s;
  filter: blur(100px);
}

@keyframes glow-breathe {
  0%,
  100% {
    scale: 1;
    opacity: 0.5;
  }

  50% {
    scale: 1.22;
    opacity: 1;
  }
}

@keyframes ambient-drift-a {
  0%,
  100% {
    transform: translate(0, 0);
  }

  22% {
    transform: translate(-6rem, 4rem);
  }

  48% {
    transform: translate(-9rem, -3rem);
  }

  74% {
    transform: translate(-2.5rem, -7.5rem);
  }
}

@keyframes ambient-drift-b {
  0%,
  100% {
    transform: translate(0, 0);
  }

  28% {
    transform: translate(7rem, -5rem);
  }

  56% {
    transform: translate(2.5rem, 6.5rem);
  }

  82% {
    transform: translate(-4rem, 2.5rem);
  }
}
</style>

<script setup lang="ts">
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

// 氛围光背景的逐帧驱动。
// 轨迹本身是纯函数(app/utils/ambient-glow.ts),这里只负责把结果写进 transform。
//
// 游走位移与鼠标视差合成同一个 transform 写在外层节点上,内层 .glow-core 的
// 呼吸走独立的 scale 属性 —— 两者落在不同节点/不同 CSS 属性上,不会互相覆盖。
const orbA = ref<HTMLElement>()
const orbB = ref<HTMLElement>()

/** 每个光斑的视差强度(px)与方向,数值差异营造出前后景的深度感 */
const PARALLAX_DEPTH = [34, -20]

onMounted(() => {
  const orbs = [orbA.value, orbB.value].filter((el): el is HTMLElement => Boolean(el))
  if (orbs.length === 0)
    return

  function render(seconds: number, parallax: { x: number, y: number }[]) {
    const { innerWidth: w, innerHeight: h } = window

    orbs.forEach((orb, index) => {
      const drift = glowOffset(index, seconds, w, h)
      const shift = parallax[index]!
      orb.style.transform = `translate(${drift.x + shift.x}px, ${drift.y + shift.y}px)`
    })
  }

  const rest = orbs.map(() => ({ x: 0, y: 0 }))
  // 先摆好 t = 0 这一帧再决定要不要动起来。少了这句,减弱动效的访客会看到
  // 两个光斑严丝合缝地叠在视口正中 —— 那是这套参数下最难看的一帧。
  render(0, rest)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return

  // 视差的目标值由 mousemove 写入,当前值每帧向它逼近。直接赋值的话鼠标一停
  // 背景跟着骤停,读起来是"跟随光标",不是"氛围"。
  let targetX = 0
  let targetY = 0
  const parallax = rest

  function onMouseMove(event: MouseEvent) {
    targetX = event.clientX / window.innerWidth - 0.5
    targetY = event.clientY / window.innerHeight - 0.5
  }

  let frame = 0
  let last = 0
  let elapsed = 0

  function tick(now: number) {
    // 单帧最多记 50ms:标签页切走时 rAF 本就暂停,但切回来的第一帧 now 会跨过
    // 整段离开时间,不夹住的话光斑会瞬移到几十秒后的位置。
    const dt = last ? Math.min(now - last, 50) : 16
    last = now
    elapsed += dt

    parallax.forEach((shift, index) => {
      const depth = PARALLAX_DEPTH[index] ?? 24
      shift.x = approach(shift.x, targetX * depth, dt, 3)
      shift.y = approach(shift.y, targetY * depth, dt, 3)
    })

    render(elapsed / 1000, parallax)
    frame = requestAnimationFrame(tick)
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  frame = requestAnimationFrame(tick)

  // 客户端路由离开首页时停机,避免其他页面继续跑逐帧计算
  onUnmounted(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('mousemove', onMouseMove)
  })
})
</script>

<template>
  <BaseLayout :title="SITE.title" :description="SITE.description">
    <div class="ambient-glow" aria-hidden="true">
      <span ref="orbA" class="glow-orb glow-orb-a"><i class="glow-core glow-core-a" /></span>
      <span ref="orbB" class="glow-orb glow-orb-b"><i class="glow-core glow-core-b" /></span>
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
        <HeroTitle :text="SITE.title">
          <span class="hero-cursor" aria-hidden="true">_</span>
        </HeroTitle>
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
   - 外层(.glow-orb)承载脚本每帧写入的位置(游走轨迹 + 鼠标视差,合成一个 transform)
   - 内层(.glow-core)负责实际视觉(渐变+模糊)与呼吸缩放
   呼吸用独立的 scale 属性(CSS Transforms Level 2)而不是 transform: scale(),
   这样即便日后挪到同一个节点上也不会和脚本写入的位移打架。

   光斑锚在视口正中、靠 transform 位移铺开,而不是钉在四角:轨迹按视口尺寸
   等比缩放(见 ambient-glow.ts 的 AMPLITUDE_RATIO),钉在角上的话位移量与
   视口无关,窄屏上会整个甩出屏幕,表现为背景时有时无。
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

  /* 游走那半由脚本自己判断(见 onMounted),这里只停呼吸 */
  .glow-core {
    animation: none;
  }
}

.glow-orb {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--glow-size);
  height: var(--glow-size);
  margin-left: calc(var(--glow-size) / -2);
  margin-top: calc(var(--glow-size) / -2);
  border-radius: 50%;
}

/* 尺寸随视口收缩(而非固定 rem):手机上一个 34rem 的圆比视口还宽,
   叠加游走后整块屏幕都会被同一片颜色糊住。 */
.glow-orb-a {
  --glow-size: clamp(19rem, 46vw, 36rem);
}

.glow-orb-b {
  --glow-size: clamp(17rem, 42vw, 33rem);
}

.glow-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  animation: glow-breathe 3.8s ease-in-out infinite;
}

/* 冷色调 */
.glow-core-a {
  background: radial-gradient(circle, rgb(var(--c-glow-1) / var(--c-glow-alpha-1)), transparent 70%);
  /* 模糊半径要明显小于游走的总幅度,否则位移会被羽化抹平:两者同量级时,
     光斑挪动的那点距离全落在自己的虚边里,看起来就是一动不动。游走幅度已是
     视口尺度(约 1000px 跨度),七十几像素绰绰有余。

     反向的约束是对比度:光斑现在会从正文底下经过,模糊越小峰值浓度越高,
     直接换成正文可读性的损失 —— 详见本次改动记录的对比度实测。 */
  filter: blur(72px);
}

/* 暖色调 */
.glow-core-b {
  background: radial-gradient(circle, rgb(var(--c-glow-2) / var(--c-glow-alpha-2)), transparent 70%);
  /* 呼吸周期的一半,让两个光斑的呼吸相位彻底错开 */
  animation-delay: -1.9s;
  filter: blur(82px);
}

@keyframes glow-breathe {
  0%,
  100% {
    scale: 0.92;
    opacity: 0.55;
  }

  50% {
    scale: 1.2;
    opacity: 1;
  }
}
</style>

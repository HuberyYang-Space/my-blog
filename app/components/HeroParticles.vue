<script setup lang="ts">
import type { Particle, TrailPoint } from '~/utils/hero-particles'
/**
 * 方案一:Canvas 2D 粒子文本(零依赖)
 *
 * 离屏 canvas 用页面真实字体画一遍标题,按 alpha 采样成粒子,鼠标轨迹把粒子推开、
 * 松手后 spring 归位。计算全在 `app/utils/hero-particles.ts`,这里只负责取像素、
 * 逐帧积分和绘制。
 *
 * ## 真文本一直在 DOM 里
 *
 * <h1> 始终渲染真实文字,效果启用后只是把它涂成透明 —— 它仍然撑开布局(所以
 * 没有 CLS)、仍然能被选中和朗读、仍然出现在 `nuxt generate` 的静态产物里。
 * canvas 是盖在上面的一层装饰,`aria-hidden`。效果没启用(SSR、偏好减弱动效、
 * 无指针设备)时文字原样显示,不需要任何降级分支。
 *
 * ## 粒子密度与 DPR 无关
 *
 * 采样步长按 dpr 放大(`STEP_CSS * dpr`),否则 2x 屏的粒子数是 1x 屏的四倍 ——
 * 高分屏上白白多算三倍的力,而视觉密度看起来还一样。
 */
import { approach } from '~/utils/animation'
import { decayTrail, particleTarget, sampleTextParticles, trailForceAt } from '~/utils/hero-particles'

const props = defineProps<{ text: string }>()

/** 粒子被推开后会飞出文字外框,canvas 四周留出余量,否则边缘的粒子被裁掉 */
const PAD_CSS = 48
/** CSS 像素下的采样步长。2 是密度与逐帧成本的折中,再密下去 60fps 保不住 */
const STEP_CSS = 2
/** 3x 屏再往上翻的收益肉眼看不出,只换来成倍的绘制成本 */
const MAX_DPR = 2
const ALPHA_THRESHOLD = 128

/** 斥力作用半径(CSS 像素) */
const FORCE_RADIUS_CSS = 130
const FORCE_STRENGTH = 8200
/**
 * 归位弹簧的劲度与阻尼。
 *
 * 阻尼比 ζ = DAMPING / (2√SPRING) ≈ 0.9,刻意贴近临界阻尼(ζ = 1)但不到 ——
 * 再低会过冲、粒子归位时来回荡两下,那是"弹"不是"顺";到了临界就完全没有余韵,
 * 停得太干脆反而显得僵。0.9 是既不抖也不僵的那一档。
 */
const SPRING = 70
const DAMPING = 15
/** 鼠标轨迹的半衰期(毫秒) */
const TRAIL_HALF_LIFE = 110

/** 静止微飘的振幅(CSS 像素)。只要能看出"活着"就够,大了会变成噪点在跳 */
const IDLE_AMPLITUDE_CSS = 1.8
/** 完全发散时粒子推离归位点的距离(CSS 像素) */
const SCATTER_DISTANCE_CSS = 22
/** 鼠标进入判定的外扩距离:超出文字外框这么远就开始预热发散,不是压线才触发 */
const ENTER_RADIUS_CSS = 150
/** 发散/合拢的收敛速度。合拢比发散慢一档,散得利落、收得从容 */
const DISPERSE_SPEED = 4.5
const GATHER_SPEED = 2.6
/** 掉帧时 dt 会突然变大,不夹住的话弹簧积分会直接发散、粒子飞出屏幕再也回不来 */
const MAX_DT = 1 / 30

const root = ref<HTMLElement>()
const textEl = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
/** 效果是否真的接管了显示 —— 决定 <h1> 要不要涂成透明 */
const active = ref(false)

onMounted(() => {
  const rootEl = root.value
  const text = textEl.value
  const cvs = canvas.value
  if (!rootEl || !text || !cvs)
    return

  // 偏好减弱动效、或没有真正的指针设备(触屏)时不启用:前者是无障碍要求,
  // 后者是因为整个效果由鼠标轨迹驱动,没有指针时它只是一张静止的点阵图,
  // 不如直接显示文字。
  const media = window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)')
  if (media.matches)
    return

  const ctx = cvs.getContext('2d')
  if (!ctx)
    return

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  let particles: Particle[] = []
  let trail: TrailPoint[] = []
  /** 0 = 完全合拢,1 = 完全散开 */
  let dispersion = 0
  let dispersionTarget = 0
  /** 累计时长(秒),只喂给微飘的正弦 */
  let elapsed = 0
  let image: ImageData | undefined
  let color: [number, number, number] = [0, 0, 0]
  /** 粒子点的边长(物理像素),让点在高分屏上不至于细成一根发丝 */
  const dotSize = Math.max(1, Math.round(dpr))

  /** 从 <h1> 的计算样式里取字体与颜色 —— 字号是 clamp() 的响应式值,不能写死 */
  function readTextStyle() {
    const cs = getComputedStyle(text!)
    const match = cs.color.match(/\d+/g)
    color = match ? [Number(match[0]), Number(match[1]), Number(match[2])] : [0, 0, 0]
    return `${cs.fontWeight} ${Number.parseFloat(cs.fontSize) * dpr}px ${cs.fontFamily}`
  }

  /** 重新量尺寸、重画文字、重新采样。字号变化(窗口缩放)或主题切换后都要跑一遍 */
  function rebuild() {
    const rect = text!.getBoundingClientRect()
    if (rect.width === 0)
      return

    const cssW = rect.width + PAD_CSS * 2
    const cssH = rect.height + PAD_CSS * 2
    const w = Math.round(cssW * dpr)
    const h = Math.round(cssH * dpr)

    cvs!.width = w
    cvs!.height = h
    cvs!.style.width = `${cssW}px`
    cvs!.style.height = `${cssH}px`

    const font = readTextStyle()

    // 离屏画一遍文字,只为拿它的 alpha 通道当采样模板
    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const octx = offscreen.getContext('2d')
    if (!octx)
      return

    octx.font = font
    octx.textBaseline = 'middle'
    octx.fillStyle = '#fff'
    octx.fillText(props.text, PAD_CSS * dpr, h / 2)

    const sampled = sampleTextParticles(
      octx.getImageData(0, 0, w, h).data,
      w,
      h,
      { step: STEP_CSS * dpr, alphaThreshold: ALPHA_THRESHOLD },
    )

    // 尺寸没变时保留粒子当前的位置与速度,避免窗口缩放/主题切换时整片粒子瞬间闪回原位
    if (particles.length !== sampled.length) {
      particles = sampled
    }
    else {
      particles.forEach((p, i) => {
        p.homeX = sampled[i]!.homeX
        p.homeY = sampled[i]!.homeY
      })
    }

    image = ctx!.createImageData(w, h)
    active.value = true
  }

  rebuild()
  if (!active.value)
    return

  // ── 鼠标轨迹 ──────────────────────────────────────────────────────────
  // 只在 canvas 覆盖范围附近记录,页面其他地方的移动不需要参与计算
  let pendingPoint: { x: number, y: number } | undefined

  function onMouseMove(event: MouseEvent) {
    const rect = cvs!.getBoundingClientRect()
    pendingPoint = {
      x: (event.clientX - rect.left) * dpr,
      y: (event.clientY - rect.top) * dpr,
    }

    // 鼠标到文字外框的最短距离。用距离渐变而不是 mouseenter/mouseleave 事件:
    // 后者是个开关,鼠标一压线整片粒子突然开始散,那一下的突兀正是要避免的东西。
    // 距离衰减让"靠近"这件事本身就是过程 —— 人还没到,字已经有反应了。
    const outX = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right)
    const outY = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom)
    const distance = Math.hypot(outX, outY)
    dispersionTarget = Math.max(0, 1 - distance / ENTER_RADIUS_CSS)
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  // ── 逐帧 ─────────────────────────────────────────────────────────────
  let raf = 0
  let last = performance.now()

  function frame(now: number) {
    const dtMs = now - last
    last = now
    const dt = Math.min(dtMs / 1000, MAX_DT)
    elapsed += dt

    trail = decayTrail(trail, dtMs, TRAIL_HALF_LIFE)
    if (pendingPoint) {
      trail.push({ ...pendingPoint, weight: 1 })
      pendingPoint = undefined
    }

    dispersion = approach(
      dispersion,
      dispersionTarget,
      dtMs,
      dispersionTarget > dispersion ? DISPERSE_SPEED : GATHER_SPEED,
    )

    const radius = FORCE_RADIUS_CSS * dpr
    const targetOpts = {
      idleAmplitude: IDLE_AMPLITUDE_CSS * dpr,
      scatterDistance: SCATTER_DISTANCE_CSS * dpr,
    }

    for (const p of particles) {
      const { tx, ty } = particleTarget(p, dispersion, elapsed, targetOpts)
      const { fx, fy } = trailForceAt(p.x, p.y, trail, { radius, strength: FORCE_STRENGTH })
      p.vx += (fx + (tx - p.x) * SPRING - p.vx * DAMPING) * dt
      p.vy += (fy + (ty - p.y) * SPRING - p.vy * DAMPING) * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }

    draw()
    raf = requestAnimationFrame(frame)
  }

  function draw() {
    if (!image)
      return

    const { data } = image
    const w = cvs!.width
    const h = cvs!.height
    const [r, g, b] = color
    // 散开时整体略微化淡,聚拢时回到实心 —— 密度变稀的同时亮度不变的话,
    // 散开看起来只是"点变少了",而不是"化开了"
    const alpha = Math.round(255 - dispersion * 60)
    data.fill(0)

    for (const p of particles) {
      const px = Math.round(p.x)
      const py = Math.round(p.y)

      for (let oy = 0; oy < dotSize; oy++) {
        const y = py + oy
        if (y < 0 || y >= h)
          continue

        for (let ox = 0; ox < dotSize; ox++) {
          const x = px + ox
          if (x < 0 || x >= w)
            continue

          const i = (y * w + x) * 4
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = alpha
        }
      }
    }

    ctx!.putImageData(image, 0, 0)
  }

  raf = requestAnimationFrame(frame)

  // 字号是 clamp() 的响应式值,窗口宽度一变文字尺寸就变,必须重新采样
  const resizeObserver = new ResizeObserver(() => rebuild())
  resizeObserver.observe(text)

  // 主题切换只改颜色不改轮廓,但颜色是从计算样式里读的,得跟着更新
  const themeObserver = new MutationObserver(() => readTextStyle())
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  onUnmounted(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('mousemove', onMouseMove)
    resizeObserver.disconnect()
    themeObserver.disconnect()
  })
})
</script>

<template>
  <div ref="root" class="hero-particles" :class="{ 'is-active': active }">
    <h1 ref="textEl" class="hero-particles-text">
      {{ props.text }}
    </h1>
    <canvas ref="canvas" aria-hidden="true" />
  </div>
</template>

<style>
.hero-particles {
  position: relative;
  display: inline-block;
}

.hero-particles-text {
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* 效果接管后把文字涂成透明而不是移除:它还要继续撑开布局、继续能被选中和朗读。
   用 color 而非 opacity,是为了让框选时仍能看到选区高亮。 */
.hero-particles.is-active .hero-particles-text {
  color: transparent;
}

.hero-particles canvas {
  position: absolute;
  top: -48px;
  left: -48px;
  pointer-events: none;
}
</style>

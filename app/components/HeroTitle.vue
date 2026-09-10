<script setup lang="ts">
/**
 * 首页标题的液态交互效果。
 *
 * 把标题画进一张纹理,再用 ogl 的 Flowmap 把鼠标轨迹累积成一张速度图,
 * fragment shader 按速度去偏移采样坐标 —— 鼠标划过的地方文字被"推"着流动,
 * 划得越快,RGB 三通道分离得越开(色差),像隔着一层被搅动的水看字。
 *
 * ## Flowmap 的三个通道
 *
 * R/G 存 xy 方向的速度,B 存速度长度。位移吃 R/G,色差强度吃 B ——
 * 慢慢移只有形变没有色散,快速划才炸开,这是"液体"和"果冻"的区别。
 *
 * ## 为什么纹理只用 alpha 通道
 *
 * 离屏 canvas 上画的是白字,真正的颜色在 shader 里用 uColor 现填。
 * 这样主题切换只需要改一个 uniform,不必重画纹理 —— 而重画纹理意味着
 * 重新上传一张贴图,切主题时会看到一帧闪烁。
 *
 * ## 默认插槽不进纹理
 *
 * 纹理只画 `text`,插槽里的东西(首页那个闪烁光标 `_`)留在 DOM 里照常渲染。
 * 把它也画进纹理的话,纹理是每次重建才更新的静态贴图,光标的闪烁当场就没了 ——
 * 它会变成一根定在那里不动的下划线。
 *
 * ## 效果没启用时不需要任何降级分支
 *
 * <h1> 始终渲染真实文字,启用后只是把它涂成透明:它仍然撑开布局(所以没有 CLS)、
 * 仍然能被选中和朗读、仍然出现在静态产物里。偏好减弱动效、无指针设备、
 * WebGL 不可用这三种情况一律直接返回,文字原样显示。
 */
import { Flowmap, Mesh, Program, Renderer, Texture, Triangle, Vec2 } from 'ogl'
import { approach } from '~/utils/animation'

const props = defineProps<{ text: string }>()

const PAD_CSS = 48
const MAX_DPR = 2
/** 位移强度。再大就不像"流动"而像"撕裂"了 */
const FLOW_STRENGTH = 0.075
/** 色差强度,乘在 flowmap 的 B 通道(速度长度)上 */
const CHROMA_STRENGTH = 0.04
/** 静止时表面微流的振幅(uv 单位)。极小,只为让水面不是一块死的玻璃 */
const IDLE_STRENGTH = 0.0016
/** 鼠标进入判定的外扩距离(CSS 像素)。不是压线才触发,靠近的过程本身就有反应 */
const ENTER_RADIUS_CSS = 150
/** 液化程度的收敛速度。醒得快、静得慢 —— 反过来会显得黏 */
const WAKE_SPEED = 4.5
const CALM_SPEED = 2.4

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;

  uniform sampler2D tMap;
  uniform sampler2D tFlow;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uStrength;
  uniform float uChroma;
  uniform float uIdle;
  uniform float uTime;
  uniform float uHover;

  varying vec2 vUv;

  void main() {
    vec3 flow = texture2D(tFlow, vUv).rgb;

    // 静止时的表面微流:两组不同频率的波叠加,周期互质所以看不出重复。
    // 没有这一层的话,鼠标一停整个画面就彻底冻住 —— 那不像水,像冰。
    vec2 idle = vec2(
      sin(uTime * 0.61 + vUv.y * 9.0) + sin(uTime * 0.43 + vUv.x * 5.0),
      cos(uTime * 0.53 + vUv.x * 7.0) + cos(uTime * 0.37 + vUv.y * 4.0)
    ) * uIdle;

    // 鼠标不在附近时也保留一半的响应力度,免得靠近的瞬间强度突然翻倍
    vec2 offset = flow.xy * uStrength * (0.5 + uHover * 0.5) + idle;
    float chroma = flow.b * uChroma;

    // 三个通道各偏一点,速度越快(chroma 越大)分得越开
    float r = texture2D(tMap, vUv - offset - vec2(chroma, 0.0)).a;
    float g = texture2D(tMap, vUv - offset * 1.12).a;
    float b = texture2D(tMap, vUv - offset * 1.24 + vec2(chroma, 0.0)).a;

    float alpha = (r + g + b) / 3.0;
    if (alpha < 0.003) discard;

    // 划得快的地方染上站点主色,当水面的高光。
    // 不用"提亮"做高光:亮色主题下文字本来就是深色压在浅底上,提亮等于变淡,
    // 看起来是字糊了而不是有光。换成往主色偏,深浅两个主题下都成立。
    float speed = clamp(flow.b * 1.2, 0.0, 1.0);
    vec3 base = mix(uColor, uAccent, speed * uHover * 0.75);

    // 三通道相对平均值的偏差就是彩色边缘,叠回基础色上
    vec3 fringe = vec3(r, g, b) - vec3(alpha);
    gl_FragColor = vec4(base + fringe * 1.6, alpha);
  }
`

const root = ref<HTMLElement>()
const textEl = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const active = ref(false)

onMounted(() => {
  const rootEl = root.value
  const text = textEl.value
  const cvs = canvas.value
  if (!rootEl || !text || !cvs)
    return

  const media = window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)')
  if (media.matches)
    return

  /**
   * 设备像素比。**每次重建都要重新取**,不能在挂载时定死 ——
   * 窗口在不同 DPI 的显示器之间移动时它会变,沿用旧值画布分辨率就对不上屏幕,字发虚。
   */
  const currentDpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR)
  let dpr = currentDpr()

  let renderer: Renderer
  try {
    renderer = new Renderer({ canvas: cvs, dpr, alpha: true })
  }
  catch {
    // WebGL 不可用(老设备、禁用了硬件加速)时保持文字原样显示
    return
  }

  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 0)

  // dissipation 越接近 1 消散越慢。0.96 而不是 0.94:笔触多留一会儿,
  // 划过之后水面还在晃 —— 余韵短了整个效果会显得"一碰就弹回去",很硬
  const flowmap = new Flowmap(gl, { falloff: 0.32, alpha: 0.6, dissipation: 0.96 })
  const texture = new Texture(gl)
  const uColor = { value: [0, 0, 0] as [number, number, number] }
  const uAccent = { value: [0, 0, 0] as [number, number, number] }
  const uTime = { value: 0 }
  const uHover = { value: 0 }

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      tMap: { value: texture },
      tFlow: flowmap.uniform,
      uColor,
      uAccent,
      uTime,
      uHover,
      uStrength: { value: FLOW_STRENGTH },
      uChroma: { value: CHROMA_STRENGTH },
      uIdle: { value: IDLE_STRENGTH },
    },
    transparent: true,
  })
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

  /**
   * 读站点主色当高光色。
   *
   * 从 --c-primary 取而不是写死一个好看的青:主题切换时它会跟着变,
   * 而且将来调整站点主色时这里自动跟上,不会留下一处对不上的孤色。
   */
  function readAccent(): [number, number, number] {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim()
    const hex = raw.replace('#', '')
    if (hex.length !== 6)
      return uColor.value

    return [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ]
  }

  /** 把标题画成一张白字透明底的贴图,颜色留给 shader 填 */
  function buildTexture() {
    const rect = text!.getBoundingClientRect()
    if (rect.width === 0)
      return false

    dpr = currentDpr()
    renderer.dpr = dpr

    const cssW = rect.width + PAD_CSS * 2
    const cssH = rect.height + PAD_CSS * 2
    const w = Math.round(cssW * dpr)
    const h = Math.round(cssH * dpr)

    cvs!.style.width = `${cssW}px`
    cvs!.style.height = `${cssH}px`
    // 文字是 h1 里的一个 inline 元素(后面还跟着插槽内容),它的左上角未必等于
    // 容器的左上角,所以画布位置按实际量到的偏移算,不能写死成负的内边距
    const rootRect = rootEl!.getBoundingClientRect()
    cvs!.style.left = `${rect.left - rootRect.left - PAD_CSS}px`
    cvs!.style.top = `${rect.top - rootRect.top - PAD_CSS}px`
    renderer.setSize(cssW, cssH)
    flowmap.aspect = cssW / cssH

    const cs = getComputedStyle(text!)

    // 颜色从**父元素**读,不能从文字自己身上读:效果接管后 .hero-title-word 被涂成
    // transparent,从它读到的是 rgba(0, 0, 0, 0),解析出来就是纯黑。首次构建发生在
    // 涂透明之前所以看着正常,而切换主题会触发重建 —— 那一下字就变黑了,
    // 暗色主题下深底黑字几乎等于消失,且不报错。
    const colorSource = text!.parentElement ?? text!
    const match = getComputedStyle(colorSource).color.match(/\d+/g)
    uColor.value = match
      ? [Number(match[0]) / 255, Number(match[1]) / 255, Number(match[2]) / 255]
      : [0, 0, 0]
    uAccent.value = readAccent()

    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const octx = offscreen.getContext('2d')
    if (!octx)
      return false

    octx.font = `${cs.fontWeight} ${Number.parseFloat(cs.fontSize) * dpr}px ${cs.fontFamily}`
    // letter-spacing 不在 font 简写里,必须单独设。标题上有 -0.02em 的收紧,
    // 不同步过来的话画出的字比 DOM 那份宽出几个像素 —— 画布宽度是按 DOM 文字量的,
    // 于是紧跟在后面的光标会压到最后一个字母上。乘 dpr 是因为纹理里的字号也放大了同样的倍数。
    const spacing = Number.parseFloat(cs.letterSpacing)
    if (Number.isFinite(spacing))
      octx.letterSpacing = `${spacing * dpr}px`
    octx.fillStyle = '#fff'

    // 用基线定位,不用 textBaseline: 'middle'。
    //
    // 'middle' 对齐的是 em 方块的中点,而字体的 ascent 与 descent 对那个中点并不对称
    // (实测这套系统字体是 54 : 12)。把它摆在文字外框的垂直中心,画出来的字就会整体
    // 上移三四个像素 —— 距离不大,但和底下那份 DOM 文字错开,肉眼看得出来。
    //
    // fontBoundingBoxAscent 是字体的 ascent,浏览器算 inline 元素外框顶部用的是同一个量,
    // 所以「外框顶部往下 ascent」正是 DOM 那份文字的基线所在,两者由此重合。
    const ascent = octx.measureText(props.text).fontBoundingBoxAscent
    if (Number.isFinite(ascent)) {
      octx.textBaseline = 'alphabetic'
      octx.fillText(props.text, PAD_CSS * dpr, PAD_CSS * dpr + ascent)
    }
    else {
      // 拿不到字体度量的老浏览器退回中线对齐:偏几个像素,总好过不画
      octx.textBaseline = 'middle'
      octx.fillText(props.text, PAD_CSS * dpr, h / 2)
    }

    texture.image = offscreen
    texture.needsUpdate = true
    return true
  }

  if (!buildTexture())
    return

  active.value = true

  // ── 鼠标 ─────────────────────────────────────────────────────────────
  const mouse = new Vec2(-1, -1)
  const velocity = new Vec2()
  let lastX = 0
  let lastY = 0
  let lastTime = 0
  let hoverTarget = 0
  let frameTime = 0

  function onMouseMove(event: MouseEvent) {
    const rect = cvs!.getBoundingClientRect()
    // uv 的原点在左下,clientY 向下增长,所以 y 要翻过来
    const x = (event.clientX - rect.left) / rect.width
    const y = 1 - (event.clientY - rect.top) / rect.height

    const now = performance.now()
    if (lastTime) {
      const dt = Math.max(now - lastTime, 14)
      velocity.set(((x - lastX) / dt) * 1000, ((y - lastY) / dt) * 1000)
    }

    mouse.set(x, y)
    lastX = x
    lastY = y
    lastTime = now

    // 用"鼠标到文字外框的最短距离"而不是 mouseenter/mouseleave:事件是个开关,
    // 鼠标一压线整块字突然开始流动,那一下的突兀正是要避免的东西
    const outX = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right)
    const outY = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom)
    hoverTarget = Math.max(0, 1 - Math.hypot(outX, outY) / ENTER_RADIUS_CSS)
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  let raf = 0
  let lastFrame = performance.now()

  function frame(now: number) {
    const dtMs = now - lastFrame
    lastFrame = now
    frameTime += dtMs / 1000
    uTime.value = frameTime

    uHover.value = approach(
      uHover.value,
      hoverTarget,
      dtMs,
      hoverTarget > uHover.value ? WAKE_SPEED : CALM_SPEED,
    )

    // 速度不衰减的话,鼠标停下后 flowmap 会一直按最后那一下的速度盖章,
    // 水面永远停不下来
    velocity.x *= 0.92
    velocity.y *= 0.92

    flowmap.mouse.copy(mouse)
    // 插值系数比 0.15 再低一档:盖章的速度变化更缓,笔触之间过渡得更连
    flowmap.velocity.x += (velocity.x - flowmap.velocity.x) * 0.12
    flowmap.velocity.y += (velocity.y - flowmap.velocity.y) * 0.12
    flowmap.update()

    renderer.render({ scene: mesh })
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  // 重量尺寸的触发源有两个,共用一个按帧合并的入口 —— 同一次窗口拖动会连着来几十下,
  // 每下都重画一张贴图并重新上传纹理的话,拖动过程会明显卡。
  let rebuildPending = false
  function scheduleRebuild() {
    if (rebuildPending)
      return
    rebuildPending = true
    requestAnimationFrame(() => {
      rebuildPending = false
      buildTexture()
    })
  }

  // 触发源一:窗口尺寸。标题字号是 clamp(..., 5vw, ...),唯一的变量就是视口宽度,
  // 所以 resize 是最直接的信号,也不受下面那条的语义限制影响。
  window.addEventListener('resize', scheduleRebuild, { passive: true })

  // 触发源二:元素自身尺寸,用于非窗口原因的变化(容器布局改变等)。
  // 观察 <h1> 而不是里面那个 <span> —— ResizeObserver 规范明确跳过 display: inline
  // 的非替换元素(它们没有定义 content box),挂在 span 上等于没挂。
  const resizeObserver = new ResizeObserver(scheduleRebuild)
  resizeObserver.observe(text.parentElement ?? text)

  // devicePixelRatio 没有专门的变化事件。标准做法是给当前值建一个 media query,
  // 它失配的那一刻就是 dpr 变了;换到新值后要重新建一个,因为 query 钉死在具体数值上。
  let dprQuery: MediaQueryList | undefined
  function onDprChange() {
    scheduleRebuild()
    watchDpr()
  }
  function watchDpr() {
    dprQuery?.removeEventListener('change', onDprChange)
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    dprQuery.addEventListener('change', onDprChange)
  }
  watchDpr()

  const themeObserver = new MutationObserver(() => buildTexture())
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  onUnmounted(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', scheduleRebuild)
    resizeObserver.disconnect()
    themeObserver.disconnect()
    dprQuery?.removeEventListener('change', onDprChange)
  })
})
</script>

<template>
  <div ref="root" class="hero-title" :class="{ 'is-active': active }">
    <!-- span 与插槽之间不留空白,否则渲染出的空格会把光标推开一格 -->
    <h1><span ref="textEl" class="hero-title-word">{{ props.text }}</span><slot /></h1>
    <canvas ref="canvas" aria-hidden="true" />
  </div>
</template>

<style>
.hero-title {
  position: relative;
}

.hero-title h1 {
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* 效果接管后把文字涂成透明而不是移除:它还要继续撑开布局、继续能被选中和朗读。
   只作用于 .hero-title-word,插槽里的光标不受影响 —— 它不在纹理里,涂透明就真没了。
   用 color 而非 opacity,是为了让框选时仍能看到选区高亮。 */
.hero-title.is-active .hero-title-word {
  color: transparent;
}

.hero-title canvas {
  position: absolute;
  /* 具体位置在挂载后按文字的实际偏移算,见 buildTexture */
  pointer-events: none;

  /* reset.css 把 canvas 和 img/video/svg 一起纳入了 max-width: 100%,防的是图片撑破容器。
     但这块画布是**刻意**比容器宽的:文字四周各留了 48px,给流动溢出的部分。不解除的话
     画布被压回容器宽度,而高度不变 —— 纹理横向压扁,字看起来又小又偏左。
     这个失败不报错、HTML 一个字都不变,只有肉眼能发现,所以另有 test/hero-title.test.ts 守着。 */
  max-width: none;
}
</style>

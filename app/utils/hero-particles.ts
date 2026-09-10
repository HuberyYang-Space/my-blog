/**
 * 首页标题粒子化的计算层 —— 纯函数,不碰 canvas 也不碰 DOM。
 *
 * 取像素(离屏 canvas 画字 + getImageData)与逐帧积分留在组件里,采样、衰减、
 * 受力三件事放这里,理由同 `app/utils/search.ts`:边界与方向是最容易写错、
 * 错了又最难一眼看出的部分 —— 斥力方向写反了看起来只是"吸得有点怪",
 * 半径边界差一像素则完全看不出来,只有单测能钉住。
 *
 * ## 为什么鼠标要留一条带权重的轨迹,而不是只用当前坐标
 *
 * 只取当前光标位置的话,粒子只会跟着一个孤点被推开,快速划过时效果是一串
 * 互不相干的抖动。保留一小段带衰减的历史轨迹,推开的是一条**有拖尾的路径**,
 * 快划留下长尾、慢移聚成一团 —— 手感的差别几乎全在这里。
 */

/** 文字轮廓上的一个采样点 */
export interface Particle {
  /** 归位目标,即采样时所在的像素坐标。粒子被推开后靠 spring 拉回这里 */
  homeX: number
  homeY: number
  /**
   * 静止微飘的相位,每个粒子独立。
   *
   * 共用同一个相位的话,整片粒子会同一拍呼吸 —— 那读起来是"整块图在缩放",
   * 不是"一群粒子各自浮着"。
   */
  phase: number
  /**
   * 发散方向,已含该粒子的散开距离系数(约 0.6~1.4 倍)。
   *
   * 距离系数逐粒子不同是为了让散开的边缘是毛的而不是齐的 —— 系数统一的话
   * 整片粒子会保持原来的形状整体放大,像被 zoom,而不像散开。
   */
  scatterX: number
  scatterY: number
  x: number
  y: number
  vx: number
  vy: number
}

/** 鼠标轨迹上的一点。weight 从 1 随时间衰减,归 0 即从队列中移除 */
export interface TrailPoint {
  x: number
  y: number
  weight: number
}

export interface SampleOptions {
  /** 采样步长(像素)。越小粒子越密,同时逐帧的遍历成本越高 */
  step: number
  /** alpha 阈值,低于此值的像素视为空白。取"大于等于"命中 */
  alphaThreshold: number
}

export interface ForceOptions {
  /** 斥力作用半径(像素),超出即完全无影响 */
  radius: number
  /** 斥力强度系数 */
  strength: number
}

/**
 * 轨迹点权重的下限,低于此值即丢弃。
 *
 * 没有这条下限的话,半衰期衰减永远逼近 0 而到不了 0,队列只增不减,
 * 每帧的遍历成本随鼠标移动时长单调上涨 —— 页面开着越久越卡,而且卡得没有由头。
 */
export const MIN_TRAIL_WEIGHT = 0.01

/** 静止微飘的角频率(弧度/秒)。约 12 秒一个来回 —— 再快就不是"飘"而是"抖" */
const IDLE_FREQUENCY = 0.5

/**
 * 由整数索引推出的确定性伪随机数,取值 [0, 1)。
 *
 * 用 hash 而不是 `Math.random()`:采样结果因此可复现,单测能直接断言方向与
 * 相位的具体分布,而不是只能测"大概落在某个范围里"。同一段文字每次刷新
 * 也会得到同一套飘动相位,不会出现"这次刷新特别抖"的随机差异。
 */
function hashUnit(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * 从 RGBA 位图里按步长采出文字轮廓上的粒子。
 *
 * 参数收的是裸 `Uint8ClampedArray` 而不是 `ImageData`:后者是浏览器 API,
 * 单测环境里没有,而这里只需要裸数据 —— 让类型迁就可测性,不是反过来。
 */
export function sampleTextParticles(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  { step, alphaThreshold }: SampleOptions,
): Particle[] {
  const particles: Particle[] = []

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      // RGBA 四通道,alpha 在第四个
      const alpha = data[(y * width + x) * 4 + 3] ?? 0
      if (alpha < alphaThreshold)
        continue

      particles.push({ homeX: x, homeY: y, phase: 0, scatterX: 0, scatterY: 0, x, y, vx: 0, vy: 0 })
    }
  }

  assignDrift(particles)
  return particles
}

/**
 * 给采好的粒子补上飘动相位与发散方向。
 *
 * 方向取"从整体中心指向该粒子",再叠一点随机角度扰动 —— 纯径向的话散开时
 * 每个粒子都沿着自己到中心的连线走,整片看起来像标准的爆炸图示,太规整。
 */
function assignDrift(particles: Particle[]): void {
  if (particles.length === 0)
    return

  // 用外接框中心而不是坐标均值:笔画密的地方(比如竖多的字)会把均值拽过去,
  // 散开时整片粒子于是朝一侧偏,看着像被风吹的
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const p of particles) {
    minX = Math.min(minX, p.homeX)
    maxX = Math.max(maxX, p.homeX)
    minY = Math.min(minY, p.homeY)
    maxY = Math.max(maxY, p.homeY)
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  particles.forEach((p, i) => {
    p.phase = hashUnit(i + 1) * Math.PI * 2

    const dx = p.homeX - cx
    const dy = p.homeY - cy
    const length = Math.hypot(dx, dy)

    // 正好落在中心的粒子(以及只有一个粒子的退化情形)方向没有定义,
    // 归一化会得到 NaN 并顺着速度污染整个系统,给它一个伪随机方向兜住
    const baseAngle = length === 0
      ? hashUnit(i + 101) * Math.PI * 2
      : Math.atan2(dy, dx)

    // ±20°:够打散规整的放射状,又不足以让角落的粒子往回散
    const angle = baseAngle + (hashUnit(i + 7) - 0.5) * 0.7
    const distanceFactor = 0.6 + hashUnit(i + 31) * 0.8

    p.scatterX = Math.cos(angle) * distanceFactor
    p.scatterY = Math.sin(angle) * distanceFactor
  })
}

/**
 * 按半衰期衰减轨迹权重,并丢掉已经弱到无关紧要的点。
 *
 * 用半衰期而不是"每帧乘一个固定系数":后者的衰减速度会随帧率浮动,
 * 120Hz 屏上拖尾消失得比 60Hz 快一倍,同一份参数在不同设备上是两种手感。
 */
export function decayTrail(trail: TrailPoint[], dt: number, halfLife: number): TrailPoint[] {
  const factor = 0.5 ** (dt / halfLife)

  return trail
    .map(point => ({ ...point, weight: point.weight * factor }))
    .filter(point => point.weight >= MIN_TRAIL_WEIGHT)
}

/**
 * 算整条轨迹对某个点的合力。方向背离轨迹点 —— 是推开,不是吸引。
 */
export function trailForceAt(
  x: number,
  y: number,
  trail: TrailPoint[],
  { radius, strength }: ForceOptions,
): { fx: number, fy: number } {
  let fx = 0
  let fy = 0

  for (const point of trail) {
    const dx = x - point.x
    const dy = y - point.y
    const distance = Math.hypot(dx, dy)

    // 距离为 0 时方向没有定义,归一化会得到 NaN,而一个 NaN 会顺着速度污染整个
    // 粒子系统、且此后再也回不来 —— 屏幕上表现为那个粒子凭空消失,不报错。
    // 半径边界取"大于等于"排除,让力在边界处连续地归零,不出现突变。
    if (distance === 0 || distance >= radius)
      continue

    const magnitude = strength * (1 - distance / radius) * point.weight
    fx += (dx / distance) * magnitude
    fy += (dy / distance) * magnitude
  }

  return { fx, fy }
}

export interface TargetOptions {
  /** 静止微飘的振幅(像素) */
  idleAmplitude: number
  /** 完全发散时粒子推离归位点的距离(像素) */
  scatterDistance: number
}

/**
 * 静止时的微飘位移。
 *
 * x 与 y 用不同的频率和相位系数,否则两轴同步,粒子只会沿一条对角线来回滑,
 * 看着像在抖而不是在飘。
 */
export function idleOffset(phase: number, time: number, amplitude: number): { dx: number, dy: number } {
  if (amplitude === 0)
    return { dx: 0, dy: 0 }

  return {
    dx: Math.sin(time * IDLE_FREQUENCY + phase) * amplitude,
    dy: Math.cos(time * IDLE_FREQUENCY * 0.83 + phase * 1.7) * amplitude,
  }
}

/**
 * 算某个粒子此刻应该被拉向哪里 —— 归位点 + 发散偏移 + 微飘。
 *
 * 三者是叠加而不是互斥的:散开的时候粒子也还在飘,否则鼠标一进来整片粒子
 * 就"定住"了再平移过去,那一下的僵硬很显眼。
 */
export function particleTarget(
  particle: Particle,
  dispersion: number,
  time: number,
  { idleAmplitude, scatterDistance }: TargetOptions,
): { tx: number, ty: number } {
  const { dx, dy } = idleOffset(particle.phase, time, idleAmplitude)

  return {
    tx: particle.homeX + particle.scatterX * scatterDistance * dispersion + dx,
    ty: particle.homeY + particle.scatterY * scatterDistance * dispersion + dy,
  }
}

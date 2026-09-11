import { describe, expect, it } from 'vitest'
import { AMBIENT_GLOW_COUNT, glowOffset } from '../app/utils/ambient-glow'

/** 一块常见的桌面视口,下面所有按像素算的断言都以它为基准 */
const W = 1440
const H = 900

/** 在 [from, to] 秒内按 step 采样,返回每个采样点的位移 */
function sample(index: number, from: number, to: number, step: number) {
  const out: { t: number, x: number, y: number }[] = []
  for (let t = from; t <= to; t += step) {
    const { x, y } = glowOffset(index, t, W, H)
    out.push({ t, x, y })
  }
  return out
}

describe('glowOffset', () => {
  it('位移始终在振幅范围内 —— 光斑不会飘到视口外变成"背景没了"', () => {
    for (let index = 0; index < AMBIENT_GLOW_COUNT; index++) {
      for (const { x, y } of sample(index, 0, 300, 0.25)) {
        expect(Math.abs(x)).toBeLessThanOrEqual(W * 0.34)
        expect(Math.abs(y)).toBeLessThanOrEqual(H * 0.34)
      }
    }
  })

  it('同一个 t 与视口必然给出同一个结果', () => {
    expect(glowOffset(0, 12.5, W, H)).toEqual(glowOffset(0, 12.5, W, H))
  })

  it('位移随视口尺寸线性缩放', () => {
    const small = glowOffset(0, 7, W, H)
    const large = glowOffset(0, 7, W * 2, H * 2)
    expect(large.x).toBeCloseTo(small.x * 2, 6)
    expect(large.y).toBeCloseTo(small.y * 2, 6)
  })

  // 两个球若共用相位,会像被同一根绳子牵着平移,看起来只有"一团"在动。
  // 判据是间距本身在大幅变化 —— 而不是某一瞬的间距够不够大:两球被绑死时
  // 间距是个常数,但那个常数完全可以很大,盯着单帧的数值抓不到它。
  it('两个光斑各走各的,间距一直在变', () => {
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (let t = 0; t <= 120; t += 0.25) {
      const a = glowOffset(0, t, W, H)
      const b = glowOffset(1, t, W, H)
      const gap = Math.hypot(a.x - b.x, a.y - b.y)
      min = Math.min(min, gap)
      max = Math.max(max, gap)
    }
    expect(max - min).toBeGreaterThan(400)
  })

  it('相邻帧之间连续,不会跳变', () => {
    for (let index = 0; index < AMBIENT_GLOW_COUNT; index++) {
      let prev = glowOffset(index, 0, W, H)
      for (let t = 1 / 60; t <= 60; t += 1 / 60) {
        const next = glowOffset(index, t, W, H)
        // 单帧位移上限 = 下方峰值速度上限 600px/s ÷ 60fps,再留一点余量
        expect(Math.hypot(next.x - prev.x, next.y - prev.y)).toBeLessThan(12)
        prev = next
      }
    }
  })

  // 本次改动的核心诉求:原实现的瞬时速度只有约 25px/s,叠加 90px 模糊后
  // 肉眼完全看不出在动。速度下限守住"看得见",上限守住"不躁"。
  it('峰值速度落在看得见又不刺眼的区间', () => {
    for (let index = 0; index < AMBIENT_GLOW_COUNT; index++) {
      let peak = 0
      let prev = glowOffset(index, 0, W, H)
      for (let t = 1 / 60; t <= 120; t += 1 / 60) {
        const next = glowOffset(index, t, W, H)
        peak = Math.max(peak, Math.hypot(next.x - prev.x, next.y - prev.y) * 60)
        prev = next
      }
      expect(peak).toBeGreaterThan(150)
      expect(peak).toBeLessThan(600)
    }
  })

  // 正弦频率若成简单倍数关系,整条轨迹会在某个周期上原样复现,访客停留期间
  // 就能看出"又绕回来了"。注意判据是"整条路径复现",不是"回到过起点" ——
  // 一条有机的游走路径本来就会掠过自己走过的点,那恰恰是它不像轨道的原因。
  it('任何周期上都不重复', () => {
    for (let index = 0; index < AMBIENT_GLOW_COUNT; index++) {
      for (let period = 2; period <= 120; period += 0.25) {
        // 找到一处 pos(t + period) 与 pos(t) 相去甚远,即证明 period 不是周期
        let deviation = 0
        for (let t = 0; t <= 60; t += 0.5) {
          const a = glowOffset(index, t, W, H)
          const b = glowOffset(index, t + period, W, H)
          deviation = Math.max(deviation, Math.hypot(a.x - b.x, a.y - b.y))
        }
        expect(deviation).toBeGreaterThan(60)
      }
    }
  })

  // 停在正中央时两个球完全重叠,是这套参数下最难看的一帧。reduced-motion 下
  // 循环不启动、光斑就停在 t = 0,所以这一帧必须本身就是站得住的构图。
  it('t = 0 的静止帧已经是错开的构图', () => {
    for (let index = 0; index < AMBIENT_GLOW_COUNT; index++) {
      const { x, y } = glowOffset(index, 0, W, H)
      expect(Math.hypot(x, y)).toBeGreaterThan(80)
    }
  })
})

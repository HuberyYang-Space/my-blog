import { describe, expect, it } from 'vitest'
import {
  decayTrail,
  idleOffset,
  MIN_TRAIL_WEIGHT,
  particleTarget,
  sampleTextParticles,
  trailForceAt,
} from '../app/utils/hero-particles'

/**
 * 造一张 width × height 的 RGBA 位图,`filled` 里列出的坐标 alpha 为 255,其余为 0。
 * 直接手搓 Uint8ClampedArray 而不是用 ImageData —— 后者是浏览器 API,
 * 单测环境里没有,而被测函数只需要裸数据就够了。
 */
function bitmap(width: number, height: number, filled: [number, number][]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (const [x, y] of filled)
    data[(y * width + x) * 4 + 3] = 255
  return { data, width, height }
}

describe('sampleTextParticles', () => {
  it('只取 alpha 高于阈值的像素', () => {
    const { data, width, height } = bitmap(2, 2, [[0, 0], [1, 1]])
    const particles = sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 10 })

    expect(particles.map(p => [p.homeX, p.homeY])).toEqual([[0, 0], [1, 1]])
  })

  it('阈值取"大于等于",边界值本身算命中', () => {
    const { data, width, height } = bitmap(1, 1, [])
    data[3] = 128
    expect(sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 128 })).toHaveLength(1)
    expect(sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 129 })).toHaveLength(0)
  })

  it('step 控制采样密度,跳过的像素不参与', () => {
    // 4×4 全填充,step=2 时只取 (0,0) (2,0) (0,2) (2,2)
    const filled: [number, number][] = []
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) filled.push([x, y])
    }

    const { data, width, height } = bitmap(4, 4, filled)
    const particles = sampleTextParticles(data, width, height, { step: 2, alphaThreshold: 10 })

    expect(particles.map(p => [p.homeX, p.homeY])).toEqual([[0, 0], [2, 0], [0, 2], [2, 2]])
  })

  it('粒子初始位置就在归位点上', () => {
    const { data, width, height } = bitmap(1, 1, [[0, 0]])
    const [p] = sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 10 })

    expect(p).toMatchObject({ x: 0, y: 0, homeX: 0, homeY: 0, vx: 0, vy: 0 })
  })

  it('全空白的位图采不出粒子', () => {
    const { data, width, height } = bitmap(3, 3, [])
    expect(sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 10 })).toEqual([])
  })
})

describe('decayTrail', () => {
  it('经过一个半衰期后权重减半', () => {
    const [point] = decayTrail([{ x: 0, y: 0, weight: 1 }], 100, 100)
    expect(point!.weight).toBeCloseTo(0.5)
  })

  it('衰减不改变坐标', () => {
    const [point] = decayTrail([{ x: 3, y: 7, weight: 1 }], 50, 100)
    expect([point!.x, point!.y]).toEqual([3, 7])
  })

  it('权重跌破下限的点被移出队列 —— 不清理的话轨迹会无限增长,每帧的遍历成本只涨不跌', () => {
    const trail = [
      { x: 0, y: 0, weight: MIN_TRAIL_WEIGHT * 1.5 },
      { x: 1, y: 1, weight: 1 },
    ]
    // 一个半衰期后第一个点降到 0.75 倍下限,应被丢弃
    const next = decayTrail(trail, 100, 100)

    expect(next.map(p => p.x)).toEqual([1])
  })

  it('dt 为 0 时权重不变', () => {
    const [point] = decayTrail([{ x: 0, y: 0, weight: 0.8 }], 0, 100)
    expect(point!.weight).toBeCloseTo(0.8)
  })

  it('空轨迹衰减后仍是空', () => {
    expect(decayTrail([], 16, 100)).toEqual([])
  })
})

describe('trailForceAt', () => {
  const opts = { radius: 100, strength: 1000 }

  it('半径之外的轨迹点不产生力', () => {
    const force = trailForceAt(0, 0, [{ x: 200, y: 0, weight: 1 }], opts)
    expect(force).toEqual({ fx: 0, fy: 0 })
  })

  it('力的方向背离轨迹点 —— 是推开,不是吸引', () => {
    // 轨迹点在粒子左侧,粒子应被推向右侧(fx 为正)
    const { fx, fy } = trailForceAt(50, 0, [{ x: 0, y: 0, weight: 1 }], opts)
    expect(fx).toBeGreaterThan(0)
    expect(fy).toBeCloseTo(0)
  })

  it('越近力越大', () => {
    const near = trailForceAt(10, 0, [{ x: 0, y: 0, weight: 1 }], opts)
    const far = trailForceAt(90, 0, [{ x: 0, y: 0, weight: 1 }], opts)
    expect(near.fx).toBeGreaterThan(far.fx)
  })

  it('恰好在半径边界上力为 0,不出现突变', () => {
    const force = trailForceAt(100, 0, [{ x: 0, y: 0, weight: 1 }], opts)
    expect(force).toEqual({ fx: 0, fy: 0 })
  })

  it('权重越低力越小 —— 拖尾越旧影响越弱', () => {
    const fresh = trailForceAt(50, 0, [{ x: 0, y: 0, weight: 1 }], opts)
    const stale = trailForceAt(50, 0, [{ x: 0, y: 0, weight: 0.2 }], opts)
    expect(stale.fx).toBeLessThan(fresh.fx)
    expect(stale.fx).toBeGreaterThan(0)
  })

  it('多个轨迹点的力累加', () => {
    const single = trailForceAt(50, 0, [{ x: 0, y: 0, weight: 1 }], opts)
    const double = trailForceAt(50, 0, [
      { x: 0, y: 0, weight: 1 },
      { x: 0, y: 0, weight: 1 },
    ], opts)
    expect(double.fx).toBeCloseTo(single.fx * 2)
  })

  it('粒子与轨迹点完全重合时不产生 NaN —— 距离为 0 时方向没有定义,必须单独兜住', () => {
    const force = trailForceAt(0, 0, [{ x: 0, y: 0, weight: 1 }], opts)
    expect(Number.isNaN(force.fx)).toBe(false)
    expect(Number.isNaN(force.fy)).toBe(false)
  })

  it('空轨迹不产生力', () => {
    expect(trailForceAt(50, 50, [], opts)).toEqual({ fx: 0, fy: 0 })
  })
})

// ── 静止微飘 / 发散合拢 ───────────────────────────────────────────────────

describe('sampleTextParticles 的飘动与发散参数', () => {
  function grid(n: number) {
    const filled: [number, number][] = []
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) filled.push([x, y])
    }
    return bitmap(n, n, filled)
  }

  it('每个粒子拿到互不相同的相位 —— 相位一致的话整片粒子会同步呼吸,像在打拍子', () => {
    const { data, width, height } = grid(4)
    const particles = sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 10 })
    const phases = new Set(particles.map(p => p.phase))

    expect(phases.size).toBeGreaterThan(particles.length * 0.9)
  })

  it('相位是确定性的,同样的输入采两次结果一致', () => {
    const { data, width, height } = grid(3)
    const opts = { step: 1, alphaThreshold: 10 }
    const a = sampleTextParticles(data, width, height, opts)
    const b = sampleTextParticles(data, width, height, opts)

    expect(a.map(p => p.phase)).toEqual(b.map(p => p.phase))
  })

  it('发散方向背离整体中心 —— 左上角的粒子往左上散', () => {
    const { data, width, height } = grid(5)
    const particles = sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 10 })
    const corner = particles.find(p => p.homeX === 0 && p.homeY === 0)!

    expect(corner.scatterX).toBeLessThan(0)
    expect(corner.scatterY).toBeLessThan(0)
  })

  it('只有一个粒子时发散方向不是 NaN —— 它自己就是中心,方向没有定义', () => {
    const { data, width, height } = bitmap(1, 1, [[0, 0]])
    const [p] = sampleTextParticles(data, width, height, { step: 1, alphaThreshold: 10 })

    expect(Number.isNaN(p!.scatterX)).toBe(false)
    expect(Number.isNaN(p!.scatterY)).toBe(false)
  })
})

describe('idleOffset', () => {
  it('振幅为 0 时不产生位移', () => {
    expect(idleOffset(1.2, 3.4, 0)).toEqual({ dx: 0, dy: 0 })
  })

  it('位移始终在振幅范围内', () => {
    for (let t = 0; t < 20; t += 0.37) {
      const { dx, dy } = idleOffset(0.8, t, 3)
      expect(Math.abs(dx)).toBeLessThanOrEqual(3)
      expect(Math.abs(dy)).toBeLessThanOrEqual(3)
    }
  })

  it('x 与 y 不同步 —— 同频同相的话粒子只会沿对角线来回,不像飘', () => {
    const samples = Array.from({ length: 40 }, (_, i) => idleOffset(0, i * 0.25, 1))
    const identical = samples.filter(({ dx, dy }) => Math.abs(dx - dy) < 1e-6)

    expect(identical.length).toBeLessThan(samples.length * 0.2)
  })

  it('相位不同的两个粒子在同一时刻处于不同位置', () => {
    const a = idleOffset(0, 1, 2)
    const b = idleOffset(2.5, 1, 2)

    expect(Math.abs(a.dx - b.dx) + Math.abs(a.dy - b.dy)).toBeGreaterThan(0.01)
  })
})

describe('particleTarget', () => {
  const particle = {
    homeX: 100,
    homeY: 50,
    scatterX: 1,
    scatterY: 0,
    phase: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }

  it('未发散且振幅为 0 时,目标就是归位点', () => {
    const { tx, ty } = particleTarget(particle, 0, 0, { idleAmplitude: 0, scatterDistance: 60 })
    expect([tx, ty]).toEqual([100, 50])
  })

  it('完全发散时沿 scatter 方向推出一整个散开距离', () => {
    const { tx, ty } = particleTarget(particle, 1, 0, { idleAmplitude: 0, scatterDistance: 60 })
    expect(tx).toBeCloseTo(160)
    expect(ty).toBeCloseTo(50)
  })

  it('发散程度线性作用在距离上', () => {
    const { tx } = particleTarget(particle, 0.5, 0, { idleAmplitude: 0, scatterDistance: 60 })
    expect(tx).toBeCloseTo(130)
  })

  it('微飘在发散的基础上叠加,不是二选一', () => {
    const still = particleTarget(particle, 1, 0, { idleAmplitude: 0, scatterDistance: 60 })
    const drifting = particleTarget(particle, 1, 1.3, { idleAmplitude: 4, scatterDistance: 60 })

    expect(drifting.tx).not.toBeCloseTo(still.tx)
    expect(Math.abs(drifting.tx - still.tx)).toBeLessThanOrEqual(4)
  })
})

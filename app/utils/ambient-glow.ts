/**
 * 首页氛围光的游走轨迹 —— 纯函数,不碰 DOM 也不碰时间。
 *
 * 逐帧把结果写进 transform 的那半留在 `app/pages/index.vue`,这里只回答
 * "第 index 个光斑在第 t 秒该待在哪"。拆开是因为轨迹参数写错不会报错:
 * 相位抄重了两个球会同步平移、频率成倍数了轨迹几十秒就闭合、振幅给大了
 * 球直接飘出视口 —— 三种都只是"看着有点怪",只有单测钉得住。
 *
 * ## 为什么是正弦叠加,不是关键帧也不是物理模拟
 *
 * CSS 关键帧只能给出固定的闭环路径,停靠点附近速度必然趋近 0,看久了
 * 就是在几个点之间来回。物理模拟(速度向量 + 边界反弹)轨迹确实不重复,
 * 但折返是硬的,一撞边界就转向,读起来像屏保而不像漂浮。
 *
 * 几组频率互不成简单倍数的正弦相加,轨迹既连续又没有周期,方向永远在缓缓
 * 改变而不会突然折回 —— 这是三者里唯一"有机"的那种动法。而且它是纯函数:
 * 位置只由 t 决定,不累积状态,离开首页再回来位置是连续的,不需要存档。
 */

/**
 * 时间缩放。轨迹的形状由下面的频率决定,整体快慢只由这一个数调。
 *
 * 原实现的瞬时速度约 25px/s,叠加大半径模糊后肉眼看不出在动;这个值把峰值
 * 拉到 300px/s 量级 —— 上下限由单测守住,改动时先看那条断言会不会红。
 */
const SPEED = 1.7

/**
 * 振幅相对视口尺寸的比例。
 *
 * 按视口而非按固定 rem 取,是为了让窄屏上的游走幅度同比缩小 —— 固定像素值
 * 在手机上会把光斑整个甩出屏幕,表现为背景时有时无。
 */
const AMPLITUDE_RATIO = 0.34

/** 一路正弦波:角频率、初相、在合成结果中的权重 */
interface Wave {
  freq: number
  phase: number
  weight: number
}

/**
 * 每个光斑一组参数,x / y 各由两路正弦叠加而成。
 *
 * 两条约束缺一不可:
 * - 每个轴上两路的 weight 之和必须为 1,合成结果才恰好被振幅夹住;
 * - 所有频率互不成简单倍数,轨迹才不会在访客停留的时间尺度内闭合。
 */
const ORBITS: { x: [Wave, Wave], y: [Wave, Wave] }[] = [
  {
    x: [
      { freq: 0.27, phase: 1.3, weight: 0.62 },
      { freq: 0.61, phase: 4.1, weight: 0.38 },
    ],
    y: [
      { freq: 0.33, phase: 2.7, weight: 0.58 },
      { freq: 0.47, phase: 0.6, weight: 0.42 },
    ],
  },
  {
    x: [
      { freq: 0.19, phase: 3.4, weight: 0.55 },
      { freq: 0.53, phase: 1.1, weight: 0.45 },
    ],
    y: [
      { freq: 0.41, phase: 5.2, weight: 0.60 },
      { freq: 0.23, phase: 2.2, weight: 0.40 },
    ],
  },
]

/** 光斑数量。由参数表本身派生,不单独维护一个数字 —— 两处各写一遍就会漂移 */
export const AMBIENT_GLOW_COUNT = ORBITS.length

function combine(waves: [Wave, Wave], t: number, amplitude: number): number {
  return waves.reduce((sum, w) => sum + w.weight * Math.sin(t * w.freq + w.phase), 0) * amplitude
}

/**
 * 第 index 个光斑在第 t 秒相对视口中心的位移(像素)。
 *
 * @param index 光斑序号,0 起,上限 AMBIENT_GLOW_COUNT
 * @param t 页面加载后经过的秒数
 * @param width 视口宽度(px)
 * @param height 视口高度(px)
 */
export function glowOffset(index: number, t: number, width: number, height: number): { x: number, y: number } {
  const orbit = ORBITS[index]
  // 越界不能静默兜回第一条轨迹:那会让两个光斑叠在一起同步移动,
  // 看起来只是"怎么只有一团",不会有任何报错指向真正的原因。
  if (!orbit)
    throw new Error(`ambient-glow: 没有第 ${index} 个光斑的轨迹参数(共 ${AMBIENT_GLOW_COUNT} 个)`)

  const scaled = t * SPEED

  return {
    x: combine(orbit.x, scaled, width * AMPLITUDE_RATIO),
    y: combine(orbit.y, scaled, height * AMPLITUDE_RATIO),
  }
}

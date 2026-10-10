/**
 * 固定头部遮住的高度,从 CSS 读,不在 JS 里再写一个魔法数字。
 *
 * 读的是 html 的 scroll-padding-top(见 assets/css/reset.css)而不是自定义属性
 * --scroll-offset:后者的值是 calc(var(--header-h) + 1rem),自定义属性不会被求值,
 * getPropertyValue 拿回来的是那串字面量,parseFloat 会得到 NaN。scroll-padding-top
 * 是真实 CSS 属性,getComputedStyle 保证返回解析好的 px。
 * 这样 --header-h 仍是唯一真源,JS 只是把 CSS 已经算好的结果读出来 —— 它是 rem,
 * 会随浏览器默认字号缩放,写死成 px 的话调大字号的访客就会对不上。
 */
export function scrollOffset(): number {
  const raw = getComputedStyle(document.documentElement).scrollPaddingTop
  return Number.parseFloat(raw) || 0
}

<script setup lang="ts">
/**
 * demo 实例:首页标题的液态特效。
 *
 * 直接渲染 `HeroTitle` 本身,不做简化复刻 —— 正文里读者摸到的就是首页那份组件。
 * 复刻一份的话,它会从改第一行起就和线上效果分叉,而文章里演示的是哪一版
 * 没有任何东西会告诉你。
 *
 * `as="div"` 不能省:文章页已经有一个 h1(文章标题),HeroTitle 默认渲染 h1,
 * 不传的话正文里会再冒出一个同级标题。页面看起来一模一样,变的只是
 * 屏幕阅读器和爬虫读到的文档结构。
 *
 * ```
 * ::demo{title="把鼠标划过下面这行字"}
 *   :demo-liquid-text{text="Hubery"}
 * ::
 * ```
 */
const props = withDefaults(defineProps<{ text?: string }>(), { text: 'Hubery' })
</script>

<template>
  <div class="demo-liquid-text">
    <HeroTitle :text="props.text" as="div" />
  </div>
</template>

<style>
/* 这圈内边距不是排版余量,是给画布的溢出让路。
   HeroTitle 的画布刻意比文字四周各宽 48px(流动会把笔画推出字外),而 ::demo 外壳
   带 overflow: hidden —— 不留出来的话溢出的部分被裁掉,越靠边的笔画流得越像撞了墙。
   横向再叠上 .demo-stage 自己的 1.1em 才够 48px;窄屏收紧不影响效果,
   那里(hover: none)本来就不启用。 */
.demo-liquid-text {
  padding: 1.75rem clamp(0.5rem, 4vw, 2rem);
}
</style>

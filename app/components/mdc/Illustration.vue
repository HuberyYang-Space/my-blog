<script setup lang="ts">
/**
 * 带图注的插图。
 *
 * ```
 * ::illustration{src="/images/x.png" alt="替代文字" width="1600" height="900"}
 * 图注正文,支持 **markdown**。
 * ::
 * ```
 *
 * 为什么不做成 `![alt](src "图注")` 由 ProseImg 渲染:markdown 的独立图片会被
 * 包进一个 <p>,而 <figure> 不允许出现在 <p> 里 —— 浏览器解析服务端 HTML 时会
 * 自动闭合那个 <p>,与 Vue 客户端生成的结构对不上,水合就会不一致。
 * MDC 的块级组件本身是块级节点,不受这层包裹,所以走这条路。
 *
 * 为什么叫 Illustration 而不是 Figure:MDC 在解析组件之前先查一遍原生 HTML
 * 标签表(ignoreTag),命中的名字直接按元素渲染,压根不会去找同名组件。
 * `::figure` 因此会变成一个裸的 <figure>,props 原样挂成属性、内容不渲染,
 * 而且**不报错**。组件名不能与任何 HTML 标签重名。
 */
defineProps<{
  src: string
  alt: string
  /** 写死宽高以预留版位,避免图片加载完成时页面跳动(CLS) */
  width?: string | number
  height?: string | number
}>()
</script>

<template>
  <figure class="figure">
    <ProseImg :src="src" :alt="alt" :width="width" :height="height" />
    <figcaption>
      <slot />
    </figcaption>
  </figure>
</template>

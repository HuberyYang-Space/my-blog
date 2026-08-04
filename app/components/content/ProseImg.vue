<script setup lang="ts">
/**
 * 正文图片 —— 覆写 @nuxtjs/mdc 的默认 ProseImg,补上懒加载与尺寸占位。
 *
 * 这里刻意不接图片优化模块:本站是纯静态产物,那类模块要靠构建期把各尺寸生成
 * 落盘,而 Nitro 的预渲染爬虫只从 `href` 属性发现链接,`<img src>` 与 `srcset`
 * 不在扫描范围 —— HTML 里的地址指向一个从未生成的文件,构建照样成功,只有线上
 * 访问才发现图裂了。这类没有兜底的静默失败不值得为一点体积收益引进来。
 *
 * 替代做法见 CLAUDE.md 的图片约定:图片在放进 public/images/ 之前就压好、
 * 按正文栏宽定好尺寸。产物是什么就是什么,没有中间环节可以出错。
 */
defineProps<{
  src?: string
  alt?: string
  /** 写死宽高以预留版位,避免图片加载完成时页面跳动(CLS) */
  width?: string | number
  height?: string | number
}>()
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    loading="lazy"
    decoding="async"
  >
</template>

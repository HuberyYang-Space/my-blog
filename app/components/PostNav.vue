<script setup lang="ts">
import type { PostSummary } from '~/utils/posts'

/**
 * 收 PostSummary(只有路径与标题)而不是整个 BlogCollectionItem —— 取数层因此
 * 能只 select 这两列,不必为翻页把全站正文拉一遍。这个"轻量文章"的形状由
 * app/utils/posts.ts 定义,组件里不再另起一个同形状的接口:两份定义早晚会
 * 各自加字段,而它们本该是同一件东西。
 */
defineProps<{
  /** 较早发布的文章(在按日期倒序的列表里排在当前文章之后) */
  older?: PostSummary
  /** 较新发布的文章(在按日期倒序的列表里排在当前文章之前) */
  newer?: PostSummary
}>()
</script>

<template>
  <nav
    v-if="older || newer"
    aria-label="文章翻页"
    class="grid grid-cols-1 mt-12 gap-3 border-t border-border pt-6 sm:grid-cols-2"
  >
    <NuxtLink
      v-if="newer"
      :to="newer.path"
      class="post-nav-link group p-3"
    >
      <svg class="post-nav-frame" aria-hidden="true"><rect pathLength="1" /></svg>
      <span class="flex items-center gap-1.5 text-xs text-text-mute">
        上一篇
        <span class="i-ph-arrow-left transition-transform group-hover:-translate-x-0.5" />
      </span>
      <span class="mt-1 block text-sm text-text-soft">
        <span class="transition-colors group-hover:text-text">{{ newer.title }}</span>
      </span>
    </NuxtLink>
    <NuxtLink
      v-if="older"
      :to="older.path"
      class="post-nav-link post-nav-link-mirrored group p-3 text-right sm:col-start-2"
    >
      <svg class="post-nav-frame" aria-hidden="true"><rect pathLength="1" /></svg>
      <span class="flex items-center justify-end gap-1.5 text-xs text-text-mute">
        下一篇
        <span class="i-ph-arrow-right transition-transform group-hover:translate-x-0.5" />
      </span>
      <span class="mt-1 block text-sm text-text-soft">
        <span class="transition-colors group-hover:text-text">{{ older.title }}</span>
      </span>
    </NuxtLink>
  </nav>
</template>

<style>
/* 悬停时边框从一个点出发、沿四边描一圈画出来。
   border 做不到"从一点画出",改用一个铺满链接的 SVG 圆角矩形:pathLength="1" 把周长
   归一成 1,dasharray 1 = 一段实线接一段等长空白,dashoffset 从 1 走到 0 就是实线
   从路径起点一路长满一圈;移出时走回 1,沿原路缩回起点。
   rect 路径的起点在左上角、方向顺时针;"下一篇"整块水平镜像,变成从右上角逆时针,
   两张卡片因此左右对称。 */
.post-nav-link {
  position: relative;
}

.post-nav-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.post-nav-link-mirrored .post-nav-frame {
  scale: -1 1;
}

/* 描边居中落在几何边上,内缩半个线宽才不会被 SVG 视口裁掉一半;
   圆角同样扣掉半个线宽,外沿才与 rounded-md 的 6px 对齐 */
.post-nav-frame rect {
  x: 0.5px;
  y: 0.5px;
  width: calc(100% - 1px);
  height: calc(100% - 1px);
  rx: 5.5px;
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 1px;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 300ms cubic-bezier(0.4, 0, 1, 1);
}

.post-nav-link:hover .post-nav-frame rect,
.post-nav-link:focus-visible .post-nav-frame rect {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 500ms ease-out;
}
</style>

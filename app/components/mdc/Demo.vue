<script setup lang="ts">
/**
 * 可交互 demo 的外壳 —— 给正文里那些"能点的东西"一个统一的画框,
 * 让读者一眼分清哪块是文章、哪块是可以动手的演示区。
 *
 * ```
 * ::demo{title="计数器"}
 *   :demo-counter
 * ::
 * ```
 *
 * 壳与内容分开:壳负责边框、标题、说明文字,具体 demo 各写各的组件塞进来。
 * 这样以后加新 demo 不用再碰这里。
 */
defineProps<{ title?: string }>()
</script>

<template>
  <div class="demo">
    <p v-if="title" class="demo-title">
      {{ title }}
    </p>
    <div class="demo-stage">
      <slot />
    </div>
  </div>
</template>

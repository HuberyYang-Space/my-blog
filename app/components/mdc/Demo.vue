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

<style>
/* .demo button 是给槽内所有 demo 组件共用的按钮外观 —— 各实例(DemoCounter /
   DemoMotion)因此不重复定义按钮样式,但也就必须放在 ::demo 容器里才有样式。 */

.demo {
  overflow: hidden;
  border: 1px dashed var(--c-border);
  border-radius: 6px;
}

.demo-title {
  padding: 0.45em 1.1em;
  font-family: var(--font-mono);
  font-size: 0.775rem;
  color: var(--c-text-mute);
  background-color: var(--c-bg-soft);
  border-bottom: 1px dashed var(--c-border);
}

.demo-stage {
  padding: 1.25em 1.1em;
}

.demo button {
  display: inline-flex;
  gap: 0.35em;
  align-items: center;
  padding: 0.35em 0.7em;
  font-size: 0.875rem;
  color: var(--c-text-soft);
  cursor: pointer;
  background-color: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.demo button:hover,
.demo button:focus-visible {
  color: var(--c-text);
  border-color: var(--c-primary);
}
</style>

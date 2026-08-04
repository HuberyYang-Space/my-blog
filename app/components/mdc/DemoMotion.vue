<script setup lang="ts">
import { animate } from 'motion'

/**
 * demo 实例二:在正文里跑第三方运行时库(motion,首页光标视差也在用)。
 *
 * 与计数器的区别在于它需要真实 DOM 节点,因此只能在客户端执行 —— 这正是
 * 想演示的那一半:markdown 里的组件不只是静态标记,拿得到 ref、跑得了副作用。
 */
const box = ref<HTMLElement>()
const isMoved = ref(false)

/**
 * prefers-reduced-motion 下不做补间,直接落到终点。
 *
 * 注意不能简单地"跳过这次点击" —— 那样按钮按下去没有任何反应,
 * 对降低动效的用户来说是功能缺失而不是动效减少。
 */
function toggle() {
  if (!box.value)
    return

  isMoved.value = !isMoved.value
  const target = isMoved.value
    ? { x: 120, rotate: 180, borderRadius: '50%' }
    : { x: 0, rotate: 0, borderRadius: '6px' }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  animate(box.value, target, reduced ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 20 })
}
</script>

<template>
  <div class="demo-motion">
    <div class="demo-motion-track">
      <div ref="box" class="demo-motion-box" />
    </div>

    <button type="button" class="demo-motion-toggle" @click="toggle">
      <span class="i-ph-play" aria-hidden="true" />
      {{ isMoved ? '送回起点' : '让它动起来' }}
    </button>
  </div>
</template>

<style>
.demo-motion {
  display: flex;
  flex-direction: column;
  gap: 1em;
  align-items: flex-start;
}

.demo-motion-track {
  width: 100%;
  /* 方块要移动 120px,轨道至少留出这段距离加方块自身宽度 */
  min-height: 3rem;
}

.demo-motion-box {
  width: 3rem;
  height: 3rem;
  background-color: var(--c-primary);
  border-radius: 6px;
}
</style>

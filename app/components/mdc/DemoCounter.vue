<script setup lang="ts">
/**
 * demo 实例一:最小的响应式状态。
 *
 * 它存在的意义不是"计数器有多有用",而是证明 markdown 正文里的组件
 * 确实完成了水合 —— 如果哪天预渲染或水合出问题,这里会第一个点不动。
 */
const count = ref(0)
</script>

<template>
  <div class="demo-counter">
    <button type="button" aria-label="减一" @click="count--">
      <span class="i-ph-minus" aria-hidden="true" />
    </button>

    <output class="demo-counter-value">{{ count }}</output>

    <button type="button" aria-label="加一" @click="count++">
      <span class="i-ph-plus" aria-hidden="true" />
    </button>

    <button type="button" class="demo-counter-reset" @click="count = 0">
      归零
    </button>
  </div>
</template>

<style>
.demo-counter {
  display: flex;
  gap: 0.5em;
  align-items: center;
}

.demo-counter-value {
  min-width: 3ch;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: var(--c-text);
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.demo-counter-reset {
  margin-left: 0.5em;
}
</style>

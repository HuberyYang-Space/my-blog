<script setup lang="ts">
/**
 * 提示框基座。正文里不直接写它,写 ::note / ::tip / ::warning / ::caution
 * 四个语义包装(见同目录),那样每次少敲十几个字符,且类型拼错时组件直接不存在、
 * 一眼看得出,而不是悄悄退化成默认样式。
 */
const props = withDefaults(
  defineProps<{
    type?: 'note' | 'tip' | 'warning' | 'caution'
    /** 覆盖标题栏文字;不传则用该类型的默认名 */
    title?: string
  }>(),
  { type: 'note' },
)

/**
 * 图标类名写成字面量常量 —— UnoCSS 靠扫描源码文本收集候选类名,
 * `'i-ph-' + type` 这种拼接结果不在源码里,产物中就没有对应规则,图标是空的。
 */
const PRESET = {
  note: { icon: 'i-ph-info', label: '说明' },
  tip: { icon: 'i-ph-lightbulb', label: '技巧' },
  warning: { icon: 'i-ph-warning', label: '注意' },
  caution: { icon: 'i-ph-fire', label: '警告' },
} as const

const preset = computed(() => PRESET[props.type])
</script>

<template>
  <aside class="callout" :class="`callout-${type}`">
    <p class="callout-head">
      <span class="callout-icon" :class="preset.icon" aria-hidden="true" />
      {{ title || preset.label }}
    </p>
    <div class="callout-body">
      <slot />
    </div>
  </aside>
</template>

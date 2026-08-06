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

<style>
.callout {
  padding: 0.9em 1.1em;
  background-color: var(--c-bg-soft);
  border-left: 3px solid var(--c-callout);
  border-radius: 0 6px 6px 0;
}

.callout-note {
  --c-callout: var(--c-tone-info);
}

/* 提示这一档与站点主色同值,直接引用主色,不另留一个语气色变量 */
.callout-tip {
  --c-callout: var(--c-primary);
}

.callout-warning {
  --c-callout: var(--c-tone-warning);
}

.callout-caution {
  --c-callout: var(--c-tone-danger);
}

.callout-head {
  display: flex;
  gap: 0.45em;
  align-items: center;
  margin-bottom: 0.5em;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--c-callout);
}

.callout-icon {
  flex-shrink: 0;
}

/* 提示框内部自成一个排版上下文 —— .prose > * + * 只管直接子元素,管不到这里面 */
.callout-body > * + * {
  margin-top: 0.75em;
}

.callout-body > :last-child {
  margin-bottom: 0;
}
</style>

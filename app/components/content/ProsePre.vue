<script setup lang="ts">
/**
 * 代码块 —— 覆写 @nuxtjs/mdc 的默认 ProsePre。
 *
 * 默认实现只渲染 `<pre><slot/></pre>`,把 filename / language / code 三个 prop
 * 原样丢弃。这里把它们接出来:顶部一条信息栏(文件名或语言 + 复制按钮),
 * 正文仍是原样的 <pre>。
 *
 * 组件放在 app/components/content/ 而非 app/components/mdc/ —— 前者由
 * @nuxt/content 以 dirs.unshift 注册,优先级高于 MDC 自带的同名组件,是覆写
 * Prose 系列的指定位置。自定义(非覆写)的 MDC 组件走 app/components/mdc/。
 *
 * 下面这行关掉属性透传,再由模板手动把 $attrs 绑回 <pre>:默认行为会把 attrs
 * 落到根元素,而根元素已经变成外层 div —— Shiki 输出的 class(language-ts /
 * 主题名)、内联的 --shiki-* 颜色变量、以及 transformer 加的 has-focused
 * 都会跟着跑到 div 上,prose.css 里所有 `.prose pre` 选择器随即落空。
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  meta?: string
  class?: string
}>()

type CopyState = 'idle' | 'copied' | 'failed'
const copyState = ref<CopyState>('idle')

let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    // 复制实现(含非安全上下文下的 execCommand 兜底)收敛在 app/utils/clipboard.ts,
    // 与联系方式那处同一份 —— 否则会出现"一处能复制、一处不能"的分裂。
    await copyToClipboard(props.code ?? '')
    copyState.value = 'copied'
  }
  catch {
    // 兜底也失败(极少数环境)时不吞掉:切到 failed 态让用户看见,自己去手选。
    copyState.value = 'failed'
  }

  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

onBeforeUnmount(() => clearTimeout(resetTimer))

const copyLabel = computed(() => ({
  idle: '复制代码',
  copied: '已复制',
  failed: '复制失败,请手动选取',
}[copyState.value]))
</script>

<template>
  <div class="code-block">
    <div class="code-block-bar">
      <span class="code-block-name">{{ filename || language || 'text' }}</span>

      <!--
        图标类名写成静态的 v-if 分支,不用动态拼接 —— UnoCSS 靠扫描源码字面量
        生成规则,`:class="\`i-ph-\${x}\`"` 这种拼出来的类名扫不到,产物里没有图标。
      -->
      <button
        type="button"
        class="code-block-copy"
        :class="{ 'is-failed': copyState === 'failed' }"
        :title="copyLabel"
        :aria-label="copyLabel"
        @click="copy"
      >
        <span v-if="copyState === 'copied'" class="i-ph-check" aria-hidden="true" />
        <span v-else-if="copyState === 'failed'" class="i-ph-warning-circle" aria-hidden="true" />
        <span v-else class="i-ph-copy" aria-hidden="true" />
      </button>
    </div>

    <pre v-bind="$attrs" :class="props.class"><slot /></pre>

    <!-- 复制结果播报给读屏软件;视觉上的反馈由按钮图标承担 -->
    <span class="sr-only" role="status" aria-live="polite">
      {{ copyState === 'idle' ? '' : copyLabel }}
    </span>
  </div>
</template>

<style>
/* 外层 .code-block 承担边框与圆角,顶部 .code-block-bar 放文件名与复制按钮。
   <pre> 自身的排版(字号、行高、配色)属于正文层,在 assets/css/prose.css。 */

.code-block {
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: 6px;
}

.code-block-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1em;
  padding: 0.45em 0.6em 0.45em 1.15em;
  font-family: var(--font-mono);
  font-size: 0.775rem;
  color: var(--c-text-mute);
  background-color: var(--c-bg-soft);
  border-bottom: 1px solid var(--c-border);
}

.code-block-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-block-copy {
  display: inline-flex;
  flex-shrink: 0;
  padding: 0.3em;
  color: var(--c-text-mute);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 4px;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.code-block-copy:hover,
.code-block-copy:focus-visible {
  color: var(--c-text);
  background-color: var(--c-bg);
}

/* 复制失败(多见于非安全上下文下 navigator.clipboard 不存在)要看得见,
   否则用户会以为已经复制成功了 */
.code-block-copy.is-failed {
  color: var(--c-tone-danger);
}
</style>

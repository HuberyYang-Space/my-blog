<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const dialogEl = useTemplateRef<HTMLDialogElement>('dialogEl')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

const query = ref('')
const sections = ref<SearchSection[]>([])
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const activeIndex = ref(0)

const groups = computed(() => groupHitsByPost(searchSections(sections.value, query.value)))
const hits = computed(() => groups.value.flatMap(group => group.hits))

/**
 * 给每条命中配一个跨分组的连续序号 —— 键盘上下键在扁平序列上移动,
 * 而界面是按文章分好组的。序号在这里一次算好,模板里直接比对,
 * 不必在渲染时反查 indexOf。
 */
const numberedGroups = computed(() => {
  let index = 0
  return groups.value.map(group => ({
    ...group,
    hits: group.hits.map(hit => ({ hit, index: index++ })),
  }))
})

/**
 * 索引首次打开弹层时才拉,不参与首屏。
 *
 * 本组件随头部常驻、全站只有一个实例,组件状态本身就是缓存 ——
 * 关掉再打开不会重新请求。
 */
async function loadIndex() {
  if (status.value === 'ready' || status.value === 'loading')
    return

  status.value = 'loading'
  try {
    sections.value = await $fetch<SearchSection[]>('/search-index.json')
    status.value = 'ready'
  }
  catch {
    // 静默失败会让人以为"这站没写过这个词",必须让界面明说索引没取到
    status.value = 'error'
  }
}

watch(open, async (value) => {
  const el = dialogEl.value
  if (!el)
    return

  if (value) {
    // showModal() 才会进 top layer 并拿到 ::backdrop 与原生焦点囚禁;
    // 直接设 open 属性只是个普通块级元素。
    if (!el.open)
      el.showModal()
    loadIndex()
    await nextTick()
    inputEl.value?.focus()
  }
  else if (el.open) {
    el.close()
  }
})

// 查询变了就把选中项拨回第一条,否则会停在一个已经不存在的位置上
watch(query, () => {
  activeIndex.value = 0
})

/** Esc 与点击 ::backdrop 都走原生 close 事件,状态在这一处收口 */
function onClose() {
  open.value = false
  query.value = ''
  activeIndex.value = 0
}

async function scrollActiveIntoView() {
  await nextTick()
  dialogEl.value
    ?.querySelector('[data-active="true"]')
    ?.scrollIntoView({ block: 'nearest' })
}

function move(delta: number) {
  const total = hits.value.length
  if (total === 0)
    return

  // 取模实现首尾环绕:一直按 ↓ 会从最后一条回到第一条
  activeIndex.value = (activeIndex.value + delta + total) % total
  scrollActiveIntoView()
}

async function go(target?: { section: { id: string } }) {
  if (!target)
    return

  open.value = false
  await navigateTo(target.section.id)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  }
  else if (event.key === 'Enter') {
    event.preventDefault()
    go(hits.value[activeIndex.value])
  }
}

/** 点在面板之外(即 ::backdrop 上)才关闭 —— 面板内部的点击不该穿透 */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialogEl.value)
    open.value = false
}
</script>

<template>
  <!-- 必须传送到 body:头部有 backdrop-filter,而带 filter / backdrop-filter 的
       祖先会成为后代定位的包含块。传送出去就与头部的层叠上下文彻底无关了。 -->
  <Teleport to="body">
    <dialog
      ref="dialogEl"
      class="search-dialog"
      aria-label="搜索文章"
      @close="onClose"
      @click="onDialogClick"
      @keydown="onKeydown"
    >
      <div class="search-panel">
        <div class="search-field">
          <span class="i-ph-magnifying-glass search-field-icon" aria-hidden="true" />
          <input
            ref="inputEl"
            v-model="query"
            type="search"
            class="search-input"
            placeholder="搜索文章…"
            aria-label="搜索文章"
            autocomplete="off"
            spellcheck="false"
          >
          <button type="button" class="search-close" aria-label="关闭搜索" @click="open = false">
            <span class="i-ph-x search-close-icon" aria-hidden="true" />
          </button>
        </div>

        <div class="search-results">
          <p v-if="status === 'error'" class="search-note">
            索引没能加载,请稍后重试。
          </p>
          <p v-else-if="status === 'loading'" class="search-note">
            正在加载索引…
          </p>
          <p v-else-if="!query.trim()" class="search-note">
            输入关键词开始搜索,支持空格分隔多个词。
          </p>
          <p v-else-if="hits.length === 0" class="search-note">
            没有找到与「{{ query.trim() }}」相关的内容。
          </p>

          <template v-else>
            <section v-for="group in numberedGroups" :key="group.path" class="search-group">
              <p class="search-group-title">
                {{ group.postTitle }}
              </p>
              <ul class="search-list">
                <li v-for="entry in group.hits" :key="entry.hit.section.id">
                  <a
                    :href="entry.hit.section.id"
                    class="search-result"
                    :data-active="entry.index === activeIndex"
                    @click.prevent="go(entry.hit)"
                    @mousemove="activeIndex = entry.index"
                  >
                    <!-- level 1 那条就是文章本身,标题与上面的分组标题重复,不再重复一遍 -->
                    <span v-if="entry.hit.section.level !== 1" class="search-result-title">
                      <span class="i-ph-hash search-result-hash" aria-hidden="true" />
                      <span v-if="entry.hit.section.titles.length > 1" class="search-result-crumb">
                        {{ entry.hit.section.titles.slice(1).join(' › ') }} ›
                      </span>
                      <span>
                        <template v-for="(segment, i) in entry.hit.titleSegments" :key="i">
                          <mark v-if="segment.hit">{{ segment.text }}</mark>
                          <template v-else>{{ segment.text }}</template>
                        </template>
                      </span>
                    </span>
                    <p class="search-result-excerpt">
                      <template v-for="(segment, i) in entry.hit.segments" :key="i">
                        <mark v-if="segment.hit">{{ segment.text }}</mark>
                        <template v-else>{{ segment.text }}</template>
                      </template>
                    </p>
                  </a>
                </li>
              </ul>
            </section>
          </template>
        </div>

        <div class="search-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>↵</kbd> 打开</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style>
/* ==========================================================================
   尺寸取自 Pagefind 组件 UI 的默认值,配色换成本站的语义变量:
     560px 面板宽 / 距顶 10dvh / 最高 min(80dvh, 800px) / 圆角 6px /
     输入行高 36px / 结果间距 8px / 字号 输入 16 · 标题 14 · 摘要 13 · 分组 12
   ========================================================================== */

/* [open] 限定不能省:UA 样式表靠 `dialog:not([open]) { display: none }` 藏住
   关闭态的弹层,这里若无条件写 display: flex,权重更高的它会把 UA 那条盖掉,
   弹层就常驻在页面上了。 */
.search-dialog[open] {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.search-dialog {
  width: 100vw;
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  padding: 10dvh 1rem 1rem;
  border: 0;
  background: transparent;
  color: var(--c-text);
}

/* ::backdrop 在现代浏览器里从原生元素继承自定义属性,但这条落地较晚 ——
   写上字面量兜底,继承不到时也不会变成完全透明的遮罩。 */
.search-dialog::backdrop {
  background-color: rgb(0 0 0 / 50%);
}

/* 弹层打开时锁住背景滚动。用 :has() 而不是在 JS 里加类:开关只有一处真源
   (dialog 的 open 属性),不会出现"状态改了但类忘了摘"的残留。 */
html:has(.search-dialog[open]) {
  overflow: hidden;
}

.search-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: min(80dvh, 800px);
  overflow: hidden;
  background-color: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  box-shadow: 0 16px 48px rgb(0 0 0 / 20%);
}

/* ---- 输入行 ---- */

.search-field {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;
  height: 36px;
  padding: 0 0.75rem;
  border-bottom: 1px solid var(--c-border);
}

.search-field-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  color: var(--c-text-mute);
}

.search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  outline: none;
  /* 16px 不只是 Pagefind 的规格,也是 iOS Safari 聚焦时不自动放大页面的下限 */
  font-size: 16px;
  color: var(--c-text);
}

.search-input::placeholder {
  color: var(--c-text-mute);
}

/* WebKit 给 type="search" 自带一个清除按钮,与右侧的关闭按钮并排会像是两个关闭 */
.search-input::-webkit-search-cancel-button {
  appearance: none;
}

.search-close {
  display: flex;
  flex-shrink: 0;
  padding: 0.25rem;
  border-radius: 4px;
  color: var(--c-text-mute);
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.search-close:hover {
  color: var(--c-text);
  background-color: var(--c-bg-soft);
}

.search-close-icon {
  width: 1rem;
  height: 1rem;
}

/* ---- 结果区 ---- */

.search-results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem;
}

.search-note {
  padding: 1.5rem 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--c-text-mute);
}

.search-group + .search-group {
  margin-top: 0.75rem;
}

.search-group-title {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: var(--c-text-mute);
}

.search-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  padding: 0;
}

.search-result {
  display: block;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.search-result[data-active='true'] {
  background-color: var(--c-bg-soft);
}

.search-result-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--c-text);
}

.search-result-hash {
  flex-shrink: 0;
  width: 0.875rem;
  height: 0.875rem;
  color: var(--c-text-mute);
}

.search-result-crumb {
  color: var(--c-text-mute);
}

.search-result-excerpt {
  margin-top: 0.125rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--c-text-soft);
}

/* Pagefind 的 --pf-mark 是文字色而不是荧光底色,这里对应换成主题色。
   浏览器默认给 mark 上黄底黑字,必须显式清掉。 */
.search-result mark {
  background: none;
  color: var(--c-primary);
  font-weight: 600;
}

/* ---- 页脚快捷键提示 ---- */

.search-footer {
  display: flex;
  flex-shrink: 0;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--c-border);
  font-size: 0.75rem;
  color: var(--c-text-mute);
}

.search-footer kbd {
  display: inline-block;
  min-width: 1.25rem;
  margin-right: 0.25rem;
  padding: 0 0.25rem;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  text-align: center;
}

/* 窄屏放不下三组提示,也没有物理键盘可按 */
@media (width < 640px) {
  .search-footer {
    display: none;
  }
}
</style>

<script setup lang="ts">
/**
 * 文章状态徽章。挂在列表项的 h2 与文章页 h1 内部,两处共用同一个组件与同一套 CSS
 * —— 分别写会让两边的圆角、字号、间距随时间漂开。
 *
 * 只渲染,不判定:哪些徽章、什么顺序全由 app/utils/badges.ts 的纯函数决定。
 */
const props = defineProps<{
  post: BadgeSource
}>()

const badges = computed(() => {
  try {
    return resolveBadges(props.post)
  }
  catch (error) {
    // 破坏演练实测:Nitro 预渲染把异常一律汇报成 `[500] Server Error`,不打印
    // 消息本身。不在这里补一行的话,构建失败时能看到的只有"首页 500",而首页
    // 列着全部文章,根本看不出是哪篇的哪个 key 拼错了。
    // 打完仍要 rethrow —— 目的是让人看见原因,不是把构建救回来。
    console.error(`[PostBadges] ${(error as Error).message}`)
    throw error
  }
})
</script>

<template>
  <span
    v-for="badge in badges"
    :key="badge.key"
    class="post-badge"
    :class="`post-badge-${badge.tone}`"
  >{{ badge.label }}</span>
</template>

<style>
/* 类名拼接(`post-badge-${tone}`)在这里是安全的:下面这些规则是手写 CSS,
   不经 UnoCSS 扫描。只有工具类(图标 i-ph-* 之类)才必须是源码里的字面量。 */

.post-badge {
  display: inline-block;
  margin-left: 0.5em;
  padding: 0.15em 0.45em;
  border-radius: 4px;
  /* 固定字号,不用 em —— 跟着继承的话,同一个徽章在 text-base 的列表标题与
     text-3xl 的文章标题里会差出一倍多,不再像同一件东西。 */
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.4;
  /* 标题挂了 tracking-tight,徽章文字得自己收回正常字距 */
  letter-spacing: normal;
  vertical-align: middle;
  /* 徽章自身绝不被拆散:窄屏长标题换行时,整块跟到最后一行末尾 */
  white-space: nowrap;
  color: var(--_tone);
  /* 淡底从文字色现算,而不是每档再配一个底色变量 —— 同 .highlighter 的做法,
     换色时底色自动跟着走,不会出现文字换了、底色还留在上一档的错配。 */
  background-color: color-mix(in srgb, var(--_tone) var(--c-badge-ratio), transparent);
}

.post-badge-mute {
  --_tone: var(--c-text-mute);
}

.post-badge-info {
  --_tone: var(--c-tone-info);
}

.post-badge-warning {
  --_tone: var(--c-tone-warning);
}

.post-badge-danger {
  --_tone: var(--c-tone-danger);
}

/* 正向那一档没有单列变量:它与站点主色同值,再复制一份只会多一处要同步的地方 */
.post-badge-success {
  --_tone: var(--c-primary);
}
</style>

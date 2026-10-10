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

/* 徽章竖直居中于所在那一行。vertical-align: middle 做不到:它对齐的是
   "基线 + 半个 x 高度",那是拉丁小写字母的中心,挨着中文标题实测偏下 1.76px。
   这里改用 top 对齐行盒顶,再下移 (行高 - 徽章高) / 2 —— 行距是上下均分的,
   行盒中线就是标题文字的中线。
   行高必须取标题的而非徽章自己的:注册成 <length> 的自定义属性在声明处
   (标题元素)就把 1lh 算成 px,继承下来的是标题行高;不注册的话继承的是
   未求值的 "1lh",到徽章上才按徽章自己的行高解析。 */
@property --post-badge-row {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

:has(> .post-badge) {
  --post-badge-row: 1lh;
}

.post-badge {
  --_pad-y: 0.15em;

  display: inline-block;
  margin-left: 0.5em;
  margin-top: calc((var(--post-badge-row) - 1lh - 2 * var(--_pad-y)) / 2);
  padding: var(--_pad-y) 0.45em;
  border-radius: 4px;
  /* 固定字号,不用 em —— 跟着继承的话,同一个徽章在 text-base 的列表标题与
     text-3xl 的文章标题里会差出一倍多,不再像同一件东西。 */
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.4;
  /* 标题挂了 tracking-tight,徽章文字得自己收回正常字距 */
  letter-spacing: normal;
  vertical-align: top;
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
